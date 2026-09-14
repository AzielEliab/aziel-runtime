/**
 * REHEAL — isolation is the cure.
 *
 * A tampered node heals from its own last good tip + a verified trusted
 * pull, OR phoenix-WAIT. Never by listening to neighbors.
 * Allowed on the wire: live / locked / isolated / tip-hash.
 * Forbidden: bodies / diffs / vote-to-fix.
 * Neighbor talk-back-to-health is a group hug over a wound.
 *
 * Companion: SPLIT-WIRES-1.0, COLD-COPY-1.0, RE-EXPAND-1.0, NODE-OPS-1.0
 * Author: Aziel Eliab only.
 */

import { FORBIDDEN_TICK_KEYS, isSha256Hex } from "./split-wires.js";

export const REHEAL = "REHEAL-1.0";
export const REHEAL_AUTHOR = "Aziel Eliab";
export const REHEAL_ALLOWED = Object.freeze(["live", "locked", "isolated", "tip-hash"]);
export const REHEAL_FORBIDDEN = Object.freeze(["body", "diff", "vote-to-fix"]);

export const REHEAL_SHORT =
  "Isolation is the cure. Heal from own last good tip + verified trusted pull, or phoenix-WAIT. Never by listening to neighbors. Allowed: live/locked/isolated/tip-hash. Forbidden: bodies/diffs/vote-to-fix. Neighbor talk-back-to-health is a group hug over a wound.";

export const REHEAL_LAW = Object.freeze({
  spec: REHEAL,
  author: REHEAL_AUTHOR,
  identity: "Aziel Eliab",
  isolation_is_the_cure: true,
  neighbor_heal: false,
  listen_to_neighbors: false,
  vote_to_fix: false,
  bodies: false,
  diffs: false,
  heal_from: "own last good tip + verified trusted pull, or phoenix-WAIT",
  allowed: REHEAL_ALLOWED,
  forbidden: REHEAL_FORBIDDEN,
  group_hug: "Neighbor talk-back-to-health is a group hug over a wound.",
  short: REHEAL_SHORT,
  die_with_pull: true,
  split_wires: true,
  cold_copy: true,
  re_expand: true,
});

export function neighborTalkHeal() {
  return {
    ok: false,
    spec: REHEAL,
    code: "MESH-NO-NEIGHBOR-HEAL",
    neighbor_heal: false,
    vote_to_fix: false,
    isolation_is_the_cure: true,
    reason: "group-hug-over-a-wound",
  };
}

/** Isolation is the cure. Neighbor talk is not. */
export function rehealFromOwnTip(input = {}) {
  const neighbor =
    input.neighbor_heal === true ||
    input.listen_neighbors === true ||
    input.listen_to_neighbors === true ||
    input.heal_from_neighbors === true ||
    input.talk_back === true;
  const vote = input.vote_to_fix === true || input.majority_vote === true;
  const banned = forbiddenHealKeys(input);
  const body = banned.length > 0 || input.bodies === true || input.diffs === true;

  if (neighbor || vote || body) {
    return {
      ok: false,
      spec: REHEAL,
      code: "MESH-NO-NEIGHBOR-HEAL",
      isolate: true,
      heal: false,
      isolation_is_the_cure: true,
      neighbor_heal: false,
      vote_to_fix: false,
      refused_keys: banned,
      reason: neighbor ? "group-hug-over-a-wound" : vote ? "vote-to-fix-refused" : "body-or-diff-refused",
      presence: "isolated",
    };
  }

  const wait =
    input.phoenix_wait === true ||
    String(input.phoenix || "").toUpperCase() === "WAIT" ||
    String(input.phoenix_lock || "").toLowerCase() === "wait";
  if (wait) {
    return {
      ok: true,
      spec: REHEAL,
      path: "phoenix-WAIT",
      heal: false,
      wait: true,
      isolation_is_the_cure: true,
      neighbor_heal: false,
      vote_to_fix: false,
    };
  }

  const own = normalizeHash(input.own_last_good_tip || input.held_prev);
  const cited = normalizeHash(input.cited_prev || input.trusted_tip);
  const trustedPull = input.trusted_pull === true || input.verified_trusted_pull === true;
  const verified = input.verified === true;
  if (own && cited && own === cited && trustedPull && verified) {
    return {
      ok: true,
      spec: REHEAL,
      path: "own-tip-trusted-pull",
      heal: true,
      isolation_is_the_cure: true,
      neighbor_heal: false,
      vote_to_fix: false,
    };
  }

  return {
    ok: false,
    spec: REHEAL,
    isolate: true,
    heal: false,
    isolation_is_the_cure: true,
    neighbor_heal: false,
    reason: "stay-isolated",
    presence: "isolated",
  };
}

export function isolationIsCure() {
  return {
    spec: REHEAL,
    isolation_is_the_cure: true,
    neighbor_heal: false,
    vote_to_fix: false,
    allowed: REHEAL_ALLOWED.slice(),
    forbidden: REHEAL_FORBIDDEN.slice(),
  };
}

function forbiddenHealKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj).filter((k) => FORBIDDEN_TICK_KEYS.includes(String(k).toLowerCase()));
}

function normalizeHash(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return isSha256Hex(s) ? s : "";
}
