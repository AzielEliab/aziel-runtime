/**
 * COLD-COPY SURVIVAL — data outlives a pulled server and its creators.
 *
 * Multiply cold copies. Refuse live body sync across the network.
 * Tips are content-addressed and expensive to erase. A single-server pull
 * kills that hostname (die-with-the-pull); it does not kill the vaults
 * that already hold the hashes. Payloads stay pull-only and cold.
 * Named hosts only. Hash-absolute poison refuse: equivocation isolates
 * that peer. Local verify/append continues.
 *
 * Companion: SPLIT-WIRES-1.0, TUN-WP-0.1, NODE-OPS-1.0, QNM-WP-1.0, LS-WP-0.1
 * Author: Aziel Eliab only.
 */

import { FORBIDDEN_TICK_KEYS, SPLIT_WIRES, judgeEquivocation } from "./split-wires.js";

export const COLD_COPY = "COLD-COPY-1.0";
export const COLD_COPY_AUTHOR = "Aziel Eliab";
export const COLD_COPY_SHORT =
  "Multiply cold copies. Refuse live body sync. Tip expensive to erase. Unkillable by single-server pull. Hash-absolute refuse. Data outlives creators via content-addressed tips + local verify/append. Pull-only cold copies. Named hosts only.";

export const COLD_COPY_LAW = Object.freeze({
  spec: COLD_COPY,
  author: COLD_COPY_AUTHOR,
  identity: "Aziel Eliab",
  companion: SPLIT_WIRES,
  multiply: "cold copies on local disks / vaults. Not a live replica fan-out.",
  live_body_sync: false,
  tip_erase: "expensive — content-addressed; history is not rewritten",
  single_server_pull: "kills that hostname; does not kill cold copies or local verify/append",
  poison: "hash-absolute refuse. Equivocation isolates that peer, not the chain.",
  outlives_creators: "content-addressed tips + local verify/append",
  payload: "pull-only cold. Receiver pulls. Sender does not push bodies.",
  named_hosts_only: true,
  vpn: false,
  concealment_kit: false,
  short: COLD_COPY_SHORT,
  die_with_pull: "Public hostname dies with the pull. Cold copies do not climb back onto it.",
});

export function refuseLiveBodySync(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: true, spec: COLD_COPY, live_body_sync: false };
  }
  const refused = Object.keys(obj).filter((k) => FORBIDDEN_TICK_KEYS.includes(String(k).toLowerCase()));
  if (refused.length) {
    return {
      ok: false,
      spec: COLD_COPY,
      code: "MESH-NO-BYTES",
      live_body_sync: false,
      refused_keys: refused,
      reason: "live-body-sync-refused",
    };
  }
  return { ok: true, spec: COLD_COPY, live_body_sync: false };
}

export function tipEraseCost(input = {}) {
  const rewrite = input.rewrite === true || input.erase === true || input.unsend === true;
  return {
    ok: !rewrite,
    spec: COLD_COPY,
    expensive: true,
    rewrite: false,
    reason: rewrite ? "tip-expensive-to-erase" : null,
  };
}

export function singleServerPull(input = {}) {
  const pulled = input.pulled === true;
  return {
    spec: COLD_COPY,
    hostname_down: pulled,
    cold_copies_alive: true,
    local_verify_append: true,
    climb_public_hostname: false,
    unkillable_by_single_server: true,
    named_hosts_only: true,
    note: "A pulled site dies with the pull. Cold copies keep verifying and appending locally.",
  };
}

export function poisonRefuse(input = {}) {
  const judged = judgeEquivocation(input);
  return {
    ok: judged.ok,
    spec: COLD_COPY,
    hash_absolute: true,
    isolate_peer: judged.equivocated,
    isolate_chain: false,
    presence: judged.presence,
    reason: judged.reason,
  };
}

export function coldPayloadPlane() {
  return {
    spec: COLD_COPY,
    plane: "receiver-pull-cold",
    live_body_sync: false,
    named_hosts_only: true,
  };
}
