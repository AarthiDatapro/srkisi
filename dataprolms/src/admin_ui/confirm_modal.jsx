import { createPortal } from "react-dom";
import { Button } from "@datapromr/button";
import "./theme/confirm_modal.css";
import { ADMIN_UI_ENGLISH as ENGLISH } from "../constants/english/admin_ui_constants_english.js";

export function Confirm_Modal({
  open,
  title = ENGLISH.confirm,
  message,
  confirm_label = ENGLISH.confirm,
  cancel_label = ENGLISH.cancel,
  loading = false,
  on_confirm,
  on_cancel
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="adm_confirm_scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adm_confirm_title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) on_cancel?.();
      }}>
      <div className="adm_confirm_card">
        <header className="adm_confirm_head">
          <h2 id="adm_confirm_title">{title}</h2>
          <button
            type="button"
            className="adm_confirm_close"
            aria-label={ENGLISH.close}
            disabled={loading}
            onClick={on_cancel}>
            ×
          </button>
        </header>
        <p className="adm_confirm_copy">{message}</p>
        <div className="adm_confirm_foot">
          <Button type="button" variant="ghost" disabled={loading} onClick={on_cancel}>
            {cancel_label}
          </Button>
          <Button type="button" loading={loading} onClick={on_confirm}>
            {confirm_label}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
