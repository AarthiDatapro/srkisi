// Insert the open course "Employability Skills", with modules and lessons.
// This script is not part of the app.
//
//   node scripts/employability_skills_course.js
//
// A second run does nothing if that course name is already in tbl_courses.
// course_code is required by the table, so it is included with the course fields.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(SCRIPT_DIR, "..", "server");
const server_require = createRequire(path.join(SERVER_DIR, "package.json"));

const dotenv = server_require("dotenv");
const mysql = server_require("mysql2/promise");

dotenv.config({ path: path.join(SERVER_DIR, ".env") });

const COURSE = {
  course_code: "DP-ESC-1202",
  course_name: "Employability Skills",
  course_tagline: "Build Employability Skills with Hands-On Practice and Real-World Projects",
  course_description: "A beginner course in job readiness, professional profile building, interviews, and workplace habits. Students practise the steps used to find, win, and keep a first role.",
  course_type_id: 5,
  duration_hours: 40,
  level: "Beginner",
  fee_amount: null,
  discount_percent: null,
  created_by_display: "Datapro",
  real_world_project_count: 4,
  has_completion_certificate: true,
  learn_points: [
    "Read a job role and match your skills to it",
    "Build a clear resume and professional profile",
    "Answer common interview questions with evidence",
    "Follow workplace habits that keep a first job",
    "Plan the next step after an application or interview"
  ],
  audience_points: [
    "Students preparing for placements",
    "Learners seeking a first job",
    "Anyone building job-ready habits"
  ],
  is_paid: false,
  is_open: true,
  course_domain_id: 12,
  course_level_id: 1,
  modules: [
    {
      module_title: "Job Market Awareness",
      module_description: "Roles, skills, and how employers read an application.",
      lessons: [
        { lesson_title: "Reading a Job Role", lesson_description: "Break a job post into must-have skills, nice-to-have skills, and duties.", duration_minutes: 120 },
        { lesson_title: "Matching Your Skills", lesson_description: "Map your course work and projects to the skills named in a role.", duration_minutes: 120 },
        { lesson_title: "Industry Expectations", lesson_description: "List what employers expect on day one: time, tools, and communication.", duration_minutes: 120 },
        { lesson_title: "Application Channels", lesson_description: "Choose where to apply and what to send with each application.", duration_minutes: 120 },
        { lesson_title: "Job Market Practice", lesson_description: "Pick one role, mark must-have skills, and write a short fit note.", duration_minutes: 120 }
      ]
    },
    {
      module_title: "Professional Profile",
      module_description: "Resume, introduction, and proof of work.",
      lessons: [
        { lesson_title: "Resume Structure", lesson_description: "Build a one-page resume with contact, skills, education, and projects.", duration_minutes: 120 },
        { lesson_title: "Project Evidence", lesson_description: "Describe one project with the problem, what you did, and the result.", duration_minutes: 120 },
        { lesson_title: "Professional Introduction", lesson_description: "Write a 60-second introduction naming your course and one strength.", duration_minutes: 120 },
        { lesson_title: "Online Presence Basics", lesson_description: "Keep a clean profile photo, headline, and short about section.", duration_minutes: 120 },
        { lesson_title: "Profile Practice", lesson_description: "Finish one resume draft and one spoken introduction.", duration_minutes: 120 }
      ]
    },
    {
      module_title: "Interview and Selection",
      module_description: "Common questions, short answers, and follow-up.",
      lessons: [
        { lesson_title: "Interview Formats", lesson_description: "Know the difference between screening, technical, and HR rounds.", duration_minutes: 120 },
        { lesson_title: "Tell Me About Yourself", lesson_description: "Answer with course, one project, and why you want the role.", duration_minutes: 120 },
        { lesson_title: "Behaviour Questions", lesson_description: "Use situation, action, and result for teamwork and problem stories.", duration_minutes: 120 },
        { lesson_title: "Questions to Ask", lesson_description: "Ask one useful question about the role, team, or first month.", duration_minutes: 120 },
        { lesson_title: "Interview Practice", lesson_description: "Answer three questions aloud and write one follow-up thank-you line.", duration_minutes: 120 }
      ]
    },
    {
      module_title: "Workplace Readiness",
      module_description: "First-week habits, ownership, and growth planning.",
      lessons: [
        { lesson_title: "First Week Habits", lesson_description: "Arrive on time, take notes, and confirm what is due by when.", duration_minutes: 120 },
        { lesson_title: "Task Ownership", lesson_description: "Accept a task, report progress, and say when you are blocked.", duration_minutes: 120 },
        { lesson_title: "Feedback at Work", lesson_description: "Receive feedback, ask one clarifying question, and apply one change.", duration_minutes: 120 },
        { lesson_title: "Growth Plan", lesson_description: "Set one skill goal for the next month and the first practice step.", duration_minutes: 120 },
        { lesson_title: "Workplace Practice", lesson_description: "Write a one-week plan for a new role and one status update.", duration_minutes: 120 }
      ]
    }
  ]
};

