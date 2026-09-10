/**
 * FragGate door — discover, route, refuse. THE SINGLE DOOR.
 *
 * Locked call path (1.7.0 / MASTER-33):
 * Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens
 * → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN
 * → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE
 * → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return
 *
 * Domain softwares execute only inside Internal Domain Layer after AZPIPE.
 * Lamb Lens is fabric ethics AFTER FragGate — not a second door.
 * LambGate is not a hop. Author: Aziel Eliab. Identity is Aziel Eliab only.
 * Kernel: https://github.com/AzielEliab/fraggate (FG-0.1)
 */

import { check as decisiongateCheck } from "../engines/decisiongate/engine.js";
import { joinTypeForOp, normalizeJoinType } from "../engines/4dmap/engine.js";
import { executeLocal } from "../engines/runner.js";
import { arch, LOCKED_STRIP, pipeInbound, pipeOutbound, thinPipe } from "../azpipe.js";
import { MEMORY_SLUG, runMemoryOp } from "../memory.js";
import { MESH_SLUG, runMeshOp } from "../mesh.js";
import {
  FG_GATE_REFUSE,
  FG_HALLUC_TOOL,
  FG_LOCAL_ONLY,
  FG_OK,
  FG_STUB,
  FG_UNKNOWN_OP,
  FRAGGATE_DOOR,
  FRAGGATE_KERNEL,
  existMcpHint,
} from "./codes.js";
import { appendLedger, currentLedger, ledgerTipView } from "./ledger.js";
import {
  LIVE_OPS,
  classifyCall,
  compactEntries,
  liveOpList,
  parseTarget,
  registryDigest,
  registrySummary,
  resolveOpAlias,
} from "./registry.js";

export function defaultClaim(slug, op, extra = {}) {
  const name = slug || "software";
  const verb = op || "op";
  const evidence = [
    `${name} ${verb} is on the aziel-runtime 1.7.0 FragGate public allowlist.`,
    "Cloudflare Worker isolate is the jail. engine_digest is required.",
  ];
  let join_type = extra.join_type || extra.join || null;
  if (slug === "4dmap") {
    join_type = normalizeJoinType(join_type) || joinTypeForOp(verb);
    evidence.push(`4DMap FragGate claim cites join type ${join_type} (4DM-WP-1.0). Not a sequential gate.`);
  }
  return {
    statement: `Execute the public FragGate allowlisted ${name} ${verb} operation inside the aziel-runtime Worker isolate without incrementing download counters or claiming a mesh hop.`,
    evidence,
    impact_pos: ["The agent receives a typed ResultEnvelope and display-ready output."],
    impact_neg: ["A refused or malformed call still writes an ask/refuse ledger tip."],
    values: ["Clarity without force"],
    accountable: "Aziel Eliab",
    ...(join_type ? { join_type } : {}),
  };
}

function existingTools() {
  return {
    ...existMcpHint(),
    live_ops: liveOpList(),
    allowlist: LIVE_OPS,
  };
}

function gateView(gate) {
  if (!gate || typeof gate !== "object") return null;
  return {
    final_state: gate.final_state || null,
    blocked_at: gate.blocked_at || null,
    lineage: Array.isArray(gate.lineage)
      ? gate.lineage.map((g) => ({ name: g.name, state: g.state, feedback: g.feedback }))
      : [],
  };
}

async function refuse({ code, name, slug, op, message, gate, extra }) {
  const { tip } = await appendLedger({
    asked: true,
    refused: true,
    code,
    name: name || slug || null,
    op: op || null,
    gate: gate && gate.final_state,
  });
  return {
    ok: false,
    code,
    door: FRAGGATE_DOOR,
    kernel: FRAGGATE_KERNEL,
    name: name || null,
    slug: slug || null,
    op: op || null,
    message,
    result: null,
    gate: gateView(gate),
    ledger_tip: tip,
    exist: existingTools(),
    ...(extra || {}),
  };
}

async function accept({ name, slug, op, result, gate, engine }) {
  const { tip } = await appendLedger({
    asked: true,
    refused: false,
    code: FG_OK,
    name: name || slug,
    op,
    gate: gate && gate.final_state,
  });
  return {
    ok: true,
    code: FG_OK,
    door: FRAGGATE_DOOR,
    kernel: FRAGGATE_KERNEL,
    name: name || slug,
    slug,
    op,
    result,
    gate: gateView(gate),
    ledger_tip: tip,
    engine: engine || null,
  };
}

