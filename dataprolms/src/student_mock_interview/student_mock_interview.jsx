import { useEffect, useRef, useState } from "react";
import { useToast } from "@datapromr/toast";
import robot_src from "../assets/mock_interview_robot.svg";
import {
  answer_mock_interview,
  current_mock_interview,
  finish_mock_interview,
  get_mock_interview,
  reattempt_mock_interview,
  resume_live_mock_interview,
  start_course_interview,
  start_mock_interview,
  start_previous_interview
} from "./api.js";
import { restore_handoff, take_resume_handoff } from "./handoff.js";
import { Profile_Gate } from "./profile_gate.jsx";
import { Certificate_Download } from "./ui/certificate_download.jsx";
import { Fresher_Round } from "./ui/fresher_round.jsx";
import { Interview_Avatar } from "./ui/interview_avatar.jsx";
import { Interview_Camera } from "./ui/interview_camera.jsx";
import { Sentiment_Panel } from "./ui/sentiment_panel.jsx";
import "./theme/interview.css";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../constants/english/student_mock_interview_constants_english.js";


const EXPERIENCE_LEVELS = [
  { value: "fresher", get label() { return ENGLISH.fresher_mode; } },
  { value: "mid", get label() { return ENGLISH.mid_level_professional; } },
  { value: "senior", get label() { return ENGLISH.senior_level_professional; } }
];

const INTERVIEW_LANGUAGES = [
  { label: "English (India)", code: "en-IN" },
  { label: "Hindi", code: "hi-IN" },
  { label: "Rajasthani", code: "raj-IN" },
  { label: "Telugu", code: "te-IN" },
  { label: "Tamil", code: "ta-IN" },
  { label: "Kannada", code: "kn-IN" },
  { label: "Malayalam", code: "ml-IN" },
  { label: "Marathi", code: "mr-IN" },
  { label: "Bengali", code: "bn-IN" },
  { label: "Gujarati", code: "gu-IN" },
  { label: "Punjabi", code: "pa-IN" }
];

/* Browsers rarely ship a Rajasthani voice/STT engine — Hindi is the closest Devanagari fallback. */
function speech_engine_language(code) {
  const value = String(code || "en-IN").trim();
  if (value.toLowerCase().startsWith("raj")) return "hi-IN";
  return value;
}

function touch_ui() {
  if (typeof window === "undefined") return false;
  return (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.("(pointer: coarse)")?.matches;
}


function file_size(file) {
  const bytes = Number(file?.size) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return bytes ? `${bytes} B` : "";
}

function question_of(item) {
  return item?.session?.question || null;
}

function reattempt_question_of(item, question_number) {
  const entry = Array.isArray(item?.answers) ? item.answers[question_number - 1] : null;
  const question = entry?.question;
  if (question && typeof question === "object" && question.question) return question;
  return null;
}

function join_voice(base, spoken) {
  const left = String(base || "");
  const right = String(spoken || "").trim();
  if (!right) return left;
  if (!left.trim()) return right;
  if (/\s$/.test(left)) return `${left}${right}`;
  return `${left} ${right}`;
}

function voice_added(previous, next) {
  const left = String(previous || "").replace(/\s+/g, " ").trim();
  const right = String(next || "").replace(/\s+/g, " ").trim();
  if (!right || right === left) return "";
  if (!left) return right;
  if (right.startsWith(left)) return right.slice(left.length).trim();
  return "";
}

function size_wave_canvas(canvas) {
  const bar = canvas?.parentElement;
  if (!canvas || !bar) return false;
  const width = Math.max(1, Math.floor(bar.clientWidth));
  const height = Math.max(1, Math.floor(bar.clientHeight));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return true;
}

function paint_voice_wave(canvas, analyser, bins, from_mic, clock) {
  const ctx = canvas?.getContext("2d");
  if (!ctx || !size_wave_canvas(canvas)) return;
  if (analyser && bins) analyser.getByteFrequencyData(bins);
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const bar_width = 5;
  const gap = 4;
  const count = Math.max(6, Math.floor((width + gap) / (bar_width + gap)));
  const mid = height / 2;
  for (let index = 0; index < count; index += 1) {
    const near = from_mic ? 1 - index / Math.max(1, count - 1) : index / Math.max(1, count - 1);
    let level = 0.16 + 0.55 * near;
    if (analyser && bins?.length) {
      const from = Math.floor((index / count) * bins.length * 0.7);
      const to = Math.max(from + 1, Math.floor(((index + 1) / count) * bins.length * 0.7));
      let total = 0;
      for (let bin = from; bin < to; bin += 1) total += bins[bin] || 0;
      level = Math.max(0.12, (total / (to - from) / 255) * (0.35 + 0.65 * near));
    } else {
      const pulse = 0.62 + 0.38 * Math.sin(((clock || 0) / 280) + index * 0.38);
      level *= pulse;
    }
    const bar_height = Math.max(4, level * (height - 4));
    const mix = Math.min(1, Math.max(0, near));
    ctx.fillStyle = `rgb(${Math.round(76 + 64 * mix)}, ${Math.round(141 - 48 * mix)}, ${Math.round(255 - 40 * mix)})`;
    ctx.beginPath();
    ctx.roundRect(index * (bar_width + gap), mid - bar_height / 2, bar_width, bar_height, bar_width / 2);
    ctx.fill();
  }
}

function progress_of(item, question_number) {
  const total = Number(item?.total_questions) || Number(item?.session?.total_questions) || 0;
  const current = Number(question_number) || Number(item?.question_number) || Number(item?.session?.question_number) || 0;
  if (!total) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

const GIRL_VOICE = /female|neerja|swara|heera|zira|hazel|sonia|libby|aria|jenny|michelle|susan|samantha|karen|moira|tessa|fiona|veena|lekha|priya|aarti|natasha|emma|linda|heather|catherine|google us english/i;
const MALE_VOICE = /\bmale\b|\bdavid\b|\bmark\b|\bgeorge\b|\bravi\b|\bguy\b|\bdaniel\b|\bprabhat\b|\bjames\b|\bryan\b|\bchristopher\b/i;

function is_girl_voice(voice) {
  const name = String(voice?.name || "");
  if (voice?.gender === "male") return false;
  if (MALE_VOICE.test(name) && !/female/i.test(name)) return false;
  if (voice?.gender === "female") return true;
  return GIRL_VOICE.test(name);
}

function girl_rank(voice, preferred_lang = "") {
  const name = String(voice?.name || "").toLowerCase();
  const lang = String(voice?.lang || "").toLowerCase();
  const wanted = String(preferred_lang || "").toLowerCase();
  const wanted_prefix = wanted.split("-")[0];

  /* Prefer exact locale (en-IN), then Indian voices — never prefer UK/British first. */
  let rank = 40;
  if (wanted && lang === wanted) rank = 0;
  else if (wanted_prefix === "en" && lang === "en-in") rank = 1;
  else if (/neerja|swara|veena|heera|priya|lekha/.test(name)) rank = 2;
  else if (wanted_prefix && lang.split("-")[0] === wanted_prefix && !/en-gb|en-uk/.test(lang)) rank = 8;
  else if (name.includes(ENGLISH.google_us_english) || /en-us/.test(lang)) rank = 12;
  else if (/samantha|zira|susan|aria|jenny/.test(name)) rank = 16;
  else if (name.includes("female")) rank = 20;
  if (/uk english|en-gb|en-uk|british|libby|serena|susan.*british/.test(`${name} ${lang}`)) {
    rank += 50;
  }
  return rank;
}

function pick_girl_voice(voices, preferred_lang = "") {
  const girls = (Array.isArray(voices) ? voices : []).filter(is_girl_voice);
  girls.sort((a, b) => girl_rank(a, preferred_lang) - girl_rank(b, preferred_lang));
  return girls[0] || null;
}

function load_voices(synth) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      const next = synth.getVoices();
      if (!next.length || settled) return;
      if (!pick_girl_voice(next)) return;
      settled = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(next);
    };
    synth.addEventListener("voiceschanged", finish);
    finish();
    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    }, 1200);
  });
}

