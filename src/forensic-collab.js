/**
 * AZBot Node Collaborative Forensic Design 1.0 — runtime support.
 *
 * AZBot packages a FragGate call. This module does not exec and is not a
 * second door. A multi-party session shares the receipt tip only. Other
 * parties can read that tip. They cannot rewrite it. The handoff receipt
 * is the session dual lattice plus a ChainLock stamp and a TemporalLock
 * receipt of the same tip hash. Mesh presence stays operator-gated
 * (MESH-NEED-BEARER). Live hardware is local qnm-node. GET /v1/mesh never
 * enables. Cap-7 and .aziel stay names, not ICANN.
 *
 * Author: Aziel Eliab. License: Apache-2.0.
 */
import { sha256Hex } from "./session-core.js";
import { currentAltInternetFact } from "./alt-internet-fact.js";
import { TETHER_SPEC } from "./azos-tether.js";

export const FORENSIC_SPEC = "AZBOT-NODE-COLLAB-FORENSIC-1.0";
export const FORENSIC_TITLE = "AZBot Node Collaborative Forensic Design 1.0";
export const LOCAL_QNM_NODE = "qnm-node";
export const PARTY_CAP = 16;

export const REMAIN_OFF = Object.freeze({
  get_v1_mesh_never_enables: true,
  azos_public_exec_shell_lattice: "refused",
  vault_wipe_scorch_unlock: "local-only / FG-STUB",
  deanonymize: "refused",
  invent_mark: "refused",
  backdate: "refused",
  public_rollback: "refused",
  fraggate_single_door: true,
  local_first_sessions: true,
});

const REWRITE_KEYS = Object.freeze([
  "tip",
  "hash",
  "prev_hash",
  "head_hash",
  "receipts",
  "receipt",
  "chain",
  "lattice",
  "primary",
  "secondary",
  "backdate",
  "invent_mark",
  "rollback",
  "deanonymize",
  "unmask",
  "identify",
  "public_rollback",
  "history_rewrite",
]);

const STUB_OPS_HERE = Object.freeze([
  "vpn",
  "arm",
  "mesh-join",
  "mesh_join",
  "exec",
  "shell",
  "lattice",
  "wipe",
  "scorch",
  "unlock",
  "deanonymize",
  "invent_mark",
  "backdate",
  "backdate_class",
  "rollback",
]);

function earnedMeshFlags() {
  const fact = currentAltInternetFact();
  const alt = fact.alt_internet_live === true;
  const packet = fact.packet_path_live === true;
  const second = fact.second_device === true;
  return {
    alt_internet_live: alt,
    packet_path_live: packet,
    second_device: second,
    mesh_node_live: alt && packet && second,
    earned_by: "QNM",
  };
}

export function meshCite() {
  return {
    get_never_enables: true,
    radios_enabled_by_get: false,
    operator_gate: "MESH-NEED-BEARER",
    local_node: LOCAL_QNM_NODE,
    cap7_names_only: true,
    public_icann: false,
    ...earnedMeshFlags(),
    note: "GET /v1/mesh never enables. mesh_node_live, alt_internet_live, and packet_path_live earn LIVE together when a packet leaves this machine and arrives on a different machine id. Cap-7 and .aziel are names, not ICANN. Live hardware is local qnm-node.",
  };
}

export function rewriteRefusal() {
  return {
    ok: false,
    spec: FORENSIC_SPEC,
    code: "FORENSIC-NO-REWRITE",
    rewrite: false,
    written: false,
    share: "receipt_tip_only",
    remain_off: REMAIN_OFF,
    message: "Other parties can read the receipt tip. They cannot rewrite it.",
  };
}

function rewriteAttempt(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  for (const key of REWRITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) return true;
  }
  return false;
}

function refusedOp(body) {
  const op = body && body.op != null ? String(body.op).trim().toLowerCase() : "";
  return STUB_OPS_HERE.includes(op) ? op : "";
}

export function packageHandoff(slug, op, payload) {
  const s = String(slug || "").trim().toLowerCase();
  const o = String(op || "").trim();
  if (!s || !o) {
    return { ok: false, spec: FORENSIC_SPEC, code: "FORENSIC-NEED-HANDOFF", door: "fraggate", executed: false, remain_off: REMAIN_OFF };
  }
  return {
    ok: true,
    spec: FORENSIC_SPEC,
    door: "fraggate",
    executed: false,
    second_door: false,
    call: { slug: s, op: o, payload: payload === undefined ? {} : payload },
    remain_off: REMAIN_OFF,
    note: "AZBot packages this FragGate call. Session exec runs it and stamps the receipt into the TemporalLock / ChainLock lattice. This function does not exec.",
  };
}

