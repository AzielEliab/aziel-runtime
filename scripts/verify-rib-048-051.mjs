/**
 * RIB-048 build attestation, RIB-049 second-mint refusal, RIB-050 writer fence,
 * RIB-051 harness-only seal. Hash-linked and sealed, not signed. Not live.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { append, loadChain, saveChain, stampSha256, verify } from "../src/chainlock/ops.js";
import { storeFor } from "../src/chainlock/store.js";
import { MemoryStore } from "../src/chainlock/store.js";
import {
  appendReceipt,
  applyOpen,
  applyRevoke,
  applyStop,
  commitExec,
  newSessionId,
  openSession,
  recordIntent,
  signReceipt,
  verifyChainStrict,
} from "../src/session-core.js";
import { newIssuerKey } from "../src/issuer-append.js";
import {
  checkBuildAttest,
  digestBytes,
  resetBuildAttestState,
  setWitnessedBuildAttest,
} from "../src/build-attest.js";
import { heldSignerFromEnv, keyIdOf } from "../src/receipt-signing.js";
import {
  resetSecondMintState,
  secondMintWitnessFragment,
  setWitnessedReceiptKeyId,
  verifySecondMintChain,
  verifySecondMintRefusal,
} from "../src/second-mint.js";

let n = 0;
const T = "2026-10-31T00:00:00.000Z";
const b64u = (buf) => Buffer.from(buf).toString("base64url");
async function provision() {
  const kp = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  return { priv: b64u(await webcrypto.subtle.exportKey("pkcs8", kp.privateKey)), pub: b64u(await webcrypto.subtle.exportKey("raw", kp.publicKey)) };
}

const doc = readFileSync(new URL("../docs/designs/AZRT-GROUP-D-RECEIPTS-1.0.md", import.meta.url), "utf8");
assert.match(doc, /Not live/);
assert.match(doc, /not signed/);
assert.match(doc, /Cap-7 is not ICANN/);
assert.match(doc, /HELD/);
n++;

// RIB-048: one changed byte is rejected. Builder identity comes from the witness, not a deploy var.
{
  resetBuildAttestState();
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const digest = await digestBytes(bytes);
  const flipped = new Uint8Array(bytes);
  flipped[0] = 9;
  const bad = await digestBytes(flipped);
  assert.notEqual(bad, digest);
  const witnessed = {
    artifact_digest: digest,
    source_revision: "abc1234",
    builder_identity: { workflow: "ci.yml", run_id: "9" },
    build_environment: { lockfile_sha256: digest, toolchain: { node: "v20" } },
  };
  const mismatch = checkBuildAttest({
    runningDigest: bad,
    witnessed,
    deployVars: { GIT_SHA: "deadbeef", BUILDER_RUN_ID: "999" },
  });
  assert.equal(mismatch.allowed, false);
  assert.equal(mismatch.code, "BUILD-ATTEST-MISMATCH");
  assert.equal(mismatch.view.builder_identity.run_id, "9");
  const same = checkBuildAttest({ runningDigest: digest, witnessed, deployVars: { BUILDER_RUN_ID: "999" } });
  assert.equal(same.allowed, true);
  assert.equal(same.view.status, "verified");
  assert.equal(same.view.builder_identity.run_id, "9");
  const missing = checkBuildAttest({ runningDigest: digest, witnessed: null, strict: false });
  assert.equal(missing.allowed, true);
  assert.equal(missing.view.ok, null);
  assert.equal(missing.view.status, "not_checked");
  const strict = checkBuildAttest({ runningDigest: digest, witnessed: null, strict: true });
  assert.equal(strict.allowed, false);
  assert.equal(strict.code, "BUILD-ATTEST-NOT-CHECKED");
  // This block checks the absent-identity path. CI sets GITHUB_WORKFLOW and GITHUB_RUN_ID,
  // and the script correctly emits those. Strip them here so the child is not a CI job.
  const attestEnv = { ...process.env };
  delete attestEnv.GITHUB_WORKFLOW;
  delete attestEnv.GITHUB_RUN_ID;
  const repro = execSync("node scripts/build-attest.mjs", { encoding: "utf8", env: attestEnv });
  const again = execSync("node scripts/build-attest.mjs", { encoding: "utf8", env: attestEnv });
  assert.equal(JSON.parse(repro).artifact_digest, JSON.parse(again).artifact_digest);
  assert.equal(JSON.parse(repro).signed, false);
  assert.equal(JSON.parse(repro).live, false);
  assert.equal(JSON.parse(repro).builder_identity, null);
  assert.equal(JSON.parse(repro).cap7_is_icann, false);
  assert.equal(JSON.parse(repro).paid_sat, "HELD");
  const flippedOut = JSON.parse(execSync("node scripts/build-attest.mjs --mismatch", { encoding: "utf8", env: attestEnv }));
  assert.equal(flippedOut.code, "BUILD-ATTEST-MISMATCH");
  n++;
}

// RIB-049: key B against a witnessed key A is a sealed refusal. A forged deny fails closed.
{
  resetSecondMintState();
  const A = await provision();
  const B = await provision();
  const tip = "ab".repeat(32);
  setWitnessedReceiptKeyId(await keyIdOf(A.pub));
  const held = await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: A.pub });
  assert.equal(held.ok, true);
  const second = await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: B.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub }, { tip });
  assert.equal(second.ok, false);
  assert.equal(second.code, "KEY-SECOND-MINT");
  const row = second.refusal;
  assert.equal(row.path, "deploy-held-key");
  assert.equal(row.attempt, 1);
  assert.ok(row.deny_reason);
  assert.equal(row.signed, false);
  assert.equal((await verifySecondMintRefusal(row, { tip: row.tip })).ok, true);
  assert.equal((await verifySecondMintChain([row])).ok, true);
  const unlinked = { ...row, prev_hash: "cd".repeat(32), hash: row.hash };
  assert.equal((await verifySecondMintRefusal(unlinked, { tip: row.tip })).code, "KEY-SECOND-MINT-FORGED");
  assert.equal((await verifySecondMintChain([{ ...row, prev_hash: "cd".repeat(32) }])).ok, false);
  const forged = { ...row, deny_reason: "forged allow" };
  const bad = await verifySecondMintRefusal(forged, { tip: row.tip });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "KEY-SECOND-MINT-FORGED");
  const frag = secondMintWitnessFragment();
  assert.equal(frag.refused_key_id, second.key_id);
  assert.equal(frag.refusal_receipt_hash, row.hash);
  assert.equal(frag.live, false);
  assert.equal(frag.signed, false);
  resetSecondMintState();
  n++;
}

const ISS = await newIssuerKey();
async function session() {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { issuer_key_hash: ISS.key_hash });
  return s;
}
const intent = (s, extra = {}) => recordIntent(s, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", ...extra }, T);

// RIB-051 + RIB-048 on the session path. Old fixture rows stay valid.
{
  resetBuildAttestState();
  const s = await session();
  assert.equal(s.receipts[0].issuer_kind, "harness");
  assert.equal(s.receipts[0].issuer_path, "runtime_session_open");
  assert.equal(s.writer_epoch, 1);
  await appendReceipt(s, "policy", {}, T, { issuer_kind: "untrusted", issuer_path: "script" });
  assert.equal(s.receipts.at(-1).issuer_kind, "harness");
  assert.equal(s.receipts.at(-1).issuer_path, "runtime_session_policy");
  const opened = await intent(s);
  const exec = await commitExec(s, { intent: opened.intent, status: 200, latencyMs: 1, requestDigest: "aa", responseDigest: "bb", responseBytes: 2 }, T);
  assert.equal(exec.issuer_kind, "harness");
  assert.equal(exec.issuer_path, "runtime_session_exec");
  assert.equal(exec.build_attest.status, "not_checked");
  assert.equal(exec.build_attest.ok, null);
  assert.equal(exec.build_attest.signed, false);
  const bytes = new Uint8Array([7, 7, 7]);
  setWitnessedBuildAttest({ artifact_digest: await digestBytes(bytes), builder_identity: { workflow: "ci.yml", run_id: "4" } });
  const before = s.receipts.length;
  await assert.rejects(intent(s), (e) => e.code === "BUILD-ATTEST-MISMATCH" && e.extra.refused_receipt.sealed === true && e.extra.executed === false);
  assert.equal(s.receipts.length, before + 1);
  assert.equal(s.receipts.at(-1).event, "refused");
  assert.equal(s.receipts.at(-1).payload.refusal.code, "BUILD-ATTEST-MISMATCH");
  resetBuildAttestState();
  s.policy.build_attest_strict = true;
  await assert.rejects(intent(s), (e) => e.code === "BUILD-ATTEST-NOT-CHECKED");
  s.policy.build_attest_strict = false;
  const fx = JSON.parse(readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
  const old = await verifyChainStrict(fx.receipts);
  assert.equal(old.ok, true, JSON.stringify(old.errors));
  assert.equal(old.writer_fence.legacy, true);
  n++;
}

// RIB-050: stop refuses the next exec and records side effects as not undone.
// Revoke bumps the epoch; an older token is fenced. The chain still verifies.
{
  resetBuildAttestState();
  const s = await session();
  s.pending_intent = { intent_id: s.id + ":pending" };
  const stopped = await applyStop(s, T, {
    reason: "operator stop",
    side_effects: [
      { id: "ext", side_effect_status: "completed" },
      { id: "lie", side_effect_status: "rolled_back" },
    ],
  }, { issuerKey: ISS.key });
  assert.equal(stopped.event, "stop");
  assert.equal(stopped.writer_fence.stopped, true);
  assert.equal(stopped.writer_fence.bumped, true);
  assert.match(stopped.stop.not_undone, /does not undo/);
  assert.ok(stopped.stop.side_effects.some((x) => x.side_effect_status === "completed"));
  assert.ok(stopped.stop.side_effects.some((x) => x.side_effect_status === "unknown"));
  assert.equal(JSON.stringify(stopped).includes("rolled_back"), false);
  await assert.rejects(intent(s), (e) => e.code === "SESSION-STOPPED" && e.extra.refused_receipt.sealed === true);
  const verifiedStop = await verifyChainStrict(s.receipts);
  assert.equal(verifiedStop.ok, true, JSON.stringify(verifiedStop.errors));

  const s2 = await session();
  await applyRevoke(s2, T, { reason: "bump the epoch" }, { issuerKey: ISS.key });
  assert.equal(s2.writer_epoch, 2);
  await assert.rejects(intent(s2, { writerEpoch: 1 }), (e) => e.code === "STALE-WRITER-FENCED" && e.extra.refused_receipt.sealed === true);
  await assert.rejects(intent(s2), (e) => e.code === "SPEC-REVOKED");
  const prev = s2.receipts.at(-1);
  const { hash: _h, signature: _s, writer_fence: _f, ...rest } = prev;
  const forged = await signReceipt({ ...rest, seq: s2.receipts.length + 1, event: "exec", writer_epoch: 1 }, prev.hash);
  s2.receipts.push({ ...forged, signature: null });
  const bad = await verifyChainStrict(s2.receipts);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.error === "STALE-WRITER-EPOCH"));
  n++;
}

// Chain fence race, and a script that cannot mint a harness exec receipt.
{
  const store = new MemoryStore();
  const opened = await append(store, { c: "acts", subject: "fence", fact: "epoch one", writer_epoch: 1 }, { fenceAuthority: true });
  assert.equal(opened.ok, true);
  assert.equal(opened.stamp.writer_epoch, 1);
  const bumped = await append(store, { c: "acts", subject: "fence", fact: "epoch two", writer_epoch: 2 }, { fenceAuthority: true });
  assert.equal(bumped.ok, true);
  assert.equal(bumped.stamp.writer_fence.bumped, true);
  const stale = await append(store, { c: "acts", subject: "fence", fact: "stale writer", writer_epoch: 1 });
  assert.equal(stale.ok, false);
  assert.equal(stale.code, "STALE-WRITER-FENCED");
  assert.equal(stale.written, false);
  const { verifySealedRefusal } = await import("../src/harness-seal.js");
  assert.equal((await verifySealedRefusal(stale.refusal_receipt, { tip: stale.refusal_receipt.tip })).ok, true);
  const forgedDeny = { ...stale.refusal_receipt, deny_reason: "forged" };
  assert.equal((await verifySealedRefusal(forgedDeny)).ok, false);
  const stopped = await append(store, { c: "acts", k: "stop", subject: "stop", fact: "runtime stop", writer_epoch: 3 }, { fenceAuthority: true });
  assert.equal(stopped.ok, true);
  assert.equal(stopped.stamp.writer_fence.stopped, true);
  assert.match(stopped.stamp.writer_fence.not_undone, /does not undo/);
  const after = await append(store, { c: "acts", subject: "fence", fact: "after stop", writer_epoch: 3 });
  assert.equal(after.ok, false);
  assert.equal(after.code, "SESSION-STOPPED");

  const script = await append(store, { c: "session", subject: "script", fact: "I called foldlock", issuer_kind: "harness", issuer_path: "runtime_session_exec" });
  assert.equal(script.ok, false);
  assert.equal(script.code, "SELF-AUDIT-REFUSED");
  assert.equal(script.written, false);
  const self = await append(store, { c: "session", subject: "script", fact: "I called foldlock" });
  assert.equal(self.ok, true);
  assert.equal(self.stamp.issuer_kind, "untrusted");
  assert.equal(self.stamp.issuer_path, "chainlock_append");
  const seen = await verify(store, { c: "session" });
  assert.equal(seen.ok, true, JSON.stringify(seen.breaks));
  assert.equal(seen.chains[0].harness.not_trusted, true);
  assert.equal(seen.chains[0].harness.exec_evidence, false);
  const rows = await loadChain(store, "session", "");
  rows[0].issuer_kind = "harness";
  rows[0].issuer_path = "runtime_session_exec";
  rows[0].stamp_sha256 = await stampSha256(rows[0]);
  await saveChain(store, "session", rows, "");
  const forged = await verify(store, { c: "session" });
  assert.equal(forged.ok, false);
  assert.ok(forged.breaks.some((b) => b.code === "HARNESS-ISSUER-FORGED"));

  const plain = new MemoryStore();
  const row = await append(plain, { c: "mesh", subject: "note", fact: "a plain fact" });
  assert.equal(row.ok, true);
  assert.equal(row.stamp.issuer_kind, undefined);
  n++;
}

// Heads, session stop, writer fence, and harness seal through the HTTP / MCP door.
// REQUIRE_TOKEN stays on. No token is 401. No secret is 503. The issuer key stays required.
{
  const { BUILD_BUNDLE_DIGEST } = await import("../src/build-meta.js");
  const { memorySessionNamespace } = await import("../src/session-do.js");
  const { memoryChainWriterNamespace } = await import("../src/chainlock/writer-do.js");
  const { resetAnchorMemo, seedAnchorMemo } = await import("../src/anchor.js");
  const { isSessionMutatePath } = await import("../src/production.js");
  const handler = (await import("../src/index.js")).default.fetch;
  assert.equal(isSessionMutatePath("/v1/session/" + "sess_" + "a".repeat(32) + "/stop", "POST"), true);
  assert.equal(isSessionMutatePath("/v1/session/" + "sess_" + "a".repeat(32) + "/stop", "GET"), false);
  assert.match(BUILD_BUNDLE_DIGEST, /^[a-f0-9]{64}$/);
  const attestEnv = { ...process.env };
  delete attestEnv.GITHUB_WORKFLOW;
  delete attestEnv.GITHUB_RUN_ID;
  const emitted = JSON.parse(execSync("node scripts/build-attest.mjs", { encoding: "utf8", env: attestEnv }));
  assert.equal(emitted.artifact_digest, BUILD_BUNDLE_DIGEST);
  n++;

  const TOKEN = "rt_" + "d".repeat(40);
  const A = await provision();
  const B = await provision();
  const keyA = await keyIdOf(A.pub);
  const keyB = await keyIdOf(B.pub);
  const origin = "https://rt.example";
  const call = (env, method, path, body, headers) => handler(new Request(origin + path, {
    method,
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0", ...(headers || {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }), env);
  function seed(statement) {
    resetAnchorMemo();
    seedAnchorMemo("anchors", { ok: true, n: 1, latest: { statement }, entries: [{ statement }] });
  }
  function sessEnv(extra) {
    const env = { REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN, __aziel_rate_limits: { anon_mutate: 200 }, ...extra };
    env.SESSION = memorySessionNamespace(env);
    return env;
  }

  // Witness has the held key and no artifact digest: second mint is checked (none), build attest stays not_checked.
  resetSecondMintState();
  const beforeRows = (await import("../src/second-mint.js")).secondMintRefusals().length;
  seed({ n: 1, receipt_key: { key_id: keyA } });
  let heads = await (await call({ RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: A.pub }, "GET", "/v1/anchor/heads")).json();
  assert.equal(heads.second_mint.status, "none");
  assert.equal(heads.second_mint.ok, true);
  assert.equal(heads.second_mint.live, true);
  assert.equal(heads.second_mint.checked, true);
  assert.equal(heads.second_mint.signed, false);
  assert.equal(heads.second_mint.witnessed_key_id, keyA);
  assert.equal(heads.build_attest.status, "not_checked");
  assert.equal(heads.build_attest.ok, null);
  assert.equal(heads.build_attest.live, false);
  assert.equal(heads.build_attest.checked, true);
  assert.equal(heads.build_attest.artifact_digest, BUILD_BUNDLE_DIGEST);
  assert.equal(heads.receipt_key.key_id, keyA);
  assert.equal((await import("../src/second-mint.js")).secondMintRefusals().length, beforeRows, "heads does not append a refusal");
  n++;

  // Matching witnessed digest: the check decides verified. One changed byte is failed.
  seed({ n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST, builder_identity: { workflow: "ci.yml", run_id: "4" } }, receipt_key: { key_id: keyA } });
  heads = await (await call({ RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: A.pub }, "GET", "/v1/anchor/heads")).json();
  assert.equal(heads.build_attest.status, "verified");
  assert.equal(heads.build_attest.ok, true);
  assert.equal(heads.build_attest.live, true);
  assert.equal(heads.build_attest.builder_identity.run_id, "4");
  assert.equal(heads.build_attest.signed, false);
  const other = "ab".repeat(32);
  seed({ n: 1, build_attest: { artifact_digest: other, builder_identity: { workflow: "ci.yml", run_id: "4" } } });
  heads = await (await call({}, "GET", "/v1/anchor/heads")).json();
  assert.equal(heads.build_attest.status, "failed");
  assert.equal(heads.build_attest.ok, false);
  assert.equal(heads.build_attest.live, true);
  assert.equal(heads.build_attest.code, "BUILD-ATTEST-MISMATCH");
  n++;

  // Key B against witnessed key A: sealed refusal on heads, and the held public key is still published.
  resetSecondMintState();
  seed({ n: 1, receipt_key: { key_id: keyA } });
  heads = await (await call({ RECEIPT_SIGNING_KEY: B.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub }, "GET", "/v1/anchor/heads")).json();
  assert.equal(heads.second_mint.status, "refused");
  assert.equal(heads.second_mint.ok, false);
  assert.equal(heads.second_mint.live, true);
  assert.equal(heads.second_mint.code, "KEY-SECOND-MINT");
  assert.equal(heads.second_mint.refused_key_id, keyB);
  assert.equal(heads.second_mint.preview, true);
  assert.equal(heads.second_mint.hash_role, "preview");
  assert.match(heads.second_mint.reason, /preview/);
  assert.equal(heads.receipt_key.key_id, keyB);
  assert.equal((await verifySecondMintRefusal(heads.second_mint.refusal, { tip: heads.second_mint.refusal.tip })).ok, true);
  resetSecondMintState();
  setWitnessedReceiptKeyId(keyA);
  const signed = await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: B.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub }, { tip: "ab".repeat(32) });
  assert.equal(signed.ok, false);
  assert.equal(signed.code, "KEY-SECOND-MINT");
  assert.notEqual(signed.refusal.hash, heads.second_mint.refusal_receipt_hash);
  const chain = await (await import("../src/second-mint.js")).verifySecondMintChain([signed.refusal]);
  assert.equal(chain.ok, true, JSON.stringify(chain.errors));
  resetSecondMintState();
  const forged = { ...heads.second_mint.refusal, deny_reason: "forged allow" };
  assert.equal((await verifySecondMintRefusal(forged, { tip: forged.tip })).ok, false);
  n++;

  // Unreadable witness log: not_checked, heads still 200, no fake pass.
  resetAnchorMemo();
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const res = await call({}, "GET", "/v1/anchor/heads");
    assert.equal(res.status, 200);
    heads = await res.json();
    assert.equal(heads.build_attest.status, "not_checked");
    assert.equal(heads.build_attest.ok, null);
    assert.equal(heads.build_attest.live, false);
    assert.equal(heads.build_attest.checked, false);
    assert.equal(heads.second_mint.status, "not_checked");
    assert.equal(heads.second_mint.live, false);
    assert.equal(heads.second_mint.checked, false);
    assert.equal(heads.second_mint.reason, "witness log was not read");
    assert.equal(heads.build_attest.artifact_digest, BUILD_BUNDLE_DIGEST);
  } finally {
    globalThis.fetch = origFetch;
    resetAnchorMemo();
  }
  n++;

  const auth = { authorization: "Bearer " + TOKEN };
  async function opened(env) {
    const res = await call(env, "POST", "/v1/session/open", {}, auth);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    return body;
  }

  // Token gate stays in front of stop and of the build-attest exec check.
  {
    const env = sessEnv();
    seed({ n: 1 });
    const o = await opened(env);
    const id = o.session.id;
    const ik = o.issuer_key;
    const len0 = (await (await call(env, "GET", `/v1/session/${id}/receipts`)).json()).receipts.length;
    let r = await call(env, "POST", `/v1/session/${id}/stop`, { reason: "no token" }, { "x-azrt-issuer-key": ik });
    assert.equal(r.status, 401);
    assert.equal((await r.json()).code, "token_required");
    r = await call(env, "POST", `/v1/session/${id}/stop`, { reason: "wrong token" }, { authorization: "Bearer wrong-token", "x-azrt-issuer-key": ik });
    assert.equal(r.status, 401);
    assert.equal((await r.json()).code, "token_mismatch");
    r = await call(env, "POST", `/v1/session/${id}/stop?token=${TOKEN}`, { reason: "query token" }, { "x-azrt-issuer-key": ik });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).code, "TOKEN-QUERY-REFUSED");
    r = await call(env, "POST", `/v1/session/${id}/stop`, { reason: "no issuer" }, auth);
    assert.equal(r.status, 403);
    assert.equal((await r.json()).code, "CL-NOT-ISSUER");
    assert.equal((await (await call(env, "GET", `/v1/session/${id}/receipts`)).json()).receipts.length, len0);
    const bare = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1" };
    r = await call(bare, "POST", `/v1/session/${id}/stop`, { reason: "no secret" }, { authorization: "Bearer " + TOKEN, "x-azrt-issuer-key": ik });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "token_not_configured");
    n++;

    seed({ n: 1, build_attest: { artifact_digest: other } });
    r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} });
    assert.equal(r.status, 401, "mismatch does not run when the token is missing");
    assert.equal((await r.json()).code, "token_required");
    r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
    const mismatch = await r.json();
    assert.equal(r.status, 409, JSON.stringify(mismatch));
    assert.equal(mismatch.code, "BUILD-ATTEST-MISMATCH");
    assert.equal(mismatch.executed, false);
    const refused = (await (await call(env, "GET", `/v1/session/${id}/receipts`)).json()).receipts.at(-1);
    assert.equal(refused.event, "refused");
    assert.equal(refused.issuer_kind, "harness");
    assert.equal(refused.payload.refusal.code, "BUILD-ATTEST-MISMATCH");
    n++;

    seed({ n: 1 });
    r = await call(env, "POST", `/v1/session/${id}/policy`, { build_attest_strict: true }, auth);
    assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
    r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
    const strict = await r.json();
    assert.equal(r.status, 409, JSON.stringify(strict));
    assert.equal(strict.code, "BUILD-ATTEST-NOT-CHECKED");
    r = await call(env, "POST", `/v1/session/${id}/policy`, { build_attest_strict: false }, auth);
    assert.equal(r.status, 409);
    assert.equal((await r.json()).code, "BUILD-ATTEST-POLICY-DOWNGRADE");
    n++;
  }

  // A witnessed matching digest lets exec run. The receipt is harness-sealed and records the check.
  {
    const env = sessEnv();
    seed({ n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST, builder_identity: { workflow: "ci.yml", run_id: "4" } } });
    const o = await opened(env);
    const id = o.session.id;
    const r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
    const body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    assert.equal(body.receipt.event, "exec");
    assert.equal(body.receipt.issuer_kind, "harness");
    assert.equal(body.receipt.issuer_path, "runtime_session_exec");
    assert.equal(body.receipt.build_attest.status, "verified");
    assert.equal(body.receipt.build_attest.ok, true);
    assert.equal(body.receipt.build_attest.signed, false);
    assert.equal(body.receipt.build_attest.builder_identity.run_id, "4");
    const chain = await verifyChainStrict((await (await call(env, "GET", `/v1/session/${id}/receipts`)).json()).receipts);
    assert.equal(chain.ok, true, JSON.stringify(chain.errors));
    assert.equal(chain.harness_seal.trusted_exec, 1);
    n++;
  }

  // Stop is runtime-enforced. The next exec is SESSION-STOPPED. Side effects are not undone.
  {
    const env = sessEnv();
    seed({ n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST } });
    const o = await opened(env);
    const id = o.session.id;
    const ik = o.issuer_key;
    let r = await call(env, "POST", `/v1/session/${id}/stop`, {
      reason: "operator stop",
      side_effects: [{ id: "ext", side_effect_status: "completed" }, { id: "lie", side_effect_status: "rolled_back" }],
    }, { ...auth, "x-azrt-issuer-key": ik });
    const stopped = await r.json();
    assert.equal(r.status, 200, JSON.stringify(stopped));
    assert.equal(stopped.receipt.event, "stop");
    assert.equal(stopped.receipt.writer_fence.stopped, true);
    assert.match(stopped.receipt.stop.not_undone, /does not undo/);
    assert.equal(JSON.stringify(stopped.receipt).includes("rolled_back"), false);
    assert.ok(stopped.receipt.stop.side_effects.some((x) => x.side_effect_status === "completed"));
    // No in-flight intent on this stop, so only the completed effect is kept. A pending intent is recorded unknown by the direct fence test above.
    assert.equal(stopped.receipt.stop.side_effects.some((x) => x.side_effect_status === "unknown"), false);
    r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
    const after = await r.json();
    assert.equal(r.status, 409, JSON.stringify(after));
    assert.equal(after.code, "SESSION-STOPPED");
    assert.equal(after.executed, false);
    const chain = await verifyChainStrict((await (await call(env, "GET", `/v1/session/${id}/receipts`)).json()).receipts);
    assert.equal(chain.ok, true, JSON.stringify(chain.errors));
    n++;
  }

  // Revoke bumps the epoch. An older writer_epoch is fenced at the session door. The issuer key is still required.
  {
    const env = sessEnv();
    seed({ n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST } });
    const o = await opened(env);
    const id = o.session.id;
    const ik = o.issuer_key;
    let r = await call(env, "POST", `/v1/session/${id}/revoke`, { reason: "bump the epoch" }, { ...auth, "x-azrt-issuer-key": ik });
    const revoked = await r.json();
    assert.equal(r.status, 200, JSON.stringify(revoked));
    assert.equal(revoked.session.writer_epoch, 2);
    r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {}, writer_epoch: 1 }, auth);
    const fenced = await r.json();
    assert.equal(r.status, 409, JSON.stringify(fenced));
    assert.equal(fenced.code, "STALE-WRITER-FENCED");
    assert.equal(fenced.executed, false);
    n++;
  }

  // Public chainlock_append cannot mint a harness receipt, and a stale writer epoch is fenced.
  {
    resetAnchorMemo();
    const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
    const opened = await append(env, { c: "acts", subject: "fence", fact: "epoch one", writer_epoch: 1 }, { fenceAuthority: true });
    assert.equal(opened.ok, true);
    const bumped = await append(env, { c: "acts", subject: "fence", fact: "epoch two", writer_epoch: 2 }, { fenceAuthority: true });
    assert.equal(bumped.ok, true);
    const mcp = async (args) => {
      const res = await call(env, "POST", "/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "chainlock_append", arguments: args } });
      const body = await res.json();
      const text = body && body.result && body.result.content && body.result.content[0] && body.result.content[0].text;
      return { body, text: text || JSON.stringify(body) };
    };
    const stale = await mcp({ c: "acts", subject: "fence", fact: "stale writer", writer_epoch: 1, confirm: true });
    assert.match(stale.text, /STALE-WRITER-FENCED/);
    assert.match(stale.text, /written: false/);
    const script = await mcp({ c: "session", subject: "script", fact: "note", issuer_kind: "harness", issuer_path: "runtime_session_exec", confirm: true });
    assert.match(script.text, /SELF-AUDIT-REFUSED/);
    assert.match(script.text, /written: false/);
    const self = await mcp({ c: "session", subject: "script", fact: "I called foldlock", confirm: true });
    assert.equal(self.body.result.isError, false);
    const seen = await verify(env, { c: "session" });
    assert.equal(seen.ok, true, JSON.stringify(seen.breaks));
    assert.equal(seen.chains[0].harness.not_trusted, true);
    assert.equal(seen.chains[0].harness.exec_evidence, false);
    const rows = await loadChain(storeFor(env), "session", "");
    assert.equal(rows.at(-1).issuer_kind, "untrusted");
    assert.equal(rows.at(-1).issuer_path, "chainlock_append");
    n++;
  }

  // P1-1: a fresh memo is reused. Past ANCHOR_CACHE_MS the next read fetches again.
  {
    const { ANCHOR_CACHE_MS, seedAnchorMemo: seedAt } = await import("../src/anchor.js");
    const { readGroupD } = await import("../src/group-d.js");
    resetAnchorMemo();
    let calls = 0;
    const boom = async () => { calls += 1; throw new Error("offline"); };
    const state = { ok: true, n: 1, latest: { statement: { n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST } } }, entries: [] };
    seedAt("anchors", state, Date.now());
    let view = await readGroupD(boom);
    assert.equal(calls, 0);
    assert.equal(view.checked, true);
    assert.equal(view.attest.artifact_digest, BUILD_BUNDLE_DIGEST);
    seedAt("anchors", state, Date.now() - ANCHOR_CACHE_MS - 1);
    view = await readGroupD(boom);
    assert.equal(calls, 1);
    assert.equal(view.log_ok, false);
    assert.equal(view.checked, false);
    resetAnchorMemo();
    n++;
  }

  // P1-1: the next session exec uses the statement loaded for that request.
  // A later witnessed mismatch is enforced. A memo older than the TTL is not reused.
  {
    const { ANCHOR_CACHE_MS, seedAnchorMemo: seedAt } = await import("../src/anchor.js");
    const env = sessEnv();
    seed({ n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST, builder_identity: { workflow: "ci.yml", run_id: "4" } } });
    const o = await opened(env);
    const id = o.session.id;
    let r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
    let body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    assert.equal(body.receipt.build_attest.status, "verified");
    seed({ n: 2, build_attest: { artifact_digest: other, builder_identity: { workflow: "ci.yml", run_id: "4" } } });
    r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
    body = await r.json();
    assert.equal(r.status, 409, JSON.stringify(body));
    assert.equal(body.code, "BUILD-ATTEST-MISMATCH");
    assert.equal(body.executed, false);
    const state = { ok: true, n: 1, latest: { statement: { n: 1, build_attest: { artifact_digest: BUILD_BUNDLE_DIGEST } } }, entries: [] };
    seedAt("anchors", state, Date.now() - ANCHOR_CACHE_MS - 1);
    const orig = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; throw new Error("offline"); };
    try {
      r = await call(env, "POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, auth);
      body = await r.json();
      assert.equal(calls, 1);
      assert.equal(r.status, 200, JSON.stringify(body));
      assert.equal(body.receipt.build_attest.status, "not_checked");
      assert.equal(body.receipt.build_attest.ok, null);
    } finally {
      globalThis.fetch = orig;
      resetAnchorMemo();
    }
    n++;
  }

  // P2-b: an in-flight load does not replace the isolate note, and an explicit statement stays on that call.
  {
    const { withGroupD } = await import("../src/group-d.js");
    const { assertBuildAttestForExec, setWitnessedBuildAttest, witnessedBuildAttest } = await import("../src/build-attest.js");
    resetAnchorMemo();
    resetBuildAttestState();
    setWitnessedBuildAttest({ artifact_digest: BUILD_BUNDLE_DIGEST, builder_identity: { workflow: "ci.yml", run_id: "1" } });
    let release;
    const wait = new Promise((resolve) => { release = resolve; });
    const inflight = withGroupD(async () => { await wait; throw new Error("slow"); }, async (view) => view);
    await Promise.resolve();
    assert.equal(witnessedBuildAttest().artifact_digest, BUILD_BUNDLE_DIGEST);
    const explicit = await assertBuildAttestForExec({ policy: {}, writer_epoch: 1 }, { witnessed: null });
    assert.equal(explicit.view.status, "not_checked");
    assert.equal(explicit.view.live, false);
    const noted = await assertBuildAttestForExec({ policy: {}, writer_epoch: 1 });
    assert.equal(noted.view.status, "verified");
    assert.equal(noted.view.live, true);
    release();
    const view = await inflight;
    assert.equal(view.checked, false);
    assert.equal(view.log_ok, false);
    assert.equal(witnessedBuildAttest().artifact_digest, BUILD_BUNDLE_DIGEST);
    resetBuildAttestState();
    resetAnchorMemo();
    n++;
  }

  // P1-2: the witness patch applies to the current aziel-anchors scripts/witness.mjs snapshot.
  {
    const { mkdtempSync, mkdirSync, copyFileSync, rmSync } = await import("node:fs");
    const { execFileSync } = await import("node:child_process");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "group-d-patch-"));
    mkdirSync(join(dir, "scripts"));
    const base = new URL("../fixtures/aziel-anchors-witness.mjs", import.meta.url);
    const patch = new URL("../docs/patches/aziel-anchors-witness-group-d.patch", import.meta.url);
    copyFileSync(base, join(dir, "scripts", "witness.mjs"));
    execFileSync("git", ["apply", "--check", patch.pathname], { cwd: dir });
    execFileSync("patch", ["--dry-run", "-p1", "-i", patch.pathname], { cwd: dir });
    rmSync(dir, { recursive: true, force: true });
    n++;
  }

  resetAnchorMemo();
  resetBuildAttestState();
  resetSecondMintState();
}

console.log(`ok rib-048-051: ${n} checks`);
