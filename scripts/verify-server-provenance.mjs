/**
 * RIB-039 / AZRT-SERVER-PROVENANCE-1.0: call receipts record server_path + server_hash, and
 * verify reports SERVER-DRIFT per tool name (fail closed on missing after present).
 */
import assert from "node:assert/strict";
import { checkServerDrift, serverProvenance, setLocalServerIdentity } from "../src/server-provenance.js";
import { appendLedger, currentLedger, resetLedger, verifyLedger } from "../src/fraggate/ledger.js";
import { appendReceipt, newSessionId, openSession, verifyChainStrict } from "../src/session-core.js";
await import("../src/index.js");
const { runChainlockOp } = await import("../src/chainlock.js");

let n = 0;
const HEX = /^[0-9a-f]{64}$/;
const ENV_A = { CF_VERSION_METADATA: { id: "ver-a" }, GIT_SHA: "9a51b7e2" };
const ENV_B = { CF_VERSION_METADATA: { id: "ver-b" }, GIT_SHA: "9a51b7e2" };
const ED = "e".repeat(64);

// Hosted Worker values: deterministic, from deploy identity + tool digest.
const a1 = await serverProvenance({ env: ENV_A, tool: "TimeLock", slug: "timelock", engine_digest: ED });
const a2 = await serverProvenance({ env: ENV_A, tool: "TimeLock", slug: "timelock", engine_digest: ED });
assert.equal(a1.server_path, "worker://aziel-runtime/fraggate/timelock");
assert.match(a1.server_hash, HEX); assert.equal(a1.server_hash, a2.server_hash); assert.equal(a1.server_reason, null); n++;
// Unresolvable: null with a reason, never a guess (no deploy identity; baked build-meta is not used).
const none = await serverProvenance({ env: {}, tool: "TimeLock", slug: "timelock", engine_digest: ED });
assert.equal(none.server_hash, null); assert.match(none.server_reason, /no deployed code identity/); n++;
const nodig = await serverProvenance({ env: ENV_A, tool: "X", slug: "x" });
assert.equal(nodig.server_hash, null); assert.match(nodig.server_reason, /no engine_digest or registry_digest/); n++;
const proxy = await serverProvenance({ env: ENV_A, tool: "X", slug: "x", upstream: "https://up.example/v1/x" });
assert.equal(proxy.server_path, "https://up.example/v1/x"); assert.equal(proxy.server_hash, null); assert.match(proxy.server_reason, /proxy_fallback/); n++;
// Local stdio: hash of the resolved module file.
setLocalServerIdentity({ path: "/opt/aziel/cli/mcp-stdio.mjs", sha256: "a".repeat(64) });
const loc = await serverProvenance({ env: {}, tool: "TimeLock", slug: "timelock", engine_digest: ED });
assert.equal(loc.server_path, "stdio:///opt/aziel/cli/mcp-stdio.mjs#timelock"); assert.match(loc.server_hash, HEX); assert.equal(loc.server_basis.module_sha256, "a".repeat(64));
setLocalServerIdentity({ path: null, sha256: null, reason: "ENOENT" });
const locBad = await serverProvenance({ env: {}, tool: "TimeLock", slug: "timelock", engine_digest: ED });
assert.equal(locBad.server_hash, null); assert.equal(locBad.server_path, null); assert.match(locBad.server_reason, /ENOENT/);
setLocalServerIdentity(null); n++;

const row = (seq, tool, s) => ({ seq, name: tool, asked: true, refused: false, ...s });
const b1 = await serverProvenance({ env: ENV_B, tool: "TimeLock", slug: "timelock", engine_digest: ED });
const swapped = { ...a1, server_hash: "f".repeat(64) };

