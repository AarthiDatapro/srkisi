import { useEffect, useState } from "react";
import { useToast } from "@datapromr/toast";
import { SCREEN } from "../../employee_authentication/screen_access.js";
import { use_screen_access } from "../../employee_authentication/employee_access.jsx";
import {
  get_mock_interview,
  get_mock_interview_certificate,
  get_mock_interview_report,
  save_mock_interview_certificate
} from "../api.js";
import {
  Bar_List,
  Carousel,
  Meter,
  Score_Ring,
  Column_Chart,
  Data_Table,
  Detail_Drawer,
  Donut,
  EMPTY_FILTERS,
  ICONS,
  Kpi_Grid,
  Monitor_Head,
  Panel,
  People_List,
  Score_Pill,
  Status_Pill,
  Student_Cell,
  Tag_List,
  Trend_Chart,
  export_csv,
  query_of,
  show,
  use_detail,
  use_programs,
  use_report,
  when_label
} from "./monitor_parts.jsx";
import { Sentiment_Panel } from "../../student_mock_interview/ui/sentiment_panel.jsx";
import "../theme/ai_monitor.css";
import { AI_MONITOR_ENGLISH as ENGLISH } from "../../constants/english/ai_monitor_constants_english.js";

const COLUMNS = [
  { key: "student", get label() { return ENGLISH.student; }, render: (row) => <Student_Cell student={row.student} />, sort: (row) => row.student?.name },
  { key: "target_role", get label() { return ENGLISH.target_role; }, render: (row) => row.target_role || "—" },
  { key: "source_label", label: ENGLISH.source },
  { key: "status", get label() { return ENGLISH.status; }, render: (row) => <Status_Pill value={row.status} /> },
  { key: "answered", get label() { return ENGLISH.answered; }, align: "end", render: (row) => `${row.answered}/${row.total_questions || "—"}` },
  { key: "score", get label() { return ENGLISH.score; }, align: "end", render: (row) => <Score_Pill value={row.score} max={10} good={7} warn={4} /> },
  { key: "match_score", get label() { return ENGLISH.role_match; }, align: "end", render: (row) => show(row.match_score, "%") },
  { key: "minutes", get label() { return ENGLISH.duration; }, align: "end", render: (row) => show(row.minutes, ENGLISH.min) },
  { key: "created_at", get label() { return ENGLISH.started; }, render: (row) => when_label(row.created_at) }
];