function latticeTips(receipt) {
  const lat = receipt && receipt.lattice;
  if (!lat || typeof lat !== "object") return null;
  if (typeof lat.primary !== "string" || typeof lat.secondary !== "string") return null;
  return { primary: lat.primary, secondary: lat.secondary };
}

function ensureCollab(session) {
  if (!session.collab || typeof session.collab !== "object") {
    session.collab = {
      spec: FORENSIC_SPEC,
      share: "receipt_tip_only",
      rewrite: false,
      parties: [],
      tip: null,
      seq: 0,
      lattice: null,
      chainlock_tip: null,
      temporallock_tip: null,
      anchor: null,
      handoff: null,
      tl_last: null,
      stamp_ok: false,
    };
  }
  if (!Array.isArray(session.collab.parties)) session.collab.parties = [];
  return session.collab;
}

export function readTip(session) {
  if (!session) return { ok: false, code: "session_not_found", spec: FORENSIC_SPEC };
  const collab = session.collab && typeof session.collab === "object" ? session.collab : null;
  const last = (session.receipts || [])[session.receipts.length - 1] || null;
  const tip = typeof session.head_hash === "string" ? session.head_hash : null;
  const lattice = (collab && collab.lattice) || latticeTips(last);
  return {
    ok: true,
    spec: FORENSIC_SPEC,
    title: FORENSIC_TITLE,
    author: "Aziel Eliab",
    session_id: session.id,
    share: "receipt_tip_only",
    rewrite: false,
    tip,
    seq: (session.receipts || []).length,
    lattice: lattice ? { primary: lattice.primary, secondary: lattice.secondary } : null,
    parties: (collab && collab.parties ? collab.parties : []).map((p) => ({ id: p.id })),
    chainlock_tip: collab && collab.chainlock_tip ? collab.chainlock_tip : null,
    temporallock_tip: collab && collab.temporallock_tip ? collab.temporallock_tip : null,
    handoff: collab && collab.handoff
      ? { door: "fraggate", slug: collab.handoff.slug || null, op: collab.handoff.op || null, tip: collab.handoff.tip || tip }
      : { door: "fraggate", slug: null, op: null, tip },
    tethers: {
      azrt_azos: {
        spec: TETHER_SPEC,
        share: "receipt_tip_only",
        uses_fraggate_azos_lattice: false,
        azos_lattice_refusal_stays: true,
        runtime_exec_into_azos: false,
      },
      azieltether: { under_bearer: true, vpn: false, arm: false, mesh_join: false },
      external_anchor: {
        spec: "AZRT-ANCHOR-1.0",
        path: "/v1/anchor/heads",
        anchor: collab && collab.anchor ? collab.anchor : null,
        rewrite: false,
      },
    },
    mesh: meshCite(),
    remain_off: REMAIN_OFF,
    local_first: true,
  };
}

async function partyIdOf(raw) {
  const text = String(raw == null ? "" : raw).trim();
  if (!text || text.length > 200) return "";
  if (/^[a-f0-9]{64}$/.test(text)) return text;
  return sha256Hex(text);
}

