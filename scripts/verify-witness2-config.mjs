/**
 * AZRT-WITNESS-QUORUM-1.0 slot 2 config (2026-10-22): wrangler.toml [vars] point slot 2 at the real
 * Codeberg log (azielelroieliab/aziel-witness2) with its pinned key. Checks that the config is accepted,
 * that a committed snapshot of the real log verifies under that key through the runtime's own reader,
 * that tampering / wrong key / gaps are refused, and that missing or partial config fails closed
 * (not_configured / bad_config, never verified). Config is not live: nothing here claims production status.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifySignedLog, WITNESS_PUBLIC_KEY } from "../src/anchor.js";
import { witness2Config, witnessQuorum, resetWitness2Memo, WITNESS2_CODES } from "../src/witness-quorum.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";

const W2_URL = "https://codeberg.org/azielelroieliab/aziel-witness2/raw/branch/main/anchors/log.jsonl";
const W2_KEY = "p0zeCq4N62q70Utncoavj0UOWrTX_0mX8hwT0y0RK0o";
let n = 0;

// 1) wrangler.toml [vars] carry exactly the public slot-2 config; no quorum policy, no private material.
const wr = fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const varsBlock = wr.slice(wr.indexOf("\n[vars]"), wr.indexOf("\n[", wr.indexOf("\n[vars]") + 2));
const v = (k) => { const m = varsBlock.match(new RegExp("^" + k + '\\s*=\\s*"([^"]*)"', "m")); return m ? m[1] : undefined; };
assert.equal(v("WITNESS2_LOG_URL"), W2_URL);
assert.equal(v("WITNESS2_PUBLIC_KEY"), W2_KEY);
assert.equal(v("WITNESS2_NAME"), "codeberg");
assert.equal(v("WITNESS_QUORUM"), undefined, "quorum policy is not raised by config");
assert.doesNotMatch(wr, /PKCS8|PRIVATE/i, "no private key material in wrangler.toml");
n++;

// 2) the config passes the runtime's own checks (canonical key, public host, independent of slot 1, not Cloudflare).
const cfg = witness2Config({ WITNESS2_LOG_URL: v("WITNESS2_LOG_URL"), WITNESS2_PUBLIC_KEY: v("WITNESS2_PUBLIC_KEY"), WITNESS2_NAME: v("WITNESS2_NAME") });
assert.equal(cfg.configured, true, JSON.stringify(cfg));
assert.equal(cfg.name, "codeberg");
assert.notEqual(W2_KEY, WITNESS_PUBLIC_KEY, "slot 2 key differs from slot 1");
n++;

// 3) the pinned key file in the kit snapshot matches; the real log snapshot verifies under it.
const rows = fs.readFileSync(new URL("../fixtures/witness2/log-2026-10-22.jsonl", import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l));
assert.equal(rows[0].statement.n, 1);
assert.equal(rows[0].statement.prev_statement_hash, "0".repeat(64));
for (const r of rows) { assert.equal(r.public_key, W2_KEY); assert.equal(r.statement.witness.slot, 2); assert.equal(r.statement.witness.repo, "azielelroieliab/aziel-witness2"); }
const ok = await verifySignedLog(rows, { publicKey: W2_KEY });
assert.equal(ok.ok, true, JSON.stringify(ok).slice(0, 300)); assert.equal(ok.n, rows.length);
n++;

// 4) fail closed: wrong key, tampered row, missing row.
const other = "A".repeat(42) + "A";
assert.equal((await verifySignedLog(rows, { publicKey: WITNESS_PUBLIC_KEY })).ok, false, "slot-1 key must not verify slot 2");
assert.equal((await verifySignedLog(rows, { publicKey: other })).ok, false);
const tampered = structuredClone(rows); tampered[3].statement.heads.chains[0].seq += 1;
assert.equal((await verifySignedLog(tampered, { publicKey: W2_KEY })).ok, false);
const gap = rows.filter((_, i) => i !== 4);
assert.equal((await verifySignedLog(gap, { publicKey: W2_KEY })).ok, false);
n++;

// 5) missing / partial vars: not configured or bad config, never verified, never dual.
assert.equal(witness2Config({}).code, WITNESS2_CODES.notConfigured);
assert.equal(witness2Config({ WITNESS2_LOG_URL: W2_URL }).code, WITNESS2_CODES.badConfig);
assert.equal(witness2Config({ WITNESS2_PUBLIC_KEY: W2_KEY }).code, WITNESS2_CODES.badConfig);
assert.equal(witness2Config({ WITNESS2_LOG_URL: W2_URL.replace("https:", "http:"), WITNESS2_PUBLIC_KEY: W2_KEY }).code, WITNESS2_CODES.badConfig);
n++;

// 6) end to end with the real snapshot but heads unknown to this (empty) runtime store, or the log
//    unreachable: slot 2 is never "verified" and the level is never "dual" (no fail-open).
const clEnv = { CHAINLOCK: memoryChainWriterNamespace({}) };
const k1 = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const p1 = Buffer.from(await crypto.subtle.exportKey("raw", k1.publicKey)).toString("base64url");
const st1 = { n: 1, prev_statement_hash: "0".repeat(64), heads: { chains: [] } };
const t1 = canonicalize(st1);
const row1 = { statement: st1, statement_hash: await sha256Hex(t1), public_key: p1, sig: Buffer.from(await crypto.subtle.sign({ name: "Ed25519" }, k1.privateKey, new TextEncoder().encode(t1))).toString("base64url") };
const primary = { ok: true, n: 1, latest: row1, entries: [row1] };
const text = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
const env = { ...clEnv, WITNESS2_LOG_URL: W2_URL, WITNESS2_PUBLIC_KEY: W2_KEY, WITNESS2_NAME: "codeberg" };
for (const fetchImpl of [
  async (u) => (u === W2_URL ? new Response(text, { status: 200 }) : new Response("nf", { status: 404 })),
  async () => { throw new Error("offline"); },
  async () => new Response("nf", { status: 404 }),
]) {
  resetWitness2Memo();
  const r = await witnessQuorum(env, { primary, primaryCheck: { ok: true }, fetchImpl, deps: { storeFor } });
  assert.notEqual(r.witnesses[1].status, "verified", JSON.stringify(r.witnesses[1]));
  assert.notEqual(r.quorum.level, "dual");
  resetWitness2Memo();
  const r2 = await witnessQuorum(env, { primary, primaryCheck: { ok: true }, fetchImpl, deps: { storeFor }, requireQuorum: "2" });
  assert.equal(r2.ok, false); assert.equal(r2.code !== undefined, true);
}
resetWitness2Memo();
const none = await witnessQuorum({ ...clEnv }, { primary, primaryCheck: { ok: true }, fetchImpl: async () => { throw new Error("must not fetch"); }, deps: { storeFor } });
assert.equal(none.witnesses[1].code, WITNESS2_CODES.notConfigured);
assert.equal(none.quorum.level, "single");
n++;

console.log("verify-witness2-config: " + n + " groups ok");
