import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, view_access, SCREEN } from "../utils/screen_access.js";
import {
  certificates_create,
  certificates_delete,
  certificates_get,
  certificates_image,
  certificates_list,
  certificates_sources,
  certificates_preview,
  certificates_preview_draft,
  certificates_save
} from "./certificate_controller.js";

const employee = requireRole("employee");
const view = view_access[SCREEN.certificates];
const edit = edit_access[SCREEN.certificates];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, done) {
    done(null, ["image/jpeg", "image/png"].includes(file.mimetype));
  }
});

export function mount_certificate_manager(app) {
  log.info("certificate_manager", "mounting certificate manager routes");
  app.get("/api/certificate_manager/value_sources", employee, view, certificates_sources);
  app.get("/api/certificate_manager/certificates", employee, view, certificates_list);
  app.post("/api/certificate_manager/certificates", employee, edit, upload.single("file"), certificates_create);
  app.get("/api/certificate_manager/certificates/:certificate_id", employee, view, certificates_get);
  app.put("/api/certificate_manager/certificates/:certificate_id", employee, edit, certificates_save);
  app.post("/api/certificate_manager/certificates/:certificate_id/image", employee, edit, upload.single("file"), certificates_image);
  app.delete("/api/certificate_manager/certificates/:certificate_id", employee, edit, certificates_delete);
  app.post("/api/certificate_manager/certificates/:certificate_id/preview", employee, view, certificates_preview);
  app.post("/api/certificate_manager/preview", employee, view, upload.single("file"), certificates_preview_draft);
}
