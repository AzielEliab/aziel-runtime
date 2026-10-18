/**
 * RIB-042 / AZRT-HELD-KEY-1.0: receipts are signed only with a provisioned (held, never minted) key;
 * unsigned receipts say so; verify checks against trusted keys; old receipts still verify.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { appendReceipt, applyOpen, canonicalize, newSessionId, openSession, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { HELD_KEY_SPEC, SIG_DOMAIN, heldSignerFromEnv, keyIdOf, setActiveReceiptSigner, trustedReceiptKeys, verifyReceiptSignatures } from "../src/receipt-signing.js";
import { memorySessionNamespace } from "../src/session-do.js";

let n = 0;
const T = "2026-10-13T00:00:00Z";
const b64u = (buf) => Buffer.from(buf).toString("base64url");
// The TEST plays the deploy/issuer side: it provisions the key the runtime then holds.
async function provision() {
  const kp = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  return { priv: b64u(await webcrypto.subtle.exportKey("pkcs8", kp.privateKey)), pub: b64u(await webcrypto.subtle.exportKey("raw", kp.publicKey)) };
}
const A = await provision();
const B = await provision();
const envA = { RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: A.pub, RECEIPT_KEY_PROVISIONED_BY: "deploy:wrangler-secret", RECEIPT_KEY_ATTESTATION_SHA256: "a".repeat(64) };
async function chain(signer, k = 2) {
  setActiveReceiptSigner(signer);
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, {});
  for (let i = 0; i < k; i++) await appendReceipt(s, "exec", { intent: { slug: "foldlock", op: "health" } }, T);
  return s;
}

// Source check: no generate/rotate/export/derive/wrap on the held key; import is non-extractable, sign-only.
{
  const src = (await readFile(new URL("../src/receipt-signing.js", import.meta.url), "utf8")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const bad of [/generateKey/, /exportKey/, /deriveKey/, /deriveBits/, /wrapKey/, /unwrapKey/, /getRandomValues/, /rotate/i, /node:crypto/]) assert.doesNotMatch(src, bad, String(bad));
  assert.match(src, /importKey\("pkcs8", .*\{ name: "Ed25519" \}, false, \["sign"\]\)/, "private key imported non-extractable, sign-only");
  const imports = src.match(/importKey\([^\n]*/g) || [];
  assert.equal(imports.length, 2, "exactly two importKey( calls (private sign-only, public verify-only)");
  for (const line of imports) assert.match(line, /, false,/, "every import non-extractable: " + line);
  assert.doesNotMatch(src, /subtle\s*\[/, "no computed subtle[...] access");
  // No other runtime source touches the private key secret.
  const { readdir } = await import("node:fs/promises");
  // Follow-up (#289 review): a split name such as env["RECEIPT_" + "SIGNING_KEY"] or env[`RECEIPT_${x}`] slipped past
  // the plain /RECEIPT_SIGNING/ check. Now: (a) no fragment of the secret name in any other file; (b) every computed
  // env[...] index and every whole-env enumeration/spread is on a reviewed allowlist, so a new one fails here.
  const ALLOWED_COMPUTED_ENV = {
    "workspace.js": ["env[ENV_WORKSPACE_KEY]"],
    "index.js": ["env[bindingName(product)]"],
    "engines/vibelock/engine.js": ["env[i]", "env[i]", "env[i]", "env[i - 1]"], // local numeric array named env
  };
  const ALLOWED_ENV_ENUM = {
    "azpipe.js": ["Object.assign(env", "...env", "Object.assign(env", "...env"], // azpipe's local `env` is its pipe envelope, not the Worker env
    "engines/shadowlock/engine.js": [],
  };
  const fragment = /["'`][^"'`\n]*(?:SIGNING_KEY|RECEIPT_SIG|RECEIPT_KEY)[^"'`\n]*["'`]|["'`](?:RECEIPT_?|RECEIPT_SIGNING_?|SIGNING_?KEY|_?SIGNING_?)["'`]/;
  for (const f of (await readdir(new URL("../src/", import.meta.url), { recursive: true })).filter((x) => (x.endsWith(".js") || x.endsWith(".mjs")) && x !== "receipt-signing.js")) {
    const raw = await readFile(new URL("../src/" + f, import.meta.url), "utf8");
    const t = raw.replace(/^\s*\/\*[\s\S]*?\*\//gm, "").replace(/^\s*\/\/.*$/gm, ""); // whole-line comments only (URLs keep "//")
    assert.doesNotMatch(raw, /RECEIPT_SIGNING/, f);
    assert.ok(!fragment.test(t), "secret-name fragment in " + f + ": " + (t.match(fragment) || [""])[0]);
    const computed = t.match(/\benv\s*\[[^\]\n]*\]/g) || [];
    assert.deepEqual(computed, ALLOWED_COMPUTED_ENV[f] || [], "computed env[...] index in " + f + " (review and allowlist)");
    const enumerating = t.match(/Object\.(?:keys|values|entries|getOwnPropertyNames|getOwnPropertyDescriptors|assign)\(\s*(?:\{\}\s*,\s*)?env\b|for\s*\(\s*(?:const|let|var)\s+\w+\s+in\s+env\b|Reflect\.(?:get|ownKeys|has)\(\s*env\b|JSON\.stringify\(\s*env\b|structuredClone\(\s*env\b|\.\.\.env\b(?!\.)/g) || [];
    const shadowlockSpread = f === "engines/shadowlock/engine.js" ? [] : null;
    assert.deepEqual(enumerating, shadowlockSpread || ALLOWED_ENV_ENUM[f] || [], "whole-env enumeration/spread in " + f + " (review and allowlist)");
  }
  // The scanner itself catches the reported bypass shapes.
  const probe = (code) => fragment.test(code) || /\benv\s*\[[^\]\n]*\]/.test(code);
  for (const bad of ['env["RECEIPT_" + "SIGNING_KEY"]', "env['RECEIPT_'+'SIGNING_KEY']", "env[`RECEIPT_${k}`]", "const k = 'SIGNING_KEY'", "env[name]"]) assert.ok(probe(bad), bad);
  n++;
}
// Dynamic check: with a provisioned key, no HTTP surface ever echoes the private key.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const env = { ...envA, SESSION: memorySessionNamespace(envA) };
  const needle = A.priv.slice(8, 40);
  for (const [method, path, body] of [["GET", "/"], ["GET", "/health"], ["GET", "/v1/software"], ["GET", "/v1/receipt-key"], ["GET", "/v1/anchor/heads"], ["POST", "/v1/session/open", "{}"], ["POST", "/mcp", JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })]]) {
    const res = await handler(new Request("https://rt.example" + path, { method, headers: { "content-type": "application/json" }, ...(body ? { body } : {}) }), env);
    const text = await res.text();
    assert.ok(!text.includes(needle), "private key leaked on " + path);
  }
  n++;
}
// No key: unsigned with a reason, never a fake signature; chain verifies; status "unsigned".
{
  const none = await heldSignerFromEnv({});
  const s = await chain(none);
  for (const r of s.receipts) { assert.equal(r.signature.sig, null); assert.match(r.signature.reason, /no receipt signing key provisioned/); assert.equal(r.signature.spec, HELD_KEY_SPEC); }
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.receipt_signatures.status, "unsigned"); assert.equal(v.receipt_signatures.signed, 0); n++;
  // Public key missing, bad key, or mismatched pair: refuses to sign, says why.
  assert.match((await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: A.priv })).reason, /PUBLIC_KEY not provisioned/);
  assert.match((await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: "junk", RECEIPT_SIGNING_PUBLIC_KEY: A.pub })).reason, /not a valid/);
  assert.match((await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub })).reason, /does not match/); n++;
}
// Held key: every new receipt signed with provenance; verifies against the published key.
{
  const held = await heldSignerFromEnv(envA);
  assert.equal(held.ok, true);
  const s = await chain(held);
  const r = s.receipts[1];
  assert.equal(r.signature.alg, "Ed25519"); assert.equal(r.signature.key_id, await keyIdOf(A.pub));
  assert.equal(r.signature.provisioned_by, "deploy:wrangler-secret"); assert.equal(r.signature.attestation_sha256, "a".repeat(64));
  // The signature covers the domain-tagged hash, and the hash excludes the signature.
  const key = await webcrypto.subtle.importKey("raw", Buffer.from(A.pub, "base64url"), { name: "Ed25519" }, false, ["verify"]);
  assert.equal(await webcrypto.subtle.verify({ name: "Ed25519" }, key, Buffer.from(r.signature.sig, "base64url"), new TextEncoder().encode(SIG_DOMAIN + r.hash)), true);
  const { hash, signature: _s, ...rest } = r;
  assert.equal(await sha256Hex(canonicalize(rest)), hash);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.receipt_signatures.status, "all_signed"); assert.equal(v.receipt_signatures.signed, 3); n++;
  // Fail closed: forged sig, untrusted key, key_id mismatch, unsigned without reason.
  const trusted = await trustedReceiptKeys({ RECEIPT_SIGNING_PUBLIC_KEY: A.pub });
  const tamper = (f) => s.receipts.map((x, i) => (i === 1 ? { ...x, signature: f(x.signature) } : x));
  const codes = async (rows, t = trusted) => (await verifyReceiptSignatures(rows, { trusted: t })).errors.map((e) => e.code);
  assert.deepEqual(await codes(tamper((g) => ({ ...g, sig: s.receipts[2].signature.sig }))), ["RECEIPT-SIG-BAD"]);
  const heldB = await heldSignerFromEnv({ RECEIPT_SIGNING_KEY: B.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub });
  const sb = await chain(heldB, 1);
  assert.ok((await codes(sb.receipts)).includes("RECEIPT-KEY-UNTRUSTED"), "a self-provisioned key that isn't trusted does not verify");
  assert.deepEqual(await codes(tamper((g) => ({ ...g, key_id: "ed25519:" + "0".repeat(64) }))), ["RECEIPT-KEY-ID-MISMATCH"]);
  assert.deepEqual(await codes(tamper(() => ({ sig: null }))), ["RECEIPT-SIG-MISSING"]);
  // A changed receipt body breaks the hash; re-hashing it breaks the signature.
  const body = s.receipts.map((x, i) => (i === 1 ? { ...x, payload: { intent: { slug: "evil" } } } : x));
  assert.ok((await verifyChainStrict(body, { trustedKeys: trusted })).errors.some((e) => e.error === "hash_mismatch")); n++;
}
// Old receipts (no signature field) still verify as legacy; mixed chains report partly_signed.
{
  // Legacy = no sig_commit at all (receipts minted before RIB-042).
  const legacyRows = [{ seq: 1, hash: "h1" }, { seq: 2, hash: "h2" }];
  const lv = await verifyReceiptSignatures(legacyRows, { trusted: [] });
  assert.equal(lv.ok, true); assert.equal(lv.legacy, 2); assert.equal(lv.status, "unsigned");
  const fixture = JSON.parse(await readFile(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
  const rows = fixture.receipts || fixture;
  const fv = await verifyChainStrict(rows);
  assert.equal(fv.errors.filter((e) => /RECEIPT-/.test(e.error)).length, 0); n++;
}
// HTTP: /v1/receipt-key publishes the public key (never the private key) or says not signing; DO signs with the held key.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const off = await (await handler(new Request("https://rt.example/v1/receipt-key"), {})).json();
  assert.equal(off.signing, false); assert.match(off.reason, /no receipt signing key/);
  const env = { ...envA, SESSION: memorySessionNamespace(envA) };
  const on = await (await handler(new Request("https://rt.example/v1/receipt-key"), env)).json();
  assert.equal(on.signing, true); assert.equal(on.public_key, A.pub);
  assert.equal(on.trusted, false); assert.equal(on.key_source, "published (self, unpinned)");
  assert.doesNotMatch(JSON.stringify(on), new RegExp(A.priv.slice(0, 24)));
  const open = await (await handler(new Request("https://rt.example/v1/session/open", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env)).json();
  assert.equal(open.receipt.signature.alg, "Ed25519", JSON.stringify(open.receipt.signature));
  assert.equal(open.receipt.signature.key_id, await keyIdOf(A.pub)); n++;
}
// Downgrade: strip one, strip all, or swap one for {sig:null, reason} -> fails closed (sig_commit is hashed).
{
  const held = await heldSignerFromEnv(envA);
  const trusted = await trustedReceiptKeys({ RECEIPT_SIGNING_PUBLIC_KEY: A.pub });
  const s = await chain(held, 3);
  assert.ok(s.receipts.every((r) => r.sig_commit && r.sig_commit.key_id === held.provenance.key_id));
  const v0 = await verifyChainStrict(s.receipts, { trustedKeys: trusted });
  assert.equal(v0.ok, true, JSON.stringify(v0.errors));
  const strip = (rows, idx) => rows.map((r, i) => (idx.includes(i) ? (({ signature: _x, ...rest }) => rest)(r) : r));
  const one = await verifyChainStrict(strip(s.receipts, [2]), { trustedKeys: trusted });
  assert.equal(one.ok, false); assert.ok(one.errors.some((e) => e.error === "RECEIPT-SIG-MISSING"), "strip one");
  const all = await verifyChainStrict(strip(s.receipts, s.receipts.map((_, i) => i)), { trustedKeys: trusted });
  assert.equal(all.ok, false); assert.equal(all.errors.filter((e) => e.error === "RECEIPT-SIG-MISSING").length, s.receipts.length, "strip all");
  const swapped = s.receipts.map((r, i) => (i === 1 ? { ...r, signature: { spec: HELD_KEY_SPEC, sig: null, reason: "no receipt signing key provisioned" } } : r));
  const sw = await verifyChainStrict(swapped, { trustedKeys: trusted });
  assert.equal(sw.ok, false); assert.ok(sw.errors.some((e) => e.error === "RECEIPT-SIG-MISSING"), "swap to unsigned");
  // Rewriting sig_commit itself breaks the hash.
  const recommit = s.receipts.map((r, i) => (i === 1 ? { ...r, sig_commit: { spec: HELD_KEY_SPEC, mode: "none" }, signature: { spec: HELD_KEY_SPEC, sig: null, reason: "x" } } : r));
  assert.ok((await verifyChainStrict(recommit, { trustedKeys: trusted })).errors.some((e) => e.error === "hash_mismatch"));
  n++;
  // Unsigned or legacy after the first signed receipt -> RECEIPT-SIG-DOWNGRADE (even with valid hashes).
  setActiveReceiptSigner(held);
  const m = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(m, T, {});
  setActiveReceiptSigner(await heldSignerFromEnv({}));
  await appendReceipt(m, "exec", { intent: { slug: "foldlock", op: "health" } }, T);
  assert.equal(m.receipts[1].sig_commit.mode, "none");
  const dv = await verifyChainStrict(m.receipts, { trustedKeys: trusted });
  assert.equal(dv.ok, false); assert.ok(dv.errors.some((e) => e.error === "RECEIPT-SIG-DOWNGRADE"));
  const legacyAfter = await verifyReceiptSignatures([s.receipts[0], { seq: 2, hash: "x" }], { trusted });
  assert.deepEqual(legacyAfter.errors.map((e) => e.code), ["RECEIPT-SIG-DOWNGRADE"]);
  // Unsigned before any signed receipt is fine (key provisioned later).
  setActiveReceiptSigner(await heldSignerFromEnv({}));
  const up = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(up, T, {});
  setActiveReceiptSigner(held);
  await appendReceipt(up, "exec", { intent: { slug: "foldlock", op: "health" } }, T);
  const uv = await verifyChainStrict(up.receipts, { trustedKeys: trusted });
  assert.equal(uv.ok, true, JSON.stringify(uv.errors)); assert.equal(uv.receipt_signatures.status, "partly_signed");
  // A signature on a mode:none receipt is not accepted (uncommitted).
  const unc = await verifyReceiptSignatures([{ ...up.receipts[0], signature: up.receipts[1].signature }], { trusted });
  assert.deepEqual(unc.errors.map((e) => e.code), ["RECEIPT-SIG-UNCOMMITTED"]);
  n++;
}
setActiveReceiptSigner(null);
console.log(`ok held-key receipt signing (RIB-042): ${n} checks`);
