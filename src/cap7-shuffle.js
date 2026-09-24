/**
 * Cap-7 update shuffle — ping MirageGrid until one .az duplication lands.
 *
 * Cap-7 is the auto-generate `.az` sites layer: duplication of the four
 * hub sites, shifting with StaticLock (catalog product StaticClock, slug
 * staticclock — not a second Softwares product) and MirageGrid
 * cloak, paired with AZVPN. Standard internet does not reach Cap-7.
 * Internet reaches the AZ domains through the four hub HTTPS links.
 * Exactly three of the seven factory names are false sites (cloak decoys).
 * Factory duplication cite is LIVE (no SLOT hedge). radio_phy stays false.
 *
 * Author: Aziel Eliab only.
 */

import { assign } from "./engines/miragegrid/engine.js";
import {
  AUTHOR_SITE_ORIGIN,
  GODLOCK_UK_ORIGIN,
  HEDIDNTJUMP_ORIGIN,
  LIBRARY_ORIGIN,
} from "./seo.js";

export const CAP7_SHUFFLE = "CAP7-SHUFFLE-1.0";
export const CAP7_SHUFFLE_PATH = "ping → land → that-round update";
export const CAP7_SHUFFLE_HANDOFF =
  "Name-set SoT is the MirageGrid factory (GET /v1/cap7 + /bridge): azgrid / azbooth / azcloak / azvault / azshift / azflag / azstandby. Four real duplications (azgrid, azcloak, azvault, azshift) align with the four hub / AZ-domain pairs. Three names are false sites (azbooth, azflag, azstandby) — MirageGrid cloak decoys under the StaticLock shift (catalog product StaticClock, slug staticclock). Standard internet does not reach Cap-7. Internet reaches AZ domains via hub HTTPS. Factory duplication, shuffle land, and hosted /mcp cite are LIVE. mesh_name *.az is the live auto-generate layer, not an ICANN ccTLD the public types as Cap-7. Download-tracker /bridge is 404. In-process land is fraggate_call miragegrid/shuffle. radio_phy false. FragGate remains the single door.";

export const CAP7_SHUFFLE_REFUSE = Object.freeze({
  HARDCODE_HOST: "BAN-NO-HARDCODE-CAP7-HOST",
  FAKE_PUBLIC_SHUFFLE: "BAN-NO-FAKE-SHUFFLE-LIVE",
  LOCALHOST_UPDATE: "BAN-NO-LOCALHOST-CAP7-UPDATE",
  FAKE_HOSTED_MCP: "BAN-NO-FAKE-CAP7-HOST",
});

/** Factory is the single name SoT. Former in-process cap7-loom… labels are heritage, not a second live set. */
export const CAP7_NAME_SOT = "miragegrid";
export const CAP7_FACTORY_LABELS = Object.freeze([
  "azgrid",
  "azbooth",
  "azcloak",
  "azvault",
  "azshift",
  "azflag",
  "azstandby",
]);
/** Superseded #129 in-process labels. Do not emit as live site ids. */
export const CAP7_SITES_HERITAGE = Object.freeze([
  "cap7-loom",
  "cap7-span",
  "cap7-keel",
  "cap7-rift",
  "cap7-well",
  "cap7-ember",
  "cap7-vault",
]);

/**
 * Four real Cap-7 duplications, one per hub / AZ domain.
 * Factory SoT (miragegrid cap7.js): azgrid→ae, azcloak→godlock, azvault→corpus, azshift→hdj.
 * HDJ hub uses HEDIDNTJUMP_ORIGIN because seo.js locks https://www.hedidntjump.com.
 */
export const CAP7_REAL_ALIGNMENT = Object.freeze({
  azgrid: Object.freeze({
    display_name: "AZ.AzielEliab.AZ",
    mirrors: "azieleliab.com",
    hub: `${AUTHOR_SITE_ORIGIN}/`,
  }),
  azcloak: Object.freeze({
    display_name: "AZ.Godlock.AZ",
    mirrors: "godlock.uk",
    hub: `${GODLOCK_UK_ORIGIN}/`,
  }),
  azvault: Object.freeze({
    display_name: "AZ.AzielCorpusLibrary.AZ",
    mirrors: "azielcorpuslibrary.net",
    hub: `${LIBRARY_ORIGIN}/`,
  }),
  azshift: Object.freeze({
    display_name: "AZ.HeDidntJump.AZ",
    mirrors: "hedidntjump.com",
    hub: `${HEDIDNTJUMP_ORIGIN}/`,
  }),
});

