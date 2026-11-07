import { Button } from "@datapromr/button";
import { COPY } from "../constants.js";
import { Screen_Access_Summary } from "./screen_access_board.jsx";
import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/employee_manager_constants_english.js";

function dash(value) {
  return value ? value : "—";
}

function Fact({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{dash(value)}</dd>
    </div>);

}

function Line({ label, value }) {
  return (
    <div className="emp_profile_line">
      <span>{label}</span>
      <b>{dash(value)}</b>
    </div>);

}

export function Employee_Details({ employee, on_edit, compact = false }) {
  const address = [
  employee.address_line_1,
  employee.address_line_2,
  [employee.city, employee.state].filter(Boolean).join(", "),
  [employee.country, employee.postal_code].filter(Boolean).join(" ")].

  filter(Boolean).
  join(" · ");
  const letter = employee.full_name?.slice(0, 1) || "E";
  const role = [employee.designation, employee.department].filter(Boolean).join(" · ");

  return (
    <div className={compact ? "emp_profile is_compact" : "emp_profile"}>
      <header className="emp_profile_head">
        {employee.profile_photo_url ?
        <span className="emp_profile_face">
            <img src={employee.profile_photo_url} alt="" />
          </span> :

        <span className="emp_profile_face">{letter}</span>
        }
        <div className="emp_profile_who">
          <h3>{employee.full_name}</h3>
          <p>{employee.employee_code}</p>
          {role ? <em>{role}</em> : null}
        </div>
        <span className={employee.is_active ? "emp_profile_tag is_on" : "emp_profile_tag"}>
          {employee.is_active ? ENGLISH.active : ENGLISH.inactive}
        </span>
      </header>

      <div className="emp_profile_sheet">
        <dl className="emp_profile_facts">
          <Fact label={ENGLISH.department} value={employee.department} />
          <Fact label={ENGLISH.designation} value={employee.designation} />
          <Fact label={ENGLISH.type} value={employee.employee_type} />
          <Fact label={ENGLISH.employment} value={employee.employment_type} />
          <Fact label={ENGLISH.location} value={employee.location} />
          <Fact label={ENGLISH.joined} value={employee.joining_date} />
          <Fact label={ENGLISH.gender} value={employee.gender} />
          <Fact label={ENGLISH.born} value={employee.date_of_birth} />
          <Fact label={ENGLISH.manager} value={employee.reporting_manager} />
        </dl>

        <section className="emp_profile_contact">
          <Line label={ENGLISH.email} value={employee.email} />
          <Line label={ENGLISH.mobile} value={employee.mobile_number} />
          {employee.alternate_phone ? <Line label={ENGLISH.alt_phone} value={employee.alternate_phone} /> : null}
        </section>

        <section className="emp_profile_access">
          <small>{ENGLISH.admin_access}</small>
          <Screen_Access_Summary screens={employee.screens} empty_label={ENGLISH.none_assigned} />
        </section>

        {address ?
        <section className="emp_profile_access">
            <small>{ENGLISH.address}</small>
            <p>{address}</p>
          </section> :
        null}
      </div>

      {on_edit ?
      <div className="emp_profile_foot">
          <Button type="button" onClick={on_edit}>
            {compact ? ENGLISH.edit : COPY.edit}
          </Button>
        </div> :
      null}
    </div>);

}
