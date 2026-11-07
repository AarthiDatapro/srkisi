import { Children, useEffect, useMemo, useRef, useState } from "react";
import { get_public_showcase } from "../api.js";
import { photo_for } from "../showcase_photos.js";
import logo_src from "../../assets/hackathon_showcase/logo.jpg";
import title_film_src from "../../assets/hackathon_showcase/motion/ideas_into_impact.mp4";
import orbit_film_src from "../../assets/hackathon_showcase/motion/innovation_orbit.mp4";
import music_src from "../../assets/hackathon_showcase/audio/soft_inspiration.mp3";
import "../theme/hackathon_showcase.css";
import { HACKATHON_SHOWCASE_ENGLISH as ENGLISH } from "../../constants/english/hackathon_showcase_constants_english.js";
import { live_items } from "../../constants/live_text.js";


const TONES = ["var(--w1)", "var(--w2)", "var(--w3)", "var(--w4)"];
const MEDALS = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };
const SECTIONS = [
  { id: "wbs_winners", get label() { return ENGLISH.winners; } },
  { id: "wbs_projects", get label() { return ENGLISH.projects; } },
  { id: "wbs_people", get label() { return ENGLISH.participants; } }
];
const WORDS = live_items([() => ENGLISH.zero, () => ENGLISH.one, () => ENGLISH.two, () => ENGLISH.three, () => ENGLISH.four, () => ENGLISH.five, () => ENGLISH.six, () => ENGLISH.seven, () => ENGLISH.eight, () => ENGLISH.nine, () => ENGLISH.ten, () => ENGLISH.eleven, () => ENGLISH.twelve]);
const TAB_LIMIT = 8;
const PIP_LIMIT = 20;
const PROJECT_PAGE = 60;
const PEOPLE_PAGE = 60;
const SLIDE_MS = 5200;
const THEME_KEY = "wbs_theme";

function motion_ok() {
  return !window.matchMedia(ENGLISH.prefers_reduced_motion_reduce).matches;
}

function fine_pointer() {
  return window.matchMedia(ENGLISH.pointer_fine).matches;
}

function ord(number) {
  const teen = number % 100;
  return `${number}${["th", "st", "nd", "rd"][teen > 10 && teen < 14 ? 0 : number % 10 < 4 ? number % 10 : 0]}`;
}

function band(number) {
  return number < 10 ? String(number) : `${Math.floor(number / 10) * 10}+`;
}

function count_word(number) {
  return WORDS[number] || String(number);
}

function safe_url(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function link_label(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("drive.google")) return ENGLISH.drive_folder;
    return url.hostname.replace("www.", "") === "github.com" ? url.pathname.split("/").filter(Boolean).slice(0, 2).join("/") : url.hostname;
  } catch {
    return value;
  }
}

function Art({ seed, tone, size = 72 }) {
  const shapes = [];
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  for (let index = 0; index < 9; index += 1) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const kind = (hash >>> 8) % 4;
    const x = (index % 3) * 32;
    const y = Math.floor(index / 3) * 32;
    const fill = (hash >>> 4) & 1 ? tone : "var(--ink)";
    if (kind === 0) shapes.push(<circle key={index} cx={x + 16} cy={y + 16} r="14" fill={fill} />);
    else if (kind === 1) shapes.push(<path key={index} d={`M${x} ${y + 32}A32 32 0 0 1 ${x + 32} ${y}V${y + 32}Z`} fill={fill} />);
    else if (kind === 2) shapes.push(<rect key={index} x={x + 4} y={y + 4} width="24" height="24" rx="3" fill={fill} />);
    else shapes.push(<circle key={index} cx={x + 16} cy={y + 16} r="6" fill={fill} />);
  }
  return <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">{shapes}</svg>;
}

function Avatar({ person, size = 48 }) {
  const src = photo_for(person?.itda_id);
  const name = person?.name || "?";
  if (src) return <img className="wbs_av" src={src} alt={name} title={name} width={size} height={size} loading="lazy" />;
  return <span className="wbs_av" style={{ width: size, height: size }} title={name}>{name[0]}</span>;
}

function Score_Bar({ value, tone }) {
  const [width, set_width] = useState(motion_ok() ? 0 : value);
  useEffect(() => {
    if (!motion_ok()) {
      set_width(value);
      return undefined;
    }
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => set_width(value));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [value]);
  return <span className="wbs_bar" style={tone ? { "--c": tone } : undefined}><i style={{ width: `${width}%` }} /></span>;
}

function use_tilt() {
  return useMemo(() => {
    if (!motion_ok() || !fine_pointer()) return { className: "", onPointerMove: undefined, onPointerLeave: undefined };
    return {
      className: " wbs_tilt",
      onPointerMove(event) {
        const box = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        event.currentTarget.style.transform = ENGLISH.perspective_900px_rotatex_deg_rotatey_deg_scale_1((0.5 - y) * 8, (x - 0.5) * 10);
      },
      onPointerLeave(event) {
        event.currentTarget.style.transform = "";
      }
    };
  }, []);
}

