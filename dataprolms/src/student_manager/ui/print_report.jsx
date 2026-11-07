import { renderToStaticMarkup } from "react-dom/server";
import report_css from "../theme/report_card.css?raw";
import { Report_Sheets } from "./report_card.jsx";
import { STUDENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/student_manager_constants_english.js";

const FONT = "https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap";

function wait_for_assets(doc) {
  const images = [...doc.images].map((image) =>
    image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    })
  );
  const fonts = doc.fonts?.ready || Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  return Promise.race([Promise.all([...images, fonts]), timeout]);
}

export function print_report_cards(payload, file_title) {
  if (!payload?.cards?.length) return Promise.resolve(false);
  const markup = renderToStaticMarkup(<Report_Sheets payload={payload} />);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const title = String(file_title || "report_card").replace(/[\\/:*?"<>|]+/g, "_");
  doc.open();
  doc.write(ENGLISH.doctype_html_html_head_meta_charset_utf_8(title, window.location.origin, FONT, report_css, markup));
  doc.close();
  const previous_title = document.title;
  return wait_for_assets(doc).then(() => {
    document.title = title;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => {
      document.title = previous_title;
      frame.remove();
    }, 1500);
    return true;
  });
}
