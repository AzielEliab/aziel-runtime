/**
 * AZPIPE AP-0.2 — locked suite admission path (runtime 1.6.15).
 *
 * Public hop list (LOCKED — illegal reorder is refused; LambGate is not a hop):
 *   PUBLIC/UI/Agents → FragGate → SweepGate → ChainLock-IN → DecisionGATE
 *   → AZPIPE → Domain Doors (4DMap inspection) → TemporalLock → StaticClock
 *   → ChainLock-OUT → Response/Receipt
 *
 * Outbound reverses sensibly:
 *   Response/Receipt → ChainLock-OUT → StaticClock → TemporalLock
 *   → Domain Doors → AZPIPE → DecisionGATE → SweepGate → FragGate → PUBLIC/UI/Agents
 *
 * FoldLock fld3-wire (fold → static → fold) stays an INTERNAL AZPIPE mechanism.
 * SweepGate / ChainLock / AZPIPE are fabric — not Softwares-tab products.
 * 4DMap (`4dmap`) is cited at Domain Doors as a read-side inspection frame, not a sequential gate.
 *
 * Magic FLD3. qnm fields reserved. Pipe does NOT join a cell.
 * Not a Softwares-tab product. Author: Aziel Eliab only.
 */

import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { genesis as temporalGenesis } from "./engines/temporallock/engine.js";
import { appendClick as staticClick } from "./engines/staticclock/engine.js";
import { canonicalize, sha256Hex } from "./session-core.js";
import { interact } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";
import { ALLOWLIST_ORIGINS, BLOCK_KEYS, inspect as sweepInspect, originAllowed, sweepView } from "./sweepgate.js";

export const AZPIPE_MAGIC = "FLD3";
export const AZPIPE_VERSION = "AZPIPE-0.2";
export const AZPIPE_SPEC = "AP-WP-0.2";
export const AZPIPE_AUTHOR = "Aziel Eliab";
export const REORDER_REFUSE = "illegal-reorder";

/** Historical fold-centric list — internal only; public arch() must not show this as the hop list. */
export const INTERNAL_FLD3_HOPS = Object.freeze(["fold", "static", "fold"]);
export const OLD_FOLD_CENTRIC_INBOUND = Object.freeze([
  "frag",
  "sweep",
  "fold",
  "static",
  "fold",
  "entry",
  "frag",
  "toolkits",
]);
export const OLD_FOLD_CENTRIC_OUTBOUND = Object.freeze([
  "toolkits",
  "frag",
  "fold",
  "static",
  "fold",
  "sweep",
  "frag",
]);

export const HOP_LABELS = Object.freeze({
  public: "PUBLIC/UI/Agents",
  fraggate: "FragGate",
  sweepgate: "SweepGate",
  "chainlock-in": "ChainLock-IN",
  decisiongate: "DecisionGATE",
  azpipe: "AZPIPE",
  "domain-doors": "Domain Doors",
  temporallock: "TemporalLock",
  staticclock: "StaticClock",
  "chainlock-out": "ChainLock-OUT",
  response: "Response/Receipt",
});

/** Locked public inbound (admission through receipt). */
export const INBOUND_HOPS = Object.freeze([
  "public",
  "fraggate",
  "sweepgate",
  "chainlock-in",
  "decisiongate",
  "azpipe",
  "domain-doors",
  "temporallock",
  "staticclock",
  "chainlock-out",
  "response",
]);

/** Sensible reverse. ChainLock-IN becomes ChainLock-OUT on the way out. */
export const OUTBOUND_HOPS = Object.freeze([
  "response",
  "chainlock-out",
  "staticclock",
  "temporallock",
  "domain-doors",
  "azpipe",
  "decisiongate",
  "sweepgate",
  "fraggate",
  "public",
]);

