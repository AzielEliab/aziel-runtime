/**
 * AZRT-ANCHOR-1.0 / AZRT-INTEGRITY-LEVEL-1.0 / AZRT-ADDITIVE-COMPAT-1.0 offline checks.
 * - pre-change fixtures (session chain, ChainLock stamps, FragGate ledger rows) verify unchanged
 * - witness log verify: good log passes; tamper, re-order, wrong key, bad sig all fail closed
 * - anchor ref lands on new stamps / ledger rows only when a verified witness view exists
 * - integrity levels: chain_consistent without witness, externally_anchored with a matching witness,
 *   and a moved anchored head fails verify (ANCHOR-MISMATCH)
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { canonicalize, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { append, verify, stampSha256 } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { composeLedgerEntry, verifyLedger } from "../src/fraggate/ledger.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import * as A from "../src/anchor.js";

// 1. Old receipts verify unchanged (additive-only law).
const session = JSON.parse(fs.readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
const sessRows = Array.isArray(session) ? session : session.receipts;
const strict = await verifyChainStrict(sessRows);
assert.equal(strict.ok, true, "old session fixture verifies");
assert.equal(strict.integrity.level, "chain_consistent");
const pre = JSON.parse(fs.readFileSync(new URL("../fixtures/pre-anchor-receipts.json", import.meta.url), "utf8"));
for (const st of pre.chainlock_acts) assert.equal(await stampSha256(st), st.stamp_sha256, "old stamp hash unchanged");
assert.equal((await verifyLedger({ entries: pre.fraggate_ledger })).ok, true, "old ledger rows verify");
for (const e of pre.fraggate_ledger) {
  const again = await composeLedgerEntry(e, { seq: e.seq, prev: e.prev });
  assert.equal(again.hash, e.hash, "ledger compose unchanged without additive fields");
}

// 2. Witness log verification (fail closed).
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const pub = publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("base64url");
function signRow(statement) {
  const text = canonicalize(statement);
  return { statement, statement_hash: crypto.createHash("sha256").update(text).digest("hex"), public_key: pub, sig: crypto.sign(null, Buffer.from(text), privateKey).toString("base64url") };
}
const s1 = signRow({ spec: A.ANCHOR_SPEC, n: 1, prev_statement_hash: "0".repeat(64), observed_at: "2026-10-10T00:00:00Z", heads: { chains: [{ c: "acts", seq: 2, h: "x" }], stores: {} } });
const s2 = signRow({ spec: A.ANCHOR_SPEC, n: 2, prev_statement_hash: s1.statement_hash, observed_at: "2026-10-10T00:15:00Z", heads: { chains: [], stores: {} } });
assert.equal((await A.verifySignedLog([s1, s2], { publicKey: pub })).ok, true, "good log");
assert.equal((await A.verifySignedLog([], { publicKey: pub })).code, "ANCHOR-MISSING");
assert.equal((await A.verifySignedLog([s2, s1], { publicKey: pub })).code, "ANCHOR-ORDER-BREAK");
const tampered = JSON.parse(JSON.stringify(s1));
tampered.statement.heads.chains[0].h = "y";
assert.equal((await A.verifySignedLog([tampered], { publicKey: pub })).code, "ANCHOR-MISMATCH");
assert.equal((await A.verifySignedLog([s1], { publicKey: A.WITNESS_PUBLIC_KEY })).code, "ANCHOR-KEY-MISMATCH");
const forged = { ...s1, sig: s2.sig };
assert.equal((await A.verifySignedLog([forged], { publicKey: pub })).code, "ANCHOR-SIG-BAD");

// 2b. Key rotation epochs: real historical statements (old keys) verify unchanged under the
// retired-key list; a retired key cannot sign past its through_n; new rows need the new key.
const readJl = (f) => fs.readFileSync(new URL("../fixtures/" + f, import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const histA = readJl("anchors-epoch1.jsonl");
const histU = readJl("audits-epoch1.jsonl");
assert.equal((await A.verifySignedLog(histA, { publicKey: A.WITNESS_PUBLIC_KEY, retiredKeys: A.WITNESS_RETIRED_KEYS })).ok, true, "old witness statements verify after rotation");
assert.equal((await A.verifySignedLog(histU, { publicKey: A.AUDITOR_PUBLIC_KEY, retiredKeys: A.AUDITOR_RETIRED_KEYS, statementPrevField: "prev_audit_hash" })).ok, true, "old audit statements verify after rotation");
assert.equal((await A.verifySignedLog(histA, { publicKey: A.WITNESS_PUBLIC_KEY })).code, "ANCHOR-KEY-MISMATCH", "no retired list -> old rows refused");
const retiredFake = [{ public_key: pub, from_n: 1, through_n: 1 }];
const newKp = crypto.generateKeyPairSync("ed25519");
const newPub = newKp.publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("base64url");
const s2new = (() => { const st = { ...s2.statement, git_sha: "abc" }; const text = canonicalize(st); return { statement: st, statement_hash: crypto.createHash("sha256").update(text).digest("hex"), public_key: newPub, sig: crypto.sign(null, Buffer.from(text), newKp.privateKey).toString("base64url") }; })();
assert.equal((await A.verifySignedLog([s1, s2new], { publicKey: newPub, retiredKeys: retiredFake })).ok, true, "old epoch + new key row (with additive git_sha)");
assert.equal((await A.verifySignedLog([s1, s2], { publicKey: newPub, retiredKeys: retiredFake })).code, "ANCHOR-KEY-MISMATCH", "retired key past through_n refused");

// 3. No witness view -> no anchor field (old shape); ChainLock level chain_consistent.
A.resetAnchorMemo();
const store = new MemoryStore();
const r1 = await append(store, { c: "acts", s: "a", f: "first" });
assert.equal(r1.stamp.anchor, undefined, "no anchor field without a verified witness");
await append(store, { c: "acts", s: "b", f: "second" });
let v = await verify(store, { c: "acts" });
assert.equal(v.ok, true);
assert.equal(v.chains[0].integrity.level, "chain_consistent");

// 4. Verified witness anchoring acts at seq 2 -> externally_anchored; anchor ref recorded on new rows.
const rows = await store.loadRecords("acts");
const w1 = signRow({ spec: A.ANCHOR_SPEC, n: 1, prev_statement_hash: "0".repeat(64), observed_at: "t", heads: { chains: [{ c: "acts", seq: 2, h: rows[1].stamp_sha256 }], stores: {} } });
const ok = await A.verifySignedLog([w1], { publicKey: pub });
A.seedAnchorMemo("anchors", { ...ok, entries: [w1] });
v = await verify(store, { c: "acts" });
assert.equal(v.chains[0].integrity.level, "externally_anchored");
assert.equal(v.chains[0].integrity.anchored_through, 2);
const r3 = await append(store, { c: "acts", s: "c", f: "third" });
assert.deepEqual(r3.stamp.anchor, { spec: A.ANCHOR_SPEC, log: A.WITNESS_REPO, n: 1, statement_hash: w1.statement_hash });
assert.equal(await stampSha256(r3.stamp), r3.stamp.stamp_sha256, "anchor is inside the stamp hash");
v = await verify(store, { c: "acts" });
assert.equal(v.ok, true);
assert.equal(v.chains[0].integrity.unanchored_tail, 1);
const led = await composeLedgerEntry({ asked: true, refused: false, code: "FG-OK", anchor: A.anchorRefNow(), at: "t" }, { seq: 1, prev: "0".repeat(64) });
assert.equal(led.anchor.n, 1);
assert.equal((await verifyLedger({ entries: [led] })).ok, true);

// 5. Moved anchored head fails closed.
const w2 = signRow({ spec: A.ANCHOR_SPEC, n: 1, prev_statement_hash: "0".repeat(64), observed_at: "t", heads: { chains: [{ c: "acts", seq: 2, h: "f".repeat(64) }], stores: {} } });
A.seedAnchorMemo("anchors", { ok: true, n: 1, latest: w2, entries: [w2] });
v = await verify(store, { c: "acts" });
assert.equal(v.ok, false);
assert.ok(v.breaks.some((b) => b.code === "ANCHOR-MISMATCH"));

// 6. DO path: heads + row integrity through the ChainWriter (meta/row actions).
A.seedAnchorMemo("anchors", { ...ok, entries: [w1] });
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
const ds = storeFor(env);
await append(ds, { c: "acts", s: "a", f: "first" });
await append(ds, { c: "acts", s: "b", f: "second" });
const heads = await A.collectHeads(env, { storeFor, version: "2.0.0-rc1" });
assert.equal(heads.spec, A.HEADS_SPEC);
const actsHead = heads.chains.find((h) => h.c === "acts");
assert.equal(actsHead.seq, 2);
const dsRows = (await ds.chainRow("acts", 2)).row;
const w3 = signRow({ spec: A.ANCHOR_SPEC, n: 1, prev_statement_hash: "0".repeat(64), observed_at: "t", heads: { chains: [actsHead], stores: {} } });
A.seedAnchorMemo("anchors", { ok: true, n: 1, latest: w3, entries: [w3] });
const chk = await A.checkStatementAgainstRuntime(env, w3.statement, { storeFor });
assert.equal(chk.ok, true);
const ri = await A.rowIntegrity(env, "acts", 1, { storeFor, fetchImpl: async () => { throw new Error("offline"); } });
assert.equal(ri.integrity.level, "externally_anchored", JSON.stringify(ri));
assert.equal(dsRows.stamp_sha256, actsHead.h);
const miss = await A.checkStatementAgainstRuntime(env, w2.statement, { storeFor });
assert.equal(miss.ok, false);
A.resetAnchorMemo();
console.log("verify-anchor: ok (additive compat, fail-closed witness log, integrity levels, DO heads/rows)");