export async function listRegistry(registry) {
  const digest = await registryDigest(registry);
  return {
    ok: true,
    door: FRAGGATE_DOOR,
    kernel: FRAGGATE_KERNEL,
    ...registrySummary(registry, digest),
    pipeline: arch(),
    pipeline_strip: LOCKED_STRIP,
    entries: compactEntries(registry),
  };
}

export async function describeRegistry(args, registry, bySlug) {
  const target = parseTarget(args, registry, bySlug);
  if (!target.entry) {
    return refuse({
      code: FG_HALLUC_TOOL,
      name: target.raw,
      slug: target.slug,
      op: target.op,
      message: `Unknown name ${JSON.stringify(target.raw || "")}. Not in the FragGate registry.`,
    });
  }
  const e = target.entry;
  return {
    ok: true,
    door: FRAGGATE_DOOR,
    name: e.name,
    slug: e.slug,
    digest: e.digest,
    status: e.status,
    ops: e.ops,
    stub_ops: e.stub_ops,
    description: e.description,
    note: e.note,
    domain: e.domain || null,
    domain_id: e.domain_id || null,
    placement: e.placement || null,
    peers: e.peers || undefined,
    fabric_neighbors: e.fabric_neighbors || undefined,
    hubs: e.hubs || undefined,
    worker_url: e.worker_url || undefined,
    cross_map: e.cross_map || undefined,
    live: e.status === "live",
    local_only: e.status === "local_only",
    stub: e.status === "stub",
    local_not_hosted: Boolean(e.local_not_hosted) || e.status === "stub",
    op_aliases: e.op_aliases || {},
    pipeline: arch(),
    pipeline_strip: LOCKED_STRIP,
    domain_doors:
      e.slug === "4dmap"
        ? {
            inspection: true,
            slug: "4dmap",
            spec: "4DM-WP-1.0",
            sequential_gate: false,
            note: "4DMap is a Research-domain inspection frame T/Δ/Γ/Π inside Internal Domain Layer after AZPIPE. Isolated software, not an additional door.",
          }
        : { inspection: "4dmap", sequential_gate: false },
  };
}

export async function verifyRegistry(args, registry, bySlug) {
  const src = args && typeof args === "object" ? args : {};
  const wantDigest = src.digest ? String(src.digest).trim().toLowerCase() : "";
  const target = parseTarget(src, registry, bySlug);
  const digest = await registryDigest(registry);

  if (wantDigest && !target.raw) {
    const match = digest === wantDigest;
    return {
      ok: match,
      door: FRAGGATE_DOOR,
      kind: "registry",
      registry_digest: digest,
      matched: match,
      message: match ? "Registry digest matches." : "Registry digest does not match.",
    };
  }

  if (!target.entry) {
    return refuse({
      code: FG_HALLUC_TOOL,
      name: target.raw,
      slug: target.slug,
      op: target.op,
      message: `Cannot verify unknown name ${JSON.stringify(target.raw || "")}.`,
    });
  }

  const e = target.entry;
  const digestMatch = wantDigest ? e.digest === wantDigest : true;
  return {
    ok: digestMatch,
    door: FRAGGATE_DOOR,
    kind: "entry",
    name: e.name,
    slug: e.slug,
    digest: e.digest,
    status: e.status,
    ops: e.ops,
    registry_digest: digest,
    matched: digestMatch,
    message: digestMatch
      ? `${e.name} is ${e.status} in the FragGate registry.`
      : `${e.name} digest does not match.`,
  };
}

function claimFromArgs(args, slug, op) {
  const src = args && typeof args === "object" ? args : {};
  const payload = src.payload && typeof src.payload === "object" ? src.payload : {};
  const claim = src.claim || src.proposal || src.ground || null;
  const cited = payload.join_type || payload.join || (claim && claim.join_type) || null;
  if (claim && typeof claim === "object") {
    if (slug !== "4dmap") return claim;
    const join_type = normalizeJoinType(cited) || joinTypeForOp(op);
    const evidence = Array.isArray(claim.evidence) ? claim.evidence.slice() : [];
    if (!evidence.some((row) => /join type/i.test(String(row)))) {
      evidence.push(`4DMap FragGate claim cites join type ${join_type} (4DM-WP-1.0). Not a sequential gate.`);
    }
    return { ...claim, join_type, evidence };
  }
  return defaultClaim(slug, op, { join_type: cited });
}

