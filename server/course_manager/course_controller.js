import { send_error } from "../utils/send_error.js";
import { get_quiz_analytics } from "../course_content_manager/quiz_analytics_service.js";
import { get_course_attendance, save_course_attendance } from "./attendance_service.js";
import {
  assign_course_programs,
  create_course,
  delete_course,
  get_course,
  get_course_analytics,
  export_course_enrollments,
  list_courses,
  set_course_active,
  set_course_program_passkey,
  update_course,
  upload_course_thumbnail,
  delete_course_thumbnail } from
"./course_service.js";
import {
  generate_course_student_ids,
  import_course_students,
  list_course_students,
  remove_course_student,
  reset_course_student_password,
  update_course_student_id,
  update_course_student_profile } from
"./course_students_service.js";

function actor_id(req) {
  const id = Number(req.user?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function courses_list(req, res) {
  try {
    return res.json(await list_courses(req.query || {}, req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load courses", "courses", req);
  }
}

export async function courses_enrollment_export(req, res) {
  try {
    return res.json(await export_course_enrollments(req.user, req.query?.course_id));
  } catch (err) {
    return send_error(res, err, "Unable to export enrollments", "courses", req);
  }
}

export async function courses_get(req, res) {
  try {
    return res.json(await get_course(Number(req.params.id), req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load course", "courses", req);
  }
}

export async function courses_create(req, res) {
  try {
    const course = await create_course(req.body || {});
    return res.status(201).json(course);
  } catch (err) {
    return send_error(res, err, "Unable to create course", "courses", req);
  }
}

export async function courses_update(req, res) {
  try {
    return res.json(await update_course(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to update course", "courses", req);
  }
}

export async function courses_activate(req, res) {
  try {
    return res.json(await set_course_active(Number(req.params.id), true));
  } catch (err) {
    return send_error(res, err, "Unable to activate course", "courses", req);
  }
}

export async function courses_deactivate(req, res) {
  try {
    return res.json(await set_course_active(Number(req.params.id), false));
  } catch (err) {
    return send_error(res, err, "Unable to deactivate course", "courses", req);
  }
}

export async function courses_thumbnail(req, res) {
  try {
    return res.json(await upload_course_thumbnail(Number(req.params.id), req.file));
  } catch (err) {
    return send_error(res, err, "Unable to upload course thumbnail", "courses", req);
  }
}

export async function courses_thumbnail_delete(req, res) {
  try {
    return res.json(await delete_course_thumbnail(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete course image", "courses", req);
  }
}

export async function courses_delete(req, res) {
  try {
    return res.json(await delete_course(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete course", "courses", req);
  }
}

export async function courses_assign(req, res) {
  try {
    return res.json(await assign_course_programs(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to assign programs", "courses", req);
  }
}

export async function courses_program_passkey(req, res) {
  try {
    return res.json(await set_course_program_passkey(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to save program passkey", "courses", req);
  }
}

export async function courses_analytics(req, res) {
  try {
    const stats = await get_course_analytics(Number(req.params.id), req.query || {});
    const quiz_analytics = await get_quiz_analytics(Number(req.params.id), req.query || {});
    return res.json({ ...stats, quiz_analytics });
  } catch (err) {
    return send_error(res, err, "Unable to load course analytics", "courses", req);
  }
}

export async function courses_students(req, res) {
  try {
    return res.json(await list_course_students(Number(req.params.id), req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load course students", "courses", req);
  }
}

export async function courses_remove_student(req, res) {
  try {
    return res.json(await remove_course_student(Number(req.params.id), req.params.studentId, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to remove student from course", "courses", req);
  }
}

export async function courses_import_students(req, res) {
  try {
    return res.json(await import_course_students(Number(req.params.id), req.body || {}, req.file));
  } catch (err) {
    return send_error(res, err, "Unable to import students", "courses", req);
  }
}

export async function courses_generate_student_ids(req, res) {
  try {
    return res.json(await generate_course_student_ids(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to generate course IDs", "courses", req);
  }
}

export async function courses_update_student_profile(req, res) {
  try {
    return res.json(await update_course_student_profile(
      Number(req.params.id),
      req.params.studentId,
      req.body || {},
      req.query || {}
    ));
  } catch (err) {
    return send_error(res, err, "Unable to update student", "courses", req);
  }
}

export async function courses_reset_student_password(req, res) {
  try {
    return res.json(await reset_course_student_password(
      Number(req.params.id),
      req.params.studentId,
      { ...(req.query || {}), ...(req.body || {}) }
    ));
  } catch (err) {
    return send_error(res, err, "Unable to reset password", "courses", req);
  }
}

export async function courses_update_student_id(req, res) {
  try {
    return res.json(
      await update_course_student_id(
        Number(req.params.id),
        req.params.studentId,
        req.body?.course_student_id,
        { program_id: req.body?.program_id || req.query?.program_id }
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to update course ID", "courses", req);
  }
}

export async function courses_attendance_get(req, res) {
  try {
    return res.json(await get_course_attendance(Number(req.params.id), req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load attendance", "courses", req);
  }
}

export async function courses_attendance_save(req, res) {
  try {
    return res.json(await save_course_attendance(Number(req.params.id), req.body || {}, actor_id(req)));
  } catch (err) {
    return send_error(res, err, "Unable to save attendance", "courses", req);
  }
}
