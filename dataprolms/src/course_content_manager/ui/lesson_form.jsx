import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

export function Lesson_Form({ values, errors, modules = [], submit_label, loading, on_change, on_submit }) {
  function update(event) {
    const { name, type, value, checked } = event.target;
    on_change({ ...values, [name]: type === "checkbox" ? checked : value });
  }

  return (
    <form
      className="ccm_form is_lesson"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="lesson"
        kicker={/save/i.test(submit_label || "") ? ENGLISH.edit_lesson_2 : ENGLISH.new_lesson}
        hint={ENGLISH.title_time_and_the_module_this_lesson_belongs} />
      {modules.length ?
      <label className="ui-field ui-field--outlined">
          <span className="ui-field__label">{ENGLISH.module}</span>
          <select
          className="ui-input ui-input--outlined"
          name="module_id"
          required
          value={values.module_id || ""}
          onChange={update}>
          
            <option value="" hidden>{ENGLISH.select_a_module}</option>
            {modules.map((module, index) =>
          <option key={module.module_id} value={module.module_id}>{ENGLISH.module_3}{index + 1}: {module.module_title}
              </option>
          )}
          </select>
          {errors.module_id ? <span className="ui-field__error">{errors.module_id}</span> : null}
        </label> :
      null}
      <Input
        id="lesson_title"
        name="lesson_title"
        label={ENGLISH.lesson_title}
        required
        variant="outlined"
        value={values.lesson_title}
        error={errors.lesson_title}
        onChange={update} />
      
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.description}</span>
        <textarea
          className="ui-input ui-input--outlined ccm_form_area"
          name="lesson_description"
          placeholder=" "
          value={values.lesson_description}
          onChange={update} />
        
        {errors.lesson_description ?
        <span className="ui-field__error">{errors.lesson_description}</span> :
        null}
      </label>
      <div className="ccm_form_row">
        <Input
          id="duration_minutes"
          name="duration_minutes"
          label={ENGLISH.duration_minutes}
          variant="outlined"
          value={values.duration_minutes}
          error={errors.duration_minutes}
          onChange={update} />
        
        <label className="ccm_form_check">
          <input
            type="checkbox"
            name="is_active"
            checked={Boolean(values.is_active)}
            onChange={update} />{ENGLISH.published_2}</label>
      </div>
      <div className="ccm_form_foot">
        <Button type="submit" loading={loading}>
          {submit_label}
        </Button>
      </div>
    </form>);

}
