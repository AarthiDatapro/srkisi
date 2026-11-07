from __future__ import annotations

import json

import logging

import os

from io import BytesIO

from pathlib import Path

from typing import Any, Literal

from dotenv import load_dotenv

from pydantic import BaseModel, Field, field_validator

# ============================================================

# PROJECT CONFIGURATION

# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent

load_dotenv(PROJECT_ROOT / ".env")

CONFIG_DIR = PROJECT_ROOT / "config"

LLM_CONFIG = CONFIG_DIR / "llm.yaml"

# ============================================================

# AIPipe

# ============================================================

# IMPORTANT:

# AIPipe comes from the installed aiforge-framework package.

# No local source path is added to sys.path.

from aipipe import LLM

from aipipe.exceptions import SecurityError

from aipipe.security import SecurityManager

# ============================================================

# quiz_ai

# ============================================================

from quiz_ai import QuizAgent, QuizGenerator

from quiz_ai.security import (

    QuizSecurityPolicy,

    SecurityAgent,

)

logger = logging.getLogger(__name__)

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

VALID_DIFFICULTIES = {

    "easy",

    "medium",

    "hard",

}

VALID_BLOOM_LEVELS = {

    "remember",

    "understand",

    "apply",

    "analyze",

    "evaluate",

    "create",

}

# ============================================================

# DEFAULTS

# ============================================================

DEFAULT_COUNT = 10

DEFAULT_DIFFICULTY = {

    "easy": 3,

    "medium": 4,

    "hard": 3,

}

DEFAULT_BLOOM = {

    "remember": 2,

    "understand": 2,

    "apply": 2,

    "analyze": 2,

    "evaluate": 1,

    "create": 1,

}

# ============================================================

# REQUEST MODEL

# ============================================================

class QuizGenerationRequest(BaseModel):

    content: str = Field(

        ...,

        min_length=1,

        description="Learning content.",

    )

    count: int = Field(

        default=5,

        ge=1,

        le=100,

        description="Number of questions.",

    )

    difficulty: dict[Difficulty, int] | None = None

    bloom: dict[BloomLevel, int] | None = None

    @field_validator("content")

    @classmethod

    def validate_content(

        cls,

        value: str,

    ) -> str:

        value = value.strip()

        if not value:

            raise ValueError(

                "content cannot be empty."

            )

        return value

    @field_validator("difficulty")

    @classmethod

    def validate_difficulty(

        cls,

        value: dict[Difficulty, int] | None,

    ):

        if value is None:

            return None

        for key, amount in value.items():

            if not isinstance(amount, int):

                raise ValueError(

                    f"Difficulty '{key}' must be an integer."

                )

            if amount < 0:

                raise ValueError(

                    f"Difficulty '{key}' cannot be negative."

                )

        return value

    @field_validator("bloom")

    @classmethod

    def validate_bloom(

        cls,

        value: dict[BloomLevel, int] | None,

    ):

        if value is None:

            return None

        for key, amount in value.items():

            if not isinstance(amount, int):

                raise ValueError(

                    f"Bloom level '{key}' must be an integer."

                )

            if amount < 0:

                raise ValueError(

                    f"Bloom level '{key}' cannot be negative."

                )

        return value

# ============================================================

# RESPONSE MODEL

# ============================================================

class QuizResponse(BaseModel):

    success: bool

    quiz_id: str

    source: dict[str, Any]

    settings: dict[str, Any]

    question_count: int

    questions: list[dict[str, Any]]

# ============================================================

# ERROR MODEL

# ============================================================

class ErrorResponse(BaseModel):

    success: bool = False

    exception: str

    message: str

# ============================================================

# DISTRIBUTION RESOLUTION

# ============================================================

def resolve_distributions(

    count: int,

    difficulty: dict[str, int] | None = None,

    bloom: dict[str, int] | None = None,

) -> tuple[

    dict[str, int],

    dict[str, int],

]:

    if difficulty is None:

        if count == DEFAULT_COUNT:

            difficulty = DEFAULT_DIFFICULTY.copy()

        else:

            difficulty = {

                "medium": count

            }

    if bloom is None:

        if count == DEFAULT_COUNT:

            bloom = DEFAULT_BLOOM.copy()

        else:

            bloom = {

                "understand": count

            }

    return (

        difficulty,

        bloom,

    )

