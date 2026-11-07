import sharp from "sharp";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function escape_xml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  }[char]));
}

export async function read_image_size(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!["png", "jpeg"].includes(meta.format) || !meta.width || !meta.height) {
    throw fail("Only PNG and JPG images are supported");
  }
  return { width: meta.width, height: meta.height, format: meta.format };
}

export async function draw_certificate_buffer(input, fields, sample_data) {
  const meta = await sharp(input).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const lines = [];
  for (const field of fields || []) {
    if (field?.is_enabled === false || field?.is_enabled === 0) continue;
    const text = String(sample_data?.[field.field_key] ?? "").trim();
    if (!field?.field_key || !text) continue;
    const size = Math.max(1, Number(field.font_size || 40));
    const box_width = Math.max(0, Number(field.box_width || 0));
    const box_height = Math.max(size, Number(field.box_height || size));
    const color = /^#[0-9a-fA-F]{3,8}$/.test(String(field.font_color || "")) ? field.font_color : "#000000";
    const align = String(field.text_alignment || "left").toLowerCase();
    const centered = align === "center" || align === "justify";
    let x = Number(field.x_position || 0);
    if (centered) x += box_width / 2;
    if (align === "right") x += box_width;
    const y = Number(field.y_position || 0) + box_height / 2;
    const anchor = centered ? "middle" : align === "right" ? "end" : "start";
    const family = escape_xml(field.font_family || "Poppins");
    const weight = field.bold ? 700 : 400;
    const slant = field.italic ? "italic" : "normal";
    const decoration = field.underline ? "underline" : "none";
    const spacing = Number(field.letter_spacing || 0);
    const stretch = align === "justify" && box_width > 0 ? ` textLength="${box_width}" lengthAdjust="spacing"` : "";
    lines.push(
      `<text x="${x}" y="${y}" font-size="${size}" fill="${escape_xml(color)}" font-family="${family}, sans-serif" font-weight="${weight}" font-style="${slant}" text-decoration="${decoration}" letter-spacing="${spacing}" text-anchor="${anchor}" dominant-baseline="middle"${stretch}>${escape_xml(text)}</text>`
    );
  }
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${lines.join("")}</svg>`
  );
  return sharp(input).composite([{ input: svg }]).png().toBuffer();
}

export async function draw_certificate(image_url, fields, sample_data) {
  const response = await fetch(image_url);
  if (!response.ok) throw fail("The certificate picture could not be loaded", 502);
  const input = Buffer.from(await response.arrayBuffer());
  return draw_certificate_buffer(input, fields, sample_data);
}
