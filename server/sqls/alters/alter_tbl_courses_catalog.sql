ALTER TABLE tbl_courses
    ADD COLUMN course_tagline VARCHAR(200) NULL,
    ADD COLUMN discount_percent DECIMAL(5,2) NULL,
    ADD COLUMN created_by_display VARCHAR(150) NULL,
    ADD COLUMN real_world_project_count INT NULL,
    ADD COLUMN has_completion_certificate BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN learn_points JSON NULL,
    ADD COLUMN audience_points JSON NULL,
    ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN is_open BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN course_domain_id BIGINT NULL,
    ADD COLUMN course_level_id BIGINT NULL,
    ADD COLUMN course_tag_id BIGINT NULL;

ALTER TABLE tbl_courses
    ADD CONSTRAINT fk_courses_course_domain
        FOREIGN KEY (course_domain_id)
        REFERENCES mst_course_domains(course_domain_id);

ALTER TABLE tbl_courses
    ADD CONSTRAINT fk_courses_course_level
        FOREIGN KEY (course_level_id)
        REFERENCES mst_course_levels(course_level_id);

ALTER TABLE tbl_courses
    ADD CONSTRAINT fk_courses_course_tag
        FOREIGN KEY (course_tag_id)
        REFERENCES mst_course_tags(course_tag_id);

UPDATE tbl_courses c
INNER JOIN mst_course_levels l ON l.course_level_name = c.level
SET c.course_level_id = l.course_level_id
WHERE c.course_level_id IS NULL
  AND c.level IS NOT NULL
  AND c.level <> '';
