/**
 * AKM-TRIAD-1.0 public surface — adaptive knowledge memory.
 *
 * Fabric module. Not a Softwares-tab product. FragGate is THE single door.
 * ChainLock remains the immutable recollection ledger.
 * Author: Aziel Eliab only.
 */

import { genesis as temporalGenesis } from "./engines/temporallock/engine.js";
import {
  MEMORY_CONTEXT_CAP,
  clip01,
  emptyPrior,
  evidenceWeight,
  hashMemoryDelta,
  lexicalRelevance,
  recencyScore,
  rebuildPosterior,
  retrievalScore,
} from "./chainlock/adaptive.js";
import { append as chainAppend, recall as chainRecall, verify as chainVerify } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";
import { wrapToolOutput } from "./display.js";
import { domainFields } from "./domain-map.js";
import { boundMemoryMeta, MEMORY_META_CAP, SECRET_KEYS } from "./memory/meta.js";
import { isOperator } from "./packed-catalog.js";
import { advance as roseAdvance, ensureTip, tipOf } from "./roseclock/engine.js";
import { canonicalize, sha256Hex } from "./session-core.js";
import {
  CALIBRATION_MANIFEST_VERSION,
  classifyUseCase,
  manifestView,
  RETRIEVAL_WEIGHTS,
} from "./memory/calibration-manifest.js";
import {
  LEARN_KINDS,
  allNodes,
  byChainHash,
  bySubject,
  findOrCreateId,
  getNode,
  newMemoryId,
  rebuildFromLearn,
  resetMemoryIndexForTests,
  upsertNode,
} from "./memory/index.js";
import { assembleTriadDecision, inspectAvailability, selectThreeOfFour } from "./memory/triad.js";
import * as bayesProvider from "./memory/providers/bayes.js";
import * as clceProvider from "./memory/providers/clce.js";
import * as evidenceProvider from "./memory/providers/generic-evidence.js";
import * as spreProvider from "./memory/providers/spre.js";
import * as zionProvider from "./memory/providers/zionpattern.js";

export const AKM_SPEC = "AKM-TRIAD-1.0";
export const AKM_AUTHOR = "Aziel Eliab";
export const MEMORY_SLUG = "memory";
export const MEMORY_NAME = "Adaptive Knowledge Memory";
export { boundMemoryMeta, MEMORY_META_CAP, SECRET_KEYS };

export const MEMORY_CANONICAL_OPS = Object.freeze([
  "observe",
  "resolve",
  "calibrate",
  "recall",
  "get",
  "history",
  "calibration",
  "support",
  "contradict",
  "supersede",
  "revoke",
  "feedback",
  "rebuild-index",
  "health",
  "skill",
]);

export const MEMORY_STUB_OPS = Object.freeze([
  "model_update",
  "rollback",
  "rewrite",
  "delete_history",
  "auto_update",
]);

export const MEMORY_MCP_TOOLS = Object.freeze([
  "memory_observe",
  "memory_resolve",
  "memory_calibrate",
  "memory_recall",
  "memory_get",
]);

const PROVIDERS = {
  "generic-evidence": evidenceProvider,
  clce: clceProvider,
  spre: spreProvider,
  zionpattern: zionProvider,
  bayes: bayesProvider,
};

export {
  LEARN_KINDS,
  rebuildFromLearn,
  resetMemoryIndexForTests,
  getNode,
  allNodes,
  byChainHash,
};

function clip(text, cap) {
  const s = text == null ? "" : String(text);
  if (s.length <= cap) return s;
  return s.slice(0, cap);
}

export function refuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    spec: AKM_SPEC,
    author: AKM_AUTHOR,
    software_tab: false,
    message,
    belief_is_not_truth: true,
    authorizes_action: false,
    ...extra,
  };
}

