import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";
export const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  mobile_number: "",
  date_of_birth: "",
  college: "",
  higher_study: "",
  blood_group: "",
  address_line: "",
  pincode: "",
  state: "",
  district: "",
  password: "",
  confirm_password: ""
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export const EMPTY_LOGIN = {
  email: "",
  password: ""
};

export const COPY = {
  get brand() { return ENGLISH.datapro_lms; },
  get welcomeTitle() { return ENGLISH.create_your_student_account; },
  get welcomeSubtitle() { return ENGLISH.a_few_details_and_you_are_in_quick; },
  get login() { return ENGLISH.sign_in_instead; },
  get registerInstead() { return ENGLISH.create_account; },
  get successAction() { return ENGLISH.sign_in; },
  get formTitle() { return ENGLISH.student_registration; },
  get formSubtitle() { return ENGLISH.tell_us_who_you_are_we_will_create; },
  get loginTitle() { return ENGLISH.student_sign_in; },
  get loginSubtitle() { return ENGLISH.use_your_registered_email_or_phone_number_and; },
  get loginWelcomeTitle() { return ENGLISH.welcome_back; },
  get loginWelcomeSubtitle() { return ENGLISH.sign_in_to_continue_to_your_student_dashboard; },
  get loginSubmit() { return ENGLISH.sign_in; },
  get forgotPassword() { return ENGLISH.forgot_password; },
  get dashboardTitle() { return ENGLISH.student_dashboard; },
  get groupName() { return ENGLISH.your_name; },
  get groupContact() { return ENGLISH.contact; },
  get groupStudy() { return ENGLISH.studies; },
  get groupAddress() { return ENGLISH.address; },
  get groupAccount() { return ENGLISH.account; },
  get successTitle() { return ENGLISH.you_re_registered; },
  get successLabel() { return ENGLISH.your_student_id; },
  get successHint() { return ENGLISH.keep_this_id_sign_in_with_your_email; },
  get submit() { return ENGLISH.create_account; }
};

export const FIELDS = {
  first_name: {
    id: "first_name",
    name: "first_name",
    get label() { return ENGLISH.first_name; },
    autoComplete: "given-name",
    required: true
  },
  last_name: {
    id: "last_name",
    name: "last_name",
    get label() { return ENGLISH.last_name; },
    autoComplete: "family-name",
    required: true
  },
  email: {
    id: "email",
    name: "email",
    type: "email",
    get label() { return ENGLISH.email; },
    autoComplete: "email",
    required: true
  },
  mobile_number: {
    id: "mobile_number",
    name: "mobile_number",
    type: "tel",
    inputMode: "numeric",
    get label() { return ENGLISH.phone; },
    autoComplete: "tel",
    required: true
  },
  date_of_birth: {
    id: "date_of_birth",
    name: "date_of_birth",
    type: "date",
    get label() { return ENGLISH.date_of_birth; }
  },
  college: {
    id: "college",
    name: "college",
    get label() { return ENGLISH.college; },
    required: true
  },
  higher_study: {
    id: "higher_study",
    name: "higher_study",
    get label() { return ENGLISH.higher_study; },
    required: true
  },
  blood_group: {
    id: "blood_group",
    name: "blood_group",
    get label() { return ENGLISH.blood_group; }
  },
  address_line: {
    id: "address_line",
    name: "address_line",
    get label() { return ENGLISH.address; }
  },
  pincode: {
    id: "pincode",
    name: "pincode",
    inputMode: "numeric",
    get label() { return ENGLISH.pincode; }
  },
  state: {
    id: "state",
    name: "state",
    get label() { return ENGLISH.state; }
  },
  district: {
    id: "district",
    name: "district",
    get label() { return ENGLISH.district; }
  },
  password: {
    id: "password",
    name: "password",
    type: "password",
    get label() { return ENGLISH.password; },
    autoComplete: "new-password",
    required: true
  },
  login_password: {
    id: "login_password",
    name: "password",
    type: "password",
    get label() { return ENGLISH.password; },
    autoComplete: "current-password"
  },
  confirm_password: {
    id: "confirm_password",
    name: "confirm_password",
    type: "password",
    get label() { return ENGLISH.confirm_password; },
    autoComplete: "new-password",
    required: true
  }
};
