import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Select } from "@datapromr/select";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_manager_constants_english.js";

export function Program_Passkey_Panel({
  programs = [],
  program_id = "",
  passkey = "",
  error = "",
  loading = false,
  submit_label = ENGLISH.save_passkey,
  on_change,
  on_submit
}) {
  const options = programs.map((program) => ({
    id: String(program.program_id),
    label: program.has_passkey ?
      ENGLISH.has_passkey(program.program_name) :
      program.program_name
  }));

  return (
    <form
      className="crs_passkey_panel is_passkey"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="passkey"
        kicker={ENGLISH.program_passkey}
        hint={ENGLISH.each_offline_course_keeps_a_separate_key_per} />
      <Select
        name="program_id"
        label={ENGLISH.program_2}
        required
        value={program_id}
        placeholder={ENGLISH.select_program}
        options={options}
        onChange={(event) => on_change({ program_id: event.target.value, passkey })} />
      <Input
        id="program_passkey"
        name="passkey"
        label={ENGLISH.program_passkey}
        required
        variant="outlined"
        value={passkey}
        error={error}
        onChange={(event) => on_change({ program_id, passkey: event.target.value })} />
      <div className="prg_form_foot">
        <Button type="submit" loading={loading}>
          {submit_label}
        </Button>
      </div>
    </form>
  );
}
