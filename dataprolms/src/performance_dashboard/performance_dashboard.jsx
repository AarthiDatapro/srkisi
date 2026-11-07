import { useEffect, useMemo, useState } from "react";
import { useToast } from "@datapromr/toast";
import { get_performance_dashboard } from "./api.js";
import {
  Performance_Attendance,
  Performance_Course_Health,
  Performance_Daily_Reports,
  Performance_Exam_Score,
  Performance_Feedback,
  Performance_Filters,
  Performance_Header,
  Performance_Kpis,
  Performance_Latest_Exams,
  Performance_Learners,
  Performance_Notices,
  Performance_Today_Schedule
} from "./ui/index.js";
import "./theme/dashboard.css";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { id_from_named_slug, screen_paths, slug_with_id, use_slug_mirror } from "../url_slugs.js";

export function Performance_Dashboard() {
  const toast = useToast();
  const [data, set_data] = useState(null);
  const [cohort_id, set_cohort_id] = useState("");
  const [program_id, set_program_id] = useState("");
  const [course_id, set_course_id] = useState("");
  const [search, set_search] = useState("");
  const [loading, set_loading] = useState(true);

  use_slug_mirror(
    data ? screen_paths(SCREEN.performance) : "/__wait",
    {
      q: search,
      cohort: slug_with_id(
        data?.cohorts?.find((item) => String(item.cohort_id) === String(cohort_id))?.cohort_name,
        cohort_id
      ),
      program: slug_with_id(
        data?.programs?.find((item) => String(item.program_id) === String(program_id))?.program_name,
        program_id
      ),
      course: slug_with_id(
        data?.courses?.find((item) => String(item.course_id) === String(course_id))?.course_name,
        course_id
      )
    },
    { q: "", cohort: "", program: "", course: "" },
    (from_url) => {
      set_search(from_url.q || "");
      if (from_url.cohort) {
        set_cohort_id(id_from_named_slug(data?.cohorts, from_url.cohort, "cohort_id", "cohort_name"));
      }
      if (from_url.program) {
        set_program_id(id_from_named_slug(data?.programs, from_url.program, "program_id", "program_name"));
      }
      if (from_url.course) {
        set_course_id(id_from_named_slug(data?.courses, from_url.course, "course_id", "course_name"));
      }
    }
  );

  useEffect(() => {
    let alive = true;
    set_loading(true);
    get_performance_dashboard({
      cohort_id: cohort_id || undefined,
      program_id: program_id || undefined,
      course_id: course_id || undefined
    }).
    then((payload) => {
      if (!alive) return;
      set_data(payload);
      if (!cohort_id && payload.cohort?.cohort_id) {
        set_cohort_id(String(payload.cohort.cohort_id));
      }
      if (!program_id && payload.program?.program_id) {
        set_program_id(String(payload.program.program_id));
      }
      if (!payload.can_view_all_courses) {
        const next_course = payload.course_id ? String(payload.course_id) : "";
        if (next_course !== course_id) set_course_id(next_course);
      }
    }).
    catch((err) => {
      if (alive) toast.error(err.message);
    }).
    finally(() => {
      if (alive) set_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [cohort_id, program_id, course_id, toast]);

  const kpis = data?.kpis || {};
  const program = data?.program;
  const courses = data?.courses || [];
  const students = data?.students || [];
  const visible_students = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((item) => `${item.full_name} ${item.student_id}`.toLowerCase().includes(query));
  }, [search, students]);
  const feedback = data?.feedback || { average: 0, total: 0, stars: [0, 0, 0, 0, 0] };
  const attend_max = Math.max(...(data?.attendance_week || []).map((item) => Number(item.present) || 0), 1);
  const exam_avg = Number(data?.exams?.average || kpis.average_score || 0);

  return (
    <section className="po_desk">
      <header className="po_head">
        <Performance_Header program={program} cohort={data?.cohort} />
        <Performance_Filters
          cohort_id={cohort_id}
          program_id={program_id}
          course_id={course_id}
          cohorts={data?.cohorts || []}
          programs={data?.programs || []}
          courses={courses}
          can_view_all_courses={data?.can_view_all_courses}
          on_cohort_change={(value) => {
            set_cohort_id(value);
            set_program_id("");
            set_course_id("");
          }}
          on_program_change={(value) => {
            set_program_id(value);
            set_course_id("");
          }}
          on_course_change={set_course_id} />

      </header>

      <Performance_Kpis kpis={kpis} exam_avg={exam_avg} />

      <div className="po_layout">
        <div className="po_main">
          <Performance_Learners
            students={visible_students}
            search={search}
            set_search={set_search}
            loading={loading} />


          <Performance_Course_Health
            courses={data?.course_overview || []}
            loading={loading} />


          <Performance_Daily_Reports days={data?.days || []} />
        </div>

        <aside className="po_side">
          <Performance_Exam_Score
            exam_avg={exam_avg}
            progress_series={data?.progress_series || []} />


          <Performance_Latest_Exams exams={data?.exams?.items || []} />

          <Performance_Feedback feedback={feedback} />

          <Performance_Attendance
            attendance_week={data?.attendance_week || []}
            attendance_summary={data?.attendance_summary}
            attend_max={attend_max} />


          <Performance_Today_Schedule schedule={data?.schedule || []} />

          <Performance_Notices notices={data?.notices || []} />
        </aside>
      </div>
    </section>);

}
