/**
 * AZPIPE AP-0.2 — locked MASTER-33 admission path (runtime 1.7.0).
 *
 * HARD LAW — FragGate is THE SINGLE DOOR. User-locked strip overrides
 * MASTER-ARCHITECTURE-2.0 §4.2 (Lamb Lens after FragGate, not before):
 *
 *   Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens
 *   → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN
 *   → DecisionGATE → AZPIPE → Internal Domain Layer (isolated softwares,
 *   NOT additional doors) → optional ASE → RoseClock (forward-only;
 *   StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT
 *   → ForgeReceipts → Return
 *
 * FoldLock fld3-wire stays INTERNAL. Lamb Lens is fabric ethics AFTER FragGate.
 * Domains are isolation labels, not doors. No ZD30. No rollback.
 *
 * Magic FLD3. qnm fields reserved. Pipe does NOT join a cell.
 * Not a Softwares-tab product. Author: Aziel Eliab only.
 */

import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { genesis as temporalGenesis } from "./engines/temporallock/engine.js";
import { appendClick as staticClick } from "./engines/staticclock/engine.js";
import { receipt as forgeReceipt } from "./engines/forgereceipts/engine.js";
import { canonicalize, sha256Hex } from "./session-core.js";
import { interact } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";
import { ALLOWLIST_ORIGINS, BLOCK_KEYS, inspect as sweepInspect, originAllowed, sweepView } from "./sweepgate.js";
import { lambLensCheck, lambLensView } from "./lamblens.js";
import { sentinelInspect, sentinelView } from "./sentinel.js";
import { buildInputPacket, provenanceView } from "./provenance.js";
import { advance as roseAdvance } from "./roseclock/engine.js";
import { aseCite, aseCall } from "./ase.js";
import { vectorCite, vectorCall } from "./vector.js";
import { domainFields, domainMapView } from "./domain-map.js";

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
  human: "Human",
  azinterface: "AZInterface",
  public: "PUBLIC/UI/AGENT/API",
  fraggate: "FragGate",
  "lamb-lens": "Lamb Lens",
  sweepgate: "SweepGate",
  sentinel: "Sentinel",
  provenance: "Provenance/Input Packet",
  "chainlock-in": "ChainLock-IN",
  decisiongate: "DecisionGATE",
  azpipe: "AZPIPE",
  "domain-layer": "Internal Domain Layer",
  ase: "optional ASE",
  roseclock: "RoseClock",
  staticclock: "StaticClock",
  temporallock: "TemporalLock",
  "chainlock-out": "ChainLock-OUT",
  forgereceipts: "ForgeReceipts",
  return: "Return",
});

/** Locked public inbound (admission through Return). MASTER-33. */
export const INBOUND_HOPS = Object.freeze([
  "human",
  "azinterface",
  "public",
  "fraggate",
  "lamb-lens",
  "sweepgate",
  "sentinel",
  "provenance",
  "chainlock-in",
  "decisiongate",
  "azpipe",
  "domain-layer",
  "ase",
  "roseclock",
  "staticclock",
  "temporallock",
  "chainlock-out",
  "forgereceipts",
  "return",
]);

/** Sensible reverse. ChainLock-IN is inbound-only. */
export const OUTBOUND_HOPS = Object.freeze([
  "return",
  "forgereceipts",
  "chainlock-out",
  "temporallock",
  "staticclock",
  "roseclock",
  "ase",
  "domain-layer",
  "azpipe",
  "decisiongate",
  "provenance",
  "sentinel",
  "sweepgate",
  "lamb-lens",
  "fraggate",
  "public",
  "azinterface",
  "human",
]);

export const LOCKED_STRIP =
  "Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return";

export const LOCKED_STRIP_OUT =
  "Return → ForgeReceipts → ChainLock-OUT → TemporalLock → StaticClock → RoseClock → optional ASE → Internal Domain Layer → AZPIPE → DecisionGATE → Provenance/Input Packet → Sentinel → SweepGate → Lamb Lens → FragGate → PUBLIC/UI/AGENT/API → AZInterface → Human";

