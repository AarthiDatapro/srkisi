import { Input } from "@datapromr/input";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../../constants/english/student_authentication_constants_english.js";

export function Student_Login_Fields({ values, errors, onChange }) {
  return (
    <>
      <Input
        id="email"
        name="email"
        type="text"
        label={ENGLISH.email_or_phone_number}
        placeholder={ENGLISH.enter_your_email_or_phone_number}
        autoComplete="username"
        variant="outlined"
        value={values.email}
        error={errors.email}
        onChange={onChange}
      />
      <Input
        id="login_password"
        name="password"
        type="password"
        label={ENGLISH.password}
        autoComplete="current-password"
        variant="outlined"
        value={values.password}
        error={errors.password}
        onChange={onChange}
      />
    </>
  );
}
