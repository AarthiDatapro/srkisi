import { live_text } from "../live_text.js";
import { DESIGN_SYSTEM_HINDI } from "../hindi/design_system_constants_hindi.js";

const DESIGN_SYSTEM_STRINGS = {
  home: "← Home",
  max_width_px: (arg_1) => `(max-width: ${arg_1}px)`,
  sheet: "Sheet",
  ss_styleid_head: " ss:StyleID=\"head\"",
  ss_styleid_cell: " ss:StyleID=\"cell\"",
  xml_version_1_0: "<?xml version=\"1.0\"?>",
  mso_application_progid_excel_sheet: "<?mso-application progid=\"Excel.Sheet\"?>",
  workbook_xmlns_urn_schemas_microsoft_com_office_spreadsheet: "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">",
  style_ss_id_head_font_ss_bold_1: "<Style ss:ID=\"head\"><Font ss:Bold=\"1\" ss:Color=\"#FFFFFF\"/><Interior ss:Color=\"#1C140C\" ss:Pattern=\"Solid\"/></Style>",
  style_ss_id_cell_alignment_ss_vertical_top: "<Style ss:ID=\"cell\"><Alignment ss:Vertical=\"Top\" ss:WrapText=\"1\"/></Style>",
  row_row: (arg_1) => `<Row>${arg_1}</Row>`,
  column_ss_width: (arg_1) => `<Column ss:Width="${arg_1}"/>`,
  worksheet_ss_name_table: (arg_1) => `<Worksheet ss:Name="${arg_1}"><Table>`,
  cell_data_ss_type_string_data_cell: (arg_1, arg_2) => `<Cell${arg_1}><Data ss:Type="String">${arg_2}</Data></Cell>`,
  rgba_26_47_122_0_12: "rgba(235, 120, 40, 0.12)",
  outfit_segoe_ui_sans_serif: "\"Source Serif 4\", \"Noto Serif Devanagari\", Georgia, serif",
  student: "Student",
  input_select_textarea: "input, select, textarea",
  button_a: "button, a",
  tab: "Tab",
  input_type_radio_name: (arg_1) => `input[type="radio"][name="${arg_1}"]`,
};

export const DESIGN_SYSTEM_ENGLISH = live_text(DESIGN_SYSTEM_STRINGS, DESIGN_SYSTEM_HINDI);
