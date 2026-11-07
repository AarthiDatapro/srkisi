import { log } from "@datapromr/log";
import { SECURITY, requireRole } from "@datapromr/auth/server";
import {
  catalog_course_get,
  catalog_courses_get,
  catalog_get,
  my_courses_access,
  my_courses_get,
  registrations_create,
  wishlist_create,
  wishlist_delete } from
"./catalog_controller.js";
import {
  open_course_get,
  open_courses_get,
  public_courses_get,
  public_programs_get } from
"./public_catalog_controller.js";

const student = requireRole("student");

const PUBLIC_CATALOG_PATHS = [
  "/api/public/catalog/programs",
  "/api/public/catalog/courses",
  "/api/public/catalog/open_courses*"
];

export function mount_course_registration(app) {
  log.info("course_registration_routes", "mounting catalog routes");

  for (const path of PUBLIC_CATALOG_PATHS) {
    if (!SECURITY.PUBLIC_PATHS.includes(path)) {
      SECURITY.PUBLIC_PATHS.push(path);
    }
  }

  app.get("/api/public/catalog/programs", public_programs_get);
  app.get("/api/public/catalog/courses", public_courses_get);
  app.get("/api/public/catalog/open_courses", open_courses_get);
  app.get("/api/public/catalog/open_courses/:courseId", open_course_get);

  app.get("/api/student/catalog", student, catalog_get);
  app.get("/api/student/catalog/courses", student, catalog_courses_get);
  app.get("/api/student/catalog/courses/:courseId", student, catalog_course_get);
  app.get("/api/student/my_courses", student, my_courses_get);
  app.post("/api/student/my_courses/:courseId/access", student, my_courses_access);
  app.post("/api/student/registrations", student, registrations_create);
  app.post("/api/student/wishlist", student, wishlist_create);
  app.delete("/api/student/wishlist/:courseId", student, wishlist_delete);
}
