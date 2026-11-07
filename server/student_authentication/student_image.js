import { log } from "@datapromr/log";
import path from "node:path";
import { STORAGE_BUCKETS, upload_to_bucket } from "../utils/storage_buckets.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function save_student_photo(student_id, file) {
  if (!file?.buffer) return "";
  if (!ALLOWED.has(file.mimetype)) {
    const error = new Error("Use a JPG, PNG, WEBP, or GIF image");
    error.status = 400;
    throw error;
  }
  const ext = file.originalname?.includes(".") ? path.extname(file.originalname).toLowerCase() : ".jpg";
  const safe_ext = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  const filename = `${student_id}-${Date.now()}${safe_ext}`;
  const url = await upload_to_bucket(STORAGE_BUCKETS.STUDENTS, filename, file.buffer, file.mimetype);
  log.pass("save_student_photo", `uploaded photo for ${student_id}`);
  return url;
}
