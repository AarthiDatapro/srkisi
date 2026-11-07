import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { stream_ai_chat_api } from "../api.js";
import {
  get_ollama_api_key_status,
  update_ollama_api_key,
  update_ollama_fast_enabled
} from "../../student_profile/api.js";
import { COPY, OLLAMA_API_KEY_MANUAL_URL } from "../constants.js";
import { Buddy_Avatar } from "./buddy_avatar.jsx";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";
import { live_items } from "../../constants/live_text.js";


function Close_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>);

}

function Send_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h12M13 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function Speaker_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10v4h3l4 3V7L7 10H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path className="lrn_chat_speak_wave" d="M16 9.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path className="lrn_chat_speak_wave lrn_chat_speak_wave_far" d="M18.5 7a6.5 6.5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Mic_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 11.5a5 5 0 0 0 10 0M12 16.5V20.5M9 20.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>);

}

const FEMALE_VOICE_NAMES = live_items([() => ("heera"), () => ("neerja"), () => ("swara"), () => ("priya"), () => (ENGLISH.google_uk_english_female), () => ("aria"), () => ("jenny"), () => ("sara"), () => ("zira"), () => ("hazel"), () => ("samantha"), () => ("victoria"), () => ("karen"), () => ("moira"), () => ("fiona"), () => ("tessa"), () => ("veena"), () => ("female")]);

function pick_female_voice(synth) {
  const voices = synth.getVoices();
  const english = voices.filter((voice) => {
    const name = voice.name.toLowerCase();
    const lang = (voice.lang || "").toLowerCase();
    if (!lang.startsWith("en")) return false;
    if (/\bmale\b/.test(name) && !name.includes("female")) return false;
    return FEMALE_VOICE_NAMES.some((part) => name.includes(part));
  });
  for (const part of FEMALE_VOICE_NAMES) {
    const match = english.find((voice) => voice.name.toLowerCase().includes(part));
    if (match) return match;
  }
  return null;
}

function speech_engine() {
  if (typeof window === "undefined") return null;
  const Engine = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Engine ? new Engine() : null;
}

