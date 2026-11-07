import { useEffect, useState } from "react";
import { Modal } from "@datapromr/modal";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { check_attempt_workbook, check_attendance_workbook, check_course_workbook, check_quiz_workbook, check_registration_workbook, check_student_workbook, download_attempt_template, download_attendance_template, download_course_template, download_quiz_template, download_registration_template, download_student_template, import_attempt_workbook, import_attendance_workbook, import_course_workbook, import_quiz_workbook, import_registration_workbook, import_student_workbook } from "./api.js";
import {
  ATTENDANCE_IMPORT_CHECKS,
  ATTENDANCE_IMPORT_FIELDS,
  ATTENDANCE_IMPORT_MAPPING,
  ATTENDANCE_IMPORT_RECORD,
  ATTENDANCE_IMPORT_REPORT,
  ATTENDANCE_IMPORT_SECTIONS,
  ATTENDANCE_IMPORT_TEMPLATE } from
"./attendance_import_doc.js";
import {
  COURSE_IMPORT_CHECKS,
  COURSE_IMPORT_FIELDS,
  COURSE_IMPORT_MAPPING,
  COURSE_IMPORT_RECORD,
  COURSE_IMPORT_REPORT,
  COURSE_IMPORT_SECTIONS,
  COURSE_IMPORT_TEMPLATE } from
"./course_import_doc.js";
import {
  REGISTRATION_IMPORT_CHECKS,
  REGISTRATION_IMPORT_FIELDS,
  REGISTRATION_IMPORT_MAPPING,
  REGISTRATION_IMPORT_RECORD,
  REGISTRATION_IMPORT_REPORT,
  REGISTRATION_IMPORT_SECTIONS,
  REGISTRATION_IMPORT_TEMPLATE } from
"./registration_import_doc.js";
import {
  QUIZ_IMPORT_CHECKS,
  QUIZ_IMPORT_FIELDS,
  QUIZ_IMPORT_MAPPING,
  QUIZ_IMPORT_RECORD,
  QUIZ_IMPORT_REPORT,
  QUIZ_IMPORT_SECTIONS,
  QUIZ_IMPORT_TEMPLATE } from
"./quiz_import_doc.js";
import {
  ATTEMPT_IMPORT_CHECKS,
  ATTEMPT_IMPORT_FIELDS,
  ATTEMPT_IMPORT_MAPPING,
  ATTEMPT_IMPORT_RECORD,
  ATTEMPT_IMPORT_REPORT,
  ATTEMPT_IMPORT_SECTIONS,
  ATTEMPT_IMPORT_TEMPLATE } from
"./attempt_import_doc.js";
import {
  STUDENT_IMPORT_CHECKS,
  STUDENT_IMPORT_FIELDS,
  STUDENT_IMPORT_MAPPING,
  STUDENT_IMPORT_RECORD,
  STUDENT_IMPORT_SECTIONS,
  STUDENT_IMPORT_TEMPLATE } from
"./student_import_doc.js";
import "./theme/api_integration.css";
import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";

const SECTION_IDS = STUDENT_IMPORT_SECTIONS.map((item) => item.id);