export async function azielTetherUnderBearer(body) {
  const src = body && typeof body === "object" ? body : {};
  const op = refusedOp(src);
  if (op === "vpn" || op === "arm" || op === "mesh-join" || op === "mesh_join") {
    return {
      ok: false,
      status: 409,
      spec: FORENSIC_SPEC,
      code: "FG-STUB",
      remain_off_item: 6,
      vpn: false,
      arm: false,
      mesh_join: false,
      written: false,
      get_never_enables: true,
      message: "AzielTether vpn, arm, and mesh-join stay refused. The tether reads a tip under a bearer. It does not join a mesh.",
    };
  }
  const { sanitizeBearer, EXAMPLE_BEARER } = await import("./mesh.js");
  const raw = src.bearer != null ? src.bearer : "";
  const bearer = sanitizeBearer(raw);
  if (!bearer) {
    return {
      ok: false,
      status: 400,
      spec: FORENSIC_SPEC,
      code: raw ? "MESH-BAD-BEARER" : "MESH-NEED-BEARER",
      example_bearer: EXAMPLE_BEARER,
      under_bearer: true,
      vpn: false,
      arm: false,
      mesh_join: false,
      written: false,
      get_never_enables: true,
      radios_enabled_by_this_call: false,
      local_node: LOCAL_QNM_NODE,
      message: "AzielTether tip read is under a bearer. Empty enable is MESH-NEED-BEARER. GET /v1/mesh never enables.",
    };
  }
  const { tip } = await import("./engines/azieltether/engine.js");
  const read = await tip(src.items != null ? src.items : []);
  return {
    ok: true,
    spec: FORENSIC_SPEC,
    under_bearer: true,
    bearer_accepted: true,
    vpn: false,
    arm: false,
    mesh_join: false,
    radios_enabled_by_this_call: false,
    rewrite: false,
    share: "receipt_tip_only",
    tip_hashes: read.tip_hashes,
    last_hash: read.last_hash,
    local_node: LOCAL_QNM_NODE,
  };
}

/**
 * Operator-gated mesh presence. Delegates to meshEnable.
 * An empty body is MESH-NEED-BEARER and does not enable.
 * GET /v1/mesh never calls this.
 */
export async function operatorMeshPresence(payload, env) {
  const { meshEnable } = await import("./mesh.js");
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const gate = await meshEnable(src, env);
  const accepted = gate && gate.ok === true && gate.op === "enable";
  return {
    spec: FORENSIC_SPEC,
    get_never_enables: true,
    radios_enabled_by_get: false,
    radios_enabled_by_this_call: accepted,
    operator_gate: "MESH-NEED-BEARER",
    code: gate && gate.code ? gate.code : accepted ? "MESH-ENABLE" : null,
    local_node: LOCAL_QNM_NODE,
    cap7_names_only: true,
    public_icann: false,
    ...earnedMeshFlags(),
    note: "Presence uses MESH-NEED-BEARER and local qnm-node. GET /v1/mesh never enables. The three live flags earn LIVE per the QNM definition. Cap-7 and .aziel are names, not ICANN.",
  };
}

export async function stampHandoff(env, session, receipt) {
  const collab = ensureCollab(session);
  const tip = receipt && typeof receipt.hash === "string" ? receipt.hash : "";
  if (!/^[a-f0-9]{64}$/.test(tip)) {
    collab.stamp_ok = false;
    return { ok: false, code: "FORENSIC-NO-TIP", collab };
  }
  const intent = receipt.intent || (receipt.payload && receipt.payload.intent) || null;
  const slug = intent && typeof intent.slug === "string" ? intent.slug : null;
  const op = intent && typeof intent.op === "string" ? intent.op : null;
  let chainlock = { ok: false };
  try {
    const { append } = await import("./chainlock/ops.js");
    chainlock = await append(env, {
      c: "session",
      subject: "azbot-handoff",
      fact: `forensic-tip ${tip}`,
      k: "forensic-collab",
      idempotency_key: `forensic-${session.id}-${tip}`,
    });
  } catch {
    chainlock = { ok: false, code: "FORENSIC-CHAINLOCK-UNAVAILABLE" };
  }
  let tlTip = null;
  try {
    const tl = await import("./engines/temporallock/engine.js");
    const summary = "azbot forensic handoff tip";
    const evidence = `sha256:${tip}`;
    const prev = collab.tl_last;
    const minted = prev
      ? await tl.append({ chain: [prev], summary, evidence, confidence: 1 })
      : await tl.genesis({ summary, evidence, confidence: 1 });
    tlTip = minted && minted.receipt ? minted.receipt.hash : null;
    if (minted && minted.receipt) collab.tl_last = minted.receipt;
  } catch {
    tlTip = null;
  }
  const lat = latticeTips(receipt);
  collab.tip = tip;
  collab.seq = (session.receipts || []).length;
  if (lat) collab.lattice = lat;
  collab.chainlock_tip = chainlock && chainlock.stamp && chainlock.stamp.stamp_sha256 ? chainlock.stamp.stamp_sha256 : null;
  collab.temporallock_tip = tlTip;
  collab.anchor = chainlock && chainlock.stamp && chainlock.stamp.anchor ? chainlock.stamp.anchor : collab.anchor || null;
  collab.handoff = { door: "fraggate", slug, op, tip };
  collab.stamp_ok = chainlock.ok === true && typeof tlTip === "string";
  collab.rewrite = false;
  collab.share = "receipt_tip_only";
  return { ok: collab.stamp_ok === true, collab };
}

