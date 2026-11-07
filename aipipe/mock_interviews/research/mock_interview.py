

from __future__ import annotations



import json

import logging

import re

import threading

from datetime import datetime, timezone

from typing import Any

from uuid import uuid4



logger = logging.getLogger(__name__)



# In-memory session storage. Use Redis or a database for production.

_SESSIONS: dict[str, dict[str, Any]] = {}

_LOCK = threading.RLock()



DEFAULT_QUESTIONS_PER_TOPIC = 2

MAX_QUESTIONS_PER_INTERVIEW = 15

MIN_SCORE = 0

MAX_SCORE = 10





# ============================================================

# LLM RESPONSE HANDLING

# ============================================================



def _extract_text(response: Any) -> str:

    """Extract text from common LLM response formats."""



    if isinstance(response, str):

        return response.strip()



    if isinstance(response, dict):

        for key in ("content", "text", "output", "response"):

            value = response.get(key)

            if isinstance(value, str):

                return value.strip()

            if isinstance(value, dict):

                try:

                    return json.dumps(value)

                except (TypeError, ValueError):

                    pass



        # Some providers return structured JSON directly.

        return json.dumps(response)



    for attribute in ("content", "text", "output", "response"):

        value = getattr(response, attribute, None)

        if isinstance(value, str):

            return value.strip()

        if isinstance(value, dict):

            return json.dumps(value)



    if isinstance(response, list):

        parts = []

        for item in response:

            if isinstance(item, str):

                parts.append(item)

            elif isinstance(item, dict) and isinstance(item.get("text"), str):

                parts.append(item["text"])

        if parts:

            return "\n".join(parts)



    raise ValueError(

        f"Unsupported LLM response type: {type(response).__name__}"

    )





def parse_llm_json(response: Any) -> dict[str, Any]:

    """Parse a JSON object, including one embedded in Markdown."""



    if isinstance(response, dict):

        return response



    text = _extract_text(response).strip()



    # Remove common Markdown fences.

    text = re.sub(

        r"^\s*```(?:json)?\s*",

        "",

        text,

        flags=re.IGNORECASE,

    )

    text = re.sub(r"\s*```\s*$", "", text).strip()



    try:

        result = json.loads(text)

        if isinstance(result, dict):

            return result

    except json.JSONDecodeError:

        pass



    # Find the first complete JSON object in the response.

    decoder = json.JSONDecoder()

    for match in re.finditer(r"\{", text):

        try:

            result, _ = decoder.raw_decode(text[match.start():])

            if isinstance(result, dict):

                return result

        except json.JSONDecodeError:

            continue



    logger.error("Invalid JSON from LLM: %s", text[:3000])

    raise ValueError("LLM did not return valid JSON.")





def _call_llm(llm: Any, prompt: str) -> dict[str, Any]:

    """Call AIPipe and parse its response.



    Supports common generate(), invoke() and chat() interfaces.

    """



    if llm is None:

        raise ValueError("LLM instance is required.")



    response = None

    errors = []



    for method_name in ("generate", "invoke", "chat"):

        method = getattr(llm, method_name, None)

        if not callable(method):

            continue



        try:

            response = method(prompt)

            break

        except TypeError as exc:

            errors.append(f"{method_name}: {exc}")

        except Exception:

            logger.exception("LLM %s call failed", method_name)

            raise



    if response is None:

        detail = "; ".join(errors) if errors else "No supported method found."

        raise RuntimeError(f"Could not call LLM: {detail}")



    return parse_llm_json(response)





def _call_llm_with_retry(llm: Any, prompt: str) -> dict[str, Any]:

    """Retry once with explicit JSON correction instructions."""



    try:

        return _call_llm(llm, prompt)

    except (ValueError, json.JSONDecodeError) as first_error:

        logger.warning("Retrying invalid LLM JSON response: %s", first_error)



    retry_prompt = (

        prompt

        + "\n\nIMPORTANT: Return exactly one valid JSON object. "

        "Do not include Markdown, code fences, explanations, or text "

        "before or after the JSON."

    )

    return _call_llm(llm, retry_prompt)





# ============================================================

# GENERAL HELPERS

# ============================================================



def _now() -> str:

    return datetime.now(timezone.utc).isoformat()





def _text(value: Any, default: str = "") -> str:

    if value is None:

        return default

    if isinstance(value, str):

        return value.strip()

    return str(value).strip()





def _list(value: Any) -> list:

    return value if isinstance(value, list) else []





def _score(value: Any) -> float:

    try:

        result = float(value)

    except (TypeError, ValueError):

        return 0.0

    return max(MIN_SCORE, min(MAX_SCORE, result))





def _normalise_topic(topic: Any) -> dict[str, Any]:

    if isinstance(topic, str):

        name = topic.strip()

        return {

            "name": name,

            "description": "",

            "difficulty": "intermediate",

            "questions_target": DEFAULT_QUESTIONS_PER_TOPIC,

        }



    if not isinstance(topic, dict):

        return {}



    name = _text(topic.get("name") or topic.get("topic"))

    if not name:

        return {}



    try:

        target = int(topic.get("questions_target", DEFAULT_QUESTIONS_PER_TOPIC))

    except (TypeError, ValueError):

        target = DEFAULT_QUESTIONS_PER_TOPIC



    target = max(1, min(5, target))



    difficulty = _text(topic.get("difficulty"), "intermediate").lower()

    if difficulty not in {"beginner", "intermediate", "advanced"}:

        difficulty = "intermediate"



    return {

        "name": name,

        "description": _text(topic.get("description")),

        "difficulty": difficulty,

        "questions_target": target,

    }