function Certificate_Assign() {
  const toast = useToast();
  const { can_edit } = use_screen_access(SCREEN.mock_interviews);
  const [items, set_items] = useState([]);
  const [assigned_id, set_assigned_id] = useState("");
  const [busy, set_busy] = useState(false);

  useEffect(() => {
    let live = true;
    get_mock_interview_certificate()
      .then((payload) => {
        if (!live) return;
        set_items(payload.items || []);
        set_assigned_id(payload.assigned_id ? String(payload.assigned_id) : "");
      })
      .catch((err) => toast.error(err.message));
    return () => { live = false; };
    // Load once when the monitor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function assign(certificate_id) {
    if (!can_edit || busy) return;
    const previous = assigned_id;
    set_assigned_id(certificate_id);
    set_busy(true);
    try {
      const payload = await save_mock_interview_certificate(certificate_id);
      set_assigned_id(payload.assigned_id ? String(payload.assigned_id) : "");
      toast.success(ENGLISH.certificate_assigned);
    } catch (err) {
      set_assigned_id(previous);
      toast.error(err.message);
    } finally {
      set_busy(false);
    }
  }

  return (
    <label className="aim_assign" title={ENGLISH.certificate_assign_hint}>
      <span>{ENGLISH.certificate_template}</span>
      <select
        aria-label={ENGLISH.certificate_template}
        value={assigned_id}
        disabled={!can_edit || busy || !items.length}
        onChange={(event) => assign(event.target.value)}>
        <option value="">{items.length ? ENGLISH.not_assigned : ENGLISH.create_a_certificate_template_first}</option>
        {items.map((item) =>
          <option key={item.certificate_id} value={item.certificate_id}>{item.certificate_name}</option>
        )}
      </select>
    </label>
  );
}

export function Mock_Interview_Monitor() {
  const [filters, set_filters] = useState(EMPTY_FILTERS);
  const { programs, courses } = use_programs();
  const { data, loading, error, reload } = use_report(get_mock_interview_report, query_of(filters));
  const detail = use_detail(get_mock_interview);
  const summary = data?.summary || {};

  function export_rows() {
    export_csv("mock_interviews", [
      { get label() { return ENGLISH.interview_id; }, value: (row) => row.mock_interview_id },
      { get label() { return ENGLISH.student; }, value: (row) => row.student?.name },
      { get label() { return ENGLISH.itda_id; }, value: (row) => row.student?.itda_id },
      { get label() { return ENGLISH.email; }, value: (row) => row.student?.email },
      { get label() { return ENGLISH.programs; }, value: (row) => row.student?.programs?.join("; ") },
      { get label() { return ENGLISH.target_role; }, value: (row) => row.target_role },
      { get label() { return ENGLISH.source; }, value: (row) => row.source_label },
      { get label() { return ENGLISH.status; }, value: (row) => row.status },
      { get label() { return ENGLISH.answered; }, value: (row) => row.answered },
      { get label() { return ENGLISH.total_questions; }, value: (row) => row.total_questions },
      { get label() { return ENGLISH.score_10; }, value: (row) => row.score },
      { get label() { return ENGLISH.role_match_2; }, value: (row) => row.match_score },
      { get label() { return ENGLISH.duration_min; }, value: (row) => row.minutes },
      { get label() { return ENGLISH.started; }, value: (row) => row.created_at }
    ], data?.rows || []);
  }

  return (
    <section className="aim_desk">
      <Monitor_Head
        title={ENGLISH.mock_interview_monitor}
        subtitle={ENGLISH.ai_mock_interview_sessions_scores_and_readiness_across}
        icon={ICONS.interview}
        filters={filters}
        on_filters={set_filters}
        programs={programs}
        courses={courses}
        loading={loading}
        on_reload={reload}
        on_export={export_rows}
        extra={<Certificate_Assign />} />
      {error ? <p className="aim_error">{error}</p> : null}
      {!data && loading ? <p className="aim_empty">{ENGLISH.loading_mock_interview_activity}</p> : null}
      {data ?
        <div className={`aim_body${loading ? " is_loading" : ""}`}>
          <Kpi_Grid items={[
            { get label() { return ENGLISH.interview_sessions; }, value: show(summary.sessions), change: summary.sessions_change, get hint() { return ENGLISH.vs_previous_period; }, tone: "indigo" },
            { get label() { return ENGLISH.students_practising; }, value: show(summary.students), change: summary.students_change, get hint() { return ENGLISH.unique_students; }, tone: "violet" },
            { get label() { return ENGLISH.completion_rate; }, value: show(summary.completion_rate, "%"), hint: ENGLISH.completed_2(show(summary.completed)), tone: "green" },
            { get label() { return ENGLISH.average_interview_score; }, value: show(summary.avg_score, " /10"), hint: `${show(summary.scored)} ${ENGLISH.scored_sessions}`, tone: "amber" },
            { get label() { return ENGLISH.avg_answers_per_session; }, value: show(summary.avg_answered), hint: ENGLISH.min_avg_duration(show(summary.avg_minutes)), tone: "sky" },
            { get label() { return ENGLISH.completed_interviews; }, value: show(summary.completed), get hint() { return ENGLISH.of_all_sessions; }, tone: "green" }
          ]} />
          <Panel
            className="aim_score_board"
            title={ENGLISH.average_interview_score}
            icon={ICONS.star}
            aside={<small>{show(summary.scored)} {ENGLISH.scored_sessions}</small>}>
            {summary.avg_score != null ?
              <Avg_Score_Board summary={summary} buckets={data.score_buckets} /> :
              <p className="aim_empty">{ENGLISH.no_average_score_yet}</p>}
          </Panel>
          <div className="aim_grid is_wide">
            <Panel title={ENGLISH.daily_sessions} icon={ICONS.trend}>
              <Trend_Chart points={data.trend} primary="count" secondary="completed" primary_label={ENGLISH.sessions} secondary_label={ENGLISH.completed} />
            </Panel>
            <Panel title={ENGLISH.how_interviews_start} icon={ICONS.pie}>
              <Donut items={data.sources} center_value={summary.sessions || 0} center_label="sessions" />
            </Panel>
          </div>
          <div className="aim_grid is_three">
            <Panel title={ENGLISH.top_target_roles} icon={ICONS.target}>
              <Bar_List items={data.roles} extra={(item) => (item.avg_score != null ? `· ${item.avg_score}/10` : "")} empty={ENGLISH.no_roles_recorded_yet} />
            </Panel>
            <Panel title={ENGLISH.weakest_topics} icon={ICONS.alert} aside={<small title={ENGLISH.career_readiness_of_every_answered_question_in_the}>{ENGLISH.career_readiness_2}</small>}>
              <Bar_List items={data.weak_topics} value="avg_score" max={10} suffix="/10" tone="rose" extra={(item) => ENGLISH.answers(item.count)} empty={ENGLISH.no_answered_questions_yet} />
            </Panel>
            <Panel title={ENGLISH.topic_coverage} icon={ICONS.list} aside={<small title={ENGLISH.how_many_questions_students_answered_in_each_topic}>{ENGLISH.answers_per_topic}</small>}>
              <Bar_List items={data.topics} extra={(item) => (item.avg_score != null ? ENGLISH.career_readiness_10(item.avg_score) : "")} empty={ENGLISH.no_answered_questions_yet} tone="sky" />
            </Panel>
          </div>
          <div className="aim_grid">
            <Panel title={ENGLISH.top_performers} icon={ICONS.star}>
              <People_List
                items={data.top_students}
                tone="green"
                metric={(item) => `${item.best_score}/10`}
                detail={(item) => ENGLISH.sessions_answers_last(item.sessions, item.answered, when_label(item.last_active))}
                empty={ENGLISH.no_scored_interviews_yet} />
            </Panel>
            <Panel title={ENGLISH.needs_attention} icon={ICONS.alert}>
              <People_List
                items={data.attention}
                tone="rose"
                metric={(item) => (item.avg_score != null ? `${item.avg_score}/10` : "—")}
                detail={(item) => ENGLISH.sessions_2(item.reason, item.sessions)}
                empty={ENGLISH.everyone_is_on_track} />
            </Panel>
          </div>
          {data.sentiment?.analysed ?
            <div className="aim_grid">
              <Panel title={ENGLISH.communication_analysis} icon={ICONS.list} aside={<small>{ENGLISH.average_out_of_10}</small>}>
                <Bar_List items={data.sentiment.communication} value="avg" max={10} suffix="/10" empty={ENGLISH.no_communication_scores_yet} />
              </Panel>
              <Panel title={ENGLISH.vocabulary_analysis} icon={ICONS.list} aside={<small>{ENGLISH.average_out_of_10}</small>}>
                <Bar_List items={data.sentiment.vocabulary} value="avg" max={10} suffix="/10" tone="sky" empty={ENGLISH.no_vocabulary_scores_yet} />
              </Panel>
            </div> :
            null}
          <Panel title={ENGLISH.all_interview_sessions} icon={ICONS.list} aside={<small>{ENGLISH.click_a_row_for_full_transcript}</small>}>
            <Data_Table
              columns={COLUMNS}
              rows={data.rows}
              total={data.total_rows}
              row_key={(row) => row.mock_interview_id}
              empty={ENGLISH.no_interviews_match_these_filters}
              on_open={(row) => detail.open_detail(row.mock_interview_id, `${row.student?.name || ENGLISH.student} · ${row.target_role || ENGLISH.mock_interview}`)} />
          </Panel>
        </div> :
        null}
      <Detail_Drawer open={detail.open} title={detail.title} loading={detail.loading} error={detail.error} on_close={detail.close}>
        {detail.item ? <Interview_Detail item={detail.item} /> : null}
      </Detail_Drawer>
    </section>
  );
}

function band_count(buckets, labels) {
  const map = new Map((buckets || []).map((item) => [item.label, item.count || 0]));
  return labels.reduce((sum, label) => sum + (map.get(label) || 0), 0);
}

function Avg_Score_Board({ summary, buckets }) {
  const scored = summary.scored || 0;
  const bands = [
    { label: ENGLISH.strong_scores, count: band_count(buckets, ["8–10"]), tone: "good" },
    { label: ENGLISH.solid_scores, count: band_count(buckets, ["6–8"]), tone: "sky" },
    { label: ENGLISH.developing_scores, count: band_count(buckets, ["4–6"]), tone: "warn" },
    { label: ENGLISH.needs_work_scores, count: band_count(buckets, ["0–2", "2–4"]), tone: "bad" }
  ];
  const max_band = Math.max(1, ...bands.map((item) => item.count));

  return (
    <div className="aim_score_board_body">
      <div className="aim_score_board_hero">
        <Score_Ring score={summary.avg_score} />
        <div className="aim_score_board_copy">
          <b>{show(summary.avg_score)}<small>/10</small></b>
          <span>{ENGLISH.average_interview_score}</span>
          <small>{ENGLISH.completed_2(show(summary.completed))} · {show(scored)} {ENGLISH.scored_sessions}</small>
        </div>
        <ul className="aim_score_board_bands" aria-label={ENGLISH.score_bands}>
          {bands.map((band) =>
            <li key={band.label} className={`is_${band.tone}`}>
              <div>
                <span>{band.label}</span>
                <b>{band.count}</b>
              </div>
              <i><em style={{ width: `${(band.count / max_band) * 100}%` }} /></i>
            </li>
          )}
        </ul>
      </div>
      <div className="aim_score_board_bars">
        <header className="aim_score_board_bars_head">
          <strong>{ENGLISH.score_distribution}</strong>
          <small>{ENGLISH.out_of_10}</small>
        </header>
        <Column_Chart items={buckets} tone="amber" />
      </div>
    </div>
  );
}

const CORRECTNESS = {
  correct: { get label() { return ENGLISH.correct; }, tone: "good" },
  partially_correct: { get label() { return ENGLISH.partly_correct; }, tone: "warn" },
  incorrect: { get label() { return ENGLISH.incorrect; }, tone: "bad" }
};

function tone_of(score) {
  if (score == null) return "none";
  if (score >= 7) return "good";
  if (score >= 4) return "warn";
  return "bad";
}

const TABS = [
  { id: "transcript", label: ENGLISH.transcript },
  { id: "fit", label: ENGLISH.role_fit },
  { id: "feedback", label: ENGLISH.feedback },
  { id: "sentiment", label: ENGLISH.sentiment }
];

export function Interview_Detail({ item }) {
  const [tab, set_tab] = useState("transcript");
  const transcript = item.transcript || [];
  const answered = transcript.filter((row) => row.answered).length;
  return (
    <div className="aim_iv">
      <header className="aim_iv_hero">
        <span className="aim_iv_avatar">{(item.student?.name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
        <div className="aim_iv_who">
          <b>{item.student?.name}</b>
          <small>{[item.student?.itda_id, item.student?.email].filter(Boolean).join(" · ")}</small>
          <span className="aim_iv_role">{item.target_role || ENGLISH.mock_interview}</span>
        </div>
        <Score_Ring score={item.score} />
      </header>
      <ul className="aim_iv_facts is_board">
        <li className="is_score">
          <span className="aim_iv_mark" aria-hidden="true">{ICONS.star}</span>
          <small>{ENGLISH.career_readiness_3}</small>
          <b>{item.score == null ? "—" : `${item.score}/10`}</b>
          <i className="aim_iv_track" aria-hidden="true"><em style={{ width: `${Math.max(0, Math.min(100, (Number(item.score) || 0) * 10))}%` }} /></i>
        </li>
        <li className="is_status">
          <span className="aim_iv_mark" aria-hidden="true">{ICONS.check}</span>
          <small>{ENGLISH.status_2}</small>
          <Status_Pill value={item.status} />
        </li>
        <li className="is_answers">
          <span className="aim_iv_mark" aria-hidden="true">{ICONS.chat}</span>
          <small>{ENGLISH.answered_2}</small>
          <b>{answered}/{item.total_questions || transcript.length || "—"}</b>
        </li>
        <li className="is_time">
          <span className="aim_iv_mark" aria-hidden="true">{ICONS.clock}</span>
          <small>{ENGLISH.duration_2}</small>
          <b>{show(item.minutes, ENGLISH.min)}</b>
        </li>
        <li className="is_source">
          <span className="aim_iv_mark" aria-hidden="true">{ICONS.resume}</span>
          <small>{ENGLISH.started_from}</small>
          <b>{item.source_label || "—"}</b>
        </li>
        <li className="is_date">
          <span className="aim_iv_mark" aria-hidden="true">{ICONS.calendar}</span>
          <small>{ENGLISH.date}</small>
          <b>{when_label(item.created_at)}</b>
        </li>
      </ul>

      <nav className="aim_iv_tabs" aria-label={ENGLISH.interview_sections}>
        {TABS.map((entry) =>
          <button key={entry.id} type="button" className={tab === entry.id ? "is_on" : ""} onClick={() => set_tab(entry.id)}>
            {entry.label}
            {entry.id === "transcript" ? <em>{transcript.length}</em> : null}
          </button>
        )}
      </nav>

      {tab === "transcript" ?
        <div className="aim_iv_pane">
          {item.plan?.length ?
            <section className="aim_iv_plan">
              <h3>{ENGLISH.interview_journey}</h3>
              <Carousel label={ENGLISH.interview_topics}>
                {item.plan.map((topic) =>
                  <li key={topic.name} className={`is_${topic.answered ? tone_of(topic.avg_score) : topic.asked ? "warn" : "none"}`}>
                    <b>{topic.name}</b>
                    <small>
                      {topic.answered ? ENGLISH.answered_10(topic.answered, show(topic.avg_score)) : topic.asked ? ENGLISH.asked_not_answered : ENGLISH.not_reached}
                    </small>
                  </li>
                )}
              </Carousel>
            </section> :
            null}
          {transcript.length ?
            <>
              <div className="aim_iv_strip" aria-label={ENGLISH.score_per_question}>
                {transcript.map((row) =>
                  <button
                    key={row.number}
                    type="button"
                    className={`is_${row.answered ? tone_of(row.score) : "none"}`}
                    title={ENGLISH.q(row.number, row.answered ? `${show(row.score)}/10` : ENGLISH.not_answered)}
                    onClick={() => document.getElementById(`aim_q_${item.mock_interview_id}_${row.number}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    {row.number}
                  </button>
                )}
              </div>
              <ol className="aim_chat">
                {transcript.map((row) =>
                  <li key={row.number} id={`aim_q_${item.mock_interview_id}_${row.number}`}>
                    <div className="aim_bubble is_ai">
                      <span className="aim_bubble_who">{ENGLISH.ai_interviewer_q}{row.number}</span>
                      <p>{row.question || ENGLISH.question_text_was_not_saved}</p>
                      <span className="aim_bubble_tags">
                        {row.topic ? <em>{row.topic}</em> : null}
                        {row.difficulty ? <em>{row.difficulty}</em> : null}
                        {row.type ? <em>{row.type}</em> : null}
                      </span>
                      {row.expected.length ? <small className="aim_expected">{ENGLISH.looking_for}{row.expected.join(", ")}</small> : null}
                    </div>
                    {row.answered ?
                      <div className="aim_bubble is_me">
                        <span className="aim_bubble_who">{item.student?.name || ENGLISH.candidate}</span>
                        <p>{row.answer}</p>
                      </div> :
                      <div className="aim_bubble is_me is_empty">
                        <span className="aim_bubble_who">{item.student?.name || ENGLISH.candidate}</span>
                        <p>{ENGLISH.no_answer_given}</p>
                      </div>}
                    {row.answered ?
                      <div className={`aim_eval is_${tone_of(row.score)}`}>
                        <header>
                          <Score_Pill value={row.score} max={10} good={7} warn={4} />
                          {CORRECTNESS[row.correctness] ?
                            <span className={`aim_pill is_${CORRECTNESS[row.correctness].tone}`}>{CORRECTNESS[row.correctness].label}</span> :
                            null}
                          {row.follow_up ? <span className="aim_pill is_none">{ENGLISH.follow_up_asked}</span> : null}
                        </header>
                        {row.feedback ? <p>{row.feedback}</p> : null}
                        {row.strengths.length ? <Tag_List items={row.strengths} tone="green" /> : null}
                        {row.gaps.length ? <Tag_List items={row.gaps} tone="rose" /> : null}
                      </div> :
                      null}
                  </li>
                )}
              </ol>
            </> :
            <p className="aim_empty">{ENGLISH.no_questions_were_recorded_for_this_session}</p>}
        </div> :
        null}

      {tab === "fit" ?
        <div className="aim_iv_pane">
          <section className="aim_iv_card">
            <h3>{ENGLISH.role_fit_before_the_interview}</h3>
            <Meter label={ENGLISH.overall_match} value={item.match_score} />
            <Meter label={ENGLISH.skills_match} value={item.analysis.skills_match_score} />
            <Meter label={ENGLISH.experience_match} value={item.analysis.experience_match_score} />
            <Meter label={ENGLISH.keyword_coverage} value={item.analysis.keyword_coverage_score} />
            {item.analysis.total_experience ? <p className="aim_muted">{ENGLISH.experience}{item.analysis.total_experience}</p> : null}
          </section>
          <div className="aim_iv_split">
            <section className="aim_iv_card is_good">
              <h3>{ENGLISH.matched_skills}</h3>
              <Tag_List items={item.analysis.matched_skills} tone="green" empty={ENGLISH.none_listed} />
            </section>
            <section className="aim_iv_card is_bad">
              <h3>{ENGLISH.missing_skills}</h3>
              <Tag_List items={item.analysis.missing_skills} tone="rose" empty={ENGLISH.nothing_missing} />
            </section>
          </div>
          {item.analysis.strengths_for_role.length || item.analysis.gaps.length ?
            <div className="aim_iv_split">
              <section className="aim_iv_card is_good">
                <h3>{ENGLISH.strengths_for_this_role}</h3>
                <Tag_List items={item.analysis.strengths_for_role} tone="green" />
              </section>
              <section className="aim_iv_card is_bad">
                <h3>{ENGLISH.gaps_for_this_role}</h3>
                <Tag_List items={item.analysis.gaps} tone="rose" />
              </section>
            </div> :
            null}
        </div> :
        null}

      {tab === "sentiment" ?
        <div className="aim_iv_pane">
          <Sentiment_Panel analysis={item.performance?.llm_analysis} />
        </div> :
        null}

      {tab === "feedback" ?
        <div className="aim_iv_pane">
          {answered ?
            <>
              <section className="aim_iv_card is_good">
                <h3>{ENGLISH.what_went_well}</h3>
                <Tag_List items={item.performance.strengths} tone="green" empty={ENGLISH.no_strengths_recorded} />
              </section>
              <section className="aim_iv_card is_bad">
                <h3>{ENGLISH.gaps_to_work_on}</h3>
                <Tag_List items={item.performance.gaps.slice(0, 20)} tone="rose" empty={ENGLISH.no_gaps_recorded} />
              </section>
              <section className="aim_iv_card">
                <h3>{ENGLISH.recommendations}</h3>
                <Tag_List items={item.performance.recommendations} empty={ENGLISH.no_recommendations_recorded} />
              </section>
            </> :
            <p className="aim_empty">{ENGLISH.the_candidate_did_not_answer_any_questions_so}</p>}
        </div> :
        null}
    </div>
  );
}
