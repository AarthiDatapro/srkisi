import path from "node:path";
import { log } from "@datapromr/log";
import { STORAGE_BUCKETS, upload_to_bucket } from "../utils/storage_buckets.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function file_name_for(cohort_id, original_name, kind) {
  const ext = original_name?.includes(".") ? path.extname(original_name).toLowerCase() : ".jpg";
  const safe_ext = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  const folder = kind === "profile" ? "profile" : "banner";
  return `${folder}/${cohort_id}-${Date.now()}${safe_ext}`;
}

export async function save_cohort_image(cohort_id, file, kind = "banner") {
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
    STORAGE_BUCKETS.COHORT,
    file_name_for(cohort_id, file.originalname, kind),
    file.buffer,
    file.mimetype
  );
  log.pass("save_cohort_image", `uploaded image for cohort ${cohort_id}`);
  return url;
}
