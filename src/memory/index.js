/**
 * Derived AdaptiveMemoryNode index.
 *
 * Rebuildable from the immutable ChainLock learn chain.
 * Never replaces history. Author: Aziel Eliab only.
 */

import {
  DEFAULT_ALPHA0,
  DEFAULT_BETA0,
  emptyPrior,
  hashMemoryDelta,
  posteriorMean,
  posteriorVariance,
  rebuildPosterior,
} from "../chainlock/adaptive.js";
import { loadChain } from "../chainlock/ops.js";
import { storeFor } from "../chainlock/store.js";
import { canonicalize, sha256Hex } from "../session-core.js";
import { CALIBRATION_MANIFEST_VERSION } from "./calibration-manifest.js";

export const INDEX_VERSION = "AKM-IDX-1.0";
export const MEMORY_STATUSES = Object.freeze(["ACTIVE", "CONTESTED", "SUPERSEDED", "REVOKED"]);
export const LEARN_KINDS = Object.freeze([
  "memory_observation",
  "memory_support",
  "memory_contradiction",
  "memory_resolution",
  "calibration_update",
  "memory_supersede",
  "memory_revoke",
  "retrieval_feedback",
]);

const derived = new Map();

export function resetMemoryIndexForTests() {
  derived.clear();
}

function newMemoryId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "akm_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function subjectKeyOf(stamp, memory) {
  return String((memory && memory.subject_key) || stamp.subject || stamp.id || "").slice(0, 80);
}

function emptyNode(memoryId, stamp, memory) {
  return {
    memory_id: memoryId,
    subject_key: subjectKeyOf(stamp, memory),
    relation_key: (memory && memory.relation_key) || null,
    object_key: (memory && memory.object_key) || null,
    source_chain_hashes: [],
    provenance_refs: [],
    first_seen_rose_hash: stamp.rose_transition_hash || null,
    latest_state_rose_hash: stamp.rose_transition_hash || null,
    status: "ACTIVE",
    supersedes: null,
    contradicted_by: [],
    supported_by: [],
    alpha: DEFAULT_ALPHA0,
    beta: DEFAULT_BETA0,
    posterior_probability: 0.5,
    posterior_variance: posteriorVariance(DEFAULT_ALPHA0, DEFAULT_BETA0),
    effective_observations: 0,
    brier_score: null,
    channel_scores: {},
    latest_triad: null,
    retrieval_weight: 0.5,
    retrieval_version: CALIBRATION_MANIFEST_VERSION,
    last_recalled_at: null,
    index_hash: null,
    resolutions: [],
    events: [],
  };
}

function applyResolution(node, memory, stamp) {
  const label = String((memory && memory.outcome_label) || "").toUpperCase();
  const outcome = memory && memory.outcome;
  node.resolutions.push({
    kind: "memory_resolution",
    outcome: label === "UNKNOWN" || outcome === "UNKNOWN" ? "UNKNOWN" : outcome,
    outcome_label: label || null,
    weight: memory && memory.weight,
    evidence_hash: (memory && (memory.evidence_hash || memory.provenance_hash)) || stamp.provenance_hash || stamp.fh,
    ai_generated: Boolean(memory && memory.ai_generated),
    self_corroboration: Boolean(memory && memory.self_corroboration),
    stamp_sha256: stamp.stamp_sha256,
  });
}

function refreshPosterior(node) {
  const rebuilt = rebuildPosterior(node.resolutions, emptyPrior());
  node.alpha = rebuilt.alpha;
  node.beta = rebuilt.beta;
  node.posterior_probability = rebuilt.probability;
  node.posterior_variance = rebuilt.variance;
  node.effective_observations = rebuilt.effective_observations;
  node.brier_score = rebuilt.brier;
  node.channel_scores = { ...(node.channel_scores || {}), B: rebuilt.reliability };
  return rebuilt;
}

export async function nodeIndexHash(node) {
  const body = {
    memory_id: node.memory_id,
    subject_key: node.subject_key,
    status: node.status,
    alpha: node.alpha,
    beta: node.beta,
    posterior_probability: node.posterior_probability,
    effective_observations: node.effective_observations,
    source_chain_hashes: node.source_chain_hashes,
    latest_state_rose_hash: node.latest_state_rose_hash,
    channel_scores: node.channel_scores,
    latest_triad: node.latest_triad && {
      selected: node.latest_triad.selected,
      omitted: node.latest_triad.omitted,
      triad_score: node.latest_triad.triad_score,
    },
  };
  return sha256Hex(canonicalize(body));
}

