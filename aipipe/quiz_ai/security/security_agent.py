from __future__ import annotations

from typing import Any

# IMPORTANT:
# SecurityError must come from aipipe.
# Do NOT define another SecurityError in quiz_ai.
from aipipe.exceptions import SecurityError
from aipipe.security import SecurityManager

from quiz_ai.security.policies import QuizSecurityPolicy

from quiz_ai.security.detectors.jailbreak import (
    JailbreakDetector,
)

from quiz_ai.security.detectors.document_injection import (
    DocumentInjectionDetector,
)

from quiz_ai.security.detectors.quiz_manipulation import (
    QuizManipulationDetector,
)

from quiz_ai.security.detectors.tool_abuse import (
    ToolAbuseDetector,
)


__all__ = [
    "SecurityAgent",
    "SecurityResult",
    "SecurityError",
]


# ======================================================================
# SECURITY RESULT
# ======================================================================


class SecurityResult:
    """
    Normalized security result returned by SecurityAgent.

    Public contract:

        allowed
        blocked
        risk
        message
        reason
        categories
        matches
        details

    Allowed result:

        allowed    = True
        blocked    = False
        risk       = "none"
        categories = []

    Blocked result:

        allowed    = False
        blocked    = True
        risk       = "high"
        categories = [...]
    """

    def __init__(
        self,
        allowed: bool,
        reason: str | None = None,
        categories: list[str] | None = None,
        matches: list[str] | None = None,
        details: dict[str, Any] | None = None,
        risk: str | None = None,
        message: str | None = None,
    ):
        self.allowed = bool(allowed)
        self.blocked = not self.allowed

        if risk is not None:
            self.risk = risk
        else:
            self.risk = (
                "none"
                if self.allowed
                else "high"
            )

        if message is not None:
            self.message = message
        elif self.allowed:
            self.message = "Security check passed."
        else:
            self.message = (
                reason
                or "Security policy blocked the input."
            )

        self.reason = reason

        # IMPORTANT:
        # Always expose categories as a list.
        #
        # Tests expect:
        #
        #     result.categories == []
        #
        # for allowed input.
        self.categories = list(
            categories or []
        )

        self.matches = list(
            matches or []
        )

        self.details = dict(
            details or {}
        )

    # ------------------------------------------------------------------
    # Dict_compatible access
    # ------------------------------------------------------------------

    def get(
        self,
        key: str,
        default: Any = None,
    ) -> Any:
        if hasattr(self, key):
            return getattr(
                self,
                key,
            )

        return self.details.get(
            key,
            default,
        )

    def __getitem__(
        self,
        key: str,
    ) -> Any:
        if hasattr(self, key):
            return getattr(
                self,
                key,
            )

        return self.details[key]

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def info(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "blocked": self.blocked,
            "risk": self.risk,
            "message": self.message,
            "reason": self.reason,
            "categories": list(
                self.categories
            ),
            "matches": list(
                self.matches
            ),
            "details": dict(
                self.details
            ),
        }

    # ------------------------------------------------------------------
    # Boolean behavior
    # ------------------------------------------------------------------

    def __bool__(self) -> bool:
        return self.allowed

    # ------------------------------------------------------------------
    # Debug representation
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            "SecurityResult("
            f"allowed={self.allowed!r}, "
            f"blocked={self.blocked!r}, "
            f"risk={self.risk!r}, "
            f"categories={self.categories!r})"
        )


# ======================================================================
# SECURITY AGENT
# ======================================================================


