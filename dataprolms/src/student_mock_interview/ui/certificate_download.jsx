import { useState } from "react";
import { useToast } from "@datapromr/toast";
import { download_mock_interview_certificate } from "../api.js";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";

export function Certificate_Download({ mock_interview_id, ready, locked, file_stem, class_name, always }) {
  const toast = useToast();
  const [busy, set_busy] = useState(false);

  async function download() {
    if (busy || !mock_interview_id) return;
    if (!ready) {
      toast.error(locked ? ENGLISH.certificate_locked_copy : ENGLISH.unable_to_download_this_certificate);
      return;
    }
    set_busy(true);
    try {
      const response = await download_mock_interview_certificate(mock_interview_id);
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      const stem = String(file_stem || "mock-interview").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
      link.download = `${stem || "mock-interview"}-certificate.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy(false);
    }
  }

  if (!always && locked) {
    return <p className={`smi_cert_lock${class_name ? ` ${class_name}` : ""}`}>{ENGLISH.certificate_locked_copy}</p>;
  }
  if (!always && !ready) return null;
  return (
    <button
      type="button"
      className={`smi_cert_btn${class_name ? ` ${class_name}` : ""}`}
      disabled={busy}
      onClick={download}>
      {busy ? ENGLISH.downloading_certificate : ENGLISH.download_certificate}
    </button>
  );
}
