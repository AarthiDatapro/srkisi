import { useEffect, useState } from "react";
import { loginEmployee } from "@datapromr/auth/client";
import { useToast } from "@datapromr/toast";
import { WelcomePanel } from "@datapromr/welcome-panel";
import { LoginFields } from "@datapromr/login-fields";
import { LoginSubmitBar } from "@datapromr/login-submit-bar";
import { COPY, EMPTY_LOGIN } from "./constants.js";
import { get_login_errors, has_errors, sanitize_field } from "./utils.js";
import "../design_system/auth_layout.css";
import { EMPLOYEE_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/employee_authentication_constants_english.js";

export function Employee_Login({ on_success }) {
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
  }, []);

  function update_field(event) {
    const { name, value } = event.target;
    set_values((current) => ({ ...current, [name]: sanitize_field(name, value) }));
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
      const employee = await loginEmployee({
        email: values.email.trim(),
        password: values.password
      });
      on_success?.(employee);
    } catch (error) {
      const message = error.message || ENGLISH.unable_to_sign_in;
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
          <LoginFields values={values} errors={errors} onChange={update_field} />
          <LoginSubmitBar loading={loading} />
        </div>
      </form>
    </section>);

}
