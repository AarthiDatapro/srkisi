import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { SCREEN, edit_access } from "../utils/screen_access.js";
import { showcase_public_get, showcase_share_post } from "./showcase_controller.js";

const employee = requireRole("employee");

export function mount_hackathon_showcase(app) {
  log.info("hackathon_showcase", "mounting showcase routes");
  app.post("/api/hackathon_showcase/share", employee, edit_access[SCREEN.hackathon_analytics], showcase_share_post);
  app.get("/api/public/hackathon_showcase/:token", showcase_public_get);
}
