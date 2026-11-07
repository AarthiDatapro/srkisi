import robot_src from "../../assets/mock_interview_robot.svg";
import { COPY } from "../constants.js";
import { Buddy_Avatar } from "./buddy_avatar.jsx";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";

export function Help_Fab({ on_ask }) {
  return (
    <button type="button" className="lrn_help_fab" onClick={on_ask} aria-label={COPY.ask}>
      <Buddy_Avatar />
    </button>
  );
}

export function Interview_Fab({ on_open }) {
  if (!on_open) return null;
  return (
    <button type="button" className="lrn_interview_fab" onClick={on_open} aria-label={ENGLISH.mock_interview}>
      <img src={robot_src} alt="" />
    </button>
  );
}
