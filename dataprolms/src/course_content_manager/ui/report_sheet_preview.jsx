import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Grid } from "@designdaddy/datagrid";
import { GRID_THEME } from "../constants.js";
import "../theme/report_sheet_preview.css";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function sheet_grid(sheet) {
  const columns = sheet.headers.map((label, index) => ({
    id: `c${index}`,
    label,
    width: sheet.widths?.[index] || 140
  }));
  const rows = sheet.rows.map((values, row_index) => {
    const row = { id: row_index + 1 };
    values.forEach((value, index) => {
      row[`c${index}`] = value == null || value === "" ? "—" : value;
    });
    return row;
  });
  return { columns, rows };
}

export function Report_Sheet_Preview({ title, report, on_close, on_download }) {
  const [active, set_active] = useState(report.sheets[0]?.id || "");
  const sheet = report.sheets.find((item) => item.id === active) || report.sheets[0];
  const grid = useMemo(() => (sheet ? sheet_grid(sheet) : { columns: [], rows: [] }), [sheet]);

  useEffect(() => {
    function on_key(event) {
      if (event.key === ENGLISH.escape) on_close();
    }
    window.addEventListener("keydown", on_key);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on_key);
      document.body.style.overflow = previous;
    };
  }, [on_close]);

  return createPortal(
    <div className="ccm_rsp" role="dialog" aria-modal="true" aria-label={ENGLISH.preview_2(title)}>
      <div className="ccm_rsp_bar">
        <button type="button" className="ccm_rsp_close" onClick={on_close} aria-label={ENGLISH.close_preview}>✕</button>
        <div className="ccm_rsp_title">
          <b>{title}</b>
          <small>{report.file_name}</small>
        </div>
        <nav className="ccm_rsp_tabs" aria-label={ENGLISH.sheets}>
          {report.sheets.map((item) =>
            <button key={item.id} type="button" className={item.id === sheet?.id ? "is_on" : ""} onClick={() => set_active(item.id)}>
              {item.label}
              <em>{item.rows.length}</em>
            </button>
          )}
        </nav>
        <button type="button" className="ccm_rsp_download" onClick={on_download}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.download_excel}</button>
      </div>
      <div className="ccm_rsp_stage" onClick={(event) => { if (event.target === event.currentTarget) on_close(); }}>
        <div className="ccm_rsp_paper">
          {sheet ?
            <Grid
              key={sheet.id}
              className="ccm_rsp_grid"
              theme={GRID_THEME}
              columns={grid.columns}
              rows={grid.rows}
              rowKey="id"
              pageSize={20}
              pageSizeOptions={[20, 50, 100]}
              showFreeze
              searchPlaceholder={ENGLISH.search_2(sheet.label.toLowerCase())}
              emptyMessage={ENGLISH.no_rows_in_this_sheet}
              emptyHint={ENGLISH.change_the_dashboard_filters_to_include_more_data}
              tableAriaLabel={ENGLISH.sheet(sheet.label)} /> :
            null}
        </div>
      </div>
    </div>,
    document.body
  );
}