function Rail({ label, focus_key, children }) {
  const track_ref = useRef(null);
  const [edges, set_edges] = useState({ left: false, right: false });
  const size = Children.count(children);

  useEffect(() => {
    const track = track_ref.current;
    if (!track) return undefined;
    const measure = () => {
      set_edges({
        left: track.scrollLeft > 4,
        right: track.scrollLeft + track.clientWidth < track.scrollWidth - 4
      });
    };
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    const watcher = "ResizeObserver" in window ? new ResizeObserver(measure) : null;
    watcher?.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      track.removeEventListener("scroll", measure);
      watcher?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [size]);

  useEffect(() => {
    const track = track_ref.current;
    const current = track?.querySelector(ENGLISH.aria_selected_true_aria_pressed_true);
    if (!track || !current) return;
    const left = current.offsetLeft - track.clientWidth / 2 + current.offsetWidth / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: motion_ok() ? "smooth" : "auto" });
  }, [focus_key]);

  function nudge(direction) {
    const track = track_ref.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.7, behavior: motion_ok() ? "smooth" : "auto" });
  }

  return (
    <div className={`wbs_rail${edges.left ? " has_left" : ""}${edges.right ? " has_right" : ""}`}>
      <button type="button" className="wbs_rail_btn is_left" aria-label={ENGLISH.previous(label)} tabIndex={edges.left ? 0 : -1} onClick={() => nudge(-1)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
      </button>
      <div ref={track_ref} className="wbs_rail_track" role="tablist" aria-label={label}>{children}</div>
      <button type="button" className="wbs_rail_btn is_right" aria-label={ENGLISH.next(label)} tabIndex={edges.right ? 0 : -1} onClick={() => nudge(1)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}

function boot_video(video) {
  if (!video) return () => {};
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  const start = () => {
    const attempt = video.play();
    if (attempt?.catch) attempt.catch(() => {});
  };
  video.addEventListener("loadeddata", start);
  video.addEventListener("canplay", start);
  window.addEventListener("pointerdown", start, { once: true });
  start();
  return () => {
    video.removeEventListener("loadeddata", start);
    video.removeEventListener("canplay", start);
    window.removeEventListener("pointerdown", start);
  };
}

function Particles({ night }) {
  const canvas_ref = useRef(null);
  const night_ref = useRef(night);
  night_ref.current = night;
  useEffect(() => {
    const canvas = canvas_ref.current;
    if (!canvas || !motion_ok()) return undefined;
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frame = 0;
    const mouse = { x: -999, y: -999 };
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    const count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.6
    }));
    const move = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      const color = night_ref.current ? "140,170,255" : "80,120,220";
      for (let index = 0; index < dots.length; index += 1) {
        const dot = dots[index];
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > height) dot.vy *= -1;
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 120 && distance > 0) {
          dot.vx += (dx / distance) * 0.15;
          dot.vy += (dy / distance) * 0.15;
        }
        dot.vx *= 0.995;
        dot.vy *= 0.995;
        context.beginPath();
        context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        context.fillStyle = ENGLISH.rgba_0_55(color);
        context.fill();
        for (let other_index = index + 1; other_index < dots.length; other_index += 1) {
          const other = dots[other_index];
          const gap = Math.hypot(dot.x - other.x, dot.y - other.y);
          if (gap < 110) {
            context.beginPath();
            context.moveTo(dot.x, dot.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = ENGLISH.rgba(color, (1 - gap / 110) * 0.22);
            context.lineWidth = 1;
            context.stroke();
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
  }, []);
  return <canvas ref={canvas_ref} className="wbs_particles" aria-hidden="true" />;
}

function Confetti({ target_ref, ready }) {
  const canvas_ref = useRef(null);
  useEffect(() => {
    const canvas = canvas_ref.current;
    const target = target_ref.current;
    if (!ready || !canvas || !target || !motion_ok() || !("IntersectionObserver" in window)) return undefined;
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frame = 0;
    let timer = 0;
    let pieces = [];
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    const colors = ["#E3B01B", "#9AA3B8", "#C77D45", "#2E9BF2", "#8A63F2", "#19B394", "#FF6B4A"];
    const animate = () => {
      context.clearRect(0, 0, width, height);
      let alive = false;
      for (const piece of pieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.06;
        piece.rot += piece.vr;
        if (piece.y < height + 30) alive = true;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate((piece.rot * Math.PI) / 180);
        context.fillStyle = piece.color;
        context.fillRect(-piece.r / 2, -piece.r / 2, piece.r, piece.r * 0.6);
        context.restore();
      }
      if (alive) frame = requestAnimationFrame(animate);
    };
    const spawn = () => {
      pieces = Array.from({ length: 90 }, (_, index) => ({
        x: Math.random() * width,
        y: -20 - Math.random() * height * 0.3,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        r: Math.random() * 6 + 3,
        color: colors[index % colors.length],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 8
      }));
      animate();
    };
    const watcher = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        watcher.disconnect();
        timer = window.setTimeout(spawn, 400);
      }
    }, { threshold: 0.35 });
    watcher.observe(target);
    window.addEventListener("resize", resize);
    return () => {
      watcher.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [ready, target_ref]);
  return <canvas ref={canvas_ref} className="wbs_confetti" aria-hidden="true" />;
}

