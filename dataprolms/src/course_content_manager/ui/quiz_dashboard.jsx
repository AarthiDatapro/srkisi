import { EmptyState } from "@datapromr/empty-state";
import { Select } from "@datapromr/select";
import { useToast } from "@datapromr/toast";
import { useEffect, useMemo, useState } from "react";
import { list_course_students } from "../../course_manager/api.js";
import { get_quiz_analytics } from "../api.js";
import { content_paths, id_by_name, slug_by_id, use_slug_mirror } from "../../url_slugs.js";
import { Quiz_Analytics_Sheet } from "./quiz_analytics_sheet.jsx";
import { Report_Sheet_Preview } from "./report_sheet_preview.jsx";
import { save_workbook } from "../../design_system/excel_workbook.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

const BUCKETS = [
  { id: "0_20", label: "0–20%" },
  { id: "21_40", label: "21–40%" },
  { id: "41_60", label: "41–60%" },
  { id: "61_80", label: "61–80%" },
  { id: "81_100", label: "81–100%" }
];

const COMPLETION = [
  { id: "completed", get label() { return ENGLISH.completed; }, color: "#16a34a" },
  { id: "in_progress", get label() { return ENGLISH.in_progress; }, color: "#3b82f6" },
  { id: "not_started", get label() { return ENGLISH.not_started; }, color: "#f59e0b" }
];

const QUIZ_PAGE_SIZE = 10;

const EMPTY_FILTERS = {
  program_id: "",
  cohort_id: "",
  quiz_id: "",
  day: "",
  bucket: "",
  completion: "",
  student_id: "",
  date_from: "",
  date_to: ""
};

