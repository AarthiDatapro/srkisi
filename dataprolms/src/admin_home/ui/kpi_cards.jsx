import { Book_Icon, Briefcase_Icon, Enroll_Icon, Grid_Icon, Users_Icon } from "./icons/index.js";
import { format_count } from "../utils/formatters.js";
import { ADMIN_HOME_ENGLISH as ENGLISH } from "../../constants/english/admin_home_constants_english.js";

const KPI_META = [
{ key: "students", get label() { return ENGLISH.total_students; }, tone: "blue", icon: <Users_Icon /> },
{ key: "courses", get label() { return ENGLISH.total_courses; }, tone: "green", icon: <Book_Icon /> },
{ key: "programs", get label() { return ENGLISH.programs; }, tone: "purple", icon: <Grid_Icon /> },
{ key: "instructors", get label() { return ENGLISH.instructors; }, tone: "orange", icon: <Briefcase_Icon /> },
{ key: "enrollments", get label() { return ENGLISH.total_enrollments; }, tone: "rose", icon: <Enroll_Icon /> }];


export function Kpi_Cards({ kpis = {} }) {
  return (
    <div className="ah_kpis">
      {KPI_META.map((item) => (
        <article key={item.key} className={`ah_kpi is_${item.tone}`}>
          <i>{item.icon}</i>
          <small>{item.label}</small>
          <b>{format_count(kpis[item.key])}</b>
        </article>
      ))}
    </div>
  );
}
