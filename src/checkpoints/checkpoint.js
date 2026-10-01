/**
 * Signed checkpoints over a hash-linked record range.
 * Layered beside ChainLock. ChainLock rows are not rewritten.
 * Checkpoint payloads keep hashes, not application secrets.
 * Author: Aziel Eliab only.
 */

import { AZP_SPEC } from "../security/claims.js";
import { canonicalHash, domainHash, ZERO_HASH, isHex64 } from "../security/canonical.js";
import { merkleRoot } from "./merkle.js";

export const CHECKPOINT_SPEC = AZP_SPEC;

function fail(code, message) {
  return { ok: false, code, fail_closed: true, message };
}

export function timestampBucket(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return String(Math.floor(ms / 60_000));
}

export async function hashRecord(record) {
  return domainHash("AZP-RECORD-1", [
    record.protocol_version,
    record.chain_id,
    String(record.sequence),
    record.previous_hash,
    String(record.timestamp_bucket),
    record.record_type,
    record.canonical_payload_hash,
  ]);
}

/**
 * Checkpoint hash includes the handoff fields plus protocol_version,
 * network_id, and signer_set_hash so a roster or network swap fails.
 */
export async function hashCheckpoint(body, signerSetHash) {
  return domainHash("AZP-CHECKPOINT-1", [
    body.protocol_version,
    body.network_id,
    body.chain_id,
    String(body.start_seq),
    String(body.end_seq),
    body.start_hash,
    body.end_hash,
    body.merkle_root,
    signerSetHash,
  ]);
}

export async function buildRecordChain(opts = {}) {
  const entries = Array.isArray(opts.entries) ? opts.entries : [];
  if (!entries.length) return fail("AZP-CHECKPOINT", "Record chain is empty.");
  const chainId = String(opts.chainId || "session");
  const protocol = opts.protocolVersion || CHECKPOINT_SPEC;
  let previous = opts.previousHash || ZERO_HASH;
  let sequence = Number.isInteger(opts.startSeq) ? opts.startSeq : 0;
  const records = [];
  for (const entry of entries) {
    const payload = entry && entry.payload && typeof entry.payload === "object" ? entry.payload : {};
    const bucket = entry.timestamp_bucket || timestampBucket(entry.timestamp || entry.created_at);
    if (!bucket) return fail("AZP-CHECKPOINT", "Record timestamp is missing.");
    const record = {
      protocol_version: protocol,
      chain_id: chainId,
      sequence,
      previous_hash: previous,
      timestamp_bucket: bucket,
      record_type: String(entry.record_type || "provenance"),
      canonical_payload_hash: await canonicalHash(payload),
    };
    record.record_hash = await hashRecord(record);
    if (!isHex64(record.record_hash) || !isHex64(record.previous_hash) && record.previous_hash !== ZERO_HASH) {
      return fail("AZP-CHECKPOINT", "Record hash is not 64 hex characters.");
    }
    records.push(record);
    previous = record.record_hash;
    sequence += 1;
  }
  return { ok: true, records };
}

export async function recordsFromChainlock(rows, opts = {}) {
  if (!Array.isArray(rows) || !rows.length) return fail("AZP-CHECKPOINT", "ChainLock chain is empty.");
  const entries = [];
  for (const stamp of rows) {
    if (!stamp || !stamp.stamp_sha256 || !stamp.fh) return fail("AZP-CHECKPOINT", "ChainLock stamp is incomplete.");
    entries.push({
      record_type: "chainlock-stamp",
      timestamp: stamp.t,
      payload: {
        chainlock_id: stamp.id,
        chainlock_stamp_sha256: stamp.stamp_sha256,
        chainlock_prev: stamp.prev,
        fact_sha256: stamp.fh,
      },
    });
  }
  return buildRecordChain({ ...opts, entries });
}

export async function minimumProvenance(opts = {}) {
  const payload = opts.payload == null ? "" : opts.payload;
  return {
    ok: true,
    protocol_version: CHECKPOINT_SPEC,
    session_id: String(opts.session_id || ""),
    policy: String(opts.policy || "admit"),
    payload_sha256: await canonicalHash(typeof payload === "string" ? payload : payload),
  };
}

export async function signerSetHash(signerSet, threshold) {
  const keys = [...signerSet].map(String).sort();
  return canonicalHash({ threshold, signer_set: keys });
}

export async function buildCheckpoint(opts = {}) {
  const records = opts.records;
  if (!Array.isArray(records) || !records.length) return fail("AZP-CHECKPOINT", "Checkpoint range is empty.");
  const signerSet = [...(opts.signerSet || [])].map(String).sort();
  const threshold = Number.isInteger(opts.threshold) ? opts.threshold : signerSet.length;
  if (!signerSet.length || threshold < 1 || threshold > signerSet.length) {
    return fail("AZP-THRESHOLD", "Signer threshold is outside the roster.");
  }
  const start = records[0];
  const end = records[records.length - 1];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    if (row.sequence !== start.sequence + i) return fail("AZP-CHECKPOINT", "Sequence is not monotonic.");
    if (i > 0 && row.previous_hash !== records[i - 1].record_hash) {
      return fail("AZP-CHECKPOINT", "Hash continuity broke inside the range.");
    }
    const again = await hashRecord(row);
    if (again !== row.record_hash) return fail("AZP-CHECKPOINT", "Record hash does not recompute.");
  }
  const merkle = await merkleRoot(records.map((row) => row.record_hash));
  if (!merkle.ok) return merkle;
  const body = {
    protocol_version: opts.protocolVersion || CHECKPOINT_SPEC,
    network_id: String(opts.networkId || "aziel-runtime"),
    chain_id: String(opts.chainId || start.chain_id),
    start_seq: start.sequence,
    end_seq: end.sequence,
    start_hash: start.record_hash,
    end_hash: end.record_hash,
    merkle_root: merkle.root,
    created_at: opts.createdAt || new Date(opts.now || Date.now()).toISOString(),
    signer_set: signerSet,
    threshold,
  };
  const setHash = await signerSetHash(signerSet, threshold);
  body.checkpoint_hash = await hashCheckpoint(body, setHash);
  const signatures = [];
  for (const signer of opts.signers || []) {
    if (!signer || !signerSet.includes(signer.public_key) || typeof signer.sign !== "function") continue;
    signatures.push({ public_key: signer.public_key, sig: await signer.sign(body.checkpoint_hash) });
  }
  const unique = new Set(signatures.map((row) => row.public_key));
  if (unique.size < threshold) return fail("AZP-THRESHOLD", "Not enough roster signatures.");
  return { ok: true, checkpoint: { ...body, signatures } };
}
