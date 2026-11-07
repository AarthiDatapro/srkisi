import { useEffect, useState } from "react";
import { LMS_MEDIA_PHONE } from "../../design_system/breakpoints.js";
import { Report_Preview, get_my_report_card, list_my_report_programs, print_report_cards } from "../../student_manager/index.js";
import "../../student_manager/theme/report_card.css";
import "../../student_manager/theme/student_manager.css";
import { STUDENT_HISTORY_ENGLISH as ENGLISH } from "../../constants/english/student_history_constants_english.js";

function use_phone() {
  const [phone, set_phone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(LMS_MEDIA_PHONE).matches
  );

  useEffect(() => {
    const media = window.matchMedia(LMS_MEDIA_PHONE);
    const sync = () => set_phone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return phone;
}

function file_title(payload) {
  const card = payload?.cards?.[0];
  return `${card?.student?.name || "student"}_${payload?.program?.program_name || "program"}_report_card`.replace(/\s+/g, "_");
}

export function Report_Card_Button() {
  const [programs, set_programs] = useState(null);
  const [cache, set_cache] = useState({});
  const [preview, set_preview] = useState(null);
  const [busy, set_busy] = useState(false);
  const phone = use_phone();

  useEffect(() => {
    let alive = true;
    list_my_report_programs().then((data) => {
      if (alive) set_programs(data.programs || []);
    }).catch(() => {
      if (alive) set_programs([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function load(id) {
    if (cache[id]) return cache[id];
    const payload = await get_my_report_card(id);
    set_cache((current) => ({ ...current, [id]: payload }));
    return payload;
  }

  function open_preview(index) {
    const program = programs?.[index];
    if (!program) return;
    set_preview({ index, loading: !cache[program.id], error: "", payload: cache[program.id] || null });
    if (cache[program.id]) return;
    load(program.id).then((payload) => {
      set_preview((current) => (current && current.index === index ? { ...current, loading: false, payload } : current));
    }).catch((err) => {
      set_preview((current) => (current && current.index === index ? { ...current, loading: false, error: err.message } : current));
    });
  }

  async function download(index) {
    const program = programs?.[index];
    if (!program) return;
    set_busy(true);
    try {
      const payload = await load(program.id);
      print_report_cards(payload, file_title(payload));
    } finally {
      set_busy(false);
    }
  }

  const ready = programs && programs.length > 0;

  return (
    <>
      <div className="sth_card_actions" role="group" aria-label={ENGLISH.report_card}>
        <button type="button" className="sth_card_btn" disabled={!ready || (phone && busy)} title={ready ? "" : ENGLISH.join_a_program_to_get_a_report_card} onClick={() => phone ? download(0) : open_preview(0)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="3.5" width="15" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 8h8M8 11.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="15" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.7" /></svg>
          {phone ? ENGLISH.download : ENGLISH.report_card}
        </button>
        {phone ? null :
        <button type="button" className="sth_card_btn is_icon" aria-label={ENGLISH.download_report_card} disabled={!ready || busy} onClick={() => download(0)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>}
      </div>
      {preview && !phone ?
        <Report_Preview
          preview={preview}
          total={programs.length}
          title={programs[preview.index]?.name || ENGLISH.my_report_card}
          step_noun="program"
          on_close={() => set_preview(null)}
          on_step={(step) => open_preview(preview.index + step)}
          on_download={() => preview.payload && print_report_cards(preview.payload, file_title(preview.payload))} /> :
        null}
    </>
  );
}
