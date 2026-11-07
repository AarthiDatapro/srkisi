import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { add_fk } from "../utils/schema_ddl.js";
import { run_once } from "../utils/run_once.js";
import { ensure_content_schema } from "./schema.js";

const CREATE_LESSON_DONE = `
CREATE TABLE IF NOT EXISTS tbl_lesson_done (
    lesson_done_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cohort_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    lesson_id BIGINT NOT NULL,
    marked_by BIGINT NULL,
    marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lesson_done UNIQUE (cohort_id, program_id, course_id, lesson_id)
)
`;

async function ensure_lesson_done_schema_now() {
  log.info("ensure_lesson_done_schema", "ensuring lesson done table");
  await ensure_content_schema();
  const pool = get_pool();
  await pool.query(CREATE_LESSON_DONE);
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_done
     ADD CONSTRAINT fk_lesson_done_cohort
     FOREIGN KEY (cohort_id) REFERENCES tbl_cohorts(cohort_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_done
     ADD CONSTRAINT fk_lesson_done_program
     FOREIGN KEY (program_id) REFERENCES tbl_programs(program_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_done
     ADD CONSTRAINT fk_lesson_done_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_done
     ADD CONSTRAINT fk_lesson_done_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  log.pass("ensure_lesson_done_schema", "lesson done table ready");
}

export function ensure_lesson_done_schema() {
  return run_once("lesson_done_schema", ensure_lesson_done_schema_now);
}
