ALTER TABLE tbl_program_courses
    ADD COLUMN enroll_passkey VARCHAR(40) NULL;

UPDATE tbl_program_courses pc
INNER JOIN tbl_courses c ON c.course_id = pc.course_id
SET pc.enroll_passkey = c.enroll_passkey
WHERE pc.enroll_passkey IS NULL
  AND c.is_offline = TRUE
  AND c.enroll_passkey IS NOT NULL
  AND TRIM(c.enroll_passkey) <> '';
