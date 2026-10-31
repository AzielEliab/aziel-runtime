/**
 * RIB-048 build attestation, RIB-049 second-mint refusal, RIB-050 writer fence,
 * RIB-051 harness-only seal. Hash-linked and sealed, not signed. Not live.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { append, loadChain, saveChain, stampSha256, verify } from "../src/chainlock/ops.js";
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
  const repro = execSync("node scripts/build-attest.mjs", { encoding: "utf8" });
  const again = execSync("node scripts/build-attest.mjs", { encoding: "utf8" });
  assert.equal(JSON.parse(repro).artifact_digest, JSON.parse(again).artifact_digest);
  assert.equal(JSON.parse(repro).signed, false);
  assert.equal(JSON.parse(repro).live, false);
  assert.equal(JSON.parse(repro).builder_identity, null);
  const flippedOut = JSON.parse(execSync("node scripts/build-attest.mjs --mismatch", { encoding: "utf8" }));
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

console.log(`ok rib-048-051: ${n} checks`);
