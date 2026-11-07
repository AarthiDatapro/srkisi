import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  mock_interview_profile_photo,
  upload_mock_interview_profile_photo
} from "./api.js";
import { url_to_image, verify_live_frames } from "./face_match.js";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../constants/english/student_mock_interview_constants_english.js";

const PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

function photo_kind(file) {
  const type = String(file?.type || "").toLowerCase();
  if (PHOTO_TYPES.has(type)) return type === "image/jpg" ? "image/jpeg" : type;
  const name = String(file?.name || "").toLowerCase();
  if (/\.jpe?g$/.test(name)) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "";
}

function photo_file(file) {
  const type = photo_kind(file);
  if (!file || !type || type === file.type) return file;
  return new File([file], file.name || "photo.jpg", { type, lastModified: file.lastModified });
}

function ring_arc(index) {
  const start = -126 + index * 90;
  const sweep = 62;
  const radius = 49.5;
  const center = 60;
  const point = (degree) => {
    const radian = (degree * Math.PI) / 180;
    return [center + radius * Math.cos(radian), center + radius * Math.sin(radian)];
  };
  const [x1, y1] = point(start);
  const [x2, y2] = point(start + sweep);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}

function tick_mark(step, { matched, failed, frame, matches }) {
  if (matched) return "is_hit";
  if (failed && step <= Math.max(frame, matches)) return "is_miss";
  if (step <= frame) return "is_seen";
  return "";
}

function photo_ok(file) {
  if (!file) return ENGLISH.choose_a_photo_to_upload;
  if (!photo_kind(file)) return ENGLISH.use_a_jpg_png_webp_or_gif_image;
  if (file.size > 8 * 1024 * 1024) return ENGLISH.photo_must_be_8_mb_or_less;
  return "";
}