export function memoryKernelEntry() {
  const domain = domainFields(MEMORY_SLUG);
  return {
    name: MEMORY_NAME,
    slug: MEMORY_SLUG,
    digest: null,
    status: "live",
    ops: MEMORY_CANONICAL_OPS.slice(),
    catalog_ops: MEMORY_CANONICAL_OPS.slice(),
    stub_ops: MEMORY_STUB_OPS.slice(),
    description:
      "AKM-TRIAD-1.0 adaptive knowledge recollection. Bayesian calibration and 3-of-4 triad. Derived index over ChainLock learn. Not a Softwares-tab product.",
    note: "LIVE fabric. ChainLock remains the immutable ledger. Posterior ≠ truth. FragGate is THE single door. Author: Aziel Eliab only.",
    kind: "kernel",
    engine: false,
    true_engine_runtime: false,
    local_not_hosted: false,
    spec: AKM_SPEC,
    software_tab: false,
    domain: domain.domain,
    domain_id: domain.domain_id,
    placement: domain.placement || "fabric-memory",
  };
}

function capabilitiesOf(src) {
  if (Array.isArray(src.capabilities)) return src.capabilities.map((c) => String(c).toUpperCase());
  if (Array.isArray(src.authority)) return src.authority.map((c) => String(c).toUpperCase());
  return [];
}

function hasCap(caps, name) {
  return caps.includes(String(name).toUpperCase());
}

async function stampLearn(env, input) {
  const memory = boundMemoryMeta(input.memory);
  return chainAppend(env, {
    c: "learn",
    k: input.k,
    subject: clip(input.subject, 80),
    fact: clip(input.fact, 160),
    memory,
    rose_transition_hash: input.rose_transition_hash,
    temporal_hash: input.temporal_hash,
    provenance_hash: input.provenance_hash,
  });
}

async function forwardLearn(env, input) {
  const caps = capabilitiesOf(input);
  if (hasCap(caps, "MODEL_UPDATE") && input.k !== "calibration_update") {
    return refuse("AKM-CAPABILITY", "MODEL_UPDATE is not granted by recall or observe. No automatic model update.", {
      required: "CALIBRATE",
    });
  }
  const tip = await ensureTip({ rose_id: "aziel-runtime", branch_id: "akm" });
  if (input.expected_rose_tip && input.expected_rose_tip !== tip.state_hash) {
    return refuse("AKM-CONFLICT", "Two calibration writes against the same RoseClock tip cannot both silently commit. Re-read and construct a new forward transition.", {
      expected: input.expected_rose_tip,
      tip: tip.state_hash,
    });
  }
  const delta = {
    k: input.k,
    memory_id: input.memory && input.memory.memory_id,
    prior: input.prior_hash || null,
    posterior: input.posterior_hash || null,
  };
  const deltaHash = await hashMemoryDelta(delta);
  const rose = await roseAdvance({
    rose_id: "aziel-runtime",
    branch_id: "akm",
    action: input.k,
    action_class: "LEARN",
    from_sequence: input.from_sequence,
    expected_parent: input.expected_rose_tip,
    result_hash: deltaHash,
    authority: caps.length ? caps : ["CALIBRATE"],
  });
  if (!rose.ok) {
    return refuse(rose.refuse === "conflict" ? "AKM-CONFLICT" : "AKM-ROSE", rose.message || "RoseClock refused.", {
      rose,
    });
  }
  let temporal;
  try {
    temporal = await temporalGenesis({
      summary: clip(`AKM ${input.k} ${input.memory && input.memory.memory_id ? input.memory.memory_id : ""}`.trim(), 160),
      evidence: clip(input.fact || input.k, 240),
      confidence: 1,
    });
  } catch {
    temporal = { receipt: { hash: null } };
  }
  const stamp = await stampLearn(env, {
    k: input.k,
    subject: input.subject,
    fact: input.fact,
    memory: input.memory,
    rose_transition_hash: rose.transition.transition_hash,
    temporal_hash: temporal.receipt && temporal.receipt.hash,
    provenance_hash: input.provenance_hash,
  });
  if (!stamp.ok) return refuse("AKM-STAMP", stamp.message || stamp.refuse || "ChainLock append failed.", { stamp });
  await rebuildFromLearn(env);
  return {
    ok: true,
    spec: AKM_SPEC,
    author: AKM_AUTHOR,
    software_tab: false,
    belief_is_not_truth: true,
    authorizes_action: false,
    stamp: stamp.card,
    chainlock: { id: stamp.stamp.id, h: stamp.stamp.stamp_sha256, seq: stamp.seq },
    roseclock: { hash: rose.transition.transition_hash, sequence: rose.after.sequence, rollback: false },
    temporal: { hash: temporal.receipt && temporal.receipt.hash },
    memory_id: input.memory && input.memory.memory_id,
    node: getNode(input.memory && input.memory.memory_id),
  };
}