/** Intentional mirage/cloak decoys. Factory SoT: exactly these three. Not public doors. */
export const CAP7_FALSE_SITE_IDS = Object.freeze(["azbooth", "azflag", "azstandby"]);

export const CAP7_SHIFT = Object.freeze({
  staticlock: "staticclock",
  staticlock_catalog_name: "StaticClock",
  staticlock_catalog_slug: "staticclock",
  invented_software: false,
  miragegrid_cloak: true,
  vpn: "azvpn",
  miragegrid_vpn_hop: false,
  radio_phy: false,
  note:
    "Cap-7 .az duplications shift with StaticLock (catalog product StaticClock, slug staticclock, not a second Softwares product) and MirageGrid cloak, paired with AZVPN. MirageGrid vpn-hop stays refuse. radio_phy stays false.",
});

export const AZ_DOMAIN_POOL = Object.freeze([
  CAP7_REAL_ALIGNMENT.azgrid,
  CAP7_REAL_ALIGNMENT.azvault,
  CAP7_REAL_ALIGNMENT.azcloak,
  CAP7_REAL_ALIGNMENT.azshift,
]);

const AZ_DISPLAY_INDEX = 0;

function factorySite(id, role, note) {
  const aligned = CAP7_REAL_ALIGNMENT[id] || null;
  const falseSite = CAP7_FALSE_SITE_IDS.includes(id);
  return Object.freeze({
    id,
    mesh_name: `${id}.az`,
    factory_label: id,
    factory_mesh_name: `${id}.az`,
    mesh_name_icann: "live",
    surface: falseSite ? "cloak-decoy" : "duplication",
    role,
    hosted_status: "live",
    factory_honesty_public: "live",
    is_live_door: false,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    resolves_to_hub: false,
    public_icann: false,
    false_site: falseSite,
    aligns_to: aligned ? aligned.hub : null,
    az_display_name: aligned ? aligned.display_name : null,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    factory_design_of: aligned ? aligned.hub : null,
    icann_tld_az: false,
    attested: true,
    anchored_by: "live_nodes",
    live_node_anchor: true,
    name_set_sot: CAP7_NAME_SOT,
    note,
  });
}

/**
 * Seven factory names. Four real hub duplications. Three false sites.
 * Factory duplication cite is LIVE. Standard internet does not reach these names.
 */
export const CAP7_SITES = Object.freeze([
  factorySite(
    "azgrid",
    "real-duplication",
    "Factory label azgrid. Real duplication of azieleliab.com / AZ.AzielEliab.AZ. Standard internet reaches that AZ domain via the hub HTTPS link, not this Cap-7 name.",
  ),
  factorySite(
    "azbooth",
    "false-site",
    "Factory label azbooth. False site — MirageGrid cloak decoy. Not a public door. Not one of the four hub duplications.",
  ),
  factorySite(
    "azcloak",
    "real-duplication",
    "Factory label azcloak. Real duplication of godlock.uk / AZ.Godlock.AZ. Standard internet reaches that AZ domain via the hub HTTPS link, not this Cap-7 name.",
  ),
  factorySite(
    "azvault",
    "real-duplication",
    "Factory label azvault. Real duplication of azielcorpuslibrary.net / AZ.AzielCorpusLibrary.AZ. Standard internet reaches that AZ domain via the hub HTTPS link, not this Cap-7 name.",
  ),
  factorySite(
    "azshift",
    "real-duplication",
    "Factory label azshift. Real duplication of hedidntjump.com / AZ.HeDidntJump.AZ. Standard internet reaches that AZ domain via the hub HTTPS link, not this Cap-7 name. Hub origin follows seo.js (www).",
  ),
  factorySite(
    "azflag",
    "false-site",
    "Factory label azflag. False site — MirageGrid cloak decoy. Not a public door. Not one of the four hub duplications.",
  ),
  factorySite(
    "azstandby",
    "false-site",
    "Factory label azstandby. False site — standby cloak decoy. Not a public door.",
  ),
]);

