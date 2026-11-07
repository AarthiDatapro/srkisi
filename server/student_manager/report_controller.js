import { send_error } from "../utils/send_error.js";
import {
  list_report_programs,
  my_report_card,
  my_report_programs,
  program_report_cards,
  program_students,
  student_report_card
} from "./report_service.js";

function handle(work, message) {
  return async function report_handler(req, res) {
    try {
      return res.json(await work(req));
    } catch (err) {
      return send_error(res, err, message, "student_manager", req);
    }
  };
}

export const report_programs = handle((req) => list_report_programs(req.user || {}), "Unable to load programs");
export const report_students = handle((req) => program_students(req.query || {}, req.user || {}), "Unable to load students");
export const report_cards = handle((req) => program_report_cards(req.query || {}, req.user || {}), "Unable to build report cards");
export const report_card = handle((req) => student_report_card(req.params.studentId, req.query || {}, req.user || {}), "Unable to build the report card");
export const student_programs = handle((req) => my_report_programs(req.user), "Unable to load your programs");
export const student_card = handle((req) => my_report_card(req.user, req.query || {}), "Unable to build your report card");
