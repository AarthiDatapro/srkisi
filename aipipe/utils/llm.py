from pathlib import Path

from aipipe import LLM


CONFIG_PATH = (
    Path(__file__).resolve().parent.parent
    / "config"
    / "llm.yaml"
)


def get_llm(api_key: str | None = None) -> LLM:
    """
    Create an AIPipe LLM using the shared LLM configuration.

    The provider, model, endpoint, generation settings, and
    capabilities are loaded from config/llm.yaml.

    When a student API key is supplied, only the API key is
    overridden for the current request.

    When no student API key is supplied, the API key configured
    through llm.yaml / environment is used.
    """

    # Load the shared configuration.
    llm = LLM.from_config(str(CONFIG_PATH))

    # Use the configured server/environment API key.
    if not api_key:
        return llm

    # Override only the API key for this request.
    config_data = llm.config.model_dump()

    config_data["api_key"] = api_key
    config_data["api_key_env"] = None

    return LLM.from_config({
        "llm": config_data
    })