import {
  list_feedback_questions,
  reset_course_feedback_questions,
  save_course_feedback_questions
} from "../course_learning/feedback_questions_service.js";
import { send_error } from "../utils/send_error.js";
import { get_course_content } from "./content_service.js";
import {
  create_lesson,
  create_module,
  delete_lesson,
  delete_module,
  update_lesson,
  update_module } from
"./lesson_service.js";
import {
  create_lesson_item,
  delete_lesson_item,
  update_lesson_item,
  list_lesson_feedback,
  reorder_course_content } from
"./item_service.js";
import { delete_quiz, generate_quiz, get_employee_quiz, update_quiz } from "./quiz_service.js";
import { delete_coding_set, generate_coding_set } from "./coding_service.js";
import { get_quiz_sheet } from "./quiz_analytics_service.js";
import {
  add_daily_report_photos,
  create_daily_report,
  delete_daily_report,
  get_daily_report,
  get_daily_report_pdf,
  list_daily_reports,
  update_daily_report,
  upload_daily_report_pdf } from
"./daily_report_service.js";

export async function content_get(req, res) {
  try {
    return res.json(await get_course_content(Number(req.params.courseId), { user: req.user }));
  } catch (err) {
    return send_error(res, err, "Unable to load course content", "course_content", req);
  }
}

