/**
 * RIB-041 / AZRT-BUILD-WITNESS-1.0: newest witnessed build vs live build. Mismatch (incl. unknown live)
 * fails closed (409); a strict pending window gives ok:null/503, never 200; no witness -> not_checked.
 */
import assert from "node:assert/strict";
import * as A from "../src/anchor.js";
import { FUTURE_SKEW_MS, PENDING_MAX_MS, checkBuildWitness, liveBuildOf, pendingWindow, witnessedBuildOf } from "../src/build-witness.js";
import { softwareMeta } from "../src/software-catalog.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { append } from "../src/chainlock/ops.js";
import { storeFor } from "../src/chainlock/store.js";

let n = 0;
const SHA = "3221bbe47c04873575957d4f6220133e65039111";
const SHA2 = "fe340841daabb2e65368622e1667c56bee8b51c1";
const VID = "38a05023-5835-4ce0-a203-a53fb11382e6";
const VID2 = "11111111-2222-4333-8444-555555555555";
const NOW = Date.parse("2026-10-13T16:00:00Z");
const OBS = "2026-10-13T15:50:00Z";
const row = (n, statement) => ({ statement: { n, observed_at: OBS, ...statement }, statement_hash: String(n).padStart(64, "0") });
const log = (...rows) => ({ ok: true, n: rows.length, latest: rows.at(-1), entries: rows });
const both = (sha = SHA, vid = VID) => ({ git_sha: sha, build: { git_sha: sha, version_id: vid } });
const cfLive = (sha, vid, ts) => liveBuildOf({ git_sha: sha, version_id: vid, version_id_source: "cf_version_metadata" }, { versionTimestamp: ts });
const chk = (anchors, live) => checkBuildWitness(anchors, live, { now: NOW });

