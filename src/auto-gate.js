/**
 * FragGate, ChainLock, TemporalLock, and ForgeReceipts run before a Softwares
 * or runtime tool returns. Callers do not call those tools first.
 * Diagnostic tools stay available. tools/list stays 36.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { append, tip } from "./chainlock/ops.js";
import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { receipt as forgeReceipt, verifyReceipt } from "./engines/forgereceipts/engine.js";
import { genesis as temporalGenesis, verify as temporalVerify } from "./engines/temporallock/engine.js";
import { admitCall, defaultClaim, previewCatalogAdmission, refuseRuntimeGate } from "./fraggate/door.js";

const DOOR_DIAGNOSTIC = new Set(["fraggate_list", "fraggate_describe", "fraggate_verify", "fraggate_call"]);

/** Ledger-bearing tools. A successful body stamps the acts chain. Reads do not. */
export const CHAINLOCK_LEDGER_TOOLS = new Set([
  "decisiongate_check",
  "library_lookup",
  "memory_observe",
  "memory_resolve",
  "memory_calibrate",
  "mesh_join",
  "mesh_enable",
  "mesh_heartbeat",
  "mesh_leave",
  "mesh_broadcast",
  "runtime_run",
  "runtime_session_exec",
]);

const HASH_RE = /^[a-f0-9]{64}$/;
const ZERO_HASH = "0".repeat(64);

export function honestStampHash(value) {
  return typeof value === "string" && HASH_RE.test(value) && value !== ZERO_HASH;
}

export function isDoorDiagnostic(name) {
  return DOOR_DIAGNOSTIC.has(String(name || ""));
}

/**
 * Catalog target for a public tool, when one exists.
 * chainlock_* and raw session plumbing have no catalog slug.
 */
export function catalogArgsForTool(name, args) {
  const tool = String(name || "");
  const src = args && typeof args === "object" ? args : {};
  if (tool === "runtime_run" || tool === "runtime_session_exec" || tool === "use_software") {
    return { ...src };
  }
  if (tool === "library_lookup") {
    const op = String(src.op || "search").trim() || "search";
    return { slug: "aziel-corpus", name: "aziel-corpus", op, payload: src.payload };
  }
  if (tool === "decisiongate_check" || tool.startsWith("mesh_") || tool.startsWith("memory_")) {
    return { name: tool };
  }
  return null;
}

export function meshHttpOp(pathname) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!path.startsWith("/v1/mesh/")) return "";
  const rest = path.slice("/v1/mesh/".length);
  if (!rest || rest.includes("/")) return "";
  if (rest === "site-heartbeat") return "site-presence";
  return rest;
}

function dryGateMiss(name, gate) {
  return {
    ok: false,
    code: "FG-GATE-REFUSE",
    door: "fraggate",
    tool: name,
    mutated: false,
    dry_run: true,
    ledger_written: false,
    message: `DecisionGATE ${gate && gate.final_state ? gate.final_state : "REFUSE"} — preview only. Nothing was written.`,
  };
}

/**
 * Enter FragGate before the tool body.
 * Catalog tools: classify, then DecisionGATE (admitCall). dry_run uses the same
 * refuse code and writes no ledger tip.
 * Tools with no catalog slug: DecisionGATE on the runtime claim, then the tool.
 * Door diagnostic tools are already FragGate.
 * A non-live mesh HTTP verb is left to the mesh handler so published mesh
 * refuse codes stay (MESH-NO-REWRITE, MESH-NO-LIE).
 */
export async function enterFragGate({ name, args, registry, bySlug, dryRun = false }) {
  if (isDoorDiagnostic(name)) return { proceed: true, role: "diagnostic" };
  const catalog = catalogArgsForTool(name, args);
  if (dryRun) {
    if (catalog) {
      const preview = previewCatalogAdmission(catalog, registry, bySlug);
      if (!preview.proceed) return { proceed: false, envelope: preview.envelope };
    } else {
      const gate = decisiongateCheck(defaultClaim("runtime", name));
      if (!gate || gate.final_state !== "PASS") return { proceed: false, envelope: dryGateMiss(name, gate) };
    }
    return { proceed: true, role: "preview" };
  }
  if (catalog) {
    const admission = await admitCall(catalog, registry, bySlug);
    if (!admission.admitted) return { proceed: false, envelope: admission.envelope };
    return { proceed: true, role: "catalog", target: admission.target };
  }
  const gate = decisiongateCheck(defaultClaim("runtime", name));
  if (!gate || gate.final_state !== "PASS") {
    return { proceed: false, envelope: await refuseRuntimeGate(name, gate) };
  }
  return { proceed: true, role: "gate" };
}