class SecurityAgent:
    """
    Quiz_specific security boundary.

    Security architecture:

        RAW EXTERNAL CONTENT
                |
                v
        check_learning_content()
                |
                v
        SECURITY DETECTORS
                |
          +-----+-----+
          |           |
        BLOCK        ALLOW
                      |
                      v
                  sanitize
                      |
                      v
          TRUSTED FRAMEWORK PROMPT
                      |
                      v
                  QuizAgent
                      |
                      v
                     LLM
                      |
                      v
                check_output()


    Security trust model:

        1. Raw user/document content is UNTRUSTED.

        2. Raw content is checked before being inserted
           into a framework_generated prompt.

        3. The framework_generated prompt is TRUSTED.

        4. Trusted framework prompts must use:

               check_injection=False
               input_is_data=False

        5. Generated output is checked separately.
    """

    def __init__(
        self,
        security_manager: SecurityManager | None = None,
        policy: QuizSecurityPolicy | None = None,
        enabled: bool | None = None,
        application: str = "quiz_ai",
    ):
        self.application = application

        # --------------------------------------------------------------
        # Policy
        # --------------------------------------------------------------

        self.policy = (
            policy
            if policy is not None
            else QuizSecurityPolicy()
        )

        # Existing callers may explicitly provide enabled.
        if enabled is not None:
            self.policy.enabled = bool(
                enabled
            )

        self.policy.validate()

        # --------------------------------------------------------------
        # aipipe SecurityManager
        # --------------------------------------------------------------

        if security_manager is None:
            security_manager = SecurityManager()

        if not isinstance(
            security_manager,
            SecurityManager,
        ):
            raise TypeError(
                "security_manager must be an "
                "aipipe.security.SecurityManager "
                "instance or None"
            )

        self.security_manager = security_manager

        # --------------------------------------------------------------
        # Domain detectors
        # --------------------------------------------------------------

        self.jailbreak_detector = (
            JailbreakDetector()
        )

        self.document_injection_detector = (
            DocumentInjectionDetector()
        )

        self.quiz_manipulation_detector = (
            QuizManipulationDetector()
        )

        self.tool_abuse_detector = (
            ToolAbuseDetector()
        )

    # ==================================================================
    # DETECTOR HELPERS
    # ==================================================================

    @staticmethod
    def _detected(
        result: Any,
    ) -> bool:
        """
        Support detector dataclasses and dictionaries.
        """

        if result is None:
            return False

        value = getattr(
            result,
            "detected",
            None,
        )

        if value is not None:
            return bool(value)

        if isinstance(
            result,
            dict,
        ):
            return bool(
                result.get(
                    "detected",
                    False,
                )
            )

        return False

    @staticmethod
    def _matches(
        result: Any,
    ) -> list[str]:
        """
        Extract detector matches.
        """

        if result is None:
            return []

        value = getattr(
            result,
            "matches",
            None,
        )

        if value is not None:
            return list(
                value or []
            )

        if isinstance(
            result,
            dict,
        ):
            return list(
                result.get(
                    "matches",
                    [],
                )
                or []
            )

        return []

    @staticmethod
    def _reason(
        result: Any,
    ) -> str | None:
        """
        Extract detector reason.
        """

        if result is None:
            return None

        value = getattr(
            result,
            "reason",
            None,
        )

        if value is not None:
            return str(value)

        if isinstance(
            result,
            dict,
        ):
            value = result.get(
                "reason"
            )

            if value is not None:
                return str(value)

        return None

    @staticmethod
    def _categories(
        result: Any,
    ) -> dict[str, bool]:
        """
        Detector categories are normally represented as:

            {
                "instruction_override": True,
                "secret_extraction": True,
            }

        This method normalizes detector output.
        """

        if result is None:
            return {}

        value = getattr(
            result,
            "categories",
            None,
        )

        if isinstance(
            value,
            dict,
        ):
            return dict(value)

        if isinstance(
            result,
            dict,
        ):
            value = result.get(
                "categories",
                {},
            )

            if isinstance(
                value,
                dict,
            ):
                return dict(value)

        return {}

    @staticmethod
    def _info(
        result: Any,
    ) -> dict[str, Any]:
        """
        Normalize detector information.
        """

        if result is None:
            return {}

        info_method = getattr(
            result,
            "info",
            None,
        )

        if callable(
            info_method
        ):
            try:
                value = info_method()

                if isinstance(
                    value,
                    dict,
                ):
                    return value

            except Exception:
                pass

        if isinstance(
            result,
            dict,
        ):
            return dict(result)

        data: dict[str, Any] = {}

        for field in (
            "detected",
            "matches",
            "categories",
            "reason",
        ):
            if hasattr(
                result,
                field,
            ):
                data[field] = getattr(
                    result,
                    field,
                )

        return data

    @staticmethod
    def _unique(
        values: list[str],
    ) -> list[str]:
        return list(
            dict.fromkeys(
                values
            )
        )

    # ==================================================================
    # RESULT BUILDERS
    # ==================================================================

    def _allowed(
        self,
        details: dict[str, Any] | None = None,
    ) -> SecurityResult:

        return SecurityResult(
            allowed=True,
            risk="none",
            message="Security check passed.",
            reason=None,
            categories=[],
            matches=[],
            details=details,
        )

    def _blocked(
        self,
        reason: str,
        categories: list[str],
        matches: list[str],
        details: dict[str, Any] | None = None,
        risk: str = "high",
    ) -> SecurityResult:

        return SecurityResult(
            allowed=False,
            risk=risk,
            message=reason,
            reason=reason,
            categories=categories,
            matches=matches,
            details=details,
        )

    # ==================================================================
    # INPUT SECURITY
    # ==================================================================

    def check_input(
        self,
        text: str,
        *,
        check_injection: bool = True,
        input_is_data: bool = True,
    ) -> SecurityResult:
        """
        Check input against quiz security policies.

        RAW EXTERNAL DATA:

            check_injection=True
            input_is_data=True

        TRUSTED FRAMEWORK PROMPT:

            check_injection=False
            input_is_data=False

        The trusted_prompt mode deliberately skips application_level
        injection detectors. Otherwise defensive framework text such as:

            "Do not reveal the system prompt"

        could itself be incorrectly classified as an attack.
        """

        if not isinstance(
            text,
            str,
        ):
            text = str(text)

        # --------------------------------------------------------------
        # Security disabled
        # --------------------------------------------------------------

        if not self.policy.enabled:
            return self._allowed(
                {
                    "security_enabled": False,
                }
            )

        category_set: set[str] = set()

        matches: list[str] = []

        reasons: list[str] = []

        details: dict[str, Any] = {}

        # --------------------------------------------------------------
        # IMPORTANT SECURITY BOUNDARY
        # --------------------------------------------------------------

        if (
            check_injection
            and input_is_data
        ):

            # ==========================================================
            # JAILBREAK DETECTOR
            # ==========================================================

            if self.policy.block_jailbreak:

                try:
                    result = (
                        self.jailbreak_detector.detect(
                            text
                        )
                    )

                    if self._detected(
                        result
                    ):

                        # Generic category
                        category_set.add(
                            "prompt_injection"
                        )

                        # Detector category
                        category_set.add(
                            "jailbreak"
                        )

                        # Specific jailbreak categories
                        detector_categories = (
                            self._categories(
                                result
                            )
                        )

                        for (
                            name,
                            detected,
                        ) in detector_categories.items():

                            if detected:
                                category_set.add(
                                    name
                                )

                        matches.extend(
                            self._matches(
                                result
                            )
                        )

                        reason = self._reason(
                            result
                        )

                        if reason:
                            reasons.append(
                                reason
                            )

                        details[
                            "jailbreak"
                        ] = self._info(
                            result
                        )

                except Exception as exc:

                    if self.policy.fail_closed:
                        return self._blocked(
                            reason=(
                                "Jailbreak detector "
                                f"failed: {exc}"
                            ),
                            categories=[
                                "security_error"
                            ],
                            matches=[],
                            details={
                                "exception": repr(
                                    exc
                                ),
                                "detector": (
                                    "jailbreak"
                                ),
                            },
                        )

            # ==========================================================
            # QUIZ MANIPULATION
            # ==========================================================

            if self.policy.block_quiz_manipulation:

                try:
                    result = (
                        self.quiz_manipulation_detector.detect(
                            text
                        )
                    )

                    if self._detected(
                        result
                    ):

                        category_set.add(
                            "quiz_manipulation"
                        )

                        category_set.add(
                            "prompt_injection"
                        )

                        matches.extend(
                            self._matches(
                                result
                            )
                        )

                        reason = self._reason(
                            result
                        )

                        if reason:
                            reasons.append(
                                reason
                            )

                        details[
                            "quiz_manipulation"
                        ] = self._info(
                            result
                        )

                except Exception as exc:

                    if self.policy.fail_closed:
                        return self._blocked(
                            reason=(
                                "Quiz manipulation "
                                "detector failed: "
                                f"{exc}"
                            ),
                            categories=[
                                "security_error"
                            ],
                            matches=[],
                            details={
                                "exception": repr(
                                    exc
                                ),
                                "detector": (
                                    "quiz_manipulation"
                                ),
                            },
                        )

            # ==========================================================
            # TOOL ABUSE
            # ==========================================================

            if self.policy.block_tool_abuse:

                try:
                    result = (
                        self.tool_abuse_detector.detect(
                            text
                        )
                    )

                    if self._detected(
                        result
                    ):

                        category_set.add(
                            "tool_abuse"
                        )

                        category_set.add(
                            "prompt_injection"
                        )

                        matches.extend(
                            self._matches(
                                result
                            )
                        )

                        reason = self._reason(
                            result
                        )

                        if reason:
                            reasons.append(
                                reason
                            )

                        details[
                            "tool_abuse"
                        ] = self._info(
                            result
                        )

                except Exception as exc:

                    if self.policy.fail_closed:
                        return self._blocked(
                            reason=(
                                "Tool abuse detector "
                                f"failed: {exc}"
                            ),
                            categories=[
                                "security_error"
                            ],
                            matches=[],
                            details={
                                "exception": repr(
                                    exc
                                ),
                                "detector": (
                                    "tool_abuse"
                                ),
                            },
                        )

        # --------------------------------------------------------------
        # Consolidate
        # --------------------------------------------------------------

        if category_set:

            categories = sorted(
                category_set
            )

            reasons = self._unique(
                reasons
            )

            reason = "; ".join(
                reasons
            )

            if not reason:
                reason = (
                    "Security policy blocked "
                    "the input: "
                    + ", ".join(
                        categories
                    )
                )

            return self._blocked(
                reason=reason,
                categories=categories,
                matches=self._unique(
                    matches
                ),
                details=details,
            )

        return self._allowed(
            {
                "security_enabled": True,
                "input_is_data": input_is_data,
                "injection_check_enabled": (
                    check_injection
                ),
            }
        )

    # ==================================================================
    # LEARNING CONTENT SECURITY
    # ==================================================================

    def check_learning_content(
        self,
        content: str,
    ) -> SecurityResult:
        """
        Check raw learning/document content.

        This is the security boundary before the content is placed
        inside a trusted framework_generated prompt.
        """

        if not isinstance(
            content,
            str,
        ):
            content = str(content)

        if not self.policy.enabled:
            return self._allowed(
                {
                    "security_enabled": False,
                }
            )

        category_set: set[str] = set()

        matches: list[str] = []

        reasons: list[str] = []

        details: dict[str, Any] = {}

        # ==============================================================
        # DOCUMENT INJECTION
        # ==============================================================

        if self.policy.block_document_injection:

            try:
                result = (
                    self.document_injection_detector.detect(
                        content
                    )
                )

                if self._detected(
                    result
                ):

                    category_set.add(
                        "document_injection"
                    )

                    category_set.add(
                        "prompt_injection"
                    )

                    matches.extend(
                        self._matches(
                            result
                        )
                    )

                    reason = self._reason(
                        result
                    )

                    if reason:
                        reasons.append(
                            reason
                        )

                    details[
                        "document_injection"
                    ] = self._info(
                        result
                    )

            except Exception as exc:

                if self.policy.fail_closed:
                    return self._blocked(
                        reason=(
                            "Document injection "
                            "detector failed: "
                            f"{exc}"
                        ),
                        categories=[
                            "security_error"
                        ],
                        matches=[],
                        details={
                            "exception": repr(
                                exc
                            ),
                            "detector": (
                                "document_injection"
                            ),
                        },
                    )

        # ==============================================================
        # OTHER APPLICATION-LEVEL DETECTORS
        # ==============================================================

        input_result = self.check_input(
            content,
            check_injection=True,
            input_is_data=True,
        )

        if not input_result.allowed:

            category_set.update(
                input_result.categories
            )

            matches.extend(
                input_result.matches
            )

            if input_result.reason:
                reasons.append(
                    input_result.reason
                )

            details.update(
                input_result.details
            )

        # ==============================================================
        # FINAL RESULT
        # ==============================================================

        if category_set:

            categories = sorted(
                category_set
            )

            reasons = self._unique(
                reasons
            )

            reason = "; ".join(
                reasons
            )

            if not reason:
                reason = (
                    "Learning content blocked "
                    "by security policy."
                )

            return self._blocked(
                reason=reason,
                categories=categories,
                matches=self._unique(
                    matches
                ),
                details=details,
            )

        return self._allowed(
            {
                "security_enabled": True,
                "learning_content_checked": True,
            }
        )

    # ==================================================================
    # GENERIC DATA SECURITY
    # ==================================================================

    def check_data(
        self,
        data: str,
        *,
        detect_injection: bool = True,
    ) -> SecurityResult:
        """
        Generic external_data security check.
        """

        return self.check_input(
            data,
            check_injection=detect_injection,
            input_is_data=True,
        )

    # ==================================================================
    # OUTPUT SECURITY
    # ==================================================================

    def check_output(
        self,
        output: str,
    ) -> SecurityResult:
        """
        Check LLM-generated output.

        Generated output is NOT treated as an incoming instruction.

        Secret leakage is still checked.
        """

        if not isinstance(
            output,
            str,
        ):
            output = str(output)

        if not self.policy.enabled:
            return self._allowed(
                {
                    "security_enabled": False,
                }
            )

        category_set: set[str] = set()

        matches: list[str] = []

        reasons: list[str] = []

        details: dict[str, Any] = {}

        # ==============================================================
        # SECRET EXTRACTION
        # ==============================================================

        if self.policy.block_secret_extraction:

            try:
                result = (
                    self.jailbreak_detector.detect(
                        output
                    )
                )

                detector_categories = (
                    self._categories(
                        result
                    )
                )

                if detector_categories.get(
                    "secret_extraction",
                    False,
                ):

                    category_set.add(
                        "secret_extraction"
                    )

                    matches.extend(
                        self._matches(
                            result
                        )
                    )

                    reason = self._reason(
                        result
                    )

                    if reason:
                        reasons.append(
                            reason
                        )

                    details[
                        "secret_extraction"
                    ] = self._info(
                        result
                    )

            except Exception as exc:

                if self.policy.fail_closed:
                    return self._blocked(
                        reason=(
                            "Output security "
                            "check failed: "
                            f"{exc}"
                        ),
                        categories=[
                            "security_error"
                        ],
                        matches=[],
                        details={
                            "exception": repr(
                                exc
                            ),
                        },
                    )

        # ==============================================================
        # FINAL OUTPUT RESULT
        # ==============================================================

        if category_set:

            reasons = self._unique(
                reasons
            )

            reason = "; ".join(
                reasons
            )

            if not reason:
                reason = (
                    "Generated output "
                    "contains blocked content."
                )

            return self._blocked(
                reason=reason,
                categories=sorted(
                    category_set
                ),
                matches=self._unique(
                    matches
                ),
                details=details,
            )

        return self._allowed(
            {
                "security_enabled": True,
                "output_checked": True,
            }
        )

    # ==================================================================
    # SANITIZATION
    # ==================================================================

    def sanitize(
        self,
        text: str,
    ) -> str:
        """
        Sanitize content after it has passed security checks.

        Some aipipe SecurityManager versions may not expose
        sanitize(). In that case, validated content is returned
        unchanged.
        """

        if not isinstance(
            text,
            str,
        ):
            text = str(text)

        if not self.policy.enabled:
            return text

        sanitize_method = getattr(
            self.security_manager,
            "sanitize",
            None,
        )

        if not callable(
            sanitize_method
        ):
            return text

        try:
            result = sanitize_method(
                text
            )

            if isinstance(
                result,
                str,
            ):
                return result

            result_text = getattr(
                result,
                "text",
                None,
            )

            if isinstance(
                result_text,
                str,
            ):
                return result_text

            return text

        except Exception as exc:

            if self.policy.fail_closed:
                raise SecurityError(
                    f"Security sanitization failed: {exc}"
                ) from exc

            return text

    # ==================================================================
    # SECURE INPUT
    # ==================================================================

    def secure_input(
        self,
        text: str,
    ) -> str:
        """
        Check and sanitize external input.

        Raises aipipe.exceptions.SecurityError when blocked.
        """

        result = self.check_input(
            text,
            check_injection=True,
            input_is_data=True,
        )

        if not result.allowed:
            raise SecurityError(
                result.message
            )

        return self.sanitize(
            text
        )

    # ==================================================================
    # SECURE LEARNING CONTENT
    # ==================================================================

    def secure_learning_content(
        self,
        content: str,
    ) -> str:
        """
        Check and sanitize learning/document content.

        Raises aipipe.exceptions.SecurityError when blocked.
        """

        result = self.check_learning_content(
            content
        )

        if not result.allowed:
            raise SecurityError(
                result.message
            )

        return self.sanitize(
            content
        )

    # ==================================================================
    # SECURE OUTPUT
    # ==================================================================

    def secure_output(
        self,
        output: str,
    ) -> str:
        """
        Check generated output.

        Raises aipipe.exceptions.SecurityError when blocked.
        """

        result = self.check_output(
            output
        )

        if not result.allowed:
            raise SecurityError(
                result.message
            )

        return output

    # ==================================================================
    # COMPATIBILITY ALIASES
    # ==================================================================

    def check(
        self,
        text: str,
    ) -> SecurityResult:
        """
        Backward_compatible generic security check.
        """

        return self.check_input(
            text,
            check_injection=True,
            input_is_data=True,
        )

    def secure(
        self,
        text: str,
    ) -> str:
        """
        Backward_compatible secure_input method.
        """

        return self.secure_input(
            text
        )

    # ==================================================================
    # DIAGNOSTICS
    # ==================================================================

    def info(self) -> dict[str, Any]:
        return {
            "application": self.application,
            "enabled": self.policy.enabled,

            "policy": self.policy.info(),

            "controls": {
                "block_jailbreak": (
                    self.policy.block_jailbreak
                ),

                "block_document_injection": (
                    self.policy.block_document_injection
                ),

                "block_quiz_manipulation": (
                    self.policy.block_quiz_manipulation
                ),

                "block_tool_abuse": (
                    self.policy.block_tool_abuse
                ),

                "block_role_override": (
                    self.policy.block_role_override
                ),

                "block_system_prompt_extraction": (
                    self.policy.block_system_prompt_extraction
                ),

                "block_secret_extraction": (
                    self.policy.block_secret_extraction
                ),
            },

            "detectors": {
                "jailbreak": True,
                "document_injection": True,
                "quiz_manipulation": True,
                "tool_abuse": True,
            },
        }

    # ==================================================================
    # REPRESENTATION
    # ==================================================================

    def __repr__(self) -> str:
        return (
            "SecurityAgent("
            f"application={self.application!r}, "
            f"enabled={self.policy.enabled!r})"
        )
