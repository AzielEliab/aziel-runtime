/**
 * RIB-041 / AZRT-BUILD-WITNESS-1.0: build identity published with the heads; verify fails closed when
 * the newest witnessed build differs from the live build; no witness -> not_checked (never a pass).
 */
import assert from "node:assert/strict";
import * as A from "../src/anchor.js";
import { checkBuildWitness, liveBuildOf, witnessedBuildOf } from "../src/build-witness.js";
import { softwareMeta } from "../src/software-catalog.js";

let n = 0;
const SHA = "3221bbe47c04873575957d4f6220133e65039111";
const SHA2 = "fe340841daabb2e65368622e1667c56bee8b51c1";
const VID = "38a05023-5835-4ce0-a203-a53fb11382e6";
const row = (n, statement) => ({ statement: { n, ...statement }, statement_hash: String(n).padStart(64, "0") });
const log = (...rows) => ({ ok: true, n: rows.length, latest: rows.at(-1), entries: rows });

// not_checked, never a pass.
{
  const live = liveBuildOf({ git_sha: SHA, version_id: VID });
  for (const [anchors, why] of [[null, "no log"], [{ ok: false, code: "ANCHOR-UNREACHABLE" }, "unreachable"], [log(row(1, { heads: { chains: [] } })), "no build in any statement"]]) {
    const r = checkBuildWitness(anchors, live);
    assert.equal(r.status, "not_checked", why); assert.equal(r.ok, null, why); assert.notEqual(r.ok, true);
  }
  const unknownLive = checkBuildWitness(log(row(1, { git_sha: SHA })), liveBuildOf({}));
  assert.equal(unknownLive.status, "not_checked"); assert.equal(unknownLive.ok, null);
  const noShared = checkBuildWitness(log(row(1, { build: { version_id: VID } })), liveBuildOf({ git_sha: SHA }));
  assert.equal(noShared.status, "not_checked"); n++;
}
// Match: verified (both fields) / partial (old statements carry only git_sha).
{
  const full = checkBuildWitness(log(row(1, { git_sha: SHA, build: { git_sha: SHA, version_id: VID } })), liveBuildOf({ git_sha: SHA.toUpperCase(), version_id: VID }));
  assert.equal(full.status, "verified"); assert.equal(full.ok, true); assert.deepEqual(full.compared, ["git_sha", "version_id"]);
  const old = checkBuildWitness(log(row(1, { git_sha: SHA })), liveBuildOf({ git_sha: SHA, version_id: VID }));
  assert.equal(old.status, "partial"); assert.equal(old.ok, true); assert.deepEqual(old.not_compared, ["version_id"]); n++;
}
// Mismatch fails closed: git_sha, version_id, or both; newest witnessed statement wins.
{
  const w = log(row(1, { git_sha: SHA, build: { git_sha: SHA, version_id: VID } }));
  const sha = checkBuildWitness(w, liveBuildOf({ git_sha: SHA2, version_id: VID }));
  assert.equal(sha.ok, false); assert.equal(sha.code, "BUILD-WITNESS-MISMATCH"); assert.equal(sha.diffs[0].field, "git_sha");
  const vid = checkBuildWitness(w, liveBuildOf({ git_sha: SHA, version_id: "other-version" }));
  assert.equal(vid.ok, false); assert.equal(vid.diffs[0].field, "version_id");
  const newest = checkBuildWitness(log(row(1, { git_sha: SHA2 }), row(2, { git_sha: SHA, build: { git_sha: SHA, version_id: VID } }), row(3, { heads: {} })), liveBuildOf({ git_sha: SHA2, version_id: VID }));
  assert.equal(newest.ok, false, "an older matching statement does not rescue a newer mismatch");
  assert.equal(newest.witnessed.n, 2); n++;
}
// witnessedBuildOf reads build, heads.build, then top-level git_sha.
{
  assert.deepEqual(witnessedBuildOf({ n: 4, heads: { build: { git_sha: SHA, version_id: VID } } }), { git_sha: SHA, version_id: VID, n: 4, observed_at: null });
  assert.equal(witnessedBuildOf({ n: 1 }), null);
  assert.equal(liveBuildOf({ git_sha: "not-a-sha" }).git_sha, null); n++;
}
// /v1/anchor/heads publishes the build; /v1/anchor verify reports build_witness and fails closed on mismatch.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const env = { GIT_SHA: SHA, CF_VERSION_METADATA: { id: VID, tag: "", timestamp: "2026-10-13T00:00:00Z" } };
  const meta = softwareMeta(env);
  const heads = await (await handler(new Request("https://rt.example/v1/anchor/heads"), env)).json();
  assert.equal(heads.build.git_sha, meta.git_sha); assert.equal(heads.build.version_id, meta.version_id);
  assert.equal(heads.build.spec, "AZRT-BUILD-WITNESS-1.0");
  const verifyWith = async (statement) => {
    A.seedAnchorMemo("anchors", log(row(1, { heads: { chains: [], stores: {} }, ...statement })));
    A.seedAnchorMemo("audits", { ok: false, code: "ANCHOR-MISSING" });
    const res = await handler(new Request("https://rt.example/v1/anchor/verify"), env);
    return { status: res.status, body: await res.json() };
  };
  const bad = await verifyWith({ git_sha: SHA2, build: { git_sha: SHA2, version_id: VID } });
  assert.equal(bad.status, 409); assert.equal(bad.body.ok, false); assert.equal(bad.body.code, "BUILD-WITNESS-MISMATCH"); assert.equal(bad.body.build_witness.status, "failed");
  const good = await verifyWith({ git_sha: meta.git_sha, build: { git_sha: meta.git_sha, version_id: meta.version_id } });
  assert.notEqual(good.body.build_witness.ok, false); assert.ok(["verified", "partial"].includes(good.body.build_witness.status), JSON.stringify(good.body.build_witness));
  const none = await verifyWith({});
  assert.equal(none.body.build_witness.status, "not_checked"); assert.equal(none.body.build_witness.ok, null);
  A.resetAnchorMemo();
  assert.doesNotMatch(JSON.stringify(good.body.build_witness), /\bsigned receipts?\b/i); n++;
}
console.log(`ok build witness (RIB-041): ${n} checks`);