// 1. Same hash passes.
assert.equal(checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", a2)]).ok, true); n++;
// 2. Swapped hash under the same tool name -> SERVER-DRIFT.
{
  const r = checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", swapped)]);
  assert.equal(r.ok, false); assert.equal(r.drifts[0].code, "SERVER-DRIFT"); assert.equal(r.drifts[0].tool, "TimeLock");
  assert.equal(r.drifts[0].changed[0].field, "server_hash"); n++;
  // A redeploy also changes the hash (expected, visible via server_basis.version_id).
  assert.equal(checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", b1)]).drifts[0].code, "SERVER-DRIFT"); n++;
}
// 3. Path change -> SERVER-DRIFT.
{
  const r = checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", { ...a1, server_path: "stdio:///tmp/evil.mjs#timelock" })]);
  assert.equal(r.ok, false); assert.equal(r.drifts[0].changed[0].field, "server_path"); n++;
}
// 4. Null after a previous value fails closed (both an explicit null and a missing field).
{
  const r = checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", none)]);
  assert.equal(r.ok, false); assert.equal(r.drifts[0].code, "SERVER-PROVENANCE-MISSING"); assert.deepEqual(r.drifts[0].missing, ["server_hash"]);
  const r2 = checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", {})]);
  assert.equal(r2.ok, false); assert.deepEqual(r2.drifts[0].missing, ["server_path", "server_hash"]); n++;
  // ...and stays closed: a later good row after the gap is compared to the last good value.
  const r3 = checkServerDrift([row(1, "TimeLock", a1), row(2, "TimeLock", none), row(3, "TimeLock", a2)]);
  assert.equal(r3.drifts.length, 1); n++;
}
// Different tool names never compare with each other; refusals carry no server fields.
assert.equal(checkServerDrift([row(1, "TimeLock", a1), row(2, "Other", swapped), { seq: 3, name: "TimeLock", asked: true, refused: true }]).ok, true); n++;

// 5. Old receipts (no server_* fields) still verify.
{
  resetLedger();
  for (let i = 0; i < 3; i++) await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "TimeLock", op: "now" });
  const v = await verifyLedger(currentLedger());
  assert.equal(v.ok, true); assert.equal(v.server_drift.checked, 0); n++;
  // Then stamped rows append on top, still verify, and a swap is caught by verifyLedger.
  await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "TimeLock", op: "now", ...a1 });
  await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "TimeLock", op: "now", ...a2 });
  const v2 = await verifyLedger(currentLedger());
  assert.equal(v2.ok, true, JSON.stringify(v2)); assert.equal(currentLedger().entries.at(-1).server_hash, a1.server_hash); n++;
  // chainlock_verify reports the same drift over the FragGate call ledger.
  const cv1 = await runChainlockOp("chainlock_verify", {}, {});
  assert.equal(cv1.server_drift.ok, true);
  await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "TimeLock", op: "now", ...swapped });
  const v3 = await verifyLedger(currentLedger());
  assert.equal(v3.ok, false); assert.equal(v3.breaks.length, 0); assert.equal(v3.server_drift.drifts[0].code, "SERVER-DRIFT");
  const cv2 = await runChainlockOp("chainlock_verify", {}, {});
  assert.equal(cv2.ok, false); assert.equal(cv2.server_drift.drifts[0].code, "SERVER-DRIFT"); n++;
  resetLedger();
}
// Session receipts (runtime_session_receipt uses verifyChainStrict).
{
  const now = new Date().toISOString();
  const mk = () => openSession({ id: newSessionId(), now, version: "test", source: "test" });
  const exec = (slug, s) => ({ intent: { slug, op: "now" }, result: { status: 200 } });
  // old receipts: no server fields -> still verify
  const old = mk();
  await appendReceipt(old, "exec", exec("timelock"), now);
  await appendReceipt(old, "exec", exec("timelock"), now);
  let v = await verifyChainStrict(old.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.server_drift.checked, 0); n++;
  // same hash passes; swap fails with SERVER-DRIFT; null after fails closed
  for (const [label, second, ok, code] of [["same", a2, true, null], ["swap", swapped, false, "SERVER-DRIFT"], ["path", { ...a1, server_path: "x" }, false, "SERVER-DRIFT"], ["null", none, false, "SERVER-PROVENANCE-MISSING"]]) {
    const s = mk();
    await appendReceipt(s, "exec", exec("timelock"), now, { ...a1, server_basis: { ...a1.server_basis, tool: "timelock.now" } });
    await appendReceipt(s, "exec", exec("timelock"), now, { ...second, server_basis: { ...(second.server_basis || {}), tool: "timelock.now" } });
    v = await verifyChainStrict(s.receipts);
    assert.equal(v.ok, ok, label + " " + JSON.stringify(v.errors));
    if (code) assert.equal(v.errors.find((e) => e.error === code).tool, "timelock.now", label);
    n++;
  }
}
// End to end: a real FragGate call through the hosted Worker stamps its ledger row.
{
  resetLedger();
  const worker = (await import("../src/index.js")).default;
  const call = (env) => worker.fetch(new Request("https://x.example/v1/fraggate/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "decisiongate", op: "check", payload: { claim: "x" } }) }), env, { waitUntil() {} });
  const res = await call({ ...ENV_A });
  assert.equal(res.status, 200);
  const rows = currentLedger().entries.filter((r) => r.refused === false);
  assert.ok(rows.length >= 1, "a call row");
  const last = rows.at(-1);
  assert.match(last.server_path, /^worker:\/\/aziel-runtime\/fraggate\//); assert.match(last.server_hash, HEX); assert.equal(last.server_basis.version_id, "ver-a");
  // Same deploy again: no drift. A different deploy: drift, shown with both version_ids.
  await call({ ...ENV_A });
  assert.equal((await verifyLedger(currentLedger())).server_drift.ok, true);
  await call({ ...ENV_B });
  const vd = await verifyLedger(currentLedger());
  assert.equal(vd.server_drift.ok, false); assert.equal(vd.server_drift.drifts[0].code, "SERVER-DRIFT"); n++;
  resetLedger();
}
// Receipts are hash-linked and sealed, not signed: nothing here claims signing.
assert.doesNotMatch(JSON.stringify(checkServerDrift([]).rule), /signed|signature/i); n++;
console.log(`ok server provenance (RIB-039): ${n} checks`);
