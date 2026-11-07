import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { Faculty_Picker } from "./faculty_picker.jsx";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { preview_program_code } from "../utils.js";
import { COHORTS_ENGLISH as ENGLISH } from "../../constants/english/cohorts_constants_english.js";

export function Program_Record_Form({
  values,
  errors,
  types = [],
  submit_label,
  loading,
  on_change,
  show_faculty = false,
  employees = [],
  faculty_ids = [],
  on_faculty_change,
  on_submit
}) {
  function update(event) {
    const { name, value } = event.target;
    if (name === "start_date" && values.end_date && value && values.end_date < value) {
      on_change({ ...values, start_date: value, end_date: "" });
      return;
    }
    on_change({ ...values, [name]: value });
  }

  return (
    <form
      className="prg_form is_program"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="program"
        kicker={/save|edit/i.test(submit_label || "") ? ENGLISH.edit_program_2 : ENGLISH.new_program}
        hint={ENGLISH.code_dates_and_the_people_who_teach_it} />
      <div className="prg_form_fields">
        <p className="prg_preview">
          <span>{ENGLISH.code}</span>
          <b>{preview_program_code()}</b>
        </p>
        <Input
          id="program_name"
          name="program_name"
          label={ENGLISH.program_name}
          required
          variant="outlined"
          value={values.program_name}
          error={errors.program_name}
          onChange={update} />
        <div className="prg_form_row">
          <Select
            name="program_type_id"
            label={ENGLISH.program_type}
            required
            value={values.program_type_id}
            error={errors.program_type_id}
            placeholder={ENGLISH.select_type}
            options={types}
            onChange={update} />
          <Input
            id="duration_months"
            name="duration_months"
            label={ENGLISH.duration_months}
            variant="outlined"
            value={values.duration_months}
            error={errors.duration_months}
            onChange={update} />
        </div>
        <div className="prg_form_row">
          <Input
            id="program_start_date"
            name="start_date"
            label={ENGLISH.start_date}
            required
            type="date"
            variant="outlined"
            value={values.start_date}
            error={errors.start_date}
            onChange={update} />
          <Input
            id="program_end_date"
            name="end_date"
            label={ENGLISH.end_date}
            required
            type="date"
            variant="outlined"
            min={values.start_date || undefined}
            value={values.end_date}
            error={errors.end_date}
            onChange={update} />
        </div>
        <label className="ui-field ui-field--outlined">
          <span className="ui-field__label">{ENGLISH.description}</span>
          <textarea
            className="ui-input ui-input--outlined prg_textarea"
            name="description"
            placeholder=" "
            value={values.description}
            onChange={update} />
          {errors.description ?
          <span className="ui-field__error">{errors.description}</span> :
          null}
        </label>
        {show_faculty ?
        <div className="cht_faculty">
          <Faculty_Picker
            employees={employees}
            selected_ids={faculty_ids}
            on_change={on_faculty_change} />
        </div> :
        null}
      </div>
      <div className="prg_form_foot">
        <Button type="submit" loading={loading}>
          {submit_label}
        </Button>
      </div>
    </form>
  );
}
