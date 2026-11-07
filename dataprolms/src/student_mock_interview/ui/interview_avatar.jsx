import { useEffect, useRef, useState } from "react";
import { TalkingHead } from "@met4citizen/talkinghead";

const AVATAR = {
  url: "/avatars/avaturn.glb",
  body: "F",
  avatarMood: "neutral",
  lipsyncLang: "en",
  retarget: {
    Hips: { y: 0.03 },
    Spine: { y: 0.02 },
    Spine1: { y: 0.02, z: 0.01 },
    Spine2: { y: 0.02, z: 0.01 },
    Neck: { z: 0.02, y: 0.01 },
    Head: { z: 0.02 },
    LeftShoulder: { rx: -0.5 },
    RightShoulder: { rx: -0.5 },
    scaleToHipsLevel: 1.0
  },
  baseline: { headRotateX: -0.05, eyeBlinkLeft: 0.15, eyeBlinkRight: 0.15 }
};

/** Defer GLB/Three.js so browser TTS is not starved on interview start. */
const INIT_DEFER_MS = 1200;

/**
 * Center-stage 3D interviewer (visual only — no lip-sync / no Web Audio speech).
 * Logo stays as fallback until the model is ready, or forever if load fails.
 */
export function Interview_Avatar({
  speaking = false,
  live = false,
  fallback_src,
  name = "",
  role_label = "AI Interviewer"
}) {
  const stage_ref = useRef(null);
  const head_ref = useRef(null);
  const [ready, set_ready] = useState(false);
  const [failed, set_failed] = useState(false);
  const [progress, set_progress] = useState(0);

  useEffect(() => {
    const stage = stage_ref.current;
    if (!stage) return undefined;

    let cancelled = false;
    let head;
    let init_timer = 0;

    const on_visibility = () => {
      if (!head) return;
      if (document.hidden) head.stop();
      else head.start();
    };

    init_timer = window.setTimeout(() => {
      if (cancelled || !stage_ref.current) return;

      try {
        head = new TalkingHead(stage_ref.current, {
          lipsyncModules: [],
          lipsyncLang: "en",
          cameraView: "upper",
          cameraRotateEnable: false,
          cameraZoomEnable: false,
          cameraPanEnable: false,
          avatarIdleEyeContact: 0.45,
          avatarSpeakingEyeContact: 0.85,
          avatarSpeakingHeadMove: 0.45,
          lightAmbientIntensity: 2.2,
          lightDirectIntensity: 25,
          modelFPS: 30
        });
        head_ref.current = head;
      } catch (error) {
        console.error("[interview_avatar] TalkingHead init failed", error);
        if (!cancelled) set_failed(true);
        return;
      }

      head
        .showAvatar(AVATAR, (event) => {
          if (!event?.lengthComputable || cancelled) return;
          set_progress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        })
        .then(() => {
          if (!cancelled) set_ready(true);
        })
        .catch((error) => {
          console.error("[interview_avatar] model load failed", error);
          if (!cancelled) set_failed(true);
        });

      document.addEventListener("visibilitychange", on_visibility);
    }, INIT_DEFER_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(init_timer);
      document.removeEventListener("visibilitychange", on_visibility);
      try {
        head?.dispose?.();
      } catch {
        /* ignore dispose errors */
      }
      head_ref.current = null;
    };
  }, []);

  const show_fallback = !ready || failed;
  const live_pill = speaking || live || ready;

  return (
    <div className={speaking || live ? "smi_stage is_live" : "smi_stage"}>
      <div className="smi_stage_frame">
        <img
          className={show_fallback ? "smi_avatar_fallback" : "smi_avatar_fallback is_hidden"}
          src={fallback_src}
          alt=""
        />
        <div
          ref={stage_ref}
          className={ready && !failed ? "smi_avatar_stage is_on" : "smi_avatar_stage"}
          aria-hidden={show_fallback}
        />
        {show_fallback && !failed ?
          <div className="smi_stage_overlay" aria-hidden="true">
            <span className="smi_stage_bar"><i style={{ width: `${Math.max(8, progress)}%` }} /></span>
            <small>Connecting interviewer…</small>
          </div> :
          null}
        {failed ?
          <div className="smi_stage_overlay is_warn" aria-hidden="true">
            <small>Using logo fallback</small>
          </div> :
          null}
        {name ?
          <span className={live_pill ? "smi_stage_pill is_on" : "smi_stage_pill"}>
            <i /> {name} — {role_label}
          </span> :
          null}
      </div>
    </div>
  );
}
