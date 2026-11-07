import { useEffect, useState } from "react";
import { loginStudent } from "@datapromr/auth/client";
import { useToast } from "@datapromr/toast";
import { COPY, EMPTY_LOGIN } from "./constants.js";
import {
  get_login_errors,
  has_errors,
  normalize_login_identifier,
  sanitize_field,
  sanitize_login_identifier
} from "./utils.js";
import { WelcomePanel } from "@datapromr/welcome-panel";
import { Button } from "@datapromr/button";
import { Student_Login_Fields } from "./ui/login_fields.jsx";
import { Google_Button } from "./google/google_button.jsx";
import { take_google_error } from "./google/google_api.js";
import "./theme/index.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";

export function Student_Login({ on_register, on_forgot, on_success }) {
  const [values, set_values] = useState(EMPTY_LOGIN);
  const [errors, set_errors] = useState({});
  const [form_error, set_form_error] = useState("");
  const [loading, set_loading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    document.querySelectorAll(ENGLISH.stu_reg_login_input_name_email_stu_reg).
      forEach((field) => {
        field.required = true;
      });
    const message = take_google_error();
    if (!message) return;
    set_form_error(message);
    toast.error(message);
  }, [toast]);

  function update_field(event) {
    const { name, value } = event.target;
    const next = name === "email" ? sanitize_login_identifier(value) : sanitize_field(name, value);
    set_values((current) => ({ ...current, [name]: next }));
    set_errors((current) => ({ ...current, [name]: "" }));
    set_form_error("");
  }

  async function handle_submit(event) {
    event.preventDefault();

    const next_errors = get_login_errors(values);
    set_errors(next_errors);
    if (has_errors(next_errors)) return;

    set_loading(true);
    set_form_error("");

    try {
      const student = await loginStudent({
        email: normalize_login_identifier(values.email),
        password: values.password
      });
      await on_success?.(student);
    } catch (error) {
      const message =
        error.status === 401 || /invalid login credentials/i.test(error.message || "") ?
          ENGLISH.invalid_login_credentials_please_try_again :
          error.message || ENGLISH.unable_to_sign_in;
      set_form_error(message);
      toast.error(message);
    } finally {
      set_loading(false);
    }
  }

  return (
    <section className="stu_reg stu_reg_login">
      <WelcomePanel
        brand={COPY.brand}
        title={COPY.loginWelcomeTitle}
        subtitle={COPY.loginWelcomeSubtitle} />
      

      <form className="stu_reg_form" onSubmit={handle_submit} noValidate>
        <div className="stu_reg_sheet">
          <div className="stu_reg_form_head">
            <p className="stu_reg_chip">{ENGLISH.welcome_back}</p>
            <h2>{COPY.loginTitle}</h2>
            <p>{COPY.loginSubtitle}</p>
          </div>
          {form_error ? <p className="stu_reg_error">{form_error}</p> : null}
          <Google_Button intent="login" />
          <Student_Login_Fields values={values} errors={errors} onChange={update_field} />
          {on_forgot ?
          <button type="button" className="dpm-login-submit__link stu_reg_forgot" onClick={on_forgot}>
              {COPY.forgotPassword}
            </button> :
          null}
          <div className="dpm-login-submit">
            <Button type="submit" disabled={loading}>
              {loading ? ENGLISH.signing_in : COPY.loginSubmit}
            </Button>
            {on_register ?
              <button type="button" className="dpm-login-submit__link" onClick={on_register}>
                {COPY.registerInstead}
              </button> :
              null}
          </div>
        </div>
      </form>
    </section>);

}
