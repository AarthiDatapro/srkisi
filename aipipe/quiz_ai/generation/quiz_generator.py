from __future__ import annotations

from typing import Any

from .batch_generator import QuizBatchGenerator


class QuizGenerator:
    """
    Public high_level quiz generation API.

    QuizGenerator delegates actual generation to
    QuizBatchGenerator and returns a JSON-compatible
    dictionary.
    """

    def __init__(
        self,
        agent,
        batch_size: int = 10,
        max_retries: int = 2,
    ):
        if agent is None:
            raise ValueError(
                "agent is required"
            )

        self.agent = agent

        self.batch_generator = QuizBatchGenerator(
            agent=agent,
            batch_size=batch_size,
            max_retries=max_retries,
        )

    def generate(
        self,
        content: str,
        count: int | None = None,
        difficulty: dict[str, int] | str | None = None,
        bloom: dict[str, int] | str | None = None,
        total_questions: int | None = None,
        difficulty_distribution: dict[str, int] | None = None,
        bloom_distribution: dict[str, int] | None = None,
    ) -> dict[str, Any]:

        result = self.batch_generator.generate(
            content=content,
            count=count,
            difficulty=difficulty,
            bloom=bloom,
            total_questions=total_questions,
            difficulty_distribution=difficulty_distribution,
            bloom_distribution=bloom_distribution,
        )

        # Pydantic Quiz -> JSON-compatible dict
        if hasattr(result, "model_dump"):
            return result.model_dump()

        # Already dictionary
        if isinstance(result, dict):
            return result

        raise TypeError(
            "Quiz generator returned an unsupported "
            f"type: {type(result).__name__}"
        )

    async def agenerate(
        self,
        content: str,
        count: int | None = None,
        difficulty: dict[str, int] | str | None = None,
        bloom: dict[str, int] | str | None = None,
        total_questions: int | None = None,
        difficulty_distribution: dict[str, int] | None = None,
        bloom_distribution: dict[str, int] | None = None,
    ) -> dict[str, Any]:

        # Keep the public API ready for async support.
        #
        # If QuizBatchGenerator gets a native async generation
        # implementation later, this method can delegate to it.

        return self.generate(
            content=content,
            count=count,
            difficulty=difficulty,
            bloom=bloom,
            total_questions=total_questions,
            difficulty_distribution=difficulty_distribution,
            bloom_distribution=bloom_distribution,
        )