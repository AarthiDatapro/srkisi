import { log } from "@datapromr/log";
import { ai_backend_url } from "./ai_backend.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function compiler_language(value) {
  const name = String(value || "").trim().toLowerCase();
  if (name === "python" || name.startsWith("python")) return "python";
  if (name === "node" || name === "javascript" || name === "js" || name.includes("node")) return "node";
  return "";
}

export function parse_json(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function coding_cases(list) {
  return (Array.isArray(list) ? list : []).map((row, index) => {
    if (!row || typeof row !== "object") return null;
    const inputs = Array.isArray(row.inputs) ?
      row.inputs :
      row.input != null && row.input !== "" ? [row.input] : [];
    return {
      test_case: Number(row.test_case || index + 1),
      inputs,
      output: row.output ?? row.expected_output ?? null,
      error: row.error ?? null
    };
  }).filter(Boolean);
}

export function starter_code(exercise) {
  const name = String(exercise.function_name || "solve").trim() || "solve";
  const language = compiler_language(exercise.language);
  const signature = String(exercise.description || "").match(/def\s+\w+\(([^)]*)\)/i);
  const params = signature ?
    signature[1].split(",").map((part) => part.split(":")[0].trim()).filter(Boolean).join(", ") :
    "";
  if (language === "node") {
    return `function ${name}(${params}) {\n  // Write your code here\n}\n`;
  }
  return [
    `# ${name.replace(/_/g, " ")}`,
    "# Write your solution here.",
    "",
    `def ${name}(${params}):`,
    "    # Write your code here",
    "    pass",
    ""
  ].join("\n");
}

export function public_grade(result) {
  const { diagnostics, ...visible } = result;
  return visible;
}

export async function grade_code(exercise, student_code) {
  const language = compiler_language(exercise.language);
  if (!language) throw fail("This exercise language cannot be run yet");
  const code = String(student_code || "");
  if (!code.trim()) throw fail("Write some code before running it");
  if (code.length > 20000) throw fail("Code is too long");
  const cases = coding_cases(exercise.test_cases);
  if (!cases.length) throw fail("This exercise has no test cases");
  let errors = [];
  try {
    const parsed = parse_json(exercise.validation_errors);
    errors = Array.isArray(parsed) ? parsed : [];
  } catch {
    errors = [];
  }
  const response = await fetch(ai_backend_url("/api/compiler/submit"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      description: exercise.description || "",
      language,
      function_name: exercise.function_name,
      reference_code: exercise.reference_code || "",
      student_code: code,
      test_cases: cases,
      validation: {
        status: exercise.validation_status || "valid",
        errors
      }
    }),
    signal: AbortSignal.timeout(120000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const detail = data.detail;
    const message = typeof detail === "string" ? detail : detail?.message || data.message || "Unable to run this code";
    throw fail(message, response.status || 502);
  }
  return {
    status: data.status || "completed",
    passed: Number(data.passed || 0),
    failed: Number(data.failed || 0),
    total: Number(data.total || 0),
    score: Number(data.score || 0),
    results: Array.isArray(data.results) ? data.results : [],
    diagnostics: Array.isArray(data.diagnostics) ? data.diagnostics : []
  };
}

function failure_input(inputs) {
  if (Array.isArray(inputs) && inputs.length === 1) return inputs[0];
  return inputs;
}

export async function ask_code_help(exercise, student_code, result) {
  const failures = (result.diagnostics || []).
    filter((item) => item.passed === false).
    map((item) => ({
      input: failure_input(item.input),
      expected: item.expected,
      actual: item.actual,
      passed: false
    }));
  if (!failures.length) return "";
  try {
    const response = await fetch(ai_backend_url("/api/compiler/help"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_code,
        description: exercise.description || "",
        test_results: {
          passed: result.passed,
          failed: result.failed,
          total: result.total,
          failures
        }
      }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) return "";
    return String(data.help || "").trim();
  } catch (err) {
    log.fail("codingHelp", err.message);
    return "";
  }
}
