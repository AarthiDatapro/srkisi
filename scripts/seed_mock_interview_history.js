/**
 * Seed clearly-labelled SYNTHETIC mock-interview demo history for students found
 * in students_courses_standardized.xlsx. This does not represent real usage.
 *
 * Run from a folder with: npm i mysql2 xlsx dotenv
 * Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env (or environment).
 * Place this file, the Excel file, and question-bank JSON in the same folder.
 *
 * Safety: dry-run is ON by default. Set DRY_RUN=false to insert.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Server folder path
const serverPath = path.resolve(__dirname, '..', 'server');

// Load xlsx from server/node_modules
const xlsx = require(
    require.resolve('xlsx', {
        paths: [serverPath]
    })
);

// Load mysql2 from server/node_modules
const mysql = require(
    require.resolve('mysql2/promise', {
        paths: [serverPath]
    })
);

// Load dotenv from server/node_modules
require(
    require.resolve('dotenv', {
        paths: [serverPath]
    })
).config({
    path: path.join(serverPath, '.env')
});

const EXCEL_PATH = process.env.STUDENTS_XLSX || path.join(__dirname, 'students_courses_standardized.xlsx');
const BANK_PATH = process.env.QUESTION_BANK_JSON || path.join(__dirname, 'mock_interview_question_bank_20_courses_10_variants.json');
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--import');
const LIMIT = Number(process.env.LIMIT || 0); // 0 = no artificial cap

const norm = v => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const quoteId = s => '`' + String(s).replace(/`/g, '``') + '`';
const pick = (cols, candidates) => candidates.find(c => cols.includes(c));
const aliases = new Map([
  ['autocad','AutoCAD'], ['digital media and admm advanced diploma in multimedia','Digital Media and ADMM'],
  ['ansys','ANSYS'], ['apgdca advanced post graduate diploma in computer applications','APGDCA'],
  ['aws and cloud computing','AWS and Cloud Computing'], ['microsoft azure','Microsoft Azure'], ['catia','CATIA'],
  ['networking and ccna','Networking and CCNA'], ['c language','C Language'], ['c plus plus','C++'], ['c','C Language'],
  ['cybersecurity and ethical hacking','Cyber Security'], ['digital marketing','Digital Marketing'],
  ['data science analytics and ai','Artificial Intelligence'], ['power bi','Power BI'],
  ['python programming','Python Full Stack'], ['core java','Java Programming'], ['java','Java Programming'],
  ['tally','Tally'], ['web development and full stack','Web Development'], ['web development','Web Development'],
  ['d m s o diploma in microsoft office and office automation','Microsoft Office'],
  ['ms office','Microsoft Office'], ['microsoft office','Microsoft Office'],
  ['dca diploma in computer applications','APGDCA'],
  ['programming and coding','Python Full Stack'], ['sql and database','Data Analytics'],
  ['data structures and algorithms','C++ Programming'], ['software testing','Web Development'],
  ['net','Web Development'], ['devops','Cloud Computing'], ['excel','Power BI'],
]);

function courseKey(excelCourse, bankByNorm) {
  const n = norm(excelCourse);
  if (bankByNorm.has(n)) return bankByNorm.get(n);
  const alias = aliases.get(n);
  if (alias && bankByNorm.has(norm(alias))) return bankByNorm.get(norm(alias));
  return null;
}
function parseDate(value, fallbackIndex) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = String(value ?? '').trim();
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // Deterministic fallback date in the past; still synthetic and marked as such.
  return new Date(2022, 0, 1 + (fallbackIndex % 900));
}
function isoSql(d) { return d.toISOString().slice(0, 19).replace('T',' '); }
function pastTimestamp(startDate, salt) {
  const start = new Date(startDate.getTime());
  const end = new Date(Math.min(Date.now() - 86400000, start.getTime() + 120 * 86400000));
  const range = Math.max(1, end.getTime() - start.getTime());
  const h = crypto.createHash('sha256').update(String(salt)).digest();
  const offset = h.readUInt32BE(0) % range;
  return new Date(start.getTime() + offset);
}
function naturalAnswer(answer, question, variant, index) {
  // Keep bank answer meaning intact; vary only light conversational framing.
  const starts = ['I would say ', 'In my understanding, ', 'The way I approach it is, ', 'From what I have learned, '];
  const body = String(answer ?? '').trim().replace(/^\s+/, '');
  return (starts[(variant + index) % starts.length] + body).slice(0, 4000);
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  if (!fs.existsSync(BANK_PATH)) throw new Error(`Question bank not found: ${BANK_PATH}`);
  const workbook = xlsx.readFile(EXCEL_PATH, {cellDates:true});
  const sheet = workbook.Sheets['Student Details'] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, {defval:''});
  if (!rows.length) throw new Error('No student rows found in Excel.');
  const first = rows[0];
  const excelNameCol = Object.keys(first).find(k => norm(k) === 'name') || Object.keys(first).find(k => /student.*name|full.*name/i.test(k));
  const excelCourseCol = Object.keys(first).find(k => norm(k) === 'course') || Object.keys(first).find(k => /course/i.test(k));
  const excelStartCol = Object.keys(first).find(k => /start date/i.test(k));
  if (!excelNameCol || !excelCourseCol) throw new Error(`Excel needs NAME and COURSE columns. Found: ${Object.keys(first).join(', ')}`);

  const bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));
  const bankByNorm = new Map(bank.courses.map(c => [norm(c.course_name), c]));
  const conn = await mysql.createConnection({
    host:process.env.DB_HOST, port:Number(process.env.DB_PORT || 3306),
    user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_NAME,
    charset:'utf8mb4', timezone:'Z',
  });
  try {
    const [colRows] = await conn.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_students'`);
    const cols = colRows.map(r => r.COLUMN_NAME);
    if (!cols.length) throw new Error('tbl_students was not found in the configured database.');
    const firstNameCol = pick(cols, ['first_name']);
    const lastNameCol = pick(cols, ['last_name']);
    const idCol = pick(cols, ['student_id']);

const courseCol = pick(cols, [
    'course_name',
    'course',
    'registered_course',
    'program_name'
]);

if (!firstNameCol || !lastNameCol || !idCol) {
    throw new Error(
        `Could not identify student columns. Available columns: ${cols.join(', ')}`
    );
}
    const [studentRows] = await conn.query('SELECT * FROM tbl_students');
    const studentsByName = new Map();

for (const s of studentRows) {
    const fullName = `${s[firstNameCol] || ''} ${s[lastNameCol] || ''}`.trim();

    const k = norm(fullName);

    if (!k) continue;

    if (!studentsByName.has(k)) {
        studentsByName.set(k, []);
    }

    studentsByName.get(k).push(s);
}
    const seen = new Set();
    const planned = [];
    const stats = {excel_rows:rows.length, matched:0, unmatched_name:0, ambiguous_name:0, course_not_in_bank:0, already_in_plan:0};
    const skippedCourses = new Map();
    for (let i=0; i<rows.length; i++) {
      const r = rows[i];
      const studentName = String(r[excelNameCol] ?? '').trim();
      const courseName = String(r[excelCourseCol] ?? '').trim();
      if (!studentName || !courseName) continue;
      const matches = studentsByName.get(norm(studentName)) || [];
      if (!matches.length) { stats.unmatched_name++; continue; }
      let candidates = matches;
      if (courseCol && matches.length > 1) {
        const cm = matches.filter(s => norm(s[courseCol]) === norm(courseName));
        if (cm.length) candidates = cm;
      }
      if (candidates.length !== 1) { stats.ambiguous_name++; continue; }
      const student = candidates[0];
      stats.matched++;
      const course = courseKey(courseName, bankByNorm);
      if (!course) {
        stats.course_not_in_bank++;
        skippedCourses.set(courseName, (skippedCourses.get(courseName)||0)+1);
        continue;
      }
      const dedupeKey = `${String(student[idCol])}::${norm(courseName)}`;
      if (seen.has(dedupeKey)) { stats.already_in_plan++; continue; }
      seen.add(dedupeKey);
      const interviews = course.interviews || [];
      if (!interviews.length) { stats.course_not_in_bank++; continue; }
      const seed = crypto.createHash('sha256').update(dedupeKey).digest().readUInt32BE(0);
      const interview = interviews[seed % interviews.length];
      const startDate = parseDate(excelStartCol ? r[excelStartCol] : '', i);
      const startedAt = pastTimestamp(startDate, dedupeKey + ':start');
      const finishedAt = new Date(startedAt.getTime() + (12 + seed % 24) * 60000);
      const sessionId = `demo_${crypto.createHash('sha256').update(dedupeKey + ':' + seed).digest('hex').slice(0, 28)}`;
      const qa = interview.questions || [];
      const answers = qa.map((q, qi) => ({
        question_number: qi + 1, question: q.question,
        answer: naturalAnswer(q.answer, q.question, interview.variant || 1, qi),
        answered_at: isoSql(new Date(startedAt.getTime() + (qi+1) * Math.floor((finishedAt-startedAt)/(qa.length+1)))),
        synthetic_demo: true,
      }));
      const topics = qa.map(q => q.question);
      const gaps = ['Give a more specific example', 'Explain the reasoning step-by-step'].slice(0, seed % 2 ? 1 : 2);
      const strengths = ['Addresses the core idea', 'Uses relevant course terminology'];
      const analysis = {
        source:'course', course_name:courseName, target_role:interview.target_role || courseName,
        modules:[], lessons:[], synthetic_demo:true,
        synthetic_notice:'Generated demo/test data; not evidence of an actual interview.'
      };
      const session = {
        status:'completed', topics, session_id:sessionId, started_at:isoSql(startedAt),
        finished_at:isoSql(finishedAt), target_role:interview.target_role || courseName,
        synthetic_demo:true, course_name:courseName
      };
      const performance = {
        gaps, turns:answers.map(a=>({question:a.question, answer:a.answer, question_number:a.question_number})),
        status:'completed', strengths, session_id:sessionId, started_at:isoSql(startedAt),
        finished_at:isoSql(finishedAt), target_role:interview.target_role || courseName,
        synthetic_demo:true, course_name:courseName
      };
      planned.push({student_id:String(student[idCol]), courseName, analysis, session, answers, performance, startedAt, finishedAt, qaCount:qa.length});
      if (LIMIT > 0 && planned.length >= LIMIT) break;
    }

    console.log('DRY_RUN:', DRY_RUN);
    console.log('Plan summary:', {...stats, planned_inserts:planned.length, skipped_courses:[...skippedCourses.entries()]});
    if (DRY_RUN) {
      console.log('Dry run only. No rows were inserted. Set DRY_RUN=false to insert.');
      console.log('Sample:', JSON.stringify(planned.slice(0,2).map(p=>({student_id:p.student_id,course:p.courseName,questions:p.qaCount,started_at:isoSql(p.startedAt),synthetic_demo:true})),null,2));
      return;
    }

    let inserted = 0, existing = 0;
    await conn.beginTransaction();
    try {
      for (const p of planned) {
        const [found] = await conn.execute(
          `SELECT mock_interview_id FROM tbl_student_mock_interviews WHERE student_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(analysis_json, '$.synthetic_demo')) = 'true' AND JSON_UNQUOTE(JSON_EXTRACT(analysis_json, '$.course_name')) = ? LIMIT 1`,
          [p.student_id, p.courseName]
        );
        if (found.length) { existing++; continue; }
        await conn.execute(
          `INSERT INTO tbl_student_mock_interviews
           (student_id, job_id, role_source, file_name, analysis_json, session_id, status, question_number, total_questions, session_json, answers_json, performance_json, created_at, updated_at)
           VALUES (?, NULL, 'course', NULL, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)` ,
          [p.student_id, JSON.stringify(p.analysis), p.session.session_id, p.qaCount, p.qaCount,
           JSON.stringify(p.session), JSON.stringify(p.answers), JSON.stringify(p.performance),
           isoSql(p.startedAt), isoSql(p.finishedAt)]
        );
        inserted++;
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    console.log(JSON.stringify({inserted, already_present:existing, planned:planned.length, synthetic_demo:true}, null, 2));
  } finally { await conn.end(); }
}
main().catch(e => { console.error('FAILED:', e.message); process.exitCode = 1; });
