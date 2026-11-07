from __future__ import annotations

import re


class ToolAbuseDetector:
    """
    Detect attempts to force unauthorized tool, shell, or
    arbitrary code execution.
    """

    PATTERNS = [
        (
            "command_execution",
            r"\bexecute\s+(this|the)\s+command\b",
        ),
        (
            "command_execution",
            r"\brun\s+(this|the)\s+command\b",
        ),
        (
            "command_execution",
            r"\bexecute\s+arbitrary\s+commands?\b",
        ),
        (
            "command_execution",
            r"\brun\s+arbitrary\s+commands?\b",
        ),
        (
            "code_execution",
            r"\bexecute\s+(this|the)\s+code\b",
        ),
        (
            "code_execution",
            r"\brun\s+(this|the)\s+code\b",
        ),
        (
            "code_execution",
            r"\bexecute\s+arbitrary\s+code\b",
        ),
        (
            "code_execution",
            r"\brun\s+arbitrary\s+code\b",
        ),
        (
            "unregistered_tool",
            r"\bcall\s+an?\s+unregistered\s+tool\b",
        ),
        (
            "arbitrary_tool",
            r"\buse\s+any\s+tool\b",
        ),
        (
            "arbitrary_tool",
            r"\buse\s+an?\s+arbitrary\s+tool\b",
        ),
        (
            "all_tools",
            r"\buse\s+all\s+available\s+tools\b",
        ),
        (
            "shell_execution",
            r"\bexecute\s+shell\s+commands?\b",
        ),
        (
            "shell_execution",
            r"\brun\s+shell\s+commands?\b",
        ),
        (
            "shell_execution",
            r"\bexecute\s+arbitrary\s+shell\s+commands?\b",
        ),
        (
            "shell_execution",
            r"\brun\s+arbitrary\s+shell\s+commands?\b",
        ),
        (
            "shell_execution",
            r"\bexecute\s+.*\bshell\s+commands?\b",
        ),
        (
            "arbitrary_code",
            r"\bexecute\s+arbitrary\s+code\b",
        ),
        (
            "arbitrary_code",
            r"\brun\s+arbitrary\s+code\b",
        ),
    ]

    def detect(self, text: str) -> dict:
        if not isinstance(text, str):
            raise TypeError(
                "ToolAbuseDetector expects a string."
            )

        matches: list[str] = []

        for category, pattern in self.PATTERNS:
            if re.search(
                pattern,
                text,
                flags=re.IGNORECASE | re.DOTALL,
            ):
                if category not in matches:
                    matches.append(category)

        return {
            "detected": bool(matches),
            "matches": matches,
        }