/**
 * Live mesh HTTP posts enter FragGate before the mesh handler.
 * Non-live verbs return proceed so the mesh handler keeps its published code.
 */
export async function enterMeshPost({ pathname, payload, registry, bySlug }) {
  const op = meshHttpOp(pathname);
  if (!op) return { proceed: true, role: "skip" };
  const preview = previewCatalogAdmission({ slug: "mesh", op, payload }, registry, bySlug);
  if (!preview.proceed) return { proceed: true, role: "mesh-code" };
  const admission = await admitCall({ slug: "mesh", op, payload }, registry, bySlug);
  if (!admission.admitted) return { proceed: false, envelope: admission.envelope };
  return { proceed: true, role: "catalog" };
}

export function chainlockNeed(name) {
  const tool = String(name || "");
  if (tool === "fraggate_call") return "pipe";
  if (tool.startsWith("fraggate_") || tool.startsWith("chainlock_")) return "diagnostic";
  if (CHAINLOCK_LEDGER_TOOLS.has(tool)) return "acts";
  return "none";
}

export function peersQuiet(reason = "not on this path") {
  const one = { ran: false, reason };
  return {
    lamb_lens: { ...one },
    sweepgate: { ...one },
    sentinel: { ...one },
    temporallock: { ...one },
    roseclock: { ...one },
    forgereceipts: { ...one },
  };
}

export function infraStatus({ fraggateRole, chainlock, peerReason }) {
  return {
    fraggate: { ran: fraggateRole !== "absent", role: fraggateRole },
    chainlock,
    peers: peersQuiet(peerReason || "not on this path"),
  };
}

export function previewInfra() {
  return infraStatus({
    fraggateRole: "preview",
    chainlock: { ran: false, reason: "dry_run" },
    peerReason: "dry_run",
  });
}

export function refuseInfra() {
  return infraStatus({
    fraggateRole: "refuse",
    chainlock: { ran: false, reason: "refused" },
    peerReason: "refused",
  });
}

export function runningInfra() {
  return infraStatus({
    fraggateRole: "admitted",
    chainlock: { ran: false, reason: "running" },
    peerReason: "running",
  });
}

/**
 * Append one acts-chain stamp and verify the tip matches that hash.
 * A missing or zero hash stays ran:false. dry_run must not call this.
 */
export async function stampActs(env, name) {
  const tool = String(name || "tool");
  const stamped = await append(env, {
    c: "acts",
    k: "admit",
    subject: tool,
    fact: `${tool} admitted`,
  });
  const hash = stamped && stamped.card && stamped.card.h;
  if (!(stamped && stamped.ok && honestStampHash(hash))) {
    return {
      ran: false,
      op: "append",
      chain: "acts",
      refuse: (stamped && stamped.refuse) || "no-stamp",
    };
  }
  const tipped = await tip(env, "acts");
  const tipHash = tipped && tipped.tip && tipped.tip.h;
  return {
    ran: true,
    op: "append",
    chain: "acts",
    hash,
    verified: tipHash === hash,
  };
}

/**
 * TemporalLock genesis plus a ForgeReceipts receipt for one admitted tool.
 * ran is true only with a real hash. verified is true only after a recompute.
 * dry_run must not call this.
 */
export async function stampTimeReceipt(name, chainHash) {
  const tool = String(name || "tool");
  const evidence = honestStampHash(chainHash) ? `${tool} admitted chainlock ${chainHash}` : `${tool} admitted`;
  let temporallock = { ran: false, op: "genesis", reason: "no stamp" };
  try {
    const out = await temporalGenesis({ summary: `${tool} admitted`, evidence, confidence: 1 });
    const rec = out && out.receipt;
    const hash = rec && rec.hash;
    if (honestStampHash(hash)) {
      const checked = await temporalVerify([rec]);
      temporallock = { ran: true, op: "genesis", hash, verified: Boolean(checked && checked.ok) };
    }
  } catch {
    temporallock = { ran: false, op: "genesis", reason: "no stamp" };
  }
  let forgereceipts = { ran: false, op: "receipt", reason: "no stamp" };
  try {
    const forged = await forgeReceipt({
      note: `${tool} admitted`,
      summary: `${tool} admitted`,
      kind: "runtime-return",
      context: {
        kind: "runtime-return",
        evidence,
        temporallock_hash: temporallock.hash || null,
        chainlock_hash: honestStampHash(chainHash) ? chainHash : null,
      },
    });
    const rec = forged && forged.receipt;
    const hash = rec && rec.hash;
    if (forged && forged.ok && honestStampHash(hash)) {
      const checked = await verifyReceipt({ receipt: rec });
      forgereceipts = {
        ran: true,
        op: "receipt",
        hash,
        verified: Boolean(checked && checked.ok && checked.match),
      };
    }
  } catch {
    forgereceipts = { ran: false, op: "receipt", reason: "no stamp" };
  }
  return { temporallock, forgereceipts };
}

