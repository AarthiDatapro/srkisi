from __future__ import annotations

import os

import pytest
import requests

from aipipe import LLM

LOCAL_URL = "http://localhost:11434"
LOCAL_MODEL = os.getenv("OLLAMA_LOCAL_MODEL", "gemma4:cloud")
CLOUD_MODEL = os.getenv("OLLAMA_CLOUD_API_MODEL", "gemma4:31b")
API_KEY = os.getenv("OLLAMA_API_KEY")


def local_ollama_available() -> bool:
    try:
        return requests.get(f"{LOCAL_URL}/api/tags", timeout=2).status_code == 200
    except requests.RequestException:
        return False


LOCAL_AVAILABLE = local_ollama_available()


def assert_hello(text: str):
    assert text.strip() == "HELLO", repr(text)


@pytest.mark.ollama_local
@pytest.mark.integration
@pytest.mark.skipif(
    not LOCAL_AVAILABLE,
    reason="Local Ollama is not installed or not running at localhost:11434",
)
def test_local_ollama_cloud_model():
    llm = LLM.configure(
        provider="ollama",
        model=LOCAL_MODEL,
        base_url=LOCAL_URL,
        temperature=0,
        max_tokens=64,
    )
    assert_hello(llm.generate("Reply with exactly: HELLO").text)


@pytest.mark.ollama_local
@pytest.mark.integration
@pytest.mark.skipif(
    not LOCAL_AVAILABLE,
    reason="Local Ollama is not installed or not running at localhost:11434",
)
def test_local_ollama_health():
    llm = LLM.configure(
        provider="ollama",
        model=LOCAL_MODEL,
        base_url=LOCAL_URL,
        temperature=0,
        max_tokens=64,
    )
    result = llm.health(inference=True)
    assert result["healthy"] is True, result
    assert result["inference"] is True
    assert_hello(result["response"])


@pytest.mark.ollama_api
@pytest.mark.integration
@pytest.mark.skipif(not API_KEY, reason="OLLAMA_API_KEY is not configured")
def test_direct_ollama_cloud_api():
    llm = LLM.configure(
        provider="ollama",
        model=CLOUD_MODEL,
        base_url="https://ollama.com",
        api_key_env="OLLAMA_API_KEY",
        temperature=0,
        max_tokens=64,
    )
    assert_hello(llm.generate("Reply with exactly: HELLO").text)


@pytest.mark.ollama_api
@pytest.mark.integration
@pytest.mark.skipif(not API_KEY, reason="OLLAMA_API_KEY is not configured")
def test_direct_ollama_cloud_api_health():
    llm = LLM.configure(
        provider="ollama",
        model=CLOUD_MODEL,
        base_url="https://ollama.com",
        api_key_env="OLLAMA_API_KEY",
        temperature=0,
        max_tokens=64,
    )
    result = llm.health(inference=True)
    assert result["healthy"] is True, result
    assert result["inference"] is True
    assert_hello(result["response"])
