/**
 * RIB-049 / AZRT-SECOND-MINT-1.0 (idea from @DTXNaidu).
 *
 * Loading a receipt-signing key whose id differs from the witnessed key is a second mint.
 * Signing is refused with KEY-SECOND-MINT. The refusal is a sealed hash-linked receipt
 * (path, attempt, deny reason, tip). Verify recomputes that row against its tip and fails
 * closed if the deny was forged. This module does not generate, export, or rotate a key.
 * The witnessed id is taken from a verified witness statement, not from a deploy var.
 * Not live until a witness records the key and a deploy is cleared. No key was minted here.
 * Receipts are hash-linked and sealed, not signed.
 * Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex, ZERO_HASH } from "./session-core.js";

export const SECOND_MINT_SPEC = "AZRT-SECOND-MINT-1.0";
const KEY_ID = /^ed25519:[a-f0-9]{64}$/;

let witnessedKeyId = null;
let rows = [];
let attempt = 0;
const seen = new Map();

export function resetSecondMintState() {
  witnessedKeyId = null;
  rows = [];
  attempt = 0;
  seen.clear();
}

export function setWitnessedReceiptKeyId(id) {
  witnessedKeyId = typeof id === "string" && KEY_ID.test(id) ? id : null;
  return witnessedKeyId;
}

export function witnessedReceiptKeyId() {
  return witnessedKeyId;
}

export function witnessedKeyIdFromStatement(statement) {
  const rk = statement && (statement.receipt_key || (statement.heads && statement.heads.receipt_key));
  if (!rk || typeof rk !== "object") return null;
  return typeof rk.key_id === "string" && KEY_ID.test(rk.key_id) ? rk.key_id : null;
}

export async function sealSecondMintRefusal({ path, deny_reason, tip, attempted_key_id, witnessed_key_id, attempt_n, prev_hash }) {
  const body = {
    spec: SECOND_MINT_SPEC,
    code: "KEY-SECOND-MINT",
    path: path || "deploy-held-key",
    attempt: attempt_n,
    deny_reason,
    tip: tip || ZERO_HASH,
    prev_hash: prev_hash || ZERO_HASH,
    attempted_key_id,
    witnessed_key_id,
    signed: false,
    note: "Hash-linked and sealed, not signed. The runtime did not mint a key.",
  };
  const hash = await sha256Hex(canonicalize(body));
  return { ...body, hash };
}

export function secondMintRefusals() {
  return rows.slice();
}

export async function verifySecondMintRefusal(row, { tip = null } = {}) {
  if (!row || typeof row !== "object") return { ok: false, spec: SECOND_MINT_SPEC, code: "KEY-SECOND-MINT-MISSING" };
  const { hash, ...body } = row;
  const expected = await sha256Hex(canonicalize(body));
  if (expected !== hash) return { ok: false, spec: SECOND_MINT_SPEC, code: "KEY-SECOND-MINT-FORGED", expected, got: hash || null };
  if (tip != null && row.tip !== tip) return { ok: false, spec: SECOND_MINT_SPEC, code: "KEY-SECOND-MINT-TIP", expected: tip, got: row.tip };
  if (row.prev_hash && rows.length) {
    const prior = rows.find((r) => r.hash === row.prev_hash);
    if (row.prev_hash !== ZERO_HASH && prior && prior.hash !== row.prev_hash) {
      return { ok: false, spec: SECOND_MINT_SPEC, code: "KEY-SECOND-MINT-TIP" };
    }
  }
  return { ok: true, spec: SECOND_MINT_SPEC, code: "KEY-SECOND-MINT", hash };
}

export async function verifySecondMintChain(list = rows) {
  const errors = [];
  let prev = ZERO_HASH;
  for (const row of list || []) {
    const check = await verifySecondMintRefusal(row, { tip: row.tip });
    if (!check.ok) errors.push({ code: check.code, attempt: row && row.attempt });
    if (!row || row.prev_hash !== prev) errors.push({ code: "KEY-SECOND-MINT-TIP", attempt: row && row.attempt });
    prev = row && row.hash;
  }
  return { ok: errors.length === 0, spec: SECOND_MINT_SPEC, errors, count: (list || []).length };
}

/**
 * Refuse signing when the loaded key id is not the witnessed id.
 * No witnessed id yet: not a second mint (first hold). Never a pass that the key was witnessed.
 */
export async function gateSecondMint(signer, { tip = null } = {}) {
  if (!signer || !signer.ok) return signer;
  const witnessed = witnessedKeyId;
  if (!witnessed) return signer;
  const attempted = signer.provenance && signer.provenance.key_id;
  if (attempted === witnessed) return signer;
  const id = witnessed + "|" + attempted;
  if (seen.has(id)) return seen.get(id);
  attempt += 1;
  const prev = rows.length ? rows[rows.length - 1].hash : ZERO_HASH;
  const refusal = await sealSecondMintRefusal({
    path: "deploy-held-key",
    deny_reason: "loaded key id differs from the witnessed key",
    tip: tip || prev,
    attempted_key_id: attempted,
    witnessed_key_id: witnessed,
    attempt_n: attempt,
    prev_hash: prev,
  });
  rows.push(refusal);
  const out = {
    ok: false,
    code: "KEY-SECOND-MINT",
    key_id: attempted,
    witnessed_key_id: witnessed,
    reason: "loaded key differs from the witnessed receipt key; second mint refused. No key was minted. Receipts stay hash-linked and sealed, not signed.",
    refusal,
  };
  seen.set(id, out);
  return out;
}

export function secondMintWitnessFragment() {
  const row = rows.length ? rows[rows.length - 1] : null;
  if (!row) {
    return { spec: SECOND_MINT_SPEC, status: witnessedKeyId ? "none" : "not_checked", live: false, signed: false, refused_key_id: null, refusal_receipt_hash: null };
  }
  return {
    spec: SECOND_MINT_SPEC,
    status: "refused",
    live: false,
    signed: false,
    refused_key_id: row.attempted_key_id,
    refusal_receipt_hash: row.hash,
    tip: row.tip,
    attempt: row.attempt,
  };
}
