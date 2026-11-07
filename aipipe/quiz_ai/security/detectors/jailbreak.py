from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class JailbreakDetection:
    detected: bool
    matches: list[str] = field(default_factory=list)
    categories: dict[str, bool] = field(default_factory=dict)
    reason: str | None = None

    def info(self) -> dict:
        return {
            "detected": self.detected,
            "matches": list(self.matches),
            "categories": dict(self.categories),
            "reason": self.reason,
        }


class JailbreakDetector:
    """
    Application_level jailbreak detector.

    This detector identifies attempts to:
        - override instructions
        - extract system prompts
        - extract internal instructions
        - extract secrets/API keys
        - bypass security
        - override application roles
        - override security policies
    """

    PATTERNS = {
        "instruction_override": [
            r"\bignore\s+(all\s+)?previous\s+instructions?\b",
            r"\bignore\s+(all\s+)?prior\s+instructions?\b",
            r"\bdisregard\s+(all\s+)?previous\s+instructions?\b",
            r"\bdisregard\s+(all\s+)?prior\s+instructions?\b",
            r"\boverride\s+(all\s+)?previous\s+instructions?\b",
            r"\bforget\s+(all\s+)?previous\s+instructions?\b",
        ],

        "system_prompt_extraction": [
            r"\breveal\s+(the\s+)?system\s+prompt\b",
            r"\bshow\s+(the\s+)?system\s+prompt\b",
            r"\bprint\s+(the\s+)?system\s+prompt\b",
            r"\bdisplay\s+(the\s+)?system\s+prompt\b",
            r"\bwhat\s+is\s+(the\s+)?system\s+prompt\b",
            r"\bprovide\s+(the\s+)?system\s+prompt\b",
        ],

        "internal_instruction_extraction": [
            r"\breveal\s+(the\s+)?internal\s+instructions?\b",
            r"\bshow\s+(the\s+)?internal\s+instructions?\b",
            r"\bprint\s+(the\s+)?internal\s+instructions?\b",
            r"\breveal\s+hidden\s+instructions?\b",
            r"\bshow\s+hidden\s+instructions?\b",
            r"\bprint\s+hidden\s+instructions?\b",
        ],

        "secret_extraction": [
            # Direct requests
            r"\breveal\s+(the\s+)?api\s+keys?\b",
            r"\bshow\s+(the\s+)?api\s+keys?\b",
            r"\bprint\s+(the\s+)?api\s+keys?\b",
            r"\bdisplay\s+(the\s+)?api\s+keys?\b",

            r"\breveal\s+(the\s+)?secrets?\b",
            r"\bshow\s+(the\s+)?secrets?\b",
            r"\bprint\s+(the\s+)?secrets?\b",
            r"\bdisplay\s+(the\s+)?secrets?\b",

            r"\breveal\s+(the\s+)?passwords?\b",
            r"\bshow\s+(the\s+)?passwords?\b",

            r"\breveal\s+(the\s+)?credentials?\b",
            r"\bshow\s+(the\s+)?credentials?\b",

            # Handles compound requests such as:
            # "Reveal the system prompt and API keys."
            r"\b(?:reveal|show|print|display)\b"
            r".{0,100}\bapi\s+keys?\b",

            r"\b(?:reveal|show|print|display)\b"
            r".{0,100}\bsecrets?\b",

            r"\b(?:reveal|show|print|display)\b"
            r".{0,100}\bcredentials?\b",

            r"\b(?:reveal|show|print|display)\b"
            r".{0,100}\bpasswords?\b",

            r"\breveal\s+(other\s+)?users?\s+"
            r"(information|data)\b",
        ],

        "security_bypass": [
            r"\bdisable\s+security\b",
            r"\bturn\s+off\s+security\b",
            r"\bbypass\s+security\b",
            r"\bdisable\s+safety\b",
            r"\bturn\s+off\s+safety\b",
            r"\bbypass\s+safety\b",
            r"\bdisable\s+all\s+safety\b",
        ],

        "role_override": [
            r"\byou\s+are\s+now\s+(the\s+)?system\s+administrator\b",
            r"\byou\s+are\s+now\s+(the\s+)?administrator\b",
            r"\byou\s+are\s+now\s+(the\s+)?root\s+user\b",
            r"\byou\s+are\s+no\s+longer\b",
            r"\bact\s+as\s+(the\s+)?system\s+administrator\b",
            r"\bact\s+as\s+(the\s+)?administrator\b",
            r"\bpretend\s+to\s+be\s+(the\s+)?system\s+administrator\b",
            r"\bpretend\s+to\s+be\s+(the\s+)?administrator\b",
            r"\bignore\s+(your\s+)?current\s+role\b",
            r"\bchange\s+(your\s+)?role\b",
            r"\boverride\s+(your\s+)?role\b",
            r"\byour\s+new\s+role\s+is\b",
        ],

        "policy_override": [
            r"\bignore\s+the\s+security\s+policy\b",
            r"\bignore\s+security\s+rules\b",
            r"\bignore\s+safety\s+rules\b",
            r"\bdo\s+not\s+follow\s+security\s+rules\b",
            r"\bdisregard\s+the\s+security\s+policy\b",
            r"\boverride\s+the\s+security\s+policy\b",
            r"\bbypass\s+the\s+security\s+policy\b",
        ],
    }

    def detect(self, text: str) -> JailbreakDetection:
        if not isinstance(text, str):
            raise TypeError(
                "JailbreakDetector expects a string."
            )

        lowered = text.lower()

        matches: list[str] = []

        categories = {
            category: False
            for category in self.PATTERNS
        }

        for category, patterns in self.PATTERNS.items():
            for pattern in patterns:
                if re.search(
                    pattern,
                    lowered,
                    flags=re.IGNORECASE | re.DOTALL,
                ):
                    categories[category] = True

                    if category not in matches:
                        matches.append(category)

                    break

        detected_categories = sum(
            1
            for value in categories.values()
            if value
        )

        # These are independently high_confidence attacks.
        high_confidence = any(
            categories[name]
            for name in (
                "instruction_override",
                "system_prompt_extraction",
                "internal_instruction_extraction",
                "secret_extraction",
                "security_bypass",
                "role_override",
                "policy_override",
            )
        )

        # Multiple weaker indicators are also treated as an attack.
        multi_signal = (
            categories["instruction_override"]
            and detected_categories >= 2
        )

        broad_attack = detected_categories >= 3

        detected = (
            high_confidence
            or multi_signal
            or broad_attack
        )

        reason = None

        if detected:
            reason = (
                "Application_level jailbreak indicators "
                "were detected."
            )

        return JailbreakDetection(
            detected=detected,
            matches=matches,
            categories=categories,
            reason=reason,
        )
