import { useEffect, useRef } from "react";
import { ForgetPassword } from "@datapromr/forget-password";
import { WelcomePanel } from "@datapromr/welcome-panel";
import "./theme/index.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";

export function Student_Forgot_Password({ on_back, on_sign_in }) {
  const root = useRef(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    const mark = () => {
      node.querySelectorAll(ENGLISH.input_name_email_input_name_otp_input_name).
        forEach((field) => {
          field.required = true;
        });
    };
    mark();
    const observer = new MutationObserver(mark);
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="stu_reg stu_reg_login" ref={root}>
      <WelcomePanel
        brand={ENGLISH.datapro_lms}
        title={ENGLISH.reset_your_password}
        subtitle={ENGLISH.we_will_email_you_a_one_time_code} />
      
      <div className="stu_reg_form">
        <div className="stu_reg_sheet">
          <ForgetPassword
            apiBase="/api/auth/student/forgot_password"
            onBack={on_back}
            onSignIn={on_sign_in} />
          
        </div>
      </div>
    </section>);

}