/**
 * Admit or refuse a call. No handler on refuse.
 * Classify (halluc / stub / local_only) always runs at FragGate.
 * DecisionGATE is deferred on the FragGate call path (gate:false) so it
 * sits AFTER ChainLock-IN inside AZPIPE. Session exec still gates here.
 */
export async function admitCall(args, registry, bySlug, opts = {}) {
  const target = parseTarget(args, registry, bySlug);
  const classified = classifyCall(target.entry, target.op);
  const deferGate = opts && opts.gate === false;

  if (classified.kind === "halluc") {
    return {
      admitted: false,
      envelope: await refuse({
        code: FG_HALLUC_TOOL,
        name: target.raw,
        slug: target.slug,
        op: target.op,
        message: `FG-HALLUC-TOOL: ${JSON.stringify(target.raw || "")} is not a FragGate registry name. Use fraggate_list.`,
      }),
      target,
    };
  }

  if (classified.kind === "stub") {
    return {
      admitted: false,
      envelope: await refuse({
        code: FG_STUB,
        name: target.entry.name,
        slug: target.entry.slug,
        op: target.op,
        extra: { status: "stub" },
        message: `${target.entry.name} ${target.op} is stub — local, not hosted. Never execute on the public mesh.`,
      }),
      target,
    };
  }

  if (classified.kind === "unknown_op") {
    return {
      admitted: false,
      envelope: await refuse({
        code: FG_UNKNOWN_OP,
        name: target.entry.name,
        slug: target.entry.slug,
        op: target.op,
        extra: { status: target.entry.status, ops: target.entry.ops },
        message: target.op
          ? `${target.entry.name} has no public FragGate op ${JSON.stringify(target.op)}. Live ops: ${(target.entry.ops || []).join(", ") || "(none)"}.`
          : `${target.entry.name} is in the registry (${target.entry.status}). Pass op.`,
      }),
      target,
    };
  }

  if (classified.kind === "local_only") {
    return {
      admitted: false,
      envelope: await refuse({
        code: FG_LOCAL_ONLY,
        name: target.entry.name,
        slug: target.entry.slug,
        op: target.op,
        extra: { status: "local_only" },
        message: `${target.entry.name} is named in the registry but local_only — not live on the public FragGate door.`,
      }),
      target,
    };
  }

  const claim = claimFromArgs(args, target.entry.slug, target.op);
  if (deferGate) {
    return { admitted: true, target, gate: null, claim, deferred_gate: true };
  }
  const gate = decisiongateCheck(claim);
  if (!gate || gate.final_state !== "PASS") {
    return {
      admitted: false,
      envelope: await refuse({
        code: FG_GATE_REFUSE,
        name: target.entry.name,
        slug: target.entry.slug,
        op: target.op,
        gate,
        extra: { status: "live" },
        message: `DecisionGATE ${gate && gate.final_state ? gate.final_state : "REFUSE"} — no handler.`,
      }),
      target,
      gate,
    };
  }

  return { admitted: true, target, gate, claim };
}