export async function providersFor(useCase, packet) {
  const invoked = [];
  const scores = {};
  const refs = [];
  const needed = new Set(useCase.default_triad || []);
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    if (useCase.providers && !useCase.providers.includes(id) && id !== "generic-evidence" && id !== "bayes") {
      continue;
    }
    const suitability = provider.canScore(packet, useCase);
    const supportsNeeded = (provider.CHANNELS_SUPPORTED || []).some((ch) => needed.has(ch) || ch === "E");
    if (suitability <= 0 || !supportsNeeded) continue;
    if (id === "spre" && !useCase.providers.includes("spre")) continue;
    if (id === "clce" && !useCase.providers.includes("clce")) continue;
    if (id === "zionpattern" && !useCase.providers.includes("zionpattern")) continue;
    invoked.push(id);
    const out = await provider.score(packet);
    if (out && out.score != null) {
      if (out.scores) {
        for (const [ch, v] of Object.entries(out.scores)) scores[ch] = v;
      } else {
        scores[out.channel] = out.score;
      }
      if (out.evidence_refs) refs.push(...out.evidence_refs);
    }
  }
  return { invoked, scores, refs };
}

export async function observe(env, src = {}) {
  const packet = src && typeof src === "object" ? src : {};
  const subject = clip(packet.subject || packet.s || "observation", 80);
  const fact = clip(packet.fact || packet.f || packet.claim || subject, 160);
  if (!fact) return refuse("AKM-NO-FACT", "Observation requires a fact. Hash-only cards are non-compliant.");
  const memory_id = packet.memory_id || bySubject(subject)?.memory_id || findOrCreateId(subject);
  const provenance_hash = packet.provenance_hash || (await sha256Hex(canonicalize({ subject, fact })));
  return forwardLearn(env, {
    k: "memory_observation",
    subject,
    fact,
    provenance_hash,
    capabilities: packet.capabilities,
    expected_rose_tip: packet.expected_rose_tip,
    memory: {
      memory_id,
      kind: "memory_observation",
      subject_key: subject,
      relation_key: packet.relation_key || null,
      object_key: packet.object_key || null,
      use_case: classifyUseCase(packet, "observe").id,
    },
  });
}

export async function resolve(env, src = {}) {
  const packet = src && typeof src === "object" ? src : {};
  const subject = clip(packet.subject || packet.s || "resolution", 80);
  const memory_id = packet.memory_id || bySubject(subject)?.memory_id;
  if (!memory_id) return refuse("AKM-NO-MEMORY", "Resolution requires memory_id or an observed subject.");
  const label = String(packet.outcome_label || "").toUpperCase();
  const unknown = label === "UNKNOWN" || packet.outcome === "UNKNOWN" || packet.outcome == null;
  if (!unknown && packet.outcome == null) {
    return refuse("AKM-NO-OUTCOME", "Outcome labels require evidence provenance. UNKNOWN is distinct from MISS.");
  }
  if (unknown && packet.treat_unknown_as_miss === true) {
    return refuse("AKM-UNKNOWN", "UNKNOWN does not count as failure or success.");
  }
  const fact = clip(packet.fact || `resolution ${unknown ? "UNKNOWN" : packet.outcome}`, 160);
  const quality = [
    packet.completeness,
    packet.provenance,
    packet.source_quality,
    packet.chain_integrity,
  ].filter((v) => v != null);
  const weight = packet.weight != null ? packet.weight : evidenceWeight(quality);
  return forwardLearn(env, {
    k: "memory_resolution",
    subject,
    fact,
    provenance_hash: packet.provenance_hash || packet.evidence_hash,
    capabilities: packet.capabilities,
    expected_rose_tip: packet.expected_rose_tip,
    memory: {
      memory_id,
      kind: "memory_resolution",
      outcome: unknown ? "UNKNOWN" : clip01(packet.outcome),
      outcome_label: unknown ? "UNKNOWN" : label || "GRADED",
      weight,
      evidence_hash: packet.evidence_hash || packet.provenance_hash,
      ai_generated: Boolean(packet.ai_generated),
      self_corroboration: Boolean(packet.self_corroboration),
    },
  });
}

async function kindEvent(env, src, kind, factDefault) {
  const packet = src && typeof src === "object" ? src : {};
  const subject = clip(packet.subject || packet.s || kind, 80);
  const memory_id = packet.memory_id || bySubject(subject)?.memory_id;
  if (!memory_id) return refuse("AKM-NO-MEMORY", `${kind} requires memory_id or an observed subject.`);
  return forwardLearn(env, {
    k: kind,
    subject,
    fact: clip(packet.fact || factDefault, 160),
    provenance_hash: packet.provenance_hash || packet.evidence_hash,
    capabilities: packet.capabilities,
    expected_rose_tip: packet.expected_rose_tip,
    memory: {
      memory_id,
      kind,
      supersedes: packet.supersedes || (kind === "memory_supersede" ? memory_id : null),
      useful: packet.useful,
      relevant: packet.relevant,
    },
  });
}

export async function support(env, src = {}) {
  return kindEvent(env, src, "memory_support", "support");
}

export async function contradict(env, src = {}) {
  return kindEvent(env, src, "memory_contradiction", "contradiction");
}

export async function supersede(env, src = {}) {
  const packet = src && typeof src === "object" ? src : {};
  const marked = await kindEvent(env, packet, "memory_supersede", "supersede");
  if (!marked.ok) return marked;
  if (packet.successor_fact || packet.successor_subject) {
    const successor = await observe(env, {
      subject: packet.successor_subject || `${packet.subject || "memory"}-successor`,
      fact: packet.successor_fact || packet.fact,
      use_case: packet.use_case,
      capabilities: packet.capabilities,
    });
    return {
      ...marked,
      successor: successor.ok ? successor : null,
      successor_error: successor.ok ? undefined : successor,
    };
  }
  return marked;
}

export async function revoke(env, src = {}) {
  return kindEvent(env, src, "memory_revoke", "revoke");
}

export async function feedback(env, src = {}) {
  return kindEvent(env, src, "retrieval_feedback", "retrieval feedback");
}

export async function calibrate(env, src = {}) {
  const packet = src && typeof src === "object" ? src : {};
  const caps = capabilitiesOf(packet);
  if (hasCap(caps, "MODEL_UPDATE")) {
    return refuse("AKM-NO-AUTO-MODEL", "No automatic model update without tests. Calibrators cannot self-grant MODEL_UPDATE.", {
      required: "CALIBRATE",
    });
  }
  const verified = await chainVerify(env, { c: "learn" });
  if (!verified.ok) return refuse("CHAIN_VERIFY_FAIL", "ChainLock verify failed. Adaptive path is closed.", { verify: verified });
  const subject = clip(packet.subject || packet.s || "calibration", 80);
  const memory_id = packet.memory_id || bySubject(subject)?.memory_id || findOrCreateId(subject);
  const node = getNode(memory_id);
  const useCase = classifyUseCase(packet, packet.operation || "calibrate");
  const posterior = rebuildPosterior(node ? node.resolutions : [], emptyPrior());
  const packetForProviders = {
    ...packet,
    alpha: posterior.alpha,
    beta: posterior.beta,
    posterior_probability: posterior.probability,
    effective_observations: posterior.effective_observations,
    effective_n: posterior.effective_observations,
  };
  const features = await providersFor(useCase, packetForProviders);
  const availability = inspectAvailability(packetForProviders, useCase, features.invoked);
  const selection = selectThreeOfFour(useCase, availability, posterior.effective_observations);
  const channel_scores = { ...features.scores, B: posterior.reliability };
  const triad = assembleTriadDecision({
    use_case: useCase,
    packet: packetForProviders,
    availability,
    effective_observations: posterior.effective_observations,
    channel_scores,
    providers_invoked: features.invoked,
    evidence_refs: features.refs,
    chain_refs: node ? node.source_chain_hashes.slice(-4) : [],
  });
  const prior_hash = node ? node.index_hash : null;
  const posterior_hash = await hashMemoryDelta({
    alpha: posterior.alpha,
    beta: posterior.beta,
    probability: posterior.probability,
    triad: triad.triad_score,
  });
  const fact = clip(
    triad.ok
      ? `calibrate ${memory_id} triad=${triad.triad_score} B=${posterior.probability.toFixed(3)}`
      : `calibrate ${memory_id} TRIAD_INCOMPLETE`,
    160,
  );
  const out = await forwardLearn(env, {
    k: "calibration_update",
    subject,
    fact,
    provenance_hash: packet.provenance_hash,
    capabilities: packet.capabilities || ["CALIBRATE"],
    expected_rose_tip: packet.expected_rose_tip,
    prior_hash,
    posterior_hash,
    memory: {
      memory_id,
      kind: "calibration_update",
      prior_hash,
      posterior_hash,
      channel_scores,
      latest_triad: triad,
      retrieval_weight: posterior.reliability,
      calibration_version: CALIBRATION_MANIFEST_VERSION,
      providers_invoked: features.invoked,
    },
  });
  if (!out.ok) return out;
  return {
    ...out,
    posterior,
    triad,
    providers_invoked: features.invoked,
    selection,
  };
}

