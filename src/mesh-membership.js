/**
 * Durable mesh membership for human and site presence.
 *
 * {slug}-worker suite-presence keeps PRESENCE_TTL_MS (5 minutes) and does
 * not use this cadence. A missed beat marks a registered row stale. It does
 * not delete the row. One later beat restores the declared presence. Explicit
 * leave deletes immediately. The grace window deletes a row that never beats
 * again. Stale rows do not count as Live Nodes.
 *
 * The join session seal is SHA-256 of the canonical session fields. This
 * Worker does not hold a mesh-join signing key. FED-MESH handle signatures
 * stay on the relay. A missing or mismatched seal does not count as live.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRESENCE_TTL_MS = 5 * 60 * 1000;
export const REGISTERED_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
export const HEARTBEAT_MISS_N = 3;
export const DEFAULT_HEARTBEAT_MODE = "idle";
export const HEARTBEAT_MODES = Object.freeze(["active", "idle", "asleep"]);
export const JOIN_SESSION_SEAL_V = "mesh-join-session-v1";
export const FUTURE_STAMP_MS = 60 * 1000;

/** Expected beat spacing. Stale begins after HEARTBEAT_MISS_N times max_ms. */
export const HEARTBEAT_INTERVAL_MS = Object.freeze({
  active: Object.freeze({ min_ms: 15_000, max_ms: 30_000 }),
  idle: Object.freeze({ min_ms: 2 * 60 * 1000, max_ms: 5 * 60 * 1000 }),
  asleep: Object.freeze({ min_ms: 15 * 60 * 1000, max_ms: 30 * 60 * 1000 }),
});

const MODE_ALIASES = Object.freeze({
  background: "idle",
  backgrounded: "asleep",
  asleep: "asleep",
  sleep: "asleep",
  active: "active",
  idle: "idle",
});

export function sanitizeHeartbeatMode(raw, fallback = DEFAULT_HEARTBEAT_MODE) {
  if (raw == null || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MODE_ALIASES, s)) return MODE_ALIASES[s];
  return "";
}

export function heartbeatBand(mode) {
  return HEARTBEAT_INTERVAL_MS[mode] || HEARTBEAT_INTERVAL_MS[DEFAULT_HEARTBEAT_MODE];
}

export function staleAfterMs(mode) {
  return HEARTBEAT_MISS_N * heartbeatBand(mode).max_ms;
}

function declaredClass(declared) {
  if (declared === "locked" || declared === "isolated") return declared;
  return "live";
}

/**
 * durable=false is the {slug}-worker drop (5 minutes, no stale class).
 * durable=true stays registered until grace, and is stale after N missed beats.
 * A last_seen far in the future is not live.
 */
export function membershipClass({ lastSeenMs, now, mode, declared, durable }) {
  const seen = Number(lastSeenMs) || 0;
  const clock = Number(now);
  const t = Number.isFinite(clock) ? clock : Date.now();
  if (!seen) return "dropped";
  if (seen - t > FUTURE_STAMP_MS) return durable ? "stale" : "dropped";
  const age = Math.max(0, t - seen);
  if (!durable) {
    if (age > PRESENCE_TTL_MS) return "dropped";
    return declaredClass(declared);
  }
  if (age > REGISTERED_GRACE_MS) return "dropped";
  const bandMode = HEARTBEAT_INTERVAL_MS[mode] ? mode : DEFAULT_HEARTBEAT_MODE;
  if (age > staleAfterMs(bandMode)) return "stale";
  return declaredClass(declared);
}

export function joinSessionCanonical(node) {
  const src = node && typeof node === "object" ? node : {};
  const mode = sanitizeHeartbeatMode(src.heartbeat_mode, DEFAULT_HEARTBEAT_MODE) || DEFAULT_HEARTBEAT_MODE;
  return [
    JOIN_SESSION_SEAL_V,
    String(src.node_id || ""),
    String(src.product || ""),
    String(src.session_id || ""),
    String(src.joined_at || ""),
    String(src.kind || ""),
    mode,
  ].join("\n");
}

export async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input == null ? "" : String(input));
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sealJoinSession(node) {
  const session_seal = await sha256Hex(joinSessionCanonical(node));
  return { session_seal, session_seal_v: JOIN_SESSION_SEAL_V };
}

export function membershipCite() {
  return {
    spec: "MESH-MEMBERSHIP-1.0",
    registered_grace_ms: REGISTERED_GRACE_MS,
    registered_grace_days: 14,
    heartbeat_miss_n: HEARTBEAT_MISS_N,
    default_heartbeat_mode: DEFAULT_HEARTBEAT_MODE,
    heartbeat_intervals: {
      active: { ...HEARTBEAT_INTERVAL_MS.active, label: "active ~15–30s" },
      idle: { ...HEARTBEAT_INTERVAL_MS.idle, label: "idle background ~2–5 min" },
      asleep: { ...HEARTBEAT_INTERVAL_MS.asleep, label: "asleep/backgrounded ~15–30 min" },
    },
    stale_after_ms: {
      active: staleAfterMs("active"),
      idle: staleAfterMs("idle"),
      asleep: staleAfterMs("asleep"),
    },
    software_presence_ttl_ms: PRESENCE_TTL_MS,
    software_user_heartbeat: false,
    presence_ttl_applies_to: "{slug}-worker",
    session_seal: "sha256",
    session_seal_v: JOIN_SESSION_SEAL_V,
    signing_key_held: false,
    stale_counts_as_live: false,
    fail_closed: true,
    invent_users: false,
    leave_deletes: true,
    note:
      "Human and other non-worker join sessions stay registered until explicit leave or 14 days after the last beat. Adaptive heartbeat: active 15–30s, idle 2–5 min, asleep 15–30 min. Miss 3 beats and the class is stale, not deleted. One beat restores the declared presence. Stale rows do not count as Live Nodes. {slug}-worker suite-presence still drops after 5 minutes and has no user heartbeat. The session seal is SHA-256 of the canonical join fields. This Worker does not hold a mesh-join signing key. Site viewer rows are hub counts, not invented people.",
  };
}