# ============================================================

# REQUEST VALIDATION

# ============================================================

def validate_generation_request(

    content: str,

    count: int,

    difficulty: dict[str, int],

    bloom: dict[str, int],

) -> None:

    if not isinstance(content, str):

        raise TypeError(

            "content must be a string."

        )

    content = content.strip()

    if not content:

        raise ValueError(

            "content cannot be empty."

        )

    if count < 1:

        raise ValueError(

            "count must be greater than 0."

        )

    if count > 100:

        raise ValueError(

            "count cannot be greater than 100."

        )

    if not isinstance(difficulty, dict):

        raise TypeError(

            "difficulty must be a dictionary."

        )

    if not isinstance(bloom, dict):

        raise TypeError(

            "bloom must be a dictionary."

        )

    unknown_difficulty = (

        set(difficulty)

        - VALID_DIFFICULTIES

    )

    if unknown_difficulty:

        raise ValueError(

            f"Invalid difficulty values: "

            f"{sorted(unknown_difficulty)}"

        )

    unknown_bloom = (

        set(bloom)

        - VALID_BLOOM_LEVELS

    )

    if unknown_bloom:

        raise ValueError(

            f"Invalid Bloom levels: "

            f"{sorted(unknown_bloom)}"

        )

    if any(

        not isinstance(value, int)

        or value < 0

        for value in difficulty.values()

    ):

        raise ValueError(

            "Difficulty counts must be non-negative integers."

        )

    if any(

        not isinstance(value, int)

        or value < 0

        for value in bloom.values()

    ):

        raise ValueError(

            "Bloom counts must be non-negative integers."

        )

    if sum(difficulty.values()) != count:

        raise ValueError(

            "Difficulty distribution must equal question count. "

            f"Expected {count}, "

            f"got {sum(difficulty.values())}."

        )

    if sum(bloom.values()) != count:

        raise ValueError(

            "Bloom distribution must equal question count. "

            f"Expected {count}, "

            f"got {sum(bloom.values())}."

        )

# ============================================================

# QUIZ OBJECT -> DICTIONARY

# ============================================================

def quiz_to_dict(

    quiz: Any,

) -> dict[str, Any]:

    if isinstance(quiz, dict):

        return quiz

    if hasattr(quiz, "model_dump"):

        data = quiz.model_dump()

        if not isinstance(data, dict):

            raise ValueError(

                "Quiz model_dump() did not return a dictionary."

            )

        return data

    if hasattr(quiz, "dict"):

        data = quiz.dict()

        if not isinstance(data, dict):

            raise ValueError(

                "Quiz dict() did not return a dictionary."

            )

        return data

    raise ValueError(

        f"Unsupported quiz object type: "

        f"{type(quiz).__name__}"

    )

# ============================================================

# NORMALIZE QUIZ

# ============================================================

def normalize_quiz(

    quiz: Any,

) -> dict[str, Any]:

    data = quiz_to_dict(

        quiz

    )

    questions = (

        data.get("questions")

        or data.get("items")

        or data.get("quiz")

    )

    if questions is None:

        raise ValueError(

            "Generated quiz does not contain "

            "a 'questions' collection."

        )

    if not isinstance(

        questions,

        list,

    ):

        raise ValueError(

            "Generated quiz 'questions' must be a list."

        )

    normalized_questions = []

    for index, question in enumerate(

        questions,

        start=1,

    ):

        if hasattr(

            question,

            "model_dump",

        ):

            question = question.model_dump()

        elif hasattr(

            question,

            "dict",

        ):

            question = question.dict()

        if not isinstance(

            question,

            dict,

        ):

            raise ValueError(

                f"Question {index} is not a dictionary."

            )

        question_text = str(

            question.get(

                "question_text"

            )

            or question.get(

                "question"

            )

            or ""

        ).strip()

        options = (

            question.get(

                "options"

            )

            or []

        )

        if not isinstance(

            options,

            list,

        ):

            raise ValueError(

                f"Question {index}: "

                "options must be a list."

            )

        options = [

            str(option).strip()

            for option in options

            if str(option).strip()

        ]

        correct_answer = str(

            question.get(

                "correct_answer"

            )

            or ""

        ).strip()

        explanation = str(

            question.get(

                "explanation"

            )

            or ""

        ).strip()

        difficulty = str(

            question.get(

                "difficulty"

            )

            or "medium"

        ).strip().lower()

        bloom_level = str(

            question.get(

                "bloom_level"

            )

            or question.get(

                "bloom"

            )

            or "understand"

        ).strip().lower()

        normalized_questions.append(

            {

                "question_number": index,

                "question_text": question_text,

                "options": options,

                "correct_answer": correct_answer,

                "explanation": explanation,

                "difficulty": difficulty,

                "bloom_level": bloom_level,

            }

        )

    return {

        "questions": normalized_questions,

    }