export async function adaptiveRecall(storeOrEnv, input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const verified = await chainVerify(storeOrEnv, {});
  if (!verified.ok) {
    return refuse("CHAIN_VERIFY_FAIL", "ChainLock verify failed. Adaptive cards are not fed to AZAI/AZBot.", {
      verify: verified,
    });
  }
  const raw = await chainRecall(storeOrEnv, {
    q: src.q || src.query,
    depth: src.depth != null ? src.depth : 5,
    c: src.c || src.chain,
  });
  if (!raw.ok) return raw;
  const useCase = classifyUseCase(src, src.operation || "recall");
  const history = Boolean(src.history);
  const ranked = [];
  for (const card of raw.facts) {
    const node = byChainHash(card.h) || bySubject(card.s);
    const scored = retrievalScore({
      relevance: lexicalRelevance(src.q || src.query, card.s, card.f),
      posterior: node ? node.channel_scores.B ?? node.posterior_probability : 0.5,
      evidence: node && node.channel_scores.E != null ? node.channel_scores.E : 0.5,
      recency: recencyScore(card.t),
      triad_fit: node && node.latest_triad ? (node.latest_triad.use_case === useCase.id ? 1 : 0.5) : 0.5,
      status: node ? node.status : "ACTIVE",
      history,
      weights: RETRIEVAL_WEIGHTS,
    });
    ranked.push({
      card,
      node: node
        ? {
            memory_id: node.memory_id,
            status: node.status,
            posterior_probability: node.posterior_probability,
            effective_observations: node.effective_observations,
            brier_score: node.brier_score,
            latest_triad: node.latest_triad,
            channel_scores: node.channel_scores,
            index_hash: node.index_hash,
          }
        : null,
      score: scored.score,
      retrieval: scored,
      belief_is_not_truth: true,
    });
  }
  ranked.sort((a, b) => b.score - a.score);
  const cap = Math.min(MEMORY_CONTEXT_CAP, Number(src.limit) || MEMORY_CONTEXT_CAP);
  return {
    ok: true,
    spec: AKM_SPEC,
    adaptive: true,
    software_tab: false,
    author: AKM_AUTHOR,
    belief_is_not_truth: true,
    authorizes_action: false,
    verified: true,
    use_case: useCase.id,
    count: Math.min(ranked.length, cap),
    facts: ranked.slice(0, cap),
  };
}

export async function explain(memoryId, view = "get") {
  const node = getNode(memoryId);
  if (!node) return refuse("AKM-NOT-FOUND", "Unknown memory id.", { memory_id: memoryId });
  const base = {
    ok: true,
    spec: AKM_SPEC,
    author: AKM_AUTHOR,
    software_tab: false,
    belief_is_not_truth: true,
    authorizes_action: false,
    memory_id: node.memory_id,
    status: node.status,
  };
  if (view === "history") {
    return { ...base, events: node.events, source_chain_hashes: node.source_chain_hashes, resolutions: node.resolutions };
  }
  if (view === "calibration") {
    return {
      ...base,
      alpha: node.alpha,
      beta: node.beta,
      posterior_probability: node.posterior_probability,
      posterior_variance: node.posterior_variance,
      effective_observations: node.effective_observations,
      brier_score: node.brier_score,
      channel_scores: node.channel_scores,
      latest_triad: node.latest_triad,
      index_hash: node.index_hash,
      retrieval_weight: node.retrieval_weight,
      calibration_version: node.retrieval_version,
    };
  }
  return { ...base, node };
}