function bucket_of(percent) {
  const value = Number(percent) || 0;
  if (value <= 20) return "0_20";
  if (value <= 40) return "21_40";
  if (value <= 60) return "41_60";
  if (value <= 80) return "61_80";
  return "81_100";
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function average(rows, key = "percent") {
  if (!rows.length) return 0;
  const total = rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  return round1(total / rows.length);
}

function today_iso() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function shift_day(day, delta) {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  date.setDate(date.getDate() + delta);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const next = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${next}`;
}

function format_day(day) {
  if (!day) return "—";
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function short_day(day) {
  if (!day) return "";
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function score_tone(percent, attempts) {
  if (!attempts) return "is_empty";
  if (percent >= 90) return "is_high";
  if (percent >= 75) return "is_mid";
  if (percent >= 60) return "is_fair";
  return "is_low";
}

function module_label(quiz) {
  if (!quiz.module_title && !quiz.module_no) return "—";
  if (!quiz.module_no) return quiz.module_title;
  return quiz.module_title ? ENGLISH.module_2(quiz.module_no, quiz.module_title) : ENGLISH.module_5(quiz.module_no);
}

function status_label(percent, attempts) {
  if (!attempts) return { get label() { return ENGLISH.no_data; }, tone: "empty" };
  if (percent >= 80) return { get label() { return ENGLISH.good; }, tone: "good" };
  if (percent >= 60) return { get label() { return ENGLISH.average; }, tone: "average" };
  return { get label() { return ENGLISH.needs_attention; }, tone: "low" };
}

function classify(rows) {
  if (!rows.length) return "not_started";
  const submitted = rows.some((row) => (row.status || "submitted") === "submitted");
  if (submitted) return "completed";
  return "in_progress";
}

function score_cell(percent) {
  return `${(Math.round(Number(percent) * 100) / 100).toFixed(2)}%`;
}

function by_module(direction) {
  const sign = direction === "desc" ? -1 : 1;
  return (left, right) => {
    const module_delta = (Number(left.module_no) || 0) - (Number(right.module_no) || 0);
    if (module_delta) return module_delta * sign;
    return ((Number(left.index) || 0) - (Number(right.index) || 0)) * sign;
  };
}

async function registration_ids(course_id, program_id) {
  if (!course_id) return new Map();
  const roster = await list_course_students(course_id, program_id || "");
  const codes = new Map();
  for (const row of roster?.items || []) {
    const code = String(row.course_student_id || "").trim();
    if (!code) continue;
    codes.set(String(row.student_id), code);
  }
  return codes;
}

function course_code_of(student, codes) {
  return codes.get(String(student.student_id)) || student.course_student_id || "";
}

async function build_report(data, filters, quiz_rows, course_id, program_id) {
  const codes = await registration_ids(course_id, filters.program_id || program_id);
  const view = visual(data || {}, filters, "");
  const course_order = new Map((data?.quizzes || []).map((quiz, index) => [String(quiz.quiz_id), index]));
  const with_index = (quiz) => ({ ...quiz, index: course_order.get(String(quiz.quiz_id)) ?? 0 });
  const quizzes = (data?.quizzes || []).
    map(with_index).
    filter((quiz) => !filters.quiz_id || same_id(quiz.quiz_id, filters.quiz_id)).
    sort(by_module("asc"));
  const latest = new Map();
  for (const attempt of view.rows) {
    latest.set(`${attempt.student_id}:${attempt.quiz_id}`, attempt);
  }
  const students = [...view.people].sort((left, right) =>
    String(left.name || "").localeCompare(String(right.name || "")) ||
    String(left.student_id).localeCompare(String(right.student_id))
  );
  const kind_label = { get daily() { return ENGLISH.daily; }, module: ENGLISH.module };
  const daily_quizzes = quizzes.filter((quiz) => quiz.kind !== "module");
  const module_quizzes = quizzes.filter((quiz) => quiz.kind === "module");
  const hackathon_list = data?.hackathons?.list || [];
  const hackathon_score = new Map((data?.hackathons?.scores || []).map((row) => [`${row.student_id}:${row.hackathon_id}`, row.percent]));
  const mean = (values) => {
    const list = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
    return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
  };
  const cell = (value) => (value == null ? "" : score_cell(value));
  const scores_for = (student, list) => list
    .map((quiz) => latest.get(`${student.student_id}:${quiz.quiz_id}`))
    .filter(Boolean)
    .map((attempt) => Number(attempt.percent));

  const summary_headers = [
    ENGLISH.student_id, ENGLISH.course_id, ENGLISH.student_name, ENGLISH.program,
    ENGLISH.avg_daily_quiz_score, ENGLISH.daily_quizzes_attempted,
    ENGLISH.avg_module_quiz_score, ENGLISH.module_quizzes_attempted,
    ENGLISH.avg_hackathon_score, ENGLISH.hackathons_scored,
    ENGLISH.overall_average_score
  ];
  const summary_rows = students.map((student) => {
    const daily = scores_for(student, daily_quizzes);
    const module_scores = scores_for(student, module_quizzes);
    const hackathon = hackathon_list
      .map((item) => hackathon_score.get(`${student.student_id}:${item.hackathon_id}`))
      .filter((value) => value != null);
    const daily_avg = mean(daily);
    const module_avg = mean(module_scores);
    const hackathon_avg = mean(hackathon);
    return [
      student.student_id,
      course_code_of(student, codes),
      student.name || "",
      student.program_name || "",
      cell(daily_avg),
      `${daily.length}/${daily_quizzes.length}`,
      cell(module_avg),
      `${module_scores.length}/${module_quizzes.length}`,
      cell(hackathon_avg),
      `${hackathon.length}/${hackathon_list.length}`,
      cell(mean([daily_avg, module_avg, hackathon_avg]))
    ];
  });

  const detail_headers = [
    ENGLISH.student_id, ENGLISH.course_id, ENGLISH.student_name,
    ...quizzes.map((quiz) => `${kind_label[quiz.kind] || ENGLISH.daily} · ${quiz.quiz_title || ENGLISH.quiz}`),
    ...hackathon_list.map((item) => ENGLISH.hackathon(item.title))
  ];
  const detail_rows = students.map((student) => [
    student.student_id,
    course_code_of(student, codes),
    student.name || "",
    ...quizzes.map((quiz) => {
      const attempt = latest.get(`${student.student_id}:${quiz.quiz_id}`);
      return attempt ? score_cell(attempt.percent) : "";
    }),
    ...hackathon_list.map((item) => cell(hackathon_score.get(`${student.student_id}:${item.hackathon_id}`)))
  ]);

  const overall_headers = [ENGLISH.quiz, ENGLISH.type, ENGLISH.module, ENGLISH.date, ENGLISH.attempts, ENGLISH.students, ENGLISH.average_score];
  const kind_of = new Map(quizzes.map((quiz) => [String(quiz.quiz_id), quiz.kind]));
  const overall_rows = [...(quiz_rows || [])].map(with_index).sort(by_module("desc")).map((quiz) => [
    quiz.quiz_title || "",
    kind_label[kind_of.get(String(quiz.quiz_id)) || quiz.kind] || ENGLISH.daily,
    module_label(quiz) === "—" ? "" : module_label(quiz),
    quiz.day || "",
    quiz.attempts,
    quiz.students,
    quiz.attempts ? quiz.average : ""
  ]);
  return {
    file_name: `quiz_report_${today_iso()}.xls`,
    sheets: [
      { id: "summary", get label() { return ENGLISH.summary; }, widths: [130, 100, 180, 180, 130, 130, 140, 140, 130, 120, 140], headers: summary_headers, rows: summary_rows },
      { id: "detail", get label() { return ENGLISH.detail; }, widths: [130, 100, 180, ...quizzes.map(() => 150), ...hackathon_list.map(() => 170)], headers: detail_headers, rows: detail_rows },
      { id: "quizzes", get label() { return ENGLISH.quizzes; }, widths: [220, 80, 220, 120, 90, 90, 120], headers: overall_headers, rows: overall_rows }
    ]
  };
}

function roster_of(data) {
  const map = new Map((data.students || []).map((student) => [student.student_id, student]));
  for (const attempt of data.attempts || []) {
    if (map.has(attempt.student_id)) continue;
    map.set(attempt.student_id, {
      student_id: attempt.student_id,
      course_student_id: attempt.course_student_id || "",
      name: attempt.student_name || ENGLISH.student,
      program_id: attempt.program_id,
      program_name: attempt.program_name || "",
      cohort_id: attempt.cohort_id,
      cohort_name: attempt.cohort_name || ""
    });
  }
  return [...map.values()];
}

function same_id(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function attempt_matches(attempt, filters, skip, status_by_student) {
  if (skip !== "program" && filters.program_id && !same_id(attempt.program_id, filters.program_id)) return false;
  if (skip !== "batch" && filters.cohort_id && !same_id(attempt.cohort_id, filters.cohort_id)) return false;
  if (skip !== "quiz" && filters.quiz_id && !same_id(attempt.quiz_id, filters.quiz_id)) return false;
  if (skip !== "day" && filters.day && attempt.day !== filters.day) return false;
  if (skip !== "bucket" && filters.bucket && bucket_of(attempt.percent) !== filters.bucket) return false;
  if (skip !== "student" && filters.student_id && attempt.student_id !== filters.student_id) return false;
  if (filters.date_from && attempt.day && attempt.day < filters.date_from) return false;
  if (filters.date_to && attempt.day && attempt.day > filters.date_to) return false;
  if (skip !== "completion" && filters.completion) {
    if (status_by_student.get(attempt.student_id) !== filters.completion) return false;
  }
  return true;
}

function student_matches(student, filters, skip) {
  if (skip !== "program" && filters.program_id && !same_id(student.program_id, filters.program_id)) return false;
  if (skip !== "batch" && filters.cohort_id && !same_id(student.cohort_id, filters.cohort_id)) return false;
  if (skip !== "student" && filters.student_id && student.student_id !== filters.student_id) return false;
  return true;
}

function people_for(data, filters, skip, status_rows) {
  const grouped = new Map();
  for (const attempt of status_rows) {
    const list = grouped.get(attempt.student_id) || [];
    list.push(attempt);
    grouped.set(attempt.student_id, list);
  }
  const narrow = Boolean(
    (skip !== "bucket" && filters.bucket) || (skip !== "day" && filters.day)
  );
  const people = [];
  for (const student of roster_of(data)) {
    if (!student_matches(student, filters, skip)) continue;
    const mine = grouped.get(student.student_id) || [];
    if (!mine.length && narrow) continue;
    people.push({
      ...student,
      completion: classify(mine),
      average: average(mine),
      attempt_count: mine.length
    });
  }
  return people;
}

function status_map(people) {
  return new Map(people.map((person) => [person.student_id, person.completion]));
}

function visual(data, filters, skip) {
  const open = { ...filters, completion: "" };
  if (skip === "program") open.program_id = "";
  if (skip === "batch") open.cohort_id = "";
  if (skip === "quiz") open.quiz_id = "";
  if (skip === "day") open.day = "";
  if (skip === "bucket") open.bucket = "";
  if (skip === "student") open.student_id = "";

  const status_rows = (data.attempts || []).filter((attempt) =>
    attempt_matches(attempt, open, "completion", new Map())
  );
  const everyone = people_for(data, open, "completion", status_rows);
  const statuses = status_map(everyone);
  const rows = (data.attempts || []).filter((attempt) => attempt_matches(attempt, filters, skip, statuses));
  const people = skip === "completion" ?
    everyone :
    everyone.filter((person) => !filters.completion || person.completion === filters.completion);
  return { rows, people, everyone };
}

function quiz_rows_for(data, rows) {
  return (data.quizzes || []).map((quiz) => {
    const mine = rows.filter((attempt) => same_id(attempt.quiz_id, quiz.quiz_id));
    const passed = mine.filter((attempt) => attempt.passed).length;
    const latest = mine.reduce((best, attempt) => attempt.day > best ? attempt.day : best, "");
    const avg = average(mine);
    return {
      ...quiz,
      attempts: mine.length,
      students: new Set(mine.map((attempt) => attempt.student_id)).size,
      average: avg,
      pass_rate: mine.length ? round1(passed / mine.length * 100) : 0,
      day: latest || quiz.created_day || "",
      status: status_label(avg, mine.length)
    };
  });
}

function trend_points(rows) {
  const grouped = new Map();
  for (const attempt of rows) {
    if (!attempt.day) continue;
    const list = grouped.get(attempt.day) || [];
    list.push(attempt);
    grouped.set(attempt.day, list);
  }
  return [...grouped.entries()]
    .sort((left, right) => left[0] < right[0] ? -1 : 1)
    .map(([day, list]) => ({
      day,
      average: average(list),
      pass_rate: list.length ? round1(list.filter((attempt) => attempt.passed).length / list.length * 100) : 0
    }));
}

function distribution_points(rows) {
  return BUCKETS.map((bucket) => ({
    ...bucket,
    count: rows.filter((attempt) => bucket_of(attempt.percent) === bucket.id).length
  }));
}

function ranked_people(people, direction) {
  const scored = people.filter((person) => person.attempt_count > 0);
  const source = scored.length ? scored : people;
  const sorted = [...source].sort((left, right) => {
    const delta = (left.average || 0) - (right.average || 0);
    if (delta) return direction === "top" ? -delta : delta;
    return left.name.localeCompare(right.name);
  });
  return sorted.slice(0, 10).map((person, index) => ({ ...person, rank: index + 1 }));
}

function metric_pack(rows, people) {
  const passed = rows.filter((attempt) => attempt.passed).length;
  return {
    quizzes: new Set(rows.map((attempt) => attempt.quiz_id)).size,
    participants: people.length,
    average: average(rows),
    pass_rate: rows.length ? round1(passed / rows.length * 100) : 0
  };
}

function delta_between(current, previous) {
  if (!previous && !current) return { text: "0%", up: true };
  if (!previous) return { get text() { return ENGLISH.label_new; }, up: true };
  const pct = Math.round((current - previous) / Math.abs(previous) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

function comparison_filters(filters) {
  if (filters.day) {
    const previous = shift_day(filters.day, -1);
    return {
      current: { ...filters, date_from: filters.day, date_to: filters.day, day: "" },
      previous: { ...filters, date_from: previous, date_to: previous, day: "" },
      label: ENGLISH.vs_previous_day
    };
  }
  if (filters.date_from && filters.date_to && filters.date_from <= filters.date_to) {
    const from = new Date(`${filters.date_from}T00:00:00`);
    const to = new Date(`${filters.date_to}T00:00:00`);
    const days = Math.round((to - from) / 86400000) + 1;
    const prev_to = shift_day(filters.date_from, -1);
    const prev_from = shift_day(prev_to, -(days - 1));
    return {
      current: { ...filters, day: "" },
      previous: { ...filters, date_from: prev_from, date_to: prev_to, day: "" },
      label: ENGLISH.vs_prior_period
    };
  }
  const to = today_iso();
  const from = shift_day(to, -29);
  const prev_to = shift_day(from, -1);
  const prev_from = shift_day(prev_to, -29);
  return {
    current: { ...filters, date_from: from, date_to: to, day: "" },
    previous: { ...filters, date_from: prev_from, date_to: prev_to, day: "" },
    label: ENGLISH.vs_prior_30_days
  };
}

function build_dashboard(data, filters) {
  const trend = visual(data, filters, "day");
  const buckets = visual(data, filters, "bucket");
  const quiz_view = visual(data, filters, "quiz");
  const current = visual(data, filters, "");
  const completion_view = visual(data, filters, "completion");
  const performers = visual(data, filters, "student");

  const quizzes = quiz_rows_for(data, quiz_view.rows);
  const best = [...quizzes].filter((quiz) => quiz.attempts).sort((left, right) => right.average - left.average)[0] || null;
  const compare = comparison_filters(filters);
  const current_window = visual(data, compare.current, "");
  const previous_window = visual(data, compare.previous, "");
  const now = metric_pack(current_window.rows, current_window.people);
  const then = metric_pack(previous_window.rows, previous_window.people);
  const headline = metric_pack(current.rows, current.people);

  return {
    headline,
    deltas: {
      quizzes: delta_between(now.quizzes, then.quizzes),
      participants: delta_between(now.participants, then.participants),
      average: delta_between(now.average, then.average),
      pass_rate: delta_between(now.pass_rate, then.pass_rate),
      label: compare.label
    },
    best,
    trend: trend_points(trend.rows),
    distribution: distribution_points(buckets.rows),
    completion: COMPLETION.map((item) => ({
      ...item,
      count: completion_view.everyone.filter((person) => person.completion === item.id).length
    })),
    quizzes,
    top: ranked_people(performers.people, "top"),
    bottom: ranked_people(performers.people, "bottom")
  };
}

function mark_class(selected, id) {
  if (!selected) return undefined;
  return same_id(selected, id) ? "is_on" : "is_dim";
}

function on_key(event, action) {
  if (event.key === ENGLISH.enter || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function Trend_Chart({ points, selected, on_pick }) {
  const y_at = (value) => 100 - Math.max(0, Math.min(100, value));
  const x_at = (index) => points.length <= 1 ? 50 : index / (points.length - 1) * 100;
  const label_step = Math.max(1, Math.ceil(points.length / 5));
  const show_label = (index) => {
    if (index === 0 || index === points.length - 1) return true;
    if (index % label_step !== 0) return false;
    return points.length - 1 - index >= label_step;
  };

  if (!points.length) {
    return <p className="ccm_qdash_empty">{ENGLISH.no_attempts_in_this_view}</p>;
  }

  const line = points.map((point, index) =>
    `${index ? "L" : "M"}${x_at(index)},${y_at(point.average)}`
  ).join(" ");
  const area = `${line} L${x_at(points.length - 1)},100 L${x_at(0)},100 Z`;

  return (
    <div className="ccm_qdash_stage">
      <div className="ccm_qdash_frame">
        <div className="ccm_qdash_yticks" aria-hidden="true">
          {[100, 75, 50, 25, 0].map((tick) => <span key={tick}>{tick}%</span>)}
        </div>
        <div className="ccm_qdash_canvas">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ccm_qdash_svg is_trend" role="group" aria-label={ENGLISH.performance_trend}>
            <defs>
              <linearGradient id="ccm_trend_fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b6fd8" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#3b6fd8" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((tick) =>
              <line key={tick} className="ccm_qdash_grid" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={tick} y2={tick} />
            )}
            <path d={area} fill="url(#ccm_trend_fill)" stroke="none" />
            <path d={line} className="ccm_qdash_line is_score" vectorEffect="non-scaling-stroke" />
          </svg>
          {points.map((point, index) =>
            <button
              key={point.day}
              type="button"
              className={`ccm_qdash_mark ${mark_class(selected, point.day) || ""}`}
              style={{ left: `${x_at(index)}%`, top: `${y_at(point.average)}%` }}
              aria-label={ENGLISH.average_2(format_day(point.day), point.average)}
              aria-pressed={selected === point.day}
              onClick={() => on_pick(point.day)} />
          )}
        </div>
      </div>
      <div className="ccm_qdash_xrow">
        <span />
        <div className="ccm_qdash_xtrack">
          {points.map((point, index) => show_label(index) ?
            <span
              key={point.day}
              className={index === 0 ? "is_start" : index === points.length - 1 ? "is_end" : ""}
              style={{ left: `${x_at(index)}%` }}>
              {short_day(point.day)}
            </span> :
            null
          )}
        </div>
      </div>
    </div>
  );
}

function Score_Bars({ points, selected, on_pick }) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const mid = Math.round(max / 2);

  return (
    <div className="ccm_qdash_stage">
      <div className="ccm_qdash_frame">
        <div className="ccm_qdash_yticks" aria-hidden="true">
          <span>{max}</span>
          <span>{mid}</span>
          <span>0</span>
        </div>
        <div className="ccm_qdash_canvas is_bars" role="group" aria-label={ENGLISH.score_distribution}>
          <div className="ccm_qdash_bartrack">
            {points.map((point) => {
              const pct = point.count ? Math.max(8, point.count / max * 100) : 0;
              return (
                <button
                  key={point.id}
                  type="button"
                  className={`ccm_qdash_col ${mark_class(selected, point.id) || ""}`}
                  style={{ height: point.count ? `${pct}%` : "8px" }}
                  aria-label={ENGLISH.attempts_2(point.label, point.count)}
                  aria-pressed={selected === point.id}
                  onClick={() => on_pick(point.id)}>
                  {point.count ? <b>{point.count}</b> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ccm_qdash_xrow">
        <span />
        <div className="ccm_qdash_buckets">
          {points.map((point) => <span key={point.id}>{point.label}</span>)}
        </div>
      </div>
    </div>
  );
}

function Status_Donut({ slices, selected, on_pick }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const drawn = slices.filter((slice) => slice.count > 0).length;
  const gap = drawn > 1 ? 12 : 0;
  let offset = 0;
  return (
    <div className="ccm_qdash_donut">
      <div className="ccm_qdash_ring">
      <svg viewBox="0 0 200 200" className="ccm_qdash_svg" role="group" aria-label={ENGLISH.completion_status}>
        <circle cx="100" cy="100" r={radius} className="ccm_qdash_donut_track" />
        {total ? slices.filter((slice) => slice.count > 0).map((slice) => {
          const length = Math.max(slice.count / total * circ - gap, 0);
          const dash = `${length} ${circ - length}`;
          const node = (
            <circle
              key={slice.id}
              cx="100"
              cy="100"
              r={radius}
              className={`ccm_qdash_donut_arc ${mark_class(selected, slice.id) || ""}`}
              stroke={slice.color}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              role="button"
              tabIndex={0}
              aria-label={`${slice.label}, ${slice.count}`}
              aria-pressed={selected === slice.id}
              onClick={() => on_pick(slice.id)}
              onKeyDown={(event) => on_key(event, () => on_pick(slice.id))} />
          );
          offset += slice.count / total * circ;
          return node;
        }) : null}
      </svg>
      <div className="ccm_qdash_ring_copy">
        <strong>{total.toLocaleString("en-US")}</strong>
        <span>{ENGLISH.students}</span>
      </div>
      </div>
      <ul>
        {slices.map((slice) => {
          const pct = total ? Math.round(slice.count / total * 100) : 0;
          return (
            <li key={slice.id}>
              <button
                type="button"
                className={`is_${slice.id}${selected === slice.id ? " is_on" : ""}`}
                aria-pressed={selected === slice.id}
                onClick={() => on_pick(slice.id)}>
                <i style={{ background: slice.color }} />
                <span>{slice.label}</span>
                <em>{slice.count}{ENGLISH.students_2}</em>
                <strong>{pct}%</strong>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function order_quizzes(quizzes, direction) {
  return [...quizzes].sort((left, right) => {
    const left_scored = left.attempts ? 0 : 1;
    const right_scored = right.attempts ? 0 : 1;
    if (left_scored !== right_scored) return left_scored - right_scored;
    const delta = direction === "asc" ? left.average - right.average : right.average - left.average;
    if (delta) return delta;
    return String(left.quiz_title).localeCompare(String(right.quiz_title));
  });
}

function Quiz_Board({
  title,
  rows,
  page,
  on_page,
  sort,
  on_sort,
  selected_id,
  on_pick,
  on_open
}) {
  const page_count = Math.max(1, Math.ceil(rows.length / QUIZ_PAGE_SIZE));
  const page_safe = Math.min(page, page_count - 1);
  const start = page_safe * QUIZ_PAGE_SIZE;
  const slice = rows.slice(start, start + QUIZ_PAGE_SIZE);
  return (
    <article className="ccm_qdash_card ccm_qdash_board is_quiz">
      <header className="ccm_qdash_pager is_sort">
        <button
          type="button"
          title={ENGLISH.previous_quizzes}
          aria-label={ENGLISH.previous_quizzes}
          disabled={page_safe === 0}
          onClick={() => on_page(Math.max(0, page_safe - 1))}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
        <div>
          <h4>{title}</h4>
          <span>{page_safe + 1} / {page_count}</span>
        </div>
        <button
          type="button"
          className="ccm_qdash_sort"
          title={sort === ENGLISH.desc ? ENGLISH.show_lowest_scores_first : ENGLISH.show_highest_scores_first}
          aria-label={sort === ENGLISH.desc ? ENGLISH.show_lowest_scores_first : ENGLISH.show_highest_scores_first}
          onClick={on_sort}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {sort === "desc" ?
              <path d="M8 6v12M8 18l-3-3M8 18l3-3M14 18V6M14 6l-3 3M14 6l3 3" /> :
              <path d="M8 18V6M8 6l-3 3M8 6l3 3M14 6v12M14 18l-3-3M14 18l3-3" />}
          </svg>
        </button>
        <button
          type="button"
          title={ENGLISH.next_quizzes}
          aria-label={ENGLISH.next_quizzes}
          disabled={page_safe >= page_count - 1}
          onClick={() => on_page(Math.min(page_count - 1, page_safe + 1))}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m10 6 6 6-6 6" />
          </svg>
        </button>
      </header>
      {slice.length ?
        <div className="ccm_qdash_table_wrap">
          <table className="ccm_qdash_table">
            <thead>
              <tr>
                <th>#</th>
                <th>{ENGLISH.quiz_name}</th>
                <th>{ENGLISH.module}</th>
                <th>{ENGLISH.date}</th>
                <th>{ENGLISH.avg_score}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((quiz, index) =>
                <tr
                  key={quiz.quiz_id}
                  className={same_id(selected_id, quiz.quiz_id) ? "is_on" : undefined}
                  onClick={() => on_pick(quiz.quiz_id)}>
                  <td><span className="ccm_qdash_rank">{start + index + 1}</span></td>
                  <td>{quiz.quiz_title}</td>
                  <td>{module_label(quiz)}</td>
                  <td>{format_day(quiz.day)}</td>
                  <td>
                    <span className={`ccm_qdash_score ${score_tone(quiz.average, quiz.attempts)}`}>
                      {quiz.attempts ? `${quiz.average}%` : "—"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ccm_qdash_eye"
                      aria-label={ENGLISH.open_submission_sheet_for(quiz.quiz_title)}
                      onClick={(event) => {
                        event.stopPropagation();
                        on_open(quiz.quiz_id);
                      }}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div> :
        <p className="ccm_qdash_empty">{ENGLISH.no_quizzes_in_this_view}</p>}
    </article>
  );
}

function People_Table({ title, tone, rows, selected, on_pick }) {
  return (
    <article className={`ccm_qdash_card ccm_qdash_board is_${tone}`}>
      <header className="ccm_qdash_card_head">
        <h4>{title}</h4>
      </header>
      {rows.length ?
        <div className="ccm_qdash_table_wrap">
          <table className="ccm_qdash_table">
            <thead>
              <tr>
                <th>#</th>
                <th>{ENGLISH.name}</th>
                <th>{ENGLISH.batch}</th>
                <th>{ENGLISH.score}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) =>
                <tr
                  key={person.student_id}
                  className={selected === person.student_id ? "is_on" : undefined}
                  onClick={() => on_pick(person.student_id)}>
                  <td>
                    <span className="ccm_qdash_rank">{person.rank}</span>
                  </td>
                  <td>{person.name}</td>
                  <td>{person.cohort_name || "—"}</td>
                  <td>
                    <span className="ccm_qdash_score">{person.attempt_count ? `${person.average}%` : "—"}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div> :
        <p className="ccm_qdash_empty">{ENGLISH.no_students_in_this_view}</p>}
    </article>
  );
}

export function Quiz_Dashboard({
  course_id,
  data,
  program_id = "",
  locked = false,
  compact = false,
  enrollment = ""
}) {
  const toast = useToast();
  const [filters, set_filters] = useState(() => ({
    ...EMPTY_FILTERS,
    program_id: program_id ? String(program_id) : ""
  }));
  const [open_quiz_id, set_open_quiz_id] = useState(null);
  const [sheet, set_sheet] = useState(null);
  const [sheet_loading, set_sheet_loading] = useState(false);
  const [quiz_page, set_quiz_page] = useState(0);
  const [quiz_sort, set_quiz_sort] = useState("desc");
  const [shut_chart, set_shut_chart] = useState("");
  const [report, set_report] = useState(null);
  const [report_busy, set_report_busy] = useState(false);

  useEffect(() => {
    set_filters((prev) => ({
      ...prev,
      program_id: program_id ? String(program_id) : ""
    }));
  }, [program_id]);

  const quiz_people = roster_of(data || {}).map((item) => ({
    ...item,
    label: item.name || item.student_name || ""
  }));
  const quiz_cohorts = quiz_people.filter((item, index, list) =>
    item.cohort_id && list.findIndex((row) => String(row.cohort_id) === String(item.cohort_id)) === index
  );

  use_slug_mirror(
    data ? content_paths(course_id) : "/__wait",
    {
      quiz: slug_by_id(data?.quizzes, filters.quiz_id, "quiz_id", "quiz_title"),
      cohort: slug_by_id(quiz_cohorts, filters.cohort_id, "cohort_id", "cohort_name"),
      day: filters.day,
      bucket: filters.bucket,
      completion: filters.completion,
      student: slug_by_id(quiz_people, filters.student_id, "student_id", "label"),
      from: filters.date_from,
      to: filters.date_to
    },
    {
      quiz: "",
      cohort: "",
      day: "",
      bucket: "",
      completion: "",
      student: "",
      from: "",
      to: ""
    },
    (from_url) => {
      set_filters((prev) => ({
        ...prev,
        quiz_id: id_by_name(data?.quizzes, from_url.quiz, "quiz_id", "quiz_title"),
        cohort_id: id_by_name(quiz_cohorts, from_url.cohort, "cohort_id", "cohort_name"),
        day: from_url.day || "",
        bucket: from_url.bucket || "",
        completion: from_url.completion || "",
        student_id: id_by_name(quiz_people, from_url.student, "student_id", "label"),
        date_from: from_url.from || "",
        date_to: from_url.to || ""
      }));
    }
  );

  useEffect(() => {
    set_quiz_page(0);
  }, [filters]);

  useEffect(() => {
    if (!course_id || !open_quiz_id) {
      set_sheet(null);
      return undefined;
    }
    let alive = true;
    set_sheet_loading(true);
    const scope = filters.program_id || program_id;
    get_quiz_analytics(course_id, open_quiz_id, scope, enrollment).
      then((payload) => {
        if (alive) set_sheet(payload);
      }).
      catch((err) => {
        if (alive) {
          set_sheet(null);
          toast.error(err.message);
        }
      }).
      finally(() => {
        if (alive) set_sheet_loading(false);
      });
    return () => {
      alive = false;
    };
  }, [course_id, open_quiz_id, filters.program_id, program_id, enrollment, toast]);

  const view = useMemo(() => build_dashboard(data || {}, filters), [data, filters]);
  const quiz_options = useMemo(
    () => (data?.quizzes || []).map((quiz) => ({
      value: String(quiz.quiz_id),
      label: quiz.quiz_title
    })),
    [data]
  );

  function toggle(key, value) {
    if (locked && key === "program_id") return;
    set_filters((prev) => ({
      ...prev,
      [key]: same_id(prev[key], value) ? "" : String(value)
    }));
  }

  function fold_chart(id) {
    set_shut_chart((current) => {
      if (current === id) return "";
      if (current) return current;
      return id;
    });
  }

  function set_field(key, value) {
    if (locked && key === "program_id") return;
    set_filters((prev) => ({ ...prev, [key]: String(value || "") }));
  }

  if (open_quiz_id) {
    return (
      <Quiz_Analytics_Sheet
        data={sheet}
        loading={sheet_loading}
        compact={compact}
        on_back={() => {
          set_open_quiz_id(null);
          set_sheet(null);
        }} />
    );
  }

  const quizzes = data?.quizzes || [];
  if (!quizzes.length) {
    return (
      <section className="ccm_qdash">
        <header className="ccm_qdash_head">
          <div>
            <p>{ENGLISH.assessment_lab}</p>
            <h3>{ENGLISH.quiz_analytics}</h3>
          </div>
        </header>
        <EmptyState>{ENGLISH.no_quizzes_in_this_course_yet}</EmptyState>
      </section>
    );
  }

  const plot_on = Boolean(
    filters.day || filters.bucket || filters.completion || filters.student_id || filters.quiz_id
  );
  const ranked_quizzes = order_quizzes(view.quizzes, quiz_sort);
  const quiz_rows = plot_on ? ranked_quizzes.filter((quiz) => quiz.attempts > 0) : ranked_quizzes;

  return (
    <section className="ccm_qdash">
      <header className="ccm_qdash_head">
        <div>
          <p>{ENGLISH.assessment_lab}</p>
          <h3>{ENGLISH.quiz_analytics}</h3>
          <span>{ENGLISH.click_a_point_bar_slice_or_row_the}</span>
        </div>
        <div className="ccm_qdash_filters">
          <label>{ENGLISH.from}<input
              type="date"
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={(event) => set_field("date_from", event.target.value)} />
          </label>
          <label>{ENGLISH.to}<input
              type="date"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={(event) => set_field("date_to", event.target.value)} />
          </label>
          <Select
            name="dash_quiz"
            value={filters.quiz_id}
            placeholder={ENGLISH.all_quizzes}
            options={quiz_options}
            onChange={(event) => set_field("quiz_id", event.target.value)} />
          <button
            type="button"
            className="ccm_qdash_icon is_export"
            title={ENGLISH.preview_and_export_report}
            aria-label={ENGLISH.preview_and_export_report}
            disabled={report_busy}
            onClick={() => {
              set_report_busy(true);
              build_report(data, filters, quiz_rows, course_id, program_id).then(set_report).catch((err) => {
                toast.error(err.message || ENGLISH.unable_to_build_the_report);
              }).finally(() => set_report_busy(false));
            }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v10" />
              <path d="m8 10 4 4 4-4" />
              <path d="M5 18h14" />
            </svg>
          </button>
          <button
            type="button"
            className="ccm_qdash_icon is_clear"
            title={ENGLISH.clear_filters}
            aria-label={ENGLISH.clear_filters}
            onClick={() => set_filters({
              ...EMPTY_FILTERS,
              program_id: locked && program_id ? String(program_id) : ""
            })}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M9 7V5h6v2" />
              <path d="m7 7 1 12h8l1-12" />
              <path d="M10 11v5M14 11v5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="ccm_qdash_kpis">
        <article className="ccm_qdash_kpi">
          <i className="is_navy" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></svg>
          </i>
          <div>
            <span>{ENGLISH.total_quizzes}</span>
            <strong>{view.headline.quizzes}</strong>
            <em className={view.deltas.quizzes.up ? "is_up" : "is_down"}>
              {view.deltas.quizzes.text} {view.deltas.label}
            </em>
          </div>
        </article>
        <article className="ccm_qdash_kpi">
          <i className="is_sky" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="2.4" /><circle cx="16" cy="10" r="2" /><path d="M4.5 18.5c.6-2.4 2.4-3.7 4.5-3.7s3.9 1.3 4.5 3.7M14 14.8c1.6 0 3 .9 3.6 2.7" /></svg>
          </i>
          <div>
            <span>{ENGLISH.total_participants}</span>
            <strong>{view.headline.participants.toLocaleString("en-US")}</strong>
            <em className={view.deltas.participants.up ? "is_up" : "is_down"}>
              {view.deltas.participants.text} {view.deltas.label}
            </em>
          </div>
        </article>
        <article className="ccm_qdash_kpi">
          <i className="is_mint" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 16.5 9 11l3.2 3.2L20 7" /><path d="M14 7h6v6" /></svg>
          </i>
          <div>
            <span>{ENGLISH.average_score}</span>
            <strong>{view.headline.average}%</strong>
            <em className={view.deltas.average.up ? "is_up" : "is_down"}>
              {view.deltas.average.text} {view.deltas.label}
            </em>
          </div>
        </article>
        <article className="ccm_qdash_kpi">
          <i className="is_gold" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="m8.5 12.2 2.3 2.3 4.7-5" /></svg>
          </i>
          <div>
            <span>{ENGLISH.pass_rate}</span>
            <strong>{view.headline.pass_rate}%</strong>
            <em className={view.deltas.pass_rate.up ? "is_up" : "is_down"}>
              {view.deltas.pass_rate.text} {view.deltas.label}
            </em>
          </div>
        </article>
        <article className="ccm_qdash_kpi">
          <i className="is_rose" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m12 3.5 2.1 4.6 5 .6-3.7 3.4.9 4.9L12 14.8 7.7 17l.9-4.9L4.9 8.7l5-.6L12 3.5Z" /></svg>
          </i>
          <div>
            {view.best ?
              <button type="button" className="ccm_qdash_best" onClick={() => toggle("quiz_id", view.best.quiz_id)}>
                <span>{ENGLISH.highest_performing_quiz}</span>
                <strong>{view.best.quiz_title}</strong>
                <em>{view.best.average}{ENGLISH.avg_score_2}</em>
              </button> :
              <>
                <span>{ENGLISH.highest_performing_quiz}</span>
                <strong>—</strong>
                <em>{ENGLISH.no_scored_attempts}</em>
              </>}
          </div>
        </article>
      </div>

      <div className="ccm_qdash_charts">
        <article className={`ccm_qdash_card${shut_chart === "trend" ? " is_shut" : ""}`}>
          <header className="ccm_qdash_card_head">
            <h4>{ENGLISH.performance_trend}</h4>
            {shut_chart === "trend" ? null :
              <ul className="ccm_qdash_legend">
                <li><i className="is_score" />{ENGLISH.average_score_2}</li>
              </ul>}
            <button
              type="button"
              className="ccm_qdash_fold"
              aria-expanded={shut_chart !== "trend"}
              aria-label={shut_chart === ENGLISH.trend ? ENGLISH.open_performance_trend : ENGLISH.collapse_performance_trend}
              disabled={Boolean(shut_chart) && shut_chart !== "trend"}
              onClick={() => fold_chart("trend")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 14 6-6 6 6" />
              </svg>
            </button>
          </header>
          {shut_chart === "trend" ? null :
            <Trend_Chart points={view.trend} selected={filters.day} on_pick={(day) => toggle("day", day)} />}
        </article>
        <article className={`ccm_qdash_card${shut_chart === "score" ? " is_shut" : ""}`}>
          <header className="ccm_qdash_card_head">
            <h4>{ENGLISH.score_distribution}</h4>
            <button
              type="button"
              className="ccm_qdash_fold"
              aria-expanded={shut_chart !== "score"}
              aria-label={shut_chart === ENGLISH.score_2 ? ENGLISH.open_score_distribution : ENGLISH.collapse_score_distribution}
              disabled={Boolean(shut_chart) && shut_chart !== "score"}
              onClick={() => fold_chart("score")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 14 6-6 6 6" />
              </svg>
            </button>
          </header>
          {shut_chart === "score" ? null :
            <Score_Bars points={view.distribution} selected={filters.bucket} on_pick={(id) => toggle("bucket", id)} />}
        </article>
        <article className={`ccm_qdash_card${shut_chart === "status" ? " is_shut" : ""}`}>
          <header className="ccm_qdash_card_head">
            <h4>{ENGLISH.completion_status}</h4>
            <button
              type="button"
              className="ccm_qdash_fold"
              aria-expanded={shut_chart !== "status"}
              aria-label={shut_chart === ENGLISH.status_2 ? ENGLISH.open_completion_status : ENGLISH.collapse_completion_status}
              disabled={Boolean(shut_chart) && shut_chart !== "status"}
              onClick={() => fold_chart("status")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 14 6-6 6 6" />
              </svg>
            </button>
          </header>
          {shut_chart === "status" ? null :
            <Status_Donut
              slices={view.completion}
              selected={filters.completion}
              on_pick={(id) => toggle("completion", id)} />}
        </article>
      </div>

      <div className="ccm_qdash_people">
        <People_Table
          title={ENGLISH.top_10_performers}
          tone="high"
          rows={view.top}
          selected={filters.student_id}
          on_pick={(id) => toggle("student_id", id)} />
        <People_Table
          title={ENGLISH.bottom_10_performers}
          tone="low"
          rows={view.bottom}
          selected={filters.student_id}
          on_pick={(id) => toggle("student_id", id)} />
      </div>

      <Quiz_Board
        title={ENGLISH.quiz_performance}
        rows={quiz_rows}
        page={quiz_page}
        on_page={set_quiz_page}
        sort={quiz_sort}
        on_sort={() => set_quiz_sort((current) => current === "desc" ? "asc" : "desc")}
        selected_id={filters.quiz_id}
        on_pick={(id) => toggle("quiz_id", id)}
        on_open={set_open_quiz_id} />
      {report ?
        <Report_Sheet_Preview
          title={ENGLISH.quiz_report}
          report={report}
          on_close={() => set_report(null)}
          on_download={() => save_workbook(report)} /> :
        null}
    </section>
  );
}