export async function fraggateCall(args, registry, bySlug, env, request = null) {
  const admission = await admitCall(args, registry, bySlug, { gate: false });
  if (!admission.admitted) return admission.envelope;

  const { target, claim } = admission;
  const src = args && typeof args === "object" ? args : {};
  const rawPayload = src.payload !== undefined ? src.payload : payloadWithoutMeta(src);
  const inbound = await pipeInbound({
    payload: rawPayload,
    claim,
    env,
    slug: target.entry.slug,
    op: target.op,
    subject: `${target.entry.slug} ${target.op}`,
    untrusted: false,
  });
  const gate = inbound.gate_check || inbound.gates;
  if (!inbound.ok) {
    const sweep = inbound.refuse === "sweep-isolate" || inbound.closed_at === "sweepgate";
    const atGate = inbound.closed_at === "decisiongate";
    const atLamb = inbound.closed_at === "lamb-lens";
    const atSentinel = inbound.closed_at === "sentinel";
    const code = sweep
      ? "FG-SWEEP-ISOLATE"
      : atLamb
        ? "FG-LAMB-REFUSE"
        : atSentinel
          ? "FG-SENTINEL"
          : inbound.refuse === "illegal-reorder"
            ? "FG-REORDER"
            : FG_GATE_REFUSE;
    return refuse({
      code,
      name: target.entry.name,
      slug: target.entry.slug,
      op: target.op,
      gate: atGate ? gate : null,
      extra: {
        pipe: thinPipe(inbound),
        sweep: inbound.sweep,
        lamb_lens: inbound.lamb_lens,
        sentinel: inbound.sentinel,
        status: "live",
        closed_at: inbound.closed_at,
      },
      message: sweep
        ? "SweepGate isolate — airlock closed. Do not merge."
        : atLamb
          ? `Lamb Lens ${inbound.refuse === "lamb-hold" ? "HOLD-UNCERTAIN" : "REFUSE"} — no handler. Fabric ethics after FragGate. Not a second door.`
          : atSentinel
            ? `Sentinel ${inbound.refuse || "reject"} — no handler. No rollback.`
            : atGate
              ? `DecisionGATE ${gate && gate.final_state ? gate.final_state : "REFUSE"} — no handler.`
              : `AZPIPE ${inbound.refuse || "refuse"} — no handler.`,
    });
  }
  const payload = inbound.admitted !== undefined ? inbound.admitted : rawPayload;
  const resolved = resolveOpAlias(target.entry.slug, target.op);
  if (target.entry.slug === MEMORY_SLUG) {
    const result = await runMemoryOp(resolved.op, payload, env, request);
    const accepted = await accept({
      name: target.entry.name,
      slug: target.entry.slug,
      op: target.op,
      result,
      gate: inbound.gate_check || gate,
      engine: {
        engine_digest: null,
        ran_in: "aziel-runtime",
        true_engine_runtime: false,
        mode: "akm-triad",
        status: result && result.ok === false ? 400 : 200,
      },
    });
    if (resolved.aliased) {
      accepted.canonical_op = resolved.op;
      accepted.aliased = true;
    }
    return decoratePipe(accepted, inbound, result, env, claim);
  }
  if (target.entry.slug === MESH_SLUG) {
    const result = await runMeshOp(resolved.op, payload, env);
    const accepted = await accept({
      name: target.entry.name,
      slug: target.entry.slug,
      op: target.op,
      result,
      gate: inbound.gate_check || gate,
      engine: {
        engine_digest: null,
        ran_in: "aziel-runtime",
        true_engine_runtime: false,
        mode: "qnm-rollup",
        status: result && result.ok === false ? 400 : 200,
      },
    });
    if (resolved.aliased) {
      accepted.canonical_op = resolved.op;
      accepted.aliased = true;
    }
    return decoratePipe(accepted, inbound, result, env, claim);
  }
  const local = await executeLocal({
    slug: target.entry.slug,
    op: resolved.op,
    payload,
    ranIn: "aziel-runtime",
    env,
  });

  if (!local || local.unsupported) {
    return refuse({
      code: FG_LOCAL_ONLY,
      name: target.entry.name,
      slug: target.entry.slug,
      op: target.op,
      gate,
      extra: { status: "live" },
      message: `${target.entry.name} ${target.op} is allowlisted but this isolate cannot run it (binding-only / unsupported). Proxy is not exec.`,
    });
  }

  let parsed = null;
  try {
    parsed = JSON.parse(local.responseText);
  } catch {
    parsed = { text: local.responseText };
  }

  const accepted = await accept({
    name: target.entry.name,
    slug: target.entry.slug,
    op: target.op,
    result: parsed,
    gate: inbound.gate_check || gate,
    engine: {
      engine_digest: local.engine_digest,
      ran_in: local.ran_in,
      true_engine_runtime: local.true_engine_runtime,
      mode: local.mode,
      status: local.status,
    },
  });
  if (resolved.aliased) {
    accepted.canonical_op = resolved.op;
    accepted.aliased = true;
  }
  return decoratePipe(accepted, inbound, parsed, env, claim);
}