export const LOCKED_STRIP =
  "PUBLIC/UI/Agents → FragGate → SweepGate → ChainLock-IN → DecisionGATE → AZPIPE → Domain Doors (4DMap inspection) → TemporalLock → StaticClock → ChainLock-OUT → Response/Receipt";

export const LOCKED_STRIP_OUT =
  "Response/Receipt → ChainLock-OUT → StaticClock → TemporalLock → Domain Doors → AZPIPE → DecisionGATE → SweepGate → FragGate → PUBLIC/UI/Agents";

export const DOMAIN_DOORS_INSPECTION = Object.freeze({
  slug: "4dmap",
  spec: "4DM-WP-1.0",
  frame: "T/Δ/Γ/Π",
  role: "inspection",
  sequential_gate: false,
  software_tab: true,
  fabric: false,
  note: "4DMap is a Domain Door / inspection layer after AZPIPE. Live catalog engines execute here. Not a sequential Softwares-tab gate. Not LIVE fabric.",
});

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;
/** AP-WP-0.2 fld3-wire: password, private_key, secret, ssn, legal_name, home_address. */
export const FOLD_BLOCK_KEYS = Object.freeze([...new Set([...BLOCK_KEYS, "ssn"])]);
const BLOCK_KEY_SET = new Set(FOLD_BLOCK_KEYS);

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

function listsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((hop, i) => hop === b[i]);
}

/**
 * Locked hop order. Changing product names does not change the list.
 * LambGate is not a hop. The old fold-centric list is refused on the public surface.
 */
export function refuseReorder(candidate, dir = "in") {
  const locked = String(dir).toLowerCase() === "out" ? OUTBOUND_HOPS : INBOUND_HOPS;
  const list = Array.isArray(candidate) ? candidate.map((h) => String(h)) : [];
  if (listsEqual(list, locked)) {
    return { ok: true, path: locked.slice(), locked: true, lambgate: false };
  }
  return {
    ok: false,
    refuse: REORDER_REFUSE,
    message:
      "Locked suite hop order. Changing product names does not change the list. LambGate is not a hop. FoldLock fld3-wire is internal to AZPIPE.",
    locked: locked.slice(),
    got: list.slice(),
    old_fold_centric: false,
    lambgate: false,
    author: AZPIPE_AUTHOR,
  };
}

export function domainDoorsCite() {
  return {
    engines: "live-catalog",
    inspection: { ...DOMAIN_DOORS_INSPECTION },
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
    domain_doors: domainDoorsCite(),
    locked: true,
    lambgate: false,
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
    iso: Boolean((env.isolate && (env.isolate.in || env.isolate.out)) || (env.sweep && env.sweep.isolate)),
    qnm: env.qnm || qnmSlot(),
    locked: true,
    lambgate: false,
  };
}

export function arch() {
  return {
    v: AZPIPE_VERSION,
    magic: AZPIPE_MAGIC,
    locked: true,
    lambgate: false,
    inbound: INBOUND_HOPS.slice(),
    outbound: OUTBOUND_HOPS.slice(),
    labels: { ...HOP_LABELS },
    strip: LOCKED_STRIP,
    strip_out: LOCKED_STRIP_OUT,
    teth: "fld3-wire",
    foldlock_internal: true,
    internal_fld3: INTERNAL_FLD3_HOPS.slice(),
    domain_doors: domainDoorsCite(),
    allowlist: ALLOWLIST_ORIGINS.slice(),
    qnm: qnmSlot(),
    joins_cell: false,
    software_tab: false,
    reorder_refuse: REORDER_REFUSE,
    author: AZPIPE_AUTHOR,
  };
}

function fraggateSurfaceHop(payload, claim) {
  if (emptyish(payload) && emptyish(claim)) {
    return {
      ok: false,
      refuse: "ungrounded",
      gates: { D: false, E: false, I: false, G: false, R: false, refuse: "ungrounded" },
    };
  }
  return { ok: true, gates: groundedGates(null) };
}

