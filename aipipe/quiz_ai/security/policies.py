from __future__ import annotations

from dataclasses import dataclass


@dataclass
class QuizSecurityPolicy:
    enabled: bool = True

    block_jailbreak: bool = True
    block_document_injection: bool = True
    block_quiz_manipulation: bool = True
    block_tool_abuse: bool = True

    block_role_override: bool = True
    block_system_prompt_extraction: bool = True
    block_secret_extraction: bool = True

    fail_closed: bool = True

    def validate(self) -> None:
        if not isinstance(self.enabled, bool):
            raise ValueError(
                "enabled must be bool"
            )

        if not isinstance(
            self.fail_closed,
            bool,
        ):
            raise ValueError(
                "fail_closed must be bool"
            )

    def info(self) -> dict:
        return {
            "enabled": self.enabled,
            "block_jailbreak": self.block_jailbreak,
            "block_document_injection": (
                self.block_document_injection
            ),
            "block_quiz_manipulation": (
                self.block_quiz_manipulation
            ),
            "block_tool_abuse": self.block_tool_abuse,
            "block_role_override": (
                self.block_role_override
            ),
            "block_system_prompt_extraction": (
                self.block_system_prompt_extraction
            ),
            "block_secret_extraction": (
                self.block_secret_extraction
            ),
            "fail_closed": self.fail_closed,
        }