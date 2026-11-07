import { live_text } from "../live_text.js";
import { IMAGE_PICKER_HINDI } from "../hindi/image_picker_constants_hindi.js";

const IMAGE_PICKER_STRINGS = {
  upload_image: "Upload image",
  remove_photo: "Remove photo",
};

export const IMAGE_PICKER_ENGLISH = live_text(IMAGE_PICKER_STRINGS, IMAGE_PICKER_HINDI);
