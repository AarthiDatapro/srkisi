export const VALUE_SOURCES = [
  {
    id: "student",
    label: "Students",
    table: "tbl_students",
    fields: [
      { id: "student.name", label: "Name" },
      { id: "student.college", label: "College" },
      { id: "student.higher_study", label: "Higher study" },
      { id: "student.state", label: "State" },
      { id: "student.pincode", label: "Pincode" },
      { id: "student.district", label: "District" },
      { id: "student.degree", label: "Degree" }
    ]
  },
  {
    id: "course",
    label: "Courses",
    table: "tbl_courses",
    fields: [
      { id: "course.course_name", label: "Course name" },
      { id: "course.course_code", label: "Course code" },
      { id: "course.level", label: "Level" },
      { id: "course.course_tagline", label: "Course tagline" }
    ]
  },
  {
    id: "hackathon",
    label: "Hackathons",
    table: "tbl_hackathons",
    fields: [
      { id: "hackathon.title", label: "Hackathon title" },
      { id: "hackathon.description", label: "Description" },
      { id: "hackathon.starts_at", label: "Starts at" },
      { id: "hackathon.ends_at", label: "Ends at" }
    ]
  },
  {
    id: "mock_interview",
    label: "Mock interviews",
    table: "tbl_student_mock_interviews",
    fields: [
      { id: "mock_interview.job_title", label: "Job title" },
      { id: "mock_interview.score", label: "Score" },
      { id: "mock_interview.sentiment_analysis_score", label: "Sentiment analysis score" },
      { id: "mock_interview.technical_score", label: "Technical score" }
    ]
  },
  {
    id: "program",
    label: "Programs",
    table: "tbl_programs",
    fields: [
      { id: "program.program_name", label: "Program name" },
      { id: "program.duration_months", label: "Duration months" },
      { id: "program.start_date", label: "Start date" },
      { id: "program.end_date", label: "End date" }
    ]
  }
];

const LABELS = Object.fromEntries(
  VALUE_SOURCES.flatMap((group) => group.fields.map((field) => [field.id, `${group.label}: ${field.label}`]))
);

export function source_label(source_id) {
  return LABELS[source_id] || "";
}

const TYPE_IDS = new Set([...VALUE_SOURCES.map((group) => group.id), "manual"]);

export function known_type(value) {
  return TYPE_IDS.has(String(value || "").trim()) ? String(value).trim() : "";
}

export function field_type(field) {
  if (field?.value_mode === "static" || field?.value_type === "manual") return "manual";
  return known_type(field?.value_type) || String(field?.value_source || "").split(".")[0] || "";
}

export function column_name(source_id) {
  return String(source_id || "").split(".")[1] || "";
}

export function type_label(group) {
  return group?.label || group?.id || "";
}

export function group_columns(groups, type_id) {
  return groups.find((group) => group.id === type_id)?.fields || [];
}

export function field_value_label(field, empty_label) {
  if (field?.value_mode === "static") return field.static_value || empty_label;
  return column_name(field?.value_source) || empty_label;
}

export function guess_source(field_key) {
  const key = String(field_key || "").toLowerCase();
  if (/\b(full name|student name|name)\b/.test(key) && !/\b(course|hackathon|program|job)\b/.test(key)) {
    return "student.name";
  }
  if (/\bcollege\b/.test(key)) return "student.college";
  if (/\bhigher\b/.test(key)) return "student.higher_study";
  if (/\bstate\b/.test(key)) return "student.state";
  if (/\bpincode|pin code\b/.test(key)) return "student.pincode";
  if (/\bdistrict\b/.test(key)) return "student.district";
  if (/\bdegree\b/.test(key)) return "student.degree";
  if (/\bcourse code\b/.test(key)) return "course.course_code";
  if (/\btagline\b/.test(key)) return "course.course_tagline";
  if (/\blevel\b/.test(key)) return "course.level";
  if (/\bcourse\b/.test(key)) return "course.course_name";
  if (/\b(hackathon|event)\b/.test(key) && /\bdesc/.test(key)) return "hackathon.description";
  if (/\b(hackathon|event)\b/.test(key)) return "hackathon.title";
  if (/\bstarts?\b/.test(key) && /\b(hackathon|event)\b/.test(key)) return "hackathon.starts_at";
  if (/\bends?\b/.test(key) && /\b(hackathon|event)\b/.test(key)) return "hackathon.ends_at";
  if (/\bsentiment\b/.test(key)) return "mock_interview.sentiment_analysis_score";
  if (/\btechnical\b/.test(key)) return "mock_interview.technical_score";
  if (/\b(job title|target role|job role)\b/.test(key)) return "mock_interview.job_title";
  if (/\b(overall score|mock score|interview score|score)\b/.test(key)) return "mock_interview.score";
  if (/\bduration\b/.test(key)) return "program.duration_months";
  if (/\bprogram\b/.test(key)) return "program.program_name";
  if (/\bstart date\b/.test(key)) return "program.start_date";
  if (/\bend date\b/.test(key)) return "program.end_date";
  return "";
}
