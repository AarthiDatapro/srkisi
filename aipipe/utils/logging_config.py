from __future__ import annotations

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import Lock

_CONFIG_LOCK = Lock()
_CONFIGURED = False


def configure_logging(project_root: str | Path | None = None) -> Path:
    """
    Configure application-wide console and rotating file logging.

    Environment variables:
        LOG_LEVEL: DEBUG, INFO, WARNING, ERROR, CRITICAL
        LOG_DIR: directory for log files; defaults to <project_root>/logs
    """
    global _CONFIGURED

    with _CONFIG_LOCK:
        if _CONFIGURED:
            root = Path(
                os.getenv(
                    "LOG_DIR",
                    str(Path(project_root or Path.cwd()) / "logs"),
                )
            )
            return root

        root = Path(
            os.getenv(
                "LOG_DIR",
                str(Path(project_root or Path.cwd()) / "logs"),
            )
        )
        root.mkdir(parents=True, exist_ok=True)

        level_name = os.getenv("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)

        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        root_logger = logging.getLogger()
        root_logger.setLevel(level)

        # Avoid duplicate handlers when uvicorn reloads/imports the app.
        if not any(
            getattr(handler, "_aipipe_logging_handler", False)
            for handler in root_logger.handlers
        ):
            console_handler = logging.StreamHandler()
            console_handler.setLevel(level)
            console_handler.setFormatter(formatter)
            console_handler._aipipe_logging_handler = True
            root_logger.addHandler(console_handler)

            file_handler = RotatingFileHandler(
                root / "app.log",
                maxBytes=10 * 1024 * 1024,
                backupCount=5,
                encoding="utf-8",
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            file_handler._aipipe_logging_handler = True
            root_logger.addHandler(file_handler)

        _CONFIGURED = True

        logging.getLogger(__name__).info(
            "Logging configured level=%s log_file=%s",
            level_name,
            root / "app.log",
        )

        return root
