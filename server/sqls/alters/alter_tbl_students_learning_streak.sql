ALTER TABLE tbl_students
    ADD COLUMN learning_streak INT NOT NULL DEFAULT 0;

ALTER TABLE tbl_students
    ADD COLUMN last_streak_date DATE NULL;
