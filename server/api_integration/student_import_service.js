import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server_dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo_root = path.resolve(server_dir, "..");
const student_script = path.join(repo_root, "scripts", "importStudents.js");
const student_workbook = path.join(repo_root, "scripts", "students.xlsx");
const attendance_script = path.join(repo_root, "scripts", "importAttendance.js");
const attendance_workbook = path.join(repo_root, "scripts", "attendance.xlsx");
const course_script = path.join(repo_root, "scripts", "importCourses.js");
const course_workbook = path.join(repo_root, "scripts", "courses.xlsx");
const registration_script = path.join(repo_root, "scripts", "importRegistrations.js");
const registration_workbook = path.join(repo_root, "scripts", "registrations.xlsx");
const quiz_script = path.join(repo_root, "scripts", "importQuizzes.js");
const quiz_workbook = path.join(repo_root, "scripts", "quizzes.xlsx");
const attempt_script = path.join(repo_root, "scripts", "importQuizAttempts.js");
const attempt_workbook = path.join(repo_root, "scripts", "quiz_attempts.xlsx");
const require_server = createRequire(path.join(server_dir, "package.json"));
const XLSX = require_server("xlsx");

const LOG_CAP = 180000;
const RUN_LIMIT_MS = 10 * 60 * 1000;

const pending_by_kind = {
  students: null,
  attendance: null,
  courses: null,
  registrations: null,
  quizzes: null,
  quiz_attempts: null
};

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clip(text) {
  const value = String(text || "")
    .split(/\r?\n/)
    .filter((line) => !/injected env|dotenvx\.com/i.test(line))
    .join("\n")
    .trim();
  return value.length > LOG_CAP ? value.slice(-LOG_CAP) : value;
}

export function attempt_template_buffer() {
  const rows = [
    ["course_name", "quiz_name", "student_email", "batch_name", "question", "selected_answer", "duration_seconds", "submitted_at"],
    ["Full Stack Python", "Python check", "asha.rao@institution.edu", "Python Batch 2026", "What does print() do?", "Writes text", 180, "2026-10-15 10:30:00"],
    ["Full Stack Python", "Python check", "asha.rao@institution.edu", "Python Batch 2026", "Which symbol starts a comment?", "A", "", ""]
  ];
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, "Quiz attempts");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

export function quiz_template_buffer() {
  const rows = [
    ["course_name", "quiz_name", "module", "lesson", "question", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation", "difficulty", "bloom_level", "questions_shown", "quiz_description"],
    ["Full Stack Python", "Python check", "Python basics", "Welcome", "What does print() do?", "Writes text", "Reads a file", "Deletes a file", "Stops the program", "Writes text", "It sends text to the screen.", "easy", "remember", 2, "A short check after the welcome lesson"],
    ["Full Stack Python", "Python check", "Python basics", "Welcome", "Which symbol starts a comment?", "#", "//", "/*", "--", "A", "Python comments start with #.", "easy", "remember", "", ""]
  ];
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, "Quizzes");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

export function registration_template_buffer() {
  const rows = [
    ["batch_name", "course_name", "student_email", "program_type", "program duration", "program_description", "registration_code", "start_date"],
    ["Python Batch 2026", "Full Stack Python", "asha.rao@institution.edu", "Certificate", "6 months", "Evening batch for working graduates", "PY-2026-001", "2026-08-01"],
    ["Python Batch 2026", "Full Stack Python", "ravi.kumar@institution.edu", "Certificate", "6 months", "Evening batch for working graduates", "PY-2026-002", "2026-08-01"],
    ["", "Full Stack Python", "meera.shah@institution.edu", "", "", "", "OPEN-001", ""]
  ];
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, "Registrations");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

export function course_template_buffer() {
  const rows = [
    ["course_code", "course_name", "description", "type", "duration in hours", "level", "fee", "thumbnail url", "discount", "created by", "learning points", "key points", "course domain", "tag", "module", "lesson", "lesson material urls"],
    ["PY-FS-01", "Full Stack Python", "Python, web, and a small project.", "Core", 40, "Beginner", 0, "https://cdn.example.edu/courses/python.png", "", "SRKISI Faculty", "Write Python | Build a small API", "Career switchers | Final-year students", "Software", "New Launches", "Python basics", "Welcome", "https://cdn.example.edu/lessons/welcome"],
    ["PY-FS-01", "", "", "", "", "", "", "", "", "", "", "", "", "", "Python basics", "Variables", "https://cdn.example.edu/lessons/variables | https://cdn.example.edu/lessons/variables-notes"],
    ["DS-01", "Data Studio", "Charts and a short project.", "Elective", 24, "Intermediate", 15000, "https://cdn.example.edu/courses/data.png", 10, "SRKISI Faculty", "Read a dataset | Publish a chart", "Working analysts", "Data", "Trending", "", "", ""]
  ];
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, "Courses");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

export function attendance_template_buffer() {
  const rows = [
    ["course_name", "student email", "is present"],
    ["Full Stack Python", "asha.rao@institution.edu", 1],
    ["Full Stack Python", "ravi.kumar@institution.edu", 0]
  ];
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, "Attendance");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

export function student_template_buffer() {
  const rows = [
    ["First name", "Last name", "email", "MOBILE NO", "Password", "Gender", "Date of birth", "Blood group", "College", "Higher study", "Address", "Pincode", "State", "District"],
    ["Asha", "Rao", "asha.rao@institution.edu", "9000000001", "Welcome@123", "Female", "2004-05-12", "O+", "Government Degree College", "B.Sc", "12 Main Road", "530001", "Andhra Pradesh", "Visakhapatnam"],
    ["Ravi", "Kumar", "ravi.kumar@institution.edu", "9000000002", "", "", "", "", "", "", "", "", "", ""]
  ];
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(book, sheet, "Students");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

function run_script(script, with_import, extra_args = []) {
  return new Promise((resolve) => {
    const args = [script, ...extra_args];
    if (with_import) args.push("--import");
    const child = spawn(process.execPath, args, {
      cwd: repo_root,
      env: process.env,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), RUN_LIMIT_MS);
    child.stdout.on("data", (chunk) => {
      stdout = clip(stdout + chunk.toString("utf8"));
    });
    child.stderr.on("data", (chunk) => {
      stderr = clip(stderr + chunk.toString("utf8"));
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ exit_code: 1, log: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exit_code: code ?? 1,
        log: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
      });
    });
  });
}

