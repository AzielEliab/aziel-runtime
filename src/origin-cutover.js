/**
 * ORIGIN-CUTOVER-1.0 — Sidenet P3 home-origin / mini-PC path.
 *
 * Layered beside the live Cloudflare hubs. This module does not rent DNS,
 * does not change live DNS, and does not mark a shelf LIVE without a
 * hash-verified deposit. Home origin stays SLOT until operator facts exist.
 *
 * Phoenix is local wait / re-seal (REHEAL-1.0). It does not resurrect a
 * pulled public hostname and neighbors do not phoenix because a neighbor did.
 *
 * Author: Aziel Eliab only. Not a Softwares-tab product. Not a FragGate slug.
 */

import { REHEAL, REHEAL_ALLOWED, REHEAL_LAW } from "./reheal.js";

export const ORIGIN_CUTOVER = "ORIGIN-CUTOVER-1.0";
export const ORIGIN_CUTOVER_AUTHOR = "Aziel Eliab";
export const ORIGIN_CUTOVER_DOCS = "docs/designs/ORIGIN-CUTOVER-1.0.md";
export const HOME_ORIGIN_CHECKLIST = "tools/cold_shelf/HOME-ORIGIN-MINI-PC.md";
export const SIDENET_PHASE = "P3";
export const HOME_ORIGIN_ID = "home-origin-mini-pc";

export const REFUSE = Object.freeze({
  NO_DNS_RENT: "OC-NO-DNS-RENT",
  NO_LIVE_DNS_CHANGE: "OC-NO-LIVE-DNS-CHANGE",
  NO_INVENTED_HOST: "OC-NO-INVENTED-HOST",
  HOME_ORIGIN_SLOT: "OC-HOME-ORIGIN-SLOT",
  NOT_DEPOSITED: "OC-NOT-DEPOSITED",
  NO_OPERATOR_FACTS: "OC-NO-OPERATOR-FACTS",
  PHOENIX_LOCAL_ONLY: "MESH-STUB",
  NO_NEIGHBOR_HEAL: "MESH-NO-NEIGHBOR-HEAL",
  ZENODO_NOT_LIVE: "CNS-ZENODO-NOT-LIVE",
  NO_TIP_DOI: "CNS-NO-TIP-DOI",
});

export const PHOENIX_REHEAL_CITE = Object.freeze({
  reheal: REHEAL,
  isolation_is_the_cure: REHEAL_LAW.isolation_is_the_cure === true,
  phoenix: "phoenix-WAIT",
  phoenix_local_only: true,
  neighbor_phoenix: false,
  public_hostname_resurrection: false,
  neighbor_heal: false,
  vote_to_fix: false,
  allowed: REHEAL_ALLOWED.slice(),
  note:
    "Phoenix is local wait / re-seal on the failed node. Neighbors do not phoenix because a neighbor phoenix'd. " +
    "A home-origin path does not resurrect a pulled public hostname. " +
    "REHEAL-1.0: own last good tip + verified trusted pull, or phoenix-WAIT. Never neighbor vote-to-fix.",
});

export const HOME_ORIGIN_SHELF = Object.freeze({
  id: HOME_ORIGIN_ID,
  plane: null,
  layer: "sidenet-p3",
  kind: "other",
  status: "slot",
  url: null,
  hostname: null,
  ip: null,
  dns_rented: false,
  live_dns_changed: false,
  deposited: false,
  hash_verify: null,
  tip_verified: false,
  live_ready: false,
  doi: null,
  blast_radius: "operator-home",
  independent: true,
  lockset_shelf: false,
  published_surface: false,
  software_tab: false,
  breaks_live_cf_hubs: false,
  layered: true,
  live_cf_hubs_unchanged: true,
  phoenix_local_only: true,
  neighbor_phoenix: false,
  public_hostname_resurrection: false,
  reheal: REHEAL,
  refuse: REFUSE.HOME_ORIGIN_SLOT,
  also: Object.freeze([REFUSE.NOT_DEPOSITED, REFUSE.NO_OPERATOR_FACTS, REFUSE.NO_DNS_RENT, REFUSE.NO_LIVE_DNS_CHANGE]),
  checklist: HOME_ORIGIN_CHECKLIST,
  reason:
    "Sidenet P3 home-origin / mini-PC path is SLOT. No operator hostname, no home IP, no rented DNS, no live DNS change, and no deposited bytes in this repo. " +
    "LIVE only after hash verify. Does not replace or retarget the live Cloudflare hubs. Not a sixth published surface.",
});

function refused(reason, note) {
  return {
    accept: false,
    action: "refuse",
    live: false,
    status: "slot",
    reason,
    breaks_live_cf_hubs: false,
    dns_rented: false,
    live_dns_changed: false,
    note,
  };
}

function flagOn(src, keys) {
  return keys.some((key) => src[key] === true);
}

function inventedHost(src) {
  if (src.invent_hostname === true || src.invent_ip === true) return true;
  const host = src.hostname ?? src.host ?? src.domain;
  if (typeof host === "string" && host.trim()) return true;
  const ip = src.ip ?? src.home_ip ?? src.a_record;
  if (typeof ip === "string" && ip.trim()) return true;
  return false;
}

