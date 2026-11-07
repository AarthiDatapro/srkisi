import { Button } from "@datapromr/button";
import { FilePicker } from "@datapromr/file-picker";
import { Input } from "@datapromr/input";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { COHORTS_ENGLISH as ENGLISH } from "../../constants/english/cohorts_constants_english.js";

function Image_Field({
  label,
  hint,
  input_id,
  file,
  preview_url,
  image_key,
  add_label,
  remove_label,
  on_file,
  on_clear
}) {
  return (
    <div className="cht_thumbnail_field">
      <span className="ui-field__label">{label}</span>
      <div className={`cht_thumbnail_field__wrap${file || preview_url ? " has_preview" : ""}`}>
        <FilePicker
          key={image_key}
          id={input_id}
          file={file}
          previewUrl={preview_url}
          accept="image/jpeg,image/png,image/webp,image/gif"
          label={add_label}
          onChange={on_file} />
        {file || preview_url ?
        <button
          type="button"
          className="cht_thumbnail_remove"
          aria-label={remove_label}
          title={remove_label}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            on_clear?.();
          }}>
          ×
        </button> :
        null}
      </div>
      <p className="cht_thumbnail_field__hint">{hint}</p>
    </div>
  );
}

export function Cohort_Form({
  values,
  errors,
  file,
  preview_url,
  image_key,
  profile_file,
  profile_preview_url,
  profile_key,
  submit_label,
  loading,
  on_change,
  on_file,
  on_clear,
  on_profile,
  on_clear_profile,
  on_submit
}) {
  function update(event) {
    const { name, value } = event.target;
    on_change({ ...values, [name]: value });
  }

  return (
    <form
      className="prg_form is_cohort"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="cohort"
        kicker={/save|edit/i.test(submit_label || "") ? ENGLISH.edit_cohort_2 : ENGLISH.new_cohort}
        hint={ENGLISH.name_the_group_and_add_its_pictures} />
      <div className="prg_form_fields">
        <Input
          id="cohort_name"
          name="cohort_name"
          label={ENGLISH.cohort_name}
          required
          variant="outlined"
          value={values.cohort_name}
          error={errors.cohort_name}
          onChange={update} />
        <label className="ui-field ui-field--outlined">
          <span className="ui-field__label">{ENGLISH.description}</span>
          <textarea
            className="ui-input ui-input--outlined prg_textarea"
            name="description"
            placeholder=" "
            value={values.description}
            onChange={update} />
        </label>
        <Image_Field
          label={ENGLISH.banner_image}
          hint={ENGLISH.wide_image_behind_the_cohort_title_stored_on}
          input_id="cohort_image"
          file={file}
          preview_url={preview_url}
          image_key={image_key}
          add_label={ENGLISH.add_banner_image}
          remove_label={ENGLISH.remove_banner_image}
          on_file={on_file}
          on_clear={on_clear} />
        <Image_Field
          label={ENGLISH.profile_image}
          hint={ENGLISH.shown_at_the_bottom_left_of_the_banner}
          input_id="cohort_profile"
          file={profile_file}
          preview_url={profile_preview_url}
          image_key={profile_key}
          add_label={ENGLISH.add_profile_image}
          remove_label={ENGLISH.remove_profile_image}
          on_file={on_profile}
          on_clear={on_clear_profile} />
      </div>
      <div className="prg_form_foot">
        <Button type="submit" loading={loading}>{submit_label}</Button>
      </div>
    </form>
  );
}
