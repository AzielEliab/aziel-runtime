/**
 * RIB-047 / AZRT-WITNESS-QUORUM-1.0: second independent witness slot + quorum.
 * Slot 1 required; slot 2 refuses when unconfigured (no mock); per-witness status + quorum level;
 * require-quorum fails closed; explicit WITNESS2-* codes for missing / mismatched second witness.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { append } from "../src/chainlock/ops.js";
import { WITNESS_LOG_URL, WITNESS_PUBLIC_KEY, WITNESS_RETIRED_KEYS } from "../src/anchor.js";
import { witness2Config, witnessQuorum, resetWitness2Memo, crossCheckWitnesses, coverageOf, WITNESS2_CODES, WITNESS2_MAX_BYTES } from "../src/witness-quorum.js";

let n = 0;
const b64u = (buf) => Buffer.from(buf).toString("base64url");
async function keypair() {
  const k = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  return { k, pub: b64u(await crypto.subtle.exportKey("raw", k.publicKey)) };
}
async function signedLog(kp, statements) {
  let prev = "0".repeat(64);
  const rows = [];
  for (let i = 0; i < statements.length; i++) {
    const st = { n: i + 1, prev_statement_hash: prev, ...statements[i] };
    const text = canonicalize(st);
    const statement_hash = await sha256Hex(text);
    const sig = b64u(await crypto.subtle.sign({ name: "Ed25519" }, kp.k.privateKey, new TextEncoder().encode(text)));
    rows.push({ statement: st, statement_hash, public_key: kp.pub, sig });
    prev = statement_hash;
  }
  return { rows, text: rows.map((r) => JSON.stringify(r)).join("\n") + "\n" };
}
const W2_URL = "https://witness2.example.org/log.jsonl";
const fetchFrom = (map) => async (url) => (url in map ? (map[url] === 503 ? new Response("down", { status: 503 }) : new Response(map[url], { status: 200 })) : new Response("nf", { status: 404 }));

// Runtime with real ChainLock rows on "session".
const clEnv = { CHAINLOCK: memoryChainWriterNamespace({}) };
for (let i = 0; i < 3; i++) await append(clEnv, { c: "session", s: "t", f: "row " + i, k: "note" });
const meta = await storeFor(clEnv).chainMeta("session");
const heads = { chains: [{ c: "session", seq: meta.seq, h: meta.tip }] };
const deps = { storeFor };
const w1 = await keypair();
const w2 = await keypair();
const log1 = await signedLog(w1, [{ heads }]);
const primary = { ok: true, n: 1, latest: log1.rows[0], entries: log1.rows };
const primaryCheck = { ok: true };
const env2 = (extra = {}) => ({ ...clEnv, WITNESS2_LOG_URL: W2_URL, WITNESS2_PUBLIC_KEY: w2.pub, ...extra });
const q = (env, fetchImpl, more = {}) => { resetWitness2Memo(); return witnessQuorum(env, { primary, primaryCheck, fetchImpl, deps, ...more }); };

// 1) Unconfigured: slot 2 not_configured (no mock, no fetch); quorum 1 ok "single"; require 2 fails closed.
let fetched = 0;
const spy = async () => { fetched++; return new Response("", { status: 500 }); };
let r = await q(clEnv, spy);
assert.equal(fetched, 0);
assert.equal(r.witnesses[1].status, "not_configured");
assert.equal(r.witnesses[1].code, WITNESS2_CODES.notConfigured);
assert.equal(r.ok, true);
assert.equal(r.quorum.level, "single");
assert.equal(r.quorum.have, 1);
r = await q(clEnv, spy, { requireQuorum: 2 });
assert.equal(r.ok, false);
assert.equal(r.code, WITNESS2_CODES.quorumNotMet);
r = await q({ ...clEnv, WITNESS_QUORUM: "2" }, spy);
assert.equal(r.code, WITNESS2_CODES.quorumNotMet); n++;

// 2) Config validation: half config, http, bad key, reuse of first witness key/log -> refused, never read.
assert.equal(witness2Config({ WITNESS2_LOG_URL: W2_URL }).code, WITNESS2_CODES.badConfig);
assert.equal(witness2Config({ WITNESS2_LOG_URL: "http://x.example/log", WITNESS2_PUBLIC_KEY: w2.pub }).code, WITNESS2_CODES.badConfig);
assert.equal(witness2Config({ WITNESS2_LOG_URL: W2_URL, WITNESS2_PUBLIC_KEY: "short" }).code, WITNESS2_CODES.badConfig);
assert.equal(witness2Config({ WITNESS2_LOG_URL: W2_URL, WITNESS2_PUBLIC_KEY: WITNESS_PUBLIC_KEY }).code, WITNESS2_CODES.notIndependent);
assert.equal(witness2Config({ WITNESS2_LOG_URL: WITNESS_LOG_URL, WITNESS2_PUBLIC_KEY: w2.pub }).code, WITNESS2_CODES.notIndependent);
assert.equal(witness2Config({ WITNESS2_LOG_URL: "https://raw.githubusercontent.com/AzielEliab/aziel-anchors/other/x.jsonl", WITNESS2_PUBLIC_KEY: w2.pub }).code, WITNESS2_CODES.notIndependent);
assert.equal(witness2Config(env2()).configured, true); n++;

// 3) Second witness agrees: dual quorum; require 2 passes.
const log2 = await signedLog(w2, [{ heads }]);
r = await q(env2(), fetchFrom({ [W2_URL]: log2.text }), { requireQuorum: 2 });
assert.equal(r.ok, true, JSON.stringify(r));
assert.equal(r.quorum.level, "dual");
assert.equal(r.quorum.have, 2);
assert.equal(r.witnesses[1].code, WITNESS2_CODES.ok);
assert.equal(r.witnesses[1].cross_check.shared_heads, 1); n++;

// 4) Second witness missing (404) / down (503): explicit codes; quorum 1 still ok single; require 2 fails.
r = await q(env2(), fetchFrom({}));
assert.equal(r.witnesses[1].code, WITNESS2_CODES.missing);
assert.equal(r.ok, true); assert.equal(r.quorum.level, "single");
r = await q(env2(), fetchFrom({ [W2_URL]: 503 }), { requireQuorum: 2 });
assert.equal(r.witnesses[1].code, WITNESS2_CODES.unreachable);
assert.equal(r.ok, false); assert.equal(r.code, WITNESS2_CODES.quorumNotMet); n++;

// 5) Second witness signed by another key / broken order -> WITNESS2-LOG-INVALID.
const rogue = await keypair();
r = await q(env2(), fetchFrom({ [W2_URL]: (await signedLog(rogue, [{ heads }])).text }));
assert.equal(r.witnesses[1].code, WITNESS2_CODES.invalid);
const tampered = log2.rows.map((x) => ({ ...x, statement: { ...x.statement, heads: { chains: [{ c: "session", seq: meta.seq, h: "f".repeat(64) }] } } }));
r = await q(env2(), fetchFrom({ [W2_URL]: tampered.map((x) => JSON.stringify(x)).join("\n") }), { requireQuorum: 2 });
assert.equal(r.witnesses[1].code, WITNESS2_CODES.invalid);
assert.equal(r.ok, false); n++;

// 6) Second witness validly signed but its head does not match the runtime -> WITNESS2-MISMATCH; fails even at quorum 1.
const bad2 = await signedLog(w2, [{ heads: { chains: [{ c: "session", seq: meta.seq, h: "e".repeat(64) }] } }]);
r = await q(env2(), fetchFrom({ [W2_URL]: bad2.text }));
assert.equal(r.witnesses[1].code, WITNESS2_CODES.mismatch);
assert.equal(r.ok, false);
assert.equal(r.code, WITNESS2_CODES.mismatch); n++;

// 7) Witnesses disagree with each other on a shared (chain, seq) -> WITNESS2-MISMATCH via cross-check.
const cc = crossCheckWitnesses([{ statement: { heads: { chains: [{ c: "session", seq: 1, h: "a".repeat(64) }] } } }], [{ statement: { heads: { chains: [{ c: "session", seq: 1, h: "b".repeat(64) }] } } }]);
assert.equal(cc.ok, false); assert.equal(cc.conflicts.length, 1);
const older2 = await signedLog(w2, [{ heads: { chains: [{ c: "session", seq: 1, h: "b".repeat(64) }] } }, { heads }]);
const p1 = await signedLog(w1, [{ heads: { chains: [{ c: "session", seq: 1, h: "a".repeat(64) }] } }, { heads }]);
resetWitness2Memo();
r = await witnessQuorum(env2(), { primary: { ok: true, n: 2, latest: p1.rows[1], entries: p1.rows }, primaryCheck, fetchImpl: fetchFrom({ [W2_URL]: older2.text }), deps });
assert.equal(r.witnesses[1].status, "mismatch");
assert.equal(r.witnesses[1].cross_check.conflicts[0].seq, 1);
assert.equal(r.ok, false); n++;

// 8) First witness stays required: slot 1 down + slot 2 verified -> not ok, level none.
resetWitness2Memo();
r = await witnessQuorum(env2(), { primary: { ok: false, code: "ANCHOR-UNREACHABLE" }, primaryCheck: null, fetchImpl: fetchFrom({ [W2_URL]: log2.text }), deps });
assert.notEqual(r.witnesses[1].status, "mismatch");
assert.equal(r.ok, false); assert.equal(r.quorum.level, "none"); assert.equal(r.code, "ANCHOR-UNREACHABLE"); n++;

// 9) Unknown quorum policy fails closed.
r = await q({ ...clEnv, WITNESS_QUORUM: "three" }, spy);
assert.equal(r.ok, false); assert.equal(r.code, WITNESS2_CODES.quorumBadPolicy); n++;

// 10) Route wired; docs honest; wrangler config sets slot 2 read config only (no quorum policy, no mock).
const idx = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
assert.match(idx, /witness_quorum/);
const wr = fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
assert.doesNotMatch(wr, /^\s*WITNESS_QUORUM\s*=/m, "wrangler.toml must not raise the quorum policy");
assert.doesNotMatch(wr, /WITNESS2_ED25519|PKCS8\s*=/, "no slot-2 private material in wrangler.toml");
const doc = fs.readFileSync(new URL("../docs/WITNESS-QUORUM.md", import.meta.url), "utf8");
assert.match(doc, /configured is not live/i);
assert.match(doc, /no mock/i); n++;

// ---- AZBot BLOCKER regressions (#292 @ 62da2cc3) ----
// B1) slot 2 with no chains in common with slot 1 -> partial, level single, NOT-MET at quorum 2.
{
  const other = await signedLog(w2, [{ heads: { chains: [] } }]);
  let x = await q(env2(), fetchFrom({ [W2_URL]: other.text }), { requireQuorum: 2 });
  assert.equal(x.witnesses[1].status, "partial", JSON.stringify(x.witnesses[1]));
  assert.equal(x.witnesses[1].code, WITNESS2_CODES.partial);
  assert.equal(x.quorum.level, "single");
  assert.equal(x.ok, false); assert.equal(x.code, WITNESS2_CODES.quorumNotMet);
  // B1') slot 2 covers an older seq of the same chain (no conflict) -> partial too.
  for (let i = 0; i < 1; i++) await append(clEnv, { c: "session", s: "t", f: "newer row", k: "note" });
  const m2 = await storeFor(clEnv).chainMeta("session");
  const newer = await signedLog(w1, [{ heads }, { heads: { chains: [{ c: "session", seq: m2.seq, h: m2.tip }] } }]);
  resetWitness2Memo();
  x = await witnessQuorum(env2(), { primary: { ok: true, n: 2, latest: newer.rows[1], entries: newer.rows }, primaryCheck, fetchImpl: fetchFrom({ [W2_URL]: log2.text }), deps, requireQuorum: 2 });
  assert.equal(x.witnesses[1].status, "partial");
  assert.equal(x.witnesses[1].coverage.missing[0].c, "session");
  assert.equal(x.code, WITNESS2_CODES.quorumNotMet);
  // quorum 1 still ok (slot 1 alone), level single.
  resetWitness2Memo();
  x = await witnessQuorum(env2(), { primary: { ok: true, n: 2, latest: newer.rows[1], entries: newer.rows }, primaryCheck, fetchImpl: fetchFrom({ [W2_URL]: log2.text }), deps });
  assert.equal(x.ok, true); assert.equal(x.quorum.level, "single");
}
n++;
// B2) same key written differently (spare trailing bits), and retired slot-1 keys -> NOT-INDEPENDENT / BAD-CONFIG.
{
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const last = WITNESS_PUBLIC_KEY.at(-1);
  const idx = alphabet.indexOf(last);
  const variants = [1, 2, 3].map((d) => WITNESS_PUBLIC_KEY.slice(0, -1) + alphabet[(idx & ~3) | ((idx + d) & 3)]);
  assert.ok(variants.every((v) => v !== WITNESS_PUBLIC_KEY));
  for (const v of variants) {
    assert.deepEqual(Buffer.from(v, "base64url"), Buffer.from(WITNESS_PUBLIC_KEY, "base64url"));
    assert.notEqual(witness2Config({ WITNESS2_LOG_URL: W2_URL, WITNESS2_PUBLIC_KEY: v }).configured, true);
  }
  for (const rk of WITNESS_RETIRED_KEYS) assert.equal(witness2Config({ WITNESS2_LOG_URL: W2_URL, WITNESS2_PUBLIC_KEY: rk.public_key }).code, WITNESS2_CODES.notIndependent);
}
n++;
// S1) redirect:'manual' is passed (Workers reject 'error'); a 3xx / opaqueredirect is refused.
{
  let seenRedirect = null;
  const f = async (url, init) => { seenRedirect = init && init.redirect; return new Response("", { status: 302, headers: { location: "https://elsewhere.example/" } }); };
  let x = await q(env2(), f);
  assert.equal(seenRedirect, "manual");
  assert.equal(x.witnesses[1].code, WITNESS2_CODES.unreachable);
  // Mimic Workers: any value other than follow/manual throws; our code must not pass 'error'.
  const workersLike = async (url, init) => {
    const r = init && init.redirect;
    if (r != null && r !== "follow" && r !== "manual") throw new TypeError("Invalid redirect value");
    return new Response("", { status: 302, headers: { location: "https://elsewhere.example/" } });
  };
  resetWitness2Memo();
  x = await q(env2(), workersLike);
  assert.equal(x.witnesses[1].code, WITNESS2_CODES.unreachable);
  // opaqueredirect / status 0 also refused.
  resetWitness2Memo();
  x = await q(env2(), async () => { const r = new Response(null, { status: 0 }); Object.defineProperty(r, "type", { value: "opaqueredirect" }); return r; });
  assert.equal(x.witnesses[1].code, WITNESS2_CODES.unreachable);
}
n++;
// S2) streaming cap: a >2 MB body (no content-length) stops early -> WITNESS2-TOO-LARGE.
{
  let pulled = 0;
  const chunk = new Uint8Array(256 * 1024);
  const body = new ReadableStream({ pull(c) { pulled++; c.enqueue(chunk); } }); // endless
  const x = await q(env2(), async () => new Response(body, { status: 200 }));
  assert.equal(x.witnesses[1].code, WITNESS2_CODES.tooLarge);
  assert.ok(pulled * chunk.length <= WITNESS2_MAX_BYTES + 3 * chunk.length, String(pulled));
  const y = await q(env2(), async () => new Response("x", { status: 200, headers: { "content-length": String(WITNESS2_MAX_BYTES + 1) } }));
  assert.equal(y.witnesses[1].code, WITNESS2_CODES.tooLarge);
}
n++;
// S3) location: case, percent-encoding, github.com/raw, jsDelivr all map to aziel-anchors -> NOT-INDEPENDENT.
for (const u of [
  "https://raw.githubusercontent.com/azieleliab/AZIEL-ANCHORS/main/anchors/log.jsonl",
  "https://raw.githubusercontent.com/%41zielEliab/aziel%2Danchors/main/anchors/log.jsonl",
  "https://github.com/AzielEliab/aziel-anchors/raw/main/anchors/log.jsonl",
  "https://cdn.jsdelivr.net/gh/AzielEliab/aziel-anchors@main/anchors/log.jsonl",
  "https://cdn.jsdelivr.net/gh/azieleliab/aziel-anchors/anchors/log.jsonl",
  "https://azieleliab.github.io/aziel-anchors/anchors/log.jsonl",
  "https://raw.githack.com/AzielEliab/aziel-anchors/main/anchors/log.jsonl",
  "https://cdn.statically.io/gh/AzielEliab/aziel-anchors/main/anchors/log.jsonl",
  "https://api.github.com/repos/AzielEliab/aziel-anchors/contents/anchors/log.jsonl",
  "https://codeload.github.com/AzielEliab/aziel-anchors/tar.gz/main",
  "https://purge.jsdelivr.net/gh/AzielEliab/aziel-anchors@main/anchors/log.jsonl",
]) assert.equal(witness2Config({ WITNESS2_LOG_URL: u, WITNESS2_PUBLIC_KEY: w2.pub }).code, WITNESS2_CODES.notIndependent, u);
assert.equal(witness2Config({ WITNESS2_LOG_URL: "https://cdn.jsdelivr.net/gh/someone-else/witness@main/log.jsonl", WITNESS2_PUBLIC_KEY: w2.pub }).configured, true);
n++;
// S4) IP literals and localhost are refused.
for (const u of ["https://127.0.0.1/log", "https://10.0.0.5/log", "https://[::1]/log", "https://localhost/log", "https://a.localhost/log", "https://2130706433/log", "https://0x7f000001/log", "https://user:pw@witness2.example.org/log"]) {
  assert.equal(witness2Config({ WITNESS2_LOG_URL: u, WITNESS2_PUBLIC_KEY: w2.pub }).code, WITNESS2_CODES.badConfig, u);
}
n++;


// N1) coverageOf counts seq 0 (Number.isInteger, not truthiness).
{
  const a = { statement: { heads: { chains: [{ c: "session", seq: 0, h: "a".repeat(64) }] } } };
  const b = { statement: { heads: { chains: [{ c: "session", seq: 0, h: "a".repeat(64) }] } } };
  assert.equal(coverageOf(a, b).ok, true);
  assert.equal(coverageOf(a, b).required, 1);
  assert.equal(coverageOf(a, { statement: { heads: { chains: [] } } }).ok, false);
  assert.equal(coverageOf(a, { statement: { heads: { chains: [] } } }).missing[0].seq, 0);
}
n++;
console.log(`ok witness quorum (RIB-047): ${n} checks`);

