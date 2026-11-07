import robot_url from "../../assets/robot.svg";

export function Buddy_Avatar({ className = "lrn_buddy" }) {
  return <img className={className} src={robot_url} alt="" />;
}
