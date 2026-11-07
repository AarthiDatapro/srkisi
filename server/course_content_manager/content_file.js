import { log } from "@datapromr/log";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_BUCKETS, upload_to_bucket } from "../utils/storage_buckets.js";

const LMS_NOTES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "lms_notes");
const NOTES_STORAGE_MISSING = "storage location not existing";

const ALLOWED = new Set([
"application/pdf",
"application/msword",
"application/vnd.openxmlformats_officedocument.wordprocessingml.document",
"application/vnd.ms_powerpoint",
"application/vnd.openxmlformats_officedocument.presentationml.presentation",
"image/jpeg",
"image/png",
"image/webp",
"video/mp4",
"video/webm",
"video/quicktime",
"application/zip",
"application/x_zip",
"application/x_zip_compressed",
"application/zip_compressed",
"application/x_compressed",
"multipart/x_zip",
"application/octet_stream"]
);

const SAFE_EXT = new Set([
".pdf",
".doc",
".docx",
".ppt",
".pptx",
".jpg",
".jpeg",
".png",
".webp",
".mp4",
".webm",
".mov",
".zip"]
);

function mime_of(file) {
  return String(file?.mimetype || "").
  split(";")[0].
  trim().
  toLowerCase();
}

function has_zip_magic(file) {
  const buf = file?.buffer;
  return Boolean(buf && buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b);
}

export function is_zip_upload(file) {
  const name = String(file?.originalname || file?.name || "").toLowerCase();
  const mime = mime_of(file);
  if (name.endsWith(".zip")) return true;
  if (mime.includes("zip") || mime.includes("compressed")) return true;
  return has_zip_magic(file);
}

function file_name_for(prefix, original_name) {
  const ext = original_name?.includes(".") ? path.extname(original_name).toLowerCase() : "";
  const safe_ext = SAFE_EXT.has(ext) ? ext : ".bin";
  return `${prefix}-${Date.now()}${safe_ext}`;
}

function file_error(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function save_notes_zip(lesson_id, file) {
  if (!file?.buffer) throw file_error("A file is required");
  if (!is_zip_upload(file)) throw file_error("Upload a ZIP of HTML files");

  try {
    const info = await fs.stat(LMS_NOTES_DIR);
    if (!info.isDirectory()) throw file_error(NOTES_STORAGE_MISSING);
  } catch (err) {
    if (err.status) throw err;
    throw file_error(NOTES_STORAGE_MISSING);
  }

  const filename = `${Number(lesson_id) || "lesson"}-${Date.now()}.zip`;
  const dest = path.join(LMS_NOTES_DIR, filename);
  await fs.writeFile(dest, file.buffer);
  log.pass("save_notes_zip", `saved ${filename} to lms_notes`);
  return {
    file_name: file.originalname || filename,
    file_path: `lms_notes/${filename}`,
    file_size_bytes: file.size || file.buffer.length
  };
}

export async function save_lesson_file(lesson_id, file) {
  if (!file?.buffer) {
    const error = new Error("A file is required");
    error.status = 400;
    throw error;
  }

  const mime = mime_of(file);
  const zip = is_zip_upload(file);
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!zip && !ALLOWED.has(mime) && !SAFE_EXT.has(ext)) {
    const error = new Error("Use a PDF, Word, PowerPoint, ZIP package, image, or video file");
    error.status = 400;
    throw error;
  }

  const filename = file_name_for(lesson_id, file.originalname);
  const file_path = await upload_to_bucket(
    STORAGE_BUCKETS.COURSE_CONTENT,
    filename,
    file.buffer,
    zip ? "application/zip" : mime || file.mimetype || "application/octet_stream"
  );
  log.pass("save_lesson_file", `uploaded ${filename} for lesson ${lesson_id}`);
  return {
    file_name: file.originalname || filename,
    file_path,
    file_size_bytes: file.size || file.buffer.length
  };
}
