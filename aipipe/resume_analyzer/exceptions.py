class ResumeAnalysisError(Exception):
    """Base exception for resume analysis."""


class ResumeTextError(ResumeAnalysisError, ValueError):
    """Raised when resume input is empty or invalid."""


class ResumeLLMError(ResumeAnalysisError):
    """Raised when LLM analysis or parsing fails."""