/**
 * Reconstruct a chain from independent checkpointed replicas.
 * A single replica is not enough. A tie fails closed.
 * Author: Aziel Eliab only.
 */

import { inspectPeerState } from "./peer-state.js";
import { verifyCheckpointRecords } from "../checkpoints/verify.js";

function fail(code, message, extra = {}) {
  return { ok: false, code, fail_closed: true, message, ...extra };
}

export async function recoverFromReplicas(replicas, opts = {}) {
  const minReplicas = Number.isInteger(opts.minReplicas) ? opts.minReplicas : 2;
  const groups = new Map();
  const excluded = [];
  for (const replica of replicas || []) {
    const state = replica && replica.state ? replica.state : replica;
    const provider = String((state && state.provider_id) || (replica && replica.provider_id) || "");
    const inspected = inspectPeerState(state);
    if (!inspected.ok) {
      excluded.push({ provider_id: provider, code: inspected.code });
      continue;
    }
    const checkpoint = state.checkpoints && state.checkpoints[0];
    const records = state.records || [];
    const verified = await verifyCheckpointRecords(checkpoint, records);
    if (!verified.ok) {
      excluded.push({ provider_id: provider, code: verified.code });
      continue;
    }
    const bucket = groups.get(verified.checkpoint_hash) || { hash: verified.checkpoint_hash, providers: [], checkpoint, records };
    if (!bucket.providers.includes(provider)) bucket.providers.push(provider);
    groups.set(verified.checkpoint_hash, bucket);
  }
  const ranked = [...groups.values()].sort((a, b) => b.providers.length - a.providers.length);
  if (!ranked.length) return fail("AZP-RECOVER-SHORT", "No verifiable replica remains.", { excluded });
  if (ranked.length > 1 && ranked[0].providers.length === ranked[1].providers.length) {
    return fail("AZP-RECOVER-SPLIT", "Replica checkpoint hashes tied. Fail closed.", { excluded });
  }
  const best = ranked[0];
  if (best.providers.length < minReplicas) {
    return fail("AZP-RECOVER-SHORT", "Not enough independent replicas. Fail closed.", {
      providers: best.providers,
      excluded,
    });
  }
  return {
    ok: true,
    checkpoint_hash: best.hash,
    checkpoint: best.checkpoint,
    records: best.records,
    providers: best.providers,
    excluded,
    live_multi_provider: false,
    mode: "FIXTURE",
  };
}
