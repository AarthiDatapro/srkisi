import { DROPDOWN_MANAGER_ENGLISH as ENGLISH } from "../constants/english/dropdown_manager_constants_english.js";
export const EMPTY_OPTION = {
  name: "",
  description: "",
  color: "#EB7828",
  code_letters: "",
  number_next: ""
};

export const COPY = {
  get title() { return ENGLISH.dropdowns; },
  get subtitle() { return ENGLISH.manage_the_option_lists_used_on_admin_forms; },
  get create() { return ENGLISH.new_option; },
  get search() { return ENGLISH.search_options; },
  get empty() { return ENGLISH.no_options_yet; },
  get emptyHint() { return ENGLISH.add_the_first_option_for_this_list; },
  get edit() { return ENGLISH.edit_option; }
};
