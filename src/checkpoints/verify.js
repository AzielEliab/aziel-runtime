/**
 * Verify checkpoint signatures, continuity, sequence, and Merkle inclusion.
 * A conflicting checkpoint is refused unless the already accepted roster
 * signs a fork statement. The incoming roster cannot authorize itself.
 * A continuation that changes the signer set needs that same prior quorum.
 * Author: Aziel Eliab only.
 */

import { canonicalize, isHex64, utf8 } from "../security/canonical.js";
import { verifyBytes } from "../security/signatures.js";
import { hashCheckpoint, hashRecord, signerSetHash } from "./checkpoint.js";
import { merkleProof, verifyMerkleInclusion } from "./merkle.js";

function fail(code, message, extra = {}) {
  return { ok: false, code, fail_closed: true, message, ...extra };
}

export function createCheckpointLog() {
  return { accepted: [], audit: [], tip: null };
}

export async function verifyCheckpoint(checkpoint, records) {
  if (!checkpoint || !Array.isArray(records) || !records.length) {
    return fail("AZP-CHECKPOINT", "Checkpoint or records are missing.");
  }
  if (checkpoint.protocol_version !== "AZP-NS-1.0") return fail("AZP-DOWNGRADE", "Checkpoint protocol version is refused.");
  const published = [...(checkpoint.signer_set || [])].map(String);
  const signerSet = [...published].sort();
  const threshold = Number(checkpoint.threshold);
  if (!signerSet.length || !Number.isInteger(threshold) || threshold < 1 || threshold > signerSet.length) {
    return fail("AZP-THRESHOLD", "Signer roster is not acceptable.");
  }
  if (JSON.stringify(published) !== JSON.stringify(signerSet)) {
    return fail("AZP-THRESHOLD", "Signer roster is not sorted. Fail closed.");
  }
  const start = records[0];
  const end = records[records.length - 1];
  if (start.sequence !== checkpoint.start_seq || end.sequence !== checkpoint.end_seq) {
    return fail("AZP-CHECKPOINT", "Checkpoint sequence range does not match the records.");
  }
  if (start.record_hash !== checkpoint.start_hash || end.record_hash !== checkpoint.end_hash) {
    return fail("AZP-CHECKPOINT", "Checkpoint end hashes do not match the records.");
  }
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    if (row.sequence !== checkpoint.start_seq + i) return fail("AZP-ROLLBACK", "Sequence is not monotonic.");
    if (i > 0 && row.previous_hash !== records[i - 1].record_hash) {
      return fail("AZP-ROLLBACK", "Previous hash does not continue.");
    }
    if ((await hashRecord(row)) !== row.record_hash || !isHex64(row.record_hash)) {
      return fail("AZP-CHECKPOINT", "Record hash does not recompute.");
    }
  }
  const setHash = await signerSetHash(signerSet, threshold);
  const again = await hashCheckpoint(checkpoint, setHash);
  if (again !== checkpoint.checkpoint_hash) return fail("AZP-CHECKPOINT", "Checkpoint hash does not recompute.");
  const seen = new Set();
  let good = 0;
  for (const sig of checkpoint.signatures || []) {
    if (!sig || seen.has(sig.public_key) || !signerSet.includes(sig.public_key)) continue;
    if (await verifyBytes(sig.public_key, utf8(checkpoint.checkpoint_hash), sig.sig)) {
      seen.add(sig.public_key);
      good += 1;
    }
  }
  if (good < threshold) return fail("AZP-THRESHOLD", "Signature threshold was not met.");
  return { ok: true, checkpoint_hash: checkpoint.checkpoint_hash, signer_count: good };
}

export async function verifyCheckpointRecords(checkpoint, records) {
  const base = await verifyCheckpoint(checkpoint, records);
  if (!base.ok) return base;
  const proof = await merkleProof(records.map((row) => row.record_hash), records.length - 1);
  if (!proof.ok) return proof;
  const included = await verifyMerkleInclusion(checkpoint.merkle_root, records[records.length - 1].record_hash, records.length - 1, proof.proof);
  if (!included.ok) return included;
  if (proof.root !== checkpoint.merkle_root) return fail("AZP-CHECKPOINT", "Merkle root does not match.");
  return { ok: true, checkpoint_hash: checkpoint.checkpoint_hash, merkle_root: checkpoint.merkle_root };
}

function overlaps(a, b) {
  return !(a.end_seq < b.start_seq || b.end_seq < a.start_seq);
}

export async function forkStatement(opts) {
  return canonicalize({
    type: "azp-fork",
    protocol_version: "AZP-NS-1.0",
    network_id: opts.network_id,
    chain_id: opts.chain_id,
    from_hash: opts.from_hash,
    to_hash: opts.to_hash,
    reason: String(opts.reason || ""),
  });
}

