/**
 * AZRT-KEYS-1.0: the held receipt key is published additively (/.well-known/azrt-keys.json, /v1/keys,
 * heads.receipt_key for the witness), retired receipt keys verify only inside their epoch, and the
 * provisioning script pipes the key straight to wrangler in the format the code reads. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { webcrypto } from "node:crypto";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";

globalThis.fetch = async () => { throw new Error("verify-receipt-key-epochs: offline"); };
const handler = (await import("../src/index.js")).default.fetch;
const rs = await import("../src/receipt-signing.js");
const an = await import("../src/anchor.js");
const prov = await import("./provision-receipt-key.mjs");
const b64u = (b) => Buffer.from(b).toString("base64url");
async function pair() {
  const kp = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  return { priv: b64u(await webcrypto.subtle.exportKey("pkcs8", kp.privateKey)), pub: b64u(await webcrypto.subtle.exportKey("raw", kp.publicKey)) };
}
const ctx = { waitUntil() {} };
const base = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}) };
const get = async (p, env) => handler(new Request("https://aziel-runtime.example" + p), env, ctx);
let n = 0;

// 1) no key: the manifest says signing:false with the reason; witness keys + epochs are listed; heads.receipt_key null.
let m = await (await get("/.well-known/azrt-keys.json", base)).json();
assert.equal(m.spec, "AZRT-KEYS-1.0"); assert.equal(m.receipt.signing, false); assert.equal(m.receipt.current, null); assert.match(m.receipt.reason, /no receipt signing key/);
assert.equal(m.witness.current, an.WITNESS_PUBLIC_KEY); assert.deepEqual(m.witness.retired, JSON.parse(JSON.stringify(an.WITNESS_RETIRED_KEYS)));
assert.equal(m.witness.auditor.current, an.AUDITOR_PUBLIC_KEY); assert.equal(m.witness2.configured, false);
assert.deepEqual(await (await get("/v1/keys", base)).json(), m);
let h = await (await get("/v1/anchor/heads", base)).json();
assert.equal(h.receipt_key, null); assert.ok(Array.isArray(h.chains)); n++;

// 2) a held key: same key_id on /v1/receipt-key, the manifest and heads.receipt_key; the private key appears nowhere.
const A = await pair();
const envA = { ...base, RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: A.pub };
const rk = await (await get("/v1/receipt-key", envA)).json();
assert.equal(rk.signing, true);
const mres = await get("/.well-known/azrt-keys.json", envA);
const mtext = await mres.text();
m = JSON.parse(mtext);
assert.equal(m.receipt.signing, true); assert.equal(m.receipt.current.key_id, rk.key_id); assert.equal(m.receipt.current.public_key, A.pub);
assert.equal(m.receipt.key_source, "published (self, unpinned)");
h = await (await get("/v1/anchor/heads", envA)).json();
assert.equal(h.receipt_key.key_id, rk.key_id); assert.equal(h.receipt_key.public_key, A.pub);
for (const t of [mtext, JSON.stringify(h), JSON.stringify(rk)]) { assert.ok(!t.includes(A.priv), "private key leaked"); assert.ok(!/RECEIPT_SIGNING/.test(t)); }
assert.equal(mres.headers.get("access-control-allow-origin"), "*");
const spec = await (await get("/openapi.json", base)).json();
assert.ok(spec.paths["/.well-known/azrt-keys.json"] && spec.paths["/v1/keys"]); n++;

// 3) retired epochs: a retired key verifies only receipts whose ts is inside its epoch.
const B = await pair();
const sB = await rs.heldSignerFromEnv({ RECEIPT_SIGNING_KEY: B.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub });
const mk = async (seq, ts) => {
  const hash = String(seq).padStart(64, "0");
  return { seq, ts, hash, sig_commit: rs.sigCommitFor(sB), signature: await rs.signatureFor(hash, sB) };
};
const epochs = [{ public_key: B.pub, from: "2026-01-01T00:00:00Z", until: "2026-10-01T00:00:00Z" }];
const trusted = await rs.trustedReceiptKeys(null, { epochs });
assert.equal(trusted[0].source, "retired");
let v = await rs.verifyReceiptSignatures([await mk(1, "2026-09-30T23:59:59Z")], { trusted });
assert.equal(v.ok, true); assert.equal(v.rows[0].key_source, "retired");
v = await rs.verifyReceiptSignatures([await mk(1, "2026-10-01T00:00:01Z")], { trusted });
assert.equal(v.errors[0].code, "RECEIPT-KEY-RETIRED");
v = await rs.verifyReceiptSignatures([await mk(1, "2025-12-31T23:59:59Z")], { trusted });
assert.equal(v.errors[0].code, "RECEIPT-KEY-RETIRED");
v = await rs.verifyReceiptSignatures([await mk(1, undefined)], { trusted });
assert.equal(v.errors[0].code, "RECEIPT-KEY-RETIRED");
// default (no epochs in code yet): unchanged behaviour, the key is simply untrusted.
v = await rs.verifyReceiptSignatures([await mk(1, "2026-09-30T00:00:00Z")], { trusted: await rs.trustedReceiptKeys(null) });
assert.equal(v.errors[0].code, "RECEIPT-KEY-UNTRUSTED");
assert.deepEqual(rs.RECEIPT_KEY_EPOCHS, []); n++;

// 4) provisioning: the code's format, wrangler without the API token, public first, preflight fails closed.
const src = fs.readFileSync(new URL("./provision-receipt-key.mjs", import.meta.url), "utf8");
assert.deepEqual(prov.WRANGLER, ["env", "-u", "CLOUDFLARE_API_TOKEN", "npx", "wrangler", "secret", "put"]);
assert.match(src, /privateKey\.export\(\{ format: "der", type: "pkcs8" \}\)/);
assert.ok(src.indexOf("await put(SECRET_PUBLIC") < src.indexOf("await put(SECRET_PRIVATE"), "public key first");
assert.ok(!/writeFile|appendFile|createWriteStream/.test(src), "never writes the key to disk");
assert.ok(!/console\.log\([^)]*\bder\b/.test(src), "never prints the private key");
// the exact bytes the script would pipe are accepted by the runtime loader
{
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pub = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url").toString("base64url");
  const held = await rs.heldSignerFromEnv({ RECEIPT_SIGNING_KEY: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64url"), RECEIPT_SIGNING_PUBLIC_KEY: pub });
  assert.equal(held.ok, true); assert.equal(held.provenance.key_id, prov.keyIdOfRaw(Buffer.from(pub, "base64url")));
}
const fake = (map) => async (u) => { const p = new URL(u).pathname; return p in map ? new Response(JSON.stringify(map[p]), { status: 200 }) : new Response("nf", { status: 404 }); };
assert.equal((await prov.preflight({ fetchImpl: fake({}) })).code, "PROVISION-CODE-NOT-DEPLOYED");
assert.equal((await prov.preflight({ fetchImpl: fake({ "/.well-known/azrt-keys.json": { spec: "AZRT-KEYS-1.0", receipt: { retired: [] } }, "/v1/receipt-key": { signing: false } }) })).code, "PROVISION-PREFLIGHT-OK");
assert.equal((await prov.preflight({ fetchImpl: fake({ "/.well-known/azrt-keys.json": { spec: "AZRT-KEYS-1.0", receipt: { retired: [] } }, "/v1/receipt-key": { signing: true, key_id: "ed25519:x" } }) })).code, "PROVISION-KEY-ALREADY-HELD");
assert.equal((await prov.preflight({ next: true, fetchImpl: fake({ "/.well-known/azrt-keys.json": { spec: "AZRT-KEYS-1.0", receipt: { retired: [] } }, "/v1/receipt-key": { signing: true, key_id: "ed25519:x" } }) })).code, "PROVISION-EPOCH-NOT-DEPLOYED");
assert.equal((await prov.preflight({ next: true, fetchImpl: fake({ "/.well-known/azrt-keys.json": { spec: "AZRT-KEYS-1.0", receipt: { retired: [{ key_id: "ed25519:x" }] } }, "/v1/receipt-key": { signing: true, key_id: "ed25519:x" } }) })).code, "PROVISION-PREFLIGHT-OK");
n++;
console.log(`ok receipt key epochs: ${n} checks`);
