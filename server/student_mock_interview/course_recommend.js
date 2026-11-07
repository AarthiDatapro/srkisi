import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";

const STOP = new Set([
  "the", "and", "for", "with", "your", "you", "this", "that", "from", "into",
  "review", "practise", "practice", "need", "more", "able", "using", "use",
  "knowledge", "skill", "skills", "gap", "gaps", "area", "areas", "basic",
  "good", "well", "also", "about", "have", "has", "had", "was", "were",
  "their", "them", "they", "should", "could", "would", "must", "improve",
  "improving", "better", "work", "working", "understand", "understanding",
  "candidate", "interview", "question", "answer", "overall", "strong",
  "weak", "some", "such", "than", "then", "when", "what", "which"
]);

const ALIAS = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  db: "database",
  dbs: "database",
  sql: "sql",
  ml: "machine",
  ai: "artificial",
  reactjs: "react",
  nodejs: "node",
  nextjs: "next",
  powerbi: "powerbi",
  devops: "devops",
  apis: "api",
  restful: "rest"
};

function words(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, " ")
    .split(/\s+/)
    .map((word) => ALIAS[word] || word)
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

function add_terms(bag, text, weight) {
  for (const word of words(text)) {
    bag.set(word, Math.max(bag.get(word) || 0, weight));
  }
}

function learn_text(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(" ");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).join(" ");
    } catch {
      return value;
    }
    return value;
  }
  return "";
}

function analysis_text(analysis) {
  if (!analysis || typeof analysis !== "object") return "";
  const skills = [
    ...(analysis.skills || []),
    ...(analysis.technical_skills || []),
    ...(analysis.missing_skills || []),
    ...(analysis.skill_gaps || [])
  ].map((item) => (typeof item === "string" ? item : item?.name || item?.skill || "")).join(" ");
  return [
    analysis.target_role,
    analysis.course_name,
    analysis.job_title,
    skills
  ].filter(Boolean).join(" ");
}

function signal_bag(item) {
  const bag = new Map();
  const performance = item?.performance || {};
  const gaps = Array.isArray(performance.gaps) ? performance.gaps : [];
  const strengths = Array.isArray(performance.strengths) ? performance.strengths : [];
  const tips = Array.isArray(performance.recommendations) ? performance.recommendations : [];
  const topics = Array.isArray(performance.topic_performance) ? performance.topic_performance : [];

  for (const gap of gaps) add_terms(bag, gap, 5);
  for (const tip of tips) add_terms(bag, tip, 3);
  for (const topic of topics) {
    const score = Number(topic?.average_score);
    const name = topic?.topic || "";
    if (!name) continue;
    if (Number.isFinite(score) && score < 6.5) add_terms(bag, name, 6);
    else add_terms(bag, name, 2);
  }
  for (const line of strengths) add_terms(bag, line, 1);
  add_terms(bag, analysis_text(item.analysis), 2);
  add_terms(bag, performance.target_role, 3);
  return bag;
}

function score_course(course, bag) {
  const title = new Set(words(`${course.course_name} ${course.course_code}`));
  const body = new Set(words(`${course.course_tagline} ${course.course_description} ${learn_text(course.learn_points)} ${course.level}`));
  let score = 0;
  const hits = [];
  for (const [term, weight] of bag) {
    if (title.has(term)) {
      score += weight * 3;
      hits.push(term);
    } else if (body.has(term)) {
      score += weight;
      hits.push(term);
    }
  }
  return { score, hits };
}

function reason_for(hits, performance) {
  const gaps = Array.isArray(performance?.gaps) ? performance.gaps : [];
  const topics = Array.isArray(performance?.topic_performance) ? performance.topic_performance : [];
  const weak = topics.find((topic) => {
    const score = Number(topic?.average_score);
    return Number.isFinite(score) && score < 6.5 && words(topic.topic).some((word) => hits.includes(word));
  });
  if (weak?.topic) return `Addresses a weak interview topic: ${weak.topic}`;
  const gap = gaps.find((line) => words(line).some((word) => hits.includes(word)));
  if (gap) return `Helps close this gap: ${gap}`;
  if (hits.length) return `Matches your interview skill gaps: ${hits.slice(0, 3).join(", ")}`;
  return "Relevant to this interview";
}

async function list_existing_courses() {
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT course_id, course_code, course_name, course_tagline, course_description,
            level, learn_points, thumbnail_url, duration_hours
     FROM tbl_courses
     WHERE is_deleted = FALSE AND is_active = TRUE`
  );
  return rows || [];
}

export async function recommend_courses(item) {
  if (!item?.performance) return [];
  const bag = signal_bag(item);
  if (!bag.size) return [];
  let courses = [];
  try {
    courses = await list_existing_courses();
  } catch (err) {
    log.fail("recommendMockInterviewCourses", err.message);
    return [];
  }

  return courses.
    map((course) => {
      const { score, hits } = score_course(course, bag);
      return {
        course_id: Number(course.course_id),
        course_code: course.course_code || "",
        course_name: course.course_name || "",
        course_tagline: course.course_tagline || "",
        level: course.level || "",
        thumbnail_url: course.thumbnail_url || "",
        duration_hours: course.duration_hours == null ? null : Number(course.duration_hours),
        reason: reason_for(hits, item.performance),
        score
      };
    }).
    filter((course) => course.course_id > 0 && course.course_name && course.score > 0).
    sort((left, right) => right.score - left.score || left.course_name.localeCompare(right.course_name)).
    slice(0, 6).
    map(({ score, ...course }) => course);
}

export async function with_course_recommendations(item) {
  if (!item) return item;
  if (item.status !== "completed" || !item.performance) {
    return { ...item, course_recommendations: [] };
  }
  return {
    ...item,
    course_recommendations: await recommend_courses(item)
  };
}
