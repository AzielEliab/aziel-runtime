// USER-SIGNIN-ARK-1.0 §3: ARK-ACCOUNT-1.0 key schedule vectors and invariants.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveArkAccount, normalizeUsername, signBytes, verifySig, sealData, openData, vaultIdOf, ArkInputError } from "../src/account/ark-kdf.js";
let n = 0;
const fx = JSON.parse(readFileSync(new URL("../fixtures/ark-account-vectors.json", import.meta.url)));
for (const v of fx.vectors) {
  const a = await deriveArkAccount(v.username, v.password);
  assert.equal(a.pub, v.pub); assert.equal(a.vault_id, v.vault_id); assert.equal(a.rl_subject, v.rl_subject); n += 3;
  assert.equal(await vaultIdOf(a.pub), a.vault_id); n++;
}
const [base, caseV, wrong, , accent] = fx.vectors;
assert.equal(caseV.vault_id, base.vault_id, "username is case-folded"); n++;
assert.equal(accent.vault_id, base.vault_id, "combining marks stripped (#319 pipeline)"); n++;
assert.notEqual(wrong.vault_id, base.vault_id, "wrong password = different (empty) vault"); n++;
assert.equal(wrong.rl_subject, base.rl_subject, "rate subject is username-only, so lockout is identical for any password"); n++;
// No secret in the returned object's JSON form.
const a = await deriveArkAccount("aziel", "correct horse battery");
const json = JSON.stringify(a);
assert.ok(!json.includes("correct horse"), "no plaintext"); n++;
// AZMAIL-USER-1.0 adds mailKey (CryptoKey, serializes to {}) and mail_pub (public). No secret in JSON.
assert.deepEqual(Object.keys(JSON.parse(json)).sort(), ["encKey", "mailKey", "mail_pub", "pub", "rl_subject", "signKey", "spec", "vault_id"]); n++;
assert.equal(JSON.stringify(a.signKey), "{}"); assert.equal(JSON.stringify(a.encKey), "{}"); n += 2;
assert.equal(a.signKey.extractable, true); // pkcs8-imported; never exported by the module (grep-checked below)
const src = readFileSync(new URL("../src/account/ark-kdf.js", import.meta.url), "utf8");
assert.equal((src.match(/exportKey\(/g) || []).length, 1, "only the public x is exported"); n++;
// Signature + AEAD round trip.
const msg = new TextEncoder().encode("hello");
const sig = await signBytes(a.signKey, msg);
assert.ok(await verifySig(a.pub, sig, msg)); n++;
assert.ok(!(await verifySig(wrong.pub, sig, msg))); n++;
assert.ok(!(await verifySig(a.pub, "zz", msg))); n++;
const ct = await sealData(a.encKey, a.vault_id, 1, "secret history");
assert.equal(await openData(a.encKey, a.vault_id, 1, ct), "secret history"); n++;
await assert.rejects(openData(a.encKey, a.vault_id, 2, ct)); n++; // AAD binds seq
const w = await deriveArkAccount("aziel", "correct horse batterz");
await assert.rejects(openData(w.encKey, a.vault_id, 1, ct)); n++; // wrong password cannot read
// Uniform input refusal.
for (const [u, p] of [["ab", "longenough"], ["a b c", "longenough"], ["aziel", "short"], [null, "longenough"], ["aziel", 12345678], ["x".repeat(33), "longenough"]]) {
  await assert.rejects(deriveArkAccount(u, p), (e) => e instanceof ArkInputError && e.message === "ARK-INPUT"); n++;
}
assert.equal(normalizeUsername("ＡＺＩＥＬ"), "aziel"); n++; // fullwidth folds
console.log(`verify-ark-kdf: ${n} checks ok`);
