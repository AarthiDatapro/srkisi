import { send_error } from "../utils/send_error.js";
import {
  delete_student_fresher_attempt,
  get_student_fresher_quiz,
  save_student_fresher_progress,
  start_student_fresher_quiz,
  submit_student_fresher_quiz
} from "../jobs_manager/fresher_quiz_service.js";
import { student_code } from "../utils/student_code.js";
import {
  answer_mock_interview,
  current_mock_interview,
  delete_mock_interview,
  download_mock_interview_certificate,
  finish_mock_interview,
  get_mock_interview,
  list_mock_interviews,
  list_open_jobs,
  mock_interview_profile_photo,
  reattempt_mock_interview,
  resume_mock_interview,
  retry_mock_interview,
  save_mock_interview_profile_photo,
  start_mock_interview
} from "./interview_service.js";

export async function open_jobs_list(req, res) {
  try {
    return res.json({ items: await list_open_jobs() });
  } catch (err) {
    return send_error(res, err, "Unable to load jobs", "student_mock_interview", req);
  }
}

export async function student_fresher_quiz_get(req, res) {
  try {
    return res.json(await get_student_fresher_quiz(req.params.jobId, student_code(req.user)));
  } catch (err) {
    return send_error(res, err, "Unable to load the fresher quiz", "student_mock_interview", req);
  }
}

export async function student_fresher_quiz_start(req, res) {
  try {
    return res.status(201).json(
      await start_student_fresher_quiz(student_code(req.user), req.params.jobId, req.body || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to start the fresher quiz", "student_mock_interview", req);
  }
}

export async function student_fresher_quiz_save(req, res) {
  try {
    return res.json(await save_student_fresher_progress(student_code(req.user), req.params.jobId, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to save the fresher quiz", "student_mock_interview", req);
  }
}

export async function student_fresher_quiz_submit(req, res) {
  try {
    return res.json(await submit_student_fresher_quiz(student_code(req.user), req.params.jobId, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to submit the fresher quiz", "student_mock_interview", req);
  }
}

export async function student_fresher_attempt_delete(req, res) {
  try {
    return res.json(await delete_student_fresher_attempt(student_code(req.user), req.params.attemptId));
  } catch (err) {
    return send_error(res, err, "Unable to delete the fresher quiz", "student_mock_interview", req);
  }
}

export async function mock_interview_photo_status(req, res) {
  try {
    return res.json(await mock_interview_profile_photo(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to check your profile photo", "student_mock_interview", req);
  }
}

export async function mock_interview_photo_save(req, res) {
  try {
    return res.json(await save_mock_interview_profile_photo(req.user, req.file));
  } catch (err) {
    return send_error(res, err, "Unable to save your profile photo", "student_mock_interview", req);
  }
}

export async function mock_interview_current(req, res) {
  try {
    return res.json({ item: await current_mock_interview(req.user) });
  } catch (err) {
    return send_error(res, err, "Unable to load the interview", "student_mock_interview", req);
  }
}

export async function mock_interview_list(req, res) {
  try {
    return res.json(await list_mock_interviews(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load mock interviews", "student_mock_interview", req);
  }
}

export async function mock_interview_get(req, res) {
  try {
    return res.json(await get_mock_interview(req.user, req.params.mockInterviewId));
  } catch (err) {
    return send_error(res, err, "Unable to load the interview", "student_mock_interview", req);
  }
}

export async function mock_interview_resume(req, res) {
  try {
    return res.json({
      item: await resume_mock_interview(req.user, req.params.mockInterviewId)
    });
  } catch (err) {
    return send_error(res, err, "Unable to resume the interview", "student_mock_interview", req);
  }
}

export async function mock_interview_reattempt(req, res) {
  try {
    return res.json(await reattempt_mock_interview(req.user, req.params.mockInterviewId, req.body || {}, req.file));
  } catch (err) {
    return send_error(res, err, "Unable to reattempt this answer", "student_mock_interview", req);
  }
}

export async function mock_interview_delete(req, res) {
  try {
    return res.json(await delete_mock_interview(req.user, req.params.mockInterviewId));
  } catch (err) {
    return send_error(res, err, "Unable to delete the interview", "student_mock_interview", req);
  }
}

export async function mock_interview_retry(req, res) {
  try {
    return res.status(201).json({
      item: await retry_mock_interview(req.user, req.params.mockInterviewId, req.body || {})
    });
  } catch (err) {
    return send_error(res, err, "Unable to start the interview again", "student_mock_interview", req);
  }
}

export async function mock_interview_start(req, res) {
  try {
    return res.status(201).json({
      item: await start_mock_interview(req.user, req.file, req.body || {})
    });
  } catch (err) {
    return send_error(res, err, "Unable to start the mock interview", "student_mock_interview", req);
  }
}

export async function mock_interview_answer(req, res) {
  try {
    return res.json({
      item: await answer_mock_interview(req.user, req.params.mockInterviewId, req.body || {}, req.file)
    });
  } catch (err) {
    return send_error(res, err, "Unable to submit this answer", "student_mock_interview", req);
  }
}

export async function mock_interview_finish(req, res) {
  try {
    return res.json({
      item: await finish_mock_interview(req.user, req.params.mockInterviewId)
    });
  } catch (err) {
    return send_error(res, err, "Unable to finish the interview", "student_mock_interview", req);
  }
}

export async function mock_interview_certificate(req, res) {
  try {
    const file = await download_mock_interview_certificate(req.user, req.params.mockInterviewId);
    res.setHeader("Content-Type", file.content_type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.file_name}"`);
    return res.send(file.buffer);
  } catch (err) {
    return send_error(res, err, "Unable to download this certificate", "student_mock_interview", req);
  }
}