# ============================================================

# GENERATED QUIZ VALIDATION

# ============================================================

def validate_generated_quiz(

    quiz: dict[str, Any],

    expected_count: int,

    expected_difficulty: dict[str, int],

    expected_bloom: dict[str, int],

) -> dict[str, Any]:

    if not isinstance(

        quiz,

        dict,

    ):

        raise ValueError(

            "Quiz must be a dictionary."

        )

    questions = quiz.get(

        "questions"

    )

    if not isinstance(

        questions,

        list,

    ):

        raise ValueError(

            "Quiz must contain a list named 'questions'."

        )

    if len(questions) != expected_count:

        raise ValueError(

            "Question count validation failed. "

            f"Expected {expected_count}, "

            f"got {len(questions)}."

        )

    seen_questions: set[str] = set()

    actual_difficulty = {

        "easy": 0,

        "medium": 0,

        "hard": 0,

    }

    actual_bloom = {

        "remember": 0,

        "understand": 0,

        "apply": 0,

        "analyze": 0,

        "evaluate": 0,

        "create": 0,

    }

    validation_errors = []

    for index, question in enumerate(

        questions,

        start=1,

    ):

        if not isinstance(

            question,

            dict,

        ):

            validation_errors.append(

                f"Question {index}: invalid object."

            )

            continue

        question_text = str(

            question.get(

                "question_text",

                "",

            )

        ).strip()

        options = question.get(

            "options",

            [],

        )

        correct_answer = str(

            question.get(

                "correct_answer",

                "",

            )

        ).strip()

        explanation = str(

            question.get(

                "explanation",

                "",

            )

        ).strip()

        difficulty = str(

            question.get(

                "difficulty",

                "",

            )

        ).strip().lower()

        bloom_level = str(

            question.get(

                "bloom_level",

                "",

            )

        ).strip().lower()

        if not question_text:

            validation_errors.append(

                f"Question {index}: "

                "question_text is empty."

            )

        if not options:

            validation_errors.append(

                f"Question {index}: "

                "options are empty."

            )

        if not correct_answer:

            validation_errors.append(

                f"Question {index}: "

                "correct_answer is empty."

            )

        if not explanation:

            validation_errors.append(

                f"Question {index}: "

                "explanation is empty."

            )

        if isinstance(

            options,

            list,

        ):

            if len(options) != 4:

                validation_errors.append(

                    f"Question {index}: "

                    "expected exactly 4 options, "

                    f"got {len(options)}."

                )

            normalized_options = [

                str(option)

                .strip()

                .casefold()

                for option in options

            ]

            if len(normalized_options) != len(

                set(normalized_options)

            ):

                validation_errors.append(

                    f"Question {index}: "

                    "duplicate options found."

                )

            if (

                correct_answer.casefold()

                not in normalized_options

            ):

                validation_errors.append(

                    f"Question {index}: "

                    "correct_answer is not "

                    "one of the options."

                )

        if difficulty not in VALID_DIFFICULTIES:

            validation_errors.append(

                f"Question {index}: "

                f"invalid difficulty '{difficulty}'."

            )

        else:

            actual_difficulty[

                difficulty

            ] += 1

        if bloom_level not in VALID_BLOOM_LEVELS:

            validation_errors.append(

                f"Question {index}: "

                f"invalid Bloom level '{bloom_level}'."

            )

        else:

            actual_bloom[

                bloom_level

            ] += 1

        normalized_question = (

            " ".join(

                question_text.casefold().split()

            )

        )

        if normalized_question in seen_questions:

            validation_errors.append(

                f"Question {index}: "

                "duplicate question detected."

            )

        else:

            seen_questions.add(

                normalized_question

            )

    if actual_difficulty != expected_difficulty:

        validation_errors.append(

            "Difficulty distribution mismatch. "

            f"Expected {expected_difficulty}, "

            f"got {actual_difficulty}."

        )

    if actual_bloom != expected_bloom:

        validation_errors.append(

            "Bloom distribution mismatch. "

            f"Expected {expected_bloom}, "

            f"got {actual_bloom}."

        )

    if validation_errors:

        raise ValueError(

            "Generated quiz validation failed:\n- "

            + "\n- ".join(

                validation_errors

            )

        )

    return {

        "valid": True,

        "question_count": len(

            questions

        ),

        "difficulty": actual_difficulty,

        "bloom": actual_bloom,

        "duplicate_questions": False,

        "validation_errors": [],

    }

