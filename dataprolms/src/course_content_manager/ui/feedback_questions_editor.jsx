import { useEffect, useState } from "react";
import { useToast } from "@datapromr/toast";
import {
  get_feedback_questions,
  reset_feedback_questions,
  save_feedback_questions
} from "../api.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function blank_question() {
  return {
    question_text: "",
    options: ["", ""],
    sequence_no: 1
  };
}

export function Feedback_Questions_Editor({ course_id, can_edit = false }) {
  const toast = useToast();
  const [source, set_source] = useState("default");
  const [questions, set_questions] = useState([blank_question()]);
  const [loading, set_loading] = useState(false);
  const [saving, set_saving] = useState(false);

  useEffect(() => {
    if (!course_id) return undefined;
    let alive = true;
    set_loading(true);
    get_feedback_questions(course_id).
    then((payload) => {
      if (!alive) return;
      set_source(payload.source || "default");
      const next = (payload.questions || []).map((item, index) => ({
        question_text: item.question_text || "",
        options: item.options?.length ? [...item.options] : ["", ""],
        sequence_no: item.sequence_no || index + 1
      }));
      set_questions(next.length ? next : [blank_question()]);
    }).
    catch((err) => toast.error(err.message)).
    finally(() => {
      if (alive) set_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [course_id, toast]);

  function update_question(index, patch) {
    set_questions((current) =>
      current.map((item, item_index) => (item_index === index ? { ...item, ...patch } : item))
    );
  }

  function remove_option(question_index, option_index) {
    set_questions((current) =>
      current.map((item, item_index) => {
        if (item_index !== question_index) return item;
        if ((item.options || []).length <= 2) return item;
        return {
          ...item,
          options: item.options.filter((_, index) => index !== option_index)
        };
      })
    );
  }

  function update_option(question_index, option_index, value) {
    set_questions((current) =>
      current.map((item, item_index) => {
        if (item_index !== question_index) return item;
        const options = [...(item.options || [])];
        options[option_index] = value;
        return { ...item, options };
      })
    );
  }

  async function handle_save() {
    set_saving(true);
    try {
      const payload = await save_feedback_questions(course_id, {
        questions: questions.map((item, index) => ({
          question_text: item.question_text,
          options: item.options,
          sequence_no: index + 1
        }))
      });
      set_source(payload.source || "course");
      set_questions(
        (payload.questions || []).map((item, index) => ({
          question_text: item.question_text || "",
          options: item.options?.length ? [...item.options] : ["", ""],
          sequence_no: item.sequence_no || index + 1
        }))
      );
      toast.success(ENGLISH.feedback_questions_saved_for_this_course);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function handle_reset() {
    set_saving(true);
    try {
      const payload = await reset_feedback_questions(course_id);
      set_source(payload.source || "default");
      set_questions(
        (payload.questions || []).map((item, index) => ({
          question_text: item.question_text || "",
          options: item.options?.length ? [...item.options] : ["", ""],
          sequence_no: item.sequence_no || index + 1
        }))
      );
      toast.success(ENGLISH.restored_default_feedback_questions);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  if (loading) return <p className="ccm_form_hint">{ENGLISH.loading_feedback_questions}</p>;

  const source_label = source === "course" ? ENGLISH.custom_for_this_course : ENGLISH.shared_defaults;
  const source_copy = source === "course" ?
    ENGLISH.students_answer_these_choices_answers_are_stored_as :
    ENGLISH.these_questions_are_shared_by_every_course_until;

  return (
    <section className="ccm_feedback_qs">
      <header className="ccm_feedback_qs_head">
        <div className="ccm_feedback_qs_intro">
          <h2>{ENGLISH.feedback_questions}</h2>
          <p>
            <span className={source === "course" ? "ccm_feedback_qs_badge is_custom" : "ccm_feedback_qs_badge"}>
              {source_label}
            </span>
            {source_copy}
          </p>
        </div>
        {can_edit ?
          <div className="ccm_feedback_qs_actions">
            <button type="button" className="ccm_feedback_qs_reset" disabled={saving} onClick={handle_reset}>{ENGLISH.use_defaults}</button>
            <button type="button" className="ccm_feedback_qs_save" disabled={saving} onClick={handle_save}>
              {saving ? "Saving..." : ENGLISH.save_for_this_course}
            </button>
          </div> :
          null}
      </header>

      <div className="ccm_feedback_qs_list">
        {questions.map((question, question_index) =>
          <article key={question_index} className="ccm_feedback_q_card">
            <div className="ccm_feedback_q_top">
              <span className="ccm_feedback_q_num">{question_index + 1}</span>
              <input
                className="ccm_feedback_q_input"
                value={question.question_text}
                disabled={!can_edit}
                aria-label={ENGLISH.question(question_index + 1)}
                onChange={(event) =>
                  update_question(question_index, { question_text: event.target.value })
                }
                placeholder={ENGLISH.write_the_question_students_will_see} />
              {can_edit && questions.length > 1 ?
                <button
                  type="button"
                  className="ccm_feedback_q_remove"
                  onClick={() =>
                    set_questions((current) => current.filter((_, index) => index !== question_index))
                  }>{ENGLISH.remove}</button> :
                null}
            </div>
            <div className="ccm_feedback_opts_edit">
              {(question.options || []).map((option, option_index) =>
                <div className="ccm_feedback_opt" key={option_index}>
                  <span>{option_index + 1}</span>
                  <input
                    value={option}
                    disabled={!can_edit}
                    aria-label={ENGLISH.question_option(question_index + 1, option_index + 1)}
                    onChange={(event) =>
                      update_option(question_index, option_index, event.target.value)
                    }
                    placeholder={ENGLISH.answer_choice} />
                  {can_edit && (question.options || []).length > 2 ?
                    <button
                      type="button"
                      className="ccm_feedback_opt_remove"
                      aria-label={ENGLISH.remove_option(option_index + 1)}
                      onClick={() => remove_option(question_index, option_index)}>
                      ×
                    </button> :
                    <span className="ccm_feedback_opt_lock" aria-hidden="true" />}
                </div>
              )}
            </div>
            {can_edit ?
              <button
                type="button"
                className="ccm_feedback_add_opt"
                onClick={() =>
                  update_question(question_index, {
                    options: [...(question.options || []), ""]
                  })
                }>{ENGLISH.add_option}</button> :
              null}
          </article>
        )}
      </div>

      {can_edit ?
        <button
          type="button"
          className="ccm_feedback_add_q"
          onClick={() => set_questions((current) => [...current, blank_question()])}>{ENGLISH.add_question}</button> :
        null}
    </section>
  );
}
