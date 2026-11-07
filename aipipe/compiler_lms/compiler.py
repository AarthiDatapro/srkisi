from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any

import requests
from aipipe import LLM

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths and configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
QUESTION_FILE = BASE_DIR / "test_outputs.json"

CONFIG_PATH = BASE_DIR.parent / "config" / "llm.yaml"

JUDGE0_URL = os.getenv("JUDGE0_URL", "http://127.0.0.1:2358").rstrip("/")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "").strip()
JUDGE0_TIMEOUT_SECONDS = float(os.getenv("JUDGE0_TIMEOUT_SECONDS", "20"))

# Judge0 CE standard language IDs. Verify these IDs against your own instance.
JUDGE0_LANGUAGE_IDS = {
    "python": 71,  # Python 3
    "node": 63,    # JavaScript (Node.js)
}


def get_llm():
    """Create the AIPipe LLM from the project's config/llm.yaml."""
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"LLM config file not found: {CONFIG_PATH}")
    return LLM.from_config(str(CONFIG_PATH))


# ---------------------------------------------------------------------------
# Judge0 execution
# ---------------------------------------------------------------------------

def _judge0_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    # Most self-hosted Judge0 CE installations do not require an API key.
    # If your deployment requires a token, configure JUDGE0_API_KEY server-side.
    if JUDGE0_API_KEY:
        headers["X-Auth-Token"] = JUDGE0_API_KEY
    return headers


