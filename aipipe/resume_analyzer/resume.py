from __future__ import annotations

import logging
import time
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from aipipe import LLM

from .exceptions import (
    ResumeAnalysisError,
    ResumeTextError,
)
from .parser import parse_structured_result
from .prompts import (
    build_resume_prompt,
    build_job_match_prompt,
)
from .schemas import (
    ResumeAnalysis,
    JobMatchAnalysis,
)


# ============================================================
# LOGGING
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# AIPIPE CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(PROJECT_ROOT / ".env")

CONFIG_DIR = PROJECT_ROOT / "config"
LLM_CONFIG = CONFIG_DIR / "llm.yaml"


# ============================================================
# AIPIPE LLM
# ============================================================

@lru_cache(maxsize=1)
def get_resume_llm():
    """
    Initialize and cache the AIPipe LLM.

    Loads:
        .env
        config/llm.yaml

    Returns:
        Configured AIPipe LLM instance.
    """

    logger.debug(
        "Checking resume analyzer LLM configuration: %s",
        LLM_CONFIG,
    )

    if not LLM_CONFIG.is_file():
        logger.error(
            "Resume analyzer LLM configuration not found: %s",
            LLM_CONFIG,
        )

        raise ResumeAnalysisError(
            f"AIPipe config not found: {LLM_CONFIG}"
        )

    try:
        logger.info(
            "Initializing resume analyzer LLM from configuration"
        )

        start_time = time.perf_counter()

        llm = LLM.from_config(str(LLM_CONFIG))

        elapsed = time.perf_counter() - start_time

        logger.info(
            "Resume analyzer LLM initialized successfully "
            "(initialization_time=%.3fs)",
            elapsed,
        )

        return llm

    except Exception as exc:
        logger.exception(
            "Failed to initialize resume analyzer LLM"
        )

        raise ResumeAnalysisError(
            f"Failed to initialize AIPipe LLM: {exc}"
        ) from exc


# ============================================================
# INPUT VALIDATION
# ============================================================

def _validate_text(
    text: str,
    field_name: str = "Resume",
) -> str:
    """
    Validate and normalize input text.
    """

    logger.debug(
        "Validating %s input",
        field_name,
    )

    if not isinstance(text, str):
        logger.warning(
            "%s validation failed: expected string, received %s",
            field_name,
            type(text).__name__,
        )

        raise ResumeTextError(
            f"{field_name} must be a string."
        )

    text = text.strip()

    if not text:
        logger.warning(
            "%s validation failed: empty text",
            field_name,
        )

        raise ResumeTextError(
            f"{field_name} text cannot be empty."
        )

    if len(text) < 30:
        logger.warning(
            "%s validation failed: text too short "
            "(characters=%d)",
            field_name,
            len(text),
        )

        raise ResumeTextError(
            f"{field_name} text is too short to analyze."
        )

    logger.debug(
        "%s validation successful "
        "(characters=%d, words=%d)",
        field_name,
        len(text),
        len(text.split()),
    )

    return text


# ============================================================
# STRUCTURED LLM INVOCATION
# ============================================================

def _call_structured_llm(
    prompt: str,
    schema,
):
    """
    Call AIPipe structured generation and validate the result.

    Args:
        prompt: Input prompt.
        schema: Pydantic response schema.

    Returns:
        Validated Pydantic model.
    """

    if not prompt:
        logger.error(
            "Structured LLM invocation received an empty prompt"
        )

        raise ResumeAnalysisError(
            "LLM prompt cannot be empty."
        )

    llm = get_resume_llm()

    schema_name = getattr(
        schema,
        "__name__",
        str(schema),
    )

    logger.info(
        "Starting structured resume LLM invocation "
        "(schema=%s, prompt_characters=%d)",
        schema_name,
        len(prompt),
    )

    start_time = time.perf_counter()

    try:
        result = llm.structured(
            schema=schema,
            input_data=prompt,
        )

        llm_elapsed = time.perf_counter() - start_time

        logger.info(
            "Structured LLM response received "
            "(schema=%s, duration=%.3fs)",
            schema_name,
            llm_elapsed,
        )

        parse_start = time.perf_counter()

        parsed_result = parse_structured_result(
            result,
            schema,
        )

        parse_elapsed = time.perf_counter() - parse_start

        logger.info(
            "Structured response parsed successfully "
            "(schema=%s, parse_duration=%.3fs)",
            schema_name,
            parse_elapsed,
        )

        return parsed_result

    except ResumeAnalysisError:
        logger.exception(
            "Resume analysis error during structured LLM invocation "
            "(schema=%s)",
            schema_name,
        )
        raise

    except Exception as exc:
        elapsed = time.perf_counter() - start_time

        logger.exception(
            "Resume analyzer LLM invocation failed "
            "(schema=%s, duration=%.3fs)",
            schema_name,
            elapsed,
        )

        raise ResumeAnalysisError(
            f"LLM analysis failed: {exc}"
        ) from exc