/** 1.6.15 public list — refused on the 1.7.0 surface. */
export const OLD_SUITE_PIPE_INBOUND = Object.freeze([
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

/** 4DMap stays a Research-domain inspection frame inside Internal Domain Layer — not a door. */
export const DOMAIN_DOORS_INSPECTION = Object.freeze({
  slug: "4dmap",
  spec: "4DM-WP-1.0",
  frame: "T/Δ/Γ/Π",
  role: "inspection",
  sequential_gate: false,
  software_tab: true,
  fabric: false,
  domain: "Research",
  domain_id: "06",
  note: "4DMap is a Research-domain inspection frame T/Δ/Γ/Π inside Internal Domain Layer after AZPIPE. Isolated software, not an additional door. Not a sequential gate. Not LIVE fabric.",
});

export const DOMAIN_LAYER = Object.freeze({
  name: "Internal Domain Layer",
  doors: false,
  isolated_softwares: true,
  inspection: { ...DOMAIN_DOORS_INSPECTION },
  note: "Isolated softwares execute here after AZPIPE. Domains are isolation labels, not doors. FragGate is THE single door.",
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
      "Locked MASTER-33 hop order. FragGate is THE single door. Changing product names does not change the list. Lamb Lens is fabric after FragGate — not a second door. LambGate is not a hop. FoldLock fld3-wire is internal to AZPIPE. No rollback.",
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
    doors: false,
    layer: "Internal Domain Layer",
    inspection: { ...DOMAIN_DOORS_INSPECTION },
  };
}

export function domainLayerCite(slug) {
  const fields = domainFields(slug);
  return {
    ...DOMAIN_LAYER,
    slug: slug || null,
    domain: fields.domain,
    domain_id: fields.domain_id,
    placement: fields.placement,
    map: domainMapView(),
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
    domain_layer: { ...DOMAIN_LAYER },
    locked: true,
    lambgate: false,
    fraggate_single_door: true,
    rollback: false,
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
    fraggate_single_door: true,
  };
}

export function arch() {
  return {
    v: AZPIPE_VERSION,
    magic: AZPIPE_MAGIC,
    locked: true,
    master: "MASTER-33",
    lambgate: false,
    lamb_lens: true,
    fraggate_single_door: true,
    roseclock: true,
    rollback: false,
    inbound: INBOUND_HOPS.slice(),
    outbound: OUTBOUND_HOPS.slice(),
    labels: { ...HOP_LABELS },
    strip: LOCKED_STRIP,
    strip_out: LOCKED_STRIP_OUT,
    teth: "fld3-wire",
    foldlock_internal: true,
    internal_fld3: INTERNAL_FLD3_HOPS.slice(),
    domain_doors: domainDoorsCite(),
    domain_layer: { ...DOMAIN_LAYER },
    domains: domainMapView(),
    ase: aseCite(),
    vector: vectorCite(),
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

async function stampChain(store, kind, subject, fact, pipe, extra = {}) {
  return interact(store, {
    k: kind,
    subject,
    fact,
    pipe,
    rose_transition_hash: extra.rose_transition_hash || null,
    temporal_hash: extra.temporal_hash || null,
    provenance_hash: extra.provenance_hash || null,
  });
}

async function advisoryTemporal(summary, evidence, roseHash) {
  try {
    const stamped = roseHash ? `${evidence}\nrose_transition_hash=${roseHash}` : evidence;
    const out = await temporalGenesis({
      summary,
      evidence: stamped,
      confidence: 1.0,
    });
    const rec = out && out.receipt ? out.receipt : null;
    return {
      kind: "TemporalLock",
      slug: "temporallock",
      advisory: true,
      software_tab: true,
      domain: "Core Time",
      domain_id: "11",
      hash: rec && rec.hash ? rec.hash : null,
      timestamp: rec && rec.timestamp ? rec.timestamp : null,
      rose_transition_hash: roseHash || null,
    };
  } catch {
    return {
      kind: "TemporalLock",
      slug: "temporallock",
      advisory: true,
      hash: null,
      rose_transition_hash: roseHash || null,
      refuse: "advisory-skip",
    };
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
 * Inbound admission. Public path is the locked MASTER-33 list.
 * Executed hops: human/AZInterface/public → FragGate → Lamb Lens → SweepGate
 * → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE (fld3)
 * → Internal Domain Layer (cite).
 * ASE / RoseClock / StaticClock / TemporalLock / ChainLock-OUT / ForgeReceipts / Return run on outbound.
 * Refuse envelopes stop at the hop that closed.
 */
export async function pipeInbound(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const order = src.path;
  if (order) {
    const check = refuseReorder(order, "in");
    if (!check.ok) {
      const env = envelopeBase("in", INBOUND_HOPS);
      return stopAt(Object.assign(env, { reorder: check }), "human", REORDER_REFUSE);
    }
  }
  const env = envelopeBase("in", INBOUND_HOPS);
  env.human = true;
  env.azinterface = "human-ui";
  env.public = "ui/agent/api";
  const claim = src.claim || null;
  let payload = src.payload !== undefined ? src.payload : src.inner;

  const door = fraggateSurfaceHop(payload, claim);
  env.gates = door.gates;
  if (!door.ok) return stopAt(env, "fraggate", door.refuse || "ungrounded");

  const lamb = lambLensCheck({
    payload,
    claim,
    slug: src.slug,
    op: src.op,
    statement: claim && claim.statement,
  });
  env.lamb_lens = lambLensView(lamb);
  if (lamb.decision === "REFUSE") return stopAt(env, "lamb-lens", "lamb-refuse");
  if (lamb.decision === "HOLD-UNCERTAIN") return stopAt(env, "lamb-lens", "lamb-hold");

  const sweep = await sweepInspect(payload, {
    dir: "in",
    untrusted: src.untrusted !== false,
  });
  env.sweep = sweepView(sweep);
  if (sweep.isolate) {
    env.isolate.in = true;
    return stopAt(env, "sweepgate", sweep.refuse || "sweep-isolate");
  }

  const sentinel = sentinelInspect({ payload, slug: src.slug, op: src.op });
  env.sentinel = sentinelView(sentinel);
  if (sentinel.stop) return stopAt(env, "sentinel", sentinel.refuse || "sentinel-reject");

  const packet = await buildInputPacket({
    payload,
    slug: src.slug,
    op: src.op,
    untrusted: src.untrusted,
    source_type: src.source_type || "fraggate-call",
  });
  env.provenance = provenanceView(packet);

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
      { provenance_hash: packet.content_hash },
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
  env.domain_layer = domainLayerCite(src.slug);
  env.ok = true;
  env.inner = {
    entry: card || null,
    toolkit: null,
    static: { h: admitted.frozen.h, fh: admitted.frozen.fh, ts: admitted.frozen.ts, body: admitted.folded },
    inspection: env.domain_doors.inspection,
    provenance: packet,
    lamb_lens: env.lamb_lens,
    sentinel: env.sentinel,
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
      return stopAt(Object.assign(env, { reorder: check }), "return", REORDER_REFUSE);
    }
  }
  const env = envelopeBase("out", OUTBOUND_HOPS);
  env.human = true;
  env.azinterface = "human-ui";
  env.public = "ui/agent/api";
  let result = src.result !== undefined ? src.result : src.payload;

  if (src.ase === true || src.arm_ase === true) {
    env.ase = aseCall();
    return stopAt(env, "ase", "ase-unarmed");
  }
  if (src.vector === true || src.arm_vector === true) {
    env.vector = vectorCall();
    return stopAt(env, "roseclock", "vector-unarmed");
  }
  env.ase = aseCite();
  env.vector = vectorCite();

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

  const rose = await roseAdvance({
    rose_id: src.rose_id || "aziel-runtime",
    action: src.op || src.slug || "pipe-out",
    action_class: src.action_class || "EXECUTE",
    result_hash: env.fh,
    actor_id: "aziel-runtime",
  });
  if (!rose.ok) return stopAt(env, "roseclock", rose.refuse || "rose-refuse");
  env.roseclock = {
    sequence: rose.after && rose.after.sequence,
    transition_hash: rose.transition && rose.transition.transition_hash,
    action_class: rose.transition && rose.transition.action_class,
    rollback: false,
  };
  const roseHash = env.roseclock.transition_hash;

  const evidence = env.fh || admitted.frozen.fact || "outbound receipt";
  const temporal = await advisoryTemporal("azpipe outbound receipt", String(evidence), roseHash);
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
      {
        rose_transition_hash: roseHash,
        temporal_hash: temporal && temporal.hash,
        provenance_hash: src.provenance_hash || null,
      },
    );
    if (!exit.ok) return stopAt(env, "chainlock-out", exit.refuse || "no-stamp");
  }

  let forged = null;
  try {
    forged = await forgeReceipt({
      note: clipFact(src.fact != null ? src.fact : admitted.frozen.fact) || `${src.slug || "azpipe"} return`,
      kind: "runtime-return",
      summary: `FragGate return ${src.slug || "azpipe"} ${src.op || ""}`.trim(),
      context: {
        kind: "runtime-return",
        rose_transition_hash: roseHash,
        temporallock_hash: temporal && temporal.hash,
        chainlock_out: exit && exit.card ? exit.card.h : null,
      },
    });
  } catch {
    forged = { ok: false, refuse: "forge-skip" };
  }
  env.forgereceipts = forged && forged.ok ? { hash: forged.receipt && forged.receipt.hash, ok: true } : { ok: false };

  env.domain_doors = domainDoorsCite();
  env.domain_layer = domainLayerCite(src.slug);
  env.ok = true;
  env.response = true;
  env.return = true;
  env.inner = {
    entry: null,
    exit: exit && exit.card ? exit.card : null,
    toolkit: admitted.folded,
    static: { h: admitted.frozen.h, fh: admitted.frozen.fh, ts: admitted.frozen.ts, body: admitted.folded },
    temporal,
    staticclock,
    roseclock: env.roseclock,
    forgereceipts: env.forgereceipts,
    ase: env.ase,
    vector: env.vector,
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