function parse_inline_markdown(text) {
  if (!text) return "";
  const parts = [];
  let remaining = String(text);
  let key = 0;
  while (remaining) {
    const bold_match = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)/s);
    const code_match = remaining.match(/^(.*?)\`(.*?)\`(.*)/s);
    if (bold_match && (!code_match || bold_match[1].length <= code_match[1].length)) {
      if (bold_match[1]) parts.push(bold_match[1]);
      parts.push(<strong key={key++}>{bold_match[2]}</strong>);
      remaining = bold_match[3];
    } else if (code_match) {
      if (code_match[1]) parts.push(code_match[1]);
      parts.push(
        <code key={key++} className="lrn_chat_code">
          {code_match[2]}
        </code>
      );
      remaining = code_match[3];
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts;
}

function Formatted_Text({ content }) {
  if (!content) return null;
  const lines = String(content).
  split("\n").
  map((line) => line.trim()).
  filter(Boolean);
  const elements = [];
  let current_list = [];

  function flush_list(key_index) {
    if (!current_list.length) return;
    elements.push(
      <ul key={`ul-${key_index}`} className="lrn_chat_ul">
        {current_list.map((item, index) =>
        <li key={index}>{parse_inline_markdown(item)}</li>
        )}
      </ul>
    );
    current_list = [];
  }

  lines.forEach((line, index) => {
    const bullet = line.match(/^[-*•]\s+(.*)/) || line.match(/^\d+\.\s+(.*)/);
    if (bullet) {
      current_list.push(bullet[1]);
      return;
    }
    flush_list(index);
    elements.push(
      <p key={`p-${index}`} className="lrn_chat_para">
        {parse_inline_markdown(line)}
      </p>
    );
  });
  flush_list(lines.length);
  return <div className="lrn_chat_formatted">{elements}</div>;
}

function welcome_text(student_name) {
  const name = String(student_name || "").trim();
  return name ?
  ENGLISH.hi_ask_anything_about_this_lesson_i_ll(name) :
  ENGLISH.ask_anything_about_this_lesson_i_ll_keep;
}

export function Help_Chat({
  open,
  topic,
  course_name,
  lesson_title,
  lesson_content,
  student_name,
  on_close
}) {
  const [text, set_text] = useState("");
  const [messages, set_messages] = useState([]);
  const [listening, set_listening] = useState(false);
  const [speaking_id, set_speaking_id] = useState("");
  const [loading, set_loading] = useState(false);
  const [has_api_key, set_has_api_key] = useState(false);
  const [fast_on, set_fast_on] = useState(false);
  const [show_key_form, set_show_key_form] = useState(false);
  const [key_draft, set_key_draft] = useState("");
  const [key_saving, set_key_saving] = useState(false);
  const [show_key, set_show_key] = useState(false);
  const list_ref = useRef(null);
  const input_ref = useRef(null);
  const recognition_ref = useRef(null);
  const abort_ref = useRef(null);
  const can_speak = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!open) return undefined;
    set_messages([{ id: "welcome", from: "bot", text: welcome_text(student_name) }]);
    set_show_key_form(false);
    set_key_draft("");
    set_show_key(false);
    input_ref.current?.focus();

    let alive = true;
    (async () => {
      try {
        const data = await get_ollama_api_key_status();
        if (!alive) return;
        const has_key = Boolean(data?.has_ollama_api_key);
        const enabled = Boolean(data?.ollama_fast_enabled);
        set_has_api_key(has_key);
        set_fast_on(has_key && enabled);
      } catch {
        if (!alive) return;
        set_has_api_key(false);
        set_fast_on(false);
      }
    })();

    function on_key(event) {
      if (event.key === ENGLISH.escape) on_close?.();
    }
    window.addEventListener("keydown", on_key);
    return () => {
      alive = false;
      window.speechSynthesis?.cancel();
      window.removeEventListener("keydown", on_key);
    };
  }, [open, student_name, on_close]);

  useEffect(() => {
    const node = list_ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open, show_key_form]);

  useEffect(() => {
    if (open) return undefined;
    recognition_ref.current?.stop?.();
    abort_ref.current?.abort?.();
    set_listening(false);
    set_loading(false);
    return undefined;
  }, [open]);

  useEffect(() => () => {
    recognition_ref.current?.stop?.();
    abort_ref.current?.abort?.();
  }, []);

  function stop_mic() {
    recognition_ref.current?.stop?.();
    recognition_ref.current = null;
    set_listening(false);
  }

  function start_mic() {
    const recognition = speech_engine();
    if (!recognition) {
      set_messages((current) => [...current, { id: `b-${Date.now()}`, from: "bot", text: COPY.chatMicOff }]);
      return;
    }
    recognition.lang = document.documentElement.lang || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results).
      map((result) => result[0]?.transcript || "").
      join(" ").
      trim();
      if (spoken) set_text(spoken);
    };
    recognition.onerror = (event) => {
      set_listening(false);
      recognition_ref.current = null;
      if (event.error === "aborted" || event.error === "no_speech") return;
      set_messages((current) => [...current, { id: `b-${Date.now()}`, from: "bot", text: COPY.chatMicFail }]);
    };
    recognition.onend = () => {
      set_listening(false);
      recognition_ref.current = null;
      input_ref.current?.focus();
    };
    recognition_ref.current = recognition;
    try {
      recognition.start();
      set_listening(true);
    } catch {
      set_listening(false);
      recognition_ref.current = null;
    }
  }

  function toggle_mic() {
    if (listening) {
      stop_mic();
      return;
    }
    start_mic();
  }

  async function set_fast_preference(enabled) {
    try {
      const data = await update_ollama_fast_enabled(enabled);
      set_has_api_key(Boolean(data?.has_ollama_api_key));
      set_fast_on(Boolean(data?.ollama_fast_enabled));
      set_show_key_form(false);
    } catch (err) {
      set_messages((current) => [
        ...current,
        { id: `b-${Date.now()}`, from: "bot", text: err.message || COPY.fastKeyMissing, error: true }
      ]);
    }
  }

  function enable_fast_responses() {
    if (has_api_key) {
      set_fast_preference(true);
      return;
    }
    set_show_key_form(true);
  }

  function disable_fast_responses() {
    set_fast_preference(false);
  }

  async function save_fast_key(event) {
    event?.preventDefault?.();
    const value = String(key_draft || "").trim();
    if (!value || key_saving) return;
    set_key_saving(true);
    try {
      await update_ollama_api_key(value);
      const data = await update_ollama_fast_enabled(true);
      set_has_api_key(Boolean(data?.has_ollama_api_key));
      set_fast_on(Boolean(data?.ollama_fast_enabled));
      set_show_key_form(false);
      set_key_draft("");
      set_show_key(false);
    } catch (err) {
      set_messages((current) => [
        ...current,
        { id: `b-${Date.now()}`, from: "bot", text: err.message || COPY.fastKeyMissing, error: true }
      ]);
    } finally {
      set_key_saving(false);
    }
  }

  async function send(event, spoken) {
    event?.preventDefault?.();
    const value = String(spoken ?? text).trim();
    if (!value || loading) return;
    stop_mic();
    const user_id = `u-${Date.now()}`;
    const bot_id = `b-${Date.now() + 1}`;
    const history = messages.
    filter((item) => item.id !== "welcome").
    map((item) => ({ sender: item.from === "user" ? "user" : "mentor", text: item.text }));
    set_messages((current) => [
    ...current,
    { id: user_id, from: "user", text: value },
    { id: bot_id, from: "bot", text: "", streaming: true }]
    );
    set_text("");
    set_loading(true);
    abort_ref.current = new AbortController();
    try {
      await stream_ai_chat_api(
        {
          question: value,
          course_name,
          topic: topic || lesson_title,
          lesson_content,
          conversation_history: history,
          use_fast_responses: fast_on
        },
        (token) => {
          set_messages((current) =>
          current.map((item) => item.id === bot_id ? { ...item, text: `${item.text || ""}${token}` } : item)
          );
        },
        abort_ref.current.signal
      );
      set_messages((current) => current.map((item) => item.id === bot_id ? { ...item, streaming: false } : item));
    } catch (err) {
      if (err.name === "AbortError") return;
      const error_text = err.message || ENGLISH.failed_to_communicate_with_ai_mentor;
      set_messages((current) =>
      current.map((item) =>
      item.id === bot_id ?
      { ...item, text: item.text || error_text, streaming: false, error: true } :
      item
      )
      );
    } finally {
      set_loading(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const topic_label = topic || lesson_title || COPY.helpCopy;
  const suggestions = [ENGLISH.explain_this_simply, ENGLISH.give_me_a_short_summary, ENGLISH.how_do_i_practice_this];
  function speak_reply(item) {
    const synth = window.speechSynthesis;
    if (!synth || !item?.text) return;
    if (speaking_id === item.id) {
      synth.cancel();
      set_speaking_id("");
      return;
    }
    synth.cancel();
    const plain = String(item.text).replace(/\*\*/g, "").replace(/`/g, "");
    const line = new SpeechSynthesisUtterance(plain);
    const stop_line = () => set_speaking_id((current) => current === item.id ? "" : current);
    line.onend = stop_line;
    line.onerror = stop_line;
    line.pitch = 1.18;
    line.rate = 0.92;
    const start_line = () => {
      const voice = pick_female_voice(synth);
      if (voice) {
        line.voice = voice;
        line.lang = voice.lang;
      } else {
        line.lang = "en-GB";
      }
      synth.speak(line);
    };
    set_speaking_id(item.id);
    if (synth.getVoices().length) {
      start_line();
      return;
    }
    const on_voices = () => {
      synth.removeEventListener("voiceschanged", on_voices);
      start_line();
    };
    synth.addEventListener("voiceschanged", on_voices);
    synth.getVoices();
  }

  const show_prompts = messages.length === 1 && !loading;

  return createPortal(
    <div className="lrn_chat">
      <button type="button" className="lrn_chat_scrim" aria-label={ENGLISH.close_chat} onClick={on_close} />
      <section className="lrn_chat_panel" role="dialog" aria-modal="true" aria-label={ENGLISH.ai_mentor}>
        <header className="lrn_chat_head">
          <span className="lrn_chat_avatar" aria-hidden="true">
            <Buddy_Avatar className={speaking_id || listening ? "lrn_buddy is_talking" : "lrn_buddy"} />
          </span>
          <div className="lrn_chat_titles">
            <h3>{ENGLISH.ai_mentor}</h3>
            <p>
              <i className="lrn_chat_live" />
              {topic_label}
            </p>
          </div>
          <div className="lrn_chat_head_actions">
            {fast_on ?
            <button
              type="button"
              className="lrn_chat_boost_off"
              aria-label={COPY.fastResponsesDisable}
              title={COPY.fastResponsesDisable}
              onClick={disable_fast_responses}>
              
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 4v8M7.2 7.2a6.5 6.5 0 1 0 9.6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button> :
            null}
            <button type="button" className="lrn_chat_close" onClick={on_close} aria-label={ENGLISH.close_chat}>
              <Close_Icon />
            </button>
          </div>
        </header>

        {!fast_on || show_key_form ?
        <div className={`lrn_chat_boost${show_key_form ? " is_open" : ""}`}>
            {fast_on ? null :
            <div className="lrn_chat_boost_row">
                <button type="button" className="lrn_chat_boost_main" onClick={enable_fast_responses}>
                  <span className="lrn_chat_boost_mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M13 3 6.5 13.5H12l-1 7.5L18.5 10H13L13 3Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="lrn_chat_boost_copy">
                    <strong>{COPY.fastResponses}</strong>
                    <small>{COPY.fastResponsesHint}</small>
                  </span>
                  <span className="lrn_chat_boost_go" aria-hidden="true">{ENGLISH.enable}</span>
                </button>
                {OLLAMA_API_KEY_MANUAL_URL ?
                <a
                  className="lrn_chat_boost_manual"
                  href={OLLAMA_API_KEY_MANUAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={COPY.fastKeyManual}
                  title={COPY.fastKeyManual}>
                  
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M9.6 9.4a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1.1.8-1.1 1.6V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <circle cx="12" cy="16.6" r="1" fill="currentColor" />
                    </svg>
                  </a> :
                null}
              </div>
            }
            {show_key_form ?
            <form className="lrn_chat_key" onSubmit={save_fast_key}>
                <p>{COPY.fastKeyTitle}</p>
                <small>{COPY.fastKeyHint}</small>
                {OLLAMA_API_KEY_MANUAL_URL ?
                <a
                  className="lrn_chat_key_manual"
                  href={OLLAMA_API_KEY_MANUAL_URL}
                  target="_blank"
                  rel="noopener noreferrer">
                  
                    {COPY.fastKeyManual}
                  </a> :
                null}
                <div className="lrn_chat_key_row">
                  <div className="lrn_chat_key_input">
                    <input
                    type={show_key ? "text" : "password"}
                    autoComplete="off"
                    value={key_draft}
                    onChange={(event) => set_key_draft(event.target.value)}
                    placeholder={COPY.fastKeyPlaceholder}
                    aria-label={COPY.fastKeyPlaceholder}
                    disabled={key_saving} />
                  
                    <button
                    type="button"
                    className="lrn_chat_key_eye"
                    aria-label={show_key ? ENGLISH.hide_api_key : ENGLISH.show_api_key}
                    onClick={() => set_show_key((open) => !open)}>
                    
                      {show_key ?
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 4l16 16M9.5 9.7A2.6 2.6 0 0 0 14.3 14.5M7.2 7.4C4.7 8.8 3 11 2.5 12c0 0 3.5 6.5 9.5 6.5 1.6 0 3-.3 4.2-.8M11.1 5.6C11.4 5.5 11.7 5.5 12 5.5c6 0 9.5 6.5 9.5 6.5-.2.4-.8 1.4-1.8 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg> :

                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" />
                          <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
                        </svg>
                    }
                    </button>
                  </div>
                  <button type="submit" disabled={key_saving || !key_draft.trim()}>
                    {key_saving ? "…" : COPY.fastKeySave}
                  </button>
                </div>
                <button
                type="button"
                className="lrn_chat_key_cancel"
                onClick={() => {
                  set_show_key_form(false);
                  set_key_draft("");
                  set_show_key(false);
                }}>
                
                  {COPY.fastKeyCancel}
                </button>
              </form> :
            null}
          </div> :
        null}

        <div className="lrn_chat_list" ref={list_ref}>
          {messages.map((item) =>
          <div
            key={item.id}
            className={`lrn_chat_row lrn_chat_row_${item.from}${item.error ? " is_error" : ""}`}>
              {item.from === "bot" ?
                <Buddy_Avatar className={speaking_id === item.id ? "lrn_buddy is_talking" : "lrn_buddy"} /> :
                null}
              <div className={`lrn_chat_bubble lrn_chat_bubble_${item.from}${item.error ? " is_error" : ""}`}>
                {item.from === "bot" ?
              item.text ?
              <Formatted_Text content={item.text} /> :

              <span className="lrn_chat_typing" aria-live="polite">
                      <b />
                      <b />
                      <b />
                    </span> :


              item.text
              }
                {item.from === "bot" && item.text && !item.streaming ?
              <button
                type="button"
                className={speaking_id === item.id ? "lrn_chat_speak is_on" : "lrn_chat_speak"}
                aria-label={speaking_id === item.id ? ENGLISH.stop_reading : ENGLISH.read_reply}
                onClick={() => speak_reply(item)}>
                <Speaker_Icon />
              </button> :
              null}
              </div>
            </div>
          )}
          {show_prompts ?
          <div className="lrn_chat_prompts">
              {suggestions.map((prompt) =>
            <button key={prompt} type="button" onClick={(event) => send(event, prompt)}>
                  {prompt}
                </button>
            )}
            </div> :
          null}
        </div>
        <form className="lrn_chat_form" onSubmit={send}>
          <input
            ref={input_ref}
            value={text}
            onChange={(event) => set_text(event.target.value)}
            placeholder={loading ? COPY.chatThinking : listening ? COPY.chatListening : COPY.chatPlaceholder}
            aria-label={COPY.ask}
            disabled={loading} />
          
          <button
            type="button"
            className={listening ? "lrn_chat_mic is_on" : "lrn_chat_mic"}
            onClick={toggle_mic}
            disabled={!can_speak || loading}
            aria-pressed={listening}
            aria-label={can_speak ? listening ? COPY.chatMicStop : COPY.chatMic : COPY.chatMicOff}
            title={can_speak ? listening ? COPY.chatMicStop : COPY.chatMic : COPY.chatMicOff}>
            
            <Mic_Icon />
          </button>
          <button type="submit" className="lrn_chat_send" aria-label={ENGLISH.send} disabled={!text.trim() || loading}>
            <Send_Icon />
          </button>
        </form>
      </section>
    </div>,
    document.body
  );
}
