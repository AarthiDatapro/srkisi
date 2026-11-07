import { Button } from "@datapromr/button";
import { Image_Picker } from "../../image_picker/image_picker.jsx";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { preview_employee_code, today_iso } from "../utils.js";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { Screen_Access_Board } from "./screen_access_board.jsx";
import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/employee_manager_constants_english.js";

function usable(list, current_id) {
  return list.filter((item) => item.is_active || String(item.id) === String(current_id || ""));
}

function Field({ id, on_change, ...props }) {
  return <Input id={id} name={id} variant="outlined" {...props} onChange={on_change} />;
}

export function Employee_Form({
  values,
  errors,
  types = [],
  departments = [],
  designations = [],
  employment_types = [],
  genders = [],
  locations = [],
  managers = [],
  require_password = false,
  file,
  preview_url,
  submit_label,
  loading,
  on_change,
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
      className="prg_form emp_form is_people"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="people"
        kicker={/save|edit/i.test(submit_label || "") ? ENGLISH.edit_employee : ENGLISH.new_employee}
        hint={ENGLISH.profile_role_and_sign_in_details} />
      <div className="prg_form_fields">
        <p className="prg_preview">
          <span>{ENGLISH.code}</span>
          <b>{preview_employee_code()}</b>
        </p>
        <Image_Picker
          id="employee_photo"
          file={file}
          preview_url={preview_url}
          label={ENGLISH.add_photo}
          on_change={on_file}
          on_remove={on_remove} />
        

        <h4 className="emp_form_heading">{ENGLISH.name}</h4>
        <div className="prg_form_row">
          <Field
            id="first_name"
            label={ENGLISH.first_name}
            required
            value={values.first_name}
            error={errors.first_name}
            on_change={update} />
          
          <Field
            id="last_name"
            label={ENGLISH.last_name}
            required
            value={values.last_name}
            error={errors.last_name}
            on_change={update} />
          
        </div>
        <Field
          id="middle_name"
          label={ENGLISH.middle_name}
          value={values.middle_name}
          error={errors.middle_name}
          on_change={update} />
        
        <div className="prg_form_row">
          <Select
            name="gender_id"
            label={ENGLISH.gender}
            value={values.gender_id}
            error={errors.gender_id}
            placeholder={ENGLISH.select_gender}
            options={usable(genders, values.gender_id)}
            onChange={update} />
          
          <Field
            id="date_of_birth"
            type="date"
            label={ENGLISH.date_of_birth}
            value={values.date_of_birth}
            error={errors.date_of_birth}
            max={today_iso()}
            on_change={update} />
          
        </div>

        <h4 className="emp_form_heading">{ENGLISH.contact}</h4>
        <Field
          id="email"
          required
          type="email"
          label={ENGLISH.email}
          value={values.email}
          error={errors.email}
          on_change={update} />
        
        <div className="prg_form_row">
          <Field
            id="mobile_number"
            required
            label={ENGLISH.mobile_number}
            value={values.mobile_number}
            error={errors.mobile_number}
            on_change={update} />
          
          <Field
            id="alternate_phone"
            label={ENGLISH.alternate_phone}
            value={values.alternate_phone}
            error={errors.alternate_phone}
            on_change={update} />
          
        </div>
        

        <h4 className="emp_form_heading">{ENGLISH.role}</h4>
        <div className="prg_form_row">
          <Select
            name="employee_type_id"
            label={ENGLISH.employee_type}
            required
            value={values.employee_type_id}
            error={errors.employee_type_id}
            placeholder={ENGLISH.select_type}
            options={usable(types, values.employee_type_id)}
            onChange={update} />
          
          <Select
            name="employment_type_id"
            label={ENGLISH.employment_type}
            value={values.employment_type_id}
            error={errors.employment_type_id}
            placeholder={ENGLISH.select_employment_type}
            options={usable(employment_types, values.employment_type_id)}
            onChange={update} />
          
        </div>
        <div className="prg_form_row">
          <Select
            name="department_id"
            label={ENGLISH.department}
            required
            value={values.department_id}
            error={errors.department_id}
            placeholder={ENGLISH.select_department}
            options={usable(departments, values.department_id)}
            onChange={update} />
          
          <Select
            name="designation_id"
            label={ENGLISH.designation}
            required
            value={values.designation_id}
            error={errors.designation_id}
            placeholder={ENGLISH.select_designation}
            options={usable(designations, values.designation_id)}
            onChange={update} />
          
        </div>
        <div className="prg_form_row">
          <Field
            id="joining_date"
            required
            type="date"
            label={ENGLISH.joining_date}
            value={values.joining_date}
            error={errors.joining_date}
            on_change={update} />
          
          <Select
            name="location_id"
            label={ENGLISH.location}
            value={values.location_id}
            error={errors.location_id}
            placeholder={ENGLISH.select_location}
            options={usable(locations, values.location_id)}
            onChange={update} />
          
        </div>
        <Select
          name="reporting_manager_id"
          label={ENGLISH.reporting_manager}
          value={values.reporting_manager_id}
          error={errors.reporting_manager_id}
          placeholder={ENGLISH.select_manager}
          options={usable(managers, values.reporting_manager_id)}
          onChange={update} />
        

        <h4 className="emp_form_heading">{ENGLISH.address}</h4>
        <Field
          id="address_line_1"
          label={ENGLISH.address_line_1}
          value={values.address_line_1}
          error={errors.address_line_1}
          on_change={update} />
        
        <Field
          id="address_line_2"
          label={ENGLISH.address_line_2}
          value={values.address_line_2}
          error={errors.address_line_2}
          on_change={update} />
        
        <div className="prg_form_row">
          <Field id="city" label={ENGLISH.city} value={values.city} error={errors.city} on_change={update} />
          <Field id="state" label={ENGLISH.state} value={values.state} error={errors.state} on_change={update} />
        </div>
        <div className="prg_form_row">
          <Field
            id="country"
            label={ENGLISH.country}
            value={values.country}
            error={errors.country}
            on_change={update} />
          
          <Field
            id="postal_code"
            label={ENGLISH.postal_code}
            value={values.postal_code}
            error={errors.postal_code}
            on_change={update} />
          
        </div>

        <h4 className="emp_form_heading">{ENGLISH.admin_access}</h4>
        <p className="emp_form_hint">{ENGLISH.choose_what_this_person_can_do_on_each}</p>
        <Screen_Access_Board values={values} on_change={on_change} />

        <h4 className="emp_form_heading">{ENGLISH.sign_in}</h4>
        <p className="emp_form_hint">
          {require_password ?
          ENGLISH.this_password_is_used_on_the_employee_login :
          ENGLISH.leave_blank_to_keep_the_current_password}
        </p>
        <div className="prg_form_row">
          <Field
            id="password"
            type="password"
            required={require_password}
            label={require_password ? ENGLISH.password : ENGLISH.new_password}
            autoComplete="new-password"
            value={values.password}
            error={errors.password}
            on_change={update} />
          
          <Field
            id="confirm_password"
            type="password"
            required={require_password || Boolean(values.password)}
            label={ENGLISH.confirm_password}
            autoComplete="new-password"
            value={values.confirm_password}
            error={errors.confirm_password}
            on_change={update} />
          
        </div>

        <label className="emp_form_active">
          <input
            type="checkbox"
            name="is_active"
            checked={Boolean(values.is_active)}
            onChange={update} />
          
          <span>{ENGLISH.active_employee}</span>
        </label>
      </div>
      <div className="prg_form_foot">
        <Button type="submit" loading={loading}>
          {submit_label}
        </Button>
      </div>
    </form>);

}
