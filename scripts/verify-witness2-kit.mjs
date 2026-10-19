/**
 * AZRT-WITNESS-QUORUM-1.0 slot-2 kit (witness2/kit, Codeberg Forgejo Actions): the kit's statements verify
 * as slot 2 in the runtime (same format as slot 1), reach quorum level "dual", the Codeberg log URL is
 * accepted, and Cloudflare-hosted slot-2 logs are refused as not independent. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { append } from "../src/chainlock/ops.js";
import { verifySignedLog } from "../src/anchor.js";
import { witness2Config, witnessQuorum, resetWitness2Memo, cloudflareHosted, WITNESS2_CODES } from "../src/witness-quorum.js";
import { anchorOnce } from "../witness2/kit/scripts/witness2.mjs";
import * as lib from "../witness2/kit/scripts/lib.mjs";

let n = 0;
// 1) the kit's canonicalize is byte-identical to the runtime's.
for (const v of [{ b: 1, a: [true, null, "x"], c: { z: 2, y: "é" } }, [], "s", 0, { u: undefined, k: 1 }]) assert.equal(lib.canonicalize(v), canonicalize(v));
n++;

// 2) kit statements: same AZRT-ANCHOR-1.0 shape, chained, signed; unchanged heads are skipped.
const clEnv = { CHAINLOCK: memoryChainWriterNamespace({}) };
for (let i = 0; i < 3; i++) await append(clEnv, { c: "session", s: "t", f: "row " + i, k: "note" });
let meta = await storeFor(clEnv).chainMeta("session");
let heads = { chains: [{ c: "session", seq: meta.seq, h: meta.tip }], stores: {}, version: "2.0.0-rc1", git_sha: "abc" };
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const pub = publicKey.export({ format: "jwk" }).x;
const log = [];
let a = await anchorOnce({ heads, key: privateKey, pub, log });
assert.equal(a.anchored, true); log.push(a.row);
assert.equal(a.row.statement.spec, "AZRT-ANCHOR-1.0"); assert.equal(a.row.statement.n, 1); assert.equal(a.row.statement.witness.slot, 2);
assert.equal((await anchorOnce({ heads, key: privateKey, pub, log })).anchored, false);
await append(clEnv, { c: "session", s: "t", f: "row 3", k: "note" });
meta = await storeFor(clEnv).chainMeta("session");
heads = { ...heads, chains: [{ c: "session", seq: meta.seq, h: meta.tip }] };
a = await anchorOnce({ heads, key: privateKey, pub, log });
log.push(a.row);
assert.equal(a.row.statement.prev_statement_hash, log[0].statement_hash);
const v = await verifySignedLog(log, { publicKey: pub });
assert.equal(v.ok, true); assert.equal(v.n, 2); n++;

// 3) config: the Codeberg log is accepted; Cloudflare-hosted logs are not independent; slot 1 repo still refused.
const W2 = "https://codeberg.org/AzielEliab/aziel-witness2/raw/branch/main/anchors/log.jsonl";
const cfg = witness2Config({ WITNESS2_LOG_URL: W2, WITNESS2_PUBLIC_KEY: pub, WITNESS2_NAME: "codeberg" });
assert.equal(cfg.configured, true); assert.equal(cfg.name, "codeberg");
for (const u of ["https://w2.aziel.workers.dev/log.jsonl", "https://x.pages.dev/log.jsonl", "https://pub-1.r2.dev/log.jsonl", "https://b.r2.cloudflarestorage.com/log.jsonl"]) {
  assert.equal(witness2Config({ WITNESS2_LOG_URL: u, WITNESS2_PUBLIC_KEY: pub }).code, WITNESS2_CODES.notIndependent, u);
}
assert.equal(cloudflareHosted("codeberg.org"), false); assert.equal(cloudflareHosted("workers.dev."), true);
assert.equal(witness2Config({ WITNESS2_LOG_URL: "https://raw.githubusercontent.com/AzielEliab/aziel-anchors/main/anchors/w2.jsonl", WITNESS2_PUBLIC_KEY: pub }).code, WITNESS2_CODES.notIndependent);
assert.equal(witness2Config({}).code, WITNESS2_CODES.notConfigured); n++;

// 4) end to end in the runtime: slot 1 + the kit's slot-2 log -> quorum "dual", slot 2 "verified".
const k1 = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const p1 = Buffer.from(await crypto.subtle.exportKey("raw", k1.publicKey)).toString("base64url");
const st1 = { n: 1, prev_statement_hash: "0".repeat(64), heads: { chains: heads.chains } };
const t1 = canonicalize(st1);
const row1 = { statement: st1, statement_hash: await sha256Hex(t1), public_key: p1, sig: Buffer.from(await crypto.subtle.sign({ name: "Ed25519" }, k1.privateKey, new TextEncoder().encode(t1))).toString("base64url") };
const primary = { ok: true, n: 1, latest: row1, entries: [row1] };
const text = log.map((r) => JSON.stringify(r)).join("\n") + "\n";
const fetchImpl = async (url) => (url === W2 ? new Response(text, { status: 200 }) : new Response("nf", { status: 404 }));
resetWitness2Memo();
const env = { ...clEnv, WITNESS2_LOG_URL: W2, WITNESS2_PUBLIC_KEY: pub, WITNESS2_NAME: "codeberg" };
const r = await witnessQuorum(env, { primary, primaryCheck: { ok: true }, fetchImpl, deps: { storeFor } });
assert.equal(r.witnesses[1].status, "verified", JSON.stringify(r.witnesses[1]));
assert.equal(r.quorum.level, "dual"); assert.equal(r.ok, true);
resetWitness2Memo();
const r2 = await witnessQuorum(env, { primary, primaryCheck: { ok: true }, fetchImpl, deps: { storeFor }, requireQuorum: "2" });
assert.equal(r2.ok, true); assert.equal(r2.quorum.required, 2); assert.equal(r2.quorum.have, 2); n++;

// 5) kit workflow: Codeberg runner + Forgejo actions only (no GitHub-hosted actions), secret by name only.
const wf = fs.readFileSync(new URL("../witness2/kit/.forgejo/workflows/witness2.yml", import.meta.url), "utf8");
assert.match(wf, /runs-on: codeberg-/); assert.match(wf, /secrets\.WITNESS2_ED25519_PKCS8/);
assert.ok(!/uses: actions\//.test(wf), "no GitHub-hosted action refs");
const setup = fs.readFileSync(new URL("../witness2/setup-witness2.mjs", import.meta.url), "utf8");
assert.ok(!/console\.log\([^)]*token/i.test(setup), "setup never prints the token");
assert.ok(!/writeFileSync\([^)]*(der|privateKey)/.test(setup), "private key never written to disk"); n++;

console.log(`ok witness2 kit: ${n} checks`);