def _normalise_question(data: dict[str, Any], topic: str) -> dict[str, Any]:

    question = _text(data.get("question"))

    if not question:

        raise ValueError("LLM did not generate a question.")



    difficulty = _text(data.get("difficulty"), "intermediate").lower()

    if difficulty not in {"beginner", "intermediate", "advanced"}:

        difficulty = "intermediate"



    return {

        "question_id": str(uuid4()),

        "topic": _text(data.get("topic"), topic),

        "question": question,

        "difficulty": difficulty,

        "question_type": _text(data.get("question_type"), "technical"),

        "expected_areas": _list(data.get("expected_areas")),

    }





# ============================================================

# INTERVIEW PLAN

# ============================================================



def _fallback_topics(analysis: dict[str, Any]) -> list[dict[str, Any]]:

    """Build a plan without an LLM if the analysis has usable skills."""



    candidates: list[str] = []



    for key in (

        "matched_skills",

        "partially_matched_skills",

        "skills",

        "technical_skills",

    ):

        values = analysis.get(key)

        if isinstance(values, list):

            for value in values:

                if isinstance(value, str):

                    candidates.append(value.strip())

                elif isinstance(value, dict):

                    name = _text(value.get("name") or value.get("skill"))

                    if name:

                        candidates.append(name)



    # Also derive topics from resume projects and experience.

    for key in ("relevant_experience", "relevant_projects", "projects"):

        for item in _list(analysis.get(key)):

            if isinstance(item, str):

                candidates.append(item[:100])

            elif isinstance(item, dict):

                name = _text(

                    item.get("name")

                    or item.get("role")

                    or item.get("title")

                )

                if name:

                    candidates.append(name)



    seen = set()

    topics = []



    for name in candidates:

        key = name.casefold()

        if not name or key in seen:

            continue

        seen.add(key)

        topics.append({

            "name": name,

            "description": "Assess knowledge and practical experience.",

            "difficulty": "intermediate",

            "questions_target": DEFAULT_QUESTIONS_PER_TOPIC,

        })



        if len(topics) >= 5:

            break



    if not topics:

        topics = [

            {

                "name": "Professional experience",

                "description": "Discuss the candidate's relevant experience.",

                "difficulty": "intermediate",

                "questions_target": 2,

            },

            {

                "name": "Technical fundamentals",

                "description": "Assess relevant technical fundamentals.",

                "difficulty": "intermediate",

                "questions_target": 2,

            },

        ]



    return topics





def _generate_interview_plan(

    analysis: dict[str, Any],

    llm: Any,

    language: str = "en-IN",

) -> dict[str, Any]:

    """Generate interview topics using resume analysis and available JD data."""

    logger.info("Generating adaptive interview plan")




    prompt = f"""

You are an adaptive technical interviewer.

Conduct the interview in the language specified below.

Selected interview language: {language}

Language requirements:
- en-IN: Use natural Indian English.
- hi-IN: Use natural Hindi.
- raj-IN: Use natural Rajasthani (Devanagari).
- te-IN: Use natural Telugu.
- ta-IN: Use natural Tamil.
- kn-IN: Use natural Kannada.
- ml-IN: Use natural Malayalam.
- mr-IN: Use natural Marathi.
- bn-IN: Use natural Bengali.
- gu-IN: Use natural Gujarati.
- pa-IN: Use natural Punjabi.

All topic names, descriptions, and candidate-facing text must use
the selected language.
Keep technical terms, programming keywords, and product names in
English when that is more natural for the selected language.
Do not change the candidate's actual skills, experience, or target role.

Create a mock interview plan using the candidate's resume analysis.

Use the job description when it is present. Do not invent experience

or skills that are not supported by the analysis.



The interview must:

\- Focus on the candidate's target role.

\- Cover relevant skills, projects, and professional experience.

\- Include topics for identified skill gaps when relevant to the role.

\- Progress from fundamentals to practical application.

\- Avoid duplicate or unrelated topics.

\- Contain between 3 and 6 topics.

\- Assign 1 to 3 questions per topic.

\- Keep the interview within 15 questions.



Return only a JSON object in this format:

{{

  "target_role": "role",

  "topics": [

    {{

      "name": "topic",

      "description": "what to assess",

      "difficulty": "intermediate",

      "questions_target": 2

    }}

  ]

}}



Candidate resume analysis:

{json.dumps(analysis, ensure_ascii=False, default=str)}

"""



    try:

        result = _call_llm_with_retry(llm, prompt)

        raw_topics = _list(result.get("topics"))

        topics = [

            _normalise_topic(topic)

            for topic in raw_topics

        ]

        topics = [topic for topic in topics if topic]



        if not topics:

            raise ValueError("Interview plan contains no valid topics.")



        topics = topics[:6]



        # Enforce an overall question limit.

        total = sum(t["questions_target"] for t in topics)

        while total > MAX_QUESTIONS_PER_INTERVIEW:

            for topic in reversed(topics):

                if topic["questions_target"] > 1 and total > MAX_QUESTIONS_PER_INTERVIEW:

                    topic["questions_target"] -= 1

                    total -= 1



        return {

            "target_role": _text(

                result.get("target_role")

                or analysis.get("target_role"),

                "General interview",

            ),

            "topics": topics,

        }



    except Exception:

        logger.exception("Could not generate interview plan; using fallback.")

        topics = _fallback_topics(analysis)

        return {

            "target_role": _text(

                analysis.get("target_role"),

                "General interview",

            ),

            "topics": topics,

        }





