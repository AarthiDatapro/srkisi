export function student_code(user) {
  const code = String(user?.sub || "").trim();
  if (!code) {
    const error = new Error("Student session is missing");
    error.status = 401;
    throw error;
  }
  return code;
}
