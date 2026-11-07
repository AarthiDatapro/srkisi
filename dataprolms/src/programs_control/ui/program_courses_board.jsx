import { useEffect, useMemo, useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Grid } from "@designdaddy/datagrid";
import { ActionButton, TrashIcon, ViewIcon } from "@datapromr/action-button";
import { Modal } from "@datapromr/modal";
import { Tabs } from "@datapromr/tabs";
import { get_course } from "../../course_manager/api.js";
import { Program_Course_Details } from "./program_course_details.jsx";
import { FACULTY_COLUMNS, GRID_THEME, PROGRAM_COURSE_COLUMNS, STUDENT_COLUMNS } from "../columns.js";
import { COPY } from "../constants.js";
import { face_tone, format_duration, format_program_day, format_short_date, initials_from_name } from "../utils.js";
import { Download_Icon, Plus_Icon, Students_Icon } from "./icons.jsx";
import { LMS_MEDIA_TABLET } from "../../design_system/breakpoints.js";
import { SCREEN } from "../../employee_authentication/screen_access.js";
import { screen_paths, use_slug_mirror } from "../../url_slugs.js";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

const TABS = [
{ id: "courses", get label() { return ENGLISH.courses; } },
{ id: "details", get label() { return ENGLISH.details; } },
{ id: "students", get label() { return ENGLISH.students; } },
{ id: "faculty", get label() { return ENGLISH.faculty; } }];


function use_narrow(query = LMS_MEDIA_TABLET) {
  const [narrow, set_narrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const on_change = () => set_narrow(media.matches);
    on_change();
    media.addEventListener("change", on_change);
    return () => media.removeEventListener("change", on_change);
  }, [query]);

  return narrow;
}

function type_tone(name = "") {
  const key = name.toLowerCase();
  if (key.includes("core")) return "core";
  if (key.includes("elect")) return "elective";
  if (key.includes("lab")) return "lab";
  return "plain";
}

function learning_label(value) {
  if (value === "in_progress") return ENGLISH.in_progress;
  if (value === "completed") return ENGLISH.completed;
  if (value === "not_started") return ENGLISH.not_started;
  return value || "";
}

function dash(value) {
  if (value == null || value === "") return "—";
  return value;
}

function course_search_text(courses = []) {
  return courses.
  map((course) =>
  [
  course.course_code,
  course.course_name,
  learning_label(course.learning_status),
  course.progress_percent != null ? `${Math.round(Number(course.progress_percent) || 0)}%` : "",
  course.status,
  course.role].

  filter(Boolean).
  join(" ")
  ).
  join(" | ");
}

function Course_Tags({ courses = [], show_status = false, compact = false, on_open }) {
  if (!courses.length) return <span>—</span>;
  return (
    <ul className="prg_desk_course_tags">
      {courses.map((course) => {
        const body =
        <>
            {compact ? null : <b>{course.course_code}</b>}
            <span>{course.course_name}</span>
            {show_status && course.learning_status ?
          <em className={`is-${course.learning_status}`}>
                {learning_label(course.learning_status)}
                {course.progress_percent != null ?
            ` · ${Math.round(Number(course.progress_percent) || 0)}%` :
            ""}
              </em> :
          null}
          </>;

        return (
          <li key={course.course_id}>
            {on_open ?
            <button type="button" className="prg_desk_course_tag" onClick={() => on_open(course)}>
                {body}
              </button> :

            <span className="prg_desk_course_tag">{body}</span>
            }
          </li>);

      })}
    </ul>);

}

function Person_Cell({ name, sub, status }) {
  return (
    <div className="prg_people_who">
      <span className="prg_people_face" style={{ background: face_tone(name) }}>
        {initials_from_name(name)}
      </span>
      <div className="prg_people_copy">
        <strong>
          {name || "—"}
          {status ?
          <span className={`prg_people_status ${status === "Active" ? "is_on" : "is_off"}`}>
              {status}
            </span> :
          null}
        </strong>
        {sub ? <small>{sub}</small> : null}
      </div>
    </div>);

}

function Status_Chip({ value }) {
  const on = value === ENGLISH.active;
  return <span className={`ub-status ub-status--${on ? "active" : "inactive"}`}>{value || "—"}</span>;
}

function Card_Search({ id, value, placeholder, on_change }) {
  return (
    <input
      id={id}
      className="prg_desk_card_search"
      value={value}
      placeholder={placeholder}
      onChange={(event) => on_change(event.target.value)} />);


}

function matches_query(query, parts) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => String(part || "").toLowerCase().includes(needle));
}