# ============================================================

# QUESTION GENERATION

# ============================================================



def _generate_question(

    analysis: dict[str, Any],

    topic: dict[str, Any],

    previous_turns: list[dict[str, Any]],

    llm: Any,

    previous_evaluation: dict[str, Any] | None = None,

    language: str = "en-IN",

) -> dict[str, Any]:

    """Generate a question adapted to previous answers."""

    logger.info(
        "Generating interview question topic=%s previous_turns=%s",
        topic.get("name"),
        len(previous_turns),
    )




    history = [

        {

            "topic": turn.get("topic"),

            "question": turn.get("question"),

            "answer": turn.get("answer"),

            "score": turn.get("evaluation", {}).get("score"),

            "feedback": turn.get("evaluation", {}).get("feedback"),

        }

        for turn in previous_turns[-6:]

    ]



    prompt = f"""

You are conducting a live technical mock interview.

Conduct this interview in the selected language.

Selected interview language: {language}

Language requirements:
- en-IN: Natural Indian English.
- hi-IN: Natural Hindi.
- raj-IN: Natural Rajasthani (Devanagari).
- te-IN: Natural Telugu.
- ta-IN: Natural Tamil.
- kn-IN: Natural Kannada.
- ml-IN: Natural Malayalam.
- mr-IN: Natural Marathi.
- bn-IN: Natural Bengali.
- gu-IN: Natural Gujarati.
- pa-IN: Natural Punjabi.

The candidate-facing question must be in the selected language.
Use the selected language for the topic name and expected_areas too.
Keep technical terms, programming keywords, and product names in
English when appropriate.
Do not translate code, identifiers, or established technical terms
in a way that changes their meaning.
Keep the JSON field names and question_type values in English.

Generate exactly one question for the candidate.



Rules:

\- Use the candidate's resume and target role.

\- Focus on the requested topic.

\- Do not ask a question that has already been asked.

\- Adapt the difficulty based on previous answers.

\- If the previous answer was weak, ask a useful foundational or

  clarifying question.

\- If the previous answer was strong, increase the difficulty or

  explore practical application.

\- Questions should be clear and answerable.

\- Do not provide the answer or hints.

\- Do not ask multiple unrelated questions in one question.

\- Return only valid JSON.



Required format:

{{

  "topic": "topic name",

  "question": "one interview question",

  "difficulty": "beginner",

  "question_type": "technical|behavioral|project|scenario",

  "expected_areas": ["area 1", "area 2"]

}}



Candidate analysis:

{json.dumps(analysis, ensure_ascii=False, default=str)}



Current topic:

{json.dumps(topic, ensure_ascii=False)}



Previous interview turns:

{json.dumps(history, ensure_ascii=False, default=str)}



Previous answer evaluation:

{json.dumps(previous_evaluation or {}, ensure_ascii=False, default=str)}

"""



    result = _call_llm_with_retry(llm, prompt)
    question = _normalise_question(result, topic["name"])

    logger.info(
        "Interview question generated topic=%s difficulty=%s",
        question.get("topic"),
        question.get("difficulty"),
    )

    return question





# ============================================================

# ANSWER EVALUATION

# ============================================================



