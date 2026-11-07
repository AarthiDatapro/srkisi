import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

export function Coding_Form({
  values,
  errors,
  modules = [],
  languages = [],
  loading,
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
    on_change({ ...values, [name]: value });
  }

  return (
    <form
      className="ccm_form is_coding"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="coding"
        kicker={ENGLISH.coding_exercise}
        hint={ENGLISH.name_it_choose_a_language_and_describe_what} />

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
            <Select
              name="lesson_id"
              label={ENGLISH.lesson}
              required
              placeholder={ENGLISH.select_a_lesson}
              value={values.lesson_id ? String(values.lesson_id) : ""}
              error={errors.lesson_id}
              options={lessons.map((lesson, index) => ({
                value: lesson.lesson_id,
                label: ENGLISH.lesson_2(lesson_start + index + 1, lesson.lesson_title)
              }))}
              onChange={update} /> :


            <p className="ccm_form_hint">
              {values.module_id ?
                ENGLISH.create_a_lesson_in_this_module_first_coding :
                ENGLISH.select_a_module_then_pick_the_lesson_this}
            </p>
          }
        </> :

        show_place ?
          <p className="ccm_form_hint">{ENGLISH.create_a_module_and_a_lesson_first_then}</p> :
          null
      }

      <Input
        id="set_title"
        name="set_title"
        label={ENGLISH.exercise_name}
        required
        variant="outlined"
        value={values.set_title}
        error={errors.set_title}
        onChange={update} />

      <Select
        name="programming_language_id"
        label={ENGLISH.programming_language}
        required
        placeholder={ENGLISH.select_a_language}
        value={values.programming_language_id ? String(values.programming_language_id) : ""}
        error={errors.programming_language_id}
        options={languages.map((language) => ({
          value: language.id,
          label: language.name
        }))}
        onChange={update} />

      {languages.length ? null :
        <p className="ccm_form_hint">{ENGLISH.add_a_programming_language_in_dropdowns_before_generating}</p>
      }

      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.prompt}</span>
        <textarea
          className="ui-input ui-input--outlined ccm_form_area ccm_form_area_tall"
          name="prompt"
          required
          placeholder=" "
          value={values.prompt}
          onChange={update} />

        {errors.prompt ? <span className="ui-field__error">{errors.prompt}</span> : null}
      </label>
      <div className="ccm_form_foot">
        <Button
          type="submit"
          loading={loading}
          disabled={show_place && (!modules.length || !lessons.length)}>
          {loading ? ENGLISH.generating_exercise : ENGLISH.generate_exercise}
        </Button>
      </div>
    </form>
  );
}
