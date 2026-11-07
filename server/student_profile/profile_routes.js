import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import {
  profile_get,
  profile_ollama_fast_update,
  profile_ollama_key_status,
  profile_ollama_key_update,
  profile_photo_update,
  profile_photo_delete,
  profile_update
} from "./profile_controller.js";

const student = requireRole("student");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

export function mount_student_profile(app) {
  log.info("student_profile_routes", "mounting student profile routes");
  app.get("/api/student/profile", student, profile_get);
  app.put("/api/student/profile", student, profile_update);
  app.post("/api/student/profile/photo", student, upload.single("photo"), profile_photo_update);
  app.delete("/api/student/profile/photo", student, profile_photo_delete);
  app.get("/api/student/profile/ollama_api_key", student, profile_ollama_key_status);
  app.put("/api/student/profile/ollama_api_key", student, profile_ollama_key_update);
  app.put("/api/student/profile/ollama_fast", student, profile_ollama_fast_update);
}