def _evaluate_answer(

    analysis: dict[str, Any],

    question: dict[str, Any],

    answer: str,

    llm: Any,

    language: str = "en-IN",

) -> dict[str, Any]:

    """Evaluate an answer and return a validated evaluation object."""

    logger.info(
        "Evaluating interview answer topic=%s answer_chars=%s",
        question.get("topic"),
        len(answer),
    )




    prompt = f"""

You are an objective technical interview evaluator.

The selected interview language is: {language}

Write all candidate-facing evaluation text in the selected language,
including:
- feedback
- strengths
- gaps
- follow_up_reason

Language requirements:
- en-IN: Natural Indian English.
- hi-IN: Natural Hindi.
- raj-IN: Natural Rajasthani (Devanagari).
- te-IN: Natural Telugu.
- ta-IN: Natural Tamil.
- kn-IN: Natural Kannada.
- ml-IN: Natural Malayalam.
- mr-IN: Natural Marathi.
- bn-IN: Natural Bengali.
- gu-IN: Natural Gujarati.
- pa-IN: Natural Punjabi.

Preserve the meaning of technical terms and programming concepts.
Keep the JSON keys, correctness values, score, and Boolean fields
in the required schema unchanged.
Evaluate the answer fairly even if the candidate uses technical
English terms while speaking another language.

Evaluate the candidate's answer to the interview question.



Evaluation rules:

\- Assess correctness, relevance, completeness, clarity, and practical depth.

\- Consider the candidate's actual experience from the resume.

\- Do not assume that an answer is wrong merely because it is concise.

\- Do not reward unsupported claims.

\- Give a score between 0 and 10.

\- A score of 0 means no meaningful answer.

\- A score of 10 means an accurate, complete and well-explained answer.

\- Provide specific feedback.

\- Identify strengths and knowledge gaps.

\- Decide whether a follow-up question is useful.

\- Do not penalize language style unless it affects clarity.

\- Do not fabricate facts about the candidate.



Return only valid JSON with this schema:

{{

  "score": 0,

  "correctness": "correct|partially_correct|incorrect|not_answered",

  "feedback": "specific feedback",

  "strengths": ["strength"],

  "gaps": ["knowledge gap"],

  "follow_up_required": false,

  "follow_up_reason": ""

}}



Question:

{json.dumps(question, ensure_ascii=False)}



Candidate answer:

{answer}



Resume analysis:

{json.dumps(analysis, ensure_ascii=False, default=str)}

"""



    result = _call_llm_with_retry(llm, prompt)



    correctness = _text(

        result.get("correctness"),

        "partially_correct",

    ).lower()



    allowed = {

        "correct",

        "partially_correct",

        "incorrect",

        "not_answered",

    }

    if correctness not in allowed:

        correctness = "partially_correct"



    follow_up = result.get("follow_up_required", False)

    if not isinstance(follow_up, bool):

        follow_up = str(follow_up).strip().lower() in {"true", "yes", "1"}



    evaluation = {

        "score": _score(result.get("score")),

        "correctness": correctness,

        "feedback": _text(result.get("feedback")),

        "strengths": [

            _text(x) for x in _list(result.get("strengths")) if _text(x)

        ],

        "gaps": [

            _text(x) for x in _list(result.get("gaps")) if _text(x)

        ],

        "follow_up_required": follow_up,

        "follow_up_reason": _text(result.get("follow_up_reason")),

    }

    logger.info(
        "Interview answer evaluated topic=%s score=%s correctness=%s",
        question.get("topic"),
        evaluation["score"],
        evaluation["correctness"],
    )

    return evaluation



def _analyse_full_interview(
    session: dict[str, Any],
    llm: Any
) -> dict[str, Any]:
    """
    Analyse the complete interview for sentiment,
    communication skills, vocabulary and overall performance.
    """

    # Collect all interview questions and answers.
    transcript = []

    for turn in session.get("turns", []):
        transcript.append({
            "question_number": turn.get("question_number"),
            "topic": turn.get("topic"),
            "question": turn.get("question"),
            "answer": turn.get("answer"),
            "technical_score": turn.get("evaluation", {}).get("score")
        })

    prompt = f"""
You are an expert interview evaluator and communication analyst.

Analyse the complete interview transcript.

Candidate: {session.get("candidate_name")}
Target Role: {session.get("target_role")}

TRANSCRIPT:
{json.dumps(transcript, ensure_ascii=False, default=str)}

Perform these four analyses:

1. SENTIMENT ANALYSIS
- Overall sentiment: positive, negative, neutral or mixed.
- Sentiment for every answer.
- Positive, negative and neutral percentages.
- Sentiment changes throughout the interview.
- Confidence expressed through language.

2. COMMUNICATION ANALYSIS
Evaluate from 0 to 10:
- Clarity
- Fluency of expression
- Answer structure
- Logical flow
- Articulation reflected in text
- Relevance
- Conciseness
- Explanation ability

Identify strengths, weaknesses and improvement suggestions.
Provide evidence from actual answers.

3. VOCABULARY ANALYSIS
Evaluate from 0 to 10:
- Vocabulary richness
- Vocabulary variety
- Technical vocabulary
- Professional language
- Grammar
- Sentence construction

Identify:
- Frequently repeated words
- Filler words and expressions
- Vocabulary strengths
- Vocabulary weaknesses
- Recommended professional words
- Improvement tips

4. OVERALL ASSESSMENT
- Overall interview assessment.
- Communication score.
- Vocabulary score.
- Confidence in expression score.
- Top strengths.
- Areas for improvement.
- Personalized recommendations.
- Final candidate feedback.

IMPORTANT RULES:
- Evaluate the entire transcript, not just one answer.
- Do not invent evidence.
- Do not confuse technical knowledge with communication skills.
- Do not infer actual emotions or personality.
- Do not penalize simple English if it communicates clearly.
- Do not assess pronunciation or speaking speed from text.
- All scores must be between 0 and 10.
- Sentiment percentages must total 100.
- Return valid JSON only.

Return exactly this JSON structure:

{{
    "sentiment_analysis": {{
        "overall_sentiment": "positive|negative|neutral|mixed",
        "positive_percentage": 0,
        "negative_percentage": 0,
        "neutral_percentage": 0,
        "answer_sentiments": [
            {{
                "question_number": 1,
                "sentiment": "positive|negative|neutral|mixed",
                "explanation": ""
            }}
        ],
        "sentiment_summary": "",
        "expressed_confidence": "high|moderate|low"
    }},
    "communication_analysis": {{
        "communication_score": 0,
        "clarity": 0,
        "fluency_of_expression": 0,
        "answer_structure": 0,
        "logical_flow": 0,
        "articulation": 0,
        "relevance": 0,
        "conciseness": 0,
        "explanation_ability": 0,
        "strengths": [],
        "weaknesses": [],
        "examples": [],
        "improvement_suggestions": []
    }},
    "vocabulary_analysis": {{
        "vocabulary_score": 0,
        "vocabulary_richness": 0,
        "vocabulary_variety": 0,
        "technical_vocabulary": 0,
        "professional_language": 0,
        "grammar": 0,
        "sentence_construction": 0,
        "frequently_repeated_words": [],
        "filler_words_and_expressions": [],
        "strengths": [],
        "weaknesses": [],
        "recommended_professional_words": [],
        "improvement_tips": []
    }},
    "overall_assessment": {{
        "overall_interview_assessment": "",
        "confidence_in_expression_score": 0,
        "top_strengths": [],
        "areas_for_improvement": [],
        "personalized_recommendations": [],
        "final_candidate_feedback": ""
    }}
}}
"""

    # Call the existing LLM helper.
    result = _call_llm_with_retry(llm, prompt)

    # Validate the response structure.
    required_sections = [
        "sentiment_analysis",
        "communication_analysis",
        "vocabulary_analysis",
        "overall_assessment"
    ]

    for section in required_sections:
        if not isinstance(result.get(section), dict):
            raise ValueError(
                f"LLM response missing valid section: {section}"
            )

    # Normalize all numerical scores.
    score_fields = {
        "communication_analysis": [
            "communication_score",
            "clarity",
            "fluency_of_expression",
            "answer_structure",
            "logical_flow",
            "articulation",
            "relevance",
            "conciseness",
            "explanation_ability"
        ],
        "vocabulary_analysis": [
            "vocabulary_score",
            "vocabulary_richness",
            "vocabulary_variety",
            "technical_vocabulary",
            "professional_language",
            "grammar",
            "sentence_construction"
        ],
        "overall_assessment": [
            "confidence_in_expression_score"
        ]
    }

    for section, fields in score_fields.items():
        for field in fields:
            result[section][field] = _score(
                result[section].get(field)
            )

    logger.info(
        "Complete interview analysis generated for session=%s",
        session.get("session_id")
    )

    return result



