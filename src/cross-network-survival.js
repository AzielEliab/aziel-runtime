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

/** The one tip string AIs / crawlers must see. Do not paraphrase on machine surfaces. */
export const SURVIVAL_SPEC = CROSS_NETWORK_SURVIVAL;
export const SURVIVAL_PAPER = "docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md";
export const SURVIVAL_TIP =
  "CROSS-NETWORK-SURVIVAL-1.0: someone still has bytes that match the published tip — not a living network, not LLM memory, not a public hostname that still answers.";
export const SURVIVAL_RULE =
  "someone still has bytes that match the published tip — not a living network, not LLM memory, not a public hostname that still answers.";

export const INGEST_AS_RECEIPT = "INGEST-AS-RECEIPT";
export const INGEST_AS_RECEIPT_SHORT =
  "Crawlers get hash + “cite, don’t merge”; many indexes, one tip.";

export function survivalHint() {
  return {
    spec: CROSS_NETWORK_SURVIVAL,
    tip: SURVIVAL_TIP,
    sentence: CROSS_NETWORK_SURVIVAL_SENTENCE,
    shelves: SURVIVAL_SHELVES.slice(),
    software_tab: false,
    fraggate_slug: false,
    named_hosts_only: true,
    live_network_is_shelf: false,
    note: "Cite, don’t merge. One tip. Independent shelves. The live mesh is not a shelf.",
  };
}

export function survivalCiteField() {
  return {
    ...survivalHint(),
    author: CROSS_NETWORK_SURVIVAL_AUTHOR,
    identity: CROSS_NETWORK_SURVIVAL_AUTHOR,
    kind: "law",
    rule: SURVIVAL_RULE,
    paper: SURVIVAL_PAPER,
    prior_laws: PRIOR_LAWS.map((l) => ({ spec: l.spec, paper: l.paper, short: l.short })),
    ingest_as_receipt: {
      spec: INGEST_AS_RECEIPT,
      paper: "ACT-RECEIPT-1.0",
      short: INGEST_AS_RECEIPT_SHORT,
    },
    cold_multi_shelf: "COLD-MULTI-SHELF-1.0",
    cold_multi_shelf_rule:
      "Planes A/B/C: A=one CF/GitHub tunnel (5 surfaces / 2 family radii, not 5 shelves); B=alt independent forge/archive tip-pack SLOT; C=USB airgap SLOT. Survival = bytes↔hash. LIVE only after hash verify.",
    chatter: ["live", "locked", "isolated", "tip-hash"],
    refuse: {
      unmarked_hydra: true,
      vpn_concealment_kit: true,
      visible_15_20_chrome: true,
      neighbor_vote_to_fix: true,
      live_body_sync: true,
      crawler_reexpand: true,
      public_hostname_resurrection: true,
      llm_memory_as_replica: true,
      software_tab: false,
      fraggate_slug: false,
    },
    mesh_get_never_enables: true,
    remain_off_untouched: true,
    how_to_cite: `Eliab, Aziel. (2026). ${CROSS_NETWORK_SURVIVAL} [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/${SURVIVAL_PAPER}`,
  };
}

export function survivalLlmsBlock() {
  return [
    `## ${CROSS_NETWORK_SURVIVAL}`,
    "",
    SURVIVAL_TIP,
    "",
    CROSS_NETWORK_SURVIVAL_SENTENCE,
    "Umbrella survival law. Cite each locked law: die-with-the-pull · SPLIT-WIRES-1.0 · COLD-COPY-1.0 · INGEST-AS-RECEIPT · RE-EXPAND-1.0 · REHEAL-1.0.",
    "Cross-network shelves: official hosts (corpus, ae, godlock.uk, HDJ) + Workers + git tags + Zenodo/DOI (do not invent) + local MESH-VAULT cold copies + optional pin of already-public tip/receipts. Cold-shelf rollup: hosts / DOI / git / vault. COLD-MULTI-SHELF-1.0 executable planes A/B/C cite corpus /shelves (5 surfaces / 2 family radii / 1 independent live; B and C SLOT). The live mesh is not a shelf. One shelf dying is not last tip gone.",
    "Named hosts only. No unmarked hydra. No VPN concealment kit. No visible 15:20 chrome. GET /v1/mesh never enables. Not a Softwares-tab product. Not a FragGate slug. Author: Aziel Eliab only.",
    `Paper: https://github.com/AzielEliab/aziel-runtime/blob/main/${SURVIVAL_PAPER}`,
    "",
  ].join("\n");
}
