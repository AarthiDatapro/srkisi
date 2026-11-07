import { Button } from "@datapromr/button";
import { Image_Picker } from "../../image_picker/image_picker.jsx";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { preview_course_code } from "../utils.js";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_manager_constants_english.js";

function Point_List({ name, label, points, error, on_change }) {
  const rows = points.length ? points : [""];

  function set_at(index, value) {
    const next = rows.slice();
    next[index] = value;
    on_change(next);
  }

  return (
    <fieldset className="crs_points">
      <p className="crs_form_label">{label}</p>
      {rows.map((point, index) =>
        <div className="crs_point_row" key={`${name}-${index}`}>
          <Input
            id={`${name}_${index}`}
            name={`${name}_${index}`}
            label={ENGLISH.point(index + 1)}
            variant="outlined"
            value={point}
            onChange={(event) => set_at(index, event.target.value)} />
          <button
            type="button"
            aria-label={ENGLISH.remove_point}
            onClick={() => on_change(rows.filter((_, item) => item !== index).length ? rows.filter((_, item) => item !== index) : [""])}>
            ×
          </button>
        </div>
      )}
      <button type="button" onClick={() => on_change([...rows, ""])}>{ENGLISH.add_point}</button>
      {error ? <span className="ui-field__error">{error}</span> : null}
    </fieldset>
  );
}

function Switch({ name, checked, label, onChange }) {
  return (
    <label className="crs_switch">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      <span className="crs_switch_track" />
      <span>{label}</span>
    </label>
  );
}

function usable(list, current_id) {
  return list.filter((item) => item.is_active || String(item.id) === String(current_id || ""));
}

function usable_many(list, selected_ids) {
  const picked = new Set((selected_ids || []).map(String));
  return list.filter((item) => item.is_active || picked.has(String(item.id)));
}

