# sqls — requirements

**Where:** `server/sqls`. Table definitions, masters, alters, migrations.  
Update this file in the same PR when this module changes.

## Who

Backend / ops. Not a user screen.

## Must do

- Hold the SQL that creates and changes LMS tables (`tbls`, `msts`, `alters`, `migrations`).
- Stay the source of truth for schema. Do not invent a second copy of the same table only in JavaScript without updating these files.

## Done when

- A new table or column has a SQL file here in the same PR as the code that uses it.
- File names stay snake_case (`tbl_courses.sql`).

## Naming

Follow root `CODING_STANDARD.md`. SQL file names stay snake_case. Do not invent a second naming style for tables or columns.