export function Program_Courses_Board({
  program,
  compact,
  courses = [],
  students = [],
  faculty = [],
  on_add_course,
  on_view_course,
  on_unassign
}) {
  const [course_detail, set_course_detail] = useState(null);
  const [tab, set_tab] = useState("courses");
  const [queries, set_queries] = useState({ courses: "", students: "", faculty: "" });

  use_slug_mirror(
    screen_paths(SCREEN.programs),
    {
      section: tab,
      courses_q: queries.courses,
      students_q: queries.students,
      faculty_q: queries.faculty
    },
    { section: "courses", courses_q: "", students_q: "", faculty_q: "" },
    (from_url) => {
      set_tab(from_url.section || "courses");
      set_queries({
        courses: from_url.courses_q || "",
        students: from_url.students_q || "",
        faculty: from_url.faculty_q || ""
      });
    }
  );

  function set_query(id, value) {
    set_queries((current) => ({ ...current, [id]: value }));
  }
  const fallback_narrow = use_narrow();
  const narrow = Boolean(compact) || fallback_narrow;

  const course_rows = useMemo(
    () =>
    courses.map((course) => ({
      ...course,
      id: course.course_id,
      status: course.is_active ? ENGLISH.active : ENGLISH.inactive_2
    })),
    [courses]
  );

  const student_rows = useMemo(
    () =>
    students.map((student) => ({
      ...student,
      id: student.student_id,
      status: student.is_active ? ENGLISH.active : ENGLISH.inactive_2,
      date_of_birth: format_short_date(student.date_of_birth),
      terms: student.terms_accepted ? ENGLISH.accepted : ENGLISH.not_accepted,
      terms_at: format_short_date(student.terms_accepted_at),
      joined_at: format_short_date(student.created_at),
      updated_at: format_short_date(student.updated_at),
      course_count: (student.courses || []).length,
      courses: course_search_text(student.courses),
      course_list: student.courses || []
    })),
    [students]
  );

  const faculty_rows = useMemo(
    () =>
    faculty.map((person) => ({
      ...person,
      id: person.employee_id,
      role: person.role || person.designation || "",
      course_count: (person.courses || []).length,
      courses: course_search_text(person.courses),
      course_list: person.courses || []
    })),
    [faculty]
  );

  const visible_courses = useMemo(
    () =>
    course_rows.filter((row) =>
    matches_query(queries.courses, [
      row.course_code,
      row.course_name,
      row.course_type,
      row.status,
      row.level,
      row.registered_students
    ])
    ),
    [queries.courses, course_rows]
  );

  const visible_students = useMemo(
    () =>
    student_rows.filter((row) =>
    matches_query(queries.students, [row.full_name, row.student_id, row.email, row.status])
    ),
    [queries.students, student_rows]
  );

  const visible_faculty = useMemo(
    () =>
    faculty_rows.filter((row) =>
    matches_query(queries.faculty, [row.full_name, row.email, row.employee_code, row.role, row.course_count])
    ),
    [queries.faculty, faculty_rows]
  );

  function export_csv() {
    const header = ENGLISH.course_code_course_title_type_duration_status_level;
    const rows = courses.map((course) =>
    [
    course.course_code,
    course.course_name,
    course.course_type || "",
    course.duration_hours ?? "",
    course.is_active ? ENGLISH.active : ENGLISH.inactive_2,
    course.level || "",
    Number(course.registered_students) || 0].

    map((value) => `"${String(value).replaceAll('"', '""')}"`).
    join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${program.program_code || "program"}-courses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function tab_label(item) {
    if (item.id === "courses") return narrow ? ENGLISH.courses_2(courses.length) : `${item.label} (${courses.length})`;
    if (item.id === "students") return narrow ? ENGLISH.students_3(students.length) : `${item.label} (${students.length})`;
    if (item.id === "faculty") return narrow ? ENGLISH.faculty_2(faculty.length) : `${item.label} (${faculty.length})`;
    return item.label;
  }

  function open_course_details(row) {
    set_course_detail(row);
    get_course(row.course_id).then(set_course_detail).catch(() => {});
  }

  function row_hit(row, child) {
    return (
      <button type="button" className="prg_desk_row_hit" onClick={() => on_view_course?.(row)}>
        {child}
      </button>);

  }

  function render_course_cell(column_id, row) {
    if (column_id === "course_type") {
      return row_hit(
        row,
        <span className={`prg_desk_type prg_desk_type_${type_tone(row.course_type)}`}>
          {row.course_type || "—"}
        </span>
      );
    }
    if (column_id === "duration_hours") {
      return row_hit(row, row.duration_hours != null ? ENGLISH.hours(row.duration_hours) : "—");
    }
    if (column_id === "status") {
      return row_hit(row, <Status_Chip value={row.status} />);
    }
    if (column_id === "registered_students") {
      const count = Number(row.registered_students) || 0;
      return row_hit(
        row,
        <span className="prg_students_count">
          <Students_Icon />
          {count}
        </span>
      );
    }
    return row_hit(row, dash(row[column_id]));
  }

  function render_course_actions(row) {
    return (
      <div className="prg_desk_row_actions">
        <ActionButton label={ENGLISH.view_details} onClick={() => open_course_details(row)}>
          <ViewIcon />
        </ActionButton>
        {on_unassign ?
        <ActionButton label={ENGLISH.remove_from_program} tone="danger" onClick={() => on_unassign(row)}>
            <TrashIcon />
          </ActionButton> :
        null}
      </div>);

  }

  function render_student_cell(column_id, row) {
    if (column_id === "full_name") {
      return <Person_Cell name={row.full_name} sub={row.student_id} />;
    }
    if (column_id === "status") {
      return <Status_Chip value={row.status} />;
    }
    if (column_id === "courses") {
      return <Course_Tags courses={row.course_list} show_status compact on_open={on_view_course} />;
    }
    return dash(row[column_id]);
  }

  function render_faculty_cell(column_id, row) {
    if (column_id === "full_name") {
      return <Person_Cell name={row.full_name} sub={row.email} />;
    }
    if (column_id === "courses") {
      return <Course_Tags courses={row.course_list} compact on_open={on_view_course} />;
    }
    return dash(row[column_id]);
  }

  return (
    <section className="prg_desk_board">
      <div className="prg_desk_tabbar">
        <Tabs
          className="prg_desk_tabs"
          items={TABS.map((item) => ({ ...item, label: tab_label(item) }))}
          value={tab}
          onChange={set_tab}
          aria-label={ENGLISH.program_sections} />
        
        {tab === "courses" ?
        <div className="prg_desk_board_tools">
            <button type="button" className="prg_desk_ghost" aria-label={ENGLISH.label_export} onClick={export_csv}>
              <Download_Icon />
              <span className="prg_desk_btn_text">{ENGLISH.label_export}</span>
            </button>
            {on_add_course ?
          <button type="button" className="prg_desk_add" aria-label={COPY.addCourse} onClick={on_add_course}>
                <Plus_Icon />
                <span className="prg_desk_btn_text">{COPY.addCourse}</span>
              </button> :
          null}
          </div> :
        null}
      </div>

      <div className={tab === "courses" ? undefined : "adm_panel_parked"}>
      {narrow ?
      <div className="prg_desk_cards_wrap">
            <Card_Search
          id="program_course_search"
          value={queries.courses}
          placeholder={ENGLISH.search_courses_2}
          on_change={(value) => set_query("courses", value)} />
        
            {visible_courses.length ?
        <ul className="prg_desk_cards">
                {visible_courses.map((row) =>
          <li key={row.course_id} className="prg_desk_card">
                    <button
              type="button"
              className="prg_desk_card_main"
              title={row.course_code}
              onClick={() => on_view_course?.(row)}>
              
                      <b>{row.course_name}</b>
                      <small>
                        {[
                row.course_code,
                row.course_type,
                row.duration_hours != null ? `${row.duration_hours}h` : null,
                row.status,
                ENGLISH.students_2(Number(row.registered_students) || 0)].

                filter(Boolean).
                join(" · ")}
                      </small>
                    </button>
                    {render_course_actions(row)}
                  </li>
          )}
              </ul> :

        <p className="prg_desk_empty_note">{COPY.noCourses}</p>
        }
          </div> :

      <div className="prg_desk_grid">
            <Grid
          className="prg_grid"
          theme={GRID_THEME}
          columns={PROGRAM_COURSE_COLUMNS}
          rows={course_rows}
          rowKey="course_id"
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          searchPlaceholder={ENGLISH.search_courses_2}
          emptyMessage={COPY.noCourses}
          emptyHint={ENGLISH.add_a_course_to_start_filling_this_program}
          tableAriaLabel={ENGLISH.program_courses}
          renderCell={render_course_cell}
          renderActions={render_course_actions} />
        
          </div>}
      </div>

      {tab === "details" ?
      <article className="prg_desk_detail">
          <header className="prg_desk_detail_head">
            <h3>{ENGLISH.program_details}</h3>
          </header>
          <dl className="prg_desk_detail_facts">
            <div>
              <dt>{ENGLISH.code}</dt>
              <dd>{program.program_code}</dd>
            </div>
            <div>
              <dt>{ENGLISH.title}</dt>
              <dd>{program.program_name}</dd>
            </div>
            <div>
              <dt>{ENGLISH.type}</dt>
              <dd>
                <span className={`prg_desk_type prg_desk_type_${type_tone(program.program_type)}`}>
                  {program.program_type || "—"}
                </span>
              </dd>
            </div>
            <div>
              <dt>{ENGLISH.duration}</dt>
              <dd>{format_duration(program.duration_months)}</dd>
            </div>
            <div>
              <dt>{ENGLISH.start_date}</dt>
              <dd>{format_program_day(program.start_date)}</dd>
            </div>
            <div>
              <dt>{ENGLISH.end_date}</dt>
              <dd>{format_program_day(program.end_date)}</dd>
            </div>
            <div>
              <dt>{ENGLISH.status}</dt>
              <dd>{program.is_active ? ENGLISH.active : ENGLISH.inactive_2}</dd>
            </div>
            <div>
              <dt>{ENGLISH.courses}</dt>
              <dd>{courses.length}</dd>
            </div>
          </dl>
          <div className="prg_desk_detail_block">
            <span>{ENGLISH.description}</span>
            <p className="prg_desk_detail_copy">
              <Link_Text text={program.description || ENGLISH.no_description_yet} />
            </p>
          </div>
          {courses.length ?
        <div className="prg_desk_detail_block">
              <span>{ENGLISH.course_list}</span>
              <ul className="prg_desk_topics">
                {courses.map((course) =>
            <li key={course.course_id}>{course.course_name}</li>
            )}
              </ul>
            </div> :
        null}
        </article> :
      null}

      <div className={tab === "students" ? undefined : "adm_panel_parked"}>
      {narrow ?
      <div className="prg_desk_cards_wrap">
            <Card_Search
          id="program_student_search"
          value={queries.students}
          placeholder={ENGLISH.search_students}
          on_change={(value) => set_query("students", value)} />
        
            {visible_students.length ?
        <ul className="prg_desk_cards">
                {visible_students.map((row) =>
          <li key={row.student_id} className="prg_desk_card prg_desk_card_person">
                    <Person_Cell
              name={row.full_name}
              sub={row.email || row.student_id}
              status={row.status} />
            
                    {row.course_list?.length ?
            <Course_Tags
              courses={row.course_list}
              show_status
              compact
              on_open={on_view_course} /> :

            null}
                  </li>
          )}
              </ul> :

        <p className="prg_desk_empty_note">{COPY.noStudents}</p>
        }
          </div> :

      <div className="prg_desk_grid">
            <Grid
          className="prg_grid"
          theme={GRID_THEME}
          columns={STUDENT_COLUMNS}
          rows={student_rows}
          rowKey="student_id"
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          searchPlaceholder={ENGLISH.search_any_student_field}
          emptyMessage={COPY.noStudents}
          emptyHint={ENGLISH.students_appear_here_after_they_enroll_in_this}
          tableAriaLabel={ENGLISH.program_students}
          renderCell={render_student_cell} />
        
          </div>}
      </div>

      <div className={tab === "faculty" ? undefined : "adm_panel_parked"}>
      {narrow ?
      <div className="prg_desk_cards_wrap">
            <Card_Search
          id="program_faculty_search"
          value={queries.faculty}
          placeholder={ENGLISH.search_faculty}
          on_change={(value) => set_query("faculty", value)} />
        
            {visible_faculty.length ?
        <ul className="prg_desk_cards">
                {visible_faculty.map((row) =>
          <li key={row.employee_id} className="prg_desk_card prg_desk_card_person">
                    <Person_Cell
              name={row.full_name}
              sub={[row.email, row.designation || row.role].filter(Boolean).join(" · ")} />
            
                  </li>
          )}
              </ul> :

        <p className="prg_desk_empty_note">{COPY.noFaculty}</p>
        }
          </div> :

      <div className="prg_desk_grid">
            <Grid
          className="prg_grid"
          theme={GRID_THEME}
          columns={FACULTY_COLUMNS}
          rows={faculty_rows}
          rowKey="employee_id"
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          searchPlaceholder={ENGLISH.search_any_faculty_field}
          emptyMessage={COPY.noFaculty}
          emptyHint={ENGLISH.faculty_appear_here_after_they_are_assigned_on}
          tableAriaLabel={ENGLISH.program_faculty}
          renderCell={render_faculty_cell} />
        
          </div>}
      </div>

      <Modal
        open={Boolean(course_detail)}
        title={ENGLISH.course_details}
        size="wide"
        onClose={() => set_course_detail(null)}>
        {course_detail ? <Program_Course_Details course={course_detail} /> : null}
      </Modal>
    </section>);

}