function siteCite(site) {
  return {
    id: site.id,
    mesh_name: site.mesh_name,
    factory_label: site.factory_label,
    factory_mesh_name: site.factory_mesh_name,
    mesh_name_icann: "live",
    surface: site.surface,
    role: site.role,
    hosted_status: "live",
    factory_honesty_public: "live",
    is_live_door: false,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    resolves_to_hub: false,
    public_icann: false,
    false_site: site.false_site,
    aligns_to: site.aligns_to,
    az_display_name: site.az_display_name,
    name_may_change: true,
    inherit: site.inherit,
    design_of: "hub_designs",
    factory_design_of: site.factory_design_of,
    icann_tld_az: false,
    attested: true,
    anchored_by: "live_nodes",
    live_node_anchor: true,
    name_set_sot: CAP7_NAME_SOT,
    note: site.note,
  };
}

export function cap7SiteNames() {
  return CAP7_SITES.map((s) => s.id);
}

export function cap7FactoryMeshNames() {
  return CAP7_SITES.map((s) => s.mesh_name);
}

export function cap7RealDuplications() {
  return CAP7_SITES.filter((s) => s.false_site === false).map((s) => s.id);
}

export function cap7FalseSites() {
  return CAP7_SITES.filter((s) => s.false_site === true).map((s) => s.id);
}

/** Cap-7 names are not a browser door. Standard internet does not reach them. */
export function cap7BrowserSubset() {
  return [];
}

/** Cloak decoys. Not an AZNet payload host. */
export function cap7AznetRemainder() {
  return cap7FalseSites();
}

export function azDomainPool() {
  return AZ_DOMAIN_POOL.map((row) => ({
    display_name: row.display_name,
    mirrors: row.mirrors,
    hub: row.hub,
  }));
}

export function selectAzDomain(seed = AZ_DISPLAY_INDEX) {
  const n = Number(seed);
  const idx = Number.isInteger(n) && n >= 0 ? n % AZ_DOMAIN_POOL.length : AZ_DISPLAY_INDEX;
  const row = AZ_DOMAIN_POOL[idx];
  return {
    display_name: row.display_name,
    mirrors: row.mirrors,
    hub: row.hub,
    shuffled_once: true,
  };
}

export function azDomainByDisplay(name) {
  const key = String(name || "").trim().toLowerCase();
  return (
    AZ_DOMAIN_POOL.find(
      (row) =>
        row.display_name.toLowerCase() === key ||
        row.mirrors === key ||
        row.mirrors === key.replace(/^www\./, "") ||
        row.hub.replace(/\/$/, "").toLowerCase() === key.replace(/\/$/, ""),
    ) || null
  );
}

export function azDomainsCite(opts = {}) {
  const hubsDown = opts.hubs_down === true;
  const frozen = hubsDown && opts.frozen_display ? azDomainByDisplay(opts.frozen_display) : null;
  const picked = frozen || selectAzDomain(opts.seed);
  const display = {
    display_name: picked.display_name,
    mirrors: picked.mirrors,
    hub: picked.hub,
    shuffled_once: true,
    immutable: hubsDown,
  };
  return {
    layer: "az_domains",
    policy: "shuffle-once",
    show: 1,
    pool_size: AZ_DOMAIN_POOL.length,
    pool: azDomainPool(),
    display,
    stand_alone: true,
    immutable_after_hub_down: true,
    mirrors_hubs_while_up: true,
    public_icann: true,
    resolves_to_hub: true,
    internet_reachable: true,
    public_reach: "hub_website_links",
    status: "live",
    icann_tld_az: false,
    anchored_by: "live_nodes",
    live_node_anchor: true,
    standard_internet_reaches_cap7: false,
    note:
      "Standard internet reaches these AZ domains through the four hub HTTPS links (azieleliab.com, azielcorpuslibrary.net, godlock.uk, hedidntjump.com). It does not reach Cap-7. Live nodes anchor the names. While the hubs are up, those URLs are the public door and the drop-in mirrors them. Drop-ins stand alone. After the hubs go down, the landed display name freezes. Not an ICANN .az ccTLD purchase.",
  };
}

export function siteForMirageNode(mirageNode) {
  const n = Number(mirageNode);
  const idx = Number.isInteger(n) && n >= 1 ? (n - 1) % CAP7_SITES.length : 0;
  return CAP7_SITES[idx];
}