function decisiongateHop(payload, claim) {
  if (emptyish(claim)) {
    return { ok: true, gates: groundedGates(null), gate: null };
  }
  const gate = decisiongateCheck(claim);
  const pass = gate && gate.final_state === "PASS";
  return {
    ok: pass,
    refuse: pass ? null : "ungrounded",
    gate,
    gates: {
      ...groundedGates(pass ? null : "ungrounded"),
      final_state: gate && gate.final_state,
    },
  };
}

async function fld3Admit(payload, fact) {
  const folded1 = fld3Wire(payload);
  const frozen = await staticHop(folded1, fact);
  const folded2 = fld3Wire(frozen.body);
  const frozen2 = await staticHop(folded2, frozen.fact, frozen.ts);
  return { folded: folded2, frozen: frozen2 };
}

async function stampChain(store, kind, subject, fact, pipe) {
  return interact(store, {
    k: kind,
    subject,
    fact,
    pipe,
  });
}

async function advisoryTemporal(summary, evidence) {
  try {
    const out = await temporalGenesis({
      summary,
      evidence,
      confidence: 1.0,
    });
    const rec = out && out.receipt ? out.receipt : null;
    return {
      kind: "TemporalLock",
      slug: "temporallock",
      advisory: true,
      software_tab: true,
      hash: rec && rec.hash ? rec.hash : null,
      timestamp: rec && rec.timestamp ? rec.timestamp : null,
    };
  } catch {
    return { kind: "TemporalLock", slug: "temporallock", advisory: true, hash: null, refuse: "advisory-skip" };
  }
}

async function advisoryStatic(action) {
  try {
    const out = await staticClick([], action, "azpipe");
    const tick = out && out.click ? out.click : null;
    return {
      kind: "StaticClock",
      slug: "staticclock",
      advisory: true,
      software_tab: true,
      click: tick && tick.click != null ? tick.click : null,
      hash: tick && tick.hash ? tick.hash : null,
    };
  } catch {
    return { kind: "StaticClock", slug: "staticclock", advisory: true, hash: null, refuse: "advisory-skip" };
  }
}

/**
 * Inbound admission. Public path is the locked suite list.
 * Executed hops: public → fraggate → sweepgate → chainlock-in → decisiongate → azpipe (fld3) → domain-doors.
 * TemporalLock / StaticClock / ChainLock-OUT / Response run on outbound.
 * Refuse envelopes stop at the hop that closed.
 */
export async function pipeInbound(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const order = src.path;
  if (order) {
    const check = refuseReorder(order, "in");
    if (!check.ok) {
      const env = envelopeBase("in", INBOUND_HOPS);
      return stopAt(Object.assign(env, { reorder: check }), "public", REORDER_REFUSE);
    }
  }
  const env = envelopeBase("in", INBOUND_HOPS);
  env.public = "ui/agents";
  const claim = src.claim || null;
  let payload = src.payload !== undefined ? src.payload : src.inner;

  const door = fraggateSurfaceHop(payload, claim);
  env.gates = door.gates;
  if (!door.ok) return stopAt(env, "fraggate", door.refuse || "ungrounded");

  const sweep = await sweepInspect(payload, {
    dir: "in",
    untrusted: src.untrusted !== false,
  });
  env.sweep = sweepView(sweep);
  if (sweep.isolate) {
    env.isolate.in = true;
    return stopAt(env, "sweepgate", sweep.refuse || "sweep-isolate");
  }

  const preFact = clipFact(src.fact != null ? src.fact : payload);
  let entry = null;
  if (src.entry !== false) {
    const store = storeFor(src.env || src.store);
    entry = await stampChain(
      store,
      src.kind || "in",
      src.subject || src.slug || "azpipe",
      preFact || "inbound admitted",
      thinPipe({ ...env, path: INBOUND_HOPS }),
    );
    if (!entry.ok) return stopAt(env, "chainlock-in", entry.refuse || "no-stamp");
  }

  const dg = decisiongateHop(payload, claim);
  env.gates = dg.gates;
  env.gate_check = dg.gate;
  if (!dg.ok) return stopAt(env, "decisiongate", dg.refuse || "ungrounded");

  const admitted = await fld3Admit(payload, src.fact != null ? src.fact : preFact);
  env.h = admitted.frozen.h;
  env.fh = admitted.frozen.fh;
  env.teth = "fld3-wire";
  env.foldlock = false;
  env.internal_fld3 = INTERNAL_FLD3_HOPS.slice();

  const card = entry && entry.card;
  if (src.require_ground !== false && card && !(card.h && card.fh)) {
    return stopAt(env, "chainlock-in", "ungrounded");
  }

  env.domain_doors = domainDoorsCite();
  env.ok = true;
  env.inner = {
    entry: card || null,
    toolkit: null,
    static: { h: admitted.frozen.h, fh: admitted.frozen.fh, ts: admitted.frozen.ts, body: admitted.folded },
    inspection: env.domain_doors.inspection,
  };
  env.admitted = admitted.folded;
  return env;
}

