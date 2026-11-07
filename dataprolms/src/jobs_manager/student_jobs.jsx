import { useEffect, useMemo, useState } from "react";
import { list_open_jobs } from "./api.js";
import { Job_Brief } from "./ui/job_brief.jsx";
import "./theme/student_jobs.css";
import { JOBS_MANAGER_ENGLISH as ENGLISH } from "../constants/english/jobs_manager_constants_english.js";

const PAGE_SIZE = 12;

function requested_job_id() {
  const query = String(window.location.hash || "").split("?")[1] || "";
  return new URLSearchParams(query).get("job_id");
}

function mark_of(title) {
  const parts = String(title || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "JB";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function age_band(value) {
  const then = new Date(value || "");
  if (Number.isNaN(then.getTime())) return "is_older";
  const days = (Date.now() - then.getTime()) / 86400000;
  if (days <= 7) return "is_week";
  if (days <= 30) return "is_month";
  if (days <= 365) return "is_year";
  return "is_older";
}

function age_label(band) {
  if (band === "is_week") return ENGLISH.last_week;
  if (band === "is_month") return ENGLISH.last_month;
  if (band === "is_year") return ENGLISH.last_year;
  return ENGLISH.older;
}

function host_of(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").replace(/^https?:\/\//, "");
  }
}

function posted_ago(value) {
  const then = new Date(value || "");
  if (Number.isNaN(then.getTime())) return "";
  const hours = Math.max(0, Math.floor((Date.now() - then.getTime()) / 3600000));
  if (hours < 1) return ENGLISH.posted_just_now;
  if (hours < 24) return ENGLISH.posted_hour_ago(hours, hours === 1 ? "" : "s");
  const days = Math.floor(hours / 24);
  if (days < 30) return ENGLISH.posted_day_ago(days, days === 1 ? "" : "s");
  const months = Math.floor(days / 30);
  return ENGLISH.posted_month_ago(months, months === 1 ? "" : "s");
}

function page_marks(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index);
  const marks = [0, pages - 1, page - 1, page, page + 1].
    filter((index, place, list) => index >= 0 && index < pages && list.indexOf(index) === place).
    sort((left, right) => left - right);
  const out = [];
  marks.forEach((index, place) => {
    if (place && index - marks[place - 1] > 1) out.push("gap");
    out.push(index);
  });
  return out;
}

