import { log } from "@datapromr/log";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ymd } from "../utils/dates.js";

const NAVY = rgb(26 / 255, 47 / 255, 122 / 255);
const INK = rgb(18 / 255, 32 / 255, 74 / 255);
const MUTED = rgb(90 / 255, 98 / 255, 112 / 255);
const LINE = rgb(210 / 255, 216 / 255, 228 / 255);
const FILL = rgb(244 / 255, 246 / 255, 251 / 255);
const WHITE = rgb(1, 1, 1);

const PAGE = [595.28, 841.89];
const MARGIN = 40;

function pdf_safe(value) {
  return String(value ?? "").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, (ch) => {
    const map = {
      "–": "-",
      "—": "-",
      "’": "'",
      "‘": "'",
      "“": '"',
      "”": '"',
      "•": "-",
      "✓": "Y",
      "✔": "Y",
      "☐": "[ ]",
      "": "[x]",
      "": "[ ]"
    };
    return map[ch] || " ";
  });
}

function wrap(font, text, size, max_width) {
  const clean = pdf_safe(text).replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const words = clean.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= max_width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) <= max_width) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (font.widthOfTextAtSize(trial, size) <= max_width) chunk = trial;else
      {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function mark(value) {
  return value ? "[x] Yes   [ ] No" : "[ ] Yes   [x] No";
}

function parse_json(value, fallback) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function embed_photo(doc, photo) {
  const stored = String(photo?.file_path || "").trim();
  if (!stored.startsWith("http://") && !stored.startsWith("https://")) return null;
  try {
    const response = await fetch(stored);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    const lower = stored.toLowerCase();
    if (lower.includes(".png")) return doc.embedPng(bytes);
    return doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function build_daily_report_pdf(report) {
  log.info("build_daily_report_pdf", `building PDF for report ${report?.report_id || ""}`);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage(PAGE);
  let y = page.getHeight() - 28;
  const inner = page.getWidth() - MARGIN * 2;

  function add_page() {
    page = doc.addPage(PAGE);
    y = page.getHeight() - 36;
  }

  function ensure(height) {
    if (y - height < 42) add_page();
  }

  function text(font, value, size, x, top, color = INK) {
    page.drawText(pdf_safe(value), { x, y: top - size, size, font, color });
  }

  function centered(font, value, size, top, color = INK) {
    const clean = pdf_safe(value);
    const width = font.widthOfTextAtSize(clean, size);
    page.drawText(clean, {
      x: MARGIN + Math.max(0, (inner - width) / 2),
      y: top - size,
      size,
      font,
      color
    });
  }

  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 8,
    width: page.getWidth(),
    height: 8,
    color: NAVY
  });

  y -= 10;
  centered(bold, "DAILY TRAINING REPORT", 16, y, NAVY);
  y -= 22;
  if (report.program_title) {
    centered(bold, report.program_title, 12, y);
    y -= 16;
  }
  if (report.venue) {
    centered(regular, report.venue, 9, y, MUTED);
    y -= 13;
  }
  if (report.association_line) {
    centered(regular, `In association with: ${report.association_line}`, 9, y, MUTED);
    y -= 13;
  }
  if (report.course_track) {
    centered(italic, report.course_track, 10, y, NAVY);
    y -= 16;
  }
  y -= 6;

  function heading(label) {
    ensure(22);
    page.drawRectangle({ x: MARGIN, y: y - 16, width: inner, height: 16, color: NAVY });
    text(bold, label, 9, MARGIN + 8, y - 3, WHITE);
    y -= 16;
  }

  function pair_row(left_label, left_value, right_label, right_value) {
    const height = 18;
    ensure(height);
    page.drawRectangle({ x: MARGIN, y: y - height, width: inner, height, borderColor: LINE, borderWidth: 0.6 });
    page.drawLine({
      start: { x: MARGIN + inner / 2, y: y },
      end: { x: MARGIN + inner / 2, y: y - height },
      color: LINE,
      thickness: 0.6
    });
    text(bold, left_label, 8, MARGIN + 6, y - 4, MUTED);
    text(regular, left_value || "-", 9, MARGIN + 118, y - 4);
    text(bold, right_label, 8, MARGIN + inner / 2 + 6, y - 4, MUTED);
    text(regular, right_value || "-", 9, MARGIN + inner / 2 + 118, y - 4);
    y -= height;
  }

  function block(label, value) {
    const lines = wrap(regular, value, 9, inner - 16);
    const height = Math.max(28, 16 + lines.length * 12);
    ensure(height + 2);
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: inner,
      height,
      borderColor: LINE,
      borderWidth: 0.6
    });
    text(bold, label, 8, MARGIN + 6, y - 4, MUTED);
    let top = y - 16;
    for (const line of lines) {
      text(regular, line, 9, MARGIN + 6, top);
      top -= 12;
    }
    y -= height;
  }

  heading("1. REPORT DETAILS");
  pair_row("Date", ymd(report.report_date), "Day No. / Week No.", `${report.day_no || "-"} / ${report.week_no || "-"}`);
  pair_row("Trainer Name", report.trainer_name, "Teaching Assistant", report.teaching_assistant);
  pair_row("Module / Course", report.module_course, "Session Timings", report.session_timings);

  heading("2. ATTENDANCE SUMMARY");
  pair_row("Total Students Enrolled", String(report.enrolled ?? 0), "Present Today", String(report.present_today ?? 0));
  pair_row("Absent Today", String(report.absent_today ?? 0), "Attendance %", `${report.attendance_percent ?? 0}%`);
  pair_row(
    "Morning attendance count",
    String(report.morning_count ?? 0),
    "Afternoon attendance count",
    String(report.afternoon_count ?? 0)
  );

  heading("3. DAILY / WEEKLY ASSIGNMENTS SUMMARY");
  pair_row("Daily assignment conducted", mark(report.daily_assignment), "No. of students attempt", String(report.daily_attempts ?? ""));
  block("Reason (if daily assignment not conducted)", report.daily_reason);
  pair_row("Weekly assignment conducted", mark(report.weekly_assignment), "No. of students attempt", String(report.weekly_attempts ?? ""));
  block("Reason (if weekly assignment not conducted)", report.weekly_reason);

  heading("4. HOUR-WISE TOPICS COVERED");
  const sessions = parse_json(report.sessions, []).filter(
    (row) => row.time || row.session || row.topic || row.remarks
  );
  const cols = [78, 88, 168, inner - 78 - 88 - 168];
  const headers = ["Time", "Session", "Topic / Activity Covered", "Remarks"];
  ensure(18);
  page.drawRectangle({ x: MARGIN, y: y - 16, width: inner, height: 16, color: FILL });
  let hx = MARGIN;
  headers.forEach((label, index) => {
    text(bold, label, 7.5, hx + 4, y - 3, MUTED);
    hx += cols[index];
  });
  y -= 16;
  if (!sessions.length) {
    block("Sessions", "No sessions recorded.");
  } else {
    for (const row of sessions) {
      const cells = [
      wrap(regular, row.time, 8, cols[0] - 8),
      wrap(regular, row.session, 8, cols[1] - 8),
      wrap(regular, row.topic, 8, cols[2] - 8),
      wrap(regular, row.remarks, 8, cols[3] - 8)];

      const lines = Math.max(...cells.map((item) => item.length), 1);
      const height = Math.max(18, 6 + lines * 11);
      ensure(height);
      page.drawRectangle({
        x: MARGIN,
        y: y - height,
        width: inner,
        height,
        borderColor: LINE,
        borderWidth: 0.5
      });
      let cx = MARGIN;
      cells.forEach((cell, index) => {
        let top = y - 4;
        for (const line of cell) {
          text(regular, line, 8, cx + 4, top);
          top -= 11;
        }
        cx += cols[index];
      });
      y -= height;
    }
  }

  heading("5. LAB / HANDS-ON WORK DONE TODAY");
  block("Lab exercise / task / topics", report.lab_work);
  block("Comments", report.lab_comments);

  heading("6. OTHER ACTIVITIES / SPECIAL EVENTS");
  block("Additional activities", report.other_activities);

  heading("7. GEO-TAGGED ATTENDANCE PHOTOS");
  const photos = parse_json(report.photos, []);
  if (!photos.length) {
    block("Photos", "No photos attached.");
  } else {
    for (const photo of photos) {
      const image = await embed_photo(doc, photo);
      if (!image) {
        block("Photo", photo.file_name || photo.caption || "Photo unavailable");
        continue;
      }
      const max_w = inner;
      const max_h = 180;
      const scale = Math.min(max_w / image.width, max_h / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ensure(height + 22);
      page.drawImage(image, { x: MARGIN, y: y - height, width, height });
      y -= height + 4;
      if (photo.caption) {
        text(regular, photo.caption, 8, MARGIN, y, MUTED);
        y -= 12;
      }
      y -= 8;
    }
  }

  heading("8. REPORTS SUBMITTED BY");
  pair_row("Trainer / Teaching Assistant", report.submitted_by, "Date", ymd(report.submitted_date));
  pair_row("Reviewed & Verified by", report.reviewed_by, "Date", ymd(report.reviewed_date));

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    const label = `${pdf_safe(report.program_title || "Daily Training Report")}  •  Page ${index + 1} of ${pages.length}`;
    item.drawText(label, {
      x: MARGIN,
      y: 22,
      size: 8,
      font: regular,
      color: MUTED
    });
  });

  log.pass("build_daily_report_pdf", `built PDF for report ${report?.report_id || ""}`);
  return doc.save();
}
