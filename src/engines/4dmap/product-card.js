/**
 * 4DM-CARD primitives for the 0.3.0 lattice ops.
 * Canonical hash matches the product card (sorted JSON, SHA-256, h excluded).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "../../session-core.js";

export const SCHEMA = "4DM-CARD";
export const PI_EMPTY = "Π-EMPTY";
export const GENESIS_PREV = "0".repeat(64);
export const ZION_CAP = 0.75;
export const PIN_FRAME_KIND = "4DM-PIN-FRAME";

export const AXIS_GLYPH = Object.freeze({ T: "T", DELTA: "Δ", GAMMA: "Γ", PI: "Π" });

export const AXIS_FRAME = Object.freeze({
  T: { glyph: "T", name: "Clock", meaning: "time / when a pin sits" },
  DELTA: { glyph: "Δ", name: "Interval", meaning: "delta / change / span or gap between pins" },
  GAMMA: { glyph: "Γ", name: "Trajectory", meaning: "pattern / geometry / stacked or walked motion of pins" },
  PI: { glyph: "Π", name: "Pattern", meaning: "provenance / path / class / cohort / absence / silence" },
});

export const COMPANIONS = Object.freeze({
  temporallock: { software: "TemporalLock", slug: "temporallock", axes: ["T", "DELTA"] },
  staticclock: { software: "StaticClock", slug: "staticclock", axes: ["T"] },
  chronolock: { software: "ChronoLock", slug: "chronolock", axes: ["T", "DELTA"] },
  trajectorylock: { software: "TrajectoryLock", slug: "trajectorylock", axes: ["GAMMA"] },
  spectrallock: { software: "SpectralLock", slug: "spectrallock", axes: ["PI"] },
});

export const LIBRARY = Object.freeze({
  software: "Aziel Digital Library",
  slug: "aziel-corpus",
  role: "inspection_input",
  cite_only: true,
  door: false,
  merged: false,
  map: "https://www.azielcorpuslibrary.net/map",
  verify_geo: "https://www.azielcorpuslibrary.net/v1/verify-geo",
  note:
    "Library Temporal Map pins are paper date × event × geolocation. Never upload time. Docs without resolvable place+date stay unpinned. 4DMap accepts/emits 4DM-PIN-FRAME receipts on the hashchain lattice.",
  author: "Aziel Eliab",
});

export const AKM = Object.freeze({
  spec: "AKM-TRIAD-1.0",
  name: "Adaptive Knowledge Memory",
  fabric: true,
  software_tab: false,
  door: false,
  slug: null,
  softwares_product: false,
  pairing: "optional cite/observe",
  posterior_is_truth: false,
  belief_is_not_truth: true,
  authorizes_action: false,
  history_rewrite: false,
  triad: ["E", "C", "P", "B"],
  triad_rule: "3-of-4",
  learn: "ChainLock learn",
  note:
    "LIVE fabric on aziel-runtime. Not a Softwares-tab product. Behind FragGate. Optional 4DMap inspection-card cite/observe only. Bayesian 3-of-4 triad E/C/P/B. Posterior ≠ truth. No history rewrite. Author: Aziel Eliab only.",
  author: "Aziel Eliab",
});

const FORBIDDEN_KEYS = new Set([
  "legal_name",
  "legalname",
  "full_name",
  "fullname",
  "home",
  "home_address",
  "county",
  "ssn",
  "address",
  "street",
  "residence",
  "dob",
  "date_of_birth",
]);

const IDENTITY_PHRASES = [/\blegal\s+name\b/i, /\bhome\s+address\b/i, /\bcounty\s+of\b/i, /\b[A-Za-z][A-Za-z .'-]{1,40}\s+County\b/];
const INTENT_PHRASES = [/\bintent\b/i, /\bmotive\b/i, /\bguilt\b/i, /\bmeant to\b/i];

export class CardError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.refused = true;
  }
}

function normAxisValue(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(normAxisValue);
  if (typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = normAxisValue(value[key]);
    return out;
  }
  return String(value);
}

export function canonicalPayload(card) {
  return {
    delta: normAxisValue(card.delta ?? null),
    gamma: normAxisValue(card.gamma ?? null),
    id: String(card.id || ""),
    note: String(card.note || ""),
    pi: normAxisValue(card.pi ?? null),
    prev: String(card.prev || GENESIS_PREV),
    src: String(card.src || ""),
    t: normAxisValue(card.t ?? null),
  };
}

export async function digestCard(card) {
  return sha256Hex(canonicalize(canonicalPayload(card)));
}

export function scanIdentity(value, path = "") {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) {
      const low = String(key).toLowerCase().replace(/-/g, "_");
      if (FORBIDDEN_KEYS.has(low)) {
        throw new CardError("IDENTITY_LEAK", `card field ${path}${key} is a forbidden identity key (no legal name/home/county)`);
      }
      scanIdentity(inner, `${path}${key}.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((inner, i) => scanIdentity(inner, `${path}${i}.`));
    return;
  }
  if (typeof value === "string") {
    for (const pat of IDENTITY_PHRASES) {
      if (pat.test(value)) throw new CardError("IDENTITY_LEAK", "card text names a legal name, home, or county — refused");
    }
  }
}

export function scanIntent(value) {
  if (value && typeof value === "object") {
    const vals = Array.isArray(value) ? value : Object.values(value);
    vals.forEach(scanIntent);
    return;
  }
  if (typeof value === "string") {
    for (const pat of INTENT_PHRASES) {
      if (pat.test(value)) throw new CardError("INTENT_REFUSE", "4DMap does not infer or record intent, motive, or guilt");
    }
  }
}

export function newId() {
  const n = crypto.getRandomValues(new Uint8Array(6));
  return "4dm-" + [...n].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeCard(input = {}) {
  const card = {
    schema: SCHEMA,
    id: input.id || newId(),
    t: input.t ?? null,
    delta: input.delta ?? null,
    gamma: input.gamma ?? null,
    pi: input.pi == null ? PI_EMPTY : input.pi,
    prev: input.prev || GENESIS_PREV,
    src: input.src || "operator",
    note: input.note || "",
  };
  scanIdentity(card);
  scanIntent(card);
  const h = await digestCard(card);
  if (input.expected_h && input.expected_h !== h) {
    throw new CardError("HASH_FAIL", "fail-closed: supplied h does not match canonical SHA-256");
  }
  card.h = h;
  return card;
}

export async function verifyCard(card) {
  if (!card || typeof card !== "object") throw new CardError("HASH_FAIL", "fail-closed: card is not an object");
  scanIdentity(card);
  scanIntent(card);
  const expected = await digestCard(card);
  if (String(card.h || "") !== expected) throw new CardError("HASH_FAIL", "fail-closed: card hash mismatch");
  return { ok: true, id: card.id, h: expected };
}

export function axisOf(card) {
  const empty = (value) => value == null || value === "";
  if (!empty(card.t) && empty(card.delta) && empty(card.gamma)) {
    if (card.pi == null || card.pi === "" || card.pi === PI_EMPTY) return "T";
  }
  if (!empty(card.delta)) return "DELTA";
  if (!empty(card.gamma)) return "GAMMA";
  if (card.pi != null && card.pi !== "" && card.pi !== PI_EMPTY) return "PI";
  if (!empty(card.t)) return "T";
  return "T";
}

export function companionCite(src, axis) {
  const info = COMPANIONS[String(src || "").trim().toLowerCase()];
  if (!info) return null;
  const cite = {
    software: info.software,
    slug: info.slug,
    axes: info.axes.slice(),
    role: "inspection_input",
    cite_only: true,
    door: false,
    merged: false,
  };
  if (axis) cite.axis = axis;
  return cite;
}

export function cardReceipt(card) {
  const axis = axisOf(card);
  const frame = AXIS_FRAME[axis];
  const src = String(card.src || "");
  return {
    schema: SCHEMA,
    kind: "4DM-CARD",
    id: card.id,
    h: card.h,
    axis,
    glyph: AXIS_GLYPH[axis],
    name: frame.name,
    meaning: frame.meaning,
    src,
    companion: companionCite(src, axis),
    role: "inspection",
    door: false,
    truth: false,
  };
}
