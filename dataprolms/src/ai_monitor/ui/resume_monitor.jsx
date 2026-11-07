import { useState } from "react";
import { get_resume, get_resume_report } from "../api.js";
import {
  Bar_List,
  Column_Chart,
  Data_Table,
  Detail_Drawer,
  EMPTY_FILTERS,
  Hero,
  ICONS,
  Kpi_Grid,
  Meter,
  Monitor_Head,
  Panel,
  People_List,
  Point_List,
  Score_Pill,
  Score_Ring,
  Section_Card,
  Student_Cell,
  Tabs,
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
import "../theme/ai_monitor.css";
import { AI_MONITOR_ENGLISH as ENGLISH } from "../../constants/english/ai_monitor_constants_english.js";

const COLUMNS = [
  { key: "student", get label() { return ENGLISH.student; }, render: (row) => <Student_Cell student={row.student} />, sort: (row) => row.student?.name },
  { key: "target_role", get label() { return ENGLISH.target_role; }, render: (row) => row.target_role || "—" },
  { key: "overall_score", get label() { return ENGLISH.overall; }, align: "end", render: (row) => <Score_Pill value={row.overall_score} max={100} good={70} warn={50} /> },
  { key: "impact_score", get label() { return ENGLISH.impact; }, align: "end" },
  { key: "clarity_score", get label() { return ENGLISH.clarity; }, align: "end" },
  { key: "completeness_score", get label() { return ENGLISH.completeness; }, align: "end" },
  { key: "saved_to_profile", get label() { return ENGLISH.saved_to_profile; }, render: (row) => (row.saved_to_profile ? <span className="aim_pill is_good">{ENGLISH.saved}</span> : <span className="aim_pill is_none">{ENGLISH.no}</span>), sort: (row) => (row.saved_to_profile ? 1 : 0) },
  { key: "created_at", get label() { return ENGLISH.analysed; }, render: (row) => when_label(row.created_at) }
];

export function Resume_Monitor() {
  const [filters, set_filters] = useState(EMPTY_FILTERS);
  const { programs, courses } = use_programs();
  const { data, loading, error, reload } = use_report(get_resume_report, query_of(filters));
  const detail = use_detail(get_resume);
  const summary = data?.summary || {};

  function export_rows() {
    export_csv("resume_analyser", [
      { get label() { return ENGLISH.analysis_id; }, value: (row) => row.analysis_id },
      { get label() { return ENGLISH.student; }, value: (row) => row.student?.name },
      { get label() { return ENGLISH.itda_id; }, value: (row) => row.student?.itda_id },
      { get label() { return ENGLISH.email; }, value: (row) => row.student?.email },
      { get label() { return ENGLISH.programs; }, value: (row) => row.student?.programs?.join("; ") },
      { get label() { return ENGLISH.target_role; }, value: (row) => row.target_role },
      { get label() { return ENGLISH.overall; }, value: (row) => row.overall_score },
      { get label() { return ENGLISH.impact; }, value: (row) => row.impact_score },
      { get label() { return ENGLISH.clarity; }, value: (row) => row.clarity_score },
      { get label() { return ENGLISH.completeness; }, value: (row) => row.completeness_score },
      { get label() { return ENGLISH.experience_2; }, value: (row) => row.experience },
      { get label() { return ENGLISH.saved_to_profile; }, value: (row) => (row.saved_to_profile ? ENGLISH.yes : ENGLISH.no) },
      { get label() { return ENGLISH.file; }, value: (row) => row.file_name },
      { get label() { return ENGLISH.analysed; }, value: (row) => row.created_at }
    ], data?.rows || []);
  }

  return (
    <section className="aim_desk">
      <Monitor_Head
        title={ENGLISH.resume_analyser_monitor}
        subtitle={ENGLISH.resume_quality_improvement_over_time_and_job_readiness}
        icon={ICONS.resume}
        filters={filters}
        on_filters={set_filters}
        programs={programs}
        courses={courses}
        loading={loading}
        on_reload={reload}
        on_export={export_rows} />
      {error ? <p className="aim_error">{error}</p> : null}
      {!data && loading ? <p className="aim_empty">{ENGLISH.loading_resume_analyser_activity}</p> : null}
      {data ?
        <div className={`aim_body${loading ? " is_loading" : ""}`}>
          <Kpi_Grid items={[
            { get label() { return ENGLISH.resumes_analysed; }, value: show(summary.analyses), change: summary.analyses_change, get hint() { return ENGLISH.vs_previous_period; }, tone: "indigo" },
            { get label() { return ENGLISH.students; }, value: show(summary.students), change: summary.students_change, get hint() { return ENGLISH.unique_students; }, tone: "violet" },
            { get label() { return ENGLISH.average_resume_score; }, value: show(summary.avg_score, " /100"), hint: ENGLISH.impact_clarity(show(summary.avg_impact), show(summary.avg_clarity)), tone: "amber" },
            { get label() { return ENGLISH.job_ready_resumes; }, value: show(summary.job_ready), get hint() { return ENGLISH.latest_score_70_or_more; }, tone: "green" },
            { get label() { return ENGLISH.students_improving; }, value: show(summary.improved), hint: ENGLISH.avg_change(show(summary.avg_improvement, ENGLISH.pts)), tone: "sky" },
            { get label() { return ENGLISH.saved_to_profile; }, value: show(summary.saved_rate, "%"), get hint() { return ENGLISH.of_students; }, tone: "rose" }
          ]} />
          <div className="aim_grid is_wide">
            <Panel title={ENGLISH.daily_analyses} icon={ICONS.trend}>
              <Trend_Chart points={data.trend} primary="count" primary_label={ENGLISH.analyses} />
            </Panel>
            <Panel title={ENGLISH.score_distribution} icon={ICONS.chart} aside={<small>{ENGLISH.out_of_100}</small>}>
              <Column_Chart items={data.score_buckets} tone="amber" />
            </Panel>
          </div>
          <div className="aim_grid is_three">
            <Panel title={ENGLISH.most_missing_sections} icon={ICONS.alert}>
              <Bar_List items={data.missing_sections} tone="rose" empty={ENGLISH.no_missing_sections_reported} />
            </Panel>
            <Panel title={ENGLISH.most_common_skills} icon={ICONS.star}>
              <Bar_List items={data.skills} tone="green" empty={ENGLISH.no_skills_recorded_yet} />
            </Panel>
            <Panel title={ENGLISH.target_roles} icon={ICONS.target}>
              <Bar_List items={data.roles} empty={ENGLISH.no_roles_recorded_yet} />
            </Panel>
          </div>
          <div className="aim_grid is_three">
            <Panel title={ENGLISH.biggest_improvers} icon={ICONS.trend}>
              <People_List
                items={data.top_improvers}
                tone="green"
                metric={(item) => `+${item.improvement}`}
                detail={(item) => ENGLISH.in_attempts(item.first_score, item.latest_score, item.attempts)}
                empty={ENGLISH.no_repeat_analyses_yet} />
            </Panel>
            <Panel title={ENGLISH.best_resumes} icon={ICONS.star}>
              <People_List
                items={data.top_students}
                tone="indigo"
                metric={(item) => `${item.best_score}`}
                detail={(item) => ENGLISH.attempts_last(item.attempts, when_label(item.last_active))}
                empty={ENGLISH.no_scored_resumes_yet} />
            </Panel>
            <Panel title={ENGLISH.needs_attention} icon={ICONS.alert}>
              <People_List
                items={data.attention}
                tone="rose"
                metric={(item) => `${item.latest_score}`}
                detail={(item) => ENGLISH.attempts_2(item.reason, item.attempts)}
                empty={ENGLISH.everyone_is_above_50} />
            </Panel>
          </div>
          <Panel title={ENGLISH.all_resume_analyses} icon={ICONS.list} aside={<small>{ENGLISH.click_a_row_for_the_full_report}</small>}>
            <Data_Table
              columns={COLUMNS}
              rows={data.rows}
              total={data.total_rows}
              row_key={(row) => row.analysis_id}
              empty={ENGLISH.no_analyses_match_these_filters}
              on_open={(row) => detail.open_detail(row.analysis_id, ENGLISH.resume_report(row.student?.name || ENGLISH.student))} />
          </Panel>
        </div> :
        null}
      <Detail_Drawer open={detail.open} title={detail.title} loading={detail.loading} error={detail.error} on_close={detail.close}>
        {detail.item ? <Resume_Detail item={detail.item} /> : null}
      </Detail_Drawer>
    </section>
  );
}

const RESUME_TABS = [
  { id: "overview", label: ENGLISH.overview },
  { id: "assessment", label: ENGLISH.assessment },
  { id: "profile", label: ENGLISH.profile }
];

export function Resume_Detail({ item }) {
  const [tab, set_tab] = useState("overview");
  const history = item.history || [];
  const first = history[0]?.overall_score;
  const change = history.length > 1 && first != null && item.overall_score != null ? Math.round((item.overall_score - first) * 10) / 10 : null;
  const issues = (item.improvements?.length || 0) + (item.missing_sections?.length || 0);
  return (
    <div className="aim_iv">
      <Hero
        name={item.student?.name || "Student"}
        meta={[item.student?.itda_id, item.student?.email].filter(Boolean).join(" · ")}
        chips={[item.target_role, item.experience]}>
        <Score_Ring score={item.overall_score} max={100} />
      </Hero>

      <div className="aim_iv_scores">
        <Meter label={ENGLISH.impact} value={item.impact_score} suffix="" />
        <Meter label={ENGLISH.clarity} value={item.clarity_score} suffix="" />
        <Meter label={ENGLISH.completeness} value={item.completeness_score} suffix="" />
      </div>

      <ul className="aim_iv_facts is_four">
        <li><small>{ENGLISH.analysed}</small><b>{when_label(item.created_at)}</b></li>
        <li><small>{ENGLISH.attempts}</small><b>{history.length || 1}</b></li>
        <li>
          <small>{ENGLISH.since_first_attempt}</small>
          <b className={change > 0 ? "is_up" : change < 0 ? "is_down" : ""}>{change == null ? ENGLISH.first_attempt : ENGLISH.pts_2(change > 0 ? "+" : "", change)}</b>
        </li>
        <li>
          <small>{ENGLISH.profile}</small>
          {item.resume_url ?
            <a className="aim_link_btn" href={item.resume_url} target="_blank" rel="noreferrer">{ICONS.link}{ENGLISH.open_resume}</a> :
            <b>{ENGLISH.not_saved}</b>}
        </li>
      </ul>

      <Tabs
        items={RESUME_TABS.map((entry) => ({ ...entry, count: entry.id === "assessment" ? issues : undefined }))}
        value={tab}
        on_change={set_tab} />

      {tab === "overview" ?
        <div className="aim_iv_pane">
          {item.summary ?
            <Section_Card icon={ICONS.user} title={ENGLISH.professional_summary}>
              <p className="aim_card_text">{item.summary}</p>
            </Section_Card> :
            null}
          {item.feedback ?
            <Section_Card icon={ICONS.spark} title={ENGLISH.ai_verdict} tone="violet">
              <blockquote className="aim_quote">{item.feedback}</blockquote>
            </Section_Card> :
            null}
          {history.length > 1 ?
            <Section_Card icon={ICONS.trend} title={ENGLISH.score_over_attempts} tone="sky" count={history.length}>
              <ol className="aim_steps">
                {history.map((row, index) => {
                  const previous = index ? history[index - 1].overall_score : null;
                  const delta = previous != null && row.overall_score != null ? Math.round((row.overall_score - previous) * 10) / 10 : null;
                  return (
                    <li key={row.analysis_id} className={row.analysis_id === item.analysis_id ? "is_on" : ""}>
                      <b>{show(row.overall_score)}</b>
                      <small>#{index + 1} · {when_label(row.created_at)}</small>
                      {delta != null ? <em className={delta > 0 ? "is_up" : delta < 0 ? "is_down" : ""}>{delta > 0 ? "+" : ""}{delta}</em> : null}
                    </li>
                  );
                })}
              </ol>
            </Section_Card> :
            null}
          {!item.summary && !item.feedback && history.length < 2 ? <p className="aim_empty">{ENGLISH.no_summary_was_returned_for_this_resume}</p> : null}
        </div> :
        null}

      {tab === "assessment" ?
        <div className="aim_iv_pane">
          <div className="aim_iv_split">
            <Section_Card icon={ICONS.check} title={ENGLISH.strengths} tone="green" count={item.strengths?.length || 0}>
              <Point_List items={item.strengths} tone="green" empty={ENGLISH.no_strengths_recorded} />
            </Section_Card>
            <Section_Card icon={ICONS.alert} title={ENGLISH.areas_to_improve} tone="rose" count={item.improvements?.length || 0}>
              <Point_List items={item.improvements} tone="rose" empty={ENGLISH.nothing_to_improve_listed} />
            </Section_Card>
          </div>
          <Section_Card icon={ICONS.missing} title={ENGLISH.missing_sections} tone="amber" count={item.missing_sections?.length || 0}>
            <Tag_List items={item.missing_sections} tone="amber" empty={ENGLISH.no_sections_missing} />
          </Section_Card>
          <Section_Card icon={ICONS.bulb} title={ENGLISH.action_plan} tone="indigo" count={item.recommendations?.length || 0}>
            <Point_List items={item.recommendations} numbered empty={ENGLISH.no_recommendations_recorded} />
          </Section_Card>
        </div> :
        null}

      {tab === "profile" ?
        <div className="aim_iv_pane">
          <div className="aim_iv_split">
            <Section_Card icon={ICONS.code} title={ENGLISH.technical_skills} tone="sky" count={item.technical_skills?.length || 0}>
              <Tag_List items={item.technical_skills} tone="sky" empty={ENGLISH.none_listed_2} />
            </Section_Card>
            <Section_Card icon={ICONS.heart} title={ENGLISH.soft_skills} tone="violet" count={item.soft_skills?.length || 0}>
              <Tag_List items={item.soft_skills} tone="violet" empty={ENGLISH.none_listed_2} />
            </Section_Card>
          </div>
          <Section_Card icon={ICONS.cap} title={ENGLISH.education} tone="indigo" count={item.education?.length || 0}>
            {item.education?.length ?
              <ol className="aim_timeline">
                {item.education.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
              </ol> :
              <p className="aim_muted">{ENGLISH.none_listed_2}</p>}
          </Section_Card>
          <Section_Card icon={ICONS.folder} title={ENGLISH.projects} tone="amber" count={item.projects?.length || 0}>
            {item.projects?.length ?
              <ul className="aim_projects">
                {item.projects.map((line, index) => {
                  const [name, ...rest] = String(line).split(/\s[–-]\s|:\s/);
                  return (
                    <li key={`${index}-${line}`}>
                      <b>{name}</b>
                      {rest.length ? <span>{rest.join(" – ")}</span> : null}
                    </li>
                  );
                })}
              </ul> :
              <p className="aim_muted">{ENGLISH.none_listed_2}</p>}
          </Section_Card>
          <Section_Card icon={ICONS.award} title={ENGLISH.certifications} tone="green" count={item.certifications?.length || 0}>
            <Point_List items={item.certifications} tone="green" empty={ENGLISH.no_certifications_listed} />
          </Section_Card>
        </div> :
        null}
    </div>
  );
}
