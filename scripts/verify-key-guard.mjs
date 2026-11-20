/**
 * Receipt key pin, replacement statement, and unreadable-witness fail-closed signing.
 * Does not generate a production key. Test keys exist only in this process.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { memorySessionNamespace } from "../src/session-do.js";
import { PINNED_RECEIPT_KEYS, heldSignerFromEnv, keyIdOf } from "../src/receipt-signing.js";
import { operatorRootPubkeys, rotationBody, verifyKeyRotation } from "../src/receipt-key-guard.js";
import { canonicalize } from "../src/session-core.js";

const b64u = (b) => Buffer.from(b).toString("base64url");
async function pair() {
  const kp = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  return {
    priv: b64u(await webcrypto.subtle.exportKey("pkcs8", kp.privateKey)),
    pub: b64u(await webcrypto.subtle.exportKey("raw", kp.publicKey)),
    key: kp.privateKey,
  };
}
async function sign(privateKey, body) {
  const sig = await webcrypto.subtle.sign({ name: "Ed25519" }, privateKey, new TextEncoder().encode(canonicalize(body)));
  return b64u(sig);
}

const LIVE = "5hjGrDhtR5IFJqEY30smt8CyRKXIRMYdijU_IAT8iP8";
assert.deepEqual(PINNED_RECEIPT_KEYS, [LIVE]);
assert.equal(await keyIdOf(LIVE), "ed25519:78aa5564baffbda0fcf1dfc4a2d07f41d730062f2175a2eeb786236f7b576874");

const oldKey = await pair();
const newKey = await pair();
const root = await pair();
const body = rotationBody(oldKey.pub, newKey.pub);
const oldSig = await sign(oldKey.key, body);
const rootSig = await sign(root.key, body);
const roots = [root.pub];
const epoch = [{ public_key: oldKey.pub, from: "2026-01-01T00:00:00Z", until: "2026-11-01T00:00:00Z" }];

const unsigned = await verifyKeyRotation({ old_public_key: oldKey.pub, new_public_key: newKey.pub, rootPubkeys: roots });
assert.equal(unsigned.ok, false);
assert.equal(unsigned.code, "KEY-ROTATION-UNSIGNED");

const oldOnly = await verifyKeyRotation({ old_public_key: oldKey.pub, new_public_key: newKey.pub, old_sig: oldSig, rootPubkeys: roots });
assert.equal(oldOnly.ok, false);
assert.equal(oldOnly.code, "KEY-ROTATION-ROOT-SIG");

const rootOnly = await verifyKeyRotation({ old_public_key: oldKey.pub, new_public_key: newKey.pub, root_sig: rootSig, rootPubkeys: roots });
assert.equal(rootOnly.ok, false);
assert.equal(rootOnly.code, "KEY-ROTATION-OLD-SIG");

const both = await verifyKeyRotation({ old_public_key: oldKey.pub, new_public_key: newKey.pub, old_sig: oldSig, root_sig: rootSig, rootPubkeys: roots });
assert.equal(both.ok, true);
assert.equal(both.code, "KEY-ROTATION-OK");

const noRoot = await verifyKeyRotation({ old_public_key: oldKey.pub, new_public_key: newKey.pub, old_sig: oldSig, root_sig: rootSig, rootPubkeys: [] });
assert.equal(noRoot.ok, false);
assert.equal(noRoot.code, "KEY-ROTATION-NO-ROOT");
assert.deepEqual(operatorRootPubkeys({}), []);
assert.deepEqual(operatorRootPubkeys({ OPERATOR_ROOT_PUBKEY: root.pub }), [root.pub]);

const envNew = { RECEIPT_SIGNING_KEY: newKey.priv, RECEIPT_SIGNING_PUBLIC_KEY: newKey.pub };
const listAlone = await heldSignerFromEnv(envNew, { epochs: epoch });
assert.equal(listAlone.ok, false, JSON.stringify(listAlone));
assert.equal(listAlone.code, "KEY-ROTATION-NO-ROOT");
assert.equal(listAlone.sign, undefined);

const listWithRoot = await heldSignerFromEnv({ ...envNew, OPERATOR_ROOT_PUBKEY: root.pub }, { epochs: epoch });
assert.equal(listWithRoot.ok, false);
assert.equal(listWithRoot.code, "KEY-ROTATION-UNSIGNED");

const accepted = await heldSignerFromEnv(
  { ...envNew, OPERATOR_ROOT_PUBKEY: root.pub },
  { epochs: epoch, statement: { ...body, old_sig: oldSig, root_sig: rootSig } },
);
assert.equal(accepted.ok, true, JSON.stringify(accepted));
assert.equal(accepted.provenance.public_key, newKey.pub);

const pinnedStillSigns = await heldSignerFromEnv(envNew, { epochs: [], pinned: [newKey.pub] });
assert.equal(pinnedStillSigns.ok, true);

// Unreadable witness log refuses signing. A readable log with no key id does not.
const witnessOff = await heldSignerFromEnv(envNew, { witnessLogOk: false });
assert.equal(witnessOff.ok, false);
assert.equal(witnessOff.code, "KEY-WITNESS-UNREADABLE");
const noKey = await heldSignerFromEnv({}, { witnessLogOk: false });
assert.equal(noKey.ok, false);
assert.equal(noKey.code, undefined);
assert.match(noKey.reason, /no receipt signing key/);

globalThis.fetch = async () => { throw new Error("witness log offline"); };
const handler = (await import("../src/index.js")).default.fetch;
const { resetAnchorMemo } = await import("../src/anchor.js");
resetAnchorMemo();
const base = { RECEIPT_SIGNING_KEY: newKey.priv, RECEIPT_SIGNING_PUBLIC_KEY: newKey.pub };
const env = { ...base, SESSION: memorySessionNamespace(base) };
const open = await handler(new Request("https://rt.example/v1/session/open", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env);
const opened = await open.json();
assert.equal(open.status, 200, JSON.stringify(opened));
assert.equal(opened.receipt.signature.sig, null);
assert.equal(opened.receipt.signature.code, "KEY-WITNESS-UNREADABLE");

const headsRes = await handler(new Request("https://rt.example/v1/anchor/heads"), env);
const heads = await headsRes.json();
assert.equal(heads.second_mint.code, "KEY-WITNESS-UNREADABLE");
assert.equal(heads.second_mint.ok, false);
resetAnchorMemo();

console.log("ok key guard");
