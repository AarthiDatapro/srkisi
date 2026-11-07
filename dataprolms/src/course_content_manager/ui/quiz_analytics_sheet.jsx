import { useMemo, useState } from "react";
import { EmptyState } from "@datapromr/empty-state";
import { initials_from_name as initials } from "../../design_system/people.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function dash(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function format_duration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}m ${rest}s`;
}

function format_when(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function score_tone(percent) {
  const value = Number(percent) || 0;
  if (value >= 90) return "gold";
  if (value >= 70) return "live";
  if (value >= 50) return "ok";
  return "low";
}

function question_tone(percent) {
  const value = Number(percent) || 0;
  if (value >= 90) return "strong";
  if (value >= 70) return "ok";
  return "weak";
}

function csv_cell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function download_sheet(quiz, submissions) {
  const rows = [
  ["#", ENGLISH.candidate, ENGLISH.email, ENGLISH.student_id, ENGLISH.college, ENGLISH.phone, ENGLISH.score, ENGLISH.correct_2, ENGLISH.time, ENGLISH.submitted],
  ...submissions.map((row) => [
  row.rank,
  row.name,
  row.email,
  row.student_id,
  row.college,
  row.phone,
  `${row.percent}%`,
  `${row.correct_count}/${row.total_questions}`,
  format_duration(row.duration_seconds),
  format_when(row.submitted_at)]
  )];

  const csv = rows.map((row) => row.map(csv_cell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf_8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(quiz?.quiz_title || "quiz").replace(/\s+/g, "-").toLowerCase()}-submissions.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Quiz_Analytics_Sheet({ data, loading, on_back, compact = false }) {
  const [query, set_query] = useState("");
  const quiz = data?.quiz || {};
  const stats = data?.stats || {};
  const insights = data?.insights || {};
  const submissions = data?.submissions || [];
  const questions = data?.questions || [];
  const leaderboard = data?.leaderboard || [];
  const distribution = data?.distribution || [];
  const podium = leaderboard.slice(0, 3);
  const rest_board = leaderboard.slice(3, 10);
  const max_dist = Math.max(...distribution.map((item) => Number(item.count) || 0), 1);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return submissions;
    return submissions.filter((row) =>
    [row.name, row.email, row.student_id, row.college, row.phone].
    join(" ").
    toLowerCase().
    includes(needle)
    );
  }, [query, submissions]);

  if (loading && !data) {
    return (
      <section className="ccm_arena">
        <p className="ccm_orbit_load">{ENGLISH.reading_the_run}</p>
      </section>);

  }

  return (
    <section className={compact ? "ccm_arena is_compact" : "ccm_arena"}>
      <header className="ccm_arena_hero">
        <button type="button" className="ccm_arena_back" onClick={on_back}>{ENGLISH.lab}</button>
        <div className="ccm_arena_copy">
          <h2>{quiz.quiz_title || ENGLISH.quiz_analytics}</h2>
          <p>
            {quiz.questions_shown && quiz.questions_shown !== (quiz.question_count || questions.length) ?
            ENGLISH.shown_of(quiz.questions_shown, quiz.question_count || questions.length || 0) :
            ENGLISH.questions(quiz.question_count || questions.length || 0)}
            {quiz.difficulty ? ` · ${quiz.difficulty}` : ""}
            {quiz.bloom_level ? ` · ${quiz.bloom_level}` : ""}
            {ENGLISH.pass_2(stats.passing_percent || 50)}
          </p>
        </div>
        <ul className="ccm_arena_vitals">
          <li>
            <b>{stats.submissions || 0}</b>
            <small>{ENGLISH.submitted_2}</small>
          </li>
          <li>
            <b>{stats.average_percent || 0}%</b>
            <small>{ENGLISH.avg}</small>
          </li>
          <li>
            <b>{stats.highest_percent || 0}%</b>
            <small>{ENGLISH.high}</small>
          </li>
          <li>
            <b>{stats.pass_rate || 0}%</b>
            <small>{ENGLISH.pass}</small>
          </li>
        </ul>
        {compact ? null :
        <button
          type="button"
          className="ccm_arena_dl"
          disabled={!submissions.length}
          onClick={() => download_sheet(quiz, submissions)}>{ENGLISH.download}</button>
        }
      </header>

      <div className="ccm_arena_grid">
        <section className="ccm_arena_floor">
          <header>
            <div>
              <p>{ENGLISH.results}</p>
              <h3>{rows.length} {rows.length === 1 ? "student" : "students"}</h3>
            </div>
            <input
              value={query}
              placeholder={compact ? ENGLISH.search : ENGLISH.find_a_student}
              onChange={(event) => set_query(event.target.value)} />
            
          </header>
          {rows.length ?
          <ol className="ccm_arena_tickets">
              {rows.map((row) =>
            <li key={row.attempt_id} className={`is_${score_tone(row.percent)}`}>
                  <em className="ccm_arena_rank">{row.rank}</em>
                  <span className="ccm_arena_face">{initials(row.name)}</span>
                  <div className="ccm_arena_who">
                    <strong>{row.name}</strong>
                    {compact ? null : <small>{dash(row.email)}</small>}
                  </div>
                  {compact ? null :
              <div className="ccm_arena_meta">
                    <span>{dash(row.student_id)}</span>
                    <span>{dash(row.college)}</span>
                    <span>{dash(row.phone)}</span>
                  </div>
              }
                  <div className="ccm_arena_score">
                    <b>{row.percent}%</b>
                    {compact ? null :
                <small>
                      {row.correct_count}/{row.total_questions}
                    </small>
                }
                  </div>
                  {compact ? null :
              <div className="ccm_arena_when">
                    <b>{format_duration(row.duration_seconds)}</b>
                    <small>{format_when(row.submitted_at)}</small>
                  </div>
              }
                </li>
            )}
            </ol> :

          <EmptyState>{query ? ENGLISH.no_matching_submissions : ENGLISH.no_one_has_submitted_this_quiz_yet}</EmptyState>
          }
        </section>

        <aside className="ccm_arena_side">
          <section className="ccm_arena_podium">
            <p>{ENGLISH.top_scores}</p>
            {podium.length ?
            <ol className="ccm_arena_steps">
                {podium.map((row, index) =>
              <li key={row.attempt_id} className={`is_p${index + 1}`}>
                    <em className="ccm_arena_rank">{index + 1}</em>
                    <span className="ccm_arena_face">{initials(row.name)}</span>
                    <div>
                      <strong>{row.name}</strong>
                      {compact ? null : <small>{format_duration(row.duration_seconds)}</small>}
                    </div>
                    <b>{row.percent}%</b>
                  </li>
              )}
              </ol> :

            <EmptyState>{ENGLISH.podium_waits_for_the_first_finish}</EmptyState>
            }
            {rest_board.length ?
            <ul className="ccm_arena_rest">
                {rest_board.map((row) =>
              <li key={row.attempt_id}>
                    <em className="ccm_arena_place">{row.rank}</em>
                    <span className="ccm_arena_face">{initials(row.name)}</span>
                    <strong>{row.name}</strong>
                    <b>{row.percent}%</b>
                  </li>
              )}
              </ul> :
            null}
          </section>

          {compact ? null :
          <section className="ccm_arena_spread">
            <p>{ENGLISH.score_spread}</p>
            <ul>
              {distribution.map((item) =>
              <li key={item.id}>
                  <span>{item.label}</span>
                  <i style={{ width: `${Math.max(8, Number(item.count) / max_dist * 100)}%` }} />
                  <b>{item.count}</b>
                </li>
              )}
            </ul>
          </section>
          }
        </aside>
      </div>

      <div className="ccm_arena_lower">
        <section className="ccm_arena_tape">
          <header>
            <p>{ENGLISH.questions_2}</p>
            <h3>{compact ? ENGLISH.class_accuracy : ENGLISH.where_the_class_held_or_slipped}</h3>
          </header>
          {questions.length ?
          <ol>
              {questions.map((question) =>
            <li key={question.question_id} className={`is_${question_tone(question.correct_percent)}`}>
                  <em>{ENGLISH.q}{question.question_number}</em>
                  <span>{question.question_text}</span>
                  <b>{question.correct_percent}%</b>
                  {compact ? null : <i style={{ width: `${Math.max(6, question.correct_percent)}%` }} />}
                </li>
            )}
            </ol> :

          <EmptyState>{ENGLISH.this_quiz_has_no_questions_yet}</EmptyState>
          }
        </section>

        <section className="ccm_arena_brief">
          <p>{ENGLISH.briefing}</p>
          <h3>{compact ? ENGLISH.next_steps : ENGLISH.what_to_keep_what_to_reteach}</h3>
          <p className="ccm_arena_lede">{insights.summary}</p>
          {insights.strengths?.length ?
          <div className="ccm_arena_chips">
              {insights.strengths.slice(0, compact ? 3 : 4).map((item) =>
            <span key={item} className="is_strong">
                  {item}
                </span>
            )}
            </div> :
          null}
          {insights.recommendations?.length ?
          <ul>
              {insights.recommendations.slice(0, compact ? 2 : 4).map((item) =>
            <li key={item}>{item}</li>
            )}
            </ul> :
          null}
        </section>
      </div>
    </section>);

}
