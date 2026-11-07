import { live_text } from "../live_text.js";
import { VALIDATION_HINDI } from "../hindi/validation_constants_hindi.js";

const VALIDATION_STRINGS = {
  email_is_required: "Email is required",
  enter_a_valid_email: "Enter a valid email",
  email_cannot_have_two_dots_in_a_row: "Email cannot have two dots in a row",
  enter_a_valid_email_using_letters_numbers_and: "Enter a valid email using letters, numbers, and single dots",
};

export const VALIDATION_ENGLISH = live_text(VALIDATION_STRINGS, VALIDATION_HINDI);