# ============================================================

# SESSION HELPERS

# ============================================================



def _current_topic(session: dict[str, Any]) -> dict[str, Any] | None:

    index = session["topic_index"]

    topics = session["topics"]



    if index >= len(topics):

        return None



    return topics[index]





def _topic_question_count(session: dict[str, Any], topic_name: str) -> int:

    return sum(

        1 for turn in session["turns"]

        if turn["topic"] == topic_name

    )





def _next_topic(session: dict[str, Any]) -> dict[str, Any] | None:

    while session["topic_index"] < len(session["topics"]):

        topic = _current_topic(session)

        if topic is None:

            return None



        count = _topic_question_count(session, topic["name"])

        if count < topic["questions_target"]:

            return topic



        session["topic_index"] += 1



    return None





def _build_performance(session: dict[str, Any], llm: Any = None) -> dict[str, Any]:

    """Build the final report from the recorded evaluations."""



    turns = session["turns"]

    scores = [

        _score(turn["evaluation"].get("score"))

        for turn in turns

        if isinstance(turn.get("evaluation"), dict)

    ]



    overall_score = round(sum(scores) / len(scores), 2) if scores else 0.0



    topic_performance = []

    for topic in session["topics"]:

        topic_turns = [

            turn for turn in turns

            if turn["topic"] == topic["name"]

        ]

        topic_scores = [

            _score(turn["evaluation"].get("score"))

            for turn in topic_turns

            if isinstance(turn.get("evaluation"), dict)

        ]



        topic_performance.append({

            "topic": topic["name"],

            "questions_asked": len(topic_turns),

            "average_score": (

                round(sum(topic_scores) / len(topic_scores), 2)

                if topic_scores else 0.0

            ),

            "status": (

                "completed"

                if len(topic_turns) >= topic["questions_target"]

                else "partially_completed"

            ),

        })



    strengths = []

    gaps = []



    for turn in turns:

        evaluation = turn.get("evaluation", {})

        strengths.extend(evaluation.get("strengths", []))

        gaps.extend(evaluation.get("gaps", []))



    def unique(items: list[str]) -> list[str]:

        output = []

        seen = set()

        for item in items:

            value = _text(item)

            key = value.casefold()

            if value and key not in seen:

                seen.add(key)

                output.append(value)

        return output



    strengths = unique(strengths)

    gaps = unique(gaps)



    recommendations = [

        f"Review and practise: {gap}"

        for gap in gaps[:8]

    ]



    
    report = {
        "session_id": session["session_id"],
        "candidate_id": session["candidate_id"],
        "candidate_name": session["candidate_name"],
        "target_role": session["target_role"],
        "status": session["status"],
        "started_at": session["started_at"],
        "finished_at": session.get("finished_at"),
        "total_questions": len(turns),
        "overall_score": overall_score,
        "topics_covered": [
            item["topic"]
            for item in topic_performance
            if item["questions_asked"] > 0
        ],
        "topic_performance": topic_performance,
        "strengths": strengths,
        "gaps": gaps,
        "recommendations": recommendations,
        "turns": turns,
    }

    # Generate complete interview analysis.
    if llm is not None and turns:
        try:
            report["llm_analysis"] = _analyse_full_interview(
                session=session,
                llm=llm
            )
        except Exception:
            logger.exception("Full interview analysis failed")

            report["llm_analysis"] = {
                "status": "failed",
                "message": "LLM analysis could not be generated."
            }
    else:
        report["llm_analysis"] = {
            "status": "unavailable",
            "message": "LLM instance not provided."
        }

    return report