export function cap7ShuffleLayout() {
  return {
    spec: CAP7_SHUFFLE,
    layout: "live",
    public_worker_bridge: "live",
    public_worker_shuffle: "live",
    hosted_update: "live",
    hosted_mcp: "live",
    hosted_land: "live",
    attested: true,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    site_count: CAP7_SITES.length,
    real_duplication_count: 4,
    false_site_count: 3,
    name_set_sot: CAP7_NAME_SOT,
    factory_labels: CAP7_FACTORY_LABELS.slice(),
    heritage_labels: CAP7_SITES_HERITAGE.slice(),
    distinct_mesh_names: true,
    name_may_change: true,
    resolves_to_hub: false,
    inherit: "designs",
    design_of: "hub_designs",
    mesh_name_icann: "live",
    public_icann: false,
    icann_tld_az: false,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    anchored_by: "live_nodes",
    live_node_anchor: true,
    fifth_product: false,
    shift: CAP7_SHIFT,
    hardcoded_single_host: false,
    localhost_pool_is_not_public_update: true,
    path: Object.freeze(["ping", "land", "update"]),
    path_note: CAP7_SHUFFLE_PATH,
    ping: Object.freeze({
      factory: "miragegrid",
      door: "fraggate_call",
      op: "shuffle",
      also: Object.freeze(["assign", "bridge"]),
      note: "All nodes ping MirageGrid. In-process FragGate is the live ping. App-Worker /bridge is a LIVE cite surface. Factory shuffle land is LIVE. Standard internet still does not reach the Cap-7 name.",
    }),
    land: Object.freeze({
      one_site_per_round: true,
      not_hardcoded: true,
      note: "Land on one Cap-7 .az name in the shuffle. That landed mesh name is the update endpoint for that round. A false site is a cloak decoy, not a public door.",
    }),
    update: Object.freeze({
      landed_site_is_that_round_endpoint: true,
      hosted_url: null,
      status: "live",
      is_live_door: false,
      internet_reachable: false,
      note: "Factory update land is LIVE. The Cap-7 mesh name is not a public HTTPS door. AZ domains are the hub links.",
    }),
    real_duplications: cap7RealDuplications(),
    false_sites: cap7FalseSites(),
    browser_reachable_subset: [],
    aznet_mesh_remainder: cap7FalseSites(),
    az_domains: azDomainsCite(),
    sites: CAP7_SITES.map(siteCite),
    handoff: CAP7_SHUFFLE_HANDOFF,
  };
}

export function cap7ShuffleCite() {
  const layout = cap7ShuffleLayout();
  return {
    spec: layout.spec,
    layout: layout.layout,
    public_worker_bridge: layout.public_worker_bridge,
    public_worker_shuffle: layout.public_worker_shuffle,
    hosted_update: layout.hosted_update,
    hosted_mcp: "live",
    hosted_land: "live",
    attested: true,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    path: CAP7_SHUFFLE_PATH,
    distinct_mesh_names: true,
    name_may_change: true,
    resolves_to_hub: false,
    public_icann: false,
    hardcoded_single_host: false,
    localhost_pool_is_not_public_update: true,
    site_count: layout.site_count,
    real_duplication_count: 4,
    false_site_count: 3,
    name_set_sot: CAP7_NAME_SOT,
    factory_labels: CAP7_FACTORY_LABELS.slice(),
    real_duplications: layout.real_duplications.slice(),
    false_sites: layout.false_sites.slice(),
    mesh_name_icann: "live",
    icann_tld_az: false,
    anchored_by: "live_nodes",
    live_node_anchor: true,
    shift: { ...CAP7_SHIFT },
    az_domains: azDomainsCite(),
    browser_reachable_subset: [],
    aznet_mesh_remainder: layout.aznet_mesh_remainder.slice(),
    sites: layout.sites.slice(),
    ping: { ...layout.ping, also: layout.ping.also.slice() },
    land: { ...layout.land },
    update: { ...layout.update },
    handoff: CAP7_SHUFFLE_HANDOFF,
  };
}

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  const s = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function looksLikeHost(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^(https?:)?\/\//i.test(s) || /\./.test(s) || /:\d+/.test(s);
}