export function Profile_Gate({ open, busy, on_close, on_proceed }) {
  const picker = useRef(null);
  const video_ref = useRef(null);
  const stream_ref = useRef(null);
  const run_id = useRef(0);
  const open_ref = useRef(open);
  open_ref.current = open;
  const [phase, set_phase] = useState("checking");
  const [file, set_file] = useState(null);
  const [drag, set_drag] = useState(false);
  const [frame, set_frame] = useState(0);
  const [matches, set_matches] = useState(0);
  const [message, set_message] = useState("");
  const [photo_url, set_photo_url] = useState("");
  const photo_url_ref = useRef("");
  photo_url_ref.current = photo_url;

  function stop_stream(stream) {
    stream?.getTracks?.().forEach((track) => track.stop());
  }

  function stop_camera() {
    stop_stream(stream_ref.current);
    stream_ref.current = null;
    if (video_ref.current) video_ref.current.srcObject = null;
  }

  useEffect(() => {
    if (!open) {
      run_id.current += 1;
      stop_camera();
      set_phase("checking");
      set_file(null);
      set_drag(false);
      set_frame(0);
      set_matches(0);
      set_message("");
      set_photo_url("");
      return undefined;
    }

    let alive = true;
    run_id.current += 1;
    (async () => {
      set_phase("checking");
      set_message("");
      try {
        const payload = await mock_interview_profile_photo();
        if (!alive) return;
        const href = payload?.profile_photo_url || "";
        set_photo_url(href);
        if (payload?.has_photo && href) {
          set_phase("camera");
        } else {
          set_phase("upload");
        }
      } catch (err) {
        if (!alive) return;
        set_message(err.message || ENGLISH.unable_to_check_your_profile_photo);
        set_phase("upload");
      }
    })();

    return () => {
      alive = false;
      stop_camera();
    };
  }, [open]);

  async function start_camera() {
    if (!video_ref.current) {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    }
    if (stream_ref.current && video_ref.current?.srcObject) return video_ref.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
    });
    if (!open_ref.current || !video_ref.current) {
      stop_stream(stream);
      return null;
    }
    stop_camera();
    stream_ref.current = stream;
    const video = video_ref.current;
    video.srcObject = stream;
    await video.play().catch(() => {});
    if (!open_ref.current) {
      stop_camera();
      return null;
    }
    return video;
  }

  async function run_verify() {
    const token = run_id.current + 1;
    run_id.current = token;
    set_phase("verifying");
    set_frame(0);
    set_matches(0);
    set_message("");
    try {
      const video = await start_camera();
      const href = photo_url_ref.current;
      if (!href) throw new Error(ENGLISH.no_profile_photo_was_found);
      const image = await url_to_image(href);
      if (!video) throw new Error(ENGLISH.camera_is_not_ready);
      if (video.readyState < 2 || !video.videoWidth) {
        await new Promise((resolve) => {
          const done = () => resolve();
          video.onloadeddata = done;
          window.setTimeout(done, 1400);
        });
      }
      if (!video.videoWidth) throw new Error(ENGLISH.camera_is_not_ready);
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const result = await verify_live_frames(image, video, (current) => {
        if (run_id.current !== token) return;
        set_frame(current);
      });
      if (run_id.current !== token) return;
      set_matches(result.matches);
      if (result.matched) {
        set_phase("matched");
      } else {
        set_phase("failed");
      }
    } catch (err) {
      if (run_id.current !== token) return;
      const denied = /notallowed|permission|denied|devices/i.test(String(err.name || err.message || ""));
      set_message(denied ? ENGLISH.allow_camera_access_to_verify_your_profile : err.message || ENGLISH.unable_to_verify_your_profile_photo);
      set_phase("failed");
    }
  }

  useEffect(() => {
    if (!open || phase !== "camera") return undefined;
    let alive = true;
    const timer = window.setTimeout(() => {
      if (alive) run_verify();
    }, 800);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, phase]);

  function choose_file(next) {
    const error = photo_ok(next);
    if (error) {
      set_message(error);
      return;
    }
    set_file(next);
    set_message("");
  }

  async function save_photo() {
    const error = photo_ok(file);
    if (error) {
      set_message(error);
      return;
    }
    set_phase("uploading");
    set_message("");
    try {
      const payload = await upload_mock_interview_profile_photo(photo_file(file));
      set_photo_url(payload?.profile_photo_url || "");
      set_file(null);
      set_phase("camera");
    } catch (err) {
      set_message(err.message || ENGLISH.unable_to_save_your_profile_photo);
      set_phase("upload");
    }
  }

  if (!open) return null;

  const verifying = phase === "verifying";
  const matched = phase === "matched";
  const failed = phase === "failed";
  const show_camera = phase === "camera" || verifying || matched || failed;

  return createPortal(
    <div
      className="smi_gate_scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smi_gate_title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy && !verifying) on_close();
      }}>
      <div className={`smi_gate${matched ? " is_ok" : failed ? " is_bad" : ""}`}>
        {show_camera ?
          <div className="smi_gate_stage">
            <div className={matched ? "smi_gate_orbit is_ok" : failed ? "smi_gate_orbit is_bad" : verifying ? "smi_gate_orbit is_live" : "smi_gate_orbit"}>
              <svg className="smi_gate_ring" viewBox="0 0 120 120" aria-hidden="true">
                {[1, 2, 3, 4].map((step) =>
                  <path key={step} className={tick_mark(step, { matched, failed, frame, matches })} d={ring_arc(step - 1)} />
                )}
              </svg>
              <div className="smi_gate_frame">
                <video ref={video_ref} className="smi_gate_cam" autoPlay muted playsInline />
              </div>
            </div>
            <h2 id="smi_gate_title">
              {matched ? ENGLISH.profile_matched : failed ? ENGLISH.profile_verification_failed : ENGLISH.verify_your_profile}
            </h2>
            <p>
              {matched ?
                ENGLISH.your_live_camera_matches_your_profile_photo_you :
                failed ?
                  ENGLISH.at_least_3_of_4_live_frames_must :
                  verifying ?
                    frame ? ENGLISH.checking_frame_of_4(frame) : ENGLISH.loading_face_model :
                    ENGLISH.look_at_the_camera_we_will_check_4}
            </p>
            {matches || verifying ?
              <small>{matches}{ENGLISH.of_4_frames_matched}</small> :
              null}
          </div> :
          <>
            <h2 id="smi_gate_title">{ENGLISH.verify_your_profile}</h2>
            <p>
              {phase === "upload" || phase === "uploading" ?
                ENGLISH.upload_a_clear_photo_of_yourself_it_is :
                ENGLISH.checking_your_profile_photo}
            </p>
          </>}

        {phase === "upload" || phase === "uploading" ?
          <>
            <input
              ref={picker}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                choose_file(event.target.files?.[0]);
                event.target.value = "";
              }} />
            <button
              type="button"
              className={drag ? "smi_photo_drop is_drag" : "smi_photo_drop"}
              disabled={phase === "uploading"}
              onClick={() => picker.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                set_drag(true);
              }}
              onDragLeave={() => set_drag(false)}
              onDrop={(event) => {
                event.preventDefault();
                set_drag(false);
                choose_file(event.dataTransfer.files?.[0]);
              }}>
              <b>{phase === "uploading" ? ENGLISH.saving_your_photo : ENGLISH.upload_photo}</b>
              <span>{file?.name || ENGLISH.jpg_png_webp_or_gif}</span>
            </button>
            <button type="button" className="smi_go" disabled={!file || phase === "uploading"} onClick={save_photo}>
              {phase === "uploading" ? "Saving..." : ENGLISH.save_to_profile}
            </button>
          </> :
          null}

        {message ? <p className="smi_error">{message}</p> : null}

        <div className="smi_gate_actions">
          <button type="button" onClick={on_close} disabled={busy || verifying}>{ENGLISH.close}</button>
          {failed ?
            <button type="button" className="smi_go" onClick={run_verify} disabled={busy}>{ENGLISH.retry_verification}</button> :
            <button type="button" className="smi_go" onClick={on_proceed} disabled={!matched || busy}>
              {busy ? ENGLISH.starting_interview : ENGLISH.proceed_to_interview}
            </button>}
        </div>
      </div>
    </div>,
    document.body
  );
}
