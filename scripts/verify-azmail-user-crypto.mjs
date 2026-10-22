// AZMAIL-USER-1.0 §2-§5: mail subkey, envelopes, commitments, decoys (pure).
import assert from "node:assert/strict";
const { deriveArkAccount, sha256, hex } = await import("../src/account/ark-kdf.js");
const C = await import("../src/mail/user-crypto.js");
const V = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../fixtures/ark-account-vectors.json", import.meta.url), "utf8"));
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const a = await deriveArkAccount("alice.az", "Pw-alice-long-1");
const a2 = await deriveArkAccount("alice.az", "Pw-alice-long-1");
const b = await deriveArkAccount("bob_az", "Pw-bob-long-2");
const bWrong = await deriveArkAccount("bob_az", "Pw-bob-long-X");
ok(/^[0-9a-f]{64}$/.test(a.mail_pub) && a.mail_pub === a2.mail_pub, "mail_pub deterministic");
ok(a.mail_pub !== b.mail_pub && b.mail_pub !== bWrong.mail_pub, "mail_pub per (user,password)");
ok(a.mail_pub !== a.pub, "mail key distinct from sign key");
// Existing ARK-ACCOUNT vectors unchanged by the additive ARK:MAIL label.
const vecs = Array.isArray(V) ? V : V.vectors || [];
for (const v of vecs.slice(0, 2)) {
  if (!v.username || !v.pub) continue;
  const k = await deriveArkAccount(v.username, v.password, v.iterations ? { iterations: v.iterations } : undefined);
  ok(k.pub === v.pub && (!v.vault_id || k.vault_id === v.vault_id), "ark vector unchanged " + v.username);
}
ok(C.addressOf(b.mail_pub) === "azm1." + b.mail_pub && C.pubOfAddress(C.addressOf(b.mail_pub)) === b.mail_pub, "address round trip");
assert.throws(() => C.pubOfAddress("azm1.zz")); n++;
const inbox = await C.inboxIdOf(b.mail_pub);
const r = hex(crypto.getRandomValues(new Uint8Array(32)));
const env1 = await C.sealEnvelope(b.mail_pub, inbox, { inner: { body: "hi bob", r }, inner_sig: "00" });
const env2 = await C.sealEnvelope(b.mail_pub, inbox, { inner: { body: "hi bob", r }, inner_sig: "00" });
ok(env1 !== env2 && hex(await sha256(env1)) !== hex(await sha256(env2)), "same text → distinct ciphertext/hash (no duplicate hashes)");
ok(!atob(env1).includes("hi bob"), "no plaintext in envelope");
const got = await C.openEnvelope(b.mailKey, b.mail_pub, inbox, env1);
ok(got.inner.body === "hi bob" && got.inner.r === r, "recipient opens");
await assert.rejects(C.openEnvelope(bWrong.mailKey, bWrong.mail_pub, inbox, env1)); n++;
await assert.rejects(C.openEnvelope(a.mailKey, a.mail_pub, inbox, env1)); n++;
await assert.rejects(C.openEnvelope(b.mailKey, b.mail_pub, await C.inboxIdOf(a.mail_pub), env1)); n++; // AAD binds inbox
const cm = await C.commitments(r);
ok(new Set([cm.out, cm.in, cm.ack]).size === 3 && ![cm.out, cm.in, cm.ack].includes(r), "role commitments distinct, r hidden");
const S = "x".repeat(40);
const d1 = await C.decoyPubFor(S, "Nobody.Here"), d2 = await C.decoyPubFor(S, "nobody.here");
ok(/^[0-9a-f]{64}$/.test(d1) && d1 === d2, "decoy deterministic per normalized name");
ok(d1 !== (await C.decoyPubFor("y".repeat(40), "nobody.here")), "decoy depends on secret");
await assert.rejects(C.decoyPubFor("short", "nobody.here")); n++;
ok((await C.nameKeyOf("Alice.AZ")) === (await C.nameKeyOf("alice.az")) && !(await C.nameKeyOf("alice.az")).includes("alice"), "name key hashed + normalized");
console.log(`verify-azmail-user-crypto: ${n} checks ok`);
const MV = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../fixtures/azmail-user-vectors.json", import.meta.url), "utf8"));
for (const v of MV.vectors) {
  const k = await deriveArkAccount(v.username, v.password);
  assert.equal(k.mail_pub, v.mail_pub); assert.equal(await C.inboxIdOf(k.mail_pub), v.inbox_id);
  assert.equal(await C.outboxIdOf(k.vault_id), v.outbox_id); assert.equal(await C.nameKeyOf(v.username), v.name_key); n++;
}
console.log(`verify-azmail-user-crypto vectors: ${MV.vectors.length} pinned, ${n} total checks ok`);
