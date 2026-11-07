import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import {
  BLOOM_KEYS,
  DIFFICULTY_KEYS,
  default_bloom_mix,
  default_difficulty_mix,
  empty_question,
  mix_total
} from
  "../utils.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

export function Quiz_Form({
  values,
  errors,
  modules = [],
  loading,
  editing = false,
  show_place = true,
  on_change,
  on_submit
}) {
  const selected_module = modules.find(
    (module) => String(module.module_id) === String(values.module_id)
  );
  const lessons = (selected_module?.blocks || []).
    filter((block) => block.lesson).
    map((block) => block.lesson);
  const module_index = modules.findIndex(
    (module) => String(module.module_id) === String(values.module_id)
  );
  const lesson_start = modules.
    slice(0, Math.max(module_index, 0)).
    reduce(
      (sum, module) => sum + (module.blocks || []).filter((block) => block.lesson).length,
      0
    );

  function update(event) {
    const { name, value } = event.target;
    if (name === "module_id") {
      on_change({ ...values, module_id: value, lesson_id: "" });
      return;
    }
    if (name === "lesson_id") {
      on_change({ ...values, lesson_id: value === "module" ? "" : value });
      return;
    }
    if (name === "count") {
      on_change({
        ...values,
        count: value,
        difficulty_mix: default_difficulty_mix(value),
        bloom_mix: default_bloom_mix(value)
      });
      return;
    }
    on_change({ ...values, [name]: value });
  }

  function update_mix(group, key, value) {
    on_change({ ...values, [group]: { ...(values[group] || {}), [key]: value } });
  }

  function set_question(index, next) {
    const questions = (values.questions || []).map((question, offset) =>
      offset === index ? next : question
    );
    on_change({ ...values, questions });
  }

  function add_question() {
    on_change({ ...values, questions: [...(values.questions || []), empty_question()] });
  }

  function remove_question(index) {
    const questions = (values.questions || []).filter((_, offset) => offset !== index);
    on_change({ ...values, questions });
  }

  return (
    <form
      className="ccm_form is_quiz"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="quiz"
        kicker={editing ? ENGLISH.edit_quiz : ENGLISH.new_quiz}
        hint={show_place ? ENGLISH.pick_the_lesson_then_set_how_the_questions : ENGLISH.set_how_the_questions_are_built} />

      {show_place && modules.length ?
        <>
          <Select
            name="module_id"
            label={ENGLISH.module}
            required
            value={values.module_id || ""}
            error={errors.module_id}
            options={modules.map((module, index) => ({
              value: module.module_id,
              label: ENGLISH.module_2(index + 1, module.module_title)
            }))}
            onChange={update} />

          {lessons.length ?
            <>
              <Select
                name="lesson_id"
                label={ENGLISH.lesson}
                value={values.lesson_id ? String(values.lesson_id) : "module"}
                error={errors.lesson_id}
                options={[
                  { value: "module", label: ENGLISH.module_quiz },
                  ...lessons.map((lesson, index) => ({
                    value: lesson.lesson_id,
                    label: ENGLISH.lesson_2(lesson_start + index + 1, lesson.lesson_title)
                  }))
                ]}
                onChange={update} />
              <p className="ccm_form_hint">{ENGLISH.choose_module_quiz_to_keep_this_quiz_on}</p>
            </> :


            <p className="ccm_form_hint">
              {values.module_id ?
                ENGLISH.create_a_lesson_in_this_module_first_then :
                ENGLISH.select_a_module_then_pick_the_lesson_this_2}
            </p>
          }
        </> :

        show_place ?
          <p className="ccm_form_hint">{ENGLISH.create_a_module_and_a_lesson_first_then_2}</p> :
          null
      }
      <Input
        id="quiz_name"
        name="quiz_name"
        label={ENGLISH.quiz_name}
        required
        variant="outlined"
        value={values.quiz_name}
        error={errors.quiz_name}
        onChange={update} />


      {editing ?
        <>
          <div className="ccm_form_triple">
            <Input
              id="questions_shown"
              name="questions_shown"
              label={ENGLISH.shown_to_student}
              required
              variant="outlined"
              value={values.questions_shown}
              error={errors.questions_shown}
              onChange={update} />

            <label className="ccm_form_check">
              <input
                type="checkbox"
                checked={values.is_published !== false}
                onChange={(event) => on_change({ ...values, is_published: event.target.checked })} />{ENGLISH.published_2}</label>
          </div>
          <p className="ccm_form_hint">{ENGLISH.students_get_a_shuffled_subset_of_this_many}</p>
          <div className="ccm_qedit_head">
            <h3>{ENGLISH.questions_2}</h3>
            <button type="button" className="ccm_textbtn" onClick={add_question}>{ENGLISH.add_question_2}</button>
          </div>
          {errors.questions ? <p className="ccm_form_error">{errors.questions}</p> : null}
          {(values.questions || []).map((question, index) =>
            <Question_Editor
              key={question.question_id || `new-${index}`}
              index={index}
              question={question}
              on_change={(next) => set_question(index, next)}
              on_remove={() => remove_question(index)}
              can_remove={(values.questions || []).length > 1} />

          )}
        </> :

        <>
          <label className="ui-field ui-field--outlined">
            <span className="ui-field__label">{ENGLISH.source_text}</span>
            <textarea
              className="ui-input ui-input--outlined ccm_form_area ccm_form_area_tall"
              name="text"
              required
              placeholder=" "
              value={values.text}
              onChange={update} />

            {errors.text ? <span className="ui-field__error">{errors.text}</span> : null}
          </label>
          <p className="ccm_form_hint">{ENGLISH.the_generator_reads_this_text_and_creates_multiple}</p>
          <div className="ccm_form_pair">
            <Input
              id="count"
              name="count"
              label={ENGLISH.questions_to_generate}
              required
              variant="outlined"
              value={values.count}
              error={errors.count}
              onChange={update} />

            <Input
              id="questions_shown"
              name="questions_shown"
              label={ENGLISH.shown_to_student}
              required
              variant="outlined"
              value={values.questions_shown}
              error={errors.questions_shown}
              onChange={update} />

          </div>
          <p className="ccm_form_hint">{ENGLISH.generate_a_larger_bank_if_you_want_students}</p>
          <p className="ccm_form_label">{ENGLISH.difficulty_mix}</p>
          <div className="ccm_mix">
            {DIFFICULTY_KEYS.map((key) =>
              <Input
                key={key}
                id={`difficulty-${key}`}
                name={`difficulty-${key}`}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                variant="outlined"
                value={values.difficulty_mix?.[key] ?? "0"}
                onChange={(event) => update_mix("difficulty_mix", key, event.target.value)} />

            )}
          </div>
          {errors.difficulty_mix ? <p className="ccm_form_error">{errors.difficulty_mix}</p> :
            <p className="ccm_form_hint">{ENGLISH.easy_medium_hard_must_equal}{values.count || 0}{ENGLISH.currently}{mix_total(values.difficulty_mix)}).
            </p>
          }
          <p className="ccm_form_label">{ENGLISH.bloom_mix}</p>
          <div className="ccm_mix ccm_mix_bloom">
            {BLOOM_KEYS.map((key) =>
              <Input
                key={key}
                id={`bloom-${key}`}
                name={`bloom-${key}`}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                variant="outlined"
                value={values.bloom_mix?.[key] ?? "0"}
                onChange={(event) => update_mix("bloom_mix", key, event.target.value)} />

            )}
          </div>
          {errors.bloom_mix ? <p className="ccm_form_error">{errors.bloom_mix}</p> :
            <p className="ccm_form_hint">{ENGLISH.bloom_counts_must_equal}{values.count || 0}{ENGLISH.currently}{mix_total(values.bloom_mix)}).
            </p>
          }
        </>
      }

      <div className="ccm_form_foot">
        <Button type="submit" loading={loading} disabled={show_place && (!modules.length || !lessons.length)}>
          {loading ?
            editing ?
              ENGLISH.saving_quiz :
              ENGLISH.generating_quiz :
            editing ?
              ENGLISH.save_quiz :
              ENGLISH.generate_quiz}
        </Button>
      </div>
    </form>);

}

