import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

export function Module_Form({ values, errors, submit_label, loading, on_change, on_submit }) {
  function update(event) {
    const { name, type, value, checked } = event.target;
    on_change({ ...values, [name]: type === "checkbox" ? checked : value });
  }

  return (
    <form
      className="ccm_form is_module"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="module"
        kicker={/save/i.test(submit_label || "") ? ENGLISH.edit_module : ENGLISH.new_module}
        hint={ENGLISH.a_named_group_of_lessons_in_this_course} />
      <Input
        id="module_title"
        name="module_title"
        label={ENGLISH.module_title}
        required
        variant="outlined"
        value={values.module_title}
        error={errors.module_title}
        onChange={update} />
      
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.description}</span>
        <textarea
          className="ui-input ui-input--outlined ccm_form_area"
          name="module_description"
          placeholder=" "
          value={values.module_description}
          onChange={update} />
        
        {errors.module_description ?
        <span className="ui-field__error">{errors.module_description}</span> :
        null}
      </label>
      <label className="ccm_form_check">
        <input
          type="checkbox"
          name="is_active"
          checked={Boolean(values.is_active)}
          onChange={update} />{ENGLISH.published_2}</label>
      <div className="ccm_form_foot">
        <Button type="submit" loading={loading}>
          {submit_label}
        </Button>
      </div>
    </form>);

}
