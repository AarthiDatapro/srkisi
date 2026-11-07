import { useEffect, useState } from "react";
import { LMS_MEDIA_PHONE } from "../../design_system/breakpoints.js";
import { get_my_report_card, list_my_report_programs } from "../api.js";
import { Report_Card } from "./report_card.jsx";
import { print_report_cards } from "./print_report.jsx";
import "../theme/report_card.css";
import "../theme/student_manager.css";
import { STUDENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/student_manager_constants_english.js";

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

export function Student_Report_Card() {
  const [programs, set_programs] = useState(null);
  const [program_id, set_program_id] = useState(null);
  const [payload, set_payload] = useState(null);
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState("");
  const phone = use_phone();

  useEffect(() => {
    list_my_report_programs().then((data) => {
      const list = data.programs || [];
      set_programs(list);
      if (list[0]) set_program_id(list[0].id);
    }).catch((err) => {
      set_programs([]);
      set_error(err.message);
    });
  }, []);

  useEffect(() => {
    if (!program_id) return undefined;
    let alive = true;
    set_loading(true);
    set_error("");
    get_my_report_card(program_id).then((data) => {
      if (alive) set_payload(data);
    }).catch((err) => {
      if (alive) set_error(err.message);
    }).finally(() => {
      if (alive) set_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [program_id]);

  const card = payload?.cards?.[0];

  function download() {
    if (!payload) return;
    const name = `${card.student.name}_${payload.program.program_name}_report_card`.replace(/\s+/g, "_");
    print_report_cards(payload, name);
  }

  return (
    <section className="stm_desk stm_mine">
      <header className="stm_mine_head">
        <div>
          <h1>{ENGLISH.my_report_card}</h1>
          <p>{ENGLISH.your_progress_scores_and_rank_in_each_program}</p>
        </div>
        <button type="button" className="stm_primary" disabled={!card || loading} onClick={download}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.download_pdf}</button>
      </header>
      {programs && programs.length > 1 ?
        <nav className="stm_mine_tabs" aria-label={ENGLISH.programs}>
          {programs.map((row) =>
            <button key={row.id} type="button" className={row.id === program_id ? "is_on" : ""} onClick={() => set_program_id(row.id)}>{row.name}</button>
          )}
        </nav> :
        null}
      {error ? <p className="stm_error">{error}</p> : null}
      {programs && !programs.length && !error ? <p className="stm_empty">{ENGLISH.you_are_not_registered_in_any_program_yet}</p> : null}
      {loading ? <p className="stm_empty">{ENGLISH.preparing_your_report_card}</p> : null}
      {card && !loading && !phone ?
        <div className="stm_mine_stage">
          <div className="stm_preview_paper">
            <Report_Card card={card} program={payload.program} generated_at={payload.generated_at} grading={payload.grading} />
          </div>
        </div> :
        null}
    </section>
  );
}
