/**
 * Cap-7 update shuffle — ping MirageGrid until one site lands.
 *
 * Cap-7 sites have distinct mesh names (name_may_change; inherit hub
 * design DNA only; resolves_to_hub false). All nodes ping MirageGrid;
 * the landed site is that-round update endpoint. Do not hardcode one
 * Cap-7 host. Localhost assign-pool endpoints are not public doors.
 *
 * Layout + in-process land are LIVE. Public MirageGrid Worker shuffle
 * and hosted update URLs stay SLOT (do not invent LIVE shuffle).
 *
 * Author: Aziel Eliab only.
 */

import { assign } from "./engines/miragegrid/engine.js";

export const CAP7_SHUFFLE = "CAP7-SHUFFLE-1.0";
export const CAP7_SHUFFLE_PATH = "ping → land → that-round update";
export const CAP7_SHUFFLE_HANDOFF =
  "MirageGrid product Worker follow-on (not this runtime PR): publish /bridge + shuffle land with the same distinct mesh-name layout. Runtime already bridges in-process via FragGate miragegrid/shuffle. Do not invent a LIVE public shuffle on workers.dev while /bridge is absent.";

export const CAP7_SHUFFLE_REFUSE = Object.freeze({
  HARDCODE_HOST: "BAN-NO-HARDCODE-CAP7-HOST",
  FAKE_PUBLIC_SHUFFLE: "BAN-NO-FAKE-SHUFFLE-LIVE",
  LOCALHOST_UPDATE: "BAN-NO-LOCALHOST-CAP7-UPDATE",
});

/** Seven distinct mesh names. Not ICANN hosts. Not hub aliases. Names may change. */
export const CAP7_SITES = Object.freeze([
  Object.freeze({
    id: "cap7-loom",
    mesh_name: "cap7-loom",
    surface: "browser",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Typically browser-reachable hosted class. Hosted URL SLOT until attested.",
  }),
  Object.freeze({
    id: "cap7-span",
    mesh_name: "cap7-span",
    surface: "browser",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Typically browser-reachable hosted class. Hosted URL SLOT until attested.",
  }),
  Object.freeze({
    id: "cap7-keel",
    mesh_name: "cap7-keel",
    surface: "browser",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Typically browser-reachable hosted class. Hosted URL SLOT until attested.",
  }),
  Object.freeze({
    id: "cap7-rift",
    mesh_name: "cap7-rift",
    surface: "aznet",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Mesh / AZNet-side. Not a browser-hosted /mcp. AZNet never hosts payloads.",
  }),
  Object.freeze({
    id: "cap7-well",
    mesh_name: "cap7-well",
    surface: "aznet",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Mesh / AZNet-side. Not a browser-hosted /mcp. AZNet never hosts payloads.",
  }),
  Object.freeze({
    id: "cap7-ember",
    mesh_name: "cap7-ember",
    surface: "aznet",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Mesh / AZNet-side. Not a browser-hosted /mcp. AZNet never hosts payloads.",
  }),
  Object.freeze({
    id: "cap7-vault",
    mesh_name: "cap7-vault",
    surface: "aznet",
    hosted_status: "slot",
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    note: "Mesh / AZNet-side. Not a browser-hosted /mcp. AZNet never hosts payloads.",
  }),
]);

function siteCite(site) {
  return {
    id: site.id,
    mesh_name: site.mesh_name,
    surface: site.surface,
    hosted_status: site.hosted_status,
    is_live_door: false,
    resolves_to_hub: false,
    name_may_change: true,
    inherit: site.inherit,
    design_of: site.design_of,
    public_icann: false,
    note: site.note,
  };
}

export function cap7SiteNames() {
  return CAP7_SITES.map((s) => s.mesh_name);
}

export function cap7BrowserSubset() {
  return CAP7_SITES.filter((s) => s.surface === "browser").map((s) => s.mesh_name);
}