// not_checked only when there is no verified log or no statement ever carried a build.
{
  for (const a of [null, { ok: false, code: "ANCHOR-UNREACHABLE" }, log(row(1, { heads: {} }))]) {
    const r = chk(a, liveBuildOf({ git_sha: SHA, version_id: VID }));
    assert.equal(r.status, "not_checked"); assert.equal(r.ok, null);
  }
  n++;
}
// (1) partial only when the WITNESS lacks a field; witness has it and live doesn't -> mismatch.
{
  const legacy = chk(log(row(1, { git_sha: SHA })), liveBuildOf({ git_sha: SHA, version_id: VID }));
  assert.equal(legacy.status, "partial"); assert.equal(legacy.ok, true); assert.deepEqual(legacy.not_compared, ["version_id"]);
  const liveLacks = chk(log(row(1, both())), liveBuildOf({ git_sha: SHA }));
  assert.equal(liveLacks.status, "failed"); assert.equal(liveLacks.code, "BUILD-WITNESS-MISMATCH");
  assert.deepEqual(liveLacks.diffs, [{ field: "version_id", witnessed: VID, live: null }]);
  const full = chk(log(row(1, both())), liveBuildOf({ git_sha: SHA.toUpperCase(), version_id: VID }));
  assert.equal(full.status, "verified"); assert.equal(full.ok, true); n++;
}
// (2) once a statement carries a build, an unknown live build is a mismatch, never 200.
{
  for (const live of [liveBuildOf({}), liveBuildOf({ git_sha: "junk" })]) {
    const r = chk(log(row(1, both())), live);
    assert.equal(r.ok, false); assert.equal(r.code, "BUILD-WITNESS-MISMATCH");
  }
  n++;
}
// (3) newest statement only: a build-less newest does not fall back to an older matching one.
{
  const r = chk(log(row(1, both()), row(2, { heads: {} })), liveBuildOf({ git_sha: SHA, version_id: VID }));
  assert.equal(r.ok, false); assert.equal(r.code, "BUILD-WITNESS-MISMATCH"); assert.match(r.reason, /newest/);
  const older = chk(log(row(1, both()), row(2, both(SHA2, VID2))), liveBuildOf({ git_sha: SHA, version_id: VID }));
  assert.equal(older.ok, false, "older matching statement never rescues the newest"); n++;
}
// (5) pending: all conditions hold -> pending, ok null.
{
  const fresh = new Date(NOW - 5 * 60_000).toISOString(); // after OBS, within window
  const r = chk(log(row(1, both())), cfLive(SHA2, VID2, fresh));
  assert.equal(r.status, "pending"); assert.equal(r.ok, null); assert.equal(r.code, "BUILD-WITNESS-PENDING");
  assert.equal(r.pending_since, fresh); assert.equal(r.last_witnessed.version_id, VID); n++;
  // Each failing condition is a hard mismatch.
  const cases = [
    ["var, not metadata", liveBuildOf({ git_sha: SHA2, version_id: VID2, version_id_source: "version_id_var" }, { versionTimestamp: fresh }), /cf_version_metadata/],
    ["rollback / old upload (older than observed_at)", cfLive(SHA2, VID2, "2026-10-13T15:00:00Z"), /rollback|old upload/],
    ["window expired", cfLive(SHA2, VID2, new Date(Date.parse(OBS) + 60_000).toISOString()), null],
    ["future timestamp", cfLive(SHA2, VID2, new Date(NOW + 10 * 60_000).toISOString()), /future/],
    ["no timestamp", cfLive(SHA2, VID2, null), /cf_version_metadata/],
  ];
  // window-expired needs now far past ts:
  for (const [why, live, re] of cases) {
    const now = why === "window expired" ? Date.parse(OBS) + 60_000 + PENDING_MAX_MS + 1 : NOW;
    const r2 = checkBuildWitness(log(row(1, both())), live, { now });
    assert.equal(r2.status, "failed", why); assert.equal(r2.ok, false, why);
    if (re) assert.match(r2.pending_rejected, re, why);
  }
  assert.equal(PENDING_MAX_MS, 22 * 60_000);
  // Future skew is tight (5 s): 10 s ahead is not pending; 2 s ahead (clock jitter) still is.
  assert.equal(FUTURE_SKEW_MS, 5_000);
  const ahead10 = checkBuildWitness(log(row(1, both())), cfLive(SHA2, VID2, new Date(NOW + 10_000).toISOString()), { now: NOW });
  assert.equal(ahead10.status, "failed"); assert.match(ahead10.pending_rejected, /future/);
  const ahead2 = checkBuildWitness(log(row(1, both())), cfLive(SHA2, VID2, new Date(NOW + 2_000).toISOString()), { now: NOW });
  assert.equal(ahead2.status, "pending");
  const noObs = pendingWindow(cfLive(SHA2, VID2, new Date(NOW).toISOString()), { n: 1 }, NOW);
  assert.equal(noObs.pending, false); n++;
}
// HTTP: heads publish build; verify 409 on mismatch, 503 + Retry-After on pending, never 200 unless matched.
{
  const handler = (await import("../src/index.js")).default.fetch;
  // One real chain head so the anchored-heads check passes and only the build check decides.
  const CL = memoryChainWriterNamespace({});
  await append(storeFor({ CHAINLOCK: CL }), { c: "acts", s: "a", f: "first" });
  const realHeads = await A.collectHeads({ CHAINLOCK: CL }, { storeFor });
  const call = async (env, statement) => {
    A.seedAnchorMemo("anchors", log(row(1, { heads: { chains: realHeads.chains, stores: {} }, ...statement })));
    A.seedAnchorMemo("audits", { ok: false, code: "ANCHOR-MISSING" });
    const res = await handler(new Request("https://rt.example/v1/anchor/verify"), env);
    return { status: res.status, retry: res.headers.get("retry-after"), body: await res.json() };
  };
  const env = { CHAINLOCK: CL, GIT_SHA: SHA, CF_VERSION_METADATA: { id: VID, tag: "", timestamp: "2026-10-01T00:00:00Z" } };
  const meta = softwareMeta(env);
  const heads = await (await handler(new Request("https://rt.example/v1/anchor/heads"), env)).json();
  assert.equal(heads.build.git_sha, meta.git_sha); assert.equal(heads.build.version_id, meta.version_id);
  const good = await call(env, both(meta.git_sha, meta.version_id));
  assert.equal(good.body.build_witness.status, "verified", JSON.stringify(good.body.build_witness));
  assert.equal(good.body.latest.runtime_check.ok, true, JSON.stringify(good.body.latest.runtime_check));
  assert.equal(good.status, 200); assert.equal(good.body.code, "ANCHOR-OK");
  const bad = await call(env, both(SHA2, VID2));
  assert.equal(bad.status, 409); assert.equal(bad.body.code, "BUILD-WITNESS-MISMATCH");
  const unknown = await call({}, both());
  assert.equal(unknown.status, 409); assert.equal(unknown.body.build_witness.code, "BUILD-WITNESS-MISMATCH");
  const freshEnv = { CHAINLOCK: CL, GIT_SHA: SHA2, CF_VERSION_METADATA: { id: VID2, tag: "", timestamp: new Date(Date.now() - 60_000).toISOString() } };
  const pend = await call(freshEnv, { ...both(), observed_at: new Date(Date.now() - 10 * 60_000).toISOString() });
  assert.equal(pend.status, 503); assert.ok(Number(pend.retry) >= 30); assert.equal(pend.body.ok, false); assert.notEqual(pend.body.code, "ANCHOR-OK");
  assert.equal(pend.body.build_witness.status, "pending"); assert.ok(pend.body.build_witness.pending_since);
  const none = await call(env, {});
  assert.equal(none.body.build_witness.status, "not_checked"); assert.equal(none.body.build_witness.ok, null);
  A.resetAnchorMemo(); n++;
}
assert.equal(witnessedBuildOf({ n: 1 }), null);
console.log(`ok build witness (RIB-041): ${n} checks`);