export async function content_reorder(req, res) {
  try {
    return res.json(await reorder_course_content(Number(req.params.courseId), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to reorder course content", "course_content", req);
  }
}

export async function modules_create(req, res) {
  try {
    return res.status(201).json(await create_module(Number(req.params.courseId), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create module", "course_content", req);
  }
}

export async function modules_update(req, res) {
  try {
    return res.json(
      await update_module(Number(req.params.courseId), Number(req.params.moduleId), req.body || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to update module", "course_content", req);
  }
}

export async function modules_delete(req, res) {
  try {
    return res.json(await delete_module(Number(req.params.courseId), Number(req.params.moduleId)));
  } catch (err) {
    return send_error(res, err, "Unable to delete module", "course_content", req);
  }
}

export async function lessons_create(req, res) {
  try {
    return res.status(201).json(await create_lesson(Number(req.params.courseId), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create lesson", "course_content", req);
  }
}

export async function lessons_update(req, res) {
  try {
    return res.json(
      await update_lesson(Number(req.params.courseId), Number(req.params.lessonId), req.body || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to update lesson", "course_content", req);
  }
}

export async function lessons_delete(req, res) {
  try {
    return res.json(await delete_lesson(Number(req.params.courseId), Number(req.params.lessonId)));
  } catch (err) {
    return send_error(res, err, "Unable to delete lesson", "course_content", req);
  }
}

export async function items_create(req, res) {
  try {
    const body = { ...(req.body || {}) };
    return res.status(201).json(
      await create_lesson_item(
        Number(req.params.courseId),
        Number(req.params.lessonId),
        body,
        req.file || null
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to add lesson content", "course_content", req);
  }
}

export async function items_update(req, res) {
  try {
    return res.json(
      await update_lesson_item(
        Number(req.params.courseId),
        Number(req.params.lessonId),
        Number(req.params.itemId),
        req.body || {}
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to update lesson content", "course_content", req);
  }
}

export async function items_delete(req, res) {
  try {
    return res.json(
      await delete_lesson_item(
        Number(req.params.courseId),
        Number(req.params.lessonId),
        Number(req.params.itemId)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to remove lesson content", "course_content", req);
  }
}

export async function lesson_feedback_list(req, res) {
  try {
    return res.json(
      await list_lesson_feedback(Number(req.params.courseId), Number(req.params.lessonId), req.query || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to load lesson feedback", "course_content", req);
  }
}

export async function feedback_questions_get(req, res) {
  try {
    return res.json(await list_feedback_questions(Number(req.params.courseId)));
  } catch (err) {
    return send_error(res, err, "Unable to load feedback questions", "course_content", req);
  }
}

export async function feedback_questions_save(req, res) {
  try {
    return res.json(await save_course_feedback_questions(Number(req.params.courseId), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to save feedback questions", "course_content", req);
  }
}

export async function feedback_questions_reset(req, res) {
  try {
    return res.json(await reset_course_feedback_questions(Number(req.params.courseId)));
  } catch (err) {
    return send_error(res, err, "Unable to reset feedback questions", "course_content", req);
  }
}

function actor_id(req) {
  const id = Number(req.user?.sub);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function daily_reports_list(req, res) {
  try {
    return res.json(await list_daily_reports(Number(req.params.courseId)));
  } catch (err) {
    return send_error(res, err, "Unable to load daily reports", "course_content", req);
  }
}

export async function daily_reports_get(req, res) {
  try {
    return res.json(
      await get_daily_report(Number(req.params.courseId), Number(req.params.reportId))
    );
  } catch (err) {
    return send_error(res, err, "Unable to load daily report", "course_content", req);
  }
}

export async function daily_reports_create(req, res) {
  try {
    return res.status(201).json(
      await create_daily_report(Number(req.params.courseId), req.body || {}, actor_id(req))
    );
  } catch (err) {
    return send_error(res, err, "Unable to save daily report", "course_content", req);
  }
}

export async function daily_reports_update(req, res) {
  try {
    return res.json(
      await update_daily_report(
        Number(req.params.courseId),
        Number(req.params.reportId),
        req.body || {},
        actor_id(req)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to update daily report", "course_content", req);
  }
}

export async function daily_reports_delete(req, res) {
  try {
    return res.json(
      await delete_daily_report(Number(req.params.courseId), Number(req.params.reportId))
    );
  } catch (err) {
    return send_error(res, err, "Unable to delete daily report", "course_content", req);
  }
}

export async function daily_reports_photos(req, res) {
  try {
    return res.json(
      await add_daily_report_photos(
        Number(req.params.courseId),
        Number(req.params.reportId),
        req.files || []
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to add report photos", "course_content", req);
  }
}

export async function daily_reports_upload(req, res) {
  try {
    return res.status(201).json(
      await upload_daily_report_pdf(
        Number(req.params.courseId),
        req.file,
        req.body?.report_date,
        actor_id(req)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to upload daily report", "course_content", req);
  }
}

export async function daily_reports_pdf(req, res) {
  try {
    const file = await get_daily_report_pdf(Number(req.params.courseId), Number(req.params.reportId));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return res.send(Buffer.from(file.bytes));
  } catch (err) {
    return send_error(res, err, "Unable to create daily report PDF", "course_content", req);
  }
}

export async function coding_create(req, res) {
  try {
    return res.status(201).json(await generate_coding_set(Number(req.params.courseId), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create coding exercises", "course_content", req);
  }
}

export async function coding_delete(req, res) {
  try {
    return res.json(await delete_coding_set(Number(req.params.courseId), Number(req.params.codingSetId)));
  } catch (err) {
    return send_error(res, err, "Unable to delete coding exercises", "course_content", req);
  }
}

export async function quizzes_create(req, res) {
  try {
    return res.status(201).json(await generate_quiz(Number(req.params.courseId), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create quiz", "course_content", req);
  }
}

export async function quizzes_sheet(req, res) {
  try {
    return res.json(
      await get_quiz_sheet(Number(req.params.courseId), Number(req.params.quizId), req.query || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to load quiz analytics", "course_content", req);
  }
}

export async function quizzes_get(req, res) {
  try {
    return res.json(
      await get_employee_quiz(Number(req.params.courseId), Number(req.params.quizId))
    );
  } catch (err) {
    return send_error(res, err, "Unable to load quiz", "course_content", req);
  }
}

export async function quizzes_update(req, res) {
  try {
    return res.json(
      await update_quiz(Number(req.params.courseId), Number(req.params.quizId), req.body || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to update quiz", "course_content", req);
  }
}

export async function quizzes_delete(req, res) {
  try {
    return res.json(await delete_quiz(Number(req.params.courseId), Number(req.params.quizId)));
  } catch (err) {
    return send_error(res, err, "Unable to delete quiz", "course_content", req);
  }
}
