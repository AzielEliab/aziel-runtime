/**
 * AZPIPE AP-0.2 — fold-locked admission path.
 *
 * Magic FLD3. Inbound: frag → sweep → fold → static → fold → entry → frag → toolkits
 * Outbound: toolkits → frag → fold → static → fold → sweep → frag
 *
 * fld3-wire when full FoldLock tether suppress is not the hop: non-allowlisted
 * http(s) → [FLD3:url]; block-keys → [FLD3:block].
 *
 * qnm fields reserved. Pipe does NOT join a cell.
 * Not a Softwares-tab product. Author: Aziel Eliab only.
 */

import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { canonicalize, sha256Hex } from "./session-core.js";
import { interact } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";
import { ALLOWLIST_ORIGINS, BLOCK_KEYS, inspect as sweepInspect, originAllowed, sweepView } from "./sweepgate.js";

export const AZPIPE_MAGIC = "FLD3";
export const AZPIPE_VERSION = "AZPIPE-0.2";
export const AZPIPE_SPEC = "AP-WP-0.2";
export const AZPIPE_AUTHOR = "Aziel Eliab";

export const INBOUND_HOPS = Object.freeze([
  "frag",
  "sweep",
  "fold",
  "static",
  "fold",
  "entry",
  "frag",
  "toolkits",
]);

export const OUTBOUND_HOPS = Object.freeze([
  "toolkits",
  "frag",
  "fold",
  "static",
  "fold",
  "sweep",
  "frag",
]);

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;
const BLOCK_KEY_SET = new Set(BLOCK_KEYS);

function qnmSlot() {
  return { ready: false, pull: false, bridges: 2, isolate: true };
}

function emptyish(value) {
  if (value == null) return true;
  if (typeof value === "string") return !value.trim();
  if (typeof value === "number" || typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function clipFact(value) {
  const s =
    value == null
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "object" && value.fact != null
          ? String(value.fact)
          : typeof value === "object" && value.f != null
            ? String(value.f)
            : JSON.stringify(value);
  return s.length > 160 ? s.slice(0, 160) : s;
}

function foldString(text) {
  return String(text || "").replace(URL_RE, (m) => {
    const cleaned = m.replace(/[),.;]+$/, "");
    return originAllowed(cleaned) ? m : "[FLD3:url]";
  });
}

export function fld3Wire(value, key) {
  if (key && BLOCK_KEY_SET.has(String(key).toLowerCase())) return "[FLD3:block]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value.trim()) && !originAllowed(value.trim())) return "[FLD3:url]";
    return foldString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => fld3Wire(item));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = fld3Wire(v, k);
    return out;
  }
  return value;
}

function groundedGates(refuse = null) {
  return { D: true, E: true, I: true, G: !refuse, R: true, refuse };
}

function fragHop(payload, claim, dir = "in") {
  if (dir === "out") {
    return { ok: true, gates: groundedGates(null) };
  }
  if (emptyish(payload) && emptyish(claim)) {
    return {
      ok: false,
      refuse: "ungrounded",
      gates: { D: false, E: false, I: false, G: false, R: false, refuse: "ungrounded" },
    };
  }
  if (!emptyish(payload) && emptyish(claim)) {
    return { ok: true, gates: groundedGates(null) };
  }
  const gate = decisiongateCheck(claim);
  const pass = gate && gate.final_state === "PASS";
  return {
    ok: pass,
    refuse: pass ? null : "ungrounded",
    gates: {
      ...groundedGates(pass ? null : "ungrounded"),
      final_state: gate && gate.final_state,
    },
  };
}

async function staticHop(body, factText, ts) {
  const frozen = body;
  const canonical = canonicalize(frozen);
  const h = await sha256Hex(canonical);
  const fact = clipFact(factText != null ? factText : frozen);
  const fh = await sha256Hex(fact);
  return {
    body: frozen,
    canonical,
    h,
    fh,
    fact,
    ts: ts || new Date().toISOString(),
  };
}

function envelopeBase(dir, path) {
  return {
    magic: AZPIPE_MAGIC,
    v: AZPIPE_VERSION,
    dir,
    path: path.slice(),
    ok: true,
    h: null,
    fh: null,
    isolate: { in: false, out: false },
    gates: { D: null, E: null, I: null, G: null, R: null, refuse: null },
    sweep: { airlock: "open", hits: [], isolate: false, pull: false },
    foldlock: false,
    teth: "fld3-wire",
    qnm: qnmSlot(),
    inner: null,
    author: AZPIPE_AUTHOR,
  };
}

function stopAt(env, hop, refuse) {
  env.ok = false;
  env.refuse = refuse;
  env.closed_at = hop;
  env.inner = null;
  return env;
}

