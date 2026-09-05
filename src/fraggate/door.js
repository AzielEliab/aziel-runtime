/**
 * FragGate door — discover, route, refuse.
 *
 * CallEnvelope in → registry classify → DecisionGATE → handler or refuse
 * → ResultEnvelope + ledger tip.
 *
 * One door over the catalog. Not tool #31 beside a flat pile.
 * Kernel: https://github.com/AzielEliab/fraggate (FG-0.1)
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { check as decisiongateCheck } from "../engines/decisiongate/engine.js";
import { executeLocal } from "../engines/runner.js";
import {
  FG_GATE_REFUSE,
  FG_HALLUC_TOOL,
  FG_LOCAL_ONLY,
  FG_OK,
  FG_STUB,
  FG_UNKNOWN_OP,
  FRAGGATE_DOOR,
  FRAGGATE_KERNEL,
  PUBLIC_DOOR_TOOLS,
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
} from "./registry.js";

export function defaultClaim(slug, op) {
  const name = slug || "software";
  const verb = op || "op";
  return {
    statement: `Execute the public FragGate allowlisted ${name} ${verb} operation inside the aziel-runtime Worker isolate without incrementing download counters or claiming a mesh hop.`,
    evidence: [
      `${name} ${verb} is on the aziel-runtime 1.6.0 FragGate public allowlist.`,
      "Cloudflare Worker isolate is the jail. engine_digest is required.",
    ],
    impact_pos: ["The agent receives a typed ResultEnvelope and display-ready output."],
    impact_neg: ["A refused or malformed call still writes an ask/refuse ledger tip."],
    values: ["Clarity without force"],
    accountable: "Aziel Eliab",
  };
}

function existingTools() {
  return {
    mcp: PUBLIC_DOOR_TOOLS.slice(),
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
    live: e.status === "live",
    local_only: e.status === "local_only",
    stub: false,
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
  const claim = src.claim || src.proposal || src.ground || null;
  if (claim && typeof claim === "object") return claim;
  return defaultClaim(slug, op);
}

/**
 * Admit or refuse a call. No handler on refuse.
 */
export async function admitCall(args, registry, bySlug) {
  const target = parseTarget(args, registry, bySlug);
  const classified = classifyCall(target.entry, target.op);

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

export async function fraggateCall(args, registry, bySlug) {
  const admission = await admitCall(args, registry, bySlug);
  if (!admission.admitted) return admission.envelope;

  const { target, gate } = admission;
  const src = args && typeof args === "object" ? args : {};
  const payload = src.payload !== undefined ? src.payload : payloadWithoutMeta(src);
  const local = await executeLocal({
    slug: target.entry.slug,
    op: target.op,
    payload,
    ranIn: "aziel-runtime",
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

  return accept({
    name: target.entry.name,
    slug: target.entry.slug,
    op: target.op,
    result: parsed,
    gate,
    engine: {
      engine_digest: local.engine_digest,
      ran_in: local.ran_in,
      true_engine_runtime: local.true_engine_runtime,
      mode: local.mode,
      status: local.status,
    },
  });
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

export async function namedDecisiongateCheck(args) {
  const payload = args && typeof args === "object" ? args : {};
  const local = await executeLocal({
    slug: "decisiongate",
    op: "check",
    payload,
    ranIn: "aziel-runtime",
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

export async function libraryLookup(args) {
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
