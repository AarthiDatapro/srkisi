// Step 3. Turn a Google profile into a student row.
// Same email signs in. A new email gets a student record.
// Google does not send a mobile number, so that column is left empty.
// The password is a random hash so email login stays closed until they set one.

import { randomBytes } from "node:crypto";
import { hashPassword, sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../../utils/db_setup.js";
import { run_once } from "../../utils/run_once.js";
import {
  create_student_id,
  ensure_student_profile_schema } from
"../student_auth_service.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensure_google_student_columns() {
  await ensure_student_profile_schema();
  const pool = get_pool();
  try {
    await pool.query("ALTER TABLE tbl_students MODIFY mobile_number VARCHAR(20) NULL");
  } catch {

    // column may already allow empty values
  }
  try {
    await pool.query("ALTER TABLE tbl_students ADD COLUMN google_sub VARCHAR(255) NULL");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query("CREATE UNIQUE INDEX uq_students_google_sub ON tbl_students (google_sub)");
  } catch {

    // index may already exist
  }
}

function ensure_google_students() {
  return run_once("google_student_columns", ensure_google_student_columns);
}

function public_student(row, created) {
  return {
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    created: Boolean(created)
  };
}

async function find_student(pool, profile) {
  const [by_google] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email, google_sub, is_active, is_deleted
     FROM tbl_students
     WHERE google_sub = ?
     LIMIT 1`,
    [profile.google_sub]
  );
  if (by_google?.[0]) return by_google[0];

  const [by_email] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email, google_sub, is_active, is_deleted
     FROM tbl_students
     WHERE LOWER(TRIM(email)) = ?
     LIMIT 1`,
    [profile.email]
  );
  return by_email?.[0] || null;
}

async function link_google(pool, student, profile) {
  if (student.google_sub) return;
  await sqlQuery(
    pool,
    `UPDATE tbl_students SET google_sub = ? WHERE student_id = ? AND google_sub IS NULL`,
    [profile.google_sub, student.student_id]
  );
}

async function insert_google_student(pool, profile) {
  const password_hash = await hashPassword(randomBytes(32).toString("hex"));
  const last_name = profile.last_name || "Student";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const student_id = create_student_id(new Date(Date.now() + attempt * 1000));
    try {
      await sqlQuery(
        pool,
        `INSERT INTO tbl_students (
          student_id, first_name, last_name, email, mobile_number,
          password_hash, google_sub, terms_accepted, terms_accepted_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, TRUE, ?)`,
        [
          student_id,
          profile.first_name.slice(0, 100),
          last_name.slice(0, 100),
          profile.email,
          password_hash,
          profile.google_sub,
          new Date()
        ]
      );
      return {
        student_id,
        first_name: profile.first_name.slice(0, 100),
        last_name: last_name.slice(0, 100),
        email: profile.email
      };
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY" && String(err.message || "").includes("student_id") && attempt < 7) {
        continue;
      }
      throw err;
    }
  }

  throw fail("Unable to generate a unique student ID", 500);
}

async function use_existing(pool, student, profile) {
  if (student.is_deleted || !student.is_active) {
    throw fail("This account is not active", 403);
  }
  try {
    await link_google(pool, student, profile);
  } catch (err) {
    if (err.code !== "ER_DUP_ENTRY") throw err;
    const linked = await find_student(pool, profile);
    if (!linked || linked.is_deleted || !linked.is_active) {
      throw fail("This account is not active", 403);
    }
    return public_student(linked, false);
  }
  return public_student(student, false);
}

async function settle_google_student(profile, intent) {
  await ensure_google_students();
  const pool = get_pool();
  const existing = await find_student(pool, profile);

  if (existing) return use_existing(pool, existing, profile);

  if (intent !== "signup") {
    throw fail("Account not found", 404);
  }

  try {
    const created = await insert_google_student(pool, profile);
    return public_student(created, true);
  } catch (err) {
    if (err.code !== "ER_DUP_ENTRY") throw err;
    const again = await find_student(pool, profile);
    if (again) return use_existing(pool, again, profile);
    const message = String(err.message || "");
    if (message.includes("email")) throw fail("This email is already registered", 409);
    throw fail("Google sign-in did not finish. Try again.", 409);
  }
}

const in_flight = new Map();

export function find_or_create_google_student(profile, intent = "login") {
  const key = String(profile?.google_sub || "");
  if (!key) return Promise.reject(fail("Google did not share an account id.", 401));
  const running = in_flight.get(key);
  if (running) return running;
  const run = settle_google_student(profile, intent).finally(() => {
    if (in_flight.get(key) === run) in_flight.delete(key);
  });
  in_flight.set(key, run);
  return run;
}
