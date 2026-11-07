# services — requirements

**Where:** `server/services` (AI stream helper). Not a menu screen.  
Update this file in the same PR when this module changes.

## Who

Called by `server/ai`, not by the browser directly.

## Must do

- Stream AI chat tokens to the HTTP response.
- Use the configured AI backend (`AI_BACKEND` / aipipe).

## Done when

- A successful chat streams text.
- A down backend fails with a logged error, not a hang with no status.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

