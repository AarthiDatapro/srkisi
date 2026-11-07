import { useState } from "react";
import { get_chat, get_chat_report } from "../api.js";
import {
  Bar_List,
  Column_Chart,
  Data_Table,
  Detail_Drawer,
  EMPTY_FILTERS,
  ICONS,
  Kpi_Grid,
  Monitor_Head,
  Panel,
  People_List,
  Status_Pill,
  Student_Cell,
  Trend_Chart,
  export_csv,
  query_of,
  show,
  use_detail,
  use_programs,
  use_report,
  when_label
} from "./monitor_parts.jsx";
import "../theme/ai_monitor.css";
import { AI_MONITOR_ENGLISH as ENGLISH } from "../../constants/english/ai_monitor_constants_english.js";

function seconds(ms) {
  return ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`;
}

const COLUMNS = [
  { key: "student", get label() { return ENGLISH.student; }, render: (row) => <Student_Cell student={row.student_id ? row.student : null} />, sort: (row) => row.student?.name },
  { key: "question", get label() { return ENGLISH.question; }, render: (row) => <span className="aim_clip" title={row.question}>{row.question}</span> },
  { key: "course_name", get label() { return ENGLISH.course; }, render: (row) => row.course_name || "—" },
  { key: "topic", get label() { return ENGLISH.lesson_topic; }, render: (row) => row.topic || "—" },
  { key: "total_ms", get label() { return ENGLISH.response; }, align: "end", render: (row) => seconds(row.total_ms) },
  { key: "status", get label() { return ENGLISH.status; }, render: (row) => <Status_Pill value={row.status} /> },
  { key: "created_at", get label() { return ENGLISH.asked; }, render: (row) => when_label(row.created_at) }
];

export function Chatbot_Monitor() {
  const [filters, set_filters] = useState(EMPTY_FILTERS);
  const { programs, courses } = use_programs();
  const { data, loading, error, reload } = use_report(get_chat_report, query_of(filters));
  const detail = use_detail(get_chat);
  const summary = data?.summary || {};

  function export_rows() {
    export_csv("chatbot_usage", [
      { get label() { return ENGLISH.chat_id; }, value: (row) => row.chat_log_id },
      { get label() { return ENGLISH.student; }, value: (row) => row.student?.name },
      { get label() { return ENGLISH.itda_id; }, value: (row) => row.student?.itda_id },
      { get label() { return ENGLISH.programs; }, value: (row) => row.student?.programs?.join("; ") },
      { get label() { return ENGLISH.course; }, value: (row) => row.course_name },
      { get label() { return ENGLISH.topic; }, value: (row) => row.topic },
      { get label() { return ENGLISH.question; }, value: (row) => row.question },
      { get label() { return ENGLISH.follow_up_turns; }, value: (row) => row.history_turns },
      { get label() { return ENGLISH.first_token_ms; }, value: (row) => row.first_token_ms },
      { get label() { return ENGLISH.total_ms; }, value: (row) => row.total_ms },
      { get label() { return ENGLISH.answer_length; }, value: (row) => row.answer_chars },
      { get label() { return ENGLISH.fast_mode; }, value: (row) => (row.fast_mode ? ENGLISH.yes : ENGLISH.no) },
      { get label() { return ENGLISH.status; }, value: (row) => row.status },
      { get label() { return ENGLISH.asked; }, value: (row) => row.created_at }
    ], data?.rows || []);
  }

  return (
    <section className="aim_desk">
      <Monitor_Head
        title={ENGLISH.chatbot_usage_monitor}
        subtitle={ENGLISH.questions_students_ask_the_ai_learning_assistant_response}
        icon={ICONS.chat}
        filters={filters}
        on_filters={set_filters}
        programs={programs}
        courses={courses}
        loading={loading}
        on_reload={reload}
        on_export={export_rows} />
      {error ? <p className="aim_error">{error}</p> : null}
      {data ?
        <p className="aim_note">
          {data.tracking_since ?
            ENGLISH.usage_is_recorded_from(when_label(data.tracking_since)) :
            ENGLISH.usage_tracking_is_on_questions_will_appear_here}
        </p> :
        null}
      {!data && loading ? <p className="aim_empty">{ENGLISH.loading_chatbot_usage}</p> : null}
      {data ?
        <div className={`aim_body${loading ? " is_loading" : ""}`}>
          <Kpi_Grid items={[
            { get label() { return ENGLISH.questions_asked; }, value: show(summary.questions), change: summary.questions_change, get hint() { return ENGLISH.vs_previous_period; }, tone: "indigo" },
            { get label() { return ENGLISH.active_students; }, value: show(summary.students), change: summary.students_change, hint: ENGLISH.questions_each(show(summary.per_student)), tone: "violet" },
            { get label() { return ENGLISH.avg_response_time; }, value: show(summary.avg_total_s, "s"), hint: ENGLISH.first_word_in(show(summary.avg_first_token_s, "s")), tone: "sky" },
            { get label() { return ENGLISH.slowest_10; }, value: show(summary.p90_total_s, "s"), get hint() { return ENGLISH.label_90th_percentile; }, tone: "amber" },
            { get label() { return ENGLISH.error_rate; }, value: show(summary.error_rate, "%"), hint: ENGLISH.stopped_by_student(show(summary.aborted_rate, "%")), tone: "rose" },
            { get label() { return ENGLISH.follow_up_questions; }, value: show(summary.follow_up_rate, "%"), hint: ENGLISH.used_fast_mode(show(summary.fast_rate, "%")), tone: "green" }
          ]} />
          <div className="aim_grid is_wide">
            <Panel title={ENGLISH.daily_questions} icon={ICONS.trend}>
              <Trend_Chart points={data.trend} primary="count" secondary="errors" primary_label={ENGLISH.questions} secondary_label={ENGLISH.errors} />
            </Panel>
            <Panel title={ENGLISH.by_weekday} icon={ICONS.chart}>
              <Column_Chart items={data.weekdays} tone="indigo" />
            </Panel>
          </div>
          <Panel title={ENGLISH.busiest_hours_of_the_day} icon={ICONS.clock}>
            <Column_Chart items={data.hours.map((item) => ({ label: `${String(item.hour).padStart(2, "0")}`, count: item.count }))} tone="sky" />
          </Panel>
          <div className="aim_grid is_three">
            <Panel title={ENGLISH.courses_asked_about} icon={ICONS.list}>
              <Bar_List items={data.courses} empty={ENGLISH.no_course_context_yet} />
            </Panel>
            <Panel title={ENGLISH.lessons_topics} icon={ICONS.target}>
              <Bar_List items={data.topics} tone="sky" empty={ENGLISH.no_topics_yet} />
            </Panel>
            <Panel title={ENGLISH.most_active_students} icon={ICONS.star}>
              <People_List
                items={data.top_students}
                tone="green"
                metric={(item) => `${item.questions}`}
                detail={(item) => ENGLISH.courses_last(item.courses, when_label(item.last_active))}
                empty={ENGLISH.no_students_yet} />
            </Panel>
          </div>
          <Panel title={ENGLISH.all_questions} icon={ICONS.list} aside={<small>{ENGLISH.click_a_row_for_the_answer}</small>}>
            <Data_Table
              columns={COLUMNS}
              rows={data.rows}
              total={data.total_rows}
              row_key={(row) => row.chat_log_id}
              empty={ENGLISH.no_questions_match_these_filters}
              on_open={(row) => detail.open_detail(row.chat_log_id, `${row.student?.name || ENGLISH.chat} · ${row.course_name || ENGLISH.ai_assistant}`)} />
          </Panel>
        </div> :
        null}
      <Detail_Drawer open={detail.open} title={detail.title} loading={detail.loading} error={detail.error} on_close={detail.close}>
        {detail.item ? <Chat_Detail item={detail.item} /> : null}
      </Detail_Drawer>
    </section>
  );
}

function Chat_Detail({ item }) {
  return (
    <div className="aim_detail">
      <div className="aim_detail_facts">
        <div><small>{ENGLISH.student}</small><b>{item.student?.name || ENGLISH.staff_guest}</b><span>{[item.student?.itda_id, item.student?.email].filter(Boolean).join(" · ")}</span></div>
        <div><small>{ENGLISH.course}</small><b>{item.course_name || "—"}</b><span>{item.topic || "—"}</span></div>
        <div><small>{ENGLISH.response}</small><b>{seconds(item.total_ms)}</b><span>{ENGLISH.first_word}{seconds(item.first_token_ms)}</span></div>
        <div><small>{ENGLISH.status}</small><b><Status_Pill value={item.status} /></b><span>{when_label(item.created_at)}</span></div>
      </div>
      <section>
        <h3>{ENGLISH.question}</h3>
        <p className="aim_q">{item.question}</p>
        <h3>{ENGLISH.answer}{item.answer_chars > 1500 ? <small>{ENGLISH.first_1500_of}{item.answer_chars}{ENGLISH.characters}</small> : null}</h3>
        <p className="aim_a">{item.answer_preview || ENGLISH.no_answer_was_returned}</p>
        {item.error_text ? <p className="aim_error">{item.error_text}</p> : null}
        <p className="aim_muted">{item.history_turns ? ENGLISH.follow_up_in_a_conversation_of_earlier_messages(item.history_turns) : ENGLISH.first_question_in_the_conversation} {item.fast_mode ? ENGLISH.used_the_student_s_fast_response_key : ""}</p>
      </section>
      {item.recent.length ?
        <section>
          <h3>{ENGLISH.other_recent_questions_by_this_student}</h3>
          <ul className="aim_recent">
            {item.recent.map((row) =>
              <li key={row.chat_log_id}>
                <span>{row.question}</span>
                <small>{[row.course_name, row.topic, when_label(row.created_at)].filter(Boolean).join(" · ")}</small>
              </li>
            )}
          </ul>
        </section> :
        null}
    </div>
  );
}
