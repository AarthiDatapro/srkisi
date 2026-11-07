import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "@datapromr/log";
import { isSupabaseConfigured, uploadPublicFile } from "@datapromr/supabase";

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../node_modules/@datapromr/supabase/package.json")
);
const { createClient } = require("@supabase/supabase-js");

/** Public Supabase Storage buckets used by LMS uploads. Create these in the Supabase project. */
export const STORAGE_BUCKETS = {
  STUDENTS: "students",
  PROGRAMS: "programs",
  COHORT: "cohort",
  EMPLOYEES: "employees",
  COURSES: "courses",
  COURSE_CONTENT: "course-content",
  DAILY_REPORTS: "daily-reports",
  CERTIFICATES: "certificate-templates"
};

export const STORAGE_BUCKET_LIST = Object.values(STORAGE_BUCKETS);

const NO_BUCKET = "Upload failed because no storage bucket is available";

export function storage_unavailable_error(bucket) {
  const name = String(bucket || "").trim();
  const error = new Error(name ? `${name} not existing` : NO_BUCKET);
  error.status = 503;
  return error;
}

export function require_storage_bucket(bucket) {
  if (!isSupabaseConfigured() || !STORAGE_BUCKET_LIST.includes(bucket)) {
    throw storage_unavailable_error();
  }
}

export async function upload_to_bucket(bucket, object_path, buffer, contentType) {
  require_storage_bucket(bucket);
  try {
    const url = await uploadPublicFile(bucket, object_path, buffer, contentType);
    log.pass("upload_to_bucket", `${bucket}/${object_path}`);
    return url;
  } catch (err) {
    const message = String(err.message || "").toLowerCase();
    if (
    message.includes("bucket") && (
    message.includes("not found") ||
    message.includes("not exist") ||
    message.includes("does not exist") ||
    message.includes("not configured")))
    {
      log.fail("upload_to_bucket", `${bucket} is not available`);
      throw storage_unavailable_error(bucket);
    }
    log.fail("upload_to_bucket", err.message);
    throw err;
  }
}

function storage_client() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function object_from_public_url(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const marker = "/storage/v1/object/public/";
  const index = parsed.pathname.indexOf(marker);
  if (index < 0) return null;
  const rest = decodeURIComponent(parsed.pathname.slice(index + marker.length));
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  const bucket = rest.slice(0, slash);
  const object_path = rest.slice(slash + 1);
  if (!STORAGE_BUCKET_LIST.includes(bucket) || !object_path) return null;
  return { bucket, object_path };
}

export async function delete_stored_file(url) {
  const target = object_from_public_url(url);
  if (!target || !isSupabaseConfigured()) return false;
  const { error } = await storage_client().storage.from(target.bucket).remove([target.object_path]);
  if (error) {
    const message = String(error.message || "");
    if (/not found|does not exist/i.test(message)) {
      log.info("delete_stored_file", `${target.bucket}/${target.object_path} already gone`);
      return true;
    }
    log.fail("delete_stored_file", message);
    const err = new Error("Unable to delete the image from storage");
    err.status = 502;
    throw err;
  }
  log.pass("delete_stored_file", `${target.bucket}/${target.object_path}`);
  return true;
}

export async function forget_stored_file(url) {
  try {
    await delete_stored_file(url);
  } catch (err) {
    log.fail("forget_stored_file", err.message);
  }
}