# ============================================================

# PUBLIC API FUNCTIONS

# ============================================================



def start_interview(

    analysis: dict[str, Any],

    llm: Any,

    candidate_id: str | None = None,

    language: str = "en-IN",

) -> dict[str, Any]:

    """Create a session that always begins with an easy self-introduction."""

    logger.info("Starting mock interview")

    if not isinstance(analysis, dict) or not analysis:
        raise ValueError("A non-empty resume analysis is required.")

    if llm is None:
        raise ValueError("LLM is required to start the interview.")

    plan = _generate_interview_plan(analysis=analysis,llm=llm,language=language)
    technical_topics = list(plan["topics"])

    # Reserve one question for the introduction and keep the overall limit at 15.
    remaining = MAX_QUESTIONS_PER_INTERVIEW - 1
    total = sum(topic["questions_target"] for topic in technical_topics)
    while total > remaining:
        changed = False
        for topic in reversed(technical_topics):
            if topic["questions_target"] > 1 and total > remaining:
                topic["questions_target"] -= 1
                total -= 1
                changed = True
        if not changed:
            # If every topic is already at one question, remove topics from the end.
            if len(technical_topics) > 1:
                removed = technical_topics.pop()
                total -= removed["questions_target"]
            else:
                break

    intro_topics = {
    "en-IN": {
        "name": "Self Introduction",
        "description": "A simple introduction covering the candidate's background, education, skills, and interests.",
    },
    "hi-IN": {
        "name": "स्व-परिचय",
        "description": "उम्मीदवार की पृष्ठभूमि, शिक्षा, कौशल और रुचियों का संक्षिप्त परिचय।",
    },
    "raj-IN": {
        "name": "आपणो परिचय",
        "description": "उम्मीदवार री पृष्ठभूमि, शिक्षा, हुनर अर रुचियां रो संक्षिप्त परिचय।",
    },
    "te-IN": {
        "name": "స్వీయ పరిచయం",
        "description": "అభ్యర్థి నేపథ్యం, విద్య, నైపుణ్యాలు మరియు ఆసక్తుల గురించి సంక్షిప్త పరిచయం.",
    },
    "ta-IN": {
        "name": "சுய அறிமுகம்",
        "description": "விண்ணப்பதாரரின் பின்னணி, கல்வி, திறன்கள் மற்றும் ஆர்வங்களைப் பற்றிய சுருக்கமான அறிமுகம்.",
    },
    "kn-IN": {
        "name": "ಸ್ವಯಂ ಪರಿಚಯ",
        "description": "ಅಭ್ಯರ್ಥಿಯ ಹಿನ್ನೆಲೆ, ಶಿಕ್ಷಣ, ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಆಸಕ್ತಿಗಳ ಸಂಕ್ಷಿಪ್ತ ಪರಿಚಯ.",
    },
    "ml-IN": {
        "name": "സ്വയം പരിചയം",
        "description": "സ്ഥാനാർഥിയുടെ പശ്ചാത്തലം, വിദ്യാഭ്യാസം, കഴിവുകൾ, താൽപ്പര്യങ്ങൾ എന്നിവയുടെ സംക്ഷിപ്ത പരിചയം.",
    },
    "mr-IN": {
        "name": "स्वतःची ओळख",
        "description": "उमेदवाराची पार्श्वभूमी, शिक्षण, कौशल्ये आणि आवडी यांचा संक्षिप्त परिचय.",
    },
    "bn-IN": {
        "name": "আত্মপরিচয়",
        "description": "প্রার্থীর পটভূমি, শিক্ষা, দক্ষতা ও আগ্রহের সংক্ষিপ্ত পরিচয়।",
    },
    "gu-IN": {
        "name": "સ્વ-પરિચય",
        "description": "ઉમેદવારની પૃષ્ઠભૂમિ, શિક્ષણ, કૌશલ્યો અને રુચિઓનો સંક્ષિપ્ત પરિચય.",
    },
    "pa-IN": {
        "name": "ਸਵੈ-ਪਛਾਣ",
        "description": "ਉਮੀਦਵਾਰ ਦੀ ਪਿਛੋਕੜ, ਸਿੱਖਿਆ, ਹੁਨਰਾਂ ਅਤੇ ਦਿਲਚਸਪੀਆਂ ਬਾਰੇ ਸੰਖੇਪ ਜਾਣ-ਪਛਾਣ।",
    },
}

    intro_topic = {
        **intro_topics.get(language, intro_topics["en-IN"]),
        "difficulty": "beginner",
        "questions_target": 1,
    }
    topics = [intro_topic] + technical_topics

    session_id = str(uuid4())
    candidate_name = _text(analysis.get("candidate_name"), "Candidate")

    session = {
        "session_id": session_id,
        "candidate_id": candidate_id,
        "language": language,
        "candidate_name": candidate_name,
        "target_role": plan["target_role"],
        "analysis": analysis,
        "topics": topics,
        "topic_index": 0,
        "turns": [],
        "current_question": None,
        "status": "in_progress",
        "started_at": _now(),
        "finished_at": None,
        "performance": None,
    }

    # The first question is fixed, so the interview always starts with an introduction.
    # question = {
    #     "question_id": str(uuid4()),
    #     "topic": "Self Introduction",
    #     "question": "Please introduce yourself and briefly tell me about your education, skills, and interests.",
    #     "difficulty": "beginner",
    #     "question_type": "behavioral",
    #     "expected_areas": ["Personal background", "Education", "Skills", "Interests"],
    # }
    intro_questions = {
    "en-IN": (
        "Please introduce yourself and briefly tell me about "
        "your education, skills, and interests."
    ),
    "hi-IN": (
        "कृपया अपना परिचय दें और अपनी शिक्षा, कौशल तथा रुचियों "
        "के बारे में संक्षेप में बताएं।"
    ),
    "raj-IN": (
        "कृपया आपणो परिचय दो अर आप री शिक्षा, हुनर अर रुचियां "
        "रे बारे में थोड़े में बताओ।"
    ),
    "te-IN": (
        "దయచేసి మీ గురించి పరిచయం చేసుకోండి. మీ విద్య, నైపుణ్యాలు "
        "మరియు ఆసక్తుల గురించి క్లుప్తంగా చెప్పండి."
    ),
    "ta-IN": (
        "தயவுசெய்து உங்களை அறிமுகப்படுத்தி, உங்கள் கல்வி, திறன்கள் "
        "மற்றும் ஆர்வங்களைப் பற்றி சுருக்கமாகக் கூறுங்கள்."
    ),
    "kn-IN": (
        "ದಯವಿಟ್ಟು ನಿಮ್ಮನ್ನು ಪರಿಚಯಿಸಿಕೊಳ್ಳಿ. ನಿಮ್ಮ ಶಿಕ್ಷಣ, ಕೌಶಲ್ಯಗಳು "
        "ಮತ್ತು ಆಸಕ್ತಿಗಳ ಬಗ್ಗೆ ಸಂಕ್ಷಿಪ್ತವಾಗಿ ತಿಳಿಸಿ."
    ),
    "ml-IN": (
        "ദയവായി നിങ്ങളെ പരിചയപ്പെടുത്തുകയും നിങ്ങളുടെ വിദ്യാഭ്യാസം, "
        "കഴിവുകൾ, താൽപ്പര്യങ്ങൾ എന്നിവയെക്കുറിച്ച് ചുരുക്കമായി പറയുകയും ചെയ്യുക."
    ),
    "mr-IN": (
        "कृपया स्वतःची ओळख करून द्या आणि तुमचे शिक्षण, कौशल्ये "
        "आणि आवडी याबद्दल थोडक्यात सांगा."
    ),
    "bn-IN": (
        "অনুগ্রহ করে নিজের পরিচয় দিন এবং আপনার শিক্ষা, দক্ষতা "
        "ও আগ্রহ সম্পর্কে সংক্ষেপে বলুন।"
    ),
    "gu-IN": (
        "કૃપા કરીને તમારો પરિચય આપો અને તમારા શિક્ષણ, કૌશલ્યો "
        "અને રુચિઓ વિશે ટૂંકમાં જણાવો."
    ),
    "pa-IN": (
        "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਜਾਣ-ਪਛਾਣ ਦਿਓ ਅਤੇ ਆਪਣੀ ਸਿੱਖਿਆ, ਹੁਨਰਾਂ "
        "ਅਤੇ ਦਿਲਚਸਪੀਆਂ ਬਾਰੇ ਸੰਖੇਪ ਵਿੱਚ ਦੱਸੋ।"
    ),
    }

    question = {
        "question_id": str(uuid4()),
        "topic": "Self Introduction",
        "question": intro_questions.get(
            language, intro_questions["en-IN"]
        ),
        "difficulty": "beginner",
        "question_type": "behavioral",
        "expected_areas": [
            "Personal background",
            "Education",
            "Skills",
            "Interests",
        ],
    }
    session["current_question"] = question

    with _LOCK:
        _SESSIONS[session_id] = session

    return {
        "session_id": session_id,
        "candidate_id": candidate_id,
        "candidate_name": candidate_name,
        "target_role": session["target_role"],
        "question_number": 1,
        "total_questions": sum(t["questions_target"] for t in topics),
        "topics": topics,
        "question": question,
        "status": "in_progress",
    }



