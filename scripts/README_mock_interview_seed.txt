Synthetic Mock Interview History Seeder

Contents:
- seed_mock_interview_history.js
- students_courses_standardized.xlsx
- mock_interview_question_bank_20_courses_10_variants.json

This generates clearly marked SYNTHETIC demo/test interview history. It does not represent actual student activity.

Requirements (run from this folder):
  npm install mysql2 xlsx dotenv

Create a .env file:
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=your_user
  DB_PASSWORD=your_password
  DB_NAME=your_database
  DRY_RUN=true

First run with DRY_RUN=true. Review the summary and skipped courses. The script matches exact normalized names in tbl_students and skips ambiguous duplicate names. It also skips course names without a matching question-bank course/alias. No artificial student limit is applied (LIMIT=0 by default).

Only after verifying the dry-run output, set DRY_RUN=false to insert. The generated JSON contains synthetic_demo=true and a notice in analysis_json. Existing synthetic history for the same student/course is skipped to avoid duplicate inserts.

Important: This script cannot be run against your database from this chat because no database connection/credentials are available here. Run it in your backend environment with the correct DB connection. Inspect the detected tbl_students columns before using it; if your name/id columns use different names, add them to the candidate arrays in the script.
