/**
 * RIB-013 / AZRT-EXPECT-SPEC-1.0 verify (fail closed).
 *
 * The expected-state spec (spec + verdict_criteria) is sealed as stamp #1 BEFORE anything runs.
 * This walker proves it from the chain alone:
 *   EXPECT-SPEC-LATE          an expect_hash appears on any stamp other than #1
 *   EXPECT-SPEC-TAMPERED      stamp #1 carries `expect` whose canonical hash != expect_hash
 *   EXPECT-SPEC-REF-UNSEALED  a stamp carries spec_ref but no spec was sealed earlier (outcome before spec)
 *   EXPECT-SPEC-REF-MISMATCH  spec_ref names a different stamp or a different expect_hash
 *   EXPECT-SPEC-REF-MISSING   a later stamp omits spec_ref (only where every later stamp must carry it)
 *   EXPECT-VERDICT-NO-SPEC    a verdict is sealed on a chain that never sealed a spec
 * Chains with no spec and no spec_ref are untouched (status "no_spec"), so old chains verify as before.
 * Receipts are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const EXPECT_SPEC = "AZRT-EXPECT-SPEC-1.0";

/**
 * @param {object[]} rows oldest first
 * @param {object} o
 * @param {(r:object)=>string} o.hashOf  the row's own chain hash (session: r.hash; chainlock: r.stamp_sha256)
 * @param {boolean} o.requireRef         every row after the spec must carry spec_ref (session receipts)
 */
export async function verifyExpectSpec(rows, { hashOf = (r) => r && (r.hash || r.stamp_sha256), idOf = (r) => r && r.id, requireRef = false } = {}) {
  const list = (rows || []).filter(Boolean);
  const errors = [];
  const first = list[0] || null;
  const spec = first && first.expect_hash ? { hash: hashOf(first), id: idOf(first), expect_hash: first.expect_hash } : null;
  if (spec && first.expect != null) {
    const want = await sha256Hex(canonicalize({ spec: EXPECT_SPEC, expect: first.expect }));
    if (want !== first.expect_hash) errors.push({ seq: first.seq ?? 1, code: "EXPECT-SPEC-TAMPERED", expected: want, got: first.expect_hash });
  }
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    if (r.expect_hash) errors.push({ seq, code: "EXPECT-SPEC-LATE" });
    const ref = r.spec_ref;
    if (ref && typeof ref === "object") {
      if (!spec) errors.push({ seq, code: "EXPECT-SPEC-REF-UNSEALED" });
      else {
        const target = ref.receipt_hash ?? ref.stamp_sha256 ?? null;
        const byHash = target != null && target === spec.hash;
        const byId = ref.id != null && spec.id != null && ref.id === spec.id;
        if ((!byHash && !byId) || ref.expect_hash !== spec.expect_hash) errors.push({ seq, code: "EXPECT-SPEC-REF-MISMATCH" });
      }
    } else if (ref != null) {
      errors.push({ seq, code: "EXPECT-SPEC-REF-MISMATCH" });
    } else if (spec && requireRef) {
      errors.push({ seq, code: "EXPECT-SPEC-REF-MISSING" });
    }
    if (r.verdict != null && !spec) errors.push({ seq, code: "EXPECT-VERDICT-NO-SPEC" });
  }
  const touched = Boolean(spec) || errors.length > 0;
  return {
    spec: EXPECT_SPEC,
    ok: errors.length === 0,
    status: errors.length ? "failed" : spec ? "verified" : "no_spec",
    spec_hash: spec ? spec.expect_hash : null,
    spec_stamp: spec ? spec.hash : null,
    checked: touched ? list.length : 0,
    errors,
  };
}
