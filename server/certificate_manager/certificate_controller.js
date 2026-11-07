import { send_error } from "../utils/send_error.js";
import { ensure_certificate_schema } from "./schema.js";
import {
  create_certificate,
  delete_certificate,
  get_certificate,
  list_certificates,
  list_value_sources,
  preview_certificate,
  preview_draft,
  replace_certificate_image,
  save_certificate
} from "./certificate_service.js";

const SCOPE = "certificate_manager";

function handle(res, req, fallback, work) {
  return ensure_certificate_schema()
    .then(() => work())
    .catch((err) => send_error(res, err, fallback, SCOPE, req));
}

export function certificates_list(req, res) {
  return handle(res, req, "Unable to load certificates", async () => res.json(await list_certificates()));
}

export function certificates_sources(req, res) {
  return handle(res, req, "Unable to load certificate values", async () => res.json(list_value_sources()));
}

export function certificates_get(req, res) {
  return handle(res, req, "Unable to load this certificate", async () =>
    res.json(await get_certificate(req.params.certificate_id))
  );
}

export function certificates_create(req, res) {
  return handle(res, req, "Unable to create this certificate", async () =>
    res.status(201).json(await create_certificate(req.file, req.body?.certificate_name))
  );
}

export function certificates_save(req, res) {
  return handle(res, req, "Unable to save this certificate", async () =>
    res.json(await save_certificate(req.params.certificate_id, req.body || {}))
  );
}

export function certificates_image(req, res) {
  return handle(res, req, "Unable to change this certificate picture", async () =>
    res.json(await replace_certificate_image(req.params.certificate_id, req.file))
  );
}

export function certificates_delete(req, res) {
  return handle(res, req, "Unable to delete this certificate", async () =>
    res.json(await delete_certificate(req.params.certificate_id))
  );
}

export function certificates_preview(req, res) {
  return handle(res, req, "Unable to preview this certificate", async () => {
    const result = await preview_certificate(req.params.certificate_id, req.body?.fields);
    res.setHeader("Content-Type", result.content_type);
    return res.send(result.buffer);
  });
}

export function certificates_preview_draft(req, res) {
  return handle(res, req, "Unable to preview this certificate", async () => {
    let fields = req.body?.fields;
    if (typeof fields === "string") {
      try {
        fields = JSON.parse(fields);
      } catch {
        fields = [];
      }
    }
    const result = await preview_draft({
      file: req.file,
      image_url: req.body?.image_url || "",
      image_width: req.body?.image_width,
      image_height: req.body?.image_height,
      fields
    });
    res.setHeader("Content-Type", result.content_type);
    return res.send(result.buffer);
  });
}
