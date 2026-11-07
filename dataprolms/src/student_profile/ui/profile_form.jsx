import { BLOOD_GROUPS, COPY } from "../constants.js";
import { latest_birth_date } from "../utils.js";
import { STUDENT_PROFILE_ENGLISH as ENGLISH } from "../../constants/english/student_profile_constants_english.js";

export function Field({
  id,
  name,
  label,
  value,
  type = "text",
  read_only,
  multiline,
  wide,
  max,
  error,
  required = false,
  on_change
}) {
  const shared = {
    id,
    name,
    value: value || "",
    readOnly: read_only || undefined,
    max,
    required: required || undefined,
    onChange: read_only ? undefined : on_change
  };

  return (
    <label className={["stp_field", read_only ? "is_locked" : "", wide ? "is_wide" : "", error ? "is_error" : ""].filter(Boolean).join(" ")} htmlFor={id}>
      <span>{label}</span>
      {multiline ?
      <textarea rows={3} {...shared} /> :

      <input type={type} {...shared} />
      }
      {error ? <em>{error}</em> : null}
    </label>);

}

export function Profile_Form({ values, errors = {}, on_change, on_submit }) {
  function update(event) {
    const { name, value } = event.target;
    on_change({ ...values, [name]: value });
  }

  return (
    <form className="stp_card" onSubmit={on_submit} id="stp_profile_form">
      <h2>{COPY.personal}</h2>
      <div className="stp_fields">
        <Field id="first_name" name="first_name" label={ENGLISH.first_name} value={values.first_name} on_change={update} />
        <Field id="last_name" name="last_name" label={ENGLISH.last_name} value={values.last_name} on_change={update} />
        <Field
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          label={ENGLISH.date_of_birth}
          value={values.date_of_birth}
          max={latest_birth_date()}
          error={errors.date_of_birth}
          on_change={update} />
        <label className="stp_field" htmlFor="blood_group">
          <span>{ENGLISH.blood_group}</span>
          <select id="blood_group" name="blood_group" value={values.blood_group} onChange={update}>
            <option value="" hidden>{ENGLISH.select}</option>
            {BLOOD_GROUPS.map((item) =>
            <option key={item} value={item}>
                {item}
              </option>
            )}
          </select>
        </label>
        <Field id="email" name="email" type="email" label={ENGLISH.email_address} value={values.email} wide on_change={update} />
        <Field id="mobile_number" name="mobile_number" label={ENGLISH.phone_number} value={values.mobile_number} on_change={update} />
        <Field id="address_line" name="address_line" label={ENGLISH.address} value={values.address_line} multiline on_change={update} />
        <Field id="district" name="district" label={ENGLISH.city_district} value={values.district} on_change={update} />
        <Field id="state" name="state" label={ENGLISH.state} value={values.state} on_change={update} />
        <Field id="pincode" name="pincode" label={ENGLISH.pincode} value={values.pincode} on_change={update} />
      </div>

      <h2>{COPY.professional}</h2>
      <div className="stp_fields stp_fields_stack">
        <Field
          id="headline"
          name="headline"
          label={COPY.headline}
          value={values.headline}
          on_change={update} />
        <Field
          id="professional_summary"
          name="professional_summary"
          label={COPY.professionalSummary}
          value={values.professional_summary}
          multiline
          on_change={update} />
      </div>
    </form>);

}
