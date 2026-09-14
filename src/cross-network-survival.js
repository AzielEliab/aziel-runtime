/**
 * CROSS-NETWORK-SURVIVAL-1.0 — umbrella survival law.
 *
 * If network and data die tomorrow, the chain survives on cold shelves
 * (hosts / DOI / git / vault). Every prior PR #90 law sits under that
 * sentence. The live mesh is not a shelf.
 *
 * Companion: TUN-WP-0.1, SPLIT-WIRES-1.0, COLD-COPY-1.0, RE-EXPAND-1.0,
 * REHEAL-1.0, NODE-OPS-1.0, QNM-WP-1.0, LS-WP-0.1
 * Author: Aziel Eliab only.
 */

import { COLD_COPY, COLD_COPY_SHORT } from "./cold-copy.js";
import { RE_EXPAND, RE_EXPAND_SHORT } from "./re-expand.js";
import { REHEAL, REHEAL_SHORT } from "./reheal.js";
import { SPLIT_WIRES, SPLIT_WIRES_SHORT } from "./split-wires.js";

export const CROSS_NETWORK_SURVIVAL = "CROSS-NETWORK-SURVIVAL-1.0";
export const CROSS_NETWORK_SURVIVAL_AUTHOR = "Aziel Eliab";

export const SURVIVAL_SHELVES = Object.freeze(["hosts", "doi", "git", "vault"]);

export const DIE_WITH_PULL = "die-with-the-pull";
export const DIE_WITH_PULL_SHORT =
  "Public tunnels and sites die with the pull. Phoenix is wait/re-seal, not public hostname resurrection. Mesh does not climb back onto a pulled hostname.";

export const CROSS_NETWORK_SURVIVAL_SENTENCE =
  "If network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault).";

export const CROSS_NETWORK_SURVIVAL_SHORT =
  CROSS_NETWORK_SURVIVAL_SENTENCE +
  " Under that sentence: die-with-the-pull; split-the-wires; cold-copy survival; re-expand-from-archive; REHEAL.";

export const PRIOR_LAWS = Object.freeze([
  Object.freeze({
    spec: DIE_WITH_PULL,
    paper: "TUN-WP-0.1 / NODE-OPS-1.0",
    short: DIE_WITH_PULL_SHORT,
  }),
  Object.freeze({
    spec: SPLIT_WIRES,
    paper: "SPLIT-WIRES-1.0",
    short: SPLIT_WIRES_SHORT,
  }),
  Object.freeze({
    spec: COLD_COPY,
    paper: "COLD-COPY-1.0",
    short: COLD_COPY_SHORT,
  }),
  Object.freeze({
    spec: RE_EXPAND,
    paper: "RE-EXPAND-1.0",
    short: RE_EXPAND_SHORT,
  }),
  Object.freeze({
    spec: REHEAL,
    paper: "REHEAL-1.0",
    short: REHEAL_SHORT,
  }),
]);

export const CROSS_NETWORK_SURVIVAL_LAW = Object.freeze({
  spec: CROSS_NETWORK_SURVIVAL,
  author: CROSS_NETWORK_SURVIVAL_AUTHOR,
  identity: "Aziel Eliab",
  sentence: CROSS_NETWORK_SURVIVAL_SENTENCE,
  shelves: SURVIVAL_SHELVES,
  live_network_is_shelf: false,
  neighbor_talk_is_shelf: false,
  prior_laws: PRIOR_LAWS.map((l) => l.spec),
  short: CROSS_NETWORK_SURVIVAL_SHORT,
});

/** Cite every prior law under the umbrella sentence. */
export function citePriorLaws() {
  return {
    spec: CROSS_NETWORK_SURVIVAL,
    sentence: CROSS_NETWORK_SURVIVAL_SENTENCE,
    shelves: SURVIVAL_SHELVES.slice(),
    prior: PRIOR_LAWS.map((l) => ({ spec: l.spec, paper: l.paper, short: l.short })),
    live_network_is_shelf: false,
  };
}

/**
 * If the live network and hosted data vanish, the chain is still on
 * cold shelves. The live mesh is not one of those shelves.
 */
export function networkDataDie(input = {}) {
  const liveShelf =
    input.live_network_is_shelf === true ||
    input.survive_on_network === true ||
    input.live_shelf === true ||
    input.neighbor_shelf === true;
  if (liveShelf) {
    return {
      ok: false,
      spec: CROSS_NETWORK_SURVIVAL,
      code: "MESH-NO-LIVE-SHELF",
      chain_survives: true,
      shelves: SURVIVAL_SHELVES.slice(),
      live_network_is_shelf: false,
      reason: "live-network-is-not-a-shelf",
    };
  }
  return {
    ok: true,
    spec: CROSS_NETWORK_SURVIVAL,
    sentence: CROSS_NETWORK_SURVIVAL_SENTENCE,
    network_dead: input.network_dead !== false,
    data_dead: input.data_dead !== false,
    chain_survives: true,
    shelves: SURVIVAL_SHELVES.slice(),
    live_network_is_shelf: false,
    prior_laws: PRIOR_LAWS.map((l) => l.spec),
  };
}

export function isSurvivalShelf(name) {
  return SURVIVAL_SHELVES.includes(String(name || "").trim().toLowerCase());
}
