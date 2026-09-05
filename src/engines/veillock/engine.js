/**
 * VeilLock engine (port of workers/download-tracker/src/runtime.js).
 * Consent + pulse + local-app steps. YOUR camera/screen only. Does not inject.
 * Author: Aziel Eliab.
 */

export const PRODUCT = "veillock";
export const VERSION = "0.2.0";
export const MOTTO = "Consent-gated camera protection via AZ-OS.";
export const IDENTITY = "consent-gated camera protection via AZ-OS";
export const IOS_FACETIME = "iOS FaceTime cannot pick a third-party camera.";
export const TETHER_NOTE = "Desktop tether stays local. In-process /v1 is a consent receipt, not a virtual camera.";
export const LIMITATION =
  "THIS IS: a privacy veil on the user's own camera and video, plus local-app steps. THIS IS NOT: a VPN, Tor, anonymous relay, call interceptor, or FaceTime/Zoom/Meet/Teams/Skype inject. YOUR camera/screen only.";

const APPS = {
  zoom: {
    app: "zoom",
    inject: false,
    your_device_only: true,
    steps: [
      "Use YOUR camera/screen on this device only.",
      "VeilLock does not inject into Zoom.",
      "Apply the local veil (virtual camera / screen overlay) from the local package if you want obfuscation.",
      "Hosted / in-process ops return a consent receipt and recipe, not pixels.",
    ],
  },
  meet: {
    app: "meet",
    inject: false,
    your_device_only: true,
    steps: [
      "Use YOUR camera/screen on this device only.",
      "VeilLock does not inject into Google Meet.",
      "Apply the local veil from the local package.",
    ],
  },
  teams: {
    app: "teams",
    inject: false,
    your_device_only: true,
    steps: [
      "Use YOUR camera/screen on this device only.",
      "VeilLock does not inject into Microsoft Teams.",
      "Apply the local veil from the local package.",
    ],
  },
  facetime: {
    app: "facetime",
    inject: false,
    your_device_only: true,
    steps: [
      "iOS FaceTime cannot pick a third-party camera.",
      "VeilLock does not inject into FaceTime.",
      "Use YOUR device camera/screen only.",
    ],
  },
  skype: {
    app: "skype",
    inject: false,
    your_device_only: true,
    steps: [
      "Use YOUR camera/screen on this device only.",
      "VeilLock does not inject into Skype.",
      "Apply the local veil from the local package.",
    ],
  },
};

async function sha256Hex(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const dig = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(dig);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedToInt(seed) {
  const hex = await sha256Hex(String(seed == null ? "veillock" : seed));
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo));
}

export function pciFromValues(values) {
  if (values && typeof values === "object" && !Array.isArray(values)) {
    if (values.pci != null) {
      const token = String(values.pci).toUpperCase();
      if (token === "PASS") return { pci: "PASS", reason: "pci token PASS" };
      return { pci: token || "FAIL", reason: "pci token is not PASS" };
    }
    values = Object.values(values);
  }
  if (!Array.isArray(values) || values.length === 0) {
    return { pci: "FAIL", reason: "values required" };
  }
  const nums = [];
  for (const v of values) {
    if (v === "PASS" || v === true) continue;
    if (v === "FAIL" || v === false) return { pci: "FAIL", reason: "explicit FAIL token" };
    const n = Number(v);
    if (!Number.isFinite(n)) return { pci: "FAIL", reason: "non-finite value" };
    nums.push(n);
  }
  if (!nums.length) return { pci: "FAIL", reason: "no numeric pulse samples" };
  if (nums.every((n) => n === 0)) return { pci: "FAIL", reason: "dead pulse (all zeros)" };
  return { pci: "PASS", reason: "finite non-zero pulse samples", n: nums.length };
}