function save_error_message(err) {
  const message = String(err?.message || "").trim();
  if (/fetch failed|supabase|storage|upload/i.test(message)) {
    return ENGLISH.unable_to_save_recording;
  }
  return message || ENGLISH.unable_to_submit_this_answer;
}

export function Student_Mock_Interview({ on_return_to_board, start_fresh = false }) {
  const toast = useToast();
  const picker = useRef(null);
  const recognition = useRef(null);
  const answer_ref = useRef("");
  const listening_ref = useRef(false);
  const voice_committed_ref = useRef("");
  const voice_finals_ref = useRef([]);
  const reset_voice_ref = useRef(false);
  const wave_left_ref = useRef(null);
  const wave_right_ref = useRef(null);
  const meter_stop_ref = useRef(null);
  const audio_recorder_ref = useRef(null);
  const audio_chunks_ref = useRef([]);
  const audio_blob_ref = useRef(null);
  const audio_stream_ref = useRef(null);
  const busy_ref = useRef(false);
  const return_ref = useRef(() => {});
  const mic_tap_ref = useRef(0);
  const [file, set_file] = useState(null);
  const [from_resume, set_from_resume] = useState(false);
  const [from_course, set_from_course] = useState(false);
  const [course_context, set_course_context] = useState(null);
  const [target_role, set_target_role] = useState("");
  const [saved_role, set_saved_role] = useState("");
  const [use_saved, set_use_saved] = useState(false);
  const [picked_job, set_picked_job] = useState(null);
  const [role_source, set_role_source] = useState("resume");
  const [job_id, set_job_id] = useState("");
  const [item, set_item] = useState(null);
  const [answer, set_answer] = useState("");
  const [interview_language, set_interview_language] = useState("en-IN");
  const [experience_level, set_experience_level] = useState("");
  const [quiz_open, set_quiz_open] = useState(false);
  const [fresher_done, set_fresher_done] = useState(false);
  const [listening, set_listening] = useState(false);
  const [answer_mode, set_answer_mode] = useState("");
  const [speak_on, set_speak_on] = useState(false);
  const [voicing, set_voicing] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState("");
  const [gate_open, set_gate_open] = useState(false);
  const [reattempt_number, set_reattempt_number] = useState(0);
  const [board_id, set_board_id] = useState(0);

  useEffect(() => {
    answer_ref.current = answer;
  }, [answer]);

  useEffect(() => {
    if (answer_mode !== "record" || listening) return undefined;
    let frame = 0;
    let alive = true;
    const tick = (clock) => {
      if (!alive) return;
      paint_voice_wave(wave_left_ref.current, null, null, false, clock);
      paint_voice_wave(wave_right_ref.current, null, null, true, clock);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [answer_mode, listening]);

  useEffect(() => {
    let cancelled = false;
    const handed = take_resume_handoff();
    if (handed?.course_context) {
      set_from_course(true);
      set_course_context(handed.course_context);
    } else if (handed?.fresher_quiz && handed?.job_id) {
      set_role_source("job");
      set_job_id(String(handed.job_id));
      set_picked_job({
        job_id: handed.job_id,
        job_title: handed.job_title || "",
        company_name: handed.company_name || ""
      });
      set_experience_level("fresher");
      set_quiz_open(true);
    } else if (handed?.job_id) {
      set_role_source("job");
      set_job_id(String(handed.job_id));
      set_picked_job({
        job_id: handed.job_id,
        job_title: handed.job_title || "",
        company_name: handed.company_name || ""
      });
    } else if (handed?.file) {
      set_file(handed.file);
      set_from_resume(true);
      set_target_role(handed.target_role || "");
      set_role_source("resume");
    }

    const open_id = Number(handed?.resume_interview_id);
    const reattempt_q = Number(handed?.reattempt_question);
    const fresh = start_fresh || Boolean(handed?.start_fresh);
    if (Number.isInteger(open_id) && open_id > 0) set_board_id(open_id);
    if (Number.isInteger(reattempt_q) && reattempt_q > 0) set_reattempt_number(reattempt_q);
    if (!fresh && Number.isInteger(open_id) && open_id > 0) {
      const loader = Number.isInteger(reattempt_q) && reattempt_q > 0 ?
        get_mock_interview(open_id) :
        resume_live_mock_interview(open_id);
      loader.
        then((payload) => {
          if (cancelled) return;
          const saved = payload?.item;
          const analysis = saved?.analysis;
          if (analysis && typeof analysis === "object") {
            set_saved_role(String(analysis.target_role || "").trim());
          }
          if (Number.isInteger(reattempt_q) && reattempt_q > 0) {
            if (reattempt_question_of(saved, reattempt_q)) set_item(saved);
            else set_error(ENGLISH.unable_to_reattempt_this_answer);
            return;
          }
          if (saved?.status === "in_progress" && question_of(saved)) set_item(saved);
        }).
        catch((err) => {
          if (!cancelled) set_error(err.message || "");
        });
    } else {
      current_mock_interview().
        then((payload) => {
          if (cancelled) return;
          const saved = payload?.item;
          const analysis = saved?.analysis;
          if (analysis && typeof analysis === "object") {
            set_saved_role(String(analysis.target_role || "").trim());
          }
        }).
        catch(() => { });
    }

    const synth = window.speechSynthesis;
    synth?.getVoices();
    const warm_voices = () => synth?.getVoices();
    synth?.addEventListener("voiceschanged", warm_voices);
    return () => {
      cancelled = true;
      restore_handoff(handed);
      synth?.removeEventListener("voiceschanged", warm_voices);
      listening_ref.current = false;
      recognition.current?.stop?.();
      meter_stop_ref.current?.();
      synth?.cancel();
    };
  }, [start_fresh]);

  const question = reattempt_number > 0 ? reattempt_question_of(item, reattempt_number) : question_of(item);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return undefined;
    synth.cancel();
    if (!speak_on || !question?.question) return undefined;
    let alive = true;
    let started = false;
    const line = new SpeechSynthesisUtterance(question.question);
    const speech_language = speech_engine_language(interview_language);
    line.lang = speech_language;
    line.rate = 0.92;
    line.pitch = 1.2;

    const stop_voice = () => {
      if (!alive) return;
      alive = false;
      set_voicing(false);
      set_speak_on(false);
    };

    line.onstart = () => {
      started = true;
      if (alive) set_voicing(true);
    };
    line.onend = stop_voice;
    line.onerror = (event) => {
      if (!alive || !started) return;
      if (event?.error === "interrupted" || event?.error === "canceled") return;
      stop_voice();
    };

    let quiet_since = 0;
    const watch = window.setInterval(() => {
      if (!alive || !started) return;
      if (synth.paused) synth.resume();
      if (synth.speaking || synth.pending) {
        quiet_since = 0;
        return;
      }
      if (!quiet_since) quiet_since = Date.now();
      if (Date.now() - quiet_since >= 400) stop_voice();
    }, 200);

    const give_up = window.setTimeout(() => {
      if (!alive || started) return;
      if (!synth.speaking && !synth.pending) stop_voice();
    }, 2500);

    load_voices(synth).then((voices) => {
      if (!alive) return;

      const selected_language = speech_language.toLowerCase();
      const language_prefix = selected_language.split("-")[0];
      const exact_voices = voices.filter((voice) =>
        String(voice.lang || "").toLowerCase() === selected_language
      );
      const matching_voices = exact_voices.length ? exact_voices : voices.filter((voice) => {
        const voice_language = String(voice.lang || "").toLowerCase();
        if (voice_language.split("-")[0] !== language_prefix) return false;
        /* For English interviews, skip British voices unless nothing else exists. */
        if (language_prefix === "en" && /en-gb|en-uk/.test(voice_language)) return false;
        return true;
      });
      const pool = matching_voices.length ? matching_voices : voices.filter((voice) => {
        const voice_language = String(voice.lang || "").toLowerCase();
        return voice_language === selected_language ||
          voice_language.split("-")[0] === language_prefix;
      });
      const voice = pick_girl_voice(pool, selected_language) || pool[0];

      if (voice) line.voice = voice;

      window.setTimeout(() => {
        if (!alive) return;
        synth.speak(line);
      }, 60);
    });
    return () => {
      alive = false;
      window.clearInterval(watch);
      window.clearTimeout(give_up);
      set_voicing(false);
      synth.cancel();
    };
  }, [
    speak_on,
    question?.question_id,
    question?.question,
    interview_language
  ]);
  const reattempting = reattempt_number > 0 && Boolean(question);
  const interviewing = (item?.status === "in_progress" && Boolean(question)) || reattempting;
  const reporting = item?.status === "completed" && Boolean(item?.performance) && !reattempting;
  const step = reporting ? 3 : interviewing || item || quiz_open || reattempt_number > 0 ? 2 : 1;
  const board_locked = interviewing || quiz_open || reattempt_number > 0;
  const last_note = !reattempting && item?.answers?.length ? item.answers[item.answers.length - 1]?.evaluation : null;
  const shown_number = reattempt_number || item?.question_number;
  const live_role = String(
    picked_job?.job_title ||
    target_role ||
    item?.analysis?.target_role ||
    item?.session?.target_role ||
    saved_role ||
    ""
  ).trim();

  function choose_file(next) {
    if (!next) return;
    set_file(next);
    set_from_resume(false);
    set_use_saved(false);
    set_error("");
  }

  function pick_language(code) {
    stop_listening();
    window.speechSynthesis?.cancel();
    set_voicing(false);
    set_speak_on(false);
    set_interview_language(code);
    set_error("");
  }

  function start_block() {
    if (from_course) {
      if (!course_context?.modules?.length) return ENGLISH.no_lessons_are_available_for_this_interview;
      return "";
    }
    if (use_saved) return "";
    if (!file) return ENGLISH.upload_a_resume_first;
    if (role_source === "job" && !job_id) return ENGLISH.open_a_job_from_the_jobs_board_first;
    if (role_source === "job" && !experience_level) return ENGLISH.choose_experience_level;
    return "";
  }

  function request_start() {
    const blocked = start_block();
    if (blocked) {
      set_error(blocked);
      return;
    }
    set_error("");
    if (role_source === "job" && experience_level === "fresher" && !fresher_done) {
      set_quiz_open(true);
      return;
    }
    set_gate_open(true);
  }

  function after_fresher_quiz() {
    set_quiz_open(false);
    set_fresher_done(true);
    set_error("");
    if (!from_course && !file && !use_saved) {
      set_error(ENGLISH.upload_a_resume_first);
      return;
    }
    set_gate_open(true);
  }

  async function begin() {
    if (from_course) {
      if (!course_context?.modules?.length) {
        set_error(ENGLISH.no_lessons_are_available_for_this_interview);
        return;
      }
      set_busy(true);
      set_error("");
      try {
        const payload = await start_course_interview(
          course_context,
          interview_language
        );
        set_item(payload.item);
        set_answer("");
        set_answer_mode("");
        set_gate_open(false);
      } catch (err) {
        set_error(err.message);
      } finally {
        set_busy(false);
      }
      return;
    }
    if (use_saved) {
      set_busy(true);
      set_error("");
      try {
        const payload = await start_previous_interview(interview_language);
        set_item(payload.item);
        set_answer("");
        set_answer_mode("");
        set_gate_open(false);
      } catch (err) {
        set_error(err.message);
      } finally {
        set_busy(false);
      }
      return;
    }
    if (!file) {
      set_error(ENGLISH.upload_a_resume_first);
      return;
    }
    if (role_source === "job" && !job_id) {
      set_error(ENGLISH.open_a_job_from_the_jobs_board_first);
      return;
    }
    set_busy(true);
    set_error("");
    try {
      const payload = await start_mock_interview({
        file,
        role_source,
        job_id,
        target_role,
        language: interview_language,
        experience_level
      });
      set_item(payload.item);
      set_answer("");
      set_answer_mode("");
      set_gate_open(false);
    } catch (err) {
      set_error(err.message);
    } finally {
      set_busy(false);
    }
  }

  function stop_meter() {
    meter_stop_ref.current?.();
    meter_stop_ref.current = null;
  }

  function forget_audio() {
    audio_stream_ref.current?.getTracks?.().forEach((track) => track.stop());
    audio_stream_ref.current = null;
    audio_chunks_ref.current = [];
    audio_blob_ref.current = null;
    audio_recorder_ref.current = null;
  }

  function recorder_mime() {
    if (typeof MediaRecorder === "undefined") return "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "";
  }

  function keep_audio_chunk(event) {
    if (event.data?.size) audio_chunks_ref.current.push(event.data);
  }

  function blob_from_chunks(type) {
    const chunks = audio_chunks_ref.current;
    if (!chunks.length) return null;
    const blob = new Blob(chunks, { type: type || "audio/webm" });
    return blob.size ? blob : null;
  }

  function start_audio_recorder(stream) {
    audio_chunks_ref.current = [];
    audio_blob_ref.current = null;
    audio_recorder_ref.current = null;
    if (typeof MediaRecorder === "undefined") return;
    const record_stream = stream.clone ? stream.clone() : stream;
    audio_stream_ref.current = record_stream;
    const mime = recorder_mime();
    const recorder = mime ? new MediaRecorder(record_stream, { mimeType: mime }) : new MediaRecorder(record_stream);
    recorder.ondataavailable = keep_audio_chunk;
    recorder.start();
    audio_recorder_ref.current = recorder;
  }

  function stop_audio_recorder() {
    const recorder = audio_recorder_ref.current;
    if (!recorder || recorder.state === "inactive") {
      if (!audio_blob_ref.current) audio_blob_ref.current = blob_from_chunks(recorder?.mimeType);
      audio_stream_ref.current?.getTracks?.().forEach((track) => track.stop());
      audio_stream_ref.current = null;
      return Promise.resolve(audio_blob_ref.current);
    }
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audio_blob_ref.current = blob_from_chunks(recorder.mimeType);
        audio_recorder_ref.current = null;
        audio_stream_ref.current?.getTracks?.().forEach((track) => track.stop());
        audio_stream_ref.current = null;
        resolve(audio_blob_ref.current);
      };
      recorder.ondataavailable = (event) => {
        keep_audio_chunk(event);
      };
      recorder.onstop = finish;
      window.setTimeout(finish, 2000);
      try {
        if (recorder.state === "recording") recorder.requestData?.();
        recorder.stop();
      } catch {
        finish();
      }
    });
  }

  async function stop_listening() {
    listening_ref.current = false;
    reset_voice_ref.current = false;
    recognition.current?.stop?.();
    await stop_audio_recorder();
    stop_meter();
    set_listening(false);
  }

  async function start_meter(unlocked_context = null) {
    stop_meter();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    try {
      start_audio_recorder(stream);
    } catch {
      set_error(ENGLISH.recording_was_not_saved);
    }
    const Audio_Ctx = window.AudioContext || window.webkitAudioContext;
    const context = unlocked_context && unlocked_context.state !== "closed" ?
      unlocked_context :
      new Audio_Ctx();
    if (context.state === "suspended") await context.resume().catch(() => {});
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      paint_voice_wave(wave_left_ref.current, analyser, bins, false);
      paint_voice_wave(wave_right_ref.current, analyser, bins, true);
      frame = requestAnimationFrame(draw);
    };
    draw();
    meter_stop_ref.current = () => {
      alive = false;
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      context.close().catch(() => {});
    };
  }

  function start_recognition() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech || !listening_ref.current) return;
    const mobile = touch_ui();
    const heard = new Speech();
    heard.lang = speech_engine_language(interview_language);
    heard.interimResults = true;
    heard.continuous = !mobile;
    heard.maxAlternatives = 1;
    heard.onresult = (event) => {
      if (!listening_ref.current || reset_voice_ref.current) return;
      const finals = voice_finals_ref.current;
      let interim = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const piece = String(event.results[index][0]?.transcript || "").replace(/\s+/g, " ").trim();
        if (event.results[index].isFinal) {
          const added = voice_added(finals[index], piece);
          if (added) {
            voice_committed_ref.current = join_voice(voice_committed_ref.current, added).slice(0, 3000);
            finals[index] = piece;
          } else if (!finals[index] && piece) {
            finals[index] = piece;
          }
        } else if (!finals[index]) {
          interim = join_voice(interim, piece);
        }
      }
      const next = join_voice(voice_committed_ref.current, interim).slice(0, 3000);
      answer_ref.current = next;
      set_answer(next);
    };
    heard.onerror = (event) => {
      const code = event?.error || "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        stop_listening();
        set_error(ENGLISH.voice_answers_need_a_browser_that_can_turn);
        return;
      }
      if (code === "aborted" || code === "no-speech") return;
    };
    heard.onend = () => {
      if (!listening_ref.current) return;
      reset_voice_ref.current = false;
      voice_finals_ref.current = [];
      const locked = voice_committed_ref.current;
      answer_ref.current = locked;
      set_answer(locked);
      window.setTimeout(() => {
        if (listening_ref.current) start_recognition();
      }, mobile ? 320 : 80);
    };
    recognition.current = heard;
    const kick = (attempt = 0) => {
      if (!listening_ref.current) return;
      try {
        heard.start();
      } catch {
        if (attempt < 2) {
          window.setTimeout(() => kick(attempt + 1), 280);
          return;
        }
        /* Keep the mic meter/recorder running so the student can still stop and type. */
      }
    };
    kick();
  }

  function edit_answer(next) {
    answer_ref.current = next;
    set_answer(next);
    voice_committed_ref.current = next;
    voice_finals_ref.current = [];
    if (!listening_ref.current) return;
    reset_voice_ref.current = true;
    const heard = recognition.current;
    if (!heard) return;
    heard.onresult = null;
    try {
      heard.stop();
    } catch {
      reset_voice_ref.current = false;
      start_recognition();
    }
  }

  function clear_answer() {
    answer_ref.current = "";
    voice_committed_ref.current = "";
    voice_finals_ref.current = [];
    set_answer("");
  }

  function change_answer_method() {
    stop_listening();
    clear_answer();
    forget_audio();
    set_answer_mode("");
    set_error("");
  }

  function leave_reattempt() {
    const interview_id = item?.mock_interview_id || board_id;
    recognition.current?.stop?.();
    window.speechSynthesis?.cancel();
    set_voicing(false);
    set_speak_on(false);
    listening_ref.current = false;
    meter_stop_ref.current?.();
    meter_stop_ref.current = null;
    forget_audio();
    set_listening(false);
    if (on_return_to_board) {
      on_return_to_board(interview_id);
      return;
    }
    set_reattempt_number(0);
    set_answer("");
    set_answer_mode("");
    set_error("");
  }

  async function submit_answer() {
    await stop_listening();
    const text = answer.trim();
    if (!item || !text) return;
    const audio = answer_mode === "record" ? audio_blob_ref.current : null;
    if (answer_mode === "record" && !audio?.size) {
      set_error(ENGLISH.recording_was_not_saved);
      toast.error(ENGLISH.recording_was_not_saved);
      return;
    }
    busy_ref.current = true;
    set_busy(true);
    set_error("");
    try {
      if (reattempt_number > 0) {
        await reattempt_mock_interview(item.mock_interview_id, reattempt_number, text, audio);
        forget_audio();
        toast.success(ENGLISH.answer_recorded_successfully);
        leave_reattempt();
        return;
      }
      const payload = audio ?
        await answer_mock_interview(item.mock_interview_id, text, audio) :
        await answer_mock_interview(item.mock_interview_id, text);
      forget_audio();
      set_item(payload.item);
      set_answer("");
      set_answer_mode("");
    } catch (err) {
      if (/not found/i.test(err.message || "")) {
        return_to_start();
        return;
      }
      const message = save_error_message(err);
      set_error(message);
      toast.error(message);
    } finally {
      set_busy(false);
    }
  }

  function return_to_start() {
    recognition.current?.stop?.();
    window.speechSynthesis?.cancel();
    set_voicing(false);
    set_speak_on(false);
    listening_ref.current = false;
    meter_stop_ref.current?.();
    meter_stop_ref.current = null;
    forget_audio();
    set_listening(false);
    set_item(null);
    set_answer("");
    set_answer_mode("");
    set_error("");
  }

  async function finish() {
    if (!item?.mock_interview_id) {
      return_to_start();
      return;
    }
    busy_ref.current = true;
    set_busy(true);
    set_error("");
    try {
      const payload = await finish_mock_interview(item.mock_interview_id);
      const next = payload?.item;
      if (next?.status === "completed" && next?.performance) set_item(next);
      else return_to_start();
    } catch {
      return_to_start();
    } finally {
      set_busy(false);
    }
  }

  busy_ref.current = busy;
  return_ref.current = reattempting ? leave_reattempt : return_to_start;

  useEffect(() => {
    const interview_id = item?.mock_interview_id;
    if (!interviewing || !interview_id) return undefined;
    let stop = false;
    const watch = window.setInterval(() => {
      if (stop || busy_ref.current) return;
      current_mock_interview().then((payload) => {
        if (stop || busy_ref.current) return;
        const saved = payload?.item;
        if (saved?.mock_interview_id !== interview_id) return;
        if (saved.status === "in_progress") return;
        return_ref.current();
      }).catch(() => {});
    }, 15000);
    return () => {
      stop = true;
      window.clearInterval(watch);
    };
  }, [interviewing, item?.mock_interview_id]);

  function toggle_speaker() {
    if (!window.speechSynthesis) {
      set_error(ENGLISH.this_browser_cannot_read_the_question_aloud);
      return;
    }
    set_speak_on((on) => !on);
  }

  async function start_voice() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      set_error(ENGLISH.voice_answers_need_a_browser_that_can_turn);
      return;
    }
    if (listening_ref.current) return;
    set_error("");
    voice_committed_ref.current = answer_ref.current;
    voice_finals_ref.current = [];
    reset_voice_ref.current = false;
    listening_ref.current = true;
    set_listening(true);
    /* Unlock audio on the same user gesture — mobile browsers block AudioContext after await. */
    let unlocked_context = null;
    try {
      const Audio_Ctx = window.AudioContext || window.webkitAudioContext;
      if (Audio_Ctx) {
        unlocked_context = new Audio_Ctx();
        if (unlocked_context.state === "suspended") unlocked_context.resume().catch(() => {});
      }
    } catch {
      unlocked_context = null;
    }
    try {
      await start_meter(unlocked_context);
    } catch {
      try {
        unlocked_context?.close?.();
      } catch {
        /* ignore */
      }
      /* Speech recognition can still capture words if the meter stream is blocked. */
    }
    if (!listening_ref.current) return;
    start_recognition();
  }

  function toggle_voice() {
    const now = Date.now();
    if (now - mic_tap_ref.current < 350) return;
    mic_tap_ref.current = now;
    if (listening_ref.current) {
      stop_listening();
      return;
    }
    start_voice();
  }

  function pick_voice() {
    set_error("");
    set_answer_mode("record");
    window.speechSynthesis?.cancel();
    set_voicing(false);
    start_voice();
  }

  function record_again() {
    stop_listening().then(() => {
      clear_answer();
      forget_audio();
      set_answer_mode("record");
      window.setTimeout(() => {
        start_voice();
      }, 120);
    });
  }

  const performance = item?.performance;

  return (
    <section className="smi_desk">
      {interviewing ? null :
      <ol className="smi_steps">
        {[
          [from_course ? ENGLISH.course : ENGLISH.resume, from_course ? ENGLISH.lessons_covered_so_far : role_source === "job" ? ENGLISH.upload_your_resume_for_this_job : ENGLISH.upload_your_resume],
          [ENGLISH.interview, ENGLISH.answer_personalized_questions],
          [ENGLISH.report, ENGLISH.view_your_performance]
        ].map(([label, hint], index) =>
          <li key={label} className={index + 1 < step ? "is_done" : index + 1 === step ? "is_on" : ""}>
            <span>{index + 1}</span>
            <div>
              <strong>{label}</strong>
              <small>{hint}</small>
            </div>
          </li>
        )}
      </ol>}

      <div className={board_locked ? "smi_board is_focus" : reporting ? "smi_board is_done" : "smi_board"}>
        <div className="smi_curtain is_left" aria-hidden={board_locked}>
          <article className="smi_card">
            <header>
              <i>1</i>
              <div>
                <h2>{from_course ? ENGLISH.course : ENGLISH.resume}</h2>
                <p>{from_course ? ENGLISH.this_interview_uses_the_lessons_you_have_covered : role_source === "job" ? ENGLISH.upload_your_resume_questions_follow_the_job_you : ENGLISH.upload_your_resume_the_interview_uses_the_role}</p>
              </div>
            </header>
            {from_course ?
              <div className="smi_drop is_locked">
                <b>{course_context?.course_name || ENGLISH.your_course}</b>
                <span>{ENGLISH.resume_upload_is_turned_off_for_this_interview}</span>
                <small>
                  {course_context?.current_lesson?.lesson_title ?
                    ENGLISH.through(course_context.current_lesson.lesson_title) :
                    ENGLISH.modules_and_lesson_overviews_up_to_this_quiz}
                </small>
              </div> :
              null}
            {from_course ? null : <>
              <input
                ref={picker}
                type="file"
                accept=".pdf,.docx,.pptx,.txt,application/pdf"
                hidden
                onChange={(event) => {
                  choose_file(event.target.files?.[0]);
                  event.target.value = "";
                }} />
              <button type="button" className="smi_drop" onClick={() => picker.current?.click()} disabled={busy || board_locked}>
                <b>{ENGLISH.drag_drop_your_file_here}</b>
                <span>{ENGLISH.or_click_to_browse}</span>
                <small>{ENGLISH.supports_pdf_docx_pptx_txt_max_size_10}</small>
              </button>
              {file ?
                <div className="smi_file">
                  <strong>{file.name}</strong>
                  <span>{file_size(file)}{from_resume ? ENGLISH.from_resume_analyser : ""}</span>
                  <button type="button" aria-label={ENGLISH.remove_resume} onClick={() => set_file(null)} disabled={busy || board_locked}>×</button>
                </div> :
                null}
              {role_source !== "job" ?
                <button
                  type="button"
                  className={use_saved ? "smi_saved is_on" : "smi_saved"}
                  onClick={() => {
                    set_use_saved(true);
                    set_file(null);
                    set_from_resume(false);
                    set_error("");
                  }}
                  disabled={busy || board_locked}>
                  <i aria-hidden="true">{use_saved ? "✓" : "↻"}</i>
                  <span>
                    <b>{ENGLISH.use_my_last_resume_analysis}</b>
                    <small>
                      {saved_role ?
                        ENGLISH.last_role_no_upload(saved_role) :
                        ENGLISH.skip_the_upload_we_already_saved_it}
                    </small>
                  </span>
                </button> :
                null}
              {role_source === "job" ?
                <div className="smi_picked">
                  <b>{picked_job?.job_title || ENGLISH.selected_job}</b>
                  <span>{picked_job?.company_name || ENGLISH.questions_follow_this_listing}</span>
                </div> :
                use_saved ? null :
                <p className="smi_role_note">
                  {target_role ? ENGLISH.this_interview_uses_from_your_resume(target_role) : ENGLISH.this_interview_uses_the_role_written_on_your}
                </p>}

              {role_source === "job" ?
                <label className="smi_language" htmlFor="smi_experience_level">
                  <span id="smi_experience_label">{ENGLISH.experience_level}</span>
                  <select
                    id="smi_experience_level"
                    value={experience_level}
                    onChange={(event) => {
                      set_experience_level(event.target.value);
                      set_quiz_open(false);
                      set_fresher_done(false);
                      set_error("");
                    }}
                    disabled={busy || board_locked}>
                    <option value="">{ENGLISH.choose_experience_level}</option>
                    {EXPERIENCE_LEVELS.map((level) =>
                      <option key={level.value} value={level.value}>{level.label}</option>
                    )}
                  </select>
                </label> :
                null}

              <label className="smi_language" htmlFor="smi_interview_language">
                <span id="smi_lang_label">{ENGLISH.interview_language}</span>
                <select
                  id="smi_interview_language"
                  value={interview_language}
                  onChange={(event) => pick_language(event.target.value)}
                  disabled={busy || board_locked}>
                  {INTERVIEW_LANGUAGES.map((language) =>
                    <option key={language.code} value={language.code}>{language.label}</option>
                  )}
                </select>
              </label>

            </>}
            {!board_locked && error ? <p className="smi_error">{error}</p> : null}
            <button type="button" className="smi_go" onClick={request_start} disabled={busy || board_locked || (!from_course && !file && !use_saved)}>
              {busy && !interviewing ? ENGLISH.starting_interview : ENGLISH.start_interview}
            </button>
          </article>
        </div>

        <div className="smi_curtain is_center" aria-hidden={reporting}>
          <article className={interviewing ? "smi_card is_live" : quiz_open ? "smi_card is_quiz" : "smi_card"}>
            {quiz_open ? null :
              <header className={interviewing ? "smi_live_head" : undefined}>
                <i>2</i>
                {interviewing ?
                  <h2>
                    <span>{ENGLISH.interview}</span>
                    {live_role || reattempting ?
                      <em>{reattempting ? ENGLISH.reattempt_this_answer : live_role}</em> :
                      null}
                  </h2> :
                  <div>
                    <h2>{ENGLISH.interview}</h2>
                    <p>{ENGLISH.answer_the_questions_with_text_or_voice}</p>
                  </div>}
              </header>}
            {quiz_open ?
              <>
                <Fresher_Round
                  job_id={job_id}
                  job_title={picked_job?.job_title}
                  company_name={picked_job?.company_name}
                  language={interview_language}
                  on_proceed={after_fresher_quiz}
                  on_error={set_error} />
                {error ? <p className="smi_error">{error}</p> : null}
              </> :
            interviewing ?
              <>
                <div className="smi_room">
                  <div className="smi_room_stage">
                    <Interview_Avatar
                      speaking={voicing}
                      live={listening}
                      fallback_src={robot_src}
                      name={ENGLISH.budugu}
                      role_label={ENGLISH.ai_interviewer}
                    />
                    <button
                      type="button"
                      className={speak_on ? "smi_stage_speaker is_on" : "smi_stage_speaker"}
                      aria-pressed={speak_on}
                      onClick={toggle_speaker}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 10v4h3l4 3V7L7 10H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a6.5 6.5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      {speak_on ? ENGLISH.speaker_on : ENGLISH.speaker}
                    </button>
                    <Interview_Camera
                      active={interviewing}
                      label={ENGLISH.you}
                      offline_label={ENGLISH.camera_unavailable}
                    />
                  </div>
                  <aside className="smi_room_panel">
                    <div className="smi_cue_top">
                      <div
                        className="smi_cue_meter"
                        aria-label={`${ENGLISH.question}${shown_number}${ENGLISH.label_of}${item.total_questions}`}>
                        <b>{shown_number}</b>
                        <span>/{item.total_questions}</span>
                      </div>
                      <p className="smi_cue_meta">
                        <em>{question.question_type || ENGLISH.technical}</em>
                        <i aria-hidden="true">·</i>
                        <em>{question.difficulty || ENGLISH.medium}</em>
                      </p>
                      {reattempting ?
                        <button type="button" className="smi_cue_end" onClick={leave_reattempt} disabled={busy}>
                          {ENGLISH.back_to_questions}
                        </button> :
                        <button type="button" className="smi_cue_end" onClick={finish} disabled={busy}>
                          {ENGLISH.finish_interview}
                        </button>}
                    </div>
                    <div className="smi_cue_track" aria-hidden="true">
                      <i style={{ width: `${progress_of(item, shown_number)}%` }} />
                    </div>
                    <p className="smi_room_question">{question.question}</p>
                    <p className="smi_cue_hint">
                      {reattempting ? ENGLISH.reattempt_this_answer : ENGLISH.take_your_time_and_answer_in_detail}
                    </p>
                    {last_note?.feedback ?
                      <div className="smi_eval">
                        <b>{ENGLISH.score}{last_note.score ?? 0}/10</b>
                        <p>{last_note.feedback}</p>
                      </div> :
                      null}
                  </aside>
                </div>
                {!answer_mode ?
                  <div className="smi_compose is_pick">
                    <p className="smi_pick_label">{ENGLISH.how_do_you_want_to_answer}</p>
                    <div className="smi_pick">
                      <button type="button" className="is_type" onClick={() => { set_error(""); set_answer_mode("type"); }}>
                        <i>
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 19h16M7 15.5 16.5 6a2.1 2.1 0 0 1 3 3L10 18.5 6 19l1-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                          </svg>
                        </i>
                        <b>{ENGLISH.type_answer}</b>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button type="button" className="is_voice" onClick={pick_voice}>
                        <i>
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                            <path d="M6 11a6 6 0 0 0 12 0M12 17v3M8.5 20h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </i>
                        <b>{ENGLISH.answer_with_voice}</b>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div> :
                answer_mode === "record" && (listening || !answer.trim()) ?
                  <div className={listening ? "smi_compose is_record is_listening" : "smi_compose is_record"}>
                    <div className="smi_record_stage">
                      <div className="smi_record_row">
                        <div className="smi_wave_wrap is_left">
                          <canvas ref={wave_left_ref} className="smi_wave" aria-hidden="true" />
                        </div>
                        <button
                          type="button"
                          className={listening ? "smi_mic is_on" : "smi_mic"}
                          aria-pressed={listening}
                          aria-label={listening ? ENGLISH.listening_click_to_stop : ENGLISH.click_to_start_speaking}
                          onClick={toggle_voice}>
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                            <path d="M6 11a6 6 0 0 0 12 0M12 17v3M8.5 20h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </button>
                        <div className="smi_wave_wrap is_right">
                          <canvas ref={wave_right_ref} className="smi_wave" aria-hidden="true" />
                        </div>
                      </div>
                      <p className="smi_record_title">{listening ? ENGLISH.listening_now : ENGLISH.click_to_start_speaking}</p>
                      {listening ?
                        <p className="smi_record_sub">{ENGLISH.click_the_mic_to_stop}</p> :
                        <button type="button" className="smi_method" onClick={change_answer_method}>
                          {ENGLISH.change_answer_method}
                        </button>}
                    </div>
                  </div> :
                  <div className="smi_compose">
                    <div className="smi_box">
                      <textarea
                        value={answer}
                        maxLength={3000}
                        placeholder={ENGLISH.type_your_answer_here}
                        onChange={(event) => edit_answer(event.target.value)} />
                      <small>{answer.length}/3000</small>
                    </div>
                    <div className="smi_answer_row">
                      <div className="smi_answer_tools">
                        {answer_mode === "record" ?
                          <button type="button" className="smi_method" onClick={record_again}>
                            {ENGLISH.record_again}
                          </button> :
                          <button type="button" className="smi_method" onClick={change_answer_method}>
                            {ENGLISH.change_answer_method}
                          </button>}
                      </div>
                      <button type="button" className="smi_submit" onClick={submit_answer} disabled={busy || !answer.trim()}>
                        {busy ? "Submitting..." : ENGLISH.submit_answer}
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>}
                {error ? <p className="smi_error">{error}</p> : null}
              </> :
              reattempt_number > 0 ?
              <div className="smi_idle">
                {error ? <p className="smi_error">{error}</p> : <p>{ENGLISH.loading_interviews}</p>}
                <button type="button" className="smi_hub_link" onClick={leave_reattempt}>
                  {ENGLISH.back_to_questions}
                </button>
              </div> :
              <div className="smi_idle">
                <img className="smi_mascot" src={robot_src} alt="" />
                <p>{role_source === "job" ? ENGLISH.upload_your_resume_to_practise_for_this_job : ENGLISH.upload_a_resume_to_start_the_interview}</p>
              </div>}
          </article>
        </div>

        <div className="smi_curtain is_right" aria-hidden={board_locked}>
          <article className="smi_card">
            <header>
              <i>3</i>
              <div>
                <h2>{ENGLISH.report}</h2>
                <p>{ENGLISH.view_your_performance_and_recommendations}</p>
              </div>
            </header>
            {reporting ?
              <div className="smi_report">
                <p className="smi_score">
                  <span className="smi_ribbon" aria-hidden="true">
                    <img src={robot_src} alt="" />
                  </span>
                  <b>{performance.overall_score ?? 0}</b>
                  <span>{ENGLISH.overall_score}<small>{ENGLISH.out_of_10}</small></span>
                </p>
                <Certificate_Download
                  mock_interview_id={item.mock_interview_id}
                  ready={item.certificate_ready}
                  locked={item.certificate_locked}
                  file_stem={item.analysis?.target_role || item.session?.target_role}
                  class_name="smi_report_cert" />
                <section>
                  <h3>{ENGLISH.topic_wise_performance}</h3>
                  <ul className="smi_topics">
                    {(performance.topic_performance || []).map((topic) =>
                      <li key={topic.topic}>
                        <div>
                          <strong>{topic.topic}</strong>
                          <span>{topic.questions_asked}{ENGLISH.asked}</span>
                        </div>
                        <em>{topic.average_score}/10</em>
                        <i><b style={{ width: `${Math.min(100, Math.round((Number(topic.average_score) || 0) * 10))}%` }} /></i>
                      </li>
                    )}
                  </ul>
                </section>
                <div className="smi_split">
                  <section className="is_good">
                    <h3>{ENGLISH.strengths}</h3>
                    <ul>
                      {(performance.strengths || []).length ?
                        performance.strengths.map((line) => <li key={line}>{line}</li>) :
                        <li>{ENGLISH.no_strengths_captured_yet}</li>}
                    </ul>
                  </section>
                  <section className="is_gap">
                    <h3>{ENGLISH.gaps}</h3>
                    <ul>
                      {(performance.gaps || []).length ?
                        performance.gaps.map((line) => <li key={line}>{line}</li>) :
                        <li>{ENGLISH.no_gaps_captured_yet}</li>}
                    </ul>
                  </section>
                </div>
                <section className="smi_next">
                  <h3>{ENGLISH.personalized_recommendations}</h3>
                  <ol>
                    {(performance.recommendations || []).map((line) => <li key={line}>{line}</li>)}
                  </ol>
                </section>
                <section>
                  <h3>{ENGLISH.sentiment_analysis}</h3>
                  <Sentiment_Panel analysis={performance.llm_analysis} />
                </section>
                <section className="smi_courses">
                  <h3>{ENGLISH.recommended_courses}</h3>
                  {(item.course_recommendations || []).length ?
                    <ul>
                      {item.course_recommendations.map((course) =>
                        <li key={course.course_id}>
                          {course.thumbnail_url ?
                            <img src={course.thumbnail_url} alt="" /> :
                            <span className="smi_course_mark" aria-hidden="true">{(course.course_name || "?").slice(0, 1)}</span>}
                          <div>
                            <strong>{course.course_name}</strong>
                            <small>{course.reason}</small>
                            {course.level || course.duration_hours != null ?
                              <em>
                                {[course.level, course.duration_hours != null ? ENGLISH.hrs(course.duration_hours) : ""].filter(Boolean).join(" · ")}
                              </em> :
                              null}
                          </div>
                          <a
                            href={`#/dashboard/programs?course=${course.course_id}`}
                            onClick={() => {
                              window.setTimeout(() => window.dispatchEvent(new Event("lms-navigate")), 0);
                            }}>{ENGLISH.view_course}</a>
                        </li>
                      )}
                    </ul> :
                    <p>{ENGLISH.no_matching_course_was_found_in_the_catalog}</p>}
                </section>
              </div> :
              <>
                <p className="smi_wait">{ENGLISH.complete_the_interview_to_see_your_detailed_report}</p>
                <ul className="smi_includes">
                  <li><b>{ENGLISH.overall_score}</b><span>{ENGLISH.out_of_10_2}</span></li>
                  <li><b>{ENGLISH.topic_wise_performance}</b><span>{ENGLISH.how_each_area_scored}</span></li>
                  <li><b>{ENGLISH.strengths_and_gaps}</b><span>{ENGLISH.what_landed_and_what_did_not}</span></li>
                  <li><b>{ENGLISH.recommendations}</b><span>{ENGLISH.what_to_practice_next}</span></li>
                  <li><b>{ENGLISH.sentiment_analysis}</b><span>{ENGLISH.tone_communication_and_vocabulary}</span></li>
                  <li><b>{ENGLISH.courses}</b><span>{ENGLISH.existing_catalog_courses_for_your_gaps}</span></li>
                </ul>
              </>}
          </article>
        </div>
      </div>
      <Profile_Gate
        open={gate_open}
        busy={busy}
        on_close={() => { if (!busy) set_gate_open(false); }}
        on_proceed={begin} />
    </section>
  );
}