# ============================================================

# SECURITY

# ============================================================

def create_security_agent() -> SecurityAgent:

    security_manager = SecurityManager()

    policy = QuizSecurityPolicy(

        enabled=True,

        block_jailbreak=True,

        block_document_injection=True,

        block_quiz_manipulation=True,

        block_tool_abuse=True,

        block_role_override=True,

        block_system_prompt_extraction=True,

        block_secret_extraction=True,

        fail_closed=True,

    )

    return SecurityAgent(

        security_manager=security_manager,

        policy=policy,

    )

# ============================================================

# SECURE QUIZ GENERATION

# ============================================================

def generate_secure_quiz(

    content: str,

    count: int,

    difficulty: dict[str, int],

    bloom: dict[str, int],

) -> dict[str, Any]:

    # ========================================================

    # 1. REQUEST VALIDATION

    # ========================================================

    logger.info(

        "Quiz generation started questions=%s content_chars=%s",

        count,

        len(content),

    )

    validate_generation_request(

        content=content,

        count=count,

        difficulty=difficulty,

        bloom=bloom,

    )

    logger.info("=" * 80)

    logger.info("SECURE QUIZ GENERATION")

    logger.info("=" * 80)

    logger.info(

        f"Characters : {len(content)}"

    )

    logger.info(

        f"Words      : {len(content.split())}"

    )

    logger.info(

        f"Questions  : {count}"

    )

    logger.info(

        f"Difficulty : {difficulty}"

    )

    logger.info(

        f"Bloom      : {bloom}"

    )

    # ========================================================

    # 2. SECURITY INITIALIZATION

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("1. SECURITY INITIALIZATION")

    logger.info("=" * 80)

    security_agent = create_security_agent()

    logger.info(

        "SecurityAgent : READY"

    )

    # ========================================================

    # 3. RAW INPUT SECURITY CHECK

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("2. LEARNING CONTENT SECURITY CHECK")

    logger.info("=" * 80)

    security_result = (

        security_agent.check_learning_content(

            content

        )

    )

    logger.info("Allowed: %s", security_result.allowed)

    logger.info("Risk: %s", security_result.risk)

    logger.info("Categories: %s", security_result.categories)

    logger.info("Message: %s", security_result.message)

    if not security_result.allowed:

        logger.warning(

            "Learning content blocked by security policy risk=%s categories=%s",

            security_result.risk,

            security_result.categories,

        )

        raise SecurityError(

            security_result.message

            or "Learning content blocked by security policy.",

            result=security_result,

        )

    # ========================================================

    # 4. SANITIZATION

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("3. CONTENT SANITIZATION")

    logger.info("=" * 80)

    safe_content = (

        security_agent.secure_learning_content(

            content

        )

    )

    logger.info(

        "Sanitized characters : %s",

        len(safe_content),

    )

    # ========================================================

    # 5. LOAD LLM

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("4. LOAD LLM")

    logger.info("=" * 80)

    if not LLM_CONFIG.exists():

        raise FileNotFoundError(

            f"LLM configuration not found: "

            f"{LLM_CONFIG}"

        )

    llm = LLM.from_config(

        str(LLM_CONFIG)

    )

    logger.info("LLM: %s", llm.info())

    # ========================================================

    # 6. CREATE QUIZ AGENT

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("5. CREATE QUIZ AGENT")

    logger.info("=" * 80)

    agent = QuizAgent(

        llm=llm,

        tools=None,

        memory=None,

        security=security_agent,

        name="secure_quiz_agent",

    )

    logger.info(

        "QuizAgent : READY"

    )

    # ========================================================

    # 7. CREATE QUIZ GENERATOR

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("6. CREATE QUIZ GENERATOR")

    logger.info("=" * 80)

    generator = QuizGenerator(

        agent=agent,

        batch_size=min(

            10,

            count,

        ),

        max_retries=2,

    )

    logger.info(

        "QuizGenerator : READY"

    )

    # ========================================================

    # 8. GENERATE QUIZ

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("7. GENERATING QUIZ")

    logger.info("=" * 80)

    try:

        generated_quiz = generator.generate(

            content=safe_content,

            count=count,

            difficulty=difficulty,

            bloom=bloom,

        )

    except SecurityError:

        raise

    except Exception as exc:

        logger.exception("Quiz generation failed")

        raise RuntimeError(

            f"Quiz generation failed: {exc}"

        ) from exc

    logger.info(

        "LLM generation : COMPLETE"

    )

    # ========================================================

    # 9. NORMALIZE

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("8. NORMALIZING QUIZ")

    logger.info("=" * 80)

    quiz = normalize_quiz(

        generated_quiz

    )

    logger.info(

        "Questions received: %s",

        len(

            quiz["questions"]

        ),

    )

    # ========================================================

    # 10. VALIDATION

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("9. QUIZ STRUCTURE VALIDATION")

    logger.info("=" * 80)

    validation = validate_generated_quiz(

        quiz=quiz,

        expected_count=count,

        expected_difficulty=difficulty,

        expected_bloom=bloom,

    )

    logger.info(

        "Valid              : %s",

        validation["valid"],

    )

    logger.info(

        "Question count     : %s",

        validation["question_count"],

    )

    logger.info(

        "Difficulty         : %s",

        validation["difficulty"],

    )

    logger.info(

        "Bloom              : %s",

        validation["bloom"],

    )

    logger.info(

        "Duplicate questions: %s",

        validation["duplicate_questions"],

    )

    # ========================================================

    # 11. OUTPUT SECURITY

    # ========================================================

    logger.info("")

    logger.info("=" * 80)

    logger.info("10. GENERATED OUTPUT SECURITY CHECK")

    logger.info("=" * 80)

    output_text = json.dumps(

        quiz,

        ensure_ascii=False,

    )

    output_security = (

        security_agent.check_output(

            output_text

        )

    )

    logger.info("Allowed: %s", output_security.allowed)

    logger.info("Risk: %s", output_security.risk)

    logger.info("Categories: %s", output_security.categories)

    logger.info("Message: %s", output_security.message)

    if not output_security.allowed:

        logger.warning(

            "Generated quiz blocked by output security risk=%s categories=%s",

            output_security.risk,

            output_security.categories,

        )

        raise SecurityError(

            output_security.message

            or "Generated quiz blocked by output security.",

            result=output_security,

        )

    # ========================================================

    # 12. FINAL RESULT

    # ========================================================

    result = {

        "success": True,

        "security": {

            "input_allowed":

                security_result.allowed,

            "input_risk":

                security_result.risk,

            "input_categories":

                security_result.categories,

            "output_allowed":

                output_security.allowed,

            "output_risk":

                output_security.risk,

            "output_categories":

                output_security.categories,

        },

        "validation": validation,

        "quiz": quiz,

    }

    logger.info("")

    logger.info("=" * 80)

    logger.info("QUIZ GENERATION SUCCESS")

    logger.info("=" * 80)

    return result

