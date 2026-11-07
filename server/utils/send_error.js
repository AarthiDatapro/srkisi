import { log } from "@datapromr/log";

export function send_error(res, err, fallback, scope = "api", req) {
  const status = Number(err.status) || 500;
  log.fail(scope, err.message, req);
  const body = {
    error: status === 500 ? fallback : err.message,
  };
  if (err.code) body.code = err.code;
  if (err.details != null) body.details = err.details;
  return res.status(status).json(body);
}