function pool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

async function main() {
  const db = pool();
  const connection = await db.getConnection();
  try {
    const [named] = await connection.execute(
      `SELECT course_id, course_code
       FROM tbl_courses
       WHERE is_deleted = FALSE AND LOWER(TRIM(course_name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [COURSE.course_name]
    );
    if (named.length) {
      console.log(`Already in the LMS. course_id ${named[0].course_id}, code ${named[0].course_code}. Nothing inserted.`);
      return;
    }

    const [coded] = await connection.execute(
      `SELECT course_id, course_name
       FROM tbl_courses
       WHERE LOWER(TRIM(course_code)) = LOWER(TRIM(?))
       LIMIT 1`,
      [COURSE.course_code]
    );
    if (coded.length) {
      throw new Error(`Course code ${COURSE.course_code} is already used by ${coded[0].course_name}.`);
    }

    await connection.beginTransaction();
    const [inserted] = await connection.execute(
      `INSERT INTO tbl_courses (
         course_code, course_name, course_tagline, course_description,
         course_type_id, duration_hours, level, fee_amount, discount_percent,
         created_by_display, real_world_project_count, has_completion_certificate,
         learn_points, audience_points, is_paid, is_open,
         course_domain_id, course_level_id,
         is_active, is_deleted, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE, NOW())`,
      [
        COURSE.course_code,
        COURSE.course_name,
        COURSE.course_tagline,
        COURSE.course_description,
        COURSE.course_type_id,
        COURSE.duration_hours,
        COURSE.level,
        COURSE.fee_amount,
        COURSE.discount_percent,
        COURSE.created_by_display,
        COURSE.real_world_project_count,
        COURSE.has_completion_certificate,
        JSON.stringify(COURSE.learn_points),
        JSON.stringify(COURSE.audience_points),
        COURSE.is_paid,
        COURSE.is_open,
        COURSE.course_domain_id,
        COURSE.course_level_id
      ]
    );
    const course_id = Number(inserted.insertId);
    let module_count = 0;
    let lesson_count = 0;

    for (const [module_index, module] of COURSE.modules.entries()) {
      const [module_row] = await connection.execute(
        `INSERT INTO tbl_course_modules
           (course_id, module_title, module_description, sequence_no, is_active, is_deleted, created_at)
         VALUES (?, ?, ?, ?, TRUE, FALSE, NOW())`,
        [course_id, module.module_title, module.module_description, module_index + 1]
      );
      const module_id = Number(module_row.insertId);
      module_count += 1;

      for (const [lesson_index, lesson] of module.lessons.entries()) {
        const sequence_no = lesson_index + 1;
        const [lesson_row] = await connection.execute(
          `INSERT INTO tbl_course_lessons
             (course_id, module_id, lesson_title, lesson_description, sequence_no, duration_minutes, is_active, is_deleted, created_at)
           VALUES (?, ?, ?, ?, ?, ?, TRUE, FALSE, NOW())`,
          [course_id, module_id, lesson.lesson_title, lesson.lesson_description, sequence_no, lesson.duration_minutes]
        );
        const lesson_id = Number(lesson_row.insertId);
        await connection.execute(
          `INSERT INTO tbl_course_content
             (course_id, module_id, content_type, lesson_id, sequence_no, is_active, is_deleted, created_at)
           VALUES (?, ?, 'lesson', ?, ?, TRUE, FALSE, NOW())`,
          [course_id, module_id, lesson_id, sequence_no]
        );
        lesson_count += 1;
      }
    }

    await connection.commit();
    console.log(`Inserted Employability Skills. course_id ${course_id}, code ${COURSE.course_code}.`);
    console.log(`Modules: ${module_count}   Lessons: ${lesson_count}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

main().catch((error) => {
  console.error("Insert stopped:", error.message);
  process.exitCode = 1;
});
