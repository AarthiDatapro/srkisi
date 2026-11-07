import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from aipipe import LLM

from utils.logging_config import configure_logging
from personalized_ai.research.module_summary import (
    summarize_student_module_performance,
)

# --------------------------------------------------
# Project configuration
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")

LOG_DIR = configure_logging(PROJECT_ROOT)
logger = logging.getLogger(__name__)

CONFIG_DIR = PROJECT_ROOT / "config"
LLM_CONFIG = CONFIG_DIR / "llm.yaml"


# --------------------------------------------------
# Initialize LLM
# --------------------------------------------------

def get_llm():
    """Load and return the AIPipe LLM instance."""
    logger.info("Loading LLM configuration path=%s", LLM_CONFIG)

    if not LLM_CONFIG.is_file():
        logger.error("LLM configuration not found path=%s", LLM_CONFIG)
        raise FileNotFoundError(
            f"LLM configuration not found: {LLM_CONFIG}"
        )

    try:
        llm = LLM.from_config(str(LLM_CONFIG))
        logger.info("AIPipe LLM initialized successfully")
        return llm
    except Exception:
        logger.exception("Failed to initialize AIPipe LLM")
        raise


# --------------------------------------------------
# Database configuration
# --------------------------------------------------

def get_db_config():
    """Read MySQL configuration from the project .env file."""
    logger.debug("Loading database configuration from environment")

    required = {
        "host": os.getenv("DB_HOST"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "database": os.getenv("DB_NAME", "datapro_lms"),
    }

    missing = [
        key for key, value in required.items()
        if value is None or not value.strip()
    ]

    if missing:
        logger.error(
            "Database configuration incomplete missing=%s",
            missing,
        )
        raise ValueError(
            f"Missing database environment variables: {missing}"
        )

    config = {
        **required,
        "port": int(os.getenv("DB_PORT", "3306")),
    }

    # Never log the password.
    logger.info(
        "Database configuration loaded host=%s database=%s port=%s",
        config["host"],
        config["database"],
        config["port"],
    )

    return config


# --------------------------------------------------
# Student module summary
# --------------------------------------------------

def get_student_module_summary(
    course_id: int,
    module_id: int,
    student_id: int,
    batch_size: int = 5,
    max_retries: int = 2,
):
    """
    Generate a detailed student module performance summary.
    """
    logger.info(
        "Student module summary started course_id=%s module_id=%s",
        course_id,
        module_id,
    )

    db_config = get_db_config()
    llm = get_llm()

    try:
        result = summarize_student_module_performance(
            db_config=db_config,
            course_id=course_id,
            module_id=module_id,
            student_id=student_id,
            llm=llm,
            batch_size=batch_size,
            max_retries=max_retries,
        )

        logger.info(
            "Student module summary completed course_id=%s module_id=%s",
            course_id,
            module_id,
        )
        return result

    except Exception:
        logger.exception(
            "Student module summary failed course_id=%s module_id=%s",
            course_id,
            module_id,
        )
        raise


# --------------------------------------------------
# Local execution test
# --------------------------------------------------

if __name__ == "__main__":
    import json

    result = get_student_module_summary(
        course_id=1,
        module_id=3,
        student_id=101,
    )

    print(json.dumps(result, indent=2, ensure_ascii=False))
