/**
 * AZRT-SIGNING-SCOPE-1.0: /v1/receipt-key and /v1/lockstep report receipt signing from one derived source,
 * so they cannot disagree; fails closed on a bad/mismatched key; the pinned lockstep contract is unchanged.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { canonicalize } from "../src/session-core.js";
import { signingScope } from "../src/receipt-signing.js";

const handler = (await import("../src/index.js")).default.fetch;
const get = async (p, env) => (await handler(new Request("https://aziel-runtime.example" + p, { headers: { "user-agent": "Mozilla/5.0" } }), env)).json();
const b64u = (b) => Buffer.from(b).toString("base64url");
async function kp() {
  const k = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  return { priv: b64u(await webcrypto.subtle.exportKey("pkcs8", k.privateKey)), pub: b64u(await webcrypto.subtle.exportKey("raw", k.publicKey)) };
}
const A = await kp(), B = await kp();
const PIN = "0ec8eaf51724feb1c1c362dac0200272c84667838cbca9a2e862fb02021122e6";
let n = 0;
const cases = [
  ["no key", {}, false],
  ["held key", { RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: A.pub }, true],
  ["mismatched pub", { RECEIPT_SIGNING_KEY: A.priv, RECEIPT_SIGNING_PUBLIC_KEY: B.pub }, false],
  ["garbage key", { RECEIPT_SIGNING_KEY: "not-a-key", RECEIPT_SIGNING_PUBLIC_KEY: A.pub }, false],
  ["priv without pub", { RECEIPT_SIGNING_KEY: A.priv }, false],
];
for (const [name, env, want] of cases) {
  const rk = await get("/v1/receipt-key", env);
  const ls = await get("/v1/lockstep", env);
  assert.equal(rk.signing, want, name + ": receipt-key signing");
  assert.equal(rk.signing_scope.session_receipts.signed, want, name + ": receipt-key scope");
  assert.equal(canonicalize(ls.signing_scope), canonicalize(rk.signing_scope), name + ": lockstep and receipt-key disagree");
  assert.equal(canonicalize(ls.signing_scope), canonicalize(await signingScope(env)), name + ": not the shared source");
  assert.equal(ls.signing_scope.chainlock_rows.signed, false, name + ": chainlock rows are never signed");
  assert.equal(ls.contract_sha256, PIN, name + ": pinned contract changed");
  assert.equal(ls.contract.flags.receipts_signed, false, name + ": contract floor");
  if (!want) assert.equal(rk.signing_scope.session_receipts.key_id, null, name + ": no key id when not signing");
  for (const t of [JSON.stringify(rk), JSON.stringify(ls.signing_scope)]) { assert.ok(!/RECEIPT_SIGNING/.test(t) || !want, name + ": secret name in public body"); if (env.RECEIPT_SIGNING_KEY) assert.ok(!t.includes(env.RECEIPT_SIGNING_KEY), name + ": private key leaked"); }
  n += 11;
}
// Fail closed: an env whose getter throws reports not signed.
const evil = new Proxy({}, { get() { throw new Error("boom"); } });
const s = await signingScope(evil);
assert.equal(s.session_receipts.signed, false, "throwing env fails closed"); n++;
console.log("verify-signing-scope ok (" + n + " checks)");