function Question_Editor({ index, question, on_change, on_remove, can_remove }) {
  const options = question.options || ["", "", "", ""];

  function set_text(value) {
    on_change({ ...question, question_text: value });
  }

  function set_option(offset, value) {
    const previous = options[offset];
    const next = options.map((item, item_index) => item_index === offset ? value : item);
    on_change({
      ...question,
      options: next,
      correct_answer: question.correct_answer === previous ? value : question.correct_answer
    });
  }

  return (
    <fieldset className="ccm_qedit">
      <legend>{ENGLISH.question_2}{index + 1}</legend>
      {can_remove ?
        <button type="button" className="ccm_qedit_remove" onClick={on_remove}>{ENGLISH.remove}</button> :
        null}
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.question_3}</span>
        <textarea
          className="ui-input ui-input--outlined ccm_form_area"
          value={question.question_text}
          placeholder=" "
          required
          onChange={(event) => set_text(event.target.value)} />
      </label>

      <div className="ccm_qedit_opts">
        {options.map((option, offset) =>
          <label key={offset} className={question.correct_answer === option && option ? "is_on" : undefined}>
            <input
              type="radio"
              name={`correct-${index}`}
              checked={Boolean(option) && question.correct_answer === option}
              onChange={() => option && on_change({ ...question, correct_answer: option })} />

            <input
              className="ui-input ui-input--outlined"
              value={option}
              placeholder={ENGLISH.option(offset + 1)}
              onChange={(event) => set_option(offset, event.target.value)} />

          </label>
        )}
      </div>
      <p className="ccm_form_hint">{ENGLISH.select_the_radio_mark_for_the_correct_option}</p>
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.explanation}</span>
        <textarea
          className="ui-input ui-input--outlined ccm_form_area"
          value={question.explanation || ""}
          placeholder=" "
          onChange={(event) => on_change({ ...question, explanation: event.target.value })} />

      </label>
    </fieldset>);

}