function sameRoster(prior, checkpoint) {
  return (
    JSON.stringify(prior.signer_set) === JSON.stringify(checkpoint.signer_set) &&
    prior.threshold === checkpoint.threshold
  );
}

/**
 * Fork and roster-change authorization counts signatures from the accepted
 * tip's roster. A checkpoint does not get to lower its own threshold and
 * then approve the replacement.
 */
async function forkAuthorized(prior, incoming, fork) {
  if (!prior || !Array.isArray(prior.signer_set) || !Number.isInteger(prior.threshold)) return false;
  if (!fork || !fork.reason || !Array.isArray(fork.authorizations)) return false;
  const statement = await forkStatement({
    network_id: incoming.network_id,
    chain_id: incoming.chain_id,
    from_hash: prior.checkpoint_hash,
    to_hash: incoming.checkpoint_hash,
    reason: fork.reason,
  });
  const seen = new Set();
  for (const auth of fork.authorizations) {
    if (!auth || !prior.signer_set.includes(auth.public_key) || seen.has(auth.public_key)) continue;
    if (await verifyBytes(auth.public_key, utf8(statement), auth.sig)) seen.add(auth.public_key);
  }
  return seen.size >= prior.threshold;
}

export async function acceptCheckpoint(log, checkpoint, records, opts = {}) {
  if (!log || !Array.isArray(log.accepted)) return fail("AZP-CHECKPOINT", "Checkpoint log is missing.");
  const verified = await verifyCheckpointRecords(checkpoint, records);
  if (!verified.ok) {
    log.audit.push({ code: verified.code, checkpoint_hash: checkpoint && checkpoint.checkpoint_hash, message: verified.message });
    return verified;
  }
  const prior = log.tip;
  if (prior && checkpoint.checkpoint_hash === prior.checkpoint_hash) {
    return { ok: true, checkpoint_hash: checkpoint.checkpoint_hash, replayed: true };
  }
  const revoked = new Set((opts.revokedPublicKeys || []).map(String));
  if ((checkpoint.signer_set || []).some((key) => revoked.has(key))) {
    const event = {
      code: "AZP-THRESHOLD",
      checkpoint_hash: checkpoint.checkpoint_hash,
      prior_hash: prior ? prior.checkpoint_hash : "",
      message: "A revoked signer is in the roster. New checkpoint refused. Accepted history is unchanged.",
    };
    log.audit.push(event);
    return fail("AZP-THRESHOLD", event.message, { audit: event });
  }
  if (prior) {
    const continues = checkpoint.start_seq === prior.end_seq + 1 && records[0].previous_hash === prior.end_hash;
    if (continues && !sameRoster(prior, checkpoint)) {
      const allowed = await forkAuthorized(prior, checkpoint, opts.fork);
      if (!allowed) {
        const event = {
          code: "AZP-THRESHOLD",
          checkpoint_hash: checkpoint.checkpoint_hash,
          prior_hash: prior.checkpoint_hash,
          message: "Signer roster changed without a quorum of the accepted roster. One signer cannot force accept.",
        };
        log.audit.push(event);
        return fail("AZP-THRESHOLD", event.message, { audit: event });
      }
      log.audit.push({
        code: "AZP-FORK",
        checkpoint_hash: checkpoint.checkpoint_hash,
        prior_hash: prior.checkpoint_hash,
        reason: opts.fork.reason,
      });
    } else if (!continues) {
      const conflict = checkpoint.end_seq <= prior.end_seq || overlaps(checkpoint, prior) || records[0].previous_hash !== prior.end_hash;
      if (conflict) {
        const allowed = await forkAuthorized(prior, checkpoint, opts.fork);
        if (!allowed) {
          const event = {
            code: "AZP-ROLLBACK",
            checkpoint_hash: checkpoint.checkpoint_hash,
            prior_hash: prior.checkpoint_hash,
            message: "Checkpoint conflicts with an accepted tip. Refused.",
          };
          log.audit.push(event);
          return fail("AZP-ROLLBACK", event.message, { audit: event });
        }
        log.audit.push({
          code: "AZP-FORK",
          checkpoint_hash: checkpoint.checkpoint_hash,
          prior_hash: prior.checkpoint_hash,
          reason: opts.fork.reason,
        });
      }
    }
  }
  log.accepted.push({ checkpoint_hash: checkpoint.checkpoint_hash, checkpoint, records });
  log.tip = checkpoint;
  return { ok: true, checkpoint_hash: checkpoint.checkpoint_hash, tip_seq: checkpoint.end_seq };
}
