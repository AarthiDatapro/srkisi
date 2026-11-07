import { log } from "@datapromr/log";
import path from "node:path";
import { STORAGE_BUCKETS, upload_to_bucket } from "../utils/storage_buckets.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function file_name_for(course_id, original_name) {
  const ext = original_name?.includes(".") ? path.extname(original_name).toLowerCase() : ".jpg";
  const safe_ext = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  return `${course_id}-${Date.now()}${safe_ext}`;
}

export async function save_course_image(course_id, file) {
  if (!file?.buffer) {
    const error = new Error("Image is required");
    error.status = 400;
    throw error;
  }

  if (!ALLOWED.has(file.mimetype)) {
    const error = new Error("Use a JPG, PNG, WEBP, or GIF image");
    error.status = 400;
    throw error;
  }

  const url = await upload_to_bucket(
    STORAGE_BUCKETS.COURSES,
    file_name_for(course_id, file.originalname),
    file.buffer,
    file.mimetype
  );
  log.pass("save_course_image", `uploaded image for ${course_id}`);
  return url;
}