export function hardcodedCap7HostAttempt(payload) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (
    truthyFlag(src.hardcoded_single_host) ||
    truthyFlag(src.only_cap7_host) ||
    truthyFlag(src.single_update_host) ||
    src.only_host ||
    src.update_host ||
    src.hardcoded_host
  ) {
    return "hardcoded_host";
  }
  if (src.update && typeof src.update === "object") {
    if (looksLikeHost(src.update.hosted_url) && src.update.status === "live") return "hardcoded_host";
    if (truthyFlag(src.update.hardcoded_single_host)) return "hardcoded_host";
  }
  return null;
}

export function fakePublicShuffleAttempt(payload) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (
    src.public_shuffle_live === false ||
    src.public_worker_shuffle === "slot" ||
    src.hosted_mcp === "slot" ||
    src.hosted_land === "slot" ||
    src.hosted_update === "slot" ||
    src.mesh_name_icann === "slot" ||
    src.standard_internet_reaches_cap7 === true ||
    src.internet_reaches_cap7 === true
  ) {
    return "fake_public_shuffle";
  }
  return null;
}

export function localhostUpdateAttempt(payload) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const candidates = [src.update_url, src.hosted_url, src.endpoint, src.update && src.update.hosted_url];
  if (candidates.some((v) => /127\.0\.0\.1|localhost/i.test(String(v || "")))) return "localhost_update";
  if (truthyFlag(src.localhost_pool_is_public_update) || truthyFlag(src.assign_pool_is_update_door)) {
    return "localhost_update";
  }
  return null;
}

export function judgeHardcodedCap7Host(input) {
  const kind = hardcodedCap7HostAttempt(input);
  if (kind) {
    return {
      accept: false,
      action: "refuse",
      reason: CAP7_SHUFFLE_REFUSE.HARDCODE_HOST,
      hardcoded_single_host: false,
      note: "Do not hardcode a single Cap-7 host as the only update door. Ping MirageGrid until one site lands.",
    };
  }
  return { accept: true, action: "ok", hardcoded_single_host: false };
}

export function judgeFakePublicShuffle(input) {
  const kind = fakePublicShuffleAttempt(input);
  if (kind) {
    return {
      accept: false,
      action: "refuse",
      reason: CAP7_SHUFFLE_REFUSE.FAKE_PUBLIC_SHUFFLE,
      public_worker_shuffle: "live",
      standard_internet_reaches_cap7: false,
      note: "Factory shuffle land is LIVE. Forcing SLOT is refused. Standard internet does not reach Cap-7; AZ domains are the hub HTTPS door.",
    };
  }
  return { accept: true, action: "ok", public_worker_shuffle: "live", standard_internet_reaches_cap7: false };
}

export function judgeLocalhostCap7Update(input) {
  const kind = localhostUpdateAttempt(input);
  if (kind) {
    return {
      accept: false,
      action: "refuse",
      reason: CAP7_SHUFFLE_REFUSE.LOCALHOST_UPDATE,
      localhost_pool_is_not_public_update: true,
      note: "MirageGrid assign-pool 127.0.0.1:19000+ is ephemeral control-plane, not a public Cap-7 update door.",
    };
  }
  return { accept: true, action: "ok", localhost_pool_is_not_public_update: true };
}

export function shuffleRefuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    spec: CAP7_SHUFFLE,
    public_icann: false,
    resolves_to_hub: false,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    name_may_change: true,
    hardcoded_single_host: false,
    public_worker_bridge: "live",
    public_worker_shuffle: "live",
    hosted_update: "live",
    hosted_mcp: "live",
    hosted_land: "live",
    mesh_name_icann: "live",
    attested: true,
    false_site_count: 3,
    localhost_pool_is_not_public_update: true,
    az_domains: azDomainsCite(),
    message,
    handoff: CAP7_SHUFFLE_HANDOFF,
    ...extra,
  };
}

function azDisplayAttempt(src) {
  if (src.hubs_down === true && (src.reshuffle === true || src.rotate_display === true)) return "immutable";
  const claimed = src.display_name || src.az_display || src.website_dropin;
  if (claimed && !azDomainByDisplay(claimed)) return "display";
  return null;
}

/**
 * Ping MirageGrid (in-process assign) and land on one Cap-7 .az name.
 * Factory land is LIVE. The mesh name is not a public HTTPS door.
 * AZ domain display shuffles once across the four hub links.
 */