# ============================================================
# RESUME ANALYSIS
# ============================================================

def analyze_resume(
    resume_text: str,
) -> ResumeAnalysis:
    """
    Analyze a resume without a job description.

    Evaluates:
        - Candidate name
        - Professional summary
        - Total experience
        - Current or recent role
        - Skills
        - Technical skills
        - Soft skills
        - Education
        - Certifications
        - Projects
        - Strengths
        - Areas for improvement
        - Missing resume sections
        - Recommendations
        - Clarity score
        - Completeness score
        - Impact score
        - Overall score

    Args:
        resume_text: Extracted resume text.

    Returns:
        ResumeAnalysis instance.
    """

    logger.info(
        "Starting resume analysis"
    )

    start_time = time.perf_counter()

    try:
        resume_text = _validate_text(
            resume_text,
            field_name="Resume",
        )

        logger.debug(
            "Resume accepted for analysis "
            "(characters=%d, words=%d)",
            len(resume_text),
            len(resume_text.split()),
        )

        logger.debug(
            "Building resume analysis prompt"
        )

        prompt = build_resume_prompt(
            resume_text
        )

        logger.debug(
            "Resume analysis prompt created "
            "(characters=%d)",
            len(prompt),
        )

        result = _call_structured_llm(
            prompt=prompt,
            schema=ResumeAnalysis,
        )

        elapsed = time.perf_counter() - start_time

        logger.info(
            "Resume analysis completed successfully "
            "(duration=%.3fs)",
            elapsed,
        )

        return result

    except ResumeAnalysisError:
        logger.exception(
            "Resume analysis failed with ResumeAnalysisError"
        )
        raise

    except ResumeTextError:
        logger.exception(
            "Resume analysis failed during input validation"
        )
        raise

    except Exception as exc:
        elapsed = time.perf_counter() - start_time

        logger.exception(
            "Unexpected resume analysis failure "
            "(duration=%.3fs)",
            elapsed,
        )

        raise ResumeAnalysisError(
            f"Resume analysis failed: {exc}"
        ) from exc


# ============================================================
# RESUME AND JOB DESCRIPTION MATCHING
# ============================================================

def analyze_resume_with_job_description(
    resume_text: str,
    job_description: str,
) -> JobMatchAnalysis:
    """
    Analyze a resume against a job description.

    Evaluates:
        - Matched skills
        - Partially matched skills
        - Missing skills
        - Relevant experience
        - Relevant projects
        - Education match
        - Strengths for the role
        - Gaps
        - Recommendations
        - Keyword coverage score
        - Experience match score
        - Skills match score
        - Overall match score

    Args:
        resume_text: Extracted resume text.
        job_description: Target job description.

    Returns:
        JobMatchAnalysis instance.
    """

    logger.info(
        "Starting resume and job description matching"
    )

    start_time = time.perf_counter()

    try:
        resume_text = _validate_text(
            resume_text,
            field_name="Resume",
        )

        job_description = _validate_text(
            job_description,
            field_name="Job description",
        )

        logger.debug(
            "Resume and job description validated "
            "(resume_characters=%d, resume_words=%d, "
            "job_description_characters=%d, "
            "job_description_words=%d)",
            len(resume_text),
            len(resume_text.split()),
            len(job_description),
            len(job_description.split()),
        )

        logger.debug(
            "Building resume-job matching prompt"
        )

        prompt = build_job_match_prompt(
            resume_text=resume_text,
            job_description=job_description,
        )

        logger.debug(
            "Resume-job matching prompt created "
            "(characters=%d)",
            len(prompt),
        )

        result = _call_structured_llm(
            prompt=prompt,
            schema=JobMatchAnalysis,
        )

        elapsed = time.perf_counter() - start_time

        logger.info(
            "Resume and job description matching completed "
            "(duration=%.3fs)",
            elapsed,
        )

        return result

    except ResumeAnalysisError:
        logger.exception(
            "Resume-job matching failed with ResumeAnalysisError"
        )
        raise

    except ResumeTextError:
        logger.exception(
            "Resume-job matching failed during input validation"
        )
        raise

    except Exception as exc:
        elapsed = time.perf_counter() - start_time

        logger.exception(
            "Unexpected resume-job matching failure "
            "(duration=%.3fs)",
            elapsed,
        )

        raise ResumeAnalysisError(
            f"Resume and job matching failed: {exc}"
        ) from exc