/**
 * Dumb relay. It stores and forwards opaque envelopes.
 * It has no decryption key and no long-term user identity.
 * Author: Aziel Eliab only.
 */

import { negotiateVersion } from "./routing.js";

const FORBIDDEN = ["plaintext", "payload", "email", "token", "password", "passphrase", "private_key", "seed", "authorization"];

function fail(code, message) {
  return { ok: false, code, fail_closed: true, message };
}

function forbidden(envelope) {
  if (!envelope || typeof envelope !== "object") return "envelope";
  const keys = Object.keys(envelope).map((key) => key.toLowerCase());
  return FORBIDDEN.find((name) => keys.includes(name)) || "";
}

export function createRelay({ id, retentionMs = 60_000 } = {}) {
  const name = String(id || "").trim();
  if (!name) return fail("AZP-REFUSE", "Relay id is required.");
  return {
    ok: true,
    id: name,
    retentionMs: Number(retentionMs) || 60_000,
    box: new Map(),
    log: [],
    can_decrypt: false,
    sees_plaintext: false,
    trust_anchor: false,
  };
}

export function relayAccept(relay, envelope, now = Date.now()) {
  if (!relay || !relay.ok || !relay.box) return fail("AZP-REFUSE", "Relay is missing.");
  const named = forbidden(envelope);
  if (named) return fail("AZP-RELAY-PLAINTEXT", "Relay refuses an envelope that names plaintext or secrets.");
  const version = negotiateVersion(envelope && envelope.version);
  if (!version.ok) return version;
  const exp = Date.parse(envelope.expires_at);
  const t = Number(now);
  if (!Number.isFinite(exp) || t >= exp) return fail("AZP-EXPIRED", "Relay drops an expired envelope.");
  if (!envelope.message_id || !envelope.ciphertext || !envelope.auth_tag) {
    return fail("AZP-REFUSE", "Relay refuses an incomplete envelope.");
  }
  const opaque = JSON.parse(JSON.stringify(envelope));
  relay.box.set(envelope.message_id, { envelope: opaque, accepted_at: t, expires_at: exp });
  relay.log.push({
    at: t,
    relay_id: relay.id,
    message_id: envelope.message_id,
    bytes: JSON.stringify(opaque).length,
    route_class: envelope.route_class || "",
    recipient_hint: envelope.recipient_hint || "",
  });
  return { ok: true, relay_id: relay.id, message_id: envelope.message_id, can_decrypt: false };
}

export function relayForward(relay, messageId) {
  if (!relay || !relay.box) return fail("AZP-REFUSE", "Relay is missing.");
  const row = relay.box.get(messageId);
  if (!row) return fail("AZP-REFUSE", "Relay has no such envelope.");
  return { ok: true, relay_id: relay.id, envelope: JSON.parse(JSON.stringify(row.envelope)), can_decrypt: false };
}

export function relayStored(relay, messageId) {
  if (!relay || !relay.box) return null;
  const row = relay.box.get(messageId);
  return row ? row.envelope : null;
}

export function relayDropExpired(relay, now = Date.now()) {
  if (!relay || !relay.box) return fail("AZP-REFUSE", "Relay is missing.");
  const t = Number(now);
  let dropped = 0;
  for (const [id, row] of relay.box) {
    if (t >= row.expires_at || t - row.accepted_at >= relay.retentionMs) {
      relay.box.delete(id);
      dropped += 1;
    }
  }
  return { ok: true, dropped, retained: relay.box.size };
}

export function relayLog(relay) {
  return relay && Array.isArray(relay.log) ? relay.log.map((row) => ({ ...row })) : [];
}

export function relayDump(relay) {
  if (!relay || !relay.ok) return fail("AZP-REFUSE", "Relay is missing.");
  return {
    ok: true,
    id: relay.id,
    can_decrypt: false,
    sees_plaintext: false,
    trust_anchor: false,
    messages: [...relay.box.values()].map((row) => JSON.parse(JSON.stringify(row.envelope))),
    log: relayLog(relay),
  };
}