def _judge0_execute(source_code: str, language_id: int) -> tuple[str | None, str | None]:
    """Execute source code on Judge0 and return (stdout, error)."""
    submit_url = f"{JUDGE0_URL}/submissions?base64_encoded=false&wait=true"
    payload = {
        "language_id": language_id,
        "source_code": source_code,
        "stdin": "",
        "cpu_time_limit": 5,
        "wall_time_limit": 10,
        "memory_limit": 128000,
    }

    try:
        response = requests.post(
            submit_url,
            json=payload,
            headers=_judge0_headers(),
            timeout=JUDGE0_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        result = response.json()

        # Some Judge0 installations do not support wait=true and return a token.
        token = result.get("token")
        status_id = (result.get("status") or {}).get("id")
        if token and status_id in (None, 1, 2):
            deadline = time.monotonic() + JUDGE0_TIMEOUT_SECONDS
            while time.monotonic() < deadline:
                poll = requests.get(
                    f"{JUDGE0_URL}/submissions/{token}?base64_encoded=false",
                    headers=_judge0_headers(),
                    timeout=5,
                )
                poll.raise_for_status()
                result = poll.json()
                status_id = (result.get("status") or {}).get("id")
                if status_id not in (None, 1, 2):
                    break
                time.sleep(0.25)
            else:
                return None, "Judge0 execution timed out while waiting for a result."

        status = (result.get("status") or {}).get("description", "Unknown")
        stdout = (result.get("stdout") or "").strip()
        stderr = (result.get("stderr") or "").strip()
        compile_output = (result.get("compile_output") or "").strip()
        message = (result.get("message") or "").strip()

        if status != "Accepted":
            error = stderr or compile_output or message or f"Judge0 status: {status}"
            return None, error
        if not stdout:
            return None, "Function produced no output."
        return stdout, None

    except requests.Timeout:
        return None, f"Judge0 request timed out after {JUDGE0_TIMEOUT_SECONDS:g} seconds."
    except requests.RequestException as exc:
        logger.exception("Judge0 request failed")
        return None, f"Could not reach Judge0 at {JUDGE0_URL}: {exc}"
    except (ValueError, TypeError) as exc:
        return None, f"Invalid response from Judge0: {exc}"


def execute_python(code: str, function_name: str, inputs: list[Any]):
    """Run a Python function with positional inputs through Judge0."""
    inputs_json = json.dumps(inputs, ensure_ascii=False)
    runner = f"""
import json
{code}

_inputs = json.loads({json.dumps(inputs_json)})
_result = {function_name}(*_inputs)
print(json.dumps(_result, ensure_ascii=False, separators=(",", ":")))
"""
    stdout, error = _judge0_execute(runner, JUDGE0_LANGUAGE_IDS["python"])
    if error:
        return None, error
    try:
        return json.loads(stdout), None
    except json.JSONDecodeError:
        return None, f"Function output was not valid JSON: {stdout[:300]}"


def execute_node(code: str, function_name: str, inputs: list[Any]):
    """Run a JavaScript/Node function with positional inputs through Judge0."""
    inputs_json = json.dumps(inputs, ensure_ascii=False)
    # function_name is validated before this call and comes from the generated question.
    runner = f"""
{code}

const _inputs = {inputs_json};
const _result = {function_name}(..._inputs);
console.log(JSON.stringify(_result));
"""
    stdout, error = _judge0_execute(runner, JUDGE0_LANGUAGE_IDS["node"])
    if error:
        return None, error
    try:
        return json.loads(stdout), None
    except json.JSONDecodeError:
        return None, f"Function output was not valid JSON: {stdout[:300]}"


# ---------------------------------------------------------------------------
# JSON parsing and question generation
# ---------------------------------------------------------------------------

def extract_json(text: str) -> dict[str, Any]:
    """Extract one JSON object from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        raise ValueError("LLM did not return a valid JSON object.")
    value = json.loads(text[start:end + 1])
    if not isinstance(value, dict):
        raise ValueError("LLM response must be a JSON object.")
    return value


def generate_compiler_question(prompt: str, language: str = "python") -> dict[str, Any]:
    """Generate a function-based question in the teacher-selected language."""
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    language = (language or "python").lower().strip()
    if language not in JUDGE0_LANGUAGE_IDS:
        supported = ", ".join(JUDGE0_LANGUAGE_IDS)
        raise ValueError(f"Unsupported language '{language}'. Supported languages: {supported}.")

    llm = get_llm()
    system_prompt = """
You generate programming questions for an LMS coding assessment.
Return ONLY a valid JSON object with this exact structure:
{
  "description": "problem statement",
  "language": "{language}",
  "function_name": "functionName",
  "reference_code": "complete correct function implementation",
  "test_cases": [
    {"inputs": [arg1, arg2]}
  ]
}

Rules:
1. The language field MUST be exactly "{language}". Do not choose or change the language.
2. The question must require implementing a function.
3. function_name must be a valid function identifier and be explicitly provided.
4. reference_code must contain the complete correct function.
5. Do not use stdin/input() and do not print the answer from the function.
6. The function must return the answer.
7. Include at least 5 test cases.
8. Each test case must contain only an "inputs" array; do not provide expected outputs.
9. Include normal cases and edge cases.
10. Use valid syntax for the selected language.
11. Return JSON only, without Markdown fences or text outside JSON.
"""
    system_prompt = system_prompt.replace("{language}", language)
    user_prompt = f"Create a programming question in {language} based on this requirement:\n{prompt.strip()}"
    response = llm.generate(system_prompt + "\n\n" + user_prompt)
    if hasattr(response, "content"):
        response = response.content

    question = extract_json(str(response))
    validate_generated_question(question)
    if question["language"] != language:
        raise ValueError(
            f"The model returned language '{question['language']}' instead of the selected language '{language}'. Please generate again."
        )

    return compile_function(
        description=question["description"],
        language=question["language"],
        function_name=question["function_name"],
        code=question["reference_code"],
        test_cases=question["test_cases"],
    )


def validate_generated_question(question: dict[str, Any]) -> None:
    required = ("description", "language", "function_name", "reference_code", "test_cases")
    for field in required:
        if field not in question:
            raise ValueError(f"Missing required field: {field}")

    for field in ("description", "function_name", "reference_code"):
        if not isinstance(question[field], str) or not question[field].strip():
            raise ValueError(f"{field} cannot be empty.")

    language = question["language"].lower().strip()
    if language not in JUDGE0_LANGUAGE_IDS:
        supported = ", ".join(JUDGE0_LANGUAGE_IDS)
        raise ValueError(f"Unsupported language. Supported languages: {supported}.")
    question["language"] = language

    function_name = question["function_name"].strip()
    if not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", function_name):
        raise ValueError("function_name must be a valid function identifier.")
    if not isinstance(question["test_cases"], list):
        raise ValueError("test_cases must be a list.")
    if len(question["test_cases"]) < 5:
        raise ValueError("At least 5 test cases are required.")

    for index, case in enumerate(question["test_cases"], start=1):
        if not isinstance(case, dict) or "inputs" not in case:
            raise ValueError(f"Test case {index} must contain an inputs field.")
        if not isinstance(case["inputs"], list):
            raise ValueError(f"Test case {index} inputs must be a list.")


# ---------------------------------------------------------------------------
# Compile reference implementation and build expected outputs
# ---------------------------------------------------------------------------

def compile_function(
    description: str,
    language: str,
    function_name: str,
    code: str,
    test_cases: list[dict[str, Any]],
) -> dict[str, Any]:
    language = language.lower().strip()
    if language not in JUDGE0_LANGUAGE_IDS:
        raise ValueError("Unsupported language.")
    if not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", function_name):
        raise ValueError("Invalid function name.")

    outputs = []
    for index, test_case in enumerate(test_cases, start=1):
        inputs = test_case["inputs"]
        if language == "python":
            output, error = execute_python(code, function_name, inputs)
        else:
            output, error = execute_node(code, function_name, inputs)

        outputs.append({
            "test_case": index,
            "inputs": inputs,
            "output": output,
            "error": error,
        })

    errors = [item for item in outputs if item["error"] is not None]
    return {
        "description": description,
        "language": language,
        "function_name": function_name,
        "reference_code": code,
        "test_cases": outputs,
        "validation": {
            "status": "invalid" if errors else "valid",
            "errors": errors,
        },
    }


# ---------------------------------------------------------------------------
# Save/load teacher-approved question
# ---------------------------------------------------------------------------

def save_compiler_question(question: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(question, dict):
        raise ValueError("question must be a JSON object.")

    validation = question.get("validation", {})
    if validation.get("status") != "valid":
        raise ValueError("Question cannot be saved because reference execution failed.")

    # Validate the compiled representation before writing it.
    required = ("description", "language", "function_name", "reference_code", "test_cases")
    for field in required:
        if field not in question:
            raise ValueError(f"Missing required field: {field}")
    if question["language"] not in JUDGE0_LANGUAGE_IDS:
        raise ValueError("Unsupported question language.")
    if not question["test_cases"]:
        raise ValueError("Question must contain at least one compiled test case.")
    for index, case in enumerate(question["test_cases"], start=1):
        if "inputs" not in case or "output" not in case or "error" not in case:
            raise ValueError(f"Compiled test case {index} is missing output fields.")
        if case["error"] is not None:
            raise ValueError(f"Compiled test case {index} contains an execution error.")

    QUESTION_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = QUESTION_FILE.with_suffix(".json.tmp")
    with temp_file.open("w", encoding="utf-8") as file:
        json.dump(question, file, indent=2, ensure_ascii=False)
    temp_file.replace(QUESTION_FILE)

    return {
        "message": "Compiler question saved successfully.",
        "file": str(QUESTION_FILE),
    }


def load_compiler_question() -> dict[str, Any]:
    if not QUESTION_FILE.exists():
        raise FileNotFoundError("No saved compiler question was found. Generate and save one first.")
    with QUESTION_FILE.open("r", encoding="utf-8") as file:
        question = json.load(file)
    if not isinstance(question, dict):
        raise ValueError("Saved compiler question has an invalid format.")
    return question


# ---------------------------------------------------------------------------
# Student-safe question/template
# ---------------------------------------------------------------------------

def extract_python_parameters(code: str, function_name: str) -> list[str]:
    try:
        import ast
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == function_name:
                return [arg.arg for arg in node.args.args]
    except (SyntaxError, ValueError):
        pass
    return []


def extract_node_parameters(code: str, function_name: str) -> list[str]:
    patterns = [
        rf"function\s+{re.escape(function_name)}\s*\((.*?)\)",
        rf"(?:const|let|var)\s+{re.escape(function_name)}\s*=\s*\((.*?)\)\s*=>",
        rf"(?:const|let|var)\s+{re.escape(function_name)}\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=>",
    ]
    for pattern in patterns:
        match = re.search(pattern, code, re.DOTALL)
        if match:
            raw = match.group(1).strip()
            if re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", raw):
                return [raw]
            return [item.strip() for item in raw.split(",") if item.strip()]
    return []


def get_student_question() -> dict[str, Any]:
    """Return only public problem metadata and a blank template, never reference code."""
    question = load_compiler_question()
    language = question["language"]
    function_name = question["function_name"]

    if language == "python":
        params = extract_python_parameters(question["reference_code"], function_name)
        parameter_string = ", ".join(params)
        template = f"def {function_name}({parameter_string}):\n    # Write your solution here\n    pass"
    else:
        params = extract_node_parameters(question["reference_code"], function_name)
        parameter_string = ", ".join(params)
        template = f"function {function_name}({parameter_string}) {{\n    // Write your solution here\n}}"

    return {
        "description": question["description"],
        "language": language,
        "function_name": function_name,
        "template": template,
        "number_of_test_cases": len(question["test_cases"]),
    }


# ---------------------------------------------------------------------------
# Student submission and scoring
# ---------------------------------------------------------------------------

def submit_student_solution(
    student_code: str,
    question_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Execute student code against test cases supplied in the request.
    If question_data is omitted, retain compatibility with the saved-question flow.
    """
    if not student_code or not student_code.strip():
        raise ValueError("Student code cannot be empty.")

    question = question_data if question_data is not None else load_compiler_question()
    if not isinstance(question, dict):
        raise ValueError("Question payload must be a JSON object.")

    language = str(question.get("language", "python")).lower().strip()
    if language not in JUDGE0_LANGUAGE_IDS:
        raise ValueError(
            f"Unsupported language '{language}'. Supported languages: "
            f"{', '.join(JUDGE0_LANGUAGE_IDS)}."
        )

    function_name = str(question.get("function_name", "")).strip()
    if not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", function_name):
        raise ValueError("function_name must be a valid function identifier.")

    validation = question.get("validation") or {}
    if not isinstance(validation, dict):
        raise ValueError("Question validation status must be 'valid'.")
    status = str(validation.get("status") or "valid").strip().lower()
    if status != "valid":
        raise ValueError("Question validation status must be 'valid'.")

    test_cases = question.get("test_cases")
    if not isinstance(test_cases, list) or not test_cases:
        raise ValueError("test_cases must be a non-empty list.")

    results = []
    diagnostics = []
    for index, test_case in enumerate(test_cases, start=1):
        if not isinstance(test_case, dict):
            raise ValueError(f"Test case {index} must be a JSON object.")
        inputs = test_case.get("inputs")
        if not isinstance(inputs, list) or "output" not in test_case:
            raise ValueError(
                f"Test case {index} must contain an inputs array and output."
            )
        if test_case.get("error") is not None:
            raise ValueError(f"Test case {index} contains an execution error.")

        expected = test_case["output"]
        if language == "python":
            actual, error = execute_python(student_code, function_name, inputs)
        else:
            actual, error = execute_node(student_code, function_name, inputs)

        passed = error is None and actual == expected
        # Do not expose test inputs, expected values, or actual values in results.
        results.append({
            "test_case": test_case.get("test_case", index),
            "passed": passed,
            "error": error,
        })
        shown_input = inputs[0] if isinstance(inputs, list) and len(inputs) == 1 else inputs
        diagnostics.append({
            "input": shown_input,
            "expected": expected,
            "actual": actual,
            "passed": passed,
        })

    total = len(results)
    passed_count = sum(1 for result in results if result["passed"])
    failed_count = total - passed_count
    score = (passed_count / total * 100) if total else 0

    return {
        "status": "completed",
        "passed": passed_count,
        "failed": failed_count,
        "total": total,
        "score": round(score, 2),
        "results": results,
        "diagnostics": diagnostics,
    }


# ---------------------------------------------------------------------------
# AI hint (does not return code or the reference solution)
# ---------------------------------------------------------------------------

def get_ai_help(student_code: str, test_results: dict[str, Any], description: str | None = None) -> str:
    problem = str(description or "").strip()
    if not problem:
        problem = load_compiler_question()["description"]
    llm = get_llm()

    prompt = f"""
You are an AI programming tutor.

Problem:
{problem}

Student code:
{student_code}

Test results:
{json.dumps(test_results, indent=2, ensure_ascii=False)}

Give exactly TWO short lines of guidance.

Rules:
- Do not provide code or corrected code.
- Do not provide the solution or reveal reference code.
- Do not reveal hidden expected outputs.
- Identify a likely conceptual or logical issue.
- Give a direction for what the student should inspect.
- Exactly two lines.
"""
    response = llm.generate(prompt)
    if hasattr(response, "content"):
        response = response.content

    lines = [line.strip() for line in str(response).strip().splitlines() if line.strip()]
    lines = [re.sub(r"^[-*•]\s*", "", line) for line in lines]
    if len(lines) < 2:
        lines.append("Review the failing test cases and check your function's logic for those inputs.")
    return "\n".join(lines[:2])