export function Hackathon_Showcase({ token }) {
  const [data, set_data] = useState(null);
  const [error, set_error] = useState("");
  const [intro, set_intro] = useState(() => (motion_ok() ? "show" : "gone"));
  const [night, set_night] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) === "night";
    } catch {
      return false;
    }
  });
  const [playing, set_playing] = useState(false);
  const [section, set_section] = useState("");
  const [winner_id, set_winner_id] = useState(0);
  const [query, set_query] = useState("");
  const [sort, set_sort] = useState("s");
  const [filter_id, set_filter_id] = useState(0);
  const [person_query, set_person_query] = useState("");
  const [person_sort, set_person_sort] = useState("b");
  const [project_limit, set_project_limit] = useState(PROJECT_PAGE);
  const [people_limit, set_people_limit] = useState(PEOPLE_PAGE);
  const [dialog, set_dialog] = useState(null);
  const root_ref = useRef(null);
  const glow_ref = useRef(null);
  const audio_ref = useRef(null);
  const title_ref = useRef(null);
  const orbit_ref = useRef(null);
  const dialog_ref = useRef(null);
  const winners_ref = useRef(null);
  const slide_pause = useRef({ hover: false, until: 0, visible: true });
  const tilt = use_tilt();

  useEffect(() => {
    let alive = true;
    get_public_showcase(token).then((payload) => {
      if (alive) set_data(payload);
    }).catch((err) => {
      if (alive) set_error(err.message || ENGLISH.unable_to_load_this_showcase);
    });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    const previous_title = document.title;
    const html = document.documentElement;
    const previous_scroll = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    return () => {
      document.title = previous_title;
      html.style.scrollBehavior = previous_scroll;
    };
  }, []);

  useEffect(() => {
    if (data?.program_name) document.title = ENGLISH.weekend_builds_3(data.program_name);
  }, [data]);

  useEffect(() => {
    if (intro !== "show") return undefined;
    const hide = () => set_intro("hide");
    const timer = window.setTimeout(hide, 2800);
    window.addEventListener("pointerdown", hide, { once: true });
    window.addEventListener("keydown", hide, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", hide);
    };
  }, [intro]);

  useEffect(() => {
    if (intro !== "hide") return undefined;
    const timer = window.setTimeout(() => set_intro("gone"), 1200);
    return () => window.clearTimeout(timer);
  }, [intro]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, night ? "night" : "day");
    } catch {
      return;
    }
  }, [night]);

  useEffect(() => {
    const glow = glow_ref.current;
    if (!glow || !fine_pointer() || !motion_ok()) return undefined;
    const move = (event) => {
      glow.style.transform = ENGLISH.translate_px_px(event.clientX, event.clientY);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => {
    const audio = audio_ref.current;
    if (!audio) return undefined;
    audio.volume = 0.28;
    let started = false;
    const try_play = () => {
      if (started) return;
      const attempt = audio.play();
      if (attempt?.then) attempt.then(() => {
        started = true;
        set_playing(true);
      }).catch(() => {});
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((name) => window.addEventListener(name, try_play, { once: true, passive: true }));
    return () => {
      events.forEach((name) => window.removeEventListener(name, try_play));
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const stop_title = boot_video(title_ref.current);
    const stop_orbit = boot_video(orbit_ref.current);
    return () => {
      stop_title();
      stop_orbit();
    };
  }, [data]);

  const view = useMemo(() => {
    if (!data) return null;
    const hackathons = data.hackathons || [];
    const people = new Map((data.people || []).map((person) => [person.key, person]));
    const meta = new Map(hackathons.map((item, index) => [item.hackathon_id, { ...item, tone: TONES[index % TONES.length], number: index + 1 }]));
    const teams = (data.teams || []).map((team, index) => ({ ...team, index, tone: meta.get(team.hackathon_id)?.tone || TONES[0] }));
    const by_person = new Map();
    for (const team of teams) {
      for (const key of team.members) {
        if (!by_person.has(key)) by_person.set(key, []);
        by_person.get(key).push(team);
      }
    }
    const builders = [...by_person.entries()].map(([key, owned]) => ({
      key,
      person: people.get(key) || { key, name: ENGLISH.builder },
      teams: owned,
      best: Math.max(...owned.map((team) => team.value)),
      podiums: owned.filter((team) => team.rank <= 3).length
    }));
    const team_counts = new Map();
    for (const team of teams) team_counts.set(team.hackathon_id, (team_counts.get(team.hackathon_id) || 0) + 1);
    return { hackathons, newest: [...hackathons].reverse(), meta, people, teams, builders, team_counts };
  }, [data]);

  const default_winner = useMemo(() => {
    if (!view) return 0;
    return (view.newest.find((item) => view.team_counts.get(item.hackathon_id)) || view.newest[0])?.hackathon_id || 0;
  }, [view]);
  const active_id = view?.meta.has(winner_id) ? winner_id : default_winner;
  const active_ref = useRef(active_id);
  active_ref.current = active_id;
  useEffect(() => {
    if (!view || !motion_ok()) return undefined;
    const order = view.newest.filter((item) => view.team_counts.get(item.hackathon_id)).map((item) => item.hackathon_id);
    if (order.length < 2) return undefined;
    const timer = window.setInterval(() => {
      const pause = slide_pause.current;
      if (pause.hover || !pause.visible || Date.now() < pause.until) return;
      const index = order.indexOf(active_ref.current);
      set_winner_id(order[(index + 1) % order.length]);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    const target = winners_ref.current;
    if (!target || !("IntersectionObserver" in window)) return undefined;
    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        slide_pause.current.visible = entry.isIntersecting;
      });
    }, { threshold: 0.25 });
    watcher.observe(target);
    return () => watcher.disconnect();
  }, [view]);

  useEffect(() => {
    const root = root_ref.current;
    if (!root || !view) return undefined;
    const blocks = [...root.querySelectorAll(".wbs_reveal")];
    if (!("IntersectionObserver" in window) || !motion_ok()) {
      blocks.forEach((block) => block.classList.add("is_in"));
      return undefined;
    }
    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is_in");
          watcher.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    blocks.forEach((block) => watcher.observe(block));
    return () => watcher.disconnect();
  }, [view]);

  useEffect(() => {
    if (!view || !("IntersectionObserver" in window)) return undefined;
    const nodes = SECTIONS.map((item) => document.getElementById(item.id)).filter(Boolean);
    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) set_section(entry.target.id);
      });
    }, { rootMargin: "-42% 0px -48% 0px" });
    nodes.forEach((node) => watcher.observe(node));
    return () => watcher.disconnect();
  }, [view]);

  useEffect(() => {
    set_project_limit(PROJECT_PAGE);
  }, [query, sort, filter_id]);

  useEffect(() => {
    set_people_limit(PEOPLE_PAGE);
  }, [person_query, person_sort]);

  useEffect(() => {
    const node = dialog_ref.current;
    if (!node) return;
    if (dialog && !node.open) node.showModal();
    if (!dialog && node.open) node.close();
    if (dialog) node.scrollTop = 0;
  }, [dialog]);

  function go(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: motion_ok() ? "smooth" : "auto", block: "start" });
  }

  function toggle_music() {
    const audio = audio_ref.current;
    if (!audio) return;
    if (audio.paused) audio.play().then(() => set_playing(true)).catch(() => {});
    else {
      audio.pause();
      set_playing(false);
    }
  }

  function pick_winner(id) {
    set_winner_id(id);
    slide_pause.current.until = Date.now() + SLIDE_MS * 1.2;
  }

  const visible_projects = useMemo(() => {
    if (!view) return [];
    const needle = query.trim().toLowerCase();
    const rows = view.teams.filter((team) => {
      if (filter_id && team.hackathon_id !== filter_id) return false;
      if (!needle) return true;
      const names = team.members.map((key) => view.people.get(key)?.name || "").join(" ");
      const hackathon = view.meta.get(team.hackathon_id)?.title || "";
      return `${team.title} ${names} ${team.team} ${hackathon}`.toLowerCase().includes(needle);
    });
    rows.sort(sort === "s" ?
      (a, b) => b.value - a.value || a.rank - b.rank || a.index - b.index :
      sort === "n" ?
        (a, b) => a.title.localeCompare(b.title) :
        (a, b) => a.index - b.index);
    return rows;
  }, [view, query, sort, filter_id]);

  const visible_people = useMemo(() => {
    if (!view) return [];
    const needle = person_query.trim().toLowerCase();
    const rows = view.builders.filter((row) => {
      if (!needle) return true;
      const hackathons = row.teams.map((team) => view.meta.get(team.hackathon_id)?.title || "").join(" ");
      return `${row.person.name} ${row.person.itda_id || ""} ${hackathons}`.toLowerCase().includes(needle);
    });
    rows.sort(person_sort === "a" ?
      (a, b) => a.person.name.localeCompare(b.person.name) :
      person_sort === "p" ?
        (a, b) => b.podiums - a.podiums || b.best - a.best :
        (a, b) => b.best - a.best || a.person.name.localeCompare(b.person.name));
    return rows;
  }, [view, person_query, person_sort]);

  if (error && !data) {
    return (
      <div className="wbs">
        <div className="wbs_aurora" aria-hidden="true"><i /><i /><i /><i /></div>
        <main>
          <div className="wbs_wrap wbs_stage" style={{ marginTop: 40, textAlign: "center" }}>
            <p className="wbs_kicker">{ENGLISH.hackathon_showcase}</p>
            <h1 style={{ fontSize: 40 }}>{ENGLISH.showcase_unavailable}</h1>
            <p className="wbs_lede" style={{ margin: "12px auto 0" }}>{error}{ENGLISH.ask_the_team_that_shared_it_for_a}</p>
          </div>
        </main>
      </div>
    );
  }

  const hackathon_count = view?.hackathons.length || 0;
  const builders_total = view?.builders.length || 0;
  const scope_label = [data?.cohort_name, data?.program_name].filter(Boolean).join(" · ");
  const active = view?.meta.get(active_id) || null;
  const metric = (team) => {
    const hackathon = view.meta.get(team.hackathon_id);
    return hackathon?.scored && team.score != null ? `${team.score}%` : `${team.submitted}/${team.size} submitted`;
  };
  const metric_short = (team) => {
    const hackathon = view.meta.get(team.hackathon_id);
    return hackathon?.scored && team.score != null ? `${team.score}%` : `${team.submitted}/${team.size}`;
  };
  const names_of = (team) => team.members.map((key) => view.people.get(key)?.name || ENGLISH.builder).join(", ");
  const winners = active ? view.teams.filter((team) => team.hackathon_id === active.hackathon_id).sort((a, b) => a.rank - b.rank) : [];
  const podium = winners.filter((team) => team.rank <= 3);
  const runners = winners.filter((team) => team.rank > 3 && team.rank <= 5);
  const open_team = dialog?.kind === "team" ? view?.teams[dialog.index] : null;
  const open_person = dialog?.kind === "person" ? view?.builders.find((row) => row.key === dialog.key) : null;

  return (
    <div ref={root_ref} className={`wbs${night ? " is_night" : ""}`}>
      <Particles night={night} />
      <div className="wbs_aurora" aria-hidden="true"><i /><i /><i /><i /></div>
      <div ref={glow_ref} className="wbs_glow" aria-hidden="true" />
      <Confetti target_ref={winners_ref} ready={Boolean(view)} />

      {intro !== "gone" ?
        <div className={`wbs_intro${intro === "hide" ? " is_hide" : ""}`}>
          <img className="wbs_intro_logo" src={logo_src} alt={ENGLISH.aarohan} />
          <h1>{ENGLISH.ideas_into_impact}</h1>
          <p>{hackathon_count ? ENGLISH.hackathons_of_building_2(count_word(hackathon_count)) : ENGLISH.hackathons_of_building}{data?.cohort_name || data?.program_name ? ` • ${data.cohort_name || data.program_name}` : ""}</p>
        </div> :
        null}

      <audio ref={audio_ref} src={music_src} loop preload="auto" />
      <button type="button" className={`wbs_music${playing ? "" : " is_muted"}`} aria-label={playing ? ENGLISH.mute_background_music : ENGLISH.play_soft_background_music} title={ENGLISH.background_music} onClick={toggle_music}>
        {playing ?
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> :
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
      </button>
      <button type="button" className="wbs_theme" aria-label={ENGLISH.toggle_night_mode} title={ENGLISH.night_day_mode} onClick={() => set_night((value) => !value)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" /></svg>
      </button>

      <header className="wbs_nav">
        <div className="wbs_wrap">
          <button type="button" className="wbs_brand" onClick={() => window.scrollTo({ top: 0, behavior: motion_ok() ? "smooth" : "auto" })}>
            <img className="wbs_logo" src={logo_src} alt={scope_label || ENGLISH.hackathon_showcase} />
            <span>{ENGLISH.weekend_builds}</span>
          </button>
          <nav aria-label={ENGLISH.sections}>
            {SECTIONS.map((item) =>
              <button key={item.id} type="button" className={section === item.id ? "is_on" : ""} onClick={() => go(item.id)}>{item.label}</button>
            )}
          </nav>
        </div>
      </header>

      <main>
        <div className="wbs_wrap wbs_stage">
          <div className="wbs_hero_top">
            <div>
              <p className="wbs_kicker">{scope_label || ENGLISH.weekend_builds_2}</p>
              <h1 className="wbs_title_film" aria-label={ENGLISH.ideas_into_impact_2}>
                <video ref={title_ref} src={title_film_src} autoPlay muted loop playsInline preload="auto" />
              </h1>
              <p className="wbs_lede">{hackathon_count ? ENGLISH.hackathon_2(count_word(hackathon_count), hackathon_count === 1 ? "" : "s") : ""}{ENGLISH.bold_ideas_real_projects}</p>
            </div>
            <div className="wbs_scene">
              <video ref={orbit_ref} src={orbit_film_src} autoPlay muted loop playsInline preload="auto" aria-label={ENGLISH.innovation_orbit} />
            </div>
          </div>
          <div className="wbs_facts">
            <div className="wbs_fact">
              <i style={{ background: "#e7f3ff", color: "var(--w1)" }}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path stroke="currentColor" strokeWidth="2" d="M8 3v4M16 3v4M4 10h16" /></svg></i>
              <div><b>{hackathon_count}</b><span>{ENGLISH.hackathons}</span></div>
            </div>
            <div className="wbs_fact">
              <i style={{ background: "#f3eaff", color: "var(--w3)" }}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="9" cy="8" r="2.3" fill="currentColor" /><circle cx="15.5" cy="9" r="1.8" fill="currentColor" /><path fill="currentColor" d="M4 18c.4-3 2.5-4.4 5-4.4s4.6 1.4 5 4.4H4zm8.2-.1c.3-1.5 1.4-2.6 3-3 1.5.2 2.6 1.1 3.2 3h-6.2z" /></svg></i>
              <div><b>{band(builders_total)}</b><span>{ENGLISH.builders}</span></div>
            </div>
            <div className="wbs_fact">
              <i style={{ background: "#e7f8f4", color: "var(--w2)" }}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3 3 8l9 5 9-5-9-5zm-7.2 8.2L12 15l7.2-3.8L12 19.2 4.8 11.2z" /></svg></i>
              <div><b>{band(view?.teams.length || 0)}</b><span>{ENGLISH.projects}</span></div>
            </div>
          </div>
          <svg className="wbs_waves" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 46 C 180 78, 360 14, 560 42 S 920 78, 1200 28" fill="none" stroke="#e5eefc" strokeWidth="2" /><path d="M0 58 C 220 22, 420 74, 640 44 S 980 18, 1200 54" fill="none" stroke="#f0e7ff" strokeWidth="2" /></svg>
          <button type="button" className="wbs_more" aria-label={ENGLISH.see_the_winners} onClick={() => go("wbs_winners")}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>

        <section id="wbs_winners" ref={winners_ref} className="wbs_reveal">
          <div className="wbs_wrap">
            <div className="wbs_sh">
              <div>
                <h2>{ENGLISH.winners}</h2>
                <p>{ENGLISH.the_top_three_teams_of_every_hackathon_pick}</p>
              </div>
            </div>
            <div
              className="wbs_switch"
              onMouseEnter={() => { slide_pause.current.hover = true; }}
              onMouseLeave={() => { slide_pause.current.hover = false; }}>
              <Rail label={ENGLISH.hackathons_2} focus_key={active_id}>
                {(view?.newest || []).map((item) =>
                  <button key={item.hackathon_id} type="button" className="wbs_tab" role="tab" aria-selected={item.hackathon_id === active_id} title={item.title} onClick={() => pick_winner(item.hackathon_id)}>
                    <span className="wbs_sw" style={{ background: view.meta.get(item.hackathon_id).tone }} />
                    <span className="wbs_tab_text">{item.title}</span>
                  </button>
                )}
              </Rail>
              {hackathon_count > TAB_LIMIT ?
                <select className="wbs_pick" value={active_id || ""} aria-label={ENGLISH.jump_to_a_hackathon} onChange={(event) => pick_winner(Number(event.target.value))}>
                  {view.newest.map((item) => <option key={item.hackathon_id} value={item.hackathon_id}>{item.title}</option>)}
                </select> :
                null}
            </div>
            {!podium.length && active ? <p className="wbs_wempty">{ENGLISH.no_submissions_for_this_hackathon_yet}</p> : null}
            <div key={active_id} className="wbs_podium">
              {podium.map((team) =>
                <button key={team.key} type="button" className={`wbs_pod is_r${team.rank}${tilt.className}`} style={{ "--mc": MEDALS[team.rank] }} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} onClick={() => set_dialog({ kind: "team", index: team.index })}>
                  <div className="wbs_rk">{ord(team.rank)}</div>
                  <h3>{team.title}</h3>
                  <div className="wbs_stack">{team.members.map((key) => <Avatar key={key} person={view.people.get(key)} size={48} />)}</div>
                  <div className="wbs_who">{names_of(team)}</div>
                  <div className="wbs_sc">{metric(team)}{team.live ? ENGLISH.live_site : ""}</div>
                </button>
              )}
            </div>
            <div className="wbs_rest">
              {runners.map((team) =>
                <button key={team.key} type="button" className={`wbs_row${tilt.className}`} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} onClick={() => set_dialog({ kind: "team", index: team.index })}>
                  <b>{ord(team.rank)}</b>
                  <span><strong>{team.title}</strong><br /><span style={{ color: "var(--mute)", fontSize: 14 }}>{names_of(team)}</span></span>
                  <b>{metric_short(team)}</b>
                </button>
              )}
            </div>
            {active ?
              <div className="wbs_wstats" aria-live="polite" style={{ "--c": view.meta.get(active.hackathon_id).tone }}>
                <b className="wbs_jn">{active.title}</b>
                <div className="wbs_wsub">{ENGLISH.hackathon}{view.meta.get(active.hackathon_id).number}</div>
                {winners.length ?
                  <div className="wbs_stats">
                    <div className="wbs_stat"><b>{winners.length}</b><span>{ENGLISH.teams}</span></div>
                    <div className="wbs_stat"><b>{new Set(winners.flatMap((team) => team.members)).size}</b><span>{ENGLISH.builders}</span></div>
                    <div className="wbs_stat"><b>{(winners.reduce((sum, team) => sum + team.value, 0) / winners.length).toFixed(1)}%</b><span>{active.scored ? ENGLISH.average_score : ENGLISH.average_completion}</span></div>
                    <div className="wbs_stat"><b>{winners.filter((team) => team.live).length}</b><span>{ENGLISH.live_sites}</span></div>
                  </div> :
                  <p className="wbs_wempty">{ENGLISH.no_results_were_recorded_for_this_hackathon_yet}</p>}
              </div> :
              null}
          </div>
        </section>

        <section id="wbs_projects" className="wbs_reveal">
          <div className="wbs_wrap">
            <div className="wbs_sh"><div><h2>{ENGLISH.all_projects}</h2><p>{ENGLISH.search_by_title_builder_or_hackathon_then_open}</p></div></div>
            <div className="wbs_tools">
              <input type="search" value={query} placeholder={ENGLISH.search_projects_people_or_hackathons} aria-label={ENGLISH.search_projects_people_or_hackathons} onChange={(event) => set_query(event.target.value)} />
              <select value={sort} aria-label={ENGLISH.sort_projects} onChange={(event) => set_sort(event.target.value)}>
                <option value="s">{ENGLISH.highest_score}</option>
                <option value="n">{ENGLISH.title_a_z}</option>
                <option value="w">{ENGLISH.hackathon_order}</option>
              </select>
            </div>
            <div className="wbs_switch is_tools">
              <Rail label={ENGLISH.hackathon_filters} focus_key={filter_id}>
                <button type="button" className="wbs_chip" aria-pressed={!filter_id} onClick={() => set_filter_id(0)}>{ENGLISH.all_hackathons}</button>
                {(view?.newest || []).map((item) =>
                  <button key={item.hackathon_id} type="button" className="wbs_chip" aria-pressed={filter_id === item.hackathon_id} title={item.title} onClick={() => set_filter_id(item.hackathon_id)}>
                    <span className="wbs_sw" style={{ background: view.meta.get(item.hackathon_id).tone }} />
                    <span className="wbs_tab_text">{item.title}</span>
                  </button>
                )}
              </Rail>
              {hackathon_count > TAB_LIMIT ?
                <select className="wbs_pick" value={filter_id || ""} aria-label={ENGLISH.filter_by_hackathon} onChange={(event) => set_filter_id(Number(event.target.value) || 0)}>
                  <option value="">{ENGLISH.all_hackathons}</option>
                  {view.newest.map((item) => <option key={item.hackathon_id} value={item.hackathon_id}>{item.title}</option>)}
                </select> :
                null}
            </div>
            <p className="wbs_count" aria-live="polite">{visible_projects.length}{ENGLISH.project}{visible_projects.length === 1 ? "" : "s"}</p>
            <div className="wbs_grid">
              {visible_projects.length ?
                visible_projects.slice(0, project_limit).map((team) =>
                  <button key={team.key} type="button" className={`wbs_card${tilt.className}`} style={{ "--c": team.tone }} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} onClick={() => set_dialog({ kind: "team", index: team.index })}>
                    <Art seed={team.title} tone={team.tone} />
                    <div style={{ minWidth: 0 }}>
                      <h3>{team.title}</h3>
                      <div className="wbs_stack is_small">{team.members.map((key) => <Avatar key={key} person={view.people.get(key)} size={26} />)}</div>
                      <div className="wbs_m">{names_of(team)}</div>
                      <div className="wbs_meta">
                        <span>{metric_short(team)}</span>
                        <Score_Bar value={team.value} />
                        {team.rank <= 3 ? <span className="wbs_badge">{ord(team.rank)}{ENGLISH.place}</span> : null}
                      </div>
                      <div className="wbs_meta">{view.meta.get(team.hackathon_id)?.title} · {team.team}</div>
                    </div>
                  </button>
                ) :
                view ? <p>{ENGLISH.no_projects_match_try_a_different_name_or}</p> : null}
            </div>
            {visible_projects.length > project_limit ?
              <button type="button" className="wbs_load" onClick={() => set_project_limit((value) => value + PROJECT_PAGE)}>{ENGLISH.show_more_projects}{visible_projects.length - project_limit}{ENGLISH.left}</button> :
              null}
          </div>
        </section>

        <section id="wbs_people" className="wbs_reveal">
          <div className="wbs_wrap">
            <div className="wbs_sh"><div><h2>{ENGLISH.participants}</h2><p>{builders_total}{ENGLISH.builders_across}{hackathon_count === 1 ? ENGLISH.one_hackathon : ENGLISH.hackathons_4(count_word(hackathon_count).toLowerCase())}{ENGLISH.open_a_name_to_see_every_project_they}</p></div></div>
            <div className="wbs_tools">
              <input type="search" value={person_query} placeholder={ENGLISH.find_a_participant_or_hackathon} aria-label={ENGLISH.find_a_participant_or_hackathon} onChange={(event) => set_person_query(event.target.value)} />
              <select value={person_sort} aria-label={ENGLISH.sort_participants} onChange={(event) => set_person_sort(event.target.value)}>
                <option value="b">{ENGLISH.best_score}</option>
                <option value="p">{ENGLISH.most_podiums}</option>
                <option value="a">{ENGLISH.name_a_z}</option>
              </select>
            </div>
            <div className="wbs_pg">
              {visible_people.length ?
                visible_people.slice(0, people_limit).map((row) =>
                  <button key={row.key} type="button" className={`wbs_pc${tilt.className}`} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} onClick={() => set_dialog({ kind: "person", key: row.key })}>
                    <div className="wbs_pt"><Avatar person={row.person} size={64} /><b>{row.person.name}</b></div>
                    {hackathon_count <= PIP_LIMIT ?
                      <div className="wbs_pips" aria-hidden="true">
                        {view.hackathons.map((item) =>
                          <i key={item.hackathon_id} style={row.teams.some((team) => team.hackathon_id === item.hackathon_id) ? { background: view.meta.get(item.hackathon_id).tone } : undefined} />
                        )}
                      </div> :
                      <div className="wbs_meta">{new Set(row.teams.map((team) => team.hackathon_id)).size}{ENGLISH.label_of}{hackathon_count}{ENGLISH.hackathons_3}</div>}
                    <span style={{ color: "var(--mute)", fontSize: 14 }}>
                      {row.teams.length}{ENGLISH.project}{row.teams.length > 1 ? "s" : ""}{ENGLISH.best}{Math.round(row.best)}%{row.podiums ? ENGLISH.podium(row.podiums, row.podiums > 1 ? "s" : "") : ""}
                    </span>
                  </button>
                ) :
                view ? <p>{ENGLISH.no_participant_matches_that_search}</p> : null}
            </div>
            {visible_people.length > people_limit ?
              <button type="button" className="wbs_load" onClick={() => set_people_limit((value) => value + PEOPLE_PAGE)}>{ENGLISH.show_more_participants}{visible_people.length - people_limit}{ENGLISH.left}</button> :
              null}
          </div>
        </section>
      </main>
      <footer><div className="wbs_wrap">{ENGLISH.built_from_live_hackathon_submissions}{data?.program_name ? ENGLISH.label_for(data.program_name) : ""}{ENGLISH.where_no_official_winners_were_named_teams_are}</div></footer>

      <dialog
        ref={dialog_ref}
        className="wbs_dialog"
        aria-label={ENGLISH.details}
        onClose={() => set_dialog(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) set_dialog(null);
        }}>
        <button type="button" className="wbs_x" aria-label={ENGLISH.close} onClick={() => set_dialog(null)}>✕</button>
        {open_team ?
          <Team_Dialog team={open_team} view={view} metric={metric} on_person={(key) => set_dialog({ kind: "person", key })} /> :
          null}
        {open_person ?
          <Person_Dialog row={open_person} view={view} metric_short={metric_short} on_team={(index) => set_dialog({ kind: "team", index })} /> :
          null}
      </dialog>
    </div>
  );
}

