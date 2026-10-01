/**
 * Shared fixtures for AZP-NS-1.0 gate scripts.
 * Iterations stay at the keystore minimum so the scripts finish in CI.
 * Production createKeystore() still defaults to KEYSTORE_ITERATIONS.
 */
import { createKeystore, exportPublicIdentity, loadKey } from "../src/security/keystore.js";
import { utf8 } from "../src/security/canonical.js";
import { signBytes } from "../src/security/signatures.js";
import { createSessionIdentity } from "../src/security/session-identity.js";

export const PASSPHRASE = "azp-ns-test-passphrase";
export const ITERATIONS = 100_000;
export const NOW = 1_750_000_000_000;

export async function nodeKeystore(extra = {}) {
  return createKeystore({ passphrase: PASSPHRASE, iterations: ITERATIONS, ...extra });
}

export async function sessionFor(keystore, extra = {}) {
  return createSessionIdentity({ keystore, ttlMs: 60_000, now: NOW, ...extra });
}

export async function pair() {
  const aliceKs = await nodeKeystore();
  const bobKs = await nodeKeystore();
  const alice = await sessionFor(aliceKs);
  const bob = await sessionFor(bobKs);
  return { aliceKs, bobKs, alice, bob, now: NOW };
}

export function signerFor(opened) {
  const pub = exportPublicIdentity(opened);
  const key = loadKey(opened, "node-sign");
  return {
    public_key: pub.node_public_key,
    sign: (text) => signBytes(key.privateKey, utf8(text)),
  };
}
