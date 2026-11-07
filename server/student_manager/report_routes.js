import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { SCREEN, view_access } from "../utils/screen_access.js";
import {
  report_card,
  report_cards,
  report_programs,
  report_students,
  student_card,
  student_programs
} from "./report_controller.js";

const employee = requireRole("employee");
const student = requireRole("student");

export function mount_student_manager(app) {
  log.info("student_manager", "mounting student manager routes");
  app.get("/api/student/report_cards/programs", student, student_programs);
  app.get("/api/student/report_card", student, student_card);
  app.get("/api/student_manager/programs", employee, view_access[SCREEN.students], report_programs);
  app.get("/api/student_manager/students", employee, view_access[SCREEN.students], report_students);
  app.get("/api/student_manager/report_cards", employee, view_access[SCREEN.students], report_cards);
  app.get("/api/student_manager/report_cards/:studentId", employee, view_access[SCREEN.students], report_card);
}