function Team_Dialog({ team, view, metric, on_person }) {
  const hackathon = view.meta.get(team.hackathon_id);
  const total = view.team_counts.get(team.hackathon_id) || 0;
  const lives = team.lives.map(safe_url).filter(Boolean);
  const docs = team.docs.map(safe_url).filter(Boolean);
  const repos = team.repos.map(safe_url).filter(Boolean);
  return (
    <>
      <div className="wbs_dh">
        <Art seed={team.title} tone={team.tone} size={84} />
        <div>
          <div className="wbs_meta" style={{ margin: "0 0 6px" }}><span className="wbs_sw" style={{ background: team.tone }} />{hackathon?.title} · {team.team}</div>
          <h2>{team.title}</h2>
        </div>
      </div>
      <div className="wbs_db">
        <div>
          <h4>{hackathon?.scored && team.score != null ? ENGLISH.score : ENGLISH.submissions}</h4>
          <div className="wbs_meta" style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>
            <b>{metric(team)}</b>
            <Score_Bar value={team.value} tone={team.tone} />
            {team.rank <= 3 ? <span className="wbs_badge">{ord(team.rank)}{ENGLISH.place}</span> : <span>{ENGLISH.ranked}{ord(team.rank)}{ENGLISH.label_of}{total}{ENGLISH.in_this_hackathon}</span>}
          </div>
        </div>
        <div>
          <h4>{ENGLISH.builders}</h4>
          <div className="wbs_pl">
            {team.members.map((key) => {
              const person = view.people.get(key);
              return <button key={key} type="button" onClick={() => on_person(key)}><Avatar person={person} size={26} />{person?.name || ENGLISH.builder}</button>;
            })}
          </div>
        </div>
        <div>
          <h4>{ENGLISH.links}</h4>
          <div className="wbs_links">
            {lives.map((url, index) => <a key={url} className={index === 0 ? "is_live" : ""} href={url} target="_blank" rel="noopener noreferrer">{index === 0 ? ENGLISH.open_live_site : link_label(url)}</a>)}
            {docs.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{ENGLISH.documentation}</a>)}
            {repos.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{link_label(url)}</a>)}
            {team.files.map((name) => <span key={name} className="wbs_file">{name}</span>)}
            {!lives.length && !repos.length && !docs.length && !team.files.length ? <span style={{ color: "var(--mute)" }}>{ENGLISH.no_links_were_recorded_for_this_project}</span> : null}
          </div>
          {!lives.length && repos.length ? <p style={{ color: "var(--mute)", fontSize: 14, margin: "8px 0 0" }}>{ENGLISH.no_live_site_was_recorded_for_this_project}</p> : null}
        </div>
        {team.overview ? <p className="wbs_note">{team.overview}</p> : null}
      </div>
    </>
  );
}

function Person_Dialog({ row, view, metric_short, on_team }) {
  return (
    <>
      <div className="wbs_dh">
        <Avatar person={row.person} size={96} />
        <div>
          <div className="wbs_meta" style={{ margin: "0 0 6px" }}>
            {row.person.itda_id ? `${row.person.itda_id} · ` : ""}{row.teams.length}{ENGLISH.project}{row.teams.length > 1 ? "s" : ""}{row.podiums ? ENGLISH.podium(row.podiums, row.podiums > 1 ? "s" : "") : ""}
          </div>
          <h2>{row.person.name}</h2>
        </div>
      </div>
      <div className="wbs_db">
        <div className="wbs_hist">
          {row.teams.map((team) =>
            <button key={team.key} type="button" onClick={() => on_team(team.index)}>
              <span className="wbs_sw" style={{ background: team.tone }} />
              <span><strong>{team.title}</strong><br /><span style={{ color: "var(--mute)", fontSize: 14 }}>{view.meta.get(team.hackathon_id)?.title}{team.rank <= 3 ? ENGLISH.place_2(ord(team.rank)) : ""}</span></span>
              <b>{metric_short(team)}</b>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
