import { DESIGN_SYSTEM_ENGLISH as ENGLISH } from "../constants/english/design_system_constants_english.js";
export function Auth_Home_Link({ on_home }) {
  if (!on_home) return null;
  return (
    <button type="button" className="stu_reg_home" onClick={on_home}>{ENGLISH.home}</button>
  );
}
