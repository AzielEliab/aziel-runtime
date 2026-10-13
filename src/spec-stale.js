/**
 * RIB-014 / AZRT-SPEC-STALE-1.0 (idea from @DTXNaidu).
 *
 * The sealed expected-state spec (stamp #1, AZRT-EXPECT-SPEC-1.0) may carry `world_version`, an
 * opaque string the issuer supplies. If that world moves before the run closes, a `stale` stamp is
 * APPENDED (spec_ref, spec_world_version, new_world_version, reason). It never edits the spec stamp.
 * Expiry is a sealed event, not a schedule: no timer, clock or TTL here decides staleness.
 * Once a stale stamp is sealed, no verdict can be graded against that spec: close refuses a verdict
 * (EXPECT-SPEC-STALE), and verify fails closed on any verdict sealed after a stale stamp.
 * Who may write the stale stamp is RIB-015 (issuer-owned append); this PR only defines the stamp.
 * Receipts are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
export const SPEC_STALE = "AZRT-SPEC-STALE-1.0";
export const WORLD_VERSION_MAX = 256;
export const STALE_REASON_MAX = 512;

function cleanVersion(v) {
  if (v == null) return null;
  if (typeof v !== "string" && typeof v !== "number") return undefined;
  const s = String(v).trim();
  if (!s || s.length > WORLD_VERSION_MAX) return undefined;
  return s;
}

/** Validate a stale request body. Returns { ok:true, new_world_version, reason } or a refusal. */
export function staleRequestOf(raw) {
  const bad = (message) => ({ ok: false, code: "SPEC-STALE-INVALID", spec: SPEC_STALE, message });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("stale needs { new_world_version, reason }.");
  const nv = cleanVersion(raw.new_world_version);
  if (!nv) return bad(`new_world_version must be a non-empty string up to ${WORLD_VERSION_MAX} chars.`);
  const reason = raw.reason == null ? "" : String(raw.reason).trim();
  if (!reason || reason.length > STALE_REASON_MAX) return bad(`reason must be a non-empty string up to ${STALE_REASON_MAX} chars.`);
  return { ok: true, new_world_version: nv, reason };
}

/** World version sealed in the spec stamp (null when the spec named none). */
export function specWorldVersion(receipts) {
  const first = (receipts || [])[0];
  if (!first || !first.expect_hash || !first.expect || typeof first.expect !== "object") return null;
  return first.expect.world_version == null ? null : String(first.expect.world_version);
}

/** Read-only staleness view of a chain. Pure; never consults a clock. */
export function specStaleness(receipts) {
  const list = (receipts || []).filter(Boolean);
  const first = list[0];
  const hasSpec = Boolean(first && first.expect_hash);
  const errors = [];
  let staleAt = null;
  let current = hasSpec ? specWorldVersion(list) : null;
  let verdict = null;
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    if (r.stale) {
      if (!hasSpec) errors.push({ seq, code: "SPEC-STALE-NO-SPEC" });
      else {
        const s = r.stale;
        if (!s.spec_ref || s.spec_ref.expect_hash !== first.expect_hash || s.spec_ref.receipt_hash !== first.hash) errors.push({ seq, code: "SPEC-STALE-REF-MISMATCH" });
        if (s.spec_world_version !== current) errors.push({ seq, code: "SPEC-STALE-VERSION-MISMATCH", expected: current, got: s.spec_world_version ?? null });
        current = s.new_world_version ?? current;
      }
      if (staleAt == null) staleAt = seq;
    }
    if (r.verdict != null) {
      verdict = { seq, pass: r.verdict.pass === true };
      if (staleAt != null && staleAt < seq) errors.push({ seq, code: "EXPECT-VERDICT-STALE-SPEC", stale_at_seq: staleAt });
    }
  }
  return {
    spec: SPEC_STALE,
    ok: errors.length === 0,
    status: !hasSpec ? "no_spec" : staleAt != null ? "stale" : "fresh",
    spec_world_version: hasSpec ? specWorldVersion(list) : null,
    current_world_version: current,
    stale_at_seq: staleAt,
    // null = no verdict sealed; false = a verdict exists but cannot be reported valid (spec stale first).
    verdict_valid: verdict == null ? null : staleAt == null || staleAt > verdict.seq,
    decided_by: "sealed stale stamps only (no timer, no schedule)",
    errors,
  };
}
