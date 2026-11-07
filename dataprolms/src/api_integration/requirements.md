# api_integration — requirements (frontend)

**Pair:** `server/api_integration`  
Update this file in the same PR when this module changes.

## Who

Employee with `api_integration` **view** reads the student import guide and downloads the sample workbook. **Edit** checks a workbook and confirms the import.

## What it shows

One documentation page: module description, import methods, fields, sample template, field mapping, API examples, and validation. The methods section is where the workbook is uploaded.

## Must do

- Check the file first. Show the script report on the page. Do not import during the check.
- Ask for confirmation before import.
- Import sends the `check_id` from that check. A new file clears the previous check.

## Empty, error, and view-only

- No file chosen: the check button stays disabled.
- Check or import failure: the message stays in the upload panel.
- View only: the upload controls are hidden. The guide and template download stay available.

## Done when

- The seven documentation sections are on the screen.
- A fitting workbook can be checked, confirmed, and imported from this page.
- Choosing another file requires a new check.

## Naming

Follow root `CODING_STANDARD.md`. Component is `Api_Integration`. CSS prefix is `api_`.
