def summarize_student_module_performance(
    db_config,
    course_id,
    module_id,
    student_id,
    llm,
    batch_size=5,
    max_retries=2
):
    """
    Generate a detailed student performance report for a module.

    Includes:
      - Module quiz attendance and scores
      - Incorrect answers and correct answers
      - Difficulty and Bloom-level analysis
      - Detailed knowledge gaps
      - Possible misconceptions and explanations
      - Topics to revisit and practice recommendations
      - Personalized revision roadmap

    Uses the supplied AIPipe LLM and returns a Python dictionary.
    """

    import json
    import re
    from decimal import Decimal
    from datetime import date, datetime
    import mysql.connector
    from mysql.connector import Error

    # ---------------------------------------------------------
    # 1. Helper: Convert database values to JSON-safe values
    # ---------------------------------------------------------
    def json_safe(value):
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        return value

    # ---------------------------------------------------------
    # 2. Helper: Extract text from an LLM response
    # ---------------------------------------------------------
    def get_response_text(response):
        if isinstance(response, str):
            return response

        content = getattr(response, "content", None)

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and item.get("text"):
                    parts.append(item["text"])
            return "\n".join(parts)

        return str(response)

    # ---------------------------------------------------------
    # 3. Helper: Parse JSON, including JSON in code fences
    # ---------------------------------------------------------
    def parse_json_response(response):
        text = get_response_text(response).strip()

        text = re.sub(
            r"^\s*```(?:json)?\s*|\s*```\s*$",
            "",
            text,
            flags=re.IGNORECASE
        ).strip()

        decoder = json.JSONDecoder()

        for index, char in enumerate(text):
            if char not in "{[":
                continue

            try:
                result, _ = decoder.raw_decode(text[index:])
                if isinstance(result, (dict, list)):
                    return result
            except json.JSONDecodeError:
                continue

        raise ValueError(
            "LLM returned incomplete or invalid JSON. "
            f"Response length: {len(text)} characters. "
            f"Response ending: {text[-500:]}"
        )

    # ---------------------------------------------------------
    # 4. Helper: Call LLM with retries
    # ---------------------------------------------------------
    def invoke_json(prompt, retries=None):
        retries = max_retries if retries is None else retries
        last_error = None

        for attempt in range(retries + 1):
            current_prompt = prompt

            if attempt > 0:
                current_prompt += """

Your previous response could not be parsed as complete JSON.
Generate a shorter response.
Return exactly one complete JSON object.
Do not use Markdown fences or additional text.
Ensure that every opening bracket and quotation mark is closed.
"""

            response = llm.invoke(current_prompt)
            raw_text = get_response_text(response)

            try:
                return parse_json_response(raw_text)
            except (ValueError, json.JSONDecodeError) as exc:
                last_error = exc
                print(
                    f"LLM JSON attempt {attempt + 1}/{retries + 1} failed. "
                    f"Response length: {len(raw_text)} characters."
                )

        raise ValueError(
            f"Unable to obtain valid JSON after {retries + 1} attempts: "
            f"{last_error}"
        )

    # ---------------------------------------------------------
    # 5. Fetch module quizzes and student attempts
    # ---------------------------------------------------------
    connection = None

    try:
        connection = mysql.connector.connect(**db_config)

        with connection.cursor(dictionary=True) as cursor:

            # Get quizzes belonging to the specified module.
            cursor.execute(
                """
                SELECT
                    quiz_id,
                    MIN(sequence_no) AS sequence_no
                FROM datapro_lms.tbl_course_content
                WHERE course_id = %s
                  AND module_id = %s
                  AND quiz_id IS NOT NULL
                  AND (is_deleted = 0 OR is_deleted IS NULL)
                GROUP BY quiz_id
                ORDER BY MIN(sequence_no), quiz_id
                """,
                (course_id, module_id)
            )

            quiz_rows = cursor.fetchall()
            quiz_ids = [row["quiz_id"] for row in quiz_rows]

            base_report = {
                "course_id": course_id,
                "module_id": module_id,
                "student_id": student_id,
                "total_quizzes": len(quiz_ids),
                "attempted_quizzes": 0,
                "unattempted_quizzes": [],
                "total_attempts": 0,
                "total_questions": 0,
                "total_correct": 0,
                "total_incorrect": 0,
                "average_percentage": 0.0,
                "quiz_results": [],
                "difficulty_analysis": {},
                "bloom_analysis": {},
                "knowledge_gaps": [],
                "overall_summary": "",
                "strengths": [],
                "recommendations": [],
                "revision_roadmap": [],
                "data_limitations": []
            }

            if not quiz_ids:
                base_report["overall_summary"] = (
                    "No quizzes were found for the specified module."
                )
                return base_report

            placeholders = ", ".join(["%s"] * len(quiz_ids))

            cursor.execute(
                f"""
                SELECT
                    attempt_id,
                    quiz_id,
                    score,
                    total_questions,
                    correct_count,
                    percent,
                    status,
                    submitted_at,
                    duration_seconds
                FROM datapro_lms.tbl_quiz_attempts
                WHERE student_id = %s
                  AND course_id = %s
                  AND quiz_id IN ({placeholders})
                ORDER BY submitted_at ASC, attempt_id ASC
                """,
                (student_id, course_id, *quiz_ids)
            )

            attempts = cursor.fetchall()

            # Fetch wrong answers for the exact attempts retrieved.
            attempt_ids = [row["attempt_id"] for row in attempts]
            wrong_answers = []

            if attempt_ids:
                attempt_placeholders = ", ".join(
                    ["%s"] * len(attempt_ids)
                )

                cursor.execute(
                    f"""
                    SELECT
                        qa.attempt_id,
                        qa.quiz_id,
                        a.question_id,
                        q.question_number,
                        q.question_text,
                        q.options_json,
                        a.selected_answer,
                        q.correct_answer,
                        q.difficulty,
                        q.bloom_level
                    FROM datapro_lms.tbl_quiz_attempts AS qa
                    INNER JOIN datapro_lms.tbl_quiz_attempt_answers AS a
                        ON qa.attempt_id = a.attempt_id
                    INNER JOIN datapro_lms.tbl_quiz_questions AS q
                        ON a.question_id = q.question_id
                    WHERE qa.attempt_id IN ({attempt_placeholders})
                      AND a.is_correct = 0
                    ORDER BY qa.submitted_at ASC, q.question_number ASC
                    """,
                    tuple(attempt_ids)
                )

                wrong_answers = cursor.fetchall()

    except Error as exc:
        raise RuntimeError(
            f"Database error while retrieving student performance: {exc}"
        ) from exc

    finally:
        if connection and connection.is_connected():
            connection.close()

    # ---------------------------------------------------------
    # 6. Build quiz results and calculate statistics
    # ---------------------------------------------------------
    attempts_by_quiz = {}
    for attempt in attempts:
        attempts_by_quiz.setdefault(attempt["quiz_id"], []).append(attempt)

    wrong_by_attempt = {}
    for answer in wrong_answers:
        wrong_by_attempt.setdefault(
            answer["attempt_id"], []
        ).append(answer)

    all_wrong_answers = []
    total_questions = 0
    total_correct = 0
    percentages = []
    difficulty_stats = {}
    bloom_stats = {}

    quiz_results = []

    for quiz_id in quiz_ids:
        quiz_attempts = attempts_by_quiz.get(quiz_id, [])

        if not quiz_attempts:
            base_report["unattempted_quizzes"].append(quiz_id)
            quiz_results.append({
                "quiz_id": quiz_id,
                "attended": False,
                "attempt_count": 0,
                "attempts": [],
                "message": "The student has not attempted this quiz."
            })
            continue

        attempt_results = []

        for attempt in quiz_attempts:
            attempt_id = attempt["attempt_id"]
            attempt_wrong = wrong_by_attempt.get(attempt_id, [])

            total = int(attempt.get("total_questions") or 0)
            correct = int(attempt.get("correct_count") or 0)
            incorrect = max(0, total - correct)

            total_questions += total
            total_correct += correct

            if attempt.get("percent") is not None:
                percentages.append(float(attempt["percent"]))

            for answer in attempt_wrong:
                all_wrong_answers.append(answer)

                difficulty = (
                    str(answer.get("difficulty") or "Unknown").strip()
                )
                bloom = (
                    str(answer.get("bloom_level") or "Unknown").strip()
                )

                difficulty_stats.setdefault(
                    difficulty,
                    {"incorrect": 0}
                )
                difficulty_stats[difficulty]["incorrect"] += 1

                bloom_stats.setdefault(
                    bloom,
                    {"incorrect": 0}
                )
                bloom_stats[bloom]["incorrect"] += 1

            attempt_results.append({
                "attempt_id": attempt_id,
                "score": json_safe(attempt.get("score")),
                "total_questions": total,
                "correct_count": correct,
                "incorrect_count": incorrect,
                "percentage": json_safe(attempt.get("percent")),
                "status": attempt.get("status"),
                "submitted_at": json_safe(attempt.get("submitted_at")),
                "duration_seconds": attempt.get("duration_seconds"),
                "wrong_answers": attempt_wrong
            })

        quiz_results.append({
            "quiz_id": quiz_id,
            "attended": True,
            "attempt_count": len(quiz_attempts),
            "attempts": attempt_results
        })

    base_report["attempted_quizzes"] = sum(
        1 for quiz in quiz_results if quiz["attended"]
    )
    base_report["total_attempts"] = len(attempts)
    base_report["total_questions"] = total_questions
    base_report["total_correct"] = total_correct
    base_report["total_incorrect"] = max(
        0, total_questions - total_correct
    )
    base_report["average_percentage"] = (
        round(sum(percentages) / len(percentages), 2)
        if percentages else 0.0
    )
    base_report["quiz_results"] = quiz_results
    base_report["difficulty_analysis"] = difficulty_stats
    base_report["bloom_analysis"] = bloom_stats

    # Convert DB values before serializing the report.
    def make_serializable(obj):
        if isinstance(obj, dict):
            return {
                str(key): make_serializable(value)
                for key, value in obj.items()
            }
        if isinstance(obj, list):
            return [make_serializable(item) for item in obj]
        return json_safe(obj)

    base_report = make_serializable(base_report)
    all_wrong_answers = make_serializable(all_wrong_answers)

    # ---------------------------------------------------------
    # 7. Handle students with no attempts
    # ---------------------------------------------------------
    if not attempts:
        base_report["overall_summary"] = (
            "The student has not attempted any quizzes in this module. "
            "There is insufficient assessment evidence to identify "
            "knowledge gaps or evaluate learning performance."
        )
        base_report["data_limitations"] = [
            "No quiz attempts were recorded for this module.",
            "Knowledge gaps and strengths cannot be established "
            "from the available assessment data."
        ]
        base_report["recommendations"] = [
            "Complete the module quizzes to establish a performance baseline."
        ]
        return base_report

    # ---------------------------------------------------------
    # 8. Generate detailed knowledge gaps in small batches
    # ---------------------------------------------------------
    knowledge_gaps = []

    if all_wrong_answers:
        for start in range(0, len(all_wrong_answers), batch_size):
            batch = all_wrong_answers[start:start + batch_size]

            prompt = f"""
You are an educational assessment analyst.

Analyze the following incorrectly answered quiz questions.
Produce a detailed but concise JSON object with this exact structure:

{{
  "knowledge_gaps": [
    {{
      "question_id": 0,
      "question_number": 0,
      "concept": "Concept name",
      "topic": "Main topic",
      "subtopic": "Specific subtopic",
      "priority": "high",
      "evidence_strength": "high",
      "what_went_wrong": "Explain the mismatch between the selected and correct answers.",
      "possible_reason": "A plausible misconception, clearly marked as a hypothesis.",
      "reason_confidence": "low",
      "simple_explanation": "A beginner-friendly explanation.",
      "detailed_explanation": "A technically accurate explanation.",
      "important_rules": ["Rule 1"],
      "example": "A relevant example.",
      "topics_to_revisit": ["Topic 1"],
      "how_to_apply_correctly": ["Step 1"],
      "practice_recommendation": "A targeted practice task.",
      "verification_question": "A new question to check understanding."
    }}
  ]
}}

Requirements:
- Return one entry for each supplied incorrect question.
- Base explanations on the question, selected answer and correct answer.
- Do not claim to know why the student chose an answer.
- Treat reasons for mistakes as hypotheses, not facts.
- Do not invent the student's thought process.
- Explain the concept accurately and clearly.
- Set priority based on the educational importance and evidence available.
- Use the supplied question ID and question number.
- If a field cannot be established, use an empty string or an empty array.
- Return only complete, valid JSON. Do not use Markdown.

Incorrect questions:
{json.dumps(batch, ensure_ascii=False, default=str)}
"""

            batch_result = invoke_json(prompt)

            if not isinstance(batch_result, dict):
                raise ValueError(
                    "The knowledge-gap response must be a JSON object."
                )

            gaps = batch_result.get("knowledge_gaps", [])

            if isinstance(gaps, list):
                knowledge_gaps.extend(gaps)

    base_report["knowledge_gaps"] = knowledge_gaps

    # ---------------------------------------------------------
    # 9. Generate an overall report using compact evidence
    # ---------------------------------------------------------
    compact_attempts = []

    for quiz in quiz_results:
        compact_attempts.append({
            "quiz_id": quiz["quiz_id"],
            "attended": quiz["attended"],
            "attempt_count": quiz["attempt_count"],
            "attempts": [
                {
                    "percentage": attempt["percentage"],
                    "total_questions": attempt["total_questions"],
                    "correct_count": attempt["correct_count"],
                    "incorrect_count": attempt["incorrect_count"]
                }
                for attempt in quiz["attempts"]
            ]
        })

    overall_evidence = {
        "course_id": course_id,
        "module_id": module_id,
        "student_id": student_id,
        "total_quizzes": len(quiz_ids),
        "attempted_quizzes": base_report["attempted_quizzes"],
        "unattempted_quizzes": base_report["unattempted_quizzes"],
        "total_attempts": base_report["total_attempts"],
        "total_questions": total_questions,
        "total_correct": total_correct,
        "total_incorrect": base_report["total_incorrect"],
        "average_percentage": base_report["average_percentage"],
        "quiz_results": compact_attempts,
        "difficulty_analysis": difficulty_stats,
        "bloom_analysis": bloom_stats,
        "knowledge_gaps": knowledge_gaps
    }

    overall_prompt = f"""
You are an educational performance analyst.

Generate a student module performance report based only on the
supplied assessment evidence.

Return one valid JSON object with this exact structure:

{{
  "overall_summary": "Detailed performance summary.",
  "strengths": [
    {{
      "area": "Area",
      "evidence": "Supporting assessment evidence"
    }}
  ],
  "recommendations": [
    {{
      "priority": "high",
      "recommendation": "Actionable recommendation",
      "reason": "Why this action is relevant"
    }}
  ],
  "revision_roadmap": [
    {{
      "stage": 1,
      "topic": "Topic to revise",
      "activities": ["Activity 1"],
      "success_criteria": "How to measure understanding"
    }}
  ],
  "data_limitations": [
    "Limitation of the available assessment evidence"
  ]
}}

Instructions:
- Distinguish observed results from possible explanations.
- Do not infer mastery from an unattempted quiz.
- Do not invent strengths unsupported by correct answers or results.
- Use the knowledge gaps to create targeted recommendations.
- Include topics that should be learned or revisited.
- Give a practical revision roadmap.
- Mention insufficient evidence where appropriate.
- Do not repeat every question in the report.
- Keep the response concise enough to ensure complete JSON.
- Return only valid JSON, with no Markdown or additional text.

Assessment evidence:
{json.dumps(overall_evidence, ensure_ascii=False, default=str)}
"""

    overall = invoke_json(overall_prompt)

    if not isinstance(overall, dict):
        raise ValueError("The overall report must be a JSON object.")

    base_report["overall_summary"] = overall.get(
        "overall_summary", ""
    )
    base_report["strengths"] = overall.get("strengths", [])
    base_report["recommendations"] = overall.get(
        "recommendations", []
    )
    base_report["revision_roadmap"] = overall.get(
        "revision_roadmap", []
    )
    base_report["data_limitations"] = overall.get(
        "data_limitations", []
    )

    return base_report