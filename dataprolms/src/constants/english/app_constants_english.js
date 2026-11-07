import { live_text } from "../live_text.js";
import { APP_HINDI } from "../hindi/app_constants_hindi.js";

const APP_STRINGS = {
  file_size_exceeds_the_allowed_limit: "File size exceeds the allowed limit.",
  your_session_expired_sign_in_again: "Your session expired. Sign in again.",
  you_do_not_have_permission_for_this_action: "You do not have permission for this action.",
  upload_storage_is_not_available_contact_your_administrator: "Upload storage is not available. Contact your administrator.",
  server_error_please_try_again: "Server error. Please try again.",
  request_failed: "Request failed",
  admin_dashboard_employee_dashboard_d_content: (arg_1) => `^/(?:admin_dashboard|employee_dashboard)/${arg_1}/(\\d+)/content$`,
  and: " and ",
  switch_to_hindi: "Switch to Hindi",
  switch_to_english: "Switch to English",
};

export const APP_ENGLISH = live_text(APP_STRINGS, APP_HINDI);
