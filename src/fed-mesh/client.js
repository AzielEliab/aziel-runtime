/**
 * Node-side helpers. Private keys stay in the identity object the caller holds.
 * Author: Aziel Eliab only.
 */

import { hashStatement } from "./codec.js";
import { sealPlaintext, openCiphertext } from "./e2e.js";
import { signObject } from "./identity.js";
import { actStatement } from "./relay.js";
import { FED_SPEC, ZERO_HASH } from "./spec.js";

export function emptyChain() {
  return { seq: 0, prev: ZERO_HASH };
}

export async function signAct(identity, kind, fields) {
  const body = {
    v: FED_SPEC,
    kind,
    handle: identity.handle,
    public_key: identity.public_key,
    ...fields,
  };
  const statement = actStatement(kind, body);
  const sig = await signObject(identity.privateKey, statement);
  return { ...body, sig };
}

export async function sealAct(identity, { to, recipientEncPublicKey, seq, prev, plaintext, via }) {
  const sealed = await sealPlaintext({
    fromHandle: identity.handle,
    toHandle: to,
    seq,
    recipientEncPublicKey,
    plaintext,
  });
  if (!sealed) return null;
  return signAct(identity, "msg", {
    to,
    seq,
    prev,
    ...sealed,
    ...(via ? { via } : {}),
  });
}

export async function openAct(identity, envelope) {
  return openCiphertext({
    encPrivateKey: identity.encPrivateKey,
    fromHandle: envelope.handle,
    toHandle: envelope.to,
    seq: envelope.seq,
    nonce: envelope.nonce,
    eph_public_key: envelope.eph_public_key,
    ciphertext: envelope.ciphertext,
  });
}

export async function actHash(envelope) {
  return hashStatement(envelope);
}
