import { useEffect, useRef, useState } from "react";
import { api_request } from "../api_client.js";
import { useToast } from "@datapromr/toast";
import { EMPTY_FORM, COPY } from "./constants.js";
import { get_form_errors, has_errors, sanitize_field } from "./utils.js";
import { WelcomePanel } from "@datapromr/welcome-panel";
import { FormHeader } from "@datapromr/form-header";
import { Registration_Fields } from "./ui/registration_fields.jsx";
import { Google_Button } from "./google/google_button.jsx";
import { take_google_error } from "./google/google_api.js";
import { SubmitBar } from "@datapromr/submit-bar";
import { SuccessMessage } from "@datapromr/success-message";
import "./theme/index.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";

async function register_student_form(values, file) {
  const body = new FormData();
  [
  "first_name",
  "last_name",
  "email",
  "mobile_number",
  "date_of_birth",
  "college",
  "higher_study",
  "blood_group",
  "address_line",
  "pincode",
  "state",
  "district",
  "password"].
  forEach((key) => body.append(key, String(values[key] || "").trim()));
  if (file) body.append("photo", file);

  return api_request("/api/auth/student/register", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_register
  });
}

export function Student_Registration({ on_sign_in }) {
  const [values, set_values] = useState(EMPTY_FORM);
  const [errors, set_errors] = useState({});
  const [file, set_file] = useState(null);
  const [form_error, set_form_error] = useState("");
  const [loading, set_loading] = useState(false);
  const [created, set_created] = useState(null);
  const toast = useToast();
  const field_refs = useRef({});

  useEffect(() => {
    const message = take_google_error();
    if (!message) return;
    set_form_error(message);
    toast.error(message);
  }, [toast]);

  function update_field(event) {
    const { name, value } = event.target;
    set_values((current) => ({ ...current, [name]: sanitize_field(name, value) }));
    set_errors((current) => ({ ...current, [name]: "" }));
    set_form_error("");
  }
function focus_first_error(error_map) {
  const first_field = Object.keys(error_map).find(
    (key) => error_map[key]
  );

  if (!first_field) return;

  const element = field_refs.current[first_field];

  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  element.focus();
}
  async function handle_submit(event) {
    event.preventDefault();

    const next_errors = get_form_errors(values);
    set_errors(next_errors);
    if (has_errors(next_errors)) {
      focus_first_error(next_errors);
      return;
    }

    set_loading(true);
    set_form_error("");

    try {
      const result = await register_student_form(values, file);
      set_created(result);
      toast.success(ENGLISH.account_created);
    } catch (error) {
      const message = error.message || ENGLISH.unable_to_register;
      set_form_error(message);
      toast.error(message);
    } finally {
      set_loading(false);
    }
  }

  return (
    <section className="stu_reg">
      <WelcomePanel brand={COPY.brand} />

      <form className="stu_reg_form" onSubmit={handle_submit} noValidate>
        <div className="stu_reg_sheet">
          {created ?
          <SuccessMessage
            studentId={created.student_id}
            idHint={ENGLISH.keep_this_id_sign_in_with_your_email}
            onSignIn={on_sign_in} /> :


          <>
              <FormHeader title={COPY.formTitle} subtitle={COPY.formSubtitle} />
              {form_error ? <p className="stu_reg_error">{form_error}</p> : null}
              <Google_Button intent="signup" />
              <Registration_Fields
              values={values}
              errors={errors}
              file={file}
              on_change={update_field}
              on_file={set_file} 
              field_refs={field_refs}/>
            
              <SubmitBar loading={loading} onSignIn={on_sign_in} />
            </>
          }
        </div>
      </form>
    </section>);

}
