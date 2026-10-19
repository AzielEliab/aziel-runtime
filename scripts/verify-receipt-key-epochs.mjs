/**
 * AZRT-KEYS-1.0: the held receipt key is published additively (/.well-known/azrt-keys.json, /v1/keys,
 * heads.receipt_key for the witness), retired receipt keys verify only inside their epoch, and the
 * provisioning script pipes the key straight to wrangler in the format the code reads. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { webcrypto, createHash } from "node:crypto";
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
assert.deepEqual(prov.WRANGLER, ["env", "-u", "CLOUDFLARE_API_TOKEN", "npx", "--no-install", "wrangler", "secret", "put"]);
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
assert.equal((await prov.preflight({ next: true, fetchImpl: fake({ "/.well-known/azrt-keys.json": { spec: "AZRT-KEYS-1.0", receipt: { retired: [] } }, "/v1/receipt-key": { signing: false } }) })).code, "PROVISION-NO-CURRENT-KEY");
// once the epoch is deployed the runtime refuses the held key (RECEIPT-KEY-IS-RETIRED); only then may a new key go in.
assert.equal((await prov.preflight({ next: true, fetchImpl: fake({ "/.well-known/azrt-keys.json": { spec: "AZRT-KEYS-1.0", receipt: { signing: false, code: "RECEIPT-KEY-IS-RETIRED", refused_key_id: "ed25519:x", retired: [{ key_id: "ed25519:x" }] } }, "/v1/receipt-key": { signing: false } }) })).code, "PROVISION-PREFLIGHT-OK");
n++;

// 5) AZBot review of #308: the runtime never signs with a retired key; retired wins over pinned;
//    the pinned / epoch lists are append-only (fingerprint of every entry that existed at review time).
{
  const C = await pair();
  const envC = { ...base, RECEIPT_SIGNING_KEY: C.priv, RECEIPT_SIGNING_PUBLIC_KEY: C.pub };
  const epC = [{ public_key: C.pub, from: "2026-01-01T00:00:00Z", until: "2026-10-01T00:00:00Z" }];
  const refused = await rs.heldSignerFromEnv(envC, { epochs: epC });
  assert.equal(refused.ok, false); assert.equal(refused.code, "RECEIPT-KEY-IS-RETIRED"); assert.equal(refused.key_id, await rs.keyIdOf(C.pub));
  assert.equal(refused.sign, undefined, "no signer handed out");
  const sig = await rs.signatureFor("a".repeat(64), refused);
  assert.equal(sig.sig, null); assert.match(sig.reason, /retired/);
  assert.equal(rs.sigCommitFor(refused).mode, "none");
  assert.equal((await rs.heldSignerFromEnv({ ...envC }, { epochs: [] })).ok, true, "same key, not listed: signs");
  // retired wins over pinned (and over published): only inside the epoch.
  const both = await rs.trustedReceiptKeys(envC, { epochs: epC, pinned: [C.pub] });
  assert.equal(both.length, 1); assert.equal(both[0].source, "retired"); assert.equal(both[0].until, epC[0].until);
  const sC = await rs.heldSignerFromEnv({ RECEIPT_SIGNING_KEY: C.priv, RECEIPT_SIGNING_PUBLIC_KEY: C.pub }, { epochs: [] });
  const mkC = async (ts) => { const hash = "c".repeat(64); return { seq: 1, ts, hash, sig_commit: rs.sigCommitFor(sC), signature: await rs.signatureFor(hash, sC) }; };
  assert.equal((await rs.verifyReceiptSignatures([await mkC("2026-09-01T00:00:00Z")], { trusted: both })).ok, true);
  assert.equal((await rs.verifyReceiptSignatures([await mkC("2026-10-02T00:00:00Z")], { trusted: both })).errors[0].code, "RECEIPT-KEY-RETIRED", "pinning can't un-retire");
  // append-only: entries that existed at review time keep their place and bytes; new ones only append.
  const fp = (e) => createHash("sha256").update(JSON.stringify(e)).digest("hex");
  const REVIEWED_EPOCHS = []; // sha256(JSON) of each RECEIPT_KEY_EPOCHS entry, in order; append when adding one
  const REVIEWED_PINNED = []; // same for PINNED_RECEIPT_KEYS
  assert.ok(rs.RECEIPT_KEY_EPOCHS.length >= REVIEWED_EPOCHS.length && REVIEWED_EPOCHS.every((h, i) => fp(rs.RECEIPT_KEY_EPOCHS[i]) === h), "RECEIPT_KEY_EPOCHS is append-only");
  assert.ok(rs.PINNED_RECEIPT_KEYS.length >= REVIEWED_PINNED.length && REVIEWED_PINNED.every((h, i) => fp(rs.PINNED_RECEIPT_KEYS[i]) === h), "PINNED_RECEIPT_KEYS is append-only");
  assert.ok(Object.isFrozen(rs.RECEIPT_KEY_EPOCHS) && Object.isFrozen(rs.PINNED_RECEIPT_KEYS));
  // the manifest names the refused key, and the wording is future tense until the witness patch lands.
  const { keysManifest } = await import("../src/keys-manifest.js");
  const ksrc = fs.readFileSync(new URL("../src/keys-manifest.js", import.meta.url), "utf8");
  assert.ok(!/witness log signs/.test(ksrc), "no present-tense claim that the witness signs receipt_key");
  assert.match((await keysManifest(base)).note, /will record heads\.receipt_key once the aziel-anchors patch lands/);
}
n++;
// 6) AZBot low on #308: an epoch entry without `until` (or with a bad one) is rejected by both load() and the
//    trusted-key builder: nothing is signed, and the key it names is trusted nowhere (not even pinned or published).
{
  const D = await pair();
  const envD = { ...base, RECEIPT_SIGNING_KEY: D.priv, RECEIPT_SIGNING_PUBLIC_KEY: D.pub };
  const X = await pair();
  for (const bad of [{ public_key: X.pub }, { public_key: X.pub, until: "not a date" }, { public_key: X.pub, until: "2026-10-01T00:00:00Z", from: "nope" }, { until: "2026-10-01T00:00:00Z" }]) {
    assert.equal(rs.epochEntryValid(bad), false);
    const l = await rs.heldSignerFromEnv(envD, { epochs: [bad] });
    assert.equal(l.ok, false, JSON.stringify(bad)); assert.equal(l.code, "RECEIPT-KEY-EPOCH-BAD");
  }
  assert.equal(rs.epochEntryValid({ public_key: X.pub, until: "2026-10-01T00:00:00Z" }), true);
  const noUntil = [{ public_key: D.pub, from: "2026-01-01T00:00:00Z" }];
  const t = await rs.trustedReceiptKeys(envD, { epochs: noUntil, pinned: [D.pub] });
  assert.ok(!t.some((k) => k.public_key === D.pub), "a key named by an entry without until is trusted nowhere");
  const sD = await rs.heldSignerFromEnv({ RECEIPT_SIGNING_KEY: D.priv, RECEIPT_SIGNING_PUBLIC_KEY: D.pub }, { epochs: [] });
  const hash = "d".repeat(64);
  const rec = { seq: 1, ts: "2026-09-01T00:00:00Z", hash, sig_commit: rs.sigCommitFor(sD), signature: await rs.signatureFor(hash, sD) };
  assert.equal((await rs.verifyReceiptSignatures([rec], { trusted: t })).errors[0].code, "RECEIPT-KEY-UNTRUSTED");
  assert.equal((await rs.heldSignerFromEnv({ ...envD })).ok, true, "default (empty) epochs: signs");
}
n++;
console.log(`ok receipt key epochs: ${n} checks`);
