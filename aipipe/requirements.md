# aipipe — requirements

**Where:** `aipipe/`. Python quiz/AI service. Called by the Node server, not by the browser directly.  
Update this file in the same PR when this module changes.

## Who

- Student (via Node): lesson help chat.
- Employee (via Node): generate quiz from lesson text.

## Must do

- Generate a quiz from text (`POST /api/quiz/generate_from_text`).
- Reject unsafe / jailbreak / injection prompts.
- Stay configurable through `config/*.yaml` and env (no personal PC paths).

## Done when

- Generate returns questions that match the request, or a security/validation error.
- Unit/security tests under `tests/` still cover the detectors.
- Health of this service is checkable when it is deployed.

## Naming

Follow root `CODING_STANDARD.md` where it applies (snake_case for our files and helpers). Leave third-party / framework names unchanged.

