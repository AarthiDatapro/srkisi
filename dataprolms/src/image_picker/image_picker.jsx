import { useState } from "react";
import { FilePicker } from "@datapromr/file-picker";
import "./image_picker.css";
import { IMAGE_PICKER_ENGLISH as ENGLISH } from "../constants/english/image_picker_constants_english.js";

export function Image_Picker({
  id = "image_file",
  label = ENGLISH.upload_image,
  accept = "image/*",
  file,
  preview_url = "",
  on_change,
  on_remove
}) {
  const [input_key, set_input_key] = useState(0);
  const can_remove = Boolean(file || (preview_url && on_remove));

  function clear_file() {
    if (file) {
      on_change?.(null);
      set_input_key((key) => key + 1);
      return;
    }
    on_remove?.();
  }

  return (
    <div className="image_picker">
      <FilePicker
        key={input_key}
        id={id}
        file={file}
        previewUrl={preview_url}
        accept={accept}
        label={label}
        onChange={on_change} />
      
      {can_remove ?
      <button type="button" className="image_picker_remove" onClick={clear_file}>{ENGLISH.remove_photo}</button> :
      null}
    </div>);

}