def get_interview_state(session_id: str) -> dict[str, Any]:

    """Return the current state of an interview session."""

    logger.debug("Reading mock interview state session_id=%s", session_id)




    with _LOCK:

        session = _SESSIONS.get(session_id)

        if session is None:

            raise KeyError("Interview session not found.")



        question_number = len(session["turns"]) + (

            1 if session["status"] == "in_progress" else 0

        )



        result = {

            "session_id": session_id,

            "candidate_id": session["candidate_id"],

            "candidate_name": session["candidate_name"],

            "target_role": session["target_role"],

            "question_number": question_number,

            "total_questions": sum(

                t["questions_target"] for t in session["topics"]

            ),

            "question": session["current_question"],

            "status": session["status"],

            "topics": session["topics"],

            "answered_questions": len(session["turns"]),

        }



        if session["status"] == "completed":

            result["performance"] = session["performance"]



        return result





def submit_answer(

    session_id: str,

    answer: str,

    llm: Any,

) -> dict[str, Any]:

    """Evaluate an answer and generate the next adaptive question."""

    logger.info(
        "Submitting interview answer session_id=%s answer_chars=%s",
        session_id,
        len(answer or ""),
    )




    answer = _text(answer)

    if not answer:

        raise ValueError("Answer cannot be empty.")



    if llm is None:

        raise ValueError("LLM is required to evaluate the answer.")



    # Lock the complete operation to prevent concurrent answers to

    # the same in-memory session.

    with _LOCK:

        session = _SESSIONS.get(session_id)

        if session is None:

            raise KeyError("Interview session not found.")



        if session["status"] != "in_progress":

            raise ValueError("Interview is not in progress.")



        question = session["current_question"]
        if question is None:

            raise ValueError("No active interview question.")

        evaluation = _evaluate_answer(

            analysis=session["analysis"],

            question=question,

            answer=answer,

            llm=llm,

            language=session.get("language", "en-IN"),

        )



        turn = {

            "question_number": len(session["turns"]) + 1,

            "topic": question["topic"],

            "question": question["question"],

            "difficulty": question["difficulty"],

            "answer": answer,

            "evaluation": evaluation,

            "answered_at": _now(),

        }

        session["turns"].append(turn)



        # Check whether the current topic or entire interview is complete.

        topic = _next_topic(session)



        if topic is None:

            session["current_question"] = None

            session["status"] = "completed"

            session["finished_at"] = _now()

            session["performance"] = _build_performance(session,llm)



            return {

                "session_id": session_id,

                "evaluation": evaluation,

                "question": None,

                "status": "completed",

                "performance": session["performance"],

            }



        try:

            next_question = _generate_question(

                analysis=session["analysis"],

                topic=topic,

                previous_turns=session["turns"],

                llm=llm,

                previous_evaluation=evaluation,

                language=session.get("language", "en-IN"),

            )

        except Exception:

            # The submitted answer is already recorded. Do not silently

            # discard it if generating the next question fails.

            logger.exception("Failed to generate the next question")

            session["current_question"] = None

            return {

                "session_id": session_id,

                "evaluation": evaluation,

                "question": None,

                "status": "question_generation_failed",

                "message": (

                    "The answer was recorded, but the next question "

                    "could not be generated. Retry or finish the interview."

                ),

            }



        session["current_question"] = next_question



        return {

            "session_id": session_id,

            "question_number": len(session["turns"]) + 1,

            "total_questions": sum(

                t["questions_target"] for t in session["topics"]

            ),

            "evaluation": evaluation,

            "question": next_question,

            "status": "in_progress",

        }





