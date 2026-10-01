/**
 * Bounded replay cache. Keyed by network, sender session key, and message id.
 * A full cache evicts the oldest entry. That bound is not infinite memory.
 * Author: Aziel Eliab only.
 */

export const REPLAY_CODE = "AZP-REPLAY";

function fail(message) {
  return { ok: false, code: REPLAY_CODE, fail_closed: true, message };
}

export function createReplayCache({ cap = 1024 } = {}) {
  const limit = Number(cap);
  if (!Number.isInteger(limit) || limit < 1) {
    return { ok: false, code: "AZP-REFUSE", fail_closed: true, message: "Replay cache cap must be a positive integer." };
  }
  return { ok: true, cap: limit, entries: new Map() };
}

function cacheKey(entry) {
  return `${entry.network_id}\n${entry.sender}\n${entry.message_id}`;
}

export function sweepReplay(cache, now = Date.now()) {
  if (!cache || !cache.entries) return { ok: false, code: "AZP-REFUSE", fail_closed: true, message: "Replay cache is missing." };
  const t = Number(now);
  for (const [key, row] of cache.entries) {
    if (Number.isFinite(row.expires_at) && t >= row.expires_at) cache.entries.delete(key);
  }
  return { ok: true, size: cache.entries.size };
}

export function rememberReplay(cache, entry, now = Date.now()) {
  if (!cache || !cache.ok || !cache.entries) {
    return { ok: false, code: "AZP-REFUSE", fail_closed: true, message: "Replay cache is missing." };
  }
  if (!entry || !entry.network_id || !entry.sender || !entry.message_id) {
    return { ok: false, code: "AZP-REFUSE", fail_closed: true, message: "Replay identity is incomplete. Fail closed." };
  }
  sweepReplay(cache, now);
  const key = cacheKey(entry);
  if (cache.entries.has(key)) return fail("Envelope was already accepted. Refused.");
  while (cache.entries.size >= cache.cap) {
    const oldest = cache.entries.keys().next().value;
    cache.entries.delete(oldest);
  }
  cache.entries.set(key, {
    expires_at: Number(entry.expires_at),
    seen_at: Number(now),
  });
  return { ok: true, size: cache.entries.size };
}