async function decoratePipe(accepted, inbound, parsed, env, claim) {
  const outbound = await pipeOutbound({
    result: parsed,
    env,
    claim,
    slug: accepted && accepted.slug,
    subject: accepted ? `${accepted.slug} ${accepted.op}` : "azpipe",
  });
  accepted.pipe = thinPipe(outbound.ok ? outbound : inbound);
  accepted.pipeline_strip = LOCKED_STRIP;
  accepted.domain_doors = (inbound && inbound.domain_doors) || null;
  accepted.domain_layer = (inbound && inbound.domain_layer) || (outbound && outbound.domain_layer) || null;
  accepted.lamb_lens = (inbound && inbound.lamb_lens) || null;
  accepted.sentinel = (inbound && inbound.sentinel) || null;
  accepted.provenance = (inbound && inbound.provenance) || null;
  if (!outbound.ok && (outbound.refuse === "sweep-isolate" || outbound.closed_at === "sweepgate")) {
    accepted.ok = false;
    accepted.result = null;
    accepted.message = "SweepGate isolate on outbound. Do not merge.";
    accepted.sweep = outbound.sweep;
    return accepted;
  }
  if (inbound && inbound.inner && inbound.inner.entry) accepted.entry = inbound.inner.entry;
  if (outbound && outbound.inner && outbound.inner.exit) accepted.receipt = outbound.inner.exit;
  if (outbound && outbound.inner && outbound.inner.temporal) accepted.temporal = outbound.inner.temporal;
  if (outbound && outbound.inner && outbound.inner.staticclock) accepted.staticclock = outbound.inner.staticclock;
  if (outbound && outbound.inner && outbound.inner.roseclock) accepted.roseclock = outbound.inner.roseclock;
  if (outbound && outbound.inner && outbound.inner.forgereceipts) accepted.forgereceipts = outbound.inner.forgereceipts;
  return accepted;
}

function payloadWithoutMeta(src) {
  const skip = new Set([
    "name",
    "slug",
    "product",
    "tool",
    "op",
    "verb",
    "claim",
    "proposal",
    "ground",
    "payload",
    "session_id",
    "id",
  ]);
  const out = {};
  for (const [k, v] of Object.entries(src || {})) {
    if (skip.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export async function namedDecisiongateCheck(args, env) {
  const payload = args && typeof args === "object" ? args : {};
  const local = await executeLocal({
    slug: "decisiongate",
    op: "check",
    payload,
    ranIn: "aziel-runtime",
    env,
  });
  let parsed = null;
  try {
    parsed = JSON.parse(local && local.responseText ? local.responseText : "{}");
  } catch {
    parsed = { text: local && local.responseText };
  }
  const state = parsed && parsed.final_state;
  const refused = state && state !== "PASS";
  const { tip } = await appendLedger({
    asked: true,
    refused: Boolean(refused),
    code: refused ? FG_GATE_REFUSE : FG_OK,
    name: "DecisionGATE",
    op: "check",
    gate: state || null,
  });
  return {
    ok: true,
    code: FG_OK,
    door: FRAGGATE_DOOR,
    name: "DecisionGATE",
    slug: "decisiongate",
    op: "check",
    result: parsed,
    gate: gateView(parsed),
    ledger_tip: tip,
    named_module: true,
  };
}

export async function libraryLookup(args, env) {
  const src = args && typeof args === "object" ? args : {};
  const op = String(src.op || "search").trim() || "search";
  const allowed = new Set(["search", "example", "skill", "health"]);
  if (!allowed.has(op)) {
    return refuse({
      code: FG_UNKNOWN_OP,
      name: "Aziel Digital Library",
      slug: "aziel-corpus",
      op,
      message: `library_lookup is read-only. Allowed ops: search, example, skill.`,
    });
  }
  const payload = src.payload !== undefined ? src.payload : src;
  const local = await executeLocal({
    slug: "aziel-corpus",
    op,
    payload,
    ranIn: "aziel-runtime",
    env,
  });
  let parsed = null;
  try {
    parsed = JSON.parse(local && local.responseText ? local.responseText : "{}");
  } catch {
    parsed = { text: local && local.responseText };
  }
  const { tip } = await appendLedger({
    asked: true,
    refused: false,
    code: FG_OK,
    name: "Aziel Digital Library",
    op,
    gate: "read-only",
  });
  return {
    ok: true,
    code: FG_OK,
    door: FRAGGATE_DOOR,
    name: "Aziel Digital Library",
    slug: "aziel-corpus",
    op,
    result: parsed,
    ledger_tip: tip,
    read_only: true,
  };
}

export function ledgerSnapshot() {
  return ledgerTipView(currentLedger());
}

export { defaultClaim as groundedClaim };
