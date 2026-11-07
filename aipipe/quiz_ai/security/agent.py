from __future__ import annotations

from typing import Any

from aipipe import SecurityManager
from aipipe.security import SecurityResult

from .policy import QuizSecurityPolicy
from .detectors.jailbreak import JailbreakDetector
from .detectors.document_injection import DocumentInjectionDetector
from .detectors.quiz_manipulation import QuizManipulationDetector
from .detectors.tool_abuse import ToolAbuseDetector


class SecurityAgent:
    """
    Quiz_specific security layer built on top of aipipe.

    Security boundary:

        UNTRUSTED INPUT
              |
              v
        Generic aipipe
              |
              v
        Domain detectors
              |
              v
        Combined result

    Trusted application prompts must NOT be passed through
    check_input() as untrusted data.
    """

    def __init__(
        self,
        security_manager: SecurityManager | None = None,
        policy: QuizSecurityPolicy | None = None,
        application: str = "quiz_ai",
    ):
        self.security = (
            security_manager
            or SecurityManager()
        )

        self.policy = (
            policy
            or QuizSecurityPolicy()
        )

        self.application = application

        self.jailbreak_detector = (
            JailbreakDetector()
        )

        self.document_injection_detector = (
            DocumentInjectionDetector()
        )

        self.quiz_detector = (
            QuizManipulationDetector()
        )

        self.tool_detector = (
            ToolAbuseDetector()
        )

    # ============================================================
    # COMMON HELPERS
    # ============================================================

    @staticmethod
    def _add_category(
        categories: list[str],
        category: str,
    ) -> None:
        if category not in categories:
            categories.append(category)

    @staticmethod
    def _merge_metadata(
        metadata: dict[str, Any],
        key: str,
        value: Any,
    ) -> None:
        if value:
            metadata[key] = value

    # ============================================================
    # BLOCK RESULT
    # ============================================================

    def _blocked(
        self,
        message: str,
        categories: list[str],
        metadata: dict[str, Any],
    ) -> SecurityResult:

        return SecurityResult(
            allowed=False,
            risk="high",
            categories=list(
                dict.fromkeys(categories)
            ),
            message=message,
            metadata=metadata,
        )

    # ============================================================
    # INPUT CHECK
    # ============================================================

    def check_input(
        self,
        text: str,
    ) -> SecurityResult:

        if not isinstance(text, str):
            raise TypeError(
                "SecurityAgent.check_input expects a string."
            )

        if not text.strip():
            return SecurityResult(
                allowed=True,
                risk="none",
                categories=[],
                message="Security check passed.",
                metadata={},
            )

        categories: list[str] = []
        metadata: dict[str, Any] = {}

        # --------------------------------------------------------
        # GENERIC AIPIPE SECURITY
        # --------------------------------------------------------
        #
        # IMPORTANT:
        # Do NOT immediately return if aipipe blocks the input.
        #
        # We still run the domain detectors so that the final
        # result contains the specific security categories.
        # --------------------------------------------------------

        generic_result = self.security.check_input(
            text
        )

        if not generic_result.allowed:

            for category in (
                generic_result.categories
                or []
            ):
                self._add_category(
                    categories,
                    category,
                )

            if generic_result.metadata:
                metadata["generic"] = (
                    generic_result.metadata
                )

        # --------------------------------------------------------
        # DOMAIN: JAILBREAK
        # --------------------------------------------------------

        if self.policy.block_jailbreak:

            jailbreak = (
                self.jailbreak_detector.detect(text)
            )

            if jailbreak.detected:

                self._add_category(
                    categories,
                    "jailbreak",
                )

                # Every jailbreak involving an instruction
                # override is also a prompt_injection event.
                if (
                    jailbreak.categories.get(
                        "instruction_override",
                        False,
                    )
                    or jailbreak.categories.get(
                        "system_prompt_extraction",
                        False,
                    )
                    or jailbreak.categories.get(
                        "internal_instruction_extraction",
                        False,
                    )
                    or jailbreak.categories.get(
                        "secret_extraction",
                        False,
                    )
                    or jailbreak.categories.get(
                        "role_override",
                        False,
                    )
                    or jailbreak.categories.get(
                        "policy_override",
                        False,
                    )
                    or jailbreak.categories.get(
                        "security_bypass",
                        False,
                    )
                ):
                    self._add_category(
                        categories,
                        "prompt_injection",
                    )

                if jailbreak.categories.get(
                    "system_prompt_extraction",
                    False,
                ):
                    self._add_category(
                        categories,
                        "system_prompt_extraction",
                    )

                if jailbreak.categories.get(
                    "secret_extraction",
                    False,
                ):
                    self._add_category(
                        categories,
                        "secret_extraction",
                    )

                if jailbreak.categories.get(
                    "role_override",
                    False,
                ):
                    self._add_category(
                        categories,
                        "role_override",
                    )

                if jailbreak.categories.get(
                    "policy_override",
                    False,
                ):
                    self._add_category(
                        categories,
                        "policy_override",
                    )

                if jailbreak.categories.get(
                    "security_bypass",
                    False,
                ):
                    self._add_category(
                        categories,
                        "security_bypass",
                    )

                metadata["jailbreak"] = (
                    jailbreak.info()
                    if hasattr(jailbreak, "info")
                    else jailbreak
                )

        # --------------------------------------------------------
        # DOMAIN: DOCUMENT INJECTION
        # --------------------------------------------------------

        if self.policy.block_document_injection:

            result = (
                self.document_injection_detector.detect(
                    text
                )
            )

            detected = (
                result.detected
                if hasattr(result, "detected")
                else result.get("detected", False)
            )

            if detected:

                self._add_category(
                    categories,
                    "document_injection",
                )

                self._add_category(
                    categories,
                    "prompt_injection",
                )

                metadata[
                    "document_injection"
                ] = (
                    result.info()
                    if hasattr(result, "info")
                    else result
                )

        # --------------------------------------------------------
        # DOMAIN: QUIZ MANIPULATION
        # --------------------------------------------------------

        if self.policy.block_quiz_manipulation:

            result = (
                self.quiz_detector.detect(text)
            )

            detected = (
                result.detected
                if hasattr(result, "detected")
                else result.get("detected", False)
            )

            if detected:

                self._add_category(
                    categories,
                    "quiz_manipulation",
                )

                metadata[
                    "quiz_manipulation"
                ] = (
                    result.info()
                    if hasattr(result, "info")
                    else result
                )

        # --------------------------------------------------------
        # DOMAIN: TOOL ABUSE
        # --------------------------------------------------------

        if self.policy.block_tool_abuse:

            result = (
                self.tool_detector.detect(text)
            )

            detected = (
                result.detected
                if hasattr(result, "detected")
                else result.get("detected", False)
            )

            if detected:

                self._add_category(
                    categories,
                    "tool_abuse",
                )

                metadata[
                    "tool_abuse"
                ] = (
                    result.info()
                    if hasattr(result, "info")
                    else result
                )

        # --------------------------------------------------------
        # FINAL DECISION
        # --------------------------------------------------------

        categories = list(
            dict.fromkeys(categories)
        )

        if categories:

            return self._blocked(
                message=(
                    "Input blocked because likely "
                    "prompt injection or malicious "
                    "instructions were detected."
                ),
                categories=categories,
                metadata=metadata,
            )

        return SecurityResult(
            allowed=True,
            risk="none",
            categories=[],
            message="Security check passed.",
            metadata={},
        )

    # ============================================================
    # LEARNING CONTENT
    # ============================================================

    def check_learning_content(
        self,
        content: str,
    ) -> SecurityResult:

        return self.check_input(content)

    # ============================================================
    # OUTPUT
    # ============================================================

    def check_output(
        self,
        text: str,
    ) -> SecurityResult:

        if not isinstance(text, str):
            raise TypeError(
                "SecurityAgent.check_output expects a string."
            )

        return self.security.check_output(text)

    # ============================================================
    # SANITIZATION
    # ============================================================

    def secure_learning_content(
        self,
        content: str,
    ) -> str:

        result = self.check_learning_content(
            content
        )

        if not result.allowed:
            from aipipe.exceptions import SecurityError

            raise SecurityError(
                result.message
                or "Learning content blocked.",
                result=result,
            )

        # Use generic sanitization only after security
        # validation succeeds.
        if hasattr(self.security, "sanitize"):
            return self.security.sanitize(
                content
            )

        return content

    # ============================================================
    # COMPATIBILITY
    # ============================================================

    def check_data(
        self,
        text: str,
        detect_injection: bool = True,
    ) -> SecurityResult:

        if detect_injection:
            return self.check_input(text)

        return SecurityResult(
            allowed=True,
            risk="none",
            categories=[],
            message="Security check passed.",
            metadata={},
        )

    # ============================================================
    # INFO
    # ============================================================

    def info(self) -> dict[str, Any]:

        return {
            "application": self.application,
            "domain": "quiz",
            "enabled": self.policy.enabled,
            "policy": self.policy.model_dump()
            if hasattr(
                self.policy,
                "model_dump",
            )
            else vars(self.policy),
            "detectors": {
                "jailbreak": True,
                "document_injection": True,
                "quiz_manipulation": True,
                "tool_abuse": True,
            },
        }
