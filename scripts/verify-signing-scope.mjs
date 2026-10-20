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
  const sr = rk.signing_scope.session_receipts;
  assert.equal(sr.independently_verified, false, name + ": never independently verified");
  if (!want) { assert.equal(sr.key_id, null, name + ": no key id when not signing"); assert.equal(sr.key_source, null, name + ": no key_source"); }
  else { assert.equal(sr.key_source, "published (self, unpinned)", name + ": key_source"); assert.equal(sr.key_trusted, false); assert.equal(sr.note, "signature proves possession of the self-published key only; not pinned, not independently verified", name + ": note"); }
  assert.match(rk.signing_scope.chainlock_rows.covers, /FragGate ask\/refuse ledger/, name + ": fraggate ledger named");
  assert.doesNotMatch(JSON.stringify(rk.signing_scope.other_keys.checkpoints), /azrt-keys/, name + ": checkpoint key not claimed in azrt-keys.json");
  assert.match(rk.signing_scope.other_keys.tether, /\/v1\/tether/, name + ": tether key location");
  assert.match(ls.contract_flag_note, /pinned in the shared contract hash.*pin bump.*re-vendoring/, name + ": flag note");
  const abw = rk.signing_scope.other_keys.anchors_and_build_witness;
  assert.match(abw, /witness2: not configured/, name + ": witness2 stated as not configured");
  assert.match(abw, /auditor key under witness\.auditor/, name + ": auditor location");
  assert.doesNotMatch(abw, /\(witness, witness2\)/, name + ": no implied slot-2 key");
  n += 10;
  for (const t of [JSON.stringify(rk), JSON.stringify(ls.signing_scope)]) { assert.ok(!/RECEIPT_SIGNING/.test(t) || !want, name + ": secret name in public body"); if (env.RECEIPT_SIGNING_KEY) assert.ok(!t.includes(env.RECEIPT_SIGNING_KEY), name + ": private key leaked"); }
  n += 11;
}
// Fail closed: an env whose getter throws reports not signed.
const evil = new Proxy({}, { get() { throw new Error("boom"); } });
const s = await signingScope(evil);
assert.equal(s.session_receipts.signed, false, "throwing env fails closed"); assert.equal(s.session_receipts.key_id, null); assert.equal(s.session_receipts.key_source, null); n += 3;
console.log("verify-signing-scope ok (" + n + " checks)");