export function Course_Form({
  values,
  errors,
  types = [],
  domains = [],
  levels = [],
  languages = [],
  tags = [],
  programs = [],
  selected_ids = [],
  file,
  preview_url,
  submit_label,
  editing = false,
  loading,
  on_change,
  on_cohorts,
  on_file,
  on_remove,
  on_submit
}) {
  function update(event) {
    const { name, type, value, checked } = event.target;
    on_change({ ...values, [name]: type === "checkbox" ? checked : value });
  }

  return (
    <form
      className="prg_form crs_form is_course"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="course"
        kicker={editing ? ENGLISH.edit_course : ENGLISH.new_course}
        hint={ENGLISH.name_type_and_how_students_join} />
      <div className="prg_form_fields">
        <p className="prg_preview">
          <span>{ENGLISH.code}</span>
          <b>{preview_course_code(values, domains)}</b>
        </p>
        <Input
          id="course_name"
          name="course_name"
          label={ENGLISH.course_name}
          variant="outlined"
          required
          value={values.course_name}
          error={errors.course_name}
          onChange={update} />
        <Input
          id="course_tagline"
          name="course_tagline"
          label={ENGLISH.tagline}
          variant="outlined"
          required
          placeholder={ENGLISH.one_line_under_the_course_title}
          value={values.course_tagline}
          error={errors.course_tagline}
          onChange={update} />
        <Input
          id="duration_hours"
          name="duration_hours"
          label={ENGLISH.duration_hours}
          variant="outlined"
          value={values.duration_hours}
          error={errors.duration_hours}
          onChange={update} />
        <label className="ui-field ui-field--outlined">
          <span className="ui-field__label">{ENGLISH.description}</span>
          <textarea
            className="ui-input ui-input--outlined prg_textarea"
            name="course_description"
            placeholder=" "
            value={values.course_description}
            onChange={update} />
          {errors.course_description ? (
            <span className="ui-field__error">{errors.course_description}</span>
          ) : null}
        </label>
        <Input
          id="created_by_display"
          name="created_by_display"
          label={ENGLISH.created_by}
          variant="outlined"
          placeholder={ENGLISH.created_by_ai_expert}
          value={values.created_by_display}
          error={errors.created_by_display}
          onChange={update} />
        <Input
          id="real_world_project_count"
          name="real_world_project_count"
          label={ENGLISH.real_world_projects}
          variant="outlined"
          type="text"
          inputMode="numeric"
          value={values.real_world_project_count}
          error={errors.real_world_project_count}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
            on_change({ ...values, real_world_project_count: digits });
          }} />
        <fieldset className="crs_form_picks">
          <p className="crs_form_label">{ENGLISH.course_details}</p>
          <Select
            name="course_type_id"
            label={ENGLISH.course_type}
            required
            value={values.course_type_id}
            error={errors.course_type_id}
            placeholder={ENGLISH.select_type}
            options={usable(types, values.course_type_id)}
            onChange={update} />
          <Select
            name="course_level_id"
            label={ENGLISH.level}
            required
            value={values.course_level_id}
            error={errors.course_level_id}
            placeholder={ENGLISH.select_level}
            options={usable(levels, values.course_level_id)}
            onChange={update} />
          <Select
            name="course_domain_id"
            label={ENGLISH.domain}
            required
            value={values.course_domain_id}
            error={errors.course_domain_id}
            placeholder={ENGLISH.select_domain}
            options={usable(domains, values.course_domain_id)}
            onChange={update} />
          <Select
            name="course_tag_id"
            label={ENGLISH.tag}
            required
            value={values.course_tag_id}
            error={errors.course_tag_id}
            placeholder={ENGLISH.select_tag}
            options={usable(tags, values.course_tag_id)}
            onChange={update} />
        </fieldset>
        <Point_List
          name="learn_points"
          label={ENGLISH.what_you_ll_learn}
          points={values.learn_points || [""]}
          error={errors.learn_points}
          on_change={(learn_points) => on_change({ ...values, learn_points })} />
        <Point_List
          name="audience_points"
          label={ENGLISH.who_is_this_course_for}
          points={values.audience_points || [""]}
          error={errors.audience_points}
          on_change={(audience_points) => on_change({ ...values, audience_points })} />
        <fieldset className="crs_form_mode" data-required-group="languages">
          <legend>{ENGLISH.languages}</legend>
          {languages.length ?
            <div className="crs_lang_list">
              {usable_many(languages, values.language_ids).map((item) => {
                const id = String(item.id);
                const selected = (values.language_ids || []).includes(id);
                return (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const current = values.language_ids || [];
                        const language_ids = selected ? current.filter((value) => value !== id) : [...current, id];
                        on_change({ ...values, language_ids });
                      }} />
                    <span>{item.name}</span>
                  </label>
                );
              })}
            </div> :
            <p className="crs_form_hint">{ENGLISH.add_languages_in_dropdowns_first}</p>}
          {errors.language_ids ? <span className="ui-field__error">{errors.language_ids}</span> : null}
        </fieldset>
        <fieldset className="crs_form_switches">
          <p className="crs_form_label">{ENGLISH.course_settings}</p>
          <Switch
            name="is_active"
            label={ENGLISH.active_course}
            checked={Boolean(values.is_active)}
            onChange={update} />
          <Switch
            name="has_completion_certificate"
            label={ENGLISH.completion_certificate}
            checked={Boolean(values.has_completion_certificate)}
            onChange={update} />
          <Switch
            name="is_paid"
            label={ENGLISH.paid_course}
            checked={Boolean(values.is_paid)}
            onChange={update} />
          <Switch
            name="is_open"
            label={ENGLISH.open_course}
            checked={Boolean(values.is_open)}
            onChange={update} />
          <Switch
            name="is_offline"
            label={ENGLISH.offline_course}
            checked={Boolean(values.is_offline)}
            onChange={update} />
        </fieldset>
        {values.is_offline ? (
          <Input
            id="student_id_format"
            name="student_id_format"
            label={ENGLISH.student_id_format}
            variant="outlined"
            required
            value={values.student_id_format}
            error={errors.student_id_format}
            onChange={update} />
        ) : null}
        {values.is_offline ? (
          <p className="crs_form_hint">{ENGLISH.ids_will_be}{String(values.student_id_format || "").trim() || "FORMAT"}-1,{" "}
            {String(values.student_id_format || "").trim() || "FORMAT"}{ENGLISH.label_2_passkeys_are_set_per_program_below_or}</p>
        ) : null}
        {values.is_paid ?
          <div className="prg_form_row">
            <Input
              id="fee_amount"
              name="fee_amount"
              label={ENGLISH.amount}
              variant="outlined"
              required
              value={values.fee_amount}
              error={errors.fee_amount}
              onChange={update} />
            <Input
              id="discount_percent"
              name="discount_percent"
              label={ENGLISH.discount}
              variant="outlined"
              value={values.discount_percent}
              error={errors.discount_percent}
              onChange={update} />
          </div> :
          null}
        <Image_Picker
          id="course_image"
          file={file}
          preview_url={preview_url}
          label={ENGLISH.add_course_image}
          on_change={on_file}
          on_remove={on_remove} />
        {editing ? (
          <button type="button" className="crs_cohorts_btn" onClick={on_cohorts}>
            <span className="crs_cohorts_mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 7.5h8M8 12h8M8 16.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18V6a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </span>
            <span className="crs_cohorts_copy">
              <b>{ENGLISH.want_to_assign_to_a_program}</b>
              <small>{ENGLISH.open_a_cohort_then_add_this_course_to}</small>
            </span>
            <span className="crs_cohorts_go">{ENGLISH.click_here}</span>
          </button>
        ) : null}
        {values.is_offline && selected_ids.length ? (
          <div className="crs_form_passkeys">
            <h4>{ENGLISH.program_passkeys}</h4>
            <p className="crs_form_hint">{ENGLISH.each_program_needs_its_own_access_key_for}</p>
            {selected_ids.map((program_id) => {
              const program = programs.find((item) => Number(item.program_id) === Number(program_id));
              const key = String(program_id);
              const passkeys = values.program_passkeys || {};
              const field_error = errors.program_passkeys?.[key] || "";
              return (
                <Input
                  key={key}
                  id={`program_passkey_${key}`}
                  name={`program_passkey_${key}`}
                  label={program?.program_name || ENGLISH.program(key)}
                  variant="outlined"
                  required
                  value={passkeys[key] || ""}
                  error={field_error}
                  onChange={(event) =>
                    on_change({
                      ...values,
                      program_passkeys: {
                        ...passkeys,
                        [key]: event.target.value
                      }
                    })
                  } />
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="prg_form_foot">
        <Button type="submit" loading={loading}>
          {submit_label}
        </Button>
      </div>
    </form>
  );
}