export function consentDecision(body) {
  const src = body && typeof body === "object" ? body : {};
  const obfuscationOn = src.obfuscation_on == null ? true : Boolean(src.obfuscation_on);
  const callAccepted = Boolean(src.call_accepted || src.azos_call_accepted);
  const actor = String(src.actor || "");
  let obfuscate = true;
  let reason = "default veil: camera and video protected";
  if (!obfuscationOn) {
    obfuscate = false;
    reason = "user turned obfuscation off";
  } else if (callAccepted) {
    obfuscate = false;
    reason = "user accepted a call through AZ-OS";
  }
  return {
    azos_hook: true,
    overlay: "AZ-OS",
    identity: IDENTITY,
    user_controls: true,
    obfuscation_on: obfuscationOn,
    call_accepted: callAccepted,
    obfuscate,
    veil: obfuscate ? "on" : "lifted",
    reason,
    actor: actor || null,
    kernel: false,
    kills_caller_os: false,
    inject: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    facetime: IOS_FACETIME,
    tether: TETHER_NOTE,
  };
}

export async function obfuscateRecipe(body) {
  let width = Number(body && body.width);
  let height = Number(body && body.height);
  if (!Number.isFinite(width) || width <= 0) width = 640;
  if (!Number.isFinite(height) || height <= 0) height = 480;
  width = Math.min(1920, Math.max(8, width | 0));
  height = Math.min(1080, Math.max(8, height | 0));
  const seed = body && body.seed != null ? body.seed : 0;
  const kind = String((body && body.source) || "camera").toLowerCase();
  const rng = mulberry32(await seedToInt(seed));
  const luma = 88;
  const wash = [Math.round(luma * 0.72 + 20), Math.round(luma * 0.58 + 16), Math.round(luma * 0.90 + 38)];
  const grain = Number(rng().toFixed(4));
  const bg = [randInt(rng, 24, 64), randInt(rng, 24, 64), randInt(rng, 24, 64)];
  const nRect = randInt(rng, 2, 6);
  const rectangles = [];
  for (let i = 0; i < nRect; i++) {
    const y1 = randInt(rng, 0, Math.max(height, 1));
    const x1 = randInt(rng, 0, Math.max(width, 1));
    const y2 = randInt(rng, y1 + 1, height + 1);
    const x2 = randInt(rng, x1 + 1, width + 1);
    const color = [randInt(rng, 80, 210), randInt(rng, 80, 210), randInt(rng, 80, 210)];
    const bar = Math.min(y1 + Math.max(1, Math.floor(height / 16)), y2);
    const bar_color = [randInt(rng, 40, 120), randInt(rng, 40, 120), randInt(rng, 40, 120)];
    rectangles.push({ y1, x1, y2, x2, color, title_bar: { y1, y2: bar, x1, x2, color: bar_color } });
  }
  const camera = kind === "screen" ? false : true;
  return {
    mode: "obfuscation",
    pipeline: camera ? "natural_camera_veil" : "synthetic_ui_noise",
    plaintext: false,
    virtual_camera: false,
    default_display: "obfuscation",
    azos_hook: true,
    seed: String(seed),
    width,
    height,
    channels: 3,
    wash: camera ? wash : bg,
    grain: camera ? grain : null,
    background: bg,
    rectangles: camera ? [] : rectangles,
    true_engine_runtime: true,
    limitation: LIMITATION,
    description: camera
      ? "Natural camera/video veil recipe (soft wash, grain, live-looking). Not plaintext and not GCM snow. Spatial camera pixels are not copied."
      : "Synthetic UI-noise recipe (fake windows / panels). Not plaintext and not GCM snow.",
  };
}

export function pulse(body) {
  const src = body && typeof body === "object" ? body : {};
  const values = src.values != null ? src.values : src;
  const pci = pciFromValues(values);
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    ...pci,
    fail_closes: pci.pci !== "PASS",
    plaintext: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    note: "PulseCheck. Fail → halt/noise, never plaintext. Not a call intercept.",
  };
}

export function apps(body) {
  const src = body && typeof body === "object" ? body : {};
  const key = String(src.app || src.name || "").trim().toLowerCase();
  if (key && APPS[key]) {
    return {
      product: PRODUCT,
      version: VERSION,
      inject: false,
      your_device_only: true,
      true_engine_runtime: true,
      limitation: LIMITATION,
      ...APPS[key],
    };
  }
  return {
    product: PRODUCT,
    version: VERSION,
    inject: false,
    your_device_only: true,
    true_engine_runtime: true,
    limitation: LIMITATION,
    apps: Object.values(APPS),
    note: "Local-app steps only. VeilLock does not inject into FaceTime, Zoom, Meet, Teams, or Skype.",
  };
}