export function applyStampToNode(node, stamp) {
  const memory = stamp.memory && typeof stamp.memory === "object" ? stamp.memory : {};
  const kind = stamp.k || memory.kind || "stamp";
  if (stamp.stamp_sha256 && !node.source_chain_hashes.includes(stamp.stamp_sha256)) {
    node.source_chain_hashes.push(stamp.stamp_sha256);
  }
  if (stamp.provenance_hash && !node.provenance_refs.includes(stamp.provenance_hash)) {
    node.provenance_refs.push(stamp.provenance_hash);
  }
  if (stamp.rose_transition_hash) node.latest_state_rose_hash = stamp.rose_transition_hash;
  node.events.push({ k: kind, h: stamp.stamp_sha256, t: stamp.t, id: stamp.id });

  if (kind === "memory_support") {
    if (stamp.stamp_sha256) node.supported_by.push(stamp.stamp_sha256);
    if (node.status === "ACTIVE") node.status = "ACTIVE";
  }
  if (kind === "memory_contradiction") {
    if (stamp.stamp_sha256) node.contradicted_by.push(stamp.stamp_sha256);
    if (node.status === "ACTIVE") node.status = "CONTESTED";
  }
  if (kind === "memory_resolution") {
    applyResolution(node, memory, stamp);
    refreshPosterior(node);
  }
  if (kind === "calibration_update") {
    if (memory.channel_scores && typeof memory.channel_scores === "object") {
      node.channel_scores = { ...node.channel_scores, ...memory.channel_scores };
    }
    if (memory.latest_triad) node.latest_triad = memory.latest_triad;
    if (memory.retrieval_weight != null) node.retrieval_weight = Number(memory.retrieval_weight);
    refreshPosterior(node);
  }
  if (kind === "memory_supersede") {
    node.status = "SUPERSEDED";
    node.supersedes = memory.supersedes || node.memory_id;
  }
  if (kind === "memory_revoke") {
    node.status = "REVOKED";
  }
  if (kind === "retrieval_feedback") {
    node.last_recalled_at = stamp.t || node.last_recalled_at;
  }
  return node;
}

export async function rebuildFromLearn(storeOrEnv) {
  const store = storeFor(storeOrEnv);
  const rows = await loadChain(store, "learn");
  const byId = new Map();
  const bySubject = new Map();
  for (const stamp of rows) {
    if (!stamp || stamp._broken) continue;
    const memory = stamp.memory && typeof stamp.memory === "object" ? stamp.memory : {};
    const kind = stamp.k || "";
    if (!LEARN_KINDS.includes(kind) && !memory.memory_id) continue;
    let id = memory.memory_id || null;
    if (!id) {
      const sk = subjectKeyOf(stamp, memory);
      id = bySubject.get(sk) || null;
    }
    if (!id) id = newMemoryId();
    let node = byId.get(id);
    if (!node) {
      node = emptyNode(id, stamp, memory);
      if (!node.first_seen_rose_hash) node.first_seen_rose_hash = stamp.rose_transition_hash || null;
      byId.set(id, node);
      bySubject.set(node.subject_key, id);
    }
    applyStampToNode(node, stamp);
  }
  for (const node of byId.values()) {
    node.index_hash = await nodeIndexHash(node);
  }
  derived.clear();
  for (const [id, node] of byId) derived.set(id, node);
  return {
    ok: true,
    v: INDEX_VERSION,
    count: byId.size,
    nodes: [...byId.values()],
    derived: true,
    authority: "chainlock-learn",
  };
}

export function getNode(memoryId) {
  return derived.get(String(memoryId || "")) || null;
}

export function allNodes() {
  return [...derived.values()];
}

export function byChainHash(hash) {
  const h = String(hash || "");
  for (const node of derived.values()) {
    if (node.source_chain_hashes.includes(h)) return node;
  }
  return null;
}

export function bySubject(subject) {
  const key = String(subject || "").slice(0, 80);
  for (const node of derived.values()) {
    if (node.subject_key === key) return node;
  }
  return null;
}

export async function upsertNode(node) {
  const copy = { ...node };
  copy.index_hash = await nodeIndexHash(copy);
  derived.set(copy.memory_id, copy);
  return copy;
}

export function findOrCreateId(subjectKey) {
  const existing = bySubject(subjectKey);
  if (existing) return existing.memory_id;
  return newMemoryId();
}

export { newMemoryId, posteriorMean, hashMemoryDelta };
