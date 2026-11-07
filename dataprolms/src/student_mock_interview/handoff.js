let handoff = null;

export function set_resume_handoff(next) {
  handoff = next && next.file ? { file: next.file, target_role: next.target_role || "" } : null;
}

export function set_course_handoff(next) {
  handoff = next?.course_context ? { course_context: next.course_context } : null;
}

export function set_job_handoff(next) {
  const job_id = Number(next?.job_id);
  handoff = Number.isInteger(job_id) && job_id > 0 ? {
    job_id,
    job_title: next.job_title || "",
    company_name: next.company_name || ""
  } : null;
}

export function set_open_interview_handoff(mock_interview_id, extra = {}) {
  const id = Number(mock_interview_id);
  const reattempt_question = Number(extra.reattempt_question);
  if (!Number.isInteger(id) || id < 1) {
    handoff = null;
    return;
  }
  handoff = {
    resume_interview_id: id,
    ...(Number.isInteger(reattempt_question) && reattempt_question > 0 ? { reattempt_question } : {})
  };
}

export function set_fresh_interview_handoff() {
  handoff = { start_fresh: true };
}

export function set_fresher_quiz_handoff(next) {
  const job_id = Number(next?.job_id);
  handoff = Number.isInteger(job_id) && job_id > 0 ? {
    fresher_quiz: true,
    job_id,
    job_title: next.job_title || "",
    company_name: next.company_name || ""
  } : null;
}

export function take_resume_handoff() {
  const current = handoff;
  handoff = null;
  return current;
}

export function restore_handoff(previous) {
  if (previous && handoff == null) handoff = previous;
}
