import { Image_Picker } from "../../image_picker/image_picker.jsx";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { BLOOD_GROUPS, COPY, FIELDS } from "../constants.js";
import { latest_birth_date } from "../utils.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../../constants/english/student_authentication_constants_english.js";

function Field({ field_ref, ...props }) {
  return (
    <Input
      {...props}
      ref={field_ref}
      variant="outlined"
    />
  );
}

function Group({ title, tone, children }) {
  return (
    <section className={`stu_reg_group stu_reg_group_${tone}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Registration_Fields({
  values,
  errors,
  file,
  on_change,
  on_file,
  field_refs,
}) {
  return (
    <div className="stu_reg_fields">
      <Group title={COPY.groupName} tone="deep">
        <Image_Picker
          id="student_photo"
          file={file}
          label={ENGLISH.profile_photo_optional}
          on_change={on_file}
        />
        <div className="stu_reg_row">
          <Field
            {...FIELDS.first_name}
            value={values.first_name}
            error={errors.first_name}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.first_name = element;
            }}
          />

          <Field
            {...FIELDS.last_name}
            value={values.last_name}
            error={errors.last_name}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.last_name = element;
            }}
          />
        </div>
      </Group>

      <Group title={COPY.groupContact} tone="mid">
        <Field
          {...FIELDS.email}
          value={values.email}
          error={errors.email}
          onChange={on_change}
          field_ref={(element) => {
            field_refs.current.email = element;
          }}
        />
        <Field
          {...FIELDS.mobile_number}
          value={values.mobile_number}
          error={errors.mobile_number}
          onChange={on_change}
          field_ref={(element) => {
            field_refs.current.mobile_number = element;
          }}
        />
      </Group>

      <Group title={COPY.groupStudy} tone="soft">
        <div className="stu_reg_row">
          <Field
            {...FIELDS.college}
            value={values.college}
            error={errors.college}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.college = element;
            }}
          />

          <Field
            {...FIELDS.higher_study}
            value={values.higher_study}
            error={errors.higher_study}
            placeholder={ENGLISH.b_tech_m_sc_diploma}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.higher_study = element;
            }}
          />
        </div>
      </Group>

      <Group title={COPY.groupAddress} tone="mid">
        <div className="stu_reg_row stu_reg_row_single">
          <Field
            {...FIELDS.address_line}
            value={values.address_line}
            error={errors.address_line}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.address_line = element;
            }}
          />
        </div>

        <div className="stu_reg_row">
          <Select
            id={FIELDS.blood_group.id}
            name={FIELDS.blood_group.name}
            label={FIELDS.blood_group.label}
            value={values.blood_group}
            error={errors.blood_group}
            placeholder={ENGLISH.select}
            options={BLOOD_GROUPS}
            onChange={on_change}
          />

          <Field
            {...FIELDS.pincode}
            value={values.pincode}
            error={errors.pincode}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.pincode = element;
            }}
          />
        </div>

        <div className="stu_reg_row">
          <Field
            {...FIELDS.state}
            value={values.state}
            error={errors.state}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.state = element;
            }}
          />

          <Field
            {...FIELDS.district}
            value={values.district}
            error={errors.district}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.district = element;
            }}
          />
        </div>
      </Group>

      <Group title={COPY.groupAccount} tone="soft">
        <div className="stu_reg_row">
          <Field
            {...FIELDS.password}
            value={values.password}
            error={errors.password}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.password = element;
            }}
          />

          <Field
            {...FIELDS.confirm_password}
            value={values.confirm_password}
            error={errors.confirm_password}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.confirm_password = element;
            }}
          />
        </div>
        <p className="stu_reg_hint">{ENGLISH.use_at_least_8_characters_with_an_uppercase}</p>

        <div className="stu_reg_row stu_reg_row_single">
          <Field
            {...FIELDS.date_of_birth}
            value={values.date_of_birth}
            error={errors.date_of_birth}
            max={latest_birth_date()}
            onChange={on_change}
            field_ref={(element) => {
              field_refs.current.date_of_birth = element;
            }}
          />
        </div>
      </Group>
    </div>
  );
}