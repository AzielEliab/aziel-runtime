/**
 * ACT-RECEIPT-1.1 identity anchor. ACT-RECEIPT-1.0 four-field hash stays the same.
 * Author: Aziel Eliab only.
 */

import { eventMetadata, hashActReceipt, oneSentence } from "../library-receipts.js";
import { RUNTIME_VERSION } from "../runtime-api.js";
import { hashStatement, isHex64, publicKeyMatchesHandle } from "./codec.js";
import { verifyObject } from "./identity.js";
import { FED_RECEIPT_SPEC, FED_SPEC, ZERO_HASH } from "./spec.js";

export function anchorStatement(anchor) {
  return {
    v: FED_SPEC,
    handle: anchor.handle,
    public_key: anchor.public_key,
    seq: anchor.seq,
    prev: anchor.prev,
    receipt_hash: anchor.receipt_hash,
  };
}

export async function attachIdentityAnchor(receipt, identity, { seq, prev }) {
  const unsigned = {
    previous_hash: receipt.previous_hash,
    request: receipt.request,
    output: receipt.output,
    event: receipt.event,
  };
  const hash = receipt.hash || (await hashActReceipt(unsigned));
  const statement = anchorStatement({
    handle: identity.handle,
    public_key: identity.public_key,
    seq,
    prev,
    receipt_hash: hash,
  });
  const sig = await (identity.sign ? identity.sign(statement) : (await import("./identity.js")).signObject(identity.privateKey, statement));
  return {
    spec: FED_RECEIPT_SPEC,
    hash,
    previous_hash: receipt.previous_hash,
    request: receipt.request,
    output: receipt.output,
    event: receipt.event,
    identity_anchor: { ...statement, sig },
  };
}

export async function mintIdentityReceipt({ identity, request, output, event, seq, prev, previous_hash }) {
  const four = {
    previous_hash: isHex64(previous_hash) ? previous_hash : ZERO_HASH,
    request: oneSentence(request),
    output: oneSentence(output),
    event: eventMetadata({
      surface: "fed-mesh",
      path: "/v1/mesh/relay",
      method: "POST",
      status: 200,
      tool: "relay",
      spec: "ACT-RECEIPT-1.0",
      runtime_version: RUNTIME_VERSION,
      ...(event || {}),
    }),
  };
  four.hash = await hashActReceipt(four);
  return attachIdentityAnchor(four, identity, { seq, prev });
}

export async function verifyIdentityReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Receipt must be an object." };
  }
  if (!receipt.identity_anchor) {
    const unsigned = {
      previous_hash: receipt.previous_hash,
      request: receipt.request,
      output: receipt.output,
      event: receipt.event,
    };
    const hash = await hashActReceipt(unsigned);
    if (hash !== receipt.hash) {
      return { ok: false, code: "FED-MESH-TAMPER", message: "ACT-RECEIPT-1.0 hash does not match." };
    }
    return { ok: true, spec: "ACT-RECEIPT-1.0", identity: false, hash };
  }
  const anchor = receipt.identity_anchor;
  const unsigned = {
    previous_hash: receipt.previous_hash,
    request: receipt.request,
    output: receipt.output,
    event: receipt.event,
  };
  const hash = await hashActReceipt(unsigned);
  if (hash !== receipt.hash || hash !== anchor.receipt_hash) {
    return { ok: false, code: "FED-MESH-TAMPER", message: "Receipt hash does not match the identity anchor." };
  }
  const handleOk = await publicKeyMatchesHandle(anchor.public_key, anchor.handle);
  if (!handleOk) {
    return { ok: false, code: "FED-MESH-HANDLE-MISMATCH", message: "Handle does not match the signing key." };
  }
  const statement = anchorStatement(anchor);
  const sigOk = await verifyObject(anchor.public_key, statement, anchor.sig);
  if (!sigOk) {
    return { ok: false, code: "FED-MESH-BAD-SIG", message: "Identity anchor signature did not verify." };
  }
  if (!Number.isInteger(anchor.seq) || anchor.seq < 1) {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Sequence must be an integer starting at 1." };
  }
  if (!isHex64(anchor.prev)) {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "prev must be 64 lowercase hex characters." };
  }
  return {
    ok: true,
    spec: FED_RECEIPT_SPEC,
    identity: true,
    hash,
    handle: anchor.handle,
    seq: anchor.seq,
    prev: anchor.prev,
    statement_hash: await hashStatement(statement),
  };
}

/**
 * Per-handle chain. Catches replay, fork, gap, wrong key, and a mutated receipt.
 * 1.0 receipts without an anchor are skipped (they stay valid and are not a handle chain).
 */
export async function verifyIdentityChain(receipts) {
  const rows = Array.isArray(receipts) ? receipts : [];
  const byHandle = new Map();
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const checked = await verifyIdentityReceipt(rows[i]);
    if (!checked.ok) {
      errors.push({ index: i, ...checked });
      continue;
    }
    if (!checked.identity) continue;
    const list = byHandle.get(checked.handle) || [];
    list.push({ index: i, ...checked, anchor: rows[i].identity_anchor });
    byHandle.set(checked.handle, list);
  }
  for (const [handle, list] of byHandle) {
    const seenSeq = new Set();
    const prevClaim = new Map();
    let expectSeq = 1;
    let expectPrev = ZERO_HASH;
    const ordered = list.slice().sort((a, b) => a.seq - b.seq);
    for (const row of ordered) {
      if (seenSeq.has(row.seq)) {
        errors.push({ index: row.index, code: "FED-MESH-REPLAY", message: `Duplicate sequence ${row.seq} for ${handle}.`, handle });
        continue;
      }
      seenSeq.add(row.seq);
      const prior = prevClaim.get(row.prev);
      if (prior && prior !== row.statement_hash) {
        errors.push({ index: row.index, code: "FED-MESH-FORK", message: `Two receipts claim prev ${row.prev} for ${handle}.`, handle });
      }
      prevClaim.set(row.prev, row.statement_hash);
      if (row.seq !== expectSeq) {
        errors.push({ index: row.index, code: "FED-MESH-GAP", message: `Sequence ${row.seq} for ${handle} does not follow ${expectSeq - 1}.`, handle });
      } else if (row.prev !== expectPrev) {
        errors.push({ index: row.index, code: "FED-MESH-FORK", message: `prev does not match the tip for ${handle}.`, handle });
      }
      expectSeq = row.seq + 1;
      expectPrev = row.statement_hash;
    }
  }
  return { ok: errors.length === 0, errors, handles: [...byHandle.keys()] };
}