def evaluate_answer_only(
    analysis: dict[str, Any],
    question: dict[str, Any],
    answer: str,
    llm: Any,
    language: str = "en-IN",
) -> dict[str, Any]:
    """Evaluate an answer without advancing an interview session."""
    answer = _text(answer)
    if not answer:
        raise ValueError("Answer cannot be empty.")
    if llm is None:
        raise ValueError("LLM is required to evaluate the answer.")
    if not isinstance(question, dict) or not _text(question.get("question")):
        raise ValueError("A question is required.")
    return _evaluate_answer(
        analysis=analysis or {},
        question=question,
        answer=answer,
        llm=llm,
        language=language or "en-IN",
    )


def reattempt_answer(
    session_id: str,
    question_number: int,
    answer: str,
    llm: Any,
) -> dict[str, Any]:
    """Replace a previous turn's answer and evaluation."""
    answer = _text(answer)
    if not answer:
        raise ValueError("Answer cannot be empty.")
    if llm is None:
        raise ValueError("LLM is required to evaluate the answer.")
    number = int(question_number or 0)
    if number < 1:
        raise ValueError("Choose a question to reattempt.")

    with _LOCK:
        session = _SESSIONS.get(session_id)
        if session is None:
            raise KeyError("Interview session not found.")

        turns = session.get("turns") or []
        index = number - 1
        if index < 0 or index >= len(turns):
            raise ValueError("That question cannot be reattempted.")

        previous = turns[index]
        question = {
            "topic": previous.get("topic"),
            "question": previous.get("question"),
            "difficulty": previous.get("difficulty"),
            "question_type": previous.get("question_type") or "technical",
            "expected_areas": previous.get("expected_areas") or [],
        }
        evaluation = _evaluate_answer(
            analysis=session["analysis"],
            question=question,
            answer=answer,
            llm=llm,
            language=session.get("language", "en-IN"),
        )
        turns[index] = {
            **previous,
            "answer": answer,
            "evaluation": evaluation,
            "answered_at": _now(),
        }
        session["turns"] = turns
        if session.get("status") == "completed" or session.get("performance") is not None:
            session["performance"] = _build_performance(session, llm)

        return {
            "session_id": session_id,
            "question_number": number,
            "evaluation": evaluation,
            "status": session.get("status") or "in_progress",
            "performance": session.get("performance"),
        }


def finish_interview(session_id: str, llm: Any = None) -> dict[str, Any]:

    """Finish an interview and return its performance report."""

    logger.info("Finishing mock interview session_id=%s", session_id)




    with _LOCK:

        session = _SESSIONS.get(session_id)

        if session is None:

            raise KeyError("Interview session not found.")



        if session["performance"] is not None:

            return session["performance"]



        session["status"] = "completed"

        session["finished_at"] = _now()

        session["current_question"] = None

        session["performance"] = _build_performance(session,llm)



        return session["performance"]
