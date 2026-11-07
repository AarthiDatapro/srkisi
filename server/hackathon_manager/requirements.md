# hackathon_manager — requirements

## Who

Employee with `hackathons` view. Writes and generation need edit.

## APIs

- `GET /api/hackathon_manager/options` — cohorts with their programs, and active programming languages
- `GET /api/hackathon_manager` — hackathon list
- `GET /api/hackathon_manager/:hackathonId`
- `POST /api/hackathon_manager` — create
- `PUT /api/hackathon_manager/:hackathonId` — update
- `DELETE /api/hackathon_manager/:hackathonId` — soft delete
- `POST /api/hackathon_manager/generate_mcq` — quiz generator, returns questions only
- `POST /api/hackathon_manager/generate_coding` — coding generator, returns one question only

## Must do

- Store title, description, type (`mcq`, `coding`, `project`), audience (`program` or `open`), schedule, rules, and status.
- Program audience stores the cohort and the selected program ids. Those programs must belong to that cohort.
- Open audience stores no cohort and no programs.
- Questions and tasks live on `tbl_hackathon_items`.

## Done

- Draft can be saved with a title before questions exist.
- Publish rejects a missing schedule, a program audience without programs, and an empty question or task list.
- Tables are created by `schema.js` and recorded in `server/sqls/tbls/`.
