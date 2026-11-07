import { useToast } from "@datapromr/toast";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import "./theme/certificate_manager.css";
import { Builder } from "./ui/builder.jsx";

export function Certificate_Manager() {
  const { can_edit } = use_screen_access(SCREEN.certificates);
  const toast = useToast();
  return <Builder can_edit={can_edit} toast={toast} />;
}
