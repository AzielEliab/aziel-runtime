/**
 * RIB-015 / AZRT-ISSUER-APPEND-1.0 (idea from @DTXNaidu, reinforced 2026-10-08: "stamp #1, expiry,
 * revocation, all one issuer-owned log the deploy path can only read").
 *
 * - Genesis (session open receipt, stamp #1) records the issuer: `issuer { spec, kind, key_hash }`.
 *   The Worker mints a random issuer key at open, returns it ONCE to the opener, and seals only its
 *   sha256 (domain-separated). The key itself is never stored or sealed.
 * - Only the holder of that key may append the spec-control stamps: `stale` (RIB-014) and `revoke`.
 *   Anyone else gets 403 CL-NOT-ISSUER and the chain is unchanged. Sessions sealed without an issuer
 *   (legacy) have no writer for these stamps at all (fail closed).
 * - The run path (exec) only READS spec state: it refuses SPEC-REVOKED / SPEC-STALE before anything
 *   runs, and has no write path to stale or revoke.
 * - Verify fails closed on a stale/revoke stamp whose written_by does not name the genesis issuer
 *   (CL-NOT-ISSUER), and on any exec or verdict sealed after a revoke or stale stamp.
 * Honest limits: verify proves each control stamp names the genesis issuer and the hash links hold;
 * proof that the writer HELD the key is the write gate, not a signature. Receipts are hash-linked and
 * sealed, not signed. ChainLock chains are not covered here (session chains only).
 * Author: Aziel Eliab.
 */
import { sha256Hex } from "./session-core.js";

export const ISSUER_SPEC = "AZRT-ISSUER-APPEND-1.0";
export const ISSUER_HEADER = "x-azrt-issuer-key";
const HEX64 = /^[a-f0-9]{64}$/;

export async function issuerKeyHash(key) {
  return sha256Hex(`azrt-issuer-key:${String(key)}`);
}

export async function newIssuerKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const key = "isk_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { key, key_hash: await issuerKeyHash(key) };
}

/** Genesis issuer field from a key hash (null when absent or malformed: no issuer, fail closed). */
export function issuerField(keyHash) {
  const h = typeof keyHash === "string" ? keyHash.toLowerCase() : "";
  return HEX64.test(h) ? { spec: ISSUER_SPEC, kind: "session-issuer-key", key_hash: h } : null;
}

export function issuerOf(receipts) {
  const first = (receipts || [])[0];
  return first && first.issuer && HEX64.test(String(first.issuer.key_hash || "")) ? first.issuer : null;
}

function notIssuer(message, extra = {}) {
  const err = new Error(message);
  err.status = 403;
  err.code = "CL-NOT-ISSUER";
  err.extra = { ok: false, spec: ISSUER_SPEC, written: false, ...extra };
  return err;
}

/** Write gate for spec-control stamps. Returns the written_by field to seal. */
export async function assertIssuer(session, key) {
  const issuer = issuerOf(session && session.receipts);
  if (!issuer) throw notIssuer("This chain recorded no issuer at genesis; no one may append stale, revoke, pause or resume stamps.", { reason: "no_issuer" });
  if (!key || typeof key !== "string") throw notIssuer("Only the issuer recorded at genesis may append this stamp. Send the issuer key in X-Azrt-Issuer-Key.", { reason: "missing_key" });
  const h = await issuerKeyHash(key);
  if (h !== issuer.key_hash) throw notIssuer("Only the issuer recorded at genesis may append this stamp.", { reason: "wrong_key" });
  return { spec: ISSUER_SPEC, issuer_key_hash: h };
}

/** Read-only spec state for the run path. Never writes; never consults a clock. */
export function specState(receipts) {
  const list = (receipts || []).filter(Boolean);
  let revokedAt = null;
  let staleAt = null;
  let revokeReason = null;
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    if (r.revoke && revokedAt == null) { revokedAt = seq; revokeReason = r.revoke.reason || null; }
    if (r.stale && staleAt == null) staleAt = seq;
  }
  return {
    spec: ISSUER_SPEC,
    has_spec: Boolean(list[0] && list[0].expect_hash),
    issuer_recorded: Boolean(issuerOf(list)),
    revoked: revokedAt != null,
    revoked_at_seq: revokedAt,
    revoke_reason: revokeReason,
    stale: staleAt != null,
    stale_at_seq: staleAt,
    exec_allowed: revokedAt == null && staleAt == null,
    writable_by: "issuer only (CL-NOT-ISSUER otherwise); the run path can only read this",
  };
}

/** Verify: control stamps name the genesis issuer; nothing runs or grades after revoke/stale. */
export function verifyIssuerAppend(receipts) {
  const list = (receipts || []).filter(Boolean);
  const issuer = issuerOf(list);
  const errors = [];
  let revokedAt = null;
  let staleAt = null;
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    const control = r.revoke ? "revoke" : r.stale ? "stale" : null;
    if (control) {
      const by = r.written_by && r.written_by.issuer_key_hash;
      if (!issuer || by !== issuer.key_hash) errors.push({ seq, code: "CL-NOT-ISSUER", stamp: control });
    }
    if (r.revoke) {
      if (revokedAt != null) errors.push({ seq, code: "REVOKE-DUPLICATE", revoked_at_seq: revokedAt });
      else revokedAt = seq;
    }
    if (r.stale && staleAt == null) staleAt = seq;
    if (r.event === "exec") {
      if (revokedAt != null) errors.push({ seq, code: "EXEC-AFTER-REVOKE", revoked_at_seq: revokedAt });
      else if (staleAt != null) errors.push({ seq, code: "EXEC-AFTER-STALE", stale_at_seq: staleAt });
    }
    if (r.verdict != null && revokedAt != null) errors.push({ seq, code: "EXPECT-VERDICT-REVOKED", revoked_at_seq: revokedAt });
  }
  return {
    spec: ISSUER_SPEC,
    ok: errors.length === 0,
    issuer: issuer ? { kind: issuer.kind, key_hash: issuer.key_hash } : null,
    revoked_at_seq: revokedAt,
    note: "Control stamps are checked against the genesis issuer hash; key possession is enforced at write. Hash-linked and sealed, not signed.",
    errors,
  };
}
