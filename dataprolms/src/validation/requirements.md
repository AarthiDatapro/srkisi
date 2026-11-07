# validation — requirements

**Where:** `dataprolms/src/validation` only. Not a menu screen.  
Update this file in the same PR when this module changes.

## Who

Platform — student and employee forms that need an email check.

## Screen

None.

## Must do

- Validate email strings and return a human error message.
- Helpers and exports use snake_case per `CODING_STANDARD.md`.

## Done when

- Empty, malformed, and valid emails each get a clear result.
- Forms can call this instead of copying regex.