export async function rebuildIndex(env, src = {}, request = null) {
  const local = src.local === true && !request;
  const operator = request ? isOperator(request, env) : false;
  if (!local && !operator) {
    return refuse("AKM-OPERATOR", "rebuild-index is OPERATOR / local only.", { operator: false });
  }
  const rebuilt = await rebuildFromLearn(env);
  return {
    ok: true,
    spec: AKM_SPEC,
    author: AKM_AUTHOR,
    software_tab: false,
    operator: Boolean(operator || local),
    ...rebuilt,
  };
}

export async function memoryHealth() {
  return {
    ok: true,
    spec: AKM_SPEC,
    author: AKM_AUTHOR,
    software_tab: false,
    nodes: allNodes().length,
    manifest: manifestView(),
    learn_kinds: LEARN_KINDS.slice(),
    belief_is_not_truth: true,
  };
}

export function memorySkill() {
  return {
    markdown: `# Adaptive Knowledge Memory (AKM-TRIAD-1.0)

Fabric recollection over ChainLock learn. Bayesian posterior is **calibrated belief**, not truth. History never changes.

FragGate is THE single door. Not a Softwares-tab product.

Author: **Aziel Eliab** only.
`,
    spec: AKM_SPEC,
    software_tab: false,
  };
}

export async function runMemoryOp(op, payload, env, request = null) {
  const src = payload && typeof payload === "object" ? payload : {};
  const action = String(op || "").trim();
  if (MEMORY_STUB_OPS.includes(action)) {
    return refuse("AKM-STUB", `${action} is refused. No rollback, no history rewrite, no automatic model update.`);
  }
  if (action === "health") return memoryHealth();
  if (action === "skill") return memorySkill();
  if (action === "observe") return observe(env, src);
  if (action === "resolve") return resolve(env, src);
  if (action === "calibrate") return calibrate(env, src);
  if (action === "recall") return adaptiveRecall(env, src);
  if (action === "support") return support(env, src);
  if (action === "contradict") return contradict(env, src);
  if (action === "supersede") return supersede(env, src);
  if (action === "revoke") return revoke(env, src);
  if (action === "feedback") return feedback(env, src);
  if (action === "get") return explain(src.memory_id || src.id, src.view || "get");
  if (action === "history") return explain(src.memory_id || src.id, "history");
  if (action === "calibration") return explain(src.memory_id || src.id, "calibration");
  if (action === "rebuild-index" || action === "rebuild_index") return rebuildIndex(env, src, request);
  return refuse("AKM-UNKNOWN-OP", `Unknown memory op ${JSON.stringify(op || "")}.`, { ops: MEMORY_CANONICAL_OPS.slice() });
}

export function isMemoryMcpTool(name) {
  return MEMORY_MCP_TOOLS.includes(String(name || "").trim());
}

export function parseMemoryOp(name, args) {
  const n = String(name || "");
  if (n.startsWith("memory_")) return n.slice("memory_".length).replace(/_/g, "-");
  return String((args && (args.op || args.verb)) || "health");
}

export async function runMemoryMcp(name, args, env) {
  const op = parseMemoryOp(name, args);
  return runMemoryOp(op, args, env, null);
}