/**
 * Refuse DNS rent, live DNS edits, invented hosts, LIVE promotion, and
 * public phoenix. A quiet call stays SLOT.
 */
export function judgeHomeOrigin(input) {
  const src = input && typeof input === "object" ? input : {};
  if (flagOn(src, ["rent_dns", "dns_rented", "buy_domain", "register_domain"])) {
    return refused(REFUSE.NO_DNS_RENT, "This repo does not rent DNS. No domain is recorded.");
  }
  if (
    flagOn(src, [
      "change_live_dns",
      "swap_a_record",
      "publish_home_ip",
      "point_apex_at_home",
      "retarget_cf_hub",
    ])
  ) {
    return refused(
      REFUSE.NO_LIVE_DNS_CHANGE,
      "Live Cloudflare hub DNS stays. No A-record swap. No home IP on a public name.",
    );
  }
  if (inventedHost(src)) {
    return refused(REFUSE.NO_INVENTED_HOST, "No home hostname or IP is on file. Do not invent one.");
  }
  if (flagOn(src, ["invent_doi", "zenodo_as_plane_b", "zenodo_live"]) || (typeof src.doi === "string" && src.doi.trim())) {
    return refused(REFUSE.ZENODO_NOT_LIVE, "Zenodo Plane B stays blocked. doi null. Do not invent a DOI.");
  }
  if (
    flagOn(src, [
      "phoenix_public",
      "resurrect_hostname",
      "neighbor_phoenix",
      "public_hostname_resurrection",
      "bring_hostname_back",
    ])
  ) {
    return {
      ...refused(
        REFUSE.PHOENIX_LOCAL_ONLY,
        "Phoenix is local wait / re-seal. It does not bring a public hostname back.",
      ),
      reheal: REHEAL,
      phoenix: "phoenix-WAIT",
      phoenix_local_only: true,
      neighbor_phoenix: false,
      public_hostname_resurrection: false,
    };
  }
  if (flagOn(src, ["neighbor_heal", "vote_to_fix", "listen_to_neighbors", "heal_from_neighbors"])) {
    return {
      ...refused(REFUSE.NO_NEIGHBOR_HEAL, "REHEAL-1.0: isolation is the cure. Never neighbor vote-to-fix."),
      reheal: REHEAL,
      neighbor_heal: false,
      vote_to_fix: false,
    };
  }
  if (src.status === "live" || flagOn(src, ["claim_live", "mark_live", "promote_live"])) {
    return refused(
      REFUSE.HOME_ORIGIN_SLOT,
      "Home origin is SLOT. LIVE only after hash verify of a real deposit plus operator facts. None are on file.",
    );
  }
  return {
    accept: true,
    action: "slot",
    live: false,
    status: "slot",
    spec: ORIGIN_CUTOVER,
    id: HOME_ORIGIN_ID,
    deposited: false,
    hash_verify: null,
    dns_rented: false,
    live_dns_changed: false,
    breaks_live_cf_hubs: false,
    layered: true,
    independent_live: false,
    reheal: REHEAL,
    phoenix: "phoenix-WAIT",
    phoenix_local_only: true,
    neighbor_phoenix: false,
  };
}

export function originCutoverCite() {
  return {
    spec: ORIGIN_CUTOVER,
    author: ORIGIN_CUTOVER_AUTHOR,
    identity: ORIGIN_CUTOVER_AUTHOR,
    sidenet: SIDENET_PHASE,
    layer: "home-origin",
    status: "slot",
    paper: ORIGIN_CUTOVER_DOCS,
    checklist: HOME_ORIGIN_CHECKLIST,
    id: HOME_ORIGIN_ID,
    hostname: null,
    ip: null,
    url: null,
    dns_rented: false,
    live_dns_changed: false,
    deposited: false,
    hash_verify: null,
    tip_verified: false,
    doi: null,
    independent_live: false,
    published_surface: false,
    software_tab: false,
    fraggate_slug: false,
    breaks_live_cf_hubs: false,
    layered: true,
    live_cf_hubs_unchanged: true,
    refuse: REFUSE.HOME_ORIGIN_SLOT,
    also: [REFUSE.NOT_DEPOSITED, REFUSE.NO_OPERATOR_FACTS, REFUSE.NO_DNS_RENT, REFUSE.NO_LIVE_DNS_CHANGE],
    zenodo_plane_b_blocked: true,
    zenodo_live: false,
    phoenix_reheal: PHOENIX_REHEAL_CITE,
    note:
      "Sidenet P3 home-origin / mini-PC path is SLOT. No hub docs/origin-cutover deposit was found, and this repo holds no operator hostname, IP, tunnel token, or rented DNS name. " +
      "Live Cloudflare hubs stay the public origins. LIVE only after hash verify. SLOT when not deposited.",
  };
}

/**
 * Operator scaffold. Returns the path a mini-PC may follow later.
 * It does not rent DNS, edit live DNS, or flip any shelf to LIVE.
 */