export function cap7AznetRemainder() {
  return CAP7_SITES.filter((s) => s.surface === "aznet").map((s) => s.mesh_name);
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
    public_worker_shuffle: "slot",
    hosted_update: "slot",
    site_count: CAP7_SITES.length,
    distinct_mesh_names: true,
    name_may_change: true,
    resolves_to_hub: false,
    inherit: "designs",
    design_of: "hub_designs",
    public_icann: false,
    fifth_product: false,
    hardcoded_single_host: false,
    localhost_pool_is_not_public_update: true,
    path: Object.freeze(["ping", "land", "update"]),
    path_note: CAP7_SHUFFLE_PATH,
    ping: Object.freeze({
      factory: "miragegrid",
      door: "fraggate_call",
      op: "shuffle",
      also: Object.freeze(["assign", "bridge"]),
      note: "All nodes ping MirageGrid. In-process FragGate is the live ping. Public workers.dev /bridge is not a LIVE shuffle door.",
    }),
    land: Object.freeze({
      one_site_per_round: true,
      not_hardcoded: true,
      note: "Land on one Cap-7 site in the shuffle. That landed mesh name is the update endpoint for that round.",
    }),
    update: Object.freeze({
      landed_site_is_that_round_endpoint: true,
      hosted_url: "slot",
      is_live_door: false,
      note: "Do not hardcode a single Cap-7 host as the only update door.",
    }),
    browser_reachable_subset: cap7BrowserSubset(),
    aznet_mesh_remainder: cap7AznetRemainder(),
    sites: CAP7_SITES.map(siteCite),
    handoff: CAP7_SHUFFLE_HANDOFF,
  };
}

export function cap7ShuffleCite() {
  const layout = cap7ShuffleLayout();
  return {
    spec: layout.spec,
    layout: layout.layout,
    public_worker_shuffle: layout.public_worker_shuffle,
    hosted_update: layout.hosted_update,
    path: CAP7_SHUFFLE_PATH,
    distinct_mesh_names: true,
    name_may_change: true,
    resolves_to_hub: false,
    hardcoded_single_host: false,
    localhost_pool_is_not_public_update: true,
    site_count: layout.site_count,
    browser_reachable_subset: layout.browser_reachable_subset.slice(),
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
    truthyFlag(src.public_shuffle_live) ||
    truthyFlag(src.miragegrid_worker_shuffle_live) ||
    src.public_worker_shuffle === "live"
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
      public_worker_shuffle: "slot",
      note: "Public MirageGrid workers.dev shuffle is not LIVE. In-process layout + land only. Follow-on MirageGrid PR.",
    };
  }
  return { accept: true, action: "ok", public_worker_shuffle: "slot" };
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
    name_may_change: true,
    hardcoded_single_host: false,
    public_worker_shuffle: "slot",
    hosted_update: "slot",
    localhost_pool_is_not_public_update: true,
    message,
    handoff: CAP7_SHUFFLE_HANDOFF,
    ...extra,
  };
}

/**
 * Ping MirageGrid (in-process assign) and land on one Cap-7 site.
 * That landed mesh name is the update endpoint for this round.
 * Hosted URL stays SLOT. Localhost pool is never the update door.
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
      "Public MirageGrid workers.dev shuffle is not LIVE. In-process layout + land only.",
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

  const ping = await assign(src);
  const site = siteForMirageNode(ping.mirage_node);
  return {
    ok: true,
    spec: CAP7_SHUFFLE,
    product: "miragegrid",
    op: "shuffle",
    true_engine_runtime: true,
    path: CAP7_SHUFFLE_PATH,
    public_icann: false,
    resolves_to_hub: false,
    name_may_change: true,
    hardcoded_single_host: false,
    public_worker_shuffle: "slot",
    hosted_update: "slot",
    localhost_pool_is_not_public_update: true,
    ping: {
      factory: "miragegrid",
      session_id: ping.session_id,
      mirage_node: ping.mirage_node,
      node_id: ping.node_id,
      timestamp: ping.timestamp,
      receipt: ping.receipt,
      note: "Control-plane ping. Circuit mapping is in-request only. Not a public hosted update door.",
    },
    land: {
      mesh_name: site.mesh_name,
      surface: site.surface,
      name_may_change: true,
      resolves_to_hub: false,
      inherit: "designs",
      design_of: "hub_designs",
    },
    update: {
      that_round_endpoint: site.mesh_name,
      hosted_url: null,
      status: "slot",
      is_live_door: false,
      surface: site.surface,
      localhost_pool_is_not_public_update: true,
      note:
        site.surface === "browser"
          ? "Landed browser-class site. Hosted URL SLOT until attested. Not /mcp."
          : "Landed AZNet-side site. Mesh/AZNet remainder. AZNet never hosts payloads.",
    },
    layout: cap7ShuffleCite(),
    handoff: CAP7_SHUFFLE_HANDOFF,
  };
}
