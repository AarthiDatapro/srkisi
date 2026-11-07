import { useEffect, useState } from "react";
import { useToast } from "@datapromr/toast";
import { Confirm_Modal } from "../admin_ui/confirm_modal.jsx";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import "../admin_ui/theme/admin_forms.css";
import {
  create_hackathon,
  delete_hackathon,
  generate_hackathon_coding,
  generate_hackathon_mcq,
  get_hackathon,
  list_hackathon_options,
  list_hackathons,
  update_hackathon
} from "./api.js";
import { empty_hackathon } from "./utils.js";
import { Hackathon_Board } from "./ui/hackathon_board.jsx";
import { Hackathon_Editor } from "./ui/hackathon_editor.jsx";
import { Hackathon_View_Card } from "./ui/hackathon_view_card.jsx";
import "./theme/hackathon_manager.css";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../constants/english/hackathon_manager_constants_english.js";

export function Hackathon_Manager() {
  const toast = useToast();
  const { can_edit } = use_screen_access(SCREEN.hackathons);
  const [items, set_items] = useState([]);
  const [cohorts, set_cohorts] = useState([]);
  const [certificates, set_certificates] = useState([]);
  const [languages, set_languages] = useState([]);
  const [loading, set_loading] = useState(true);
  const [draft, set_draft] = useState(null);
  const [viewing, set_viewing] = useState(null);
  const [busy, set_busy] = useState("");
  const [pending, set_pending] = useState(null);

  useEffect(() => {
    let alive = true;
    set_loading(true);
    Promise.all([list_hackathons(), list_hackathon_options()]).
      then(([list, options]) => {
        if (!alive) return;
        set_items(list.items || []);
        set_cohorts(options.cohorts || []);
        set_certificates(options.certificates || []);
        set_languages(options.languages || []);
      }).
      catch((err) => {
        if (alive) toast.error(err.message);
      }).
      finally(() => {
        if (alive) set_loading(false);
      });
    return () => {
      alive = false;
    };
  }, [toast]);

  async function open_hackathon(hackathon_id) {
    set_busy("open");
    try {
      const payload = await get_hackathon(hackathon_id);
      set_draft({ ...empty_hackathon(), ...payload.item, source_text: "", question_count: 5 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  async function view_hackathon(hackathon_id) {
    const listed = items.find((item) => item.hackathon_id === hackathon_id) || {};
    set_busy("view");
    set_viewing({ ...listed, items: [] });
    try {
      const payload = await get_hackathon(hackathon_id);
      set_viewing({
        ...listed,
        ...payload.item,
        program_name: listed.program_name || "",
        cohort_name: listed.cohort_name || ""
      });
    } catch (err) {
      set_viewing(null);
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  async function save(status) {
    if (!draft) return;
    set_busy(status);
    const body = { ...draft, status };
    try {
      const payload = draft.hackathon_id ?
        await update_hackathon(draft.hackathon_id, body) :
        await create_hackathon(body);
      const saved = payload.item;
      set_draft({ ...saved, source_text: draft.source_text || "", question_count: draft.question_count || 5 });
      set_items((current) => {
        const previous = current.find((item) => item.hackathon_id === saved.hackathon_id);
        const row = {
          hackathon_id: saved.hackathon_id,
          title: saved.title,
          description: String(saved.description || "").replace(/\s+/g, " ").trim().slice(0, 140),
          hackathon_type: saved.hackathon_type,
          audience: saved.audience,
          status: saved.status,
          starts_at: saved.starts_at,
          ends_at: saved.ends_at,
          cohort_name: cohorts.find((item) => String(item.cohort_id) === String(saved.cohort_id))?.cohort_name || "",
          program_name: cohorts.find((item) => String(item.cohort_id) === String(saved.cohort_id))?.programs?.find((program) => String(program.program_id) === String((saved.program_ids || [])[0]))?.program_name || "",
          item_count: (saved.items || []).length,
          program_count: (saved.program_ids || []).length,
          batch_count: previous?.batch_count || 0,
          participant_count: previous?.participant_count || 0
        };
        const rest = current.filter((item) => item.hackathon_id !== saved.hackathon_id);
        return [row, ...rest];
      });
      toast.success(status === "published" ? ENGLISH.hackathon_published : ENGLISH.draft_saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  async function generate_mcq(body) {
    if (!draft) return false;
    set_busy("mcq");
    try {
      const payload = await generate_hackathon_mcq(body);
      set_draft((current) => current ? { ...current, items: [...current.items, ...(payload.items || []).map((item) => ({ ...item, item_type: item.item_type || "mcq" }))] } : current);
      toast.success(ENGLISH.questions_added);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      set_busy("");
    }
  }

  async function generate_coding(item) {
    set_busy("coding");
    try {
      const payload = await generate_hackathon_coding(item);
      toast.success(ENGLISH.coding_question_generated);
      return payload.item;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      set_busy("");
    }
  }

  async function confirm_delete() {
    if (!pending) return;
    set_busy("delete");
    try {
      await delete_hackathon(pending.hackathon_id);
      set_items((current) => current.filter((item) => item.hackathon_id !== pending.hackathon_id));
      if (draft?.hackathon_id === pending.hackathon_id) set_draft(null);
      set_pending(null);
      toast.success(ENGLISH.hackathon_deleted);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  return (
    <section className="hkm_desk">
      {draft ?
        <Hackathon_Editor
          open
          values={draft}
          cohorts={cohorts}
          certificates={certificates}
          languages={languages}
          can_edit={can_edit}
          busy={busy}
          on_change={set_draft}
          on_close={() => {
            if (!busy) set_draft(null);
          }}
          on_save={save}
          on_generate_mcq={generate_mcq}
          on_generate_coding={generate_coding} /> :
        null}
      {draft ? null :
        <Hackathon_Board
          items={items}
          loading={loading}
          can_edit={can_edit}
          on_view={view_hackathon}
          on_open={open_hackathon}
          on_create={() => set_draft(empty_hackathon())}
          on_delete={set_pending}
          on_counts={(hackathon_id, counts) => {
            set_items((current) => {
              const item = current.find((row) => row.hackathon_id === hackathon_id);
              if (item && item.batch_count === counts.batch_count && item.participant_count === counts.participant_count) return current;
              return current.map((row) => row.hackathon_id === hackathon_id ? { ...row, ...counts } : row);
            });
          }} />}
      <Hackathon_View_Card
        open={Boolean(viewing)}
        item={viewing}
        certificates={certificates}
        loading={busy === "view"}
        on_close={() => {
          if (busy !== "view") set_viewing(null);
        }} />
      <Confirm_Modal
        open={Boolean(pending)}
        title={ENGLISH.delete_hackathon}
        message={pending ? ENGLISH.delete_this_cannot_be_undone(pending.title) : ""}
        confirm_label={ENGLISH.label_delete}
        loading={busy === "delete"}
        on_confirm={confirm_delete}
        on_cancel={() => {
          if (busy !== "delete") set_pending(null);
        }} />
    </section>
  );
}