export function homeOriginScaffold() {
  return {
    spec: ORIGIN_CUTOVER,
    sidenet: SIDENET_PHASE,
    status: "slot",
    layered: true,
    breaks_live_cf_hubs: false,
    live_cf_hubs_unchanged: true,
    dns_rented: false,
    live_dns_changed: false,
    hostname: null,
    ip: null,
    deposited: false,
    hash_verify: null,
    promotes_live: false,
    steps: Object.freeze([
      "Leave the four live Cloudflare hubs on their current names. Do not swap A records and do not publish a home IP.",
      "Do not rent a domain from this repo. No registrar call is included.",
      "A mini-PC may later hold an offline copy of an already-published tip pack and run sha256sum -c or verify-airgap.sh.",
      "A local hash match is not a deposit and does not mark this shelf LIVE.",
      "LIVE requires deposited bytes that hash-verify against the published tip, plus operator facts this repo does not have.",
      "If a public hostname is pulled, phoenix-WAIT on the failed node. Do not point DNS at the mini-PC to bring that name back.",
    ]),
    refuses: Object.freeze([
      REFUSE.NO_DNS_RENT,
      REFUSE.NO_LIVE_DNS_CHANGE,
      REFUSE.NO_INVENTED_HOST,
      REFUSE.HOME_ORIGIN_SLOT,
      REFUSE.NOT_DEPOSITED,
      REFUSE.NO_OPERATOR_FACTS,
    ]),
    phoenix_reheal: PHOENIX_REHEAL_CITE,
    checklist: HOME_ORIGIN_CHECKLIST,
  };
}

function shelfLie(shelf) {
  if (!shelf || typeof shelf !== "object") return "unknown-shelf";
  if (shelf.id === HOME_ORIGIN_ID) {
    if (shelf.status !== "slot") return "home-origin-not-slot";
    if (shelf.deposited === true) return "home-origin-deposited";
    if (shelf.hash_verify != null) return "home-origin-unverified-hash-claim";
    if (shelf.tip_verified === true || shelf.live_ready === true) return "home-origin-live-ready";
    if (shelf.dns_rented === true || shelf.live_dns_changed === true) return "home-origin-dns";
    if (shelf.url || shelf.hostname || shelf.ip) return "home-origin-invented-endpoint";
    if (shelf.doi) return "home-origin-doi";
    if (shelf.published_surface === true) return "home-origin-sixth-surface";
    if (shelf.breaks_live_cf_hubs === true) return "home-origin-breaks-hubs";
  }
  if (shelf.status === "live" && (shelf.plane === "B" || shelf.plane === "C" || shelf.kind === "zenodo_doi")) {
    return `${shelf.id}:slot-painted-live`;
  }
  if (shelf.kind === "zenodo_doi" && (shelf.doi || shelf.zenodo_live === true || shelf.status === "live")) {
    return "zenodo-not-blocked";
  }
  if (shelf.status === "live" && shelf.hash_verify === "fail") return `${shelf.id}:live-without-hash`;
  return null;
}

/**
 * LIVE/SLOT rollup. LIVE rows are only those already status live.
 * A hash-verify PASS on Plane B stays SLOT. Home origin stays SLOT.
 */
export function survivalRegistry(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const live = [];
  const slot = [];
  const refused = [];
  const lies = [];
  const entries = [];
  for (const shelf of list) {
    if (!shelf || typeof shelf !== "object") {
      lies.push("unknown-shelf");
      continue;
    }
    const lie = shelfLie(shelf);
    if (lie) lies.push(lie);
    const entry = {
      id: shelf.id,
      status: shelf.status,
      plane: shelf.plane ?? null,
      independent: shelf.independent === true,
      hash_verify: shelf.hash_verify ?? null,
      counts_as_independent_live: shelf.status === "live" && shelf.independent === true,
    };
    entries.push(entry);
    if (shelf.status === "live") live.push(shelf.id);
    else if (shelf.status === "slot") slot.push(shelf.id);
    else if (shelf.status === "refused") refused.push(shelf.id);
    else lies.push(`${shelf.id || "unknown"}:bad-status`);
  }
  const radii = [];
  for (const shelf of list) {
    if (shelf && shelf.status === "live" && shelf.independent === true && shelf.blast_radius && !radii.includes(shelf.blast_radius)) {
      radii.push(shelf.blast_radius);
    }
  }
  return {
    spec: ORIGIN_CUTOVER,
    rule: "LIVE only after hash verify. SLOT when not deposited.",
    honest: lies.length === 0,
    lies,
    entries,
    live,
    slot,
    refused,
    independent_live_blast_radii: radii,
    independent_live_count: radii.length,
    independent_requirement_met: radii.length >= 3,
    min_independent_shelves: 3,
    published_surfaces: 5,
    family_blast_radii: ["cloudflare", "github"],
    zenodo_plane_b_blocked: true,
    zenodo_live: false,
    doi: null,
    home_origin: originCutoverCite(),
    phoenix_reheal: PHOENIX_REHEAL_CITE,
    breaks_live_cf_hubs: false,
    layered: true,
    live_cf_hubs_unchanged: true,
  };
}
