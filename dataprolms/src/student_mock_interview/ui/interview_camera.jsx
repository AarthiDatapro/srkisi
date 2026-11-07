import { useEffect, useRef, useState } from "react";

/**
 * Picture-in-picture live camera for the interview room.
 * Visual only — does not touch STT/TTS streams.
 */
export function Interview_Camera({ active = false, label = "You", offline_label = "Camera unavailable" }) {
  const video_ref = useRef(null);
  const stream_ref = useRef(null);
  const [ready, set_ready] = useState(false);
  const [failed, set_failed] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream_ref.current = stream;
        const video = video_ref.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        if (!cancelled) {
          set_ready(true);
          set_failed(false);
        }
      } catch (error) {
        console.error("[interview_camera] getUserMedia failed", error);
        if (!cancelled) {
          set_failed(true);
          set_ready(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stream_ref.current?.getTracks?.().forEach((track) => track.stop());
      stream_ref.current = null;
      if (video_ref.current) video_ref.current.srcObject = null;
      set_ready(false);
    };
  }, [active]);

  return (
    <div className={ready ? "smi_pip is_on" : "smi_pip"}>
      <video
        ref={video_ref}
        className="smi_pip_video"
        autoPlay
        muted
        playsInline
        aria-label={label}
      />
      {!ready ?
        <div className="smi_pip_fallback" aria-hidden="true">
          <span>{failed ? offline_label : "…"}</span>
        </div> :
        null}
      <span className={ready ? "smi_pip_pill is_on" : "smi_pip_pill"}>
        <i /> {label}
      </span>
    </div>
  );
}