export function thinPipe(env) {
  if (!env || typeof env !== "object") return null;
  return {
    v: env.v || AZPIPE_VERSION,
    magic: env.magic || AZPIPE_MAGIC,
    path: Array.isArray(env.path) ? env.path.slice() : [],
    h: env.h || null,
    fh: env.fh || null,
    iso: Boolean((env.isolate && (env.isolate.in || env.isolate.out)) || env.sweep && env.sweep.isolate),
    qnm: env.qnm || qnmSlot(),
  };
}

export function arch() {
  return {
    v: AZPIPE_VERSION,
    magic: AZPIPE_MAGIC,
    inbound: INBOUND_HOPS.slice(),
    outbound: OUTBOUND_HOPS.slice(),
    teth: "fld3-wire",
    allowlist: ALLOWLIST_ORIGINS.slice(),
    qnm: qnmSlot(),
    joins_cell: false,
    software_tab: false,
    author: AZPIPE_AUTHOR,
  };
}

/**
 * Inbound admission. Refuse envelopes stop at the hop that closed.
 * Memory/tools never see raw inbound bytes once admitted (folded inner).
 */
export async function pipeInbound(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const env = envelopeBase("in", INBOUND_HOPS);
  const claim = src.claim || null;
  let payload = src.payload !== undefined ? src.payload : src.inner;

  const frag1 = fragHop(payload, claim);
  env.gates = frag1.gates;
  if (!frag1.ok) return stopAt(env, "frag", frag1.refuse || "ungrounded");

  const sweep = await sweepInspect(payload);
  env.sweep = sweepView(sweep);
  if (sweep.isolate) {
    env.isolate.in = true;
    return stopAt(env, "sweep", sweep.refuse || "sweep-isolate");
  }

  const folded1 = fld3Wire(payload);
  const frozen = await staticHop(folded1, src.fact);
  const folded2 = fld3Wire(frozen.body);
  const frozen2 = await staticHop(folded2, frozen.fact, frozen.ts);
  env.h = frozen2.h;
  env.fh = frozen2.fh;
  env.teth = "fld3-wire";
  env.foldlock = false;

  let entry = null;
  if (src.entry !== false) {
    const store = storeFor(src.env || src.store);
    entry = await interact(store, {
      k: src.kind || "entry",
      subject: src.subject || src.slug || "azpipe",
      fact: frozen2.fact,
      pipe: thinPipe({ ...env, path: INBOUND_HOPS }),
    });
    if (!entry.ok) return stopAt(env, "entry", entry.refuse || "no-stamp");
  }

  const card = entry && entry.card;
  if (src.require_ground !== false && card && !(card.h && card.fh)) {
    return stopAt(env, "frag", "ungrounded");
  }

  env.ok = true;
  env.inner = {
    entry: card || null,
    toolkit: null,
    static: { h: frozen2.h, fh: frozen2.fh, ts: frozen2.ts, body: folded2 },
  };
  env.admitted = folded2;
  return env;
}

export async function pipeOutbound(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const env = envelopeBase("out", OUTBOUND_HOPS);
  let result = src.result !== undefined ? src.result : src.payload;

  const frag1 = fragHop(result, src.claim, "out");
  env.gates = frag1.gates;
  if (!frag1.ok) return stopAt(env, "frag", frag1.refuse || "ungrounded");

  const folded1 = fld3Wire(result);
  const frozen = await staticHop(folded1, src.fact);
  const folded2 = fld3Wire(frozen.body);
  const frozen2 = await staticHop(folded2, frozen.fact, frozen.ts);
  env.h = frozen2.h;
  env.fh = frozen2.fh;
  env.teth = "fld3-wire";
  env.foldlock = false;

  const sweep = await sweepInspect(folded2);
  env.sweep = sweepView(sweep);
  if (sweep.isolate) {
    env.isolate.out = true;
    return stopAt(env, "sweep", sweep.refuse || "sweep-isolate");
  }

  const frag2 = fragHop(folded2, src.claim, "out");
  if (!frag2.ok) return stopAt(env, "frag", frag2.refuse || "ungrounded");

  env.ok = true;
  env.inner = {
    entry: null,
    toolkit: folded2,
    static: { h: frozen2.h, fh: frozen2.fh, ts: frozen2.ts, body: folded2 },
  };
  env.admitted = folded2;
  return env;
}

export async function pipe(input = {}) {
  const dir = String((input && input.dir) || "in").toLowerCase() === "out" ? "out" : "in";
  return dir === "out" ? pipeOutbound(input) : pipeInwardSafe(input);
}

async function pipeInwardSafe(input) {
  return pipeInbound(input);
}

export { ALLOWLIST_ORIGINS };