export function Student_Jobs({ on_practise }) {
  const [items, set_items] = useState([]);
  const [draft_query, set_draft_query] = useState("");
  const [query, set_query] = useState("");
  const [page, set_page] = useState(0);
  const [picked_id, set_picked_id] = useState(requested_job_id);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState("");

  useEffect(() => {
    let alive = true;
    list_open_jobs().
      then((payload) => {
        if (alive) set_items(payload.items || []);
      }).
      catch((err) => {
        if (alive) set_error(err.message || ENGLISH.unable_to_load_jobs);
      }).
      finally(() => {
        if (alive) set_loading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.querySelector(".sjb_desk")?.scrollIntoView({ block: "start" });
  }, [picked_id, page]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((job) =>
      [job.job_title, job.company_name, job.location, job.job_description].
        join(" ").
        toLowerCase().
        includes(needle)
    );
  }, [items, query]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safe_page = Math.min(page, pages - 1);
  const slice = visible.slice(safe_page * PAGE_SIZE, (safe_page + 1) * PAGE_SIZE);
  const from = visible.length ? safe_page * PAGE_SIZE + 1 : 0;
  const to = Math.min(visible.length, (safe_page + 1) * PAGE_SIZE);
  const picked = items.find((job) => String(job.job_id) === String(picked_id)) || null;

  function close_job() {
    set_picked_id(null);
    if (requested_job_id()) {
      window.history.replaceState(window.history.state, "", "#/dashboard/jobs");
    }
  }

  function run_search(event) {
    event.preventDefault();
    set_query(draft_query);
    set_page(0);
  }

  return (
    <section className="sjb_desk">
      {picked ?
        <article className="sjb_detail">
          <header className="sjb_detail_head">
            <button type="button" className="sjb_back" aria-label={ENGLISH.all_jobs} onClick={close_job}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{ENGLISH.all_jobs}</span>
            </button>
            <div className="sjb_detail_main">
              <span className="sjb_mark" aria-hidden="true">{mark_of(picked.job_title)}</span>
              <div className="sjb_detail_copy">
                <h1>{picked.job_title}</h1>
                <p>{picked.company_name || ENGLISH.company_coming_soon}</p>
                <div className="sjb_chips">
                  {picked.location ? <span>{picked.location}</span> : null}
                  {posted_ago(picked.created_at) ? <span>{posted_ago(picked.created_at)}</span> : null}
                  {picked.company_website ?
                    <a href={picked.company_website} target="_blank" rel="noreferrer">{host_of(picked.company_website)}</a> :
                    null}
                </div>
              </div>
            </div>
          </header>
          <div className="sjb_detail_body">
            <Job_Brief text={picked.job_description} />
            <div className="sjb_continue">
              <div>
                <b>{ENGLISH.like_this_role}</b>
                <span>{ENGLISH.continue_into_a_mock_interview_built_from_this}</span>
              </div>
              <button type="button" onClick={() => on_practise?.(picked)}>{ENGLISH.label_continue}</button>
            </div>
          </div>
        </article> :
        <>
          <form className="sjb_hero" onSubmit={run_search}>
            <div className="sjb_art" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
            <div className="sjb_search">
              <input
                aria-label={ENGLISH.job_title_skill_company_or_place}
                value={draft_query}
                placeholder={ENGLISH.job_title_skill_company_or_place}
                onChange={(event) => set_draft_query(event.target.value)} />
              <button type="submit">{ENGLISH.search_jobs}</button>
            </div>
          </form>

          {!loading && !error ?
            <p className="sjb_count">
              {visible.length ? ENGLISH.showing_of_roles(from, to, visible.length) : ENGLISH.no_roles_match_this_search}
            </p> :
            null}
          {loading ? <p className="sjb_note">{ENGLISH.loading_roles}</p> : null}
          {error ? <p className="sjb_note">{error}</p> : null}

          {!loading && !error && slice.length ?
            <ul className="sjb_board">
              {slice.map((job) => {
                const band = age_band(job.created_at);
                const when = posted_ago(job.created_at);
                return (
                  <li key={job.job_id} className={`sjb_card ${band}`}>
                    <span className="sjb_mark" aria-hidden="true">{mark_of(job.job_title)}</span>
                    <div className="sjb_card_copy">
                      <h2>{job.job_title}</h2>
                      <p className="sjb_company">
                        {job.company_name || ENGLISH.company_coming_soon}
                        {job.location ? ` · ${job.location}` : ""}
                      </p>
                      <p className="sjb_when">
                        <span>{age_label(band)}</span>
                        {when ? ` · ${when}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => set_picked_id(job.job_id)}>{ENGLISH.full_job_details}</button>
                  </li>
                );
              })}
            </ul> :
            null}

          {!loading && !error && pages > 1 ?
            <nav className="sjb_pager" aria-label={ENGLISH.job_pages}>
              <button type="button" disabled={safe_page === 0} onClick={() => set_page(safe_page - 1)}>{ENGLISH.prev}</button>
              <div className="sjb_pages">
                {page_marks(safe_page, pages).map((mark, index) =>
                  mark === "gap" ?
                    <span key={`gap_${index}`}>…</span> :
                    <button
                      key={mark}
                      type="button"
                      className={mark === safe_page ? "is_on" : ""}
                      onClick={() => set_page(mark)}>
                      {mark + 1}
                    </button>
                )}
              </div>
              <button type="button" disabled={safe_page >= pages - 1} onClick={() => set_page(safe_page + 1)}>{ENGLISH.next}</button>
            </nav> :
            null}

          {!loading && !error && !visible.length ?
            <div className="sjb_empty">
              <h2>{items.length ? ENGLISH.nothing_matches : ENGLISH.no_roles_yet}</h2>
              <p>
                {items.length ?
                  ENGLISH.try_another_word :
                  ENGLISH.when_a_role_is_posted_it_will_show}
              </p>
            </div> :
            null}
        </>}
    </section>
  );
}
