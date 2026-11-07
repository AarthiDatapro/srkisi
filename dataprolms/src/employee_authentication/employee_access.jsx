import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api_request } from "../api_client.js";
import { ACCESS, can_use_screen } from "./screen_access.js";
import { EMPLOYEE_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/employee_authentication_constants_english.js";

const Employee_Access_Context = createContext({
  loading: true,
  session: null,
  screens: [],
  can: () => false
});

export async function get_employee_session() {
  return api_request("/api/auth/employee/me", { error_message: ENGLISH.unable_to_load_employee_session });
}

export function Employee_Access_Provider({ children, on_unauthorized }) {
  const [loading, set_loading] = useState(true);
  const [session, set_session] = useState(null);

  useEffect(() => {
    let active = true;
    get_employee_session().
    then((next) => {
      if (active) set_session(next);
    }).
    catch(() => {
      if (active) {
        set_session(null);
        on_unauthorized?.();
      }
    }).
    finally(() => {
      if (active) set_loading(false);
    });
    return () => {
      active = false;
    };
  }, [on_unauthorized]);

  const value = useMemo(() => {
    const screens = session?.screens || [];
    return {
      loading,
      session,
      screens,
      can(screen_id, access = ACCESS.view) {
        if (session?.is_admin) return true;
        return can_use_screen(screens, screen_id, access);
      }
    };
  }, [loading, session]);

  return <Employee_Access_Context.Provider value={value}>{children}</Employee_Access_Context.Provider>;
}

export function use_employee_access() {
  return useContext(Employee_Access_Context);
}

export function use_screen_access(screen_id) {
  const { can, loading } = use_employee_access();
  return {
    loading,
    can_view: can(screen_id, ACCESS.view),
    can_edit: can(screen_id, ACCESS.edit)
  };
}
