from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import yaml

# Prefer the installed aipipe package. For source checkouts, set AIPIPE_SRC.
_AIPIPE_SRC = Path(os.getenv("AIPIPE_SRC") or "")
if _AIPIPE_SRC and _AIPIPE_SRC.exists() and str(_AIPIPE_SRC) not in sys.path:
    sys.path.insert(0, str(_AIPIPE_SRC))

from aipipe import LLMConfig


BASE_DIR = Path(__file__).resolve().parent
CONFIG_DIR = BASE_DIR / "config"


# ============================================================
# YAML LOADER
# ============================================================

def load_yaml(filename: str) -> dict[str, Any]:
    path = CONFIG_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"Configuration file not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = yaml.safe_load(file)

    if not isinstance(data, dict):
        raise ValueError(
            f"Invalid YAML configuration: {path}"
        )

    return data


# ============================================================
# LLM CONFIG
# ============================================================

def load_llm_config() -> LLMConfig:
    data = load_yaml("llm.yaml")

    raw = data.get("llm")

    if not isinstance(raw, dict):
        raise ValueError(
            "llm.yaml must contain an 'llm' section."
        )

    config = LLMConfig(
        provider=raw["provider"],
        model=raw["model"],
        api_key=raw.get("api_key"),
        api_key_env=raw.get("api_key_env"),
        base_url=raw.get("base_url"),
        temperature=raw.get("temperature"),
        max_tokens=raw.get("max_tokens"),
        generation_type=raw.get(
            "generation_type",
            "text",
        ),
        supports_streaming=raw.get(
            "supports_streaming",
            True,
        ),
        supports_tools=raw.get(
            "supports_tools",
            False,
        ),
        supports_structured_output=raw.get(
            "supports_structured_output",
            False,
        ),
        timeout=raw.get("timeout"),
    )

    return config


# ============================================================
# ENVIRONMENT CHECK
# ============================================================

def check_environment() -> dict[str, Any]:
    """
    Check environment variables without exposing secrets.
    """

    result = {
        "OLLAMA_API_KEY": bool(
            os.getenv("OLLAMA_API_KEY")
        ),
        "OPENAI_API_KEY": bool(
            os.getenv("OPENAI_API_KEY")
        ),
        "GOOGLE_API_KEY": bool(
            os.getenv("GOOGLE_API_KEY")
        ),
    }

    return result


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print("CONFIGURATION TEST")
    print("=" * 70)

    print()
    print("Config directory:")
    print(CONFIG_DIR)

    print()
    print("Environment:")
    print(check_environment())

    print()
    print("Loading LLM configuration...")

    config = load_llm_config()

    print()
    print("LLM configuration:")
    print(config.safe_dict())

    print()
    print(
        "API key:",
        "configured"
        if config.has_api_key()
        else "MISSING",
    )

    print()
    print("=" * 70)