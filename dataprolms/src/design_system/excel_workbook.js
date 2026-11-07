import { DESIGN_SYSTEM_ENGLISH as ENGLISH } from "../constants/english/design_system_constants_english.js";
function excel_text(value) {
  return String(value ?? "").
    replaceAll("&", "&amp;").
    replaceAll("<", "&lt;").
    replaceAll(">", "&gt;").
    replaceAll("\"", "&quot;").
    replaceAll("\n", "&#10;");
}

function sheet_names(sheets) {
  const used = new Set();
  return sheets.map((sheet) => {
    const base = String(sheet.label || sheet.id || ENGLISH.sheet).replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || ENGLISH.sheet;
    let name = base;
    let index = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = ` (${index})`;
      name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
      index += 1;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

function worksheet_xml(name, widths, headers, rows) {
  const cells = (values, style) => values.map((value) =>
    ENGLISH.cell_data_ss_type_string_data_cell(style, excel_text(value))
  ).join("");
  return [
    ENGLISH.worksheet_ss_name_table(excel_text(name)),
    ...(widths || []).map((width) => ENGLISH.column_ss_width(width)),
    ENGLISH.row_row(cells(headers, ENGLISH.ss_styleid_head)),
    ...rows.map((row) => ENGLISH.row_row(cells(row, ENGLISH.ss_styleid_cell))),
    "</Table></Worksheet>"
  ].join("");
}

export function save_workbook(report) {
  const names = sheet_names(report.sheets);
  const workbook = [
    ENGLISH.xml_version_1_0,
    ENGLISH.mso_application_progid_excel_sheet,
    ENGLISH.workbook_xmlns_urn_schemas_microsoft_com_office_spreadsheet,
    "<Styles>",
    ENGLISH.style_ss_id_head_font_ss_bold_1,
    ENGLISH.style_ss_id_cell_alignment_ss_vertical_top,
    "</Styles>",
    ...report.sheets.map((sheet, index) => worksheet_xml(names[index], sheet.widths, sheet.headers, sheet.rows)),
    "</Workbook>"
  ].join("");
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.file_name;
  link.click();
  URL.revokeObjectURL(url);
}