function use_active_section(section_ids) {
  const key = section_ids.join("|");
  const [active, set_active] = useState(section_ids[0]);

  useEffect(() => {
    set_active(section_ids[0]);
    const nodes = section_ids.map((id) => document.getElementById(`api_${id}`)).filter(Boolean);
    if (!nodes.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) set_active(visible.target.id.replace(/^api_/, ""));
    }, { rootMargin: "-10% 0px -60% 0px", threshold: [0.2, 0.45] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [key]);

  return [active, set_active];
}

function report_stats(log) {
  const pick = (label) => {
    const match = String(log || "").match(new RegExp(`${label}\\s*:\\s*(\\d+)`));
    return match ? match[1] : "";
  };
  return [
    { get label() { return ENGLISH.rows; }, value: pick(ENGLISH.student_rows) },
    { get label() { return ENGLISH.to_insert; }, value: pick(ENGLISH.to_insert) },
    { get label() { return ENGLISH.already_in_lms; }, value: pick(ENGLISH.skipped_already_in_lms) },
    { get label() { return ENGLISH.missing_email_and_mobile; }, value: pick(ENGLISH.skipped_missing_email_and_mobile) },
    { get label() { return ENGLISH.older_duplicates; }, value: pick(ENGLISH.skipped_older_duplicate) }
  ].filter((item) => item.value !== "");
}

function Clause_Head({ index, title, lead }) {
  return (
    <header className="api_clause_head">
      <span>{String(index).padStart(2, "0")}</span>
      <div>
        <h2>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </div>
    </header>
  );
}

function attendance_stats(log) {
  const pick = (label) => {
    const match = String(log || "").match(new RegExp(label));
    return match ? match[1] : "";
  };
  return [
    { get label() { return ENGLISH.rows; }, value: pick(/Rows:\s*(\d+)/) },
    { get label() { return ENGLISH.to_save; }, value: pick(/To save\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.present; }, value: pick(/present\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.absent; }, value: pick(/absent\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.course_not_found; }, value: pick(/COURSE NAME NOT FOUND \((\d+)\)/) },
    { get label() { return ENGLISH.email_not_found; }, value: pick(/STUDENT EMAIL NOT FOUND \((\d+)\)/) }
  ].filter((item) => item.value !== "");
}

function course_stats(log) {
  const pick = (pattern) => {
    const match = String(log || "").match(pattern);
    return match ? match[1] : "";
  };
  const rows = [
    { get label() { return ENGLISH.rows; }, value: pick(/Rows:\s*(\d+)/) },
    { get label() { return ENGLISH.to_insert; }, value: pick(/To insert\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.paid; }, value: pick(/\bpaid\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.free; }, value: pick(/\bfree\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.already_in_lms; }, value: pick(/COURSE CODE ALREADY IN LMS \((\d+)\)/) },
    { get label() { return ENGLISH.modules; }, value: pick(/MODULES TO ADD \((\d+)\)/) },
    { get label() { return ENGLISH.lessons; }, value: pick(/LESSONS TO ADD \((\d+)\)/) },
    { get label() { return ENGLISH.type_to_add; }, value: pick(/TYPE WILL BE ADDED \((\d+)\)/) }
  ];
  return rows.filter((item) => item.value !== "" && (item.value !== "0" || item.label === ENGLISH.rows || item.label === ENGLISH.to_insert || item.label === ENGLISH.paid || item.label === ENGLISH.free));
}

function registration_stats(log) {
  const pick = (pattern) => {
    const match = String(log || "").match(pattern);
    return match ? match[1] : "";
  };
  return [
    { get label() { return ENGLISH.rows; }, value: pick(/Rows:\s*(\d+)/) },
    { get label() { return ENGLISH.to_register; }, value: pick(/To register\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.open_course_registrations; }, value: pick(/open course registrations\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.programs_to_add; }, value: pick(/programs to add\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.course_not_found; }, value: pick(/COURSE NAME NOT FOUND \((\d+)\)/) },
    { get label() { return ENGLISH.email_not_found; }, value: pick(/STUDENT EMAIL NOT FOUND \((\d+)\)/) }
  ].filter((item) => item.value !== "" && (item.value !== "0" || item.label === ENGLISH.rows || item.label === ENGLISH.to_register));
}

function quiz_stats(log) {
  const pick = (pattern) => {
    const match = String(log || "").match(pattern);
    return match ? match[1] : "";
  };
  return [
    { get label() { return ENGLISH.rows; }, value: pick(/Rows:\s*(\d+)/) },
    { get label() { return ENGLISH.to_add; }, value: pick(/To add\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.questions; }, value: pick(/questions to add\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.course_not_found; }, value: pick(/COURSE NAME NOT FOUND \((\d+)\)/) },
    { get label() { return ENGLISH.already_in_lms; }, value: pick(/QUIZ ALREADY IN LMS \((\d+)\)/) },
    { get label() { return ENGLISH.module_not_found; }, value: pick(/MODULE NOT FOUND \((\d+)\)/) }
  ].filter((item) => item.value !== "" && (item.value !== "0" || item.label === ENGLISH.rows || item.label === ENGLISH.to_add || item.label === ENGLISH.questions));
}

function attempt_stats(log) {
  const pick = (pattern) => {
    const match = String(log || "").match(pattern);
    return match ? match[1] : "";
  };
  return [
    { get label() { return ENGLISH.rows; }, value: pick(/Rows:\s*(\d+)/) },
    { get label() { return ENGLISH.to_add; }, value: pick(/To add\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.answers; }, value: pick(/answers to add\s*:\s*(\d+)/) },
    { get label() { return ENGLISH.course_not_found; }, value: pick(/COURSE NAME NOT FOUND \((\d+)\)/) },
    { get label() { return ENGLISH.quiz_not_found; }, value: pick(/QUIZ NAME NOT FOUND \((\d+)\)/) },
    { get label() { return ENGLISH.email_not_found; }, value: pick(/STUDENT EMAIL NOT FOUND \((\d+)\)/) },
    { get label() { return ENGLISH.already_in_lms; }, value: pick(/ATTEMPT ALREADY IN LMS \((\d+)\)/) }
  ].filter((item) => item.value !== "" && (item.value !== "0" || item.label === ENGLISH.rows || item.label === ENGLISH.to_add || item.label === ENGLISH.answers));
}

function Import_Panel({
  can_edit,
  on_check,
  on_import,
  read_stats,
  check_copy,
  ready_copy,
  closed_copy,
  button_label,
  modal_title,
  modal_copy,
  check_fallback,
  import_fallback,
  ask_label,
  ask_hint
}) {
  const [file, set_file] = useState(null);
  const [over, set_over] = useState(false);
  const [busy, set_busy] = useState("");
  const [error, set_error] = useState("");
  const [check, set_check] = useState(null);
  const [import_log, set_import_log] = useState("");
  const [confirm, set_confirm] = useState(false);
  const [ask, set_ask] = useState("");
  const ask_ready = !ask_label || Boolean(ask.trim());

  function take_file(next) {
    if (next && !String(next.name || "").toLowerCase().endsWith(".xlsx")) {
      set_file(null);
      set_check(null);
      set_import_log("");
      set_error(ENGLISH.upload_an_xlsx_workbook);
      return;
    }
    set_file(next);
    set_check(null);
    set_import_log("");
    set_error("");
    set_confirm(false);
  }

  async function run_check() {
    if (!file || busy || !ask_ready) return;
    set_busy("check");
    set_error("");
    set_import_log("");
    set_check(null);
    try {
      set_check(await on_check(file, ask.trim()));
    } catch (err) {
      set_error(err.details || err.message || check_fallback);
    } finally {
      set_busy("");
    }
  }

  async function run_import() {
    if (!check?.check_id || busy) return;
    set_busy("import");
    set_error("");
    try {
      const result = await on_import(check.check_id);
      set_import_log(result.log || ENGLISH.import_finished);
      set_check(null);
      set_confirm(false);
    } catch (err) {
      set_error(err.details || err.message || import_fallback);
      set_confirm(false);
    } finally {
      set_busy("");
    }
  }

  const stats = check?.log ? read_stats(check.log) : [];
  let status = ask_label && !ask_ready ? ENGLISH.enter_the_institution : ENGLISH.awaiting_workbook;
  if (busy === "check") status = ENGLISH.checking;
  else if (busy === "import") status = ENGLISH.importing;
  else if (import_log) status = ENGLISH.imported;
  else if (error) status = ENGLISH.needs_attention;
  else if (check) status = ENGLISH.fit_confirmed;
  else if (file) status = ENGLISH.ready_to_check;

  if (!can_edit) {
    return <p className="api_note">{ENGLISH.this_account_can_read_the_specification_and_download}</p>;
  }

  return (
    <div className="api_procedure">
      <div className="api_proc_bar">
        <strong>{ENGLISH.controlled_intake}</strong>
        <span className={check || import_log ? "is_ready" : ""}>{status}</span>
      </div>
      {ask_label ?
        <label className="api_ask">
          <span>{ask_label}</span>
          <input
            value={ask}
            maxLength={150}
            onChange={(event) => {
              set_ask(event.target.value);
              set_check(null);
              set_import_log("");
              set_error("");
              set_confirm(false);
            }} />
          <small>{ask_hint}</small>
        </label> :
        null}
      <div className="api_proc_grid">
        <section className={file ? "is_done" : "is_on"}>
          <header><span>1</span>{ENGLISH.file}</header>
          <label
            className={`api_drop ${file ? "is_ready" : ""} ${over ? "is_over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              set_over(true);
            }}
            onDragLeave={() => set_over(false)}
            onDrop={(event) => {
              event.preventDefault();
              set_over(false);
              if (!ask_ready) return;
              take_file(event.dataTransfer.files?.[0] || null);
            }}>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={!ask_ready}
              onChange={(event) => take_file(event.target.files?.[0] || null)} />
            <strong>{file ? file.name : ask_ready ? ENGLISH.select_workbook : ENGLISH.institution_name_first}</strong>
            <span>{file ? ENGLISH.replace_the_file_to_run_a_new_check : ENGLISH.xlsx_first_sheet_headers_on_row_1}</span>
          </label>
        </section>
        <section className={check ? "is_done" : file ? "is_on" : ""}>
          <header><span>2</span>{ENGLISH.check}</header>
          <p>{check_copy}</p>
          <button type="button" className="api_btn" disabled={!file || !ask_ready || Boolean(busy)} onClick={run_check}>
            {busy === "check" ? "Checking…" : ENGLISH.check_file}
          </button>
          {stats.length ?
            <ul className="api_stats">
              {stats.map((item) =>
                <li key={item.label}><strong>{item.value}</strong><span>{item.label}</span></li>
              )}
            </ul> :
            null}
        </section>
        <section className={check ? "is_on" : ""}>
          <header><span>3</span>{ENGLISH.label_import}</header>
          <p>{check ? ready_copy : closed_copy}</p>
          <button type="button" className="api_btn api_btn_import" disabled={!check || Boolean(busy)} onClick={() => set_confirm(true)}>
            {button_label}
          </button>
        </section>
      </div>
      {error ? <pre className="api_log api_log_error">{error}</pre> : null}
      {check?.log ?
        <details className="api_report api_report_check">
          <summary>{ENGLISH.check_report}</summary>
          <pre className="api_log">{check.log}</pre>
        </details> :
        null}
      {import_log ?
        <details className="api_report api_report_ok" open>
          <summary>{ENGLISH.import_result}</summary>
          <pre className="api_log">{import_log}</pre>
        </details> :
        null}
      <Modal open={confirm} title={modal_title} onClose={() => { if (!busy) set_confirm(false); }}>
        <div className="api_confirm">
          <p>{modal_copy}{ask_label && ask.trim() ? ENGLISH.the_institution_is_the_cohort(ask.trim()) : ""}</p>
          <div className="api_actions">
            <button type="button" className="api_btn" disabled={Boolean(busy)} onClick={() => set_confirm(false)}>{ENGLISH.cancel}</button>
            <button type="button" className="api_btn api_btn_import" disabled={Boolean(busy)} onClick={run_import}>
              {busy === "import" ? "Importing…" : ENGLISH.label_import_2}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Attendance_Paper({ can_edit }) {
  const [template_error, set_template_error] = useState("");

  async function save_template() {
    set_template_error("");
    try {
      await download_attendance_template();
    } catch (err) {
      set_template_error(err.message || ENGLISH.unable_to_download_the_template);
    }
  }

  return (
    <>
      <section id="api_att_description" className="api_clause">
        <Clause_Head
          index={1}
          title={ENGLISH.module_description}
          lead={ENGLISH.each_row_marks_one_student_present_or_absent} />
        <ul className="api_facts">
          <li><strong>{ENGLISH.course}</strong><span>{ENGLISH.course_name_is_matched_to_the_course_name}</span></li>
          <li><strong>{ENGLISH.student}</strong><span>{ENGLISH.the_email_is_matched_to_the_student_already}</span></li>
          <li><strong>{ENGLISH.mark}</strong><span>{ENGLISH.label_1_is_stored_as_present_0_is_stored}</span></li>
        </ul>
      </section>

      <section id="api_att_methods" className="api_clause">
        <Clause_Head
          index={2}
          title={ENGLISH.supported_import_methods}
          lead={ENGLISH.upload_the_workbook_on_this_page_check_reads} />
        <Import_Panel
          can_edit={can_edit}
          on_check={check_attendance_workbook}
          on_import={import_attendance_workbook}
          read_stats={attendance_stats}
          check_copy={ENGLISH.the_attendance_script_reports_the_fit_no_mark}
          ready_copy={ENGLISH.confirm_to_save_today_s_present_and_absent}
          closed_copy={ENGLISH.opens_after_a_clean_check}
          button_label={ENGLISH.import_attendance}
          modal_title={ENGLISH.import_this_attendance}
          modal_copy={ENGLISH.this_runs_scripts_importattendance_js_and_saves_today}
          check_fallback={ENGLISH.unable_to_check_the_workbook}
          import_fallback={ENGLISH.unable_to_import_attendance} />
      </section>

      <section id="api_att_fields" className="api_clause">
        <Clause_Head
          index={3}
          title={ENGLISH.required_and_optional_fields}
          lead={ENGLISH.all_three_columns_are_required_header_names_ignore} />
        <div className="api_table_wrap">
          <table className="api_spec">
            <thead>
              <tr>
                <th>{ENGLISH.field}</th>
                <th>{ENGLISH.status}</th>
                <th>{ENGLISH.accepted_headers}</th>
                <th>{ENGLISH.stored_as}</th>
                <th>{ENGLISH.rule}</th>
              </tr>
            </thead>
            <tbody>
              {ATTENDANCE_IMPORT_FIELDS.map((row) =>
                <tr key={row.field}>
                  <td><code>{row.field}</code></td>
                  <td><span className="api_req">{ENGLISH.mandatory}</span></td>
                  <td>{row.headers}</td>
                  <td><code>{row.stored}</code></td>
                  <td>{row.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="api_att_template" className="api_clause">
        <Clause_Head
          index={4}
          title={ENGLISH.downloadable_sample_template}
          lead={ENGLISH.the_first_sample_row_is_present_the_second} />
        <div className="api_attach">
        <div>
            <strong>{ENGLISH.attendance_sample_xlsx}</strong>
            <span>{ENGLISH.annex_sample_workbook}</span>
        </div>
          <button type="button" className="api_btn api_btn_solid" onClick={save_template}>{ENGLISH.download_template}</button>
        </div>
        {template_error ? <p className="api_note">{template_error}</p> : null}
        <div className="api_table_wrap">
          <table className="api_spec">
            <thead>
              <tr>
                {ATTENDANCE_IMPORT_TEMPLATE[0].map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {ATTENDANCE_IMPORT_TEMPLATE.slice(1).map((row) =>
                <tr key={row[1]}>
                  {row.map((cell, index) => <td key={`${row[1]}-${index}`}>{cell}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="api_att_mapping" className="api_clause">
        <Clause_Head
          index={5}
          title={ENGLISH.field_mapping_instructions}
          lead={ENGLISH.export_one_row_per_student_per_course_rename} />
        <ul className="api_pairs">
          {ATTENDANCE_IMPORT_MAPPING.map(([from, to]) =>
            <li key={from}>
              <span>{from}</span>
              <b aria-hidden="true">→</b>
              <strong>{to}</strong>
            </li>
          )}
        </ul>
      </section>

      <section id="api_att_api" className="api_clause">
        <Clause_Head
          index={6}
          title={ENGLISH.api_documentation_with_examples}
          lead={ENGLISH.both_calls_need_an_employee_session_with_edit} />
        <div className="api_exhibits">
          <figure className="api_sample">
            <figcaption>{ENGLISH.check_2}</figcaption>
            <pre>{`POST /api/api_integration/attendance/check
Content-Type: multipart/form-data
file: attendance.xlsx

{ "check_id": "…", "fitting": true, "log": "To save: 2" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.label_import_2}</figcaption>
            <pre>{`POST /api/api_integration/attendance/import
Content-Type: application/json

{ "check_id": "…" }

{ "imported": true, "log": "Saved: 2   Failed: 0" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.one_accepted_row}</figcaption>
            <pre>{ATTENDANCE_IMPORT_RECORD}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.report_when_a_course_or_email_is_missing}</figcaption>
            <pre>{ATTENDANCE_IMPORT_REPORT}</pre>
          </figure>
        </div>
          </section>

      <section id="api_att_validation" className="api_clause">
        <Clause_Head index={7} title={ENGLISH.validation_rules_errors_and_troubleshooting} />
        <ol className="api_rules">
          {ATTENDANCE_IMPORT_CHECKS.map((item) =>
            <li key={item.rule}>
              <strong>{item.rule}</strong>
              <span>{item.result}</span>
              </li>
          )}
        </ol>
      </section>
      <footer className="api_end">{ENGLISH.end_of_specification_attendance_import_datapro_lms}</footer>
    </>
  );
}

function Course_Paper({ can_edit }) {
  const [template_error, set_template_error] = useState("");

  async function save_template() {
    set_template_error("");
    try {
      await download_course_template();
    } catch (err) {
      set_template_error(err.message || ENGLISH.unable_to_download_the_template);
    }
  }

  return (
    <>
      <section id="api_crs_description" className="api_clause">
        <Clause_Head
          index={1}
          title={ENGLISH.module_description}
          lead={ENGLISH.each_accepted_row_becomes_one_course_type_level} />
        <ul className="api_facts">
          <li><strong>{ENGLISH.identity}</strong><span>{ENGLISH.course_code_and_course_name_are_required_a}</span></li>
          <li><strong>{ENGLISH.catalog}</strong><span>{ENGLISH.type_level_domain_and_tag_are_required_the}</span></li>
          <li><strong>{ENGLISH.outline}</strong><span>{ENGLISH.a_module_goes_to_tbl_course_modules_and}</span></li>
        </ul>
      </section>

      <section id="api_crs_methods" className="api_clause">
        <Clause_Head
          index={2}
          title={ENGLISH.supported_import_methods}
          lead={ENGLISH.upload_the_workbook_on_this_page_check_reads_2} />
        <Import_Panel
          can_edit={can_edit}
          on_check={check_course_workbook}
          on_import={import_course_workbook}
          read_stats={course_stats}
          check_copy={ENGLISH.the_course_script_reports_the_fit_no_course}
          ready_copy={ENGLISH.confirm_to_add_the_courses_marked_for_insert}
          closed_copy={ENGLISH.opens_after_a_clean_check}
          button_label={ENGLISH.import_courses}
          modal_title={ENGLISH.import_these_courses}
          modal_copy={ENGLISH.this_runs_scripts_importcourses_js_and_adds_the}
          check_fallback={ENGLISH.unable_to_check_the_workbook}
          import_fallback={ENGLISH.unable_to_import_courses} />
      </section>

      <section id="api_crs_fields" className="api_clause">
        <Clause_Head
          index={3}
          title={ENGLISH.required_and_optional_fields}
          lead={ENGLISH.course_code_course_name_type_level_domain_and} />
        <div className="api_table_wrap">
          <table className="api_spec">
            <thead>
              <tr>
                <th>{ENGLISH.field}</th>
                <th>{ENGLISH.status}</th>
                <th>{ENGLISH.accepted_headers}</th>
                <th>{ENGLISH.stored_as}</th>
                <th>{ENGLISH.rule}</th>
              </tr>
            </thead>
            <tbody>
              {COURSE_IMPORT_FIELDS.map((row) =>
                <tr key={row.field}>
                  <td><code>{row.field}</code></td>
                  <td><span className={row.required === "Required" ? "api_req" : "api_opt"}>{row.required === ENGLISH.required ? ENGLISH.mandatory : ENGLISH.optional}</span></td>
                  <td>{row.headers}</td>
                  <td><code>{row.stored}</code></td>
                  <td>{row.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="api_crs_template" className="api_clause">
        <Clause_Head
          index={4}
          title={ENGLISH.downloadable_sample_template}
          lead={ENGLISH.the_first_sample_course_has_a_module_and} />
        <div className="api_attach">
          <div>
            <strong>{ENGLISH.courses_sample_xlsx}</strong>
            <span>{ENGLISH.annex_sample_workbook}</span>
          </div>
          <button type="button" className="api_btn api_btn_solid" onClick={save_template}>{ENGLISH.download_template}</button>
        </div>
        {template_error ? <p className="api_note">{template_error}</p> : null}
        <div className="api_table_wrap">
          <table className="api_spec">
            <thead>
              <tr>
                {COURSE_IMPORT_TEMPLATE[0].map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {COURSE_IMPORT_TEMPLATE.slice(1).map((row, index) =>
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cell_index) => <td key={`${row[0]}-${cell_index}`}>{cell}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="api_crs_mapping" className="api_clause">
        <Clause_Head
          index={5}
          title={ENGLISH.field_mapping_instructions}
          lead={ENGLISH.export_one_row_per_course_rename_the_columns} />
        <ul className="api_pairs">
          {COURSE_IMPORT_MAPPING.map(([from, to]) =>
            <li key={from}>
              <span>{from}</span>
              <b aria-hidden="true">→</b>
              <strong>{to}</strong>
              </li>
          )}
            </ul>
          </section>

      <section id="api_crs_api" className="api_clause">
        <Clause_Head
          index={6}
          title={ENGLISH.api_documentation_with_examples}
          lead={ENGLISH.both_calls_need_an_employee_session_with_edit_2} />
        <div className="api_exhibits">
          <figure className="api_sample">
            <figcaption>{ENGLISH.check_2}</figcaption>
            <pre>{`POST /api/api_integration/courses/check
Content-Type: multipart/form-data
file: courses.xlsx

{ "check_id": "…", "fitting": true, "log": "To insert: 2" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.label_import_2}</figcaption>
            <pre>{`POST /api/api_integration/courses/import
Content-Type: application/json

{ "check_id": "…" }

{ "imported": true, "log": "Inserted: 2   Failed: 0" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.one_accepted_row}</figcaption>
            <pre>{COURSE_IMPORT_RECORD}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.report_for_modules_lessons_and_a_url_with}</figcaption>
            <pre>{COURSE_IMPORT_REPORT}</pre>
          </figure>
        </div>
      </section>

      <section id="api_crs_validation" className="api_clause">
        <Clause_Head index={7} title={ENGLISH.validation_rules_errors_and_troubleshooting} />
        <ol className="api_rules">
          {COURSE_IMPORT_CHECKS.map((item) =>
            <li key={item.rule}>
              <strong>{item.rule}</strong>
              <span>{item.result}</span>
            </li>
          )}
        </ol>
      </section>
      <footer className="api_end">{ENGLISH.end_of_specification_course_import_datapro_lms}</footer>
    </>
  );
}

function Registration_Paper({ can_edit }) {
  const [template_error, set_template_error] = useState("");

  async function save_template() {
    set_template_error("");
    try {
      await download_registration_template();
    } catch (err) {
      set_template_error(err.message || ENGLISH.unable_to_download_the_template);
    }
  }

  return (
    <>
      <section id="api_reg_description" className="api_clause">
        <Clause_Head
          index={1}
          title={ENGLISH.module_description}
          lead={ENGLISH.the_institution_name_becomes_the_cohort_each_batch} />
        <ul className="api_facts">
          <li><strong>{ENGLISH.program}</strong><span>{ENGLISH.batch_name_is_the_program_a_new_program}</span></li>
          <li><strong>{ENGLISH.registration}</strong><span>{ENGLISH.course_id_program_id_and_student_id_are}</span></li>
        </ul>
      </section>

      <section id="api_reg_methods" className="api_clause">
        <Clause_Head
          index={2}
          title={ENGLISH.supported_import_methods}
          lead={ENGLISH.enter_the_institution_then_upload_the_workbook_check} />
        <Import_Panel
          can_edit={can_edit}
          on_check={check_registration_workbook}
          on_import={import_registration_workbook}
          read_stats={registration_stats}
          check_copy={ENGLISH.the_registration_script_reports_the_fit_nothing_is}
          ready_copy={ENGLISH.confirm_to_add_the_cohort_programs_and_registrations}
          closed_copy={ENGLISH.opens_after_a_clean_check}
          button_label={ENGLISH.import_registrations}
          modal_title={ENGLISH.import_these_registrations}
          modal_copy={ENGLISH.this_runs_scripts_importregistrations_js_a_missing_course}
          check_fallback={ENGLISH.unable_to_check_the_workbook}
          import_fallback={ENGLISH.unable_to_import_registrations}
          ask_label={ENGLISH.institution_name}
          ask_hint={ENGLISH.this_name_is_the_cohort_the_workbook_stays} />
      </section>

      <section id="api_reg_fields" className="api_clause">
        <Clause_Head
          index={3}
          title={ENGLISH.required_and_optional_fields}
          lead={ENGLISH.batch_course_name_and_student_email_are_required} />
            <div className="api_table_wrap">
          <table className="api_spec">
                <thead>
                  <tr>
                    <th>{ENGLISH.field}</th>
                <th>{ENGLISH.status}</th>
                    <th>{ENGLISH.accepted_headers}</th>
                    <th>{ENGLISH.stored_as}</th>
                <th>{ENGLISH.rule}</th>
                  </tr>
                </thead>
                <tbody>
              {REGISTRATION_IMPORT_FIELDS.map((row) =>
                    <tr key={row.field}>
                      <td><code>{row.field}</code></td>
                  <td><span className={row.required.startsWith("Required") ? "api_req" : "api_opt"}>{row.required.startsWith(ENGLISH.optional) ? ENGLISH.optional : ENGLISH.mandatory}</span></td>
                      <td>{row.headers}</td>
                      <td><code>{row.stored}</code></td>
                      <td>{row.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

      <section id="api_reg_template" className="api_clause">
        <Clause_Head
          index={4}
          title={ENGLISH.downloadable_sample_template}
          lead={ENGLISH.both_rows_share_one_batch_the_institution_name} />
        <div className="api_attach">
          <div>
            <strong>{ENGLISH.registrations_sample_xlsx}</strong>
            <span>{ENGLISH.annex_sample_workbook}</span>
          </div>
          <button type="button" className="api_btn api_btn_solid" onClick={save_template}>{ENGLISH.download_template}</button>
        </div>
        {template_error ? <p className="api_note">{template_error}</p> : null}
            <div className="api_table_wrap">
          <table className="api_spec">
                <thead>
                  <tr>
                {REGISTRATION_IMPORT_TEMPLATE[0].map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
              {REGISTRATION_IMPORT_TEMPLATE.slice(1).map((row) =>
                <tr key={row[6]}>
                  {row.map((cell, index) => <td key={`${row[6]}-${index}`}>{cell}</td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

      <section id="api_reg_mapping" className="api_clause">
        <Clause_Head
          index={5}
          title={ENGLISH.field_mapping_instructions}
          lead={ENGLISH.one_row_is_one_student_on_one_course} />
        <ul className="api_pairs">
          {REGISTRATION_IMPORT_MAPPING.map(([from, to]) =>
            <li key={from}>
              <span>{from}</span>
              <b aria-hidden="true">→</b>
              <strong>{to}</strong>
            </li>
          )}
        </ul>
      </section>

      <section id="api_reg_api" className="api_clause">
        <Clause_Head
          index={6}
          title={ENGLISH.api_documentation_with_examples}
          lead={ENGLISH.both_calls_need_an_employee_session_with_edit_3} />
        <div className="api_exhibits">
          <figure className="api_sample">
            <figcaption>{ENGLISH.check_2}</figcaption>
            <pre>{`POST /api/api_integration/registrations/check
Content-Type: multipart/form-data
file: registrations.xlsx
institution_name: City College

{ "check_id": "…", "fitting": true, "log": "To register: 2" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.label_import_2}</figcaption>
            <pre>{`POST /api/api_integration/registrations/import
Content-Type: application/json

{ "check_id": "…" }

{ "imported": true, "log": "Registered: 2   Failed: 0" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.one_accepted_row}</figcaption>
            <pre>{REGISTRATION_IMPORT_RECORD}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.report_when_a_course_or_email_is_missing}</figcaption>
            <pre>{REGISTRATION_IMPORT_REPORT}</pre>
          </figure>
        </div>
      </section>

      <section id="api_reg_validation" className="api_clause">
        <Clause_Head index={7} title={ENGLISH.validation_rules_errors_and_troubleshooting} />
        <ol className="api_rules">
          {REGISTRATION_IMPORT_CHECKS.map((item) =>
            <li key={item.rule}>
              <strong>{item.rule}</strong>
              <span>{item.result}</span>
            </li>
          )}
            </ol>
      </section>
      <footer className="api_end">{ENGLISH.end_of_specification_registration_import_datapro_lms}</footer>
    </>
  );
}

function Quiz_Paper({ can_edit }) {
  const [template_error, set_template_error] = useState("");

  async function save_template() {
    set_template_error("");
    try {
      await download_quiz_template();
    } catch (err) {
      set_template_error(err.message || ENGLISH.unable_to_download_the_template);
    }
  }

  return (
    <>
      <section id="api_quiz_description" className="api_clause">
        <Clause_Head
          index={1}
          title={ENGLISH.module_description}
          lead={ENGLISH.each_quiz_name_on_a_course_becomes_one} />
        <ul className="api_facts">
          <li><strong>{ENGLISH.course}</strong><span>{ENGLISH.course_name_is_matched_to_tbl_courses_the}</span></li>
          <li><strong>{ENGLISH.quiz}</strong><span>{ENGLISH.quiz_name_is_stored_as_quiz_title_questions}</span></li>
          <li><strong>{ENGLISH.outline}</strong><span>{ENGLISH.a_course_content_row_of_type_quiz_is}</span></li>
        </ul>
      </section>

      <section id="api_quiz_methods" className="api_clause">
        <Clause_Head
          index={2}
          title={ENGLISH.supported_import_methods}
          lead={ENGLISH.upload_the_workbook_check_reports_every_missing_course} />
        <Import_Panel
          can_edit={can_edit}
          on_check={check_quiz_workbook}
          on_import={import_quiz_workbook}
          read_stats={quiz_stats}
          check_copy={ENGLISH.the_quiz_script_reports_the_fit_no_quiz}
          ready_copy={ENGLISH.confirm_to_add_the_quizzes_and_questions_the}
          closed_copy={ENGLISH.opens_after_a_clean_check}
          button_label={ENGLISH.import_quizzes}
          modal_title={ENGLISH.import_these_quizzes}
          modal_copy={ENGLISH.this_runs_scripts_importquizzes_js_a_missing_course}
          check_fallback={ENGLISH.unable_to_check_the_workbook}
          import_fallback={ENGLISH.unable_to_import_quizzes} />
      </section>

      <section id="api_quiz_fields" className="api_clause">
        <Clause_Head
          index={3}
          title={ENGLISH.required_and_optional_fields}
          lead={ENGLISH.course_name_quiz_name_question_options_and_the} />
            <div className="api_table_wrap">
          <table className="api_spec">
                <thead>
                  <tr>
                <th>{ENGLISH.field}</th>
                <th>{ENGLISH.status}</th>
                <th>{ENGLISH.accepted_headers}</th>
                <th>{ENGLISH.stored_as}</th>
                <th>{ENGLISH.rule}</th>
                  </tr>
                </thead>
                <tbody>
              {QUIZ_IMPORT_FIELDS.map((row) =>
                <tr key={row.field}>
                  <td><code>{row.field}</code></td>
                  <td><span className={row.required.startsWith("Required") ? "api_req" : "api_opt"}>{row.required.startsWith(ENGLISH.optional) ? ENGLISH.optional : ENGLISH.mandatory}</span></td>
                  <td>{row.headers}</td>
                  <td><code>{row.stored}</code></td>
                  <td>{row.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

      <section id="api_quiz_template" className="api_clause">
        <Clause_Head
          index={4}
          title={ENGLISH.downloadable_sample_template}
          lead={ENGLISH.both_rows_are_questions_on_one_quiz_the} />
        <div className="api_attach">
          <div>
            <strong>{ENGLISH.quizzes_sample_xlsx}</strong>
            <span>{ENGLISH.annex_sample_workbook}</span>
          </div>
          <button type="button" className="api_btn api_btn_solid" onClick={save_template}>{ENGLISH.download_template}</button>
        </div>
        {template_error ? <p className="api_note">{template_error}</p> : null}
        <div className="api_table_wrap">
          <table className="api_spec">
            <thead>
              <tr>
                {QUIZ_IMPORT_TEMPLATE[0].map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {QUIZ_IMPORT_TEMPLATE.slice(1).map((row, index) =>
                <tr key={`${row[4]}-${index}`}>
                  {row.map((cell, cell_index) => <td key={`${index}-${cell_index}`}>{cell}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="api_quiz_mapping" className="api_clause">
        <Clause_Head
          index={5}
          title={ENGLISH.field_mapping_instructions}
          lead={ENGLISH.one_row_is_one_question_rename_the_columns} />
        <ul className="api_pairs">
          {QUIZ_IMPORT_MAPPING.map(([from, to]) =>
            <li key={from}>
              <span>{from}</span>
              <b aria-hidden="true">→</b>
              <strong>{to}</strong>
            </li>
          )}
        </ul>
          </section>

      <section id="api_quiz_api" className="api_clause">
        <Clause_Head
          index={6}
          title={ENGLISH.api_documentation_with_examples}
          lead={ENGLISH.both_calls_need_an_employee_session_with_edit_4} />
        <div className="api_exhibits">
          <figure className="api_sample">
            <figcaption>{ENGLISH.check_2}</figcaption>
            <pre>{`POST /api/api_integration/quizzes/check
Content-Type: multipart/form-data
file: quizzes.xlsx

{ "check_id": "…", "fitting": true, "log": "To add: 1" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.label_import_2}</figcaption>
            <pre>{`POST /api/api_integration/quizzes/import
Content-Type: application/json

{ "check_id": "…" }

{ "imported": true, "log": "Saved quizzes: 1   Questions: 2   Failed: 0" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.one_accepted_quiz}</figcaption>
            <pre>{QUIZ_IMPORT_RECORD}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.report_when_a_course_or_quiz_is_missing}</figcaption>
            <pre>{QUIZ_IMPORT_REPORT}</pre>
          </figure>
        </div>
      </section>

      <section id="api_quiz_validation" className="api_clause">
        <Clause_Head index={7} title={ENGLISH.validation_rules_errors_and_troubleshooting} />
        <ol className="api_rules">
          {QUIZ_IMPORT_CHECKS.map((item) =>
            <li key={item.rule}>
              <strong>{item.rule}</strong>
              <span>{item.result}</span>
            </li>
          )}
        </ol>
      </section>
      <footer className="api_end">{ENGLISH.end_of_specification_quiz_import_datapro_lms}</footer>
    </>
  );
}

function Attempt_Paper({ can_edit }) {
  const [template_error, set_template_error] = useState("");

  async function save_template() {
    set_template_error("");
    try {
      await download_attempt_template();
    } catch (err) {
      set_template_error(err.message || ENGLISH.unable_to_download_the_template);
    }
  }

  return (
    <>
      <section id="api_attempt_description" className="api_clause">
        <Clause_Head
          index={1}
          title={ENGLISH.module_description}
          lead={ENGLISH.each_student_on_a_quiz_becomes_one_attempt} />
        <ul className="api_facts">
          <li><strong>{ENGLISH.ids}</strong><span>{ENGLISH.course_id_quiz_id_student_id_registration_id}</span></li>
          <li><strong>{ENGLISH.score}</strong><span>{ENGLISH.one_mark_for_each_correct_option_the_percent}</span></li>
          <li><strong>{ENGLISH.answers}</strong><span>{ENGLISH.each_chosen_option_is_stored_on_the_new}</span></li>
        </ul>
      </section>

      <section id="api_attempt_methods" className="api_clause">
        <Clause_Head
          index={2}
          title={ENGLISH.supported_import_methods}
          lead={ENGLISH.upload_the_workbook_check_reports_every_missing_course_2} />
        <Import_Panel
          can_edit={can_edit}
          on_check={check_attempt_workbook}
          on_import={import_attempt_workbook}
          read_stats={attempt_stats}
          check_copy={ENGLISH.the_attempt_script_reports_the_fit_no_attempt}
          ready_copy={ENGLISH.confirm_to_add_the_attempts_and_answers_the}
          closed_copy={ENGLISH.opens_after_a_clean_check}
          button_label={ENGLISH.import_attempts}
          modal_title={ENGLISH.import_these_quiz_attempts}
          modal_copy={ENGLISH.this_runs_scripts_importquizattempts_js_a_missing_course}
          check_fallback={ENGLISH.unable_to_check_the_workbook}
          import_fallback={ENGLISH.unable_to_import_quiz_attempts} />
      </section>

      <section id="api_attempt_fields" className="api_clause">
        <Clause_Head
          index={3}
          title={ENGLISH.required_and_optional_fields}
          lead={ENGLISH.course_quiz_student_email_question_and_the_selected} />
            <div className="api_table_wrap">
          <table className="api_spec">
                <thead>
                  <tr>
                <th>{ENGLISH.field}</th>
                <th>{ENGLISH.status}</th>
                <th>{ENGLISH.accepted_headers}</th>
                <th>{ENGLISH.stored_as}</th>
                    <th>{ENGLISH.rule}</th>
                  </tr>
                </thead>
                <tbody>
              {ATTEMPT_IMPORT_FIELDS.map((row) =>
                <tr key={row.field}>
                  <td><code>{row.field}</code></td>
                  <td><span className={row.required.startsWith("Required") ? "api_req" : "api_opt"}>{row.required.startsWith(ENGLISH.optional) ? ENGLISH.optional : ENGLISH.mandatory}</span></td>
                  <td>{row.headers}</td>
                  <td><code>{row.stored}</code></td>
                  <td>{row.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
      </section>

      <section id="api_attempt_template" className="api_clause">
        <Clause_Head
          index={4}
          title={ENGLISH.downloadable_sample_template}
          lead={ENGLISH.both_rows_are_answers_on_one_attempt_the} />
        <div className="api_attach">
          <div>
            <strong>{ENGLISH.quiz_attempts_sample_xlsx}</strong>
            <span>{ENGLISH.annex_sample_workbook}</span>
          </div>
          <button type="button" className="api_btn api_btn_solid" onClick={save_template}>{ENGLISH.download_template}</button>
        </div>
        {template_error ? <p className="api_note">{template_error}</p> : null}
        <div className="api_table_wrap">
          <table className="api_spec">
            <thead>
              <tr>
                {ATTEMPT_IMPORT_TEMPLATE[0].map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {ATTEMPT_IMPORT_TEMPLATE.slice(1).map((row, index) =>
                <tr key={`${row[4]}-${index}`}>
                  {row.map((cell, cell_index) => <td key={`${index}-${cell_index}`}>{cell}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="api_attempt_mapping" className="api_clause">
        <Clause_Head
          index={5}
          title={ENGLISH.field_mapping_instructions}
          lead={ENGLISH.one_row_is_one_answer_rename_the_columns} />
        <ul className="api_pairs">
          {ATTEMPT_IMPORT_MAPPING.map(([from, to]) =>
            <li key={from}>
              <span>{from}</span>
              <b aria-hidden="true">→</b>
              <strong>{to}</strong>
            </li>
          )}
            </ul>
          </section>

      <section id="api_attempt_api" className="api_clause">
        <Clause_Head
          index={6}
          title={ENGLISH.api_documentation_with_examples}
          lead={ENGLISH.both_calls_need_an_employee_session_with_edit_5} />
        <div className="api_exhibits">
          <figure className="api_sample">
            <figcaption>{ENGLISH.check_2}</figcaption>
            <pre>{`POST /api/api_integration/quiz_attempts/check
Content-Type: multipart/form-data
file: quiz_attempts.xlsx

{ "check_id": "…", "fitting": true, "log": "To add: 1" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.label_import_2}</figcaption>
            <pre>{`POST /api/api_integration/quiz_attempts/import
Content-Type: application/json

{ "check_id": "…" }

{ "imported": true, "log": "Saved attempts: 1   Answers: 2   Failed: 0" }`}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.one_accepted_attempt}</figcaption>
            <pre>{ATTEMPT_IMPORT_RECORD}</pre>
          </figure>
          <figure className="api_sample">
            <figcaption>{ENGLISH.report_when_a_quiz_or_the_answer_count}</figcaption>
            <pre>{ATTEMPT_IMPORT_REPORT}</pre>
          </figure>
        </div>
      </section>

      <section id="api_attempt_validation" className="api_clause">
        <Clause_Head index={7} title={ENGLISH.validation_rules_errors_and_troubleshooting} />
        <ol className="api_rules">
          {ATTEMPT_IMPORT_CHECKS.map((item) =>
            <li key={item.rule}>
              <strong>{item.rule}</strong>
              <span>{item.result}</span>
            </li>
          )}
        </ol>
      </section>
      <footer className="api_end">{ENGLISH.end_of_specification_quiz_attempt_import_datapro_lms}</footer>
    </>
  );
}

export function Api_Integration() {
  const { can_edit } = use_screen_access(SCREEN.api_integration);
  const [module, set_module] = useState("students");
  const sections = module === "attendance"
    ? ATTENDANCE_IMPORT_SECTIONS
    : module === "courses"
      ? COURSE_IMPORT_SECTIONS
      : module === "registrations"
        ? REGISTRATION_IMPORT_SECTIONS
        : module === "quizzes"
          ? QUIZ_IMPORT_SECTIONS
          : module === "quiz_attempts"
            ? ATTEMPT_IMPORT_SECTIONS
            : STUDENT_IMPORT_SECTIONS;
  const [active, set_active] = use_active_section(sections.map((item) => item.id));
  const [template_error, set_template_error] = useState("");

  function open_section(id) {
    set_active(id);
    document.getElementById(`api_${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save_template() {
    set_template_error("");
    try {
      await download_student_template();
    } catch (err) {
      set_template_error(err.message || ENGLISH.unable_to_download_the_template);
    }
  }

  return (
    <article className="api_desk">
      <header className="api_mast">
        <div>
          <p className="api_kicker">{ENGLISH.datapro_lms_official_specification}</p>
          <h1>{module === "attendance" ? ENGLISH.attendance_import : module === "courses" ? ENGLISH.course_import : module === "registrations" ? ENGLISH.registration_import : module === "quizzes" ? ENGLISH.quiz_import : module === "quiz_attempts" ? ENGLISH.quiz_attempt_import : ENGLISH.student_import}</h1>
        </div>
        <div className="api_switch">
          <button type="button" className={module === "students" ? "is_on" : ""} onClick={() => set_module("students")}>{ENGLISH.students}</button>
          <button type="button" className={module === "attendance" ? "is_on" : ""} onClick={() => set_module("attendance")}>{ENGLISH.attendance}</button>
          <button type="button" className={module === "courses" ? "is_on" : ""} onClick={() => set_module("courses")}>{ENGLISH.courses}</button>
          <button type="button" className={module === "registrations" ? "is_on" : ""} onClick={() => set_module("registrations")}>{ENGLISH.registrations}</button>
          <button type="button" className={module === "quizzes" ? "is_on" : ""} onClick={() => set_module("quizzes")}>{ENGLISH.quizzes}</button>
          <button type="button" className={module === "quiz_attempts" ? "is_on" : ""} onClick={() => set_module("quiz_attempts")}>{ENGLISH.quiz_attempts}</button>
        </div>
      </header>

      <div className="api_sheet">
        <nav className="api_index" aria-label={ENGLISH.specification_contents}>
          <p>{ENGLISH.contents}</p>
          {sections.map((item, index) =>
            <button
              key={item.id}
              type="button"
              className={active === item.id ? "is_on" : ""}
              onClick={() => open_section(item.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          )}
        </nav>

        <div className="api_paper">
          {module === "attendance" ? <Attendance_Paper can_edit={can_edit} /> : module === "courses" ? <Course_Paper can_edit={can_edit} /> : module === "registrations" ? <Registration_Paper can_edit={can_edit} /> : module === "quizzes" ? <Quiz_Paper can_edit={can_edit} /> : module === "quiz_attempts" ? <Attempt_Paper can_edit={can_edit} /> : <>
          <section id="api_description" className="api_clause">
            <Clause_Head
              index={1}
              title={ENGLISH.module_description}
              lead={ENGLISH.each_accepted_row_becomes_one_student_sign_in} />
            <ul className="api_facts">
              <li><strong>{ENGLISH.identity}</strong><span>{ENGLISH.email_and_mobile_number_are_required_on_every}</span></li>
              <li><strong>{ENGLISH.password}</strong><span>{ENGLISH.a_value_in_the_file_is_encrypted_before}</span></li>
              <li><strong>{ENGLISH.profile}</strong><span>{ENGLISH.name_gender_date_of_birth_college_study_and}</span></li>
            </ul>
          </section>

          <section id="api_methods" className="api_clause">
            <Clause_Head
              index={2}
              title={ENGLISH.supported_import_methods}
              lead={ENGLISH.one_method_is_published_an_excel_workbook_header} />
            <Import_Panel
              can_edit={can_edit}
              on_check={check_student_workbook}
              on_import={import_student_workbook}
              read_stats={report_stats}
              check_copy={ENGLISH.the_import_script_reports_the_fit_no_student}
              ready_copy={ENGLISH.confirm_to_add_the_students_marked_for_insert}
              closed_copy={ENGLISH.opens_after_a_clean_check}
              button_label={ENGLISH.import_students}
              modal_title={ENGLISH.import_these_students}
              modal_copy={ENGLISH.this_runs_scripts_importstudents_js_and_adds_the}
              check_fallback={ENGLISH.unable_to_check_the_workbook}
              import_fallback={ENGLISH.unable_to_import_students} />
          </section>

          <section id="api_fields" className="api_clause">
            <Clause_Head
              index={3}
              title={ENGLISH.required_and_optional_fields}
              lead={ENGLISH.keep_the_columns_you_have_email_and_mobile} />
            <div className="api_table_wrap">
              <table className="api_spec">
                <thead>
                  <tr>
                    <th>{ENGLISH.field}</th>
                    <th>{ENGLISH.status}</th>
                    <th>{ENGLISH.accepted_headers}</th>
                    <th>{ENGLISH.stored_as}</th>
                    <th>{ENGLISH.rule}</th>
                  </tr>
                </thead>
                <tbody>
                  {STUDENT_IMPORT_FIELDS.map((row) =>
                    <tr key={row.field}>
                      <td><code>{row.field}</code></td>
                      <td><span className={row.required === "Required" ? "api_req" : "api_opt"}>{row.required === ENGLISH.required ? ENGLISH.mandatory : ENGLISH.optional}</span></td>
                      <td>{row.headers}</td>
                      <td><code>{row.stored}</code></td>
                      <td>{row.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="api_template" className="api_clause">
            <Clause_Head
              index={4}
              title={ENGLISH.downloadable_sample_template}
              lead={ENGLISH.the_second_row_keeps_a_name_email_and} />
            <div className="api_attach">
              <div>
                <strong>{ENGLISH.students_import_template_xlsx}</strong>
                <span>{ENGLISH.annex_sample_workbook}</span>
              </div>
              <button type="button" className="api_btn api_btn_solid" onClick={save_template}>{ENGLISH.download_template}</button>
            </div>
            {template_error ? <p className="api_note">{template_error}</p> : null}
            <div className="api_table_wrap">
              <table className="api_spec">
                <thead>
                  <tr>
                    {STUDENT_IMPORT_TEMPLATE[0].map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {STUDENT_IMPORT_TEMPLATE.slice(1).map((row) =>
                    <tr key={row[2]}>
                      {row.map((cell, index) => <td key={`${row[2]}-${index}`}>{cell || "—"}</td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="api_mapping" className="api_clause">
            <Clause_Head
              index={5}
              title={ENGLISH.field_mapping_instructions}
              lead={ENGLISH.export_one_row_per_student_rename_columns_to} />
            <ol className="api_order">
              <li>{ENGLISH.export_one_row_per_student_from_the_other}</li>
              <li>{ENGLISH.rename_each_column_to_the_header_on_the}</li>
              <li>{ENGLISH.keep_email_and_mobile_exactly_as_the_person}</li>
              <li>{ENGLISH.return_to_supported_import_methods_check_the_file}</li>
            </ol>
            <ul className="api_pairs">
              {STUDENT_IMPORT_MAPPING.map(([from, to]) =>
                <li key={from}>
                  <span>{from}</span>
                  <b aria-hidden="true">→</b>
                  <strong>{to}</strong>
                </li>
              )}
            </ul>
          </section>

          <section id="api_api" className="api_clause">
            <Clause_Head
              index={6}
              title={ENGLISH.api_documentation_with_examples}
              lead={ENGLISH.both_calls_need_an_employee_session_with_edit_6} />
            <div className="api_exhibits">
              <figure className="api_sample">
                <figcaption>{ENGLISH.check_2}</figcaption>
                <pre>{`POST /api/api_integration/students/check
Content-Type: multipart/form-data
file: students.xlsx

{ "check_id": "…", "fitting": true, "log": "To insert: 2" }`}</pre>
              </figure>
              <figure className="api_sample">
                <figcaption>{ENGLISH.label_import_2}</figcaption>
                <pre>{`POST /api/api_integration/students/import
Content-Type: application/json

{ "check_id": "…" }

{ "imported": true, "log": "Inserted: 2   Failed: 0" }`}</pre>
              </figure>
              <figure className="api_sample api_sample_wide">
                <figcaption>{ENGLISH.one_accepted_row}</figcaption>
                <pre>{STUDENT_IMPORT_RECORD}</pre>
              </figure>
            </div>
            <p className="api_note">{ENGLISH.the_password_in_this_example_is_the_value}</p>
          </section>

          <section id="api_validation" className="api_clause">
            <Clause_Head index={7} title={ENGLISH.validation_rules_errors_and_troubleshooting} />
            <ol className="api_rules">
              {STUDENT_IMPORT_CHECKS.map((item) =>
                <li key={item.rule}>
                  <strong>{item.rule}</strong>
                  <span>{item.result}</span>
                </li>
              )}
            </ol>
            <div className="api_quiet">
              <h3>{ENGLISH.if_the_file_seems_to_do_nothing}</h3>
              <ol>
                <li>
                  <strong>{ENGLISH.workbook}</strong>
                  <span>{ENGLISH.the_upload_is_an_xlsx_file_and_the}</span>
                </li>
                <li>
                  <strong>{ENGLISH.required_cells}</strong>
                  <span>{ENGLISH.every_kept_row_has_a_valid_email_and}</span>
                </li>
                <li>
                  <strong>{ENGLISH.already_in_the_lms}</strong>
                  <span>{ENGLISH.a_large_already_in_lms_count_means_those}</span>
                </li>
                <li>
                  <strong>{ENGLISH.import_stays_closed}</strong>
                  <span>{ENGLISH.import_opens_only_after_check_file_finishes_cleanly}</span>
                </li>
              </ol>
            </div>
          </section>

          <footer className="api_end">{ENGLISH.end_of_specification_student_import_datapro_lms}</footer>
          </>}
        </div>
      </div>
    </article>
  );
}
