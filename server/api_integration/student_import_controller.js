import { send_error } from "../utils/send_error.js";
import {
  attendance_template_buffer,
  attempt_template_buffer,
  check_attempt_workbook,
  check_attendance_workbook,
  check_course_workbook,
  check_quiz_workbook,
  check_registration_workbook,
  check_student_workbook,
  course_template_buffer,
  import_attempt_workbook,
  import_attendance_workbook,
  import_course_workbook,
  import_quiz_workbook,
  import_registration_workbook,
  import_student_workbook,
  quiz_template_buffer,
  registration_template_buffer,
  student_template_buffer } from
"./student_import_service.js";

export function attempt_template(req, res) {
  try {
    const body = attempt_template_buffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"quiz_attempts_sample.xlsx\"");
    return res.send(body);
  } catch (err) {
    return send_error(res, err, "Unable to build the quiz attempt template", "api_integration", req);
  }
}

export function quiz_template(req, res) {
  try {
    const body = quiz_template_buffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"quizzes_sample.xlsx\"");
    return res.send(body);
  } catch (err) {
    return send_error(res, err, "Unable to build the quiz template", "api_integration", req);
  }
}

export function registration_template(req, res) {
  try {
    const body = registration_template_buffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"registrations_sample.xlsx\"");
    return res.send(body);
  } catch (err) {
    return send_error(res, err, "Unable to build the registration template", "api_integration", req);
  }
}

export function course_template(req, res) {
  try {
    const body = course_template_buffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"courses_sample.xlsx\"");
    return res.send(body);
  } catch (err) {
    return send_error(res, err, "Unable to build the course template", "api_integration", req);
  }
}

export function attendance_template(req, res) {
  try {
    const body = attendance_template_buffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"attendance_sample.xlsx\"");
    return res.send(body);
  } catch (err) {
    return send_error(res, err, "Unable to build the attendance template", "api_integration", req);
  }
}

export function student_template(req, res) {
  try {
    const body = student_template_buffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"students_import_template.xlsx\"");
    return res.send(body);
  } catch (err) {
    return send_error(res, err, "Unable to build the template", "api_integration", req);
  }
}

export async function attempt_import_check(req, res) {
  try {
    return res.json(await check_attempt_workbook(req.file));
  } catch (err) {
    return send_error(res, err, "Unable to check the workbook", "api_integration", req);
  }
}

export async function attempt_import_run(req, res) {
  try {
    return res.json(await import_attempt_workbook(req.body?.check_id));
  } catch (err) {
    return send_error(res, err, "Unable to import quiz attempts", "api_integration", req);
  }
}

export async function quiz_import_check(req, res) {
  try {
    return res.json(await check_quiz_workbook(req.file));
  } catch (err) {
    return send_error(res, err, "Unable to check the workbook", "api_integration", req);
  }
}

export async function quiz_import_run(req, res) {
  try {
    return res.json(await import_quiz_workbook(req.body?.check_id));
  } catch (err) {
    return send_error(res, err, "Unable to import quizzes", "api_integration", req);
  }
}

export async function registration_import_check(req, res) {
  try {
    return res.json(await check_registration_workbook(req.file, req.body?.institution_name));
  } catch (err) {
    return send_error(res, err, "Unable to check the workbook", "api_integration", req);
  }
}

export async function registration_import_run(req, res) {
  try {
    return res.json(await import_registration_workbook(req.body?.check_id));
  } catch (err) {
    return send_error(res, err, "Unable to import registrations", "api_integration", req);
  }
}

export async function course_import_check(req, res) {
  try {
    return res.json(await check_course_workbook(req.file));
  } catch (err) {
    return send_error(res, err, "Unable to check the workbook", "api_integration", req);
  }
}

export async function course_import_run(req, res) {
  try {
    return res.json(await import_course_workbook(req.body?.check_id));
  } catch (err) {
    return send_error(res, err, "Unable to import courses", "api_integration", req);
  }
}

export async function attendance_import_check(req, res) {
  try {
    return res.json(await check_attendance_workbook(req.file));
  } catch (err) {
    return send_error(res, err, "Unable to check the workbook", "api_integration", req);
  }
}

export async function attendance_import_run(req, res) {
  try {
    return res.json(await import_attendance_workbook(req.body?.check_id));
  } catch (err) {
    return send_error(res, err, "Unable to import attendance", "api_integration", req);
  }
}

export async function student_import_check(req, res) {
  try {
    return res.json(await check_student_workbook(req.file));
  } catch (err) {
    return send_error(res, err, "Unable to check the workbook", "api_integration", req);
  }
}

export async function student_import_run(req, res) {
  try {
    return res.json(await import_student_workbook(req.body?.check_id));
  } catch (err) {
    return send_error(res, err, "Unable to import students", "api_integration", req);
  }
}