export function withTimeReceipt(peers, time) {
  return {
    ...(peers || peersQuiet()),
    temporallock: time && time.temporallock ? time.temporallock : { ran: false, reason: "no stamp" },
    forgereceipts: time && time.forgereceipts ? time.forgereceipts : { ran: false, reason: "no stamp" },
  };
}

/** ChainLock acts stamp plus TemporalLock and ForgeReceipts for one ledger op. */
export async function ledgerInfra(env, name, fraggate) {
  const chainlock = await stampActs(env, name);
  const time = await stampTimeReceipt(name, chainlock && chainlock.hash);
  return {
    fraggate: fraggate || { ran: true, role: "gate" },
    chainlock,
    peers: withTimeReceipt(peersQuiet("not on this path"), time),
  };
}

function doorRecord(body) {
  if (!body || typeof body !== "object") return null;
  if (body.entry || body.lamb_lens || body.pipe || body.forgereceipts) return body;
  if (body.result && typeof body.result === "object") {
    const inner = body.result;
    if (inner.entry || inner.lamb_lens || inner.pipe || inner.forgereceipts) return inner;
  }
  return body;
}

/**
 * Report the pipe stamp only when the door body carries a real card hash.
 * fraggate_call already stamped ChainLock-IN. This does not append again.
 */
export function infraFromDoorBody(body) {
  const src = doorRecord(body) || {};
  const hash = src.entry && src.entry.h;
  const stamped = honestStampHash(hash);
  const temporalHash = src.temporal && src.temporal.hash;
  const forgeHash = src.forgereceipts && src.forgereceipts.hash;
  return {
    fraggate: { ran: true, role: "door" },
    chainlock: stamped
      ? { ran: true, op: "pipe", chain: "session", hash }
      : { ran: false, op: "pipe", chain: "session", reason: "no stamp" },
    peers: {
      lamb_lens: { ran: Boolean(src.lamb_lens) },
      sweepgate: {
        ran: stamped,
        reason: stamped ? "passed before chainlock-in" : "no stamp",
      },
      sentinel: { ran: Boolean(src.sentinel) },
      temporallock: {
        ran: honestStampHash(temporalHash),
        ...(honestStampHash(temporalHash) ? { hash: temporalHash } : {}),
      },
      roseclock: { ran: Boolean(src.roseclock) },
      forgereceipts: {
        ran: Boolean(src.forgereceipts && (src.forgereceipts.ok === true || honestStampHash(forgeHash))),
        ...(honestStampHash(forgeHash) ? { hash: forgeHash } : {}),
      },
    },
  };
}

export function attachInfra(out, infra) {
  if (!out || typeof out !== "object" || !infra) return out;
  out.infra = infra;
  if (out.envelope && typeof out.envelope === "object") out.envelope.infra = infra;
  return out;
}

export function infraOnResult(out) {
  if (out && out.infra && out.infra.chainlock) return out.infra;
  const envelope = out && out.envelope;
  if (envelope && envelope.infra && envelope.infra.chainlock) return envelope.infra;
  const nested = envelope && envelope.result;
  if (nested && nested.infra && nested.infra.chainlock) return nested.infra;
  if (typeof out?.text === "string") {
    try {
      const parsed = JSON.parse(out.text);
      if (parsed && parsed.infra && parsed.infra.chainlock) return parsed.infra;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * ChainLock after a live tool body.
 * pipe: report the door card, do not append again.
 * diagnostic: chainlock_* and fraggate_* are the infrastructure, not a pre-call.
 * acts: stamp only when the body status is under 400.
 */
export async function infraAfterBody(env, name, out) {
  const prior = infraOnResult(out);
  if (prior) return prior;
  const need = chainlockNeed(name);
  if (need === "pipe") {
    const record = (out && out.envelope && out.envelope.result) || null;
    return infraFromDoorBody(record);
  }
  if (need === "diagnostic") {
    return infraStatus({
      fraggateRole: "diagnostic",
      chainlock: { ran: false, reason: "diagnostic" },
      peerReason: "diagnostic",
    });
  }
  if (need === "acts") {
    if (out && out.status < 400) return ledgerInfra(env, name, { ran: true, role: "gate" });
    return infraStatus({
      fraggateRole: "gate",
      chainlock: { ran: false, op: "append", chain: "acts", reason: "not stamped" },
    });
  }
  return infraStatus({
    fraggateRole: "gate",
    chainlock: { ran: false, reason: "not a ledger op" },
  });
}
