from __future__ import annotations

from typing import Literal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)


# ============================================================
# TYPES
# ============================================================

Difficulty = Literal[
    "easy",
    "medium",
    "hard",
]


BloomLevel = Literal[
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
]


# ============================================================
# QUIZ QUESTION
# ============================================================

class QuizQuestion(BaseModel):
    """
    Represents one multiple_choice quiz question.
    """

    question: str = Field(
        min_length=1,
    )

    options: list[str] = Field(
        min_length=4,
        max_length=4,
    )

    correct_answer: str = Field(
        min_length=1,
    )

    explanation: str = Field(
        min_length=1,
    )

    difficulty: Difficulty

    bloom: BloomLevel

    # --------------------------------------------------------
    # OPTIONS VALIDATION
    # --------------------------------------------------------

    @field_validator("options")
    @classmethod
    def validate_options(
        cls,
        value: list[str],
    ) -> list[str]:

        if len(value) != 4:
            raise ValueError(
                "Exactly four options are required."
            )

        cleaned = [
            option.strip()
            for option in value
        ]

        # No empty options
        if any(
            not option
            for option in cleaned
        ):
            raise ValueError(
                "Options cannot be empty."
            )

        # Options must be unique
        if len(set(cleaned)) != 4:
            raise ValueError(
                "Options must be unique."
            )

        # Return cleaned values
        return cleaned

    # --------------------------------------------------------
    # CORRECT ANSWER VALIDATION
    # --------------------------------------------------------

    @field_validator("correct_answer")
    @classmethod
    def validate_correct_answer(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if not value:
            raise ValueError(
                "Correct answer cannot be empty."
            )

        return value

    # --------------------------------------------------------
    # CROSS-FIELD VALIDATION
    # --------------------------------------------------------

    @model_validator(mode="after")
    def validate_correct_answer_in_options(self):
        """
        Ensure the correct answer actually exists
        among the four options.
        """

        normalized_answer = (
            self.correct_answer.strip().lower()
        )

        normalized_options = {
            option.strip().lower()
            for option in self.options
        }

        if normalized_answer not in normalized_options:
            raise ValueError(
                "correct_answer must match one "
                "of the four options."
            )

        return self


# ============================================================
# QUIZ
# ============================================================

class Quiz(BaseModel):
    """
    Complete quiz.

    `count` represents the number of questions and must
    match the actual number of questions.
    """

    questions: list[QuizQuestion] = Field(
        min_length=0,
    )

    count: int = Field(
        ge=0,
    )

    # --------------------------------------------------------
    # COUNT VALIDATION
    # --------------------------------------------------------

    @model_validator(mode="after")
    def validate_count_matches_questions(self):
        """
        Ensure count matches the actual question list.
        """

        actual_count = len(self.questions)

        if self.count != actual_count:
            raise ValueError(
                f"count ({self.count}) must match "
                f"the number of questions ({actual_count})."
            )

        return self
