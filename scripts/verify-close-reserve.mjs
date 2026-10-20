/** R4: applyClose always fits: the last CLOSE_RESERVE (2) receipt slots are reserved for delivery_check + close. */
import assert from "node:assert/strict";
const { RECEIPT_CAP } = await import("../src/production.js");
const core = await import("../src/session-core.js");
const { CLOSE_RESERVE, applyOpen, applyPolicy, applyClose, applyArtifactChange, applyStale, openSession, newSessionId, verifyChainStrict } = core;
const { createHash } = await import("node:crypto");
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
ok(CLOSE_RESERVE === 2, "reserve is 2");
const now = () => new Date().toISOString();
const sha = (t) => createHash("sha256").update(t).digest("hex");

async function fill(session) {
  let err = null;
  for (let i = 0; i < RECEIPT_CAP + 5 && !err; i++) {
    try { await applyPolicy(session, { max_ops: 10 + (i % 3) }, now()); } catch (e) { err = e; }
  }
  return err;
}

// Frozen session (close needs delivery_check + close = 2 rows).
{
  const s = openSession({ id: newSessionId(), now: now(), version: "2.0.0-rc1" });
  await applyOpen(s, now(), { frozen_artifacts: [{ id: "a", sha256: sha("A") }] });
  const err = await fill(s);
  ok(err && err.code === "receipt_cap" && err.extra.close_reserve === 2, "fill stops with receipt_cap + close_reserve");
  ok(s.receipts.length === RECEIPT_CAP - CLOSE_RESERVE, "stops at cap - 2");
  let e2 = null;
  try { await applyArtifactChange(s, now(), { artifact: "a", new_sha256: sha("B"), reason: "r" }); } catch (e) { e2 = e; }
  ok(e2 && e2.code === "receipt_cap" && s.receipts.length === RECEIPT_CAP - 2, "change cannot eat the reserve");
  const out = await applyClose(s, now(), { delivered: [{ id: "a", content: "A" }] });
  ok(out.receipt.event === "close" && out.delivery_check && s.receipts.length === RECEIPT_CAP, "delivery_check + close fit exactly at cap");
  const v = await verifyChainStrict(s.receipts);
  ok(v.ok && v.frozen_artifacts.status === "delivered", "chain verifies");
}
// Plain session: close fits; stale (issuer stamp path) cannot eat the reserve either (appendReceipt backstop).
{
  const s = openSession({ id: newSessionId(), now: now(), version: "2.0.0-rc1" });
  await applyOpen(s, now(), { expect: { spec: "s", verdict_criteria: "c" } });
  await fill(s);
  ok(s.receipts.length === RECEIPT_CAP - 2, "plain fill stops at cap - 2");
  let e3 = null;
  try { await core.appendReceipt(s, "stale", {}, now(), {}); } catch (e) { e3 = e; }
  ok(e3 && e3.code === "receipt_cap" && e3.extra.written === false, "backstop refuses non-close rows");
  const out = await applyClose(s, now(), {});
  ok(out.receipt.event === "close" && s.receipts.length === RECEIPT_CAP - 1, "close succeeds");
  ok((await verifyChainStrict(s.receipts)).ok, "plain chain verifies");
}
// Small sessions unchanged.
{
  const s = openSession({ id: newSessionId(), now: now(), version: "2.0.0-rc1" });
  await applyOpen(s, now(), {});
  await applyPolicy(s, { max_ops: 5 }, now());
  const out = await applyClose(s, now(), {});
  ok(s.receipts.length === 3 && out.receipt.seq === 3, "small session as before");
}
console.log(`verify-close-reserve: ${n} checks ok (R4; close reserve ${CLOSE_RESERVE} of cap ${RECEIPT_CAP})`);