async function save_workbook(file, dest) {
  if (!file?.buffer?.length) throw fail("Choose an Excel workbook.");
  const name = String(file.originalname || "").toLowerCase();
  if (!name.endsWith(".xlsx")) throw fail("Upload an .xlsx workbook.");
  if (file.buffer.subarray(0, 2).toString("utf8") !== "PK") {
    throw fail("That file is not an Excel workbook.");
  }
  await writeFile(dest, file.buffer);
}

async function check_workbook(file, dest, script, kind, extra_args = []) {
  await save_workbook(file, dest);
  const result = await run_script(script, false, extra_args);
  if (result.exit_code !== 0) {
    pending_by_kind[kind] = null;
    const error = fail(result.log || "The workbook does not fit this import.", 422);
    error.details = result.log;
    throw error;
  }
  const check_id = randomBytes(16).toString("hex");
  pending_by_kind[kind] = { check_id, extra_args };
  return { check_id, fitting: true, log: result.log };
}

async function import_workbook(check_id, script, kind) {
  const pending = pending_by_kind[kind];
  if (!pending || pending.check_id !== String(check_id || "")) {
    throw fail("Check the workbook again before importing.", 409);
  }
  const extra_args = pending.extra_args || [];
  pending_by_kind[kind] = null;
  const result = await run_script(script, true, extra_args);
  if (result.exit_code !== 0) {
    const error = fail(result.log || "Import stopped.", 422);
    error.details = result.log;
    throw error;
  }
  return { imported: true, log: result.log };
}

export async function check_attempt_workbook(file) {
  return check_workbook(file, attempt_workbook, attempt_script, "quiz_attempts");
}

export async function import_attempt_workbook(check_id) {
  return import_workbook(check_id, attempt_script, "quiz_attempts");
}

export async function check_quiz_workbook(file) {
  return check_workbook(file, quiz_workbook, quiz_script, "quizzes");
}

export async function import_quiz_workbook(check_id) {
  return import_workbook(check_id, quiz_script, "quizzes");
}

export async function check_registration_workbook(file, institution_name) {
  const name = String(institution_name || "").trim();
  if (!name) throw fail("Enter the institution name before the workbook.");
  if (name.length > 150) throw fail("Institution name must be 150 characters or less.");
  return check_workbook(
    file,
    registration_workbook,
    registration_script,
    "registrations",
    ["--cohort", name]
  );
}

export async function import_registration_workbook(check_id) {
  return import_workbook(check_id, registration_script, "registrations");
}

export async function check_course_workbook(file) {
  return check_workbook(file, course_workbook, course_script, "courses");
}

export async function import_course_workbook(check_id) {
  return import_workbook(check_id, course_script, "courses");
}

export async function check_attendance_workbook(file) {
  return check_workbook(file, attendance_workbook, attendance_script, "attendance");
}

export async function import_attendance_workbook(check_id) {
  return import_workbook(check_id, attendance_script, "attendance");
}

export async function check_student_workbook(file) {
  return check_workbook(file, student_workbook, student_script, "students");
}

export async function import_student_workbook(check_id) {
  return import_workbook(check_id, student_script, "students");
}