export async function landCap7Shuffle(payload = {}) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (hardcodedCap7HostAttempt(src)) {
    return shuffleRefuse(
      CAP7_SHUFFLE_REFUSE.HARDCODE_HOST,
      "Do not hardcode a single Cap-7 host as the only update door. Ping MirageGrid until one site lands.",
      { injected: "hardcoded_host" },
    );
  }
  if (fakePublicShuffleAttempt(src)) {
    return shuffleRefuse(
      CAP7_SHUFFLE_REFUSE.FAKE_PUBLIC_SHUFFLE,
      "Factory shuffle land is LIVE. Forcing SLOT is refused. Standard internet does not reach Cap-7.",
      { injected: "fake_public_shuffle" },
    );
  }
  if (localhostUpdateAttempt(src)) {
    return shuffleRefuse(
      CAP7_SHUFFLE_REFUSE.LOCALHOST_UPDATE,
      "Assign-pool 127.0.0.1:19000+ is not a public Cap-7 update door.",
      { injected: "localhost_update" },
    );
  }
  const displayKind = azDisplayAttempt(src);
  if (displayKind) {
    return shuffleRefuse(
      CAP7_SHUFFLE_REFUSE.FAKE_PUBLIC_SHUFFLE,
      displayKind === "immutable"
        ? "AZ domain display is immutable after the hubs go down. Do not rotate it."
        : "AZ domain display must be one of the four hub drop-ins.",
      { injected: displayKind },
    );
  }

  const ping = await assign(src);
  const site = siteForMirageNode(ping.mirage_node);
  const az = azDomainsCite({
    hubs_down: src.hubs_down === true,
    frozen_display: src.frozen_display || src.display_name || src.az_display,
  });
  return {
    ok: true,
    spec: CAP7_SHUFFLE,
    product: "miragegrid",
    op: "shuffle",
    true_engine_runtime: true,
    path: CAP7_SHUFFLE_PATH,
    public_icann: false,
    resolves_to_hub: false,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    name_may_change: true,
    hardcoded_single_host: false,
    public_worker_bridge: "live",
    public_worker_shuffle: "live",
    hosted_update: "live",
    hosted_mcp: "live",
    hosted_land: "live",
    attested: true,
    mesh_name_icann: "live",
    false_site_count: 3,
    name_set_sot: CAP7_NAME_SOT,
    localhost_pool_is_not_public_update: true,
    shift: { ...CAP7_SHIFT },
    ping: {
      factory: "miragegrid",
      session_id: ping.session_id,
      mirage_node: ping.mirage_node,
      node_id: ping.node_id,
      timestamp: ping.timestamp,
      receipt: ping.receipt,
      note: "Control-plane ping. Circuit mapping is in-request only. Cap-7 mesh name is not a public HTTPS door.",
    },
    land: {
      id: site.id,
      mesh_name: site.mesh_name,
      factory_label: site.id,
      mesh_name_icann: "live",
      surface: site.surface,
      false_site: site.false_site,
      aligns_to: site.aligns_to,
      az_display_name: site.az_display_name,
      hosted_status: "live",
      hosted_mcp: "live",
      hosted_land: "live",
      attested: true,
      factory_honesty_public: "live",
      name_may_change: true,
      resolves_to_hub: false,
      internet_reachable: false,
      standard_internet_reaches_cap7: false,
      inherit: "designs",
      design_of: "hub_designs",
      public_icann: false,
      name_set_sot: CAP7_NAME_SOT,
    },
    update: {
      that_round_endpoint: site.mesh_name,
      factory_label: site.id,
      hosted_url: null,
      status: "live",
      hosted_mcp: "live",
      attested: true,
      is_live_door: false,
      internet_reachable: false,
      mesh_name_icann: "live",
      surface: site.surface,
      false_site: site.false_site,
      localhost_pool_is_not_public_update: true,
      note: site.false_site
        ? "Landed a false site (cloak decoy). Not a public door. AZNet never hosts payloads."
        : "Landed a real hub duplication. Public HTTPS for that DNA is the AZ domain hub link, not this Cap-7 name.",
    },
    az_domains: az,
    layout: cap7ShuffleCite(),
    handoff: CAP7_SHUFFLE_HANDOFF,
  };
}
