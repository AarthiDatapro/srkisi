from __future__ import annotations

import re


class QuizManipulationDetector:
    """
    Detect instructions that attempt to manipulate quiz generation,
    answers, question counts, or quiz security constraints.
    """

    PATTERNS = [
        (
            "all_options_correct",
            r"\bmark\s+every\s+option\s+as\s+correct\b",
        ),
        (
            "all_options_correct",
            r"\bmake\s+every\s+option\s+correct\b",
        ),
        (
            "all_options_correct",
            r"\bmake\s+all\s+options?\s+correct\b",
        ),
        (
            "all_options_correct",
            r"\bmark\s+all\s+options?\s+as\s+correct\b",
        ),
        (
            "all_answers_correct",
            r"\bmake\s+all\s+answers?\s+correct\b",
        ),
        (
            "all_answers_correct",
            r"\bmake\s+every\s+answer\s+correct\b",
        ),
        (
            "all_answers_correct",
            r"\bset\s+all\s+answers?\s+to\s+correct\b",
        ),
        (
            "all_answers_correct",
            r"\bmark\s+all\s+answers?\s+as\s+correct\b",
        ),
        (
            "question_count_override",
            r"\bignore\s+the\s+requested\s+number\s+of\s+questions\b",
        ),
        (
            "question_count_override",
            r"\bignore\s+the\s+question\s+count\b",
        ),
        (
            "question_count_override",
            r"\bchange\s+the\s+requested\s+number\s+of\s+questions\b",
        ),
        (
            "system_prompt_in_quiz",
            r"\bgenerate\s+questions?\s+containing\s+the\s+system\s+prompt\b",
        ),
        (
            "secret_in_quiz",
            r"\binclude\s+api\s+keys?\s+in\s+the\s+quiz\b",
        ),
        (
            "secret_in_quiz",
            r"\binclude\s+secrets?\s+in\s+the\s+quiz\b",
        ),
        (
            "hidden_instruction",
            r"\binclude\s+hidden\s+instructions?\s+in\s+the\s+quiz\b",
        ),
        (
            "answer_override",
            r"\bchange\s+the\s+correct\s+answer\b",
        ),
        (
            "answer_override",
            r"\bchange\s+the\s+answer\s+after\s+generating\b",
        ),
        (
            "wrong_answer_override",
            r"\bmake\s+the\s+wrong\s+answer\s+correct\b",
        ),
    ]

    def detect(self, text: str) -> dict:
        if not isinstance(text, str):
            raise TypeError(
                "QuizManipulationDetector expects a string."
            )

        matches: list[str] = []

        for category, pattern in self.PATTERNS:
            if re.search(
                pattern,
                text,
                flags=re.IGNORECASE | re.DOTALL,
            ):
                if category not in matches:
                    matches.append(category)

        return {
            "detected": bool(matches),
            "matches": matches,
        }
