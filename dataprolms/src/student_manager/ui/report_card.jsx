import { STUDENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/student_manager_constants_english.js";
const LOGO = "/srkisi_logo.png";

function fmt(value, suffix = "%") {
  return value == null ? "—" : `${value}${suffix}`;
}

function date_label(value) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function link_text(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.hostname.replace(/^www\./, "")}${path}`.slice(0, 60);
  } catch {
    return String(value || "").slice(0, 60);
  }
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

function tone(value) {
  if (value == null) return "none";
  if (value >= 75) return "good";
  if (value >= 50) return "fair";
  return "low";
}

function grade_class(grade) {
  return `is_${String(grade || "none").replace("+", "_plus").toLowerCase()}`;
}

function report_number(program, student) {
  const code = String(student.student_id || "").replace(/[^A-Z0-9]/gi, "").slice(-8);
  return `RC-${program.program_id}-${code}`;
}

function Ring({ value }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <svg className={`rpc_ring is_${tone(value)}`} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="18" className="rpc_ring_track" />
      <circle cx="22" cy="22" r="18" className="rpc_ring_fill" strokeDasharray={`${(width / 100) * 113.1} 113.1`} transform="rotate(-90 22 22)" />
      <text x="22" y="25" textAnchor="middle">{value == null ? "—" : Math.round(value)}</text>
    </svg>
  );
}

function Bar({ value }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return <span className={`rpc_bar is_${tone(value)}`}><i style={{ width: `${width}%` }} /></span>;
}

const METRICS = [
  { id: "progress", get label() { return ENGLISH.learning_progress; }, icon: "M5 19V9M10 19V5M15 19v-7M20 19v-4" },
  { id: "quiz", get label() { return ENGLISH.quiz_score; }, icon: "M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 17.5h.01" },
  { id: "coding", get label() { return ENGLISH.coding_practice; }, icon: "m8 8-4 4 4 4M16 8l4 4-4 4" },
  { id: "attendance", get label() { return ENGLISH.attendance; }, icon: "M8 3v4M16 3v4M4 10h16M5 6h14v14H5zM9 15l2 2 4-4" },
  { id: "hackathon", get label() { return ENGLISH.hackathons; }, icon: "M8 4h8v3a4 4 0 0 1-8 0V4ZM8 5H5.5a2.5 2.5 0 0 0 2.5 4M16 5h2.5a2.5 2.5 0 0 1-2.5 4M12 11v4M9 20h6" }
];

function metric_detail(id, counts) {
  if (id === "hackathon") return counts.hackathons_total ? ENGLISH.of_completed(counts.hackathons_done, counts.hackathons_total) : ENGLISH.no_hackathons_yet;
  if (id === "progress") return counts.lessons_total ? ENGLISH.of_lessons(counts.lessons_done, counts.lessons_total) : ENGLISH.no_lessons_yet;
  if (id === "quiz") return counts.quizzes_total ? `${counts.quizzes_attempted}/${counts.quizzes_total} attempted · ${fmt(counts.quiz_avg)} avg` : ENGLISH.no_quizzes_yet;
  if (id === "coding") return counts.coding_total ? ENGLISH.of_exercises(counts.coding_solved, counts.coding_total) : ENGLISH.no_exercises_yet;
  return counts.attendance_marked ? ENGLISH.of_sessions(counts.attendance_present, counts.attendance_marked) : ENGLISH.not_marked_yet;
}

export function Report_Card({ card, program, generated_at, grading }) {
  const { student, counts, career, remarks } = card;
  const weights = grading?.weights || { progress: 20, quiz: 25, coding: 15, attendance: 10, hackathon: 30 };
  const grades = grading?.grades || [];
  const delta = card.overall != null && card.class_average != null ? Math.round((card.overall - card.class_average) * 10) / 10 : null;
  return (
    <article className="rpc_sheet">
      <header className="rpc_band">
        {program.thumbnail_url ?
          <img src={program.thumbnail_url} alt={program.program_name} className="rpc_logo is_program" /> :
          <img src={LOGO} alt={ENGLISH.datapro} className="rpc_logo" />}
        <div className="rpc_band_title">
          <small>{ENGLISH.student_report_card}</small>
          <strong className="rpc_title">{program.program_name}</strong>
          <span>
            {[program.program_code, program.cohorts?.[0], program.start_date ? `${date_label(program.start_date)} – ${date_label(program.end_date)}` : ""].filter(Boolean).join("  ·  ")}
          </span>
        </div>
        <dl className="rpc_band_meta">
          <div><dt>{ENGLISH.report_no}</dt><dd>{report_number(program, student)}</dd></div>
          <div><dt>{ENGLISH.issued}</dt><dd>{date_label(generated_at)}</dd></div>
        </dl>
      </header>

      <section className="rpc_identity">
        <span className="rpc_avatar">{initials(student.name)}</span>
        <div className="rpc_who">
          <strong className="rpc_name">{student.name}</strong>
          <div className="rpc_ids">
            {student.itda_id ? <span>{student.itda_id}</span> : null}
            <span>{student.student_id}</span>
          </div>
          <p>{[student.email, student.mobile].filter(Boolean).join("  ·  ")}</p>
          <p className="rpc_muted">{[student.college, student.enrolled_on ? ENGLISH.enrolled(date_label(student.enrolled_on)) : ""].filter(Boolean).join("  ·  ")}</p>
        </div>
        <div className={`rpc_medal ${grade_class(card.grade)}`}>
          <div className="rpc_medal_disc">
            <b>{card.grade}</b>
            <small>{fmt(card.overall)}</small>
          </div>
          <div className="rpc_medal_text">
            <strong>{card.band}</strong>
            <span>{card.rank ? ENGLISH.rank_of(card.rank, card.rank_of) : ENGLISH.not_ranked}</span>
            {card.percentile != null ? <span>{ENGLISH.top}{Math.max(1, 100 - card.percentile)}{ENGLISH.of_the_class}</span> : null}
          </div>
        </div>
      </section>

      <section className="rpc_metrics">
        {METRICS.map((metric) =>
          <div key={metric.id} className="rpc_metric">
            <Ring value={card.metrics[metric.id]} />
            <div>
              <span className="rpc_metric_label">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={metric.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {metric.label}
              </span>
              <b>{fmt(card.metrics[metric.id])}</b>
              <small>{metric_detail(metric.id, counts)}</small>
              <em>{ENGLISH.weight}{weights[metric.id]}%</em>
            </div>
          </div>
        )}
      </section>

      <section className="rpc_compare">
        <span>{ENGLISH.overall_vs_class}</span>
        <div className="rpc_compare_track">
          <i className="rpc_compare_you" style={{ width: `${Math.max(0, Math.min(100, card.overall || 0))}%` }} />
          {card.class_average != null ? <em style={{ left: `${Math.max(0, Math.min(100, card.class_average))}%` }} title={ENGLISH.class_average} /> : null}
        </div>
        <b>{fmt(card.overall)} <small>{ENGLISH.you}</small></b>
        <b className="rpc_muted">{fmt(card.class_average)} <small>{ENGLISH.class_avg}</small></b>
        {delta != null ? <strong className={delta >= 0 ? "is_up" : "is_down"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}{ENGLISH.pts}</strong> : null}
      </section>

      <section className="rpc_block">
        <p className="rpc_h">{ENGLISH.course_wise_performance}</p>
        <table className="rpc_table">
          <thead>
            <tr>
              <th>{ENGLISH.course}</th>
              <th>{ENGLISH.lessons}</th>
              <th>{ENGLISH.quizzes}</th>
              <th>{ENGLISH.coding}</th>
              <th>{ENGLISH.attendance}</th>
              <th className="is_end">{ENGLISH.score}</th>
              <th className="is_end">{ENGLISH.grade}</th>
            </tr>
          </thead>
          <tbody>
            {card.courses.map((course) =>
              <tr key={course.course_id}>
                <td>
                  <b>{course.course_name}</b>
                  <small>{[course.course_code, course.level].filter(Boolean).join(" · ")}</small>
                </td>
                <td><Bar value={course.lessons_total ? course.progress : null} /><small>{course.lessons_total ? `${course.lessons_done}/${course.lessons_total}` : "—"}</small></td>
                <td><Bar value={course.quiz_score} /><small>{course.quizzes_total ? `${course.quizzes_attempted}/${course.quizzes_total} · ${fmt(course.quiz_avg)}` : "—"}</small></td>
                <td><Bar value={course.coding_score} /><small>{course.coding_total ? `${course.coding_solved}/${course.coding_total}` : "—"}</small></td>
                <td><Bar value={course.attendance_rate} /><small>{course.attendance_marked ? `${course.attendance_present}/${course.attendance_marked}` : "—"}</small></td>
                <td className="is_end"><b>{fmt(course.score)}</b></td>
                <td className="is_end"><span className={`rpc_grade ${grade_class(course.grade)}`}>{course.grade}</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="rpc_split">
        <section className="rpc_block">
          <p className="rpc_h">{ENGLISH.quiz_highlights}</p>
          {card.best_quizzes.length ?
            <>
              <p className="rpc_sub">{ENGLISH.best_performances}</p>
              <ul className="rpc_quiz_list">
                {card.best_quizzes.map((quiz, index) =>
                  <li key={`b-${index}-${quiz.title}`}><span>{quiz.title}</span><Bar value={quiz.best} /><b>{fmt(quiz.best)}</b></li>
                )}
              </ul>
              {card.weak_quizzes.length ?
                <>
                  <p className="rpc_sub">{ENGLISH.needs_revision}</p>
                  <ul className="rpc_quiz_list">
                    {card.weak_quizzes.map((quiz, index) =>
                      <li key={`w-${index}-${quiz.title}`}><span>{quiz.title}</span><Bar value={quiz.best} /><b>{fmt(quiz.best)}</b></li>
                    )}
                  </ul>
                </> :
                null}
            </> :
            <p className="rpc_muted">{ENGLISH.no_quizzes_attempted_yet}</p>}
        </section>
        <section className="rpc_block">
          <p className="rpc_h">{ENGLISH.career_readiness}</p>
          <ul className="rpc_career">
            <li>
              <i><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0V4ZM8 5H5.5a2.5 2.5 0 0 0 2.5 4M16 5h2.5a2.5 2.5 0 0 1-2.5 4M12 11v4M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></i>
              <div><b>{career.hackathons_joined}{ENGLISH.label_of}{career.hackathons_total || 0}</b><small>{ENGLISH.hackathons_joined}{career.submissions}{ENGLISH.submissions}</small></div>
            </li>
            <li>
              <i><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></i>
              <div><b>{career.mock_best != null ? `${career.mock_best}/10` : "—"}</b><small>{ENGLISH.career_readiness_2}{career.mock_sessions}{ENGLISH.mock_interview_sessions}</small></div>
            </li>
            <li>
              <i><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 3v5h5M10 12h6M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></i>
              <div><b>{career.resume_score != null ? `${career.resume_score}/100` : "—"}</b><small>{ENGLISH.latest_resume_score}{career.resume_attempts}{ENGLISH.analyses}</small></div>
            </li>
          </ul>
          {career.teams?.length ? <p className="rpc_teams">{career.teams.slice(0, 4).join("  ·  ")}</p> : null}
        </section>
      </div>

      {card.hackathons?.length ?
        <section className="rpc_block">
          <p className="rpc_h">{ENGLISH.hackathons}</p>
          <table className="rpc_table rpc_hack_table">
            <thead>
              <tr>
                <th>{ENGLISH.hackathon}</th>
                <th>{ENGLISH.team}</th>
                <th>{ENGLISH.status}</th>
                <th>{ENGLISH.submission_links}</th>
                <th className="is_end">{ENGLISH.score}</th>
              </tr>
            </thead>
            <tbody>
              {card.hackathons.map((item) =>
                <tr key={item.hackathon_id}>
                  <td>
                    <b>{item.title}</b>
                    <small>{item.projects.map((project) => project.title).filter(Boolean).join(" · ") || ENGLISH.no_project_submitted}</small>
                  </td>
                  <td>{item.team || "—"}</td>
                  <td><span className={`rpc_status is_${String(item.status || "").toLowerCase()}`}>{item.status || "—"}</span></td>
                  <td>
                    {item.projects.some((project) => project.demo_url || project.github_url || project.documentation_url) ?
                      <ul className="rpc_links">
                        {item.projects.flatMap((project, index) => [
                          project.demo_url ? <li key={`d${index}`}><em>{ENGLISH.live}</em><a href={project.demo_url} target="_blank" rel="noopener noreferrer">{link_text(project.demo_url)}</a></li> : null,
                          project.github_url ? <li key={`g${index}`}><em>{ENGLISH.code}</em><a href={project.github_url} target="_blank" rel="noopener noreferrer">{link_text(project.github_url)}</a></li> : null,
                          project.documentation_url ? <li key={`o${index}`}><em>{ENGLISH.docs}</em><a href={project.documentation_url} target="_blank" rel="noopener noreferrer">{link_text(project.documentation_url)}</a></li> : null
                        ])}
                      </ul> :
                      <small className="rpc_muted">—</small>}
                  </td>
                  <td className="is_end"><b>{item.score != null ? fmt(item.score) : "—"}</b></td>
                </tr>
              )}
            </tbody>
          </table>
        </section> :
        null}

      <section className="rpc_block rpc_remarks">
        <p className="rpc_h">{ENGLISH.ai_remarks}</p>
        <blockquote>{remarks.summary}</blockquote>
        <div className="rpc_split">
          <div>
            <p className="rpc_sub is_good">{ENGLISH.strengths}</p>
            {remarks.strengths.length ?
              <ul className="rpc_points is_good">{remarks.strengths.map((line) => <li key={line}>{line}</li>)}</ul> :
              <p className="rpc_muted">{ENGLISH.keep_building_consistent_activity}</p>}
          </div>
          <div>
            <p className="rpc_sub is_low">{ENGLISH.focus_areas}</p>
            {remarks.focus.length ?
              <ul className="rpc_points is_low">{remarks.focus.map((line) => <li key={line}>{line}</li>)}</ul> :
              <p className="rpc_muted">{ENGLISH.no_major_gaps_right_now}</p>}
          </div>
        </div>
      </section>

      <footer className="rpc_foot">
        <div className="rpc_scale">
          {grades.map((row) => <span key={row.grade} className={`rpc_grade ${grade_class(row.grade)}`}>{row.grade} <small>{row.min}+</small></span>)}
        </div>
        <div className="rpc_sign">
          <span />
          <small>{ENGLISH.program_coordinator}</small>
        </div>
        <p>{ENGLISH.score_hackathons}{weights.hackathon}{ENGLISH.quizzes_2}{weights.quiz}{ENGLISH.learning_progress_2}{weights.progress}{ENGLISH.coding_2}{weights.coding}{ENGLISH.attendance_2}{weights.attendance}{ENGLISH.parts_with_no_activity_are_left_out_course}{date_label(generated_at)}.
        </p>
      </footer>
    </article>
  );
}

export function Report_Sheets({ payload }) {
  return (
    <div className="rpc_sheets">
      {payload.cards.map((card) =>
        <Report_Card
          key={card.student.student_id}
          card={card}
          program={payload.program}
          generated_at={payload.generated_at}
          grading={payload.grading} />
      )}
    </div>
  );
}
