// Step 5. Public URLs. A student is not signed in yet, so these paths skip the login check.

import { log } from "@datapromr/log";
import { SECURITY } from "@datapromr/auth/server";
import { google_finish, google_start } from "./google_auth_controller.js";

const GOOGLE_PATHS = [
  "/api/auth/student/google/start",
  "/api/auth/student/google/finish"
];

export function mount_google_auth(app) {
  log.info("google_auth_routes", "mounting Google student auth");
  for (const path of GOOGLE_PATHS) {
    if (!SECURITY.PUBLIC_PATHS.includes(path)) {
      SECURITY.PUBLIC_PATHS.push(path);
    }
  }

  app.get("/api/auth/student/google/start", google_start);
  app.post("/api/auth/student/google/finish", google_finish);
}