export function memoryMcpTools() {
  const base = {
    additionalProperties: true,
    type: "object",
    properties: {
      subject: { type: "string" },
      fact: { type: "string" },
      memory_id: { type: "string" },
      use_case: { type: "string" },
    },
  };
  return [
    {
      name: "memory_observe",
      title: "Observe a memory",
      description:
        "Append a memory_observation to the ChainLock learn chain (AKM-TRIAD-1.0). Fabric — not Softwares-tab. Posterior ≠ truth.",
      annotations: { title: "Observe a memory", readOnlyHint: false, openWorldHint: false },
      inputSchema: { ...base, required: ["fact"] },
    },
    {
      name: "memory_resolve",
      title: "Resolve a memory outcome",
      description:
        "Append a memory_resolution. UNKNOWN is distinct from MISS. Does not rewrite history. AKM-TRIAD-1.0.",
      annotations: { title: "Resolve a memory outcome", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        ...base,
        properties: { ...base.properties, outcome: { type: "number" }, outcome_label: { type: "string" } },
      },
    },
    {
      name: "memory_calibrate",
      title: "Calibrate a memory",
      description:
        "Deterministic 3-of-4 triad + Bayesian posterior. Forward-only RoseClock LEARN. No automatic MODEL_UPDATE. AKM-TRIAD-1.0.",
      annotations: { title: "Calibrate a memory", readOnlyHint: false, openWorldHint: false },
      inputSchema: base,
    },
    {
      name: "memory_recall",
      title: "Adaptive recall",
      description:
        "Ranked adaptive recall after ChainLock verify. Additive path — normal recall/verify untouched. Belief ≠ truth.",
      annotations: { title: "Adaptive recall", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { q: { type: "string" }, use_case: { type: "string" }, depth: { type: "number" } },
      },
    },
    {
      name: "memory_get",
      title: "Explain a memory",
      description:
        "Read-only explainability: node, history, or calibration (posterior, triad legs, effective N, Brier). AKM-TRIAD-1.0.",
      annotations: { title: "Explain a memory", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          memory_id: { type: "string" },
          id: { type: "string" },
          view: { type: "string", description: "get | history | calibration" },
        },
      },
    },
  ];
}

export function wrapMemoryDisplay(name, body) {
  const status = body && body.ok === false ? 400 : 200;
  const envelope = wrapToolOutput({
    name,
    text: JSON.stringify(body),
    status,
    product: { name: MEMORY_NAME, slug: MEMORY_SLUG },
    op: name,
    extra: {},
  });
  envelope.display = envelope.display || {};
  envelope.display.title = envelope.display.title || MEMORY_NAME;
  envelope.display.summary =
    body && body.ok === false
      ? body.message || body.code
      : body.triad
        ? `Triad ${body.triad.triad_score} omitted ${body.triad.omitted}. Posterior is not truth.`
        : body.adaptive
          ? `Adaptive recall ${body.count} cards after ChainLock verify.`
          : "Adaptive knowledge memory.";
  return { status, text: JSON.stringify(envelope, null, 2), envelope, product: { name: MEMORY_NAME, slug: MEMORY_SLUG }, op: name };
}

export async function feedCalibratedCards(env, query, useCase) {
  const recalled = await adaptiveRecall(env, { q: query, use_case: useCase, depth: 5 });
  if (!recalled.ok) return recalled;
  return {
    ok: true,
    verified: true,
    cards: recalled.facts,
    belief_is_not_truth: true,
    authorizes_action: false,
  };
}

export async function dispatchMemoryHttp(method, pathname, payload, env, request) {
  const m = String(method || "GET").toUpperCase();
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  const postOps = {
    "/v1/memory/observe": "observe",
    "/v1/memory/resolve": "resolve",
    "/v1/memory/calibrate": "calibrate",
    "/v1/memory/recall": "recall",
    "/v1/memory/rebuild-index": "rebuild-index",
  };
  if (postOps[path]) {
    if (m !== "POST") {
      return { status: 405, body: refuse("AKM-METHOD", `POST ${path}.`) };
    }
    const body = await runMemoryOp(postOps[path], payload, env, request);
    return { status: body.ok === false ? 400 : 200, body };
  }
  const getMatch = path.match(/^\/v1\/memory\/([^/]+)(?:\/(history|calibration))?$/);
  if (getMatch && (m === "GET" || m === "HEAD")) {
    const view = getMatch[2] || "get";
    const body = await explain(decodeURIComponent(getMatch[1]), view);
    return { status: body.ok === false ? 404 : 200, body };
  }
  if (path === "/v1/memory" && (m === "GET" || m === "HEAD")) {
    return { status: 200, body: await memoryHealth() };
  }
  return {
    status: 404,
    body: refuse("AKM-NOT-FOUND", "Unknown memory path.", {
      hint: "POST /v1/memory/observe|resolve|calibrate|recall  GET /v1/memory/{id}[/history|/calibration]  POST /v1/memory/rebuild-index",
    }),
  };
}

export { tipOf };
