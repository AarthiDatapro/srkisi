import { Search_Icon } from "./icons/index.js";
import { initials } from "../utils/formatters.js";
import { ADMIN_HOME_ENGLISH as ENGLISH } from "../../constants/english/admin_home_constants_english.js";

export function Dashboard_Header({
  search,
  set_search,
  display_name,
  role_label,
  profile_photo_url
}) {
  return (
    <header className="ah_top">
      <label className="ah_search">
        <Search_Icon />
        <input
          value={search}
          onChange={(event) => set_search(event.target.value)}
          placeholder={ENGLISH.search_students_courses}
          aria-label={ENGLISH.search_students_courses_programs} />
        
      </label>
      <div className="ah_user">
        {profile_photo_url ?
        <img src={profile_photo_url} alt="" /> :

        <b>{initials(display_name)}</b>
        }
        <div className="ah_user_meta">
          <strong>{display_name}</strong>
          <small>{role_label}</small>
        </div>
      </div>
    </header>);

}
