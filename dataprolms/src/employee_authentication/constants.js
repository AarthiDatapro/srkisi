import { EMPLOYEE_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/employee_authentication_constants_english.js";
export const EMPTY_LOGIN = {
  email: "",
  password: ""
};

export const COPY = {
  get brand() { return ENGLISH.datapro_lms; },
  get loginTitle() { return ENGLISH.organisation_sign_in; },
  get loginSubtitle() { return ENGLISH.use_your_staff_email_and_password; },
  get loginWelcomeTitle() { return ENGLISH.staff_access; },
  get loginWelcomeSubtitle() { return ENGLISH.sign_in_to_continue_to_the_admin_dashboard; },
  get loginSubmit() { return ENGLISH.sign_in; },
  get dashboardTitle() { return ENGLISH.admin_dashboard; },
  get groupAccount() { return ENGLISH.account; }
};

export const FIELDS = {
  email: {
    id: "employee_email",
    name: "email",
    type: "email",
    get label() { return ENGLISH.email; },
    autoComplete: "username"
  },
  password: {
    id: "employee_password",
    name: "password",
    type: "password",
    get label() { return ENGLISH.password; },
    autoComplete: "current-password"
  }
};
