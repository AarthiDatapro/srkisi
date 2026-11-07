from typing import List, Optional

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    """
    A single message from the existing LMS conversation history.
    """

    sender: str = Field(
        ...,
        description="Message sender, for example 'user' or 'mentor'.",
    )

    text: str = Field(
        ...,
        description="Message text.",
    )


class ChatRequest(BaseModel):
    """
    Request received from the Node.js LMS backend.
    """

    question: str = Field(
        ...,
        min_length=1,
        max_length=20000,
        description="Current student question.",
    )

    course_name: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    topic: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    lesson_content: Optional[str] = Field(
        default=None,
        max_length=100000,
    )

    conversation_history: List[ConversationMessage] = Field(
        default_factory=list,
    )

    ollama_api_key: Optional[str] = Field(
        default=None,
        description="Internal Ollama API key supplied by Node.",
    )


class ChatResponse(BaseModel):
    """
    Non-streaming chat response.

    This is useful for testing and future non-streaming consumers.
    """

    answer: str