# ============================================================

# BUILD API RESPONSE

# ============================================================

def build_api_quiz(

    generated_result: dict[str, Any],

    *,

    quiz_id: str,

    content: str,

    count: int,

    difficulty: dict[str, int],

    bloom: dict[str, int],

) -> dict[str, Any]:

    quiz = generated_result.get(

        "quiz"

    )

    if not isinstance(

        quiz,

        dict,

    ):

        raise ValueError(

            "Generated result does not contain a valid quiz."

        )

    questions = quiz.get(

        "questions"

    )

    if not isinstance(

        questions,

        list,

    ):

        raise ValueError(

            "Generated quiz does not contain a valid questions list."

        )

    return {

        "success": True,

        "quiz_id": quiz_id,

        "source": {

            "type": "text",

            "characters": len(content),

            "words": len(content.split()),

        },

        "settings": {

            "count": count,

            "difficulty": difficulty,

            "bloom_level": bloom,

        },

        "question_count": len(

            questions

        ),

        "questions": questions,

    }

# ============================================================

# FILE EXTRACTION

# ============================================================

ALLOWED_EXTENSIONS = {

    ".txt",

    ".md",

    ".markdown",

    ".pdf",

    ".docx",

    ".pptx",

}

def extract_text_from_file(

    filename: str,

    data: bytes,

) -> str:

    logger.info(

        "File text extraction started filename=%s bytes=%s",

        Path(filename or "").name,

        len(data or b""),

    )

    extension = Path(

        filename or ""

    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:

        raise ValueError(

            f"Unsupported file type '{extension}'. "

            f"Supported types: "

            f"{', '.join(sorted(ALLOWED_EXTENSIONS))}"

        )

    if not data:

        raise ValueError(

            "Uploaded file is empty."

        )

    # --------------------------------------------------------

    # TXT / Markdown

    # --------------------------------------------------------

    if extension in {

        ".txt",

        ".md",

        ".markdown",

    }:

        try:

            text = data.decode(

                "utf-8"

            )

        except UnicodeDecodeError:

            text = data.decode(

                "utf-8",

                errors="replace",

            )

        return text.strip()

    # --------------------------------------------------------

    # PDF

    # --------------------------------------------------------

    if extension == ".pdf":

        try:

            from pypdf import PdfReader

        except ImportError as exc:

            raise RuntimeError(

                "PDF support requires pypdf. "

                "Install it with: pip install pypdf"

            ) from exc

        reader = PdfReader(

            BytesIO(data)

        )

        pages = []

        for page in reader.pages:

            page_text = (

                page.extract_text()

                or ""

            )

            if page_text.strip():

                pages.append(

                    page_text

                )

        return "\n\n".join(

            pages

        ).strip()

    # --------------------------------------------------------

    # DOCX

    # --------------------------------------------------------

    if extension == ".docx":

        try:

            from docx import Document

        except ImportError as exc:

            raise RuntimeError(

                "DOCX support requires python-docx. "

                "Install it with: pip install python-docx"

            ) from exc

        document = Document(

            BytesIO(data)

        )

        paragraphs = [

            paragraph.text.strip()

            for paragraph in document.paragraphs

            if paragraph.text.strip()

        ]

        # Include table content.

        for table in document.tables:

            for row in table.rows:

                row_values = [

                    cell.text.strip()

                    for cell in row.cells

                    if cell.text.strip()

                ]

                if row_values:

                    paragraphs.append(

                        " | ".join(

                            row_values

                        )

                    )

        return "\n\n".join(

            paragraphs

        ).strip()

    # --------------------------------------------------------

    # PPTX

    # --------------------------------------------------------

    if extension == ".pptx":

        try:

            from pptx import Presentation

        except ImportError as exc:

            raise RuntimeError(

                "PPTX support requires python-pptx. "

                "Install it with: pip install python-pptx"

            ) from exc

        presentation = Presentation(

            BytesIO(data)

        )

        slides = []

        for slide in presentation.slides:

            slide_text = []

            for shape in slide.shapes:

                if hasattr(

                    shape,

                    "text",

                ):

                    value = shape.text.strip()

                    if value:

                        slide_text.append(

                            value

                        )

            if slide_text:

                slides.append(

                    "\n".join(

                        slide_text

                    )

                )

        return "\n\n".join(

            slides

        ).strip()

    raise ValueError(

        f"Unable to extract text from '{filename}'."

    )
