import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../constants/english/student_mock_interview_constants_english.js";
const FRAME_COUNT = 4;
const NEED_MATCHES = 3;
const FRAME_GAP_MS = 350;
const MATCH_DISTANCE = 0.52;
const SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js";
const MODEL_SRC = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

let model_ready = null;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function source_size(source) {
  return {
    width: source.videoWidth || source.naturalWidth || source.width || 0,
    height: source.videoHeight || source.naturalHeight || source.height || 0
  };
}

function snapshot(source, mirror = false) {
  const { width, height } = source_size(source);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function inject_script(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-smi-face-api="true"]`);
    if (existing && window.faceapi) {
      resolve(window.faceapi);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.smiFaceApi = "true";
    script.onload = () => {
      if (!window.faceapi) {
        reject(new Error(ENGLISH.face_verification_failed_to_start));
        return;
      }
      resolve(window.faceapi);
    };
    script.onerror = () => reject(new Error(ENGLISH.unable_to_load_face_verification_check_your_network));
    document.head.appendChild(script);
  });
}

async function load_models() {
  if (model_ready) return model_ready;
  model_ready = (async () => {
    const api = window.faceapi || await inject_script(SCRIPT_SRC);
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri(MODEL_SRC),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_SRC),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_SRC)
    ]);
    return api;
  })().catch((err) => {
    model_ready = null;
    throw err;
  });
  return model_ready;
}

function box_area(item) {
  const box = item?.detection?.box;
  if (!box) return 0;
  return Number(box.width || 0) * Number(box.height || 0);
}

async function descriptor_of(api, source, input_size) {
  const options = new api.TinyFaceDetectorOptions({
    inputSize: input_size,
    scoreThreshold: 0.35
  });
  const single = await api.detectSingleFace(source, options).withFaceLandmarks().withFaceDescriptor();
  if (single?.descriptor) return single.descriptor;
  const many = await api.detectAllFaces(source, options).withFaceLandmarks().withFaceDescriptors();
  if (!many?.length) return null;
  many.sort((left, right) => box_area(right) - box_area(left));
  return many[0]?.descriptor || null;
}

async function descriptor_from(api, source, input_size) {
  const plain = await descriptor_of(api, source, input_size);
  if (plain) return plain;
  return descriptor_of(api, snapshot(source, true), input_size);
}

function face_distance(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    total += delta * delta;
  }
  return Math.sqrt(total);
}

export function url_to_image(href) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // The bitmap is already loaded.
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(ENGLISH.unable_to_read_the_profile_photo));
    image.src = href;
  });
}

export async function verify_live_frames(profile_image, video, on_frame) {
  on_frame?.(0, FRAME_COUNT);
  const api = await load_models();
  const profile = await descriptor_from(api, snapshot(profile_image, false), 512);
  if (!profile) {
    throw new Error(ENGLISH.no_face_was_found_in_your_profile_photo);
  }

  let matches = 0;
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    on_frame?.(index + 1, FRAME_COUNT);
    const frame = snapshot(video, false);
    const live = await descriptor_from(api, frame, 416);
    if (live && face_distance(profile, live) <= MATCH_DISTANCE) matches += 1;
    if (index < FRAME_COUNT - 1) await wait(FRAME_GAP_MS);
  }

  return {
    matched: matches >= NEED_MATCHES,
    matches,
    total: FRAME_COUNT
  };
}
