import { ADMIN_HOME_ENGLISH as ENGLISH } from "../../constants/english/admin_home_constants_english.js";
export function Dashboard_Hero({ is_admin }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="ah_hero">
      <h1>{is_admin ? ENGLISH.admin_dashboard : ENGLISH.dashboard}</h1>
      <p>{ENGLISH.welcome_back_here_s_an_overview_of_your}</p>
      <span>{today}</span>
    </div>);

}