export async function joinParty(env, session, body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (!session) return { dirty: false, status: 404, body: { ok: false, code: "session_not_found", spec: FORENSIC_SPEC, written: false } };
  if (session.closed) {
    return { dirty: false, status: 409, body: { ok: false, code: "session_closed", spec: FORENSIC_SPEC, written: false, rewrite: false } };
  }
  if (rewriteAttempt(src)) return { dirty: false, status: 409, body: rewriteRefusal() };
  const op = refusedOp(src);
  if (op) {
    return {
      dirty: false,
      status: 409,
      body: {
        ok: false,
        spec: FORENSIC_SPEC,
        code: "FG-STUB",
        op,
        written: false,
        rewrite: false,
        remain_off: REMAIN_OFF,
        message: "That op stays refused. A collaborative session does not enable it.",
      },
    };
  }
  let tether = null;
  if (src.tether === "azieltether") {
    tether = await azielTetherUnderBearer(src);
    if (!tether.ok) return { dirty: false, status: tether.status || 400, body: tether };
  }
  const id = await partyIdOf(src.party_id != null ? src.party_id : src.party);
  if (!id) {
    return {
      dirty: false,
      status: 400,
      body: { ok: false, spec: FORENSIC_SPEC, code: "FORENSIC-NEED-PARTY", written: false, rewrite: false },
    };
  }
  const before = (session.receipts || []).length;
  const head = session.head_hash;
  const collab = ensureCollab(session);
  const existing = collab.parties.find((p) => p.id === id);
  if (!existing) {
    if (collab.parties.length >= PARTY_CAP) {
      return { dirty: false, status: 409, body: { ok: false, spec: FORENSIC_SPEC, code: "FORENSIC-PARTY-CAP", written: false, rewrite: false } };
    }
    collab.parties.push({ id, joined_at: new Date().toISOString() });
  }
  const last = (session.receipts || [])[session.receipts.length - 1] || null;
  if (last && last.hash) {
    try {
      await stampHandoff(env, session, last);
    } catch {
      collab.stamp_ok = false;
    }
  }
  if ((session.receipts || []).length !== before || session.head_hash !== head) {
    return { dirty: false, status: 500, body: { ok: false, spec: FORENSIC_SPEC, code: "FORENSIC-NO-REWRITE", written: false, rewrite: false } };
  }
  const view = readTip(session);
  return {
    dirty: true,
    status: 200,
    body: {
      ok: true,
      spec: FORENSIC_SPEC,
      session_id: session.id,
      party_id: id,
      already: Boolean(existing),
      rewrite: false,
      written: true,
      receipts_rewritten: false,
      share: "receipt_tip_only",
      tip: view.tip,
      tether,
      mesh: view.mesh,
      remain_off: REMAIN_OFF,
    },
  };
}

const REMAIN_OFF_STUBS = Object.freeze([
  ["azos", "exec"],
  ["azos", "shell"],
  ["azos", "lattice"],
  ["embryolock", "wipe"],
  ["embryolock", "scorch"],
  ["embryolock", "unlock"],
  ["ark", "scorch"],
  ["ark", "wipe"],
  ["ark", "unlock"],
  ["azieltether", "mesh-join"],
  ["azieltether", "vpn"],
  ["azieltether", "arm"],
  ["azmail", "deanonymize"],
  ["temporallock", "rollback"],
  ["4dmap", "invent_mark"],
  ["4dmap", "backdate_class"],
  ["spectrallock", "invent_mark"],
]);

/** Assert Remain-OFF stubs the design preserves. Does not enable any of them. */
export function remainOffHolds(stubOps) {
  const missing = [];
  for (const [slug, op] of REMAIN_OFF_STUBS) {
    const have = stubOps && stubOps[slug];
    if (!Array.isArray(have) || !have.includes(op)) missing.push(`${slug}.${op}`);
  }
  return {
    ok: missing.length === 0,
    missing,
    spec: FORENSIC_SPEC,
    remain_off: REMAIN_OFF,
    get_never_enables: true,
  };
}