export async function pipeOutbound(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const order = src.path;
  if (order) {
    const check = refuseReorder(order, "out");
    if (!check.ok) {
      const env = envelopeBase("out", OUTBOUND_HOPS);
      return stopAt(Object.assign(env, { reorder: check }), "response", REORDER_REFUSE);
    }
  }
  const env = envelopeBase("out", OUTBOUND_HOPS);
  env.public = "ui/agents";
  let result = src.result !== undefined ? src.result : src.payload;

  const door = fraggateSurfaceHop(result, src.claim || { statement: "outbound" });
  env.gates = door.gates;
  if (!door.ok) return stopAt(env, "fraggate", door.refuse || "ungrounded");

  const admitted = await fld3Admit(result, src.fact);
  env.h = admitted.frozen.h;
  env.fh = admitted.frozen.fh;
  env.teth = "fld3-wire";
  env.foldlock = false;
  env.internal_fld3 = INTERNAL_FLD3_HOPS.slice();

  const sweep = await sweepInspect(admitted.folded, {
    dir: "out",
    untrusted: src.untrusted !== false,
  });
  env.sweep = sweepView(sweep);
  if (sweep.isolate) {
    env.isolate.out = true;
    return stopAt(env, "sweepgate", sweep.refuse || "sweep-isolate");
  }

  const evidence = env.fh || admitted.frozen.fact || "outbound receipt";
  const temporal = await advisoryTemporal("azpipe outbound receipt", String(evidence));
  const staticclock = await advisoryStatic("pipe-out");

  let exit = null;
  if (src.entry !== false) {
    const store = storeFor(src.env || src.store);
    exit = await stampChain(
      store,
      src.kind || "out",
      src.subject || src.slug || "azpipe",
      clipFact(src.fact != null ? src.fact : admitted.frozen.fact) || "outbound receipt",
      thinPipe({ ...env, path: OUTBOUND_HOPS }),
    );
    if (!exit.ok) return stopAt(env, "chainlock-out", exit.refuse || "no-stamp");
  }

  env.domain_doors = domainDoorsCite();
  env.ok = true;
  env.response = true;
  env.inner = {
    entry: null,
    exit: exit && exit.card ? exit.card : null,
    toolkit: admitted.folded,
    static: { h: admitted.frozen.h, fh: admitted.frozen.fh, ts: admitted.frozen.ts, body: admitted.folded },
    temporal,
    staticclock,
    inspection: env.domain_doors.inspection,
  };
  env.admitted = admitted.folded;
  return env;
}

export async function pipe(input = {}) {
  const dir = String((input && input.dir) || "in").toLowerCase() === "out" ? "out" : "in";
  return dir === "out" ? pipeOutbound(input) : pipeInbound(input);
}

export { ALLOWLIST_ORIGINS };
