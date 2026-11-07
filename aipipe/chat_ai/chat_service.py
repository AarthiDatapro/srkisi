import json
from typing import AsyncIterator

from aipipe import SecurityManager, SecurityPolicy

from utils.llm import get_llm

from .prompt_builder import build_chat_prompt
from .schemas import ChatRequest


# ============================================================
# AIPIPE CONFIGURATION
# ============================================================



# def get_llm(api_key: str | None = None) -> LLM:
#     """
#     Create the AIPipe LLM from the shared llm.yaml configuration.

#     The provider, model, endpoint, generation settings, and
#     capabilities are managed centrally in llm.yaml.

#     If a student API key is supplied, only the API key is
#     overridden for the current request.
#     """

#     # Load the shared configuration.
#     llm = LLM.from_config(str(CONFIG_PATH))

#     # No student key:
#     # use the API key configured through llm.yaml / environment.
#     if not api_key:
#         return llm

#     # Student-specific key:
#     # keep all shared configuration and override only the key.
#     config_data = llm.config.model_dump()

#     config_data["api_key"] = api_key
#     config_data["api_key_env"] = None

#     return LLM.from_config({
#         "llm": config_data
#     })


# ============================================================
# SECURITY
# ============================================================

def create_security_manager() -> SecurityManager:
    """
    Create the security layer for the LMS chatbot.

    Authentication and authorization remain the responsibility
    of the Node.js LMS application.
    """

    policy = SecurityPolicy(
        enabled=True,
        block_prompt_injection=True,
        redact_secrets=True,
        redact_pii=True,
        max_input_characters=100000,
        max_input_tokens=20000,
        max_output_tokens=4096,
        fail_closed=True,
        require_tool_permission=True,
        allow_unknown_tools=False,
    )

    return SecurityManager(policy=policy)


# ============================================================
# STREAMING
# ============================================================

def _extract_chunk_text(chunk) -> str:
    """
    Extract text from the native AIPipe provider message chunk.
    """

    if chunk is None:
        return ""

    if isinstance(chunk, str):
        return chunk

    content = getattr(chunk, "content", None)

    if isinstance(content, str):
        return content

    if content is not None:
        return str(content)

    return str(chunk)


# async def stream_chat(
#     request: ChatRequest,
# ) -> AsyncIterator[str]:
#     """
#     Stream chatbot tokens from AIPipe.

#     Yields only text tokens.
#     The FastAPI route is responsible for wrapping them
#     as SSE events.
#     """

#     security = create_security_manager()

#     # Validate and sanitize the student's current question.
#     safe_question = security.secure_input(
#         request.question
#     )

#     request.question = safe_question

#     # Build the LMS chatbot prompt.
#     prompt = build_chat_prompt(request)

#     # Get the configured AIPipe LLM.
#     llm = get_llm(
#         request.ollama_api_key
#     )

#     # Stream response from AIPipe.
#     async for chunk in llm.astream(prompt):
#         text = _extract_chunk_text(chunk)

#         if text:
#             yield text
async def stream_chat(
    request: ChatRequest,
) -> AsyncIterator[str]:
    """
    Stream chatbot tokens from AIPipe.

    Yields only text tokens.
    The FastAPI route is responsible for wrapping them
    as SSE events.
    """

    security = create_security_manager()

    safe_question = security.secure_input(
        request.question
    )

    request.question = safe_question

    prompt = build_chat_prompt(request)

    llm = get_llm(
        request.ollama_api_key
    )

    async for chunk in llm.astream(prompt):
        text = _extract_chunk_text(chunk)

        if text:
            yield text


# ============================================================
# SSE
# ============================================================

def sse_token(token: str) -> str:
    """
    Convert a token into the SSE format expected
    by the Node.js proxy.
    """

    return (
        f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"
    )


def sse_done() -> str:
    """
    Return the final SSE event.
    """

    return "data: [DONE]\n\n"