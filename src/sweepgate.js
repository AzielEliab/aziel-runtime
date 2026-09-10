/**
 * SweepGate SG-0.1 — airlock before memory / entry.
 *
 * Structural sieve on inbound/outbound envelopes. Isolate. Do not merge.
 * Not a Softwares-tab product. Not host AV. Not FragGate. Not FoldLock.
 *
 * Paper: docs/designs/SG-WP-0.1.md
 * Author: Aziel Eliab only.
 */

import { sha256Hex } from "./session-core.js";

export const SG_VERSION = "SG-0.1";
export const SG_SPEC = "SG-WP-0.1";
export const SG_AUTHOR = "Aziel Eliab";
export const SG_REFUSE = "sweep-isolate";

export const ALLOWLIST_ORIGINS = Object.freeze([
  "https://www.azielcorpuslibrary.net",
  "https://godlock.uk",
  "https://www.azieleliab.com",
  "https://aziel-runtime.vibelock.workers.dev",
  "https://github.com/AzielEliab",
]);

export const ALLOWLIST_HOSTS = Object.freeze([
  "www.azielcorpuslibrary.net",
  "azielcorpuslibrary.net",
  "godlock.uk",
  "www.godlock.uk",
  "www.azieleliab.com",
  "azieleliab.com",
  "aziel-runtime.vibelock.workers.dev",
]);

const GITHUB_IDENTITY_PREFIX = "/azieleliab";

/** Official SG airlock-block keys. `ssn` folds on AZPIPE (FLD3:block), not this sieve. */
export const BLOCK_KEYS = Object.freeze([
  "password",
  "private_key",
  "secret",
  "legal_name",
  "home_address",
]);

const POISON_MARKS = Object.freeze([
  "inject-payload",
  "jailbreak-ignore",
  "exfiltrate",
  "exfiltration",
  "ignore previous instructions",
  "ignore-previous-instructions",
]);

const DROPPER_MARKS = Object.freeze(["dropper", "meterpreter"]);

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;
const MZ_B64_RE = /(?:^|[^A-Za-z0-9+/])TV(o|p)[A-Za-z0-9+/=]{8,}/;
const SCRIPT_RE = /<\s*script\b/i;
const EVAL_RE = /\beval\s*\(/i;
const POWERSHELL_RE = /powershell[^.\n]{0,80}-enc\b/i;
const CMD_RE = /\bcmd\.exe\b/i;
const BIN_SH_RE = /\/bin\/sh\b/;
const RM_RF_RE = /\brm\s+-rf\s+\//;

function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function walkKeys(value, out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, out);
    return out;
  }
  for (const [k, v] of Object.entries(value)) {
    out.push(String(k));
    walkKeys(v, out);
  }
  return out;
}

export function hostOfUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return (u.hostname || "").toLowerCase();
  } catch {
    return null;
  }
}

export function originAllowed(raw) {
  const s = String(raw || "").trim();
  if (!s) return true;
  for (const origin of ALLOWLIST_ORIGINS) {
    if (s === origin || s.startsWith(origin + "/") || s.startsWith(origin + "?")) return true;
  }
  try {
    const u = new URL(s);
    const host = (u.hostname || "").toLowerCase();
    if (ALLOWLIST_HOSTS.includes(host)) return true;
    if (host === "github.com" && u.pathname.toLowerCase().startsWith(GITHUB_IDENTITY_PREFIX)) return true;
    if (host === "vibelock.workers.dev" || host.endsWith(".vibelock.workers.dev")) return true;
    return false;
  } catch {
    return false;
  }
}

function collectUrls(text) {
  const out = [];
  const src = String(text || "");
  src.replace(URL_RE, (m) => {
    const cleaned = m.replace(/[),.;]+$/, "");
    out.push(cleaned);
    return m;
  });
  return out;
}

function hasMzMark(text) {
  const s = String(text || "");
  if (s.startsWith("MZ") || s.includes("\x4d\x5a")) return true;
  if (MZ_B64_RE.test(s)) return true;
  return false;
}

function malwareHits(text) {
  const s = String(text || "");
  const hits = [];
  if (SCRIPT_RE.test(s) || EVAL_RE.test(s) || POWERSHELL_RE.test(s) || CMD_RE.test(s)) {
    hits.push("malware-class");
  } else if (hasMzMark(s)) {
    hits.push("malware-class");
  } else if (BIN_SH_RE.test(s) && RM_RF_RE.test(s)) {
    hits.push("malware-class");
  } else if (DROPPER_MARKS.some((m) => s.toLowerCase().includes(m))) {
    hits.push("malware-class");
  }
  return hits;
}

function poisonHits(text) {
  const s = String(text || "").toLowerCase();
  const hits = [];
  for (const mark of POISON_MARKS) {
    if (s.includes(mark)) {
      hits.push("poison");
      break;
    }
  }
  if (/(^|[^a-z])poison([^a-z]|$)/.test(s) && (s.includes("payload") || s.includes("token") || s.includes("inject"))) {
    if (!hits.includes("poison")) hits.push("poison");
  }
  return hits;
}

function blockKeyHits(envelope) {
  if (!envelope || typeof envelope !== "object") return [];
  const keys = walkKeys(envelope).map((k) => k.toLowerCase());
  if (keys.some((k) => BLOCK_KEYS.includes(k))) return ["airlock-block"];
  return [];
}

function offOriginHits(text) {
  const urls = collectUrls(text);
  if (urls.some((u) => !originAllowed(u))) return ["off-origin"];
  return [];
}

/**
 * inspect(envelope, opts?) → { v:'SG-0.1', airlock, hits, isolate, refuse? }
 * Poison / malware-class / airlock-block always isolate.
 * Off-origin isolates only when inbound and untrusted (SG-WP-0.1 §3).
 * Default: inbound + untrusted (public envelope). FragGate live ops pass untrusted:false.
 */
export async function inspect(envelope, opts = {}) {
  const src = opts && typeof opts === "object" ? opts : {};
  const dir = String(src.dir || "in").toLowerCase() === "out" ? "out" : "in";
  const untrusted = src.untrusted !== false;
  const raw = asText(envelope);
  const hits = [];
  const add = (list) => {
    for (const h of list) {
      if (!hits.includes(h)) hits.push(h);
    }
  };
  add(poisonHits(raw));
  add(malwareHits(raw));
  add(blockKeyHits(envelope && typeof envelope === "object" ? envelope : null));
  add(offOriginHits(raw));

  const isolateOffOrigin = dir === "in" && untrusted;
  const isolate = hits.some((h) => h !== "off-origin" || isolateOffOrigin);
  const digest = await sha256Hex(raw);
  const out = {
    v: SG_VERSION,
    ok: !isolate,
    airlock: isolate ? "closed" : "open",
    hits,
    isolate,
    pull: false,
    qnm: "sweep-before-ingest",
    h: digest.slice(0, 32),
    author: SG_AUTHOR,
  };
  if (isolate) out.refuse = SG_REFUSE;
  return out;
}

export function sweepView(result) {
  if (!result || typeof result !== "object") {
    return { airlock: "closed", hits: ["ungrounded"], isolate: true, pull: false };
  }
  return {
    airlock: result.airlock || (result.isolate ? "closed" : "open"),
    hits: Array.isArray(result.hits) ? result.hits.slice() : [],
    isolate: Boolean(result.isolate),
    pull: false,
  };
}
