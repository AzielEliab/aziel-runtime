/**
 * FED-MESH-1.0 peer bearers. Layer L1. Opt-in. Does not replace L0.
 * L0 is the public path: Cloudflare Worker, FragGate, MCP/OpenAPI/Glama,
 * Softwares 42, the HTTPS relay, and the human UI.
 * L1 adds a configured direct/LAN URL and extra relays, and refuses NAT punch.
 * A sidenet does not replace the internet. No public ICANN DNS. No radio PHY.
 * Author: Aziel Eliab only.
 */

import {
  ARCHIVE_ORG_TIP_PACK,
  COLD_MULTI_SHELF,
  CODEBERG_TIP_PACK,
  REFUSE,
} from "../cold-multi-shelf.js";
import { sidenetLayerCite } from "./sidenet-layers.js";
import { FED_SPEC } from "./spec.js";

export const NAT_REFUSE_CODE = "FED-MESH-NAT-REFUSE";

export const NAT_REFUSE_MESSAGE =
  "This protocol does not punch holes through NAT. A peer with no public address and no configured direct URL uses a relay. GET /v1/mesh never enables. Not public ICANN DNS. Not radio PHY.";

export const PEER_BEARER_MODES = Object.freeze([
  Object.freeze({
    id: "relay-https",
    title: "Relay HTTPS",
    transport: "https",
    hole_punch: false,
    public_icann: false,
    radio_phy: false,
    worker_hardware: false,
    get_never_enables: true,
    note: "Signed envelopes to an https relay the node already has. The Worker is one relay. TLS still shows routing metadata.",
  }),
  Object.freeze({
    id: "direct-lan",
    title: "Direct / LAN URL",
    transport: "configured-url",
    hole_punch: false,
    public_icann: false,
    radio_phy: false,
    worker_hardware: false,
    get_never_enables: true,
    note: "Same signed envelope on a configured LAN URL, or a configured https direct URL the node already has. This Worker does not discover a LAN.",
  }),
  Object.freeze({
    id: "loopback",
    title: "Loopback",
    transport: "loopback",
    hole_punch: false,
    public_icann: false,
    radio_phy: false,
    worker_hardware: false,
    get_never_enables: true,
    note: "127.0.0.1, localhost, or ::1. Tests and a local node. The Worker never fetches 127.0.0.1.",
  }),
]);

const PUNCH_OPS = new Set([
  "hole-punch",
  "hole_punch",
  "nat-punch",
  "nat_punch",
  "nat",
  "stun",
  "ice",
  "upnp",
  "nat-pmp",
  "nat_pmp",
  "turn",
  "relay-hole-punch",
  "relay-nat",
  "relay-stun",
  "relay-ice",
]);

const PUNCH_SCHEMES = new Set(["stun:", "stuns:", "turn:", "turns:", "nat:", "ice:"]);

/** Stack, not a fork. Default clients stay on L0. L1 runs only when configured. */
export function layerStack() {
  return {
    model: "stack",
    fork: false,
    default: "L0",
    this_pr: "L1",
    sidenet_replaces_internet: false,
    not_a_second_internet: true,
    get_never_enables: true,
    softwares_frozen: true,
    softwares_count: 42,
    L0: {
      id: "L0",
      role: "default",
      must_keep: true,
      replaces: false,
      opt_in: false,
      path: "Cloudflare Worker, FragGate single door, MCP/OpenAPI/Glama, Softwares 42, HTTPS relay, human UI",
      note: "Current public path. Unconfigured clients stay here. A direct URL and extra relays are not required.",
    },
    L1: {
      id: "L1",
      role: "optional",
      opt_in: true,
      default: false,
      replaces_l0: false,
      when: "configured",
      adds: ["direct-lan", "loopback", "multi-relay", "FED-MESH-NAT-REFUSE"],
      note: "Optional peer bearers. Used when a direct URL or an extra relay is configured. NAT hole-punch is refused. Default behavior stays L0.",
    },
    L2: {
      id: "L2",
      role: "cite",
      this_pr: true,
      replaces_l0: false,
      dns_publish: false,
      public_icann: false,
      adds: "Cap-7 cite/refuse stamps and the AZNet/AZBrowser pair hook",
      note: "Not a public resolver. public_icann stays false.",
    },
    L3: {
      id: "L3",
      role: "registry",
      this_pr: true,
      replaces_l0: false,
      home_origin: "slot",
      cold_shelves: "slot",
      adds: "home-origin and cold-shelf registry; phoenix stays local wait / re-seal",
    },
    L4: {
      id: "L4",
      role: "stub",
      this_pr: true,
      replaces_l0: false,
      full_os: false,
      softwares_ui: false,
      adds: "AZ-OS three layers by need and an offline stub that uses L0 when a relay is configured",
    },
  };
}

export function peerBearerCite() {
  return {
    spec: FED_SPEC,
    layer: "L1",
    default_layer: "L0",
    opt_in: true,
    replaces_l0: false,
    layers: layerStack(),
    not_a_second_internet: true,
    sidenet: false,
    sidenet_replaces_internet: false,
    public_icann: false,
    icann_dns: false,
    radio_phy: false,
    worker_hardware: false,
    hole_punch: false,
    nat_refuse: NAT_REFUSE_CODE,
    relay_fallback: true,
    worker_is_one_relay: true,
    protocol_requires_this_worker: false,
    get_never_enables: true,
    health_check: "GET /v1/mesh/relay",
    direct_transport: "same signed envelope on loopback or a configured LAN URL; relay is the fallback",
    modes: PEER_BEARER_MODES.map((mode) => ({ ...mode })),
    survival: survivalMethods(),
    note: "L0 is the public path and stays the default. L1 peer bearers (relay HTTPS, a configured direct or LAN URL, loopback, extra relays) are opt-in. A peer with no public address and no configured direct URL uses the relay. This protocol does not punch holes through NAT. The Worker does not publish ICANN DNS and does not claim radio PHY without hardware. GET /v1/mesh never enables. A sidenet does not replace the internet. Survival methods are named beside L0. Only the Worker edge is LIVE by default. Cold shelves stay SLOT. doi is null.",
  };
}

/**
 * Named survival methods. A stack beside L0, not a second internet.
 * Public cite (no config) keeps L1 dark. LIVE for L1 only when the caller
 * names extra relays or a direct URL. SLOT stays SLOT. No invented CID or DOI.
 */
export function survivalMethods(config = {}) {
  const relays = Array.isArray(config.relays) ? config.relays.filter((url) => String(url || "").trim()) : [];
  const multiConfigured = relays.length > 1;
  const directRaw = String(config.directUrl || config.direct || "").trim();
  let directLive = false;
  let directMode = null;
  if (directRaw) {
    const classified = classifyPeerUrl(directRaw, { role: "direct" });
    directLive =
      classified.ok === true &&
      classified.hole_punch !== true &&
      (classified.mode === "direct-lan" || classified.mode === "loopback");
    directMode = classified.ok === true ? classified.mode : null;
  }
  const methods = [
    {
      n: 1,
      id: "cf-worker-edge",
      layer: "L0",
      status: "live",
      live: true,
      configured: true,
      implemented: true,
      opt_in: false,
      this_pr: false,
      replaces_l0: false,
      probed: false,
      reachability_claimed: false,
      note: "Cloudflare Worker edge. FragGate, MCP/OpenAPI/Glama, Softwares 42, the HTTPS relay, and the human UI. This is the default path.",
    },
    {
      n: 2,
      id: "multi-relay",
      layer: "L1",
      status: multiConfigured ? "live" : "live-when-configured",
      live: multiConfigured,
      configured: multiConfigured,
      implemented: true,
      opt_in: true,
      this_pr: true,
      replaces_l0: false,
      probed: false,
      reachability_claimed: false,
      relay_count: relays.length,
      note: "Extra QNM relays. LIVE only when more than one relay URL is named. One relay stays L0. Each relay keeps that handle's sequence. Naming a URL is not a probe.",
    },
    {
      n: 3,
      id: "direct-lan",
      layer: "L1",
      status: directLive ? "live" : "live-when-configured",
      live: directLive,
      configured: directLive,
      implemented: true,
      opt_in: true,
      this_pr: true,
      mode: directMode,
      nat_punch: "refuse",
      nat_refuse: NAT_REFUSE_CODE,
      hole_punch: false,
      replaces_l0: false,
      probed: false,
      reachability_claimed: false,
      note: "Configured direct or LAN URL, or loopback. LIVE only when that URL is named and classifies. NAT hole-punch is refused. The Worker does not discover a LAN. Classification is not a reachability claim.",
    },
    {
      n: 4,
      id: "cap7-mesh-dns",
      layer: "L2",
      status: "slot",
      live: false,
      configured: false,
      implemented: false,
      this_pr: true,
      replaces_l0: false,
      dns_publish: false,
      public_icann: false,
      icann_dns: false,
      resolves_to_hub: false,
      mesh_only: true,
      cite_status: "live",
      note: "Cap-7 mesh DNS stays SLOT. The cite and the ICANN refuse are LIVE stamps. AZNet pairs with AZBrowser through FragGate. Not a public resolver.",
    },
    {
      n: 5,
      id: "home-origin",
      layer: "L3",
      status: "slot",
      live: false,
      configured: false,
      implemented: false,
      this_pr: true,
      replaces_l0: false,
      cutover: false,
      note: "Home-origin / mini-PC behind the edge stays SLOT. No cutover. The edge stays L0.",
    },
    {
      n: 6,
      id: "cold-shelves",
      layer: "L3",
      status: "slot",
      live: false,
      configured: false,
      implemented: false,
      code_ready: true,
      this_pr: true,
      replaces_l0: false,
      re_expand: true,
      doi: null,
      cid: null,
      invented_doi: false,
      invented_cid: false,
      no_fan: true,
      zenodo_live: false,
      zenodo_refuse: REFUSE.ZENODO_NOT_LIVE,
      doi_refuse: REFUSE.NO_TIP_DOI,
      cid_refuse: REFUSE.NO_CID,
      plane_b: "slot",
      plane_c: "slot",
      hash_verify_pass_is_not_live: true,
      codeberg: {
        url: CODEBERG_TIP_PACK.url,
        hash_verify: "pass",
        status: "slot",
        live: false,
      },
      archive_org: {
        url: ARCHIVE_ORG_TIP_PACK.url,
        hash_verify: "pass",
        status: "slot",
        live: false,
        same_blast_radius: "archive-org",
      },
      third_forge: { url: null, status: "slot", live: false, refuse: REFUSE.NO_FORGE },
      gitflic: { url: null, status: "refused", live: false, refuse: REFUSE.GITFLIC_EMAIL },
      usb: { status: "slot", live: false, refuse: REFUSE.OPERATOR_ATTEST },
      note: "Cold shelves for chain re-expand. Codeberg and archive.org hash-verify PASS still SLOT. Third forge URL null (CNS-NO-FORGE-MIRROR). GitFlic refused. USB SLOT. Zenodo is not LIVE. doi null. No invented CID.",
    },
    {
      n: 7,
      id: "phoenix",
      layer: "law",
      spec: "REHEAL-1.0",
      status: "live",
      live: true,
      replaces_l0: false,
      this_pr: false,
      controller_hunt: false,
      vote_to_fix: false,
      neighbor_vote: false,
      public_hostname_resurrection: false,
      note: "Phoenix is local wait / re-seal. No controller hunt. No neighbor vote-to-fix. Isolation is the cure. Not public hostname resurrection.",
    },
  ];
  return {
    spec: "CROSS-NETWORK-SURVIVAL-1.0",
    cold_multi_shelf: COLD_MULTI_SHELF,
    reheal: "REHEAL-1.0",
    model: "stack",
    fork: false,
    single_method: false,
    plane_a_is_one_tunnel: true,
    independent_requirement_met: false,
    do_not_paint_slot_as_live: true,
    replaces_l0: false,
    default: "L0",
    default_live: "cf-worker-edge",
    l0_live: true,
    l1_live: multiConfigured || directLive,
    sidenet_replaces_internet: false,
    not_a_second_internet: true,
    get_never_enables: true,
    softwares_frozen: true,
    softwares_count: 42,
    no_fan: true,
    doi: null,
    cid: null,
    invented_doi: false,
    invented_cid: false,
    zenodo_live: false,
    runtime_is_shelf: false,
    methods,
    runtime: sidenetLayerCite(),
    note: "Methods are named so survival is not one unnamed tunnel. L0 stays the only default LIVE path. L1 is LIVE only when configured. Cap-7 DNS, home-origin, and cold shelves stay SLOT. Phoenix does not replace L0. A sidenet does not replace the internet.",
  };
}

export function natRefuse(message, extra = {}) {
  return {
    ok: false,
    code: NAT_REFUSE_CODE,
    message: message || NAT_REFUSE_MESSAGE,
    spec: FED_SPEC,
    hole_punch: false,
    public_icann: false,
    icann_dns: false,
    radio_phy: false,
    worker_hardware: false,
    not_a_second_internet: true,
    sidenet: false,
    worker_is_one_relay: true,
    relay_fallback: true,
    get_never_enables: true,
    http_status: 403,
    peer_bearers: peerBearerCite(),
    ...extra,
    ok: false,
    code: NAT_REFUSE_CODE,
    hole_punch: false,
    get_never_enables: true,
    public_icann: false,
    radio_phy: false,
    not_a_second_internet: true,
    sidenet_replaces_internet: false,
    replaces_l0: false,
    default_layer: "L0",
  };
}

export function isNatPath(pathname) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  return (
    path === "/v1/mesh/nat" ||
    path === "/v1/mesh/hole-punch" ||
    path === "/v1/mesh/stun" ||
    path === "/v1/mesh/relay/nat" ||
    path === "/v1/mesh/relay/hole-punch" ||
    path === "/v1/mesh/relay/stun" ||
    path === "/v1/fedmesh/nat" ||
    path === "/v1/fedmesh/hole-punch" ||
    path === "/v1/fedmesh/stun"
  );
}

function badInput(message) {
  return {
    ok: false,
    code: "FED-MESH-BAD-INPUT",
    message,
    spec: FED_SPEC,
    hole_punch: false,
    public_icann: false,
    radio_phy: false,
    worker_hardware: false,
    not_a_second_internet: true,
    get_never_enables: true,
    http_status: 400,
  };
}

function ipv4Parts(host) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((n) => !Number.isInteger(n) || n > 255)) return null;
  return parts;
}

function bareHost(hostname) {
  return String(hostname || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
}

export function isLoopbackHost(hostname) {
  const host = bareHost(hostname);
  if (host === "localhost" || host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  const v4 = ipv4Parts(host);
  return Boolean(v4 && v4[0] === 127);
}

export function isLanHost(hostname) {
  const host = bareHost(hostname);
  if (!host || isLoopbackHost(host)) return false;
  if (host.endsWith(".local")) return true;
  const v4 = ipv4Parts(host);
  if (v4) {
    if (v4[0] === 10) return true;
    if (v4[0] === 192 && v4[1] === 168) return true;
    if (v4[0] === 172 && v4[1] >= 16 && v4[1] <= 31) return true;
    if (v4[0] === 169 && v4[1] === 254) return true;
    return false;
  }
  return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
}

export function urlRequestsPunch(raw) {
  const text = String(raw || "").trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  if (/^(stun|stuns|turn|turns|nat|ice):/.test(lower)) return true;
  let url;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  if (PUNCH_SCHEMES.has(url.protocol)) return true;
  for (const key of ["hole_punch", "hole-punch", "nat_punch", "punch", "stun", "ice", "upnp", "nat-pmp", "nat_pmp"]) {
    const value = String(url.searchParams.get(key) || "").toLowerCase();
    if (value === "1" || value === "true" || value === "yes") return true;
  }
  return false;
}

function normalizeUrl(url) {
  url.hash = "";
  url.username = "";
  url.password = "";
  const href = url.toString();
  if (href.endsWith("/") && url.pathname !== "/") return href.slice(0, -1);
  return href;
}

function modeBody(mode, url, extra) {
  return {
    ok: true,
    code: "FED-MESH-OK",
    spec: FED_SPEC,
    mode,
    url,
    hole_punch: false,
    public_icann: false,
    icann_dns: false,
    radio_phy: false,
    worker_hardware: false,
    not_a_second_internet: true,
    sidenet: false,
    get_never_enables: true,
    ...extra,
  };
}

/**
 * Classify one peer URL.
 * role "relay": https, or http on loopback. LAN http is not a relay.
 * role "direct": loopback, configured LAN, or configured https the node already has.
 */
export function classifyPeerUrl(raw, { role = "relay" } = {}) {
  if (urlRequestsPunch(raw)) {
    return natRefuse("That URL asks for NAT hole-punch. Refused. Use relay HTTPS, a configured direct or LAN URL, or loopback.");
  }
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch {
    return badInput("Peer URL is not a URL. NAT hole-punch is not a substitute.");
  }
  if (url.username || url.password) return badInput("Peer URLs do not carry userinfo.");
  const host = bareHost(url.hostname);
  const loopback = isLoopbackHost(host);
  const lan = isLanHost(host);
  const tls = url.protocol === "https:";
  const clear = url.protocol === "http:";
  if (!tls && !clear) {
    return natRefuse(`Scheme ${url.protocol || "unknown"} is not a peer bearer. STUN, TURN, ICE, and NAT hole-punch are refused.`);
  }
  const href = normalizeUrl(url);
  if (loopback) {
    return modeBody("loopback", href, {
      lan: false,
      tls,
      loopback: true,
      role,
      note: "Loopback bearer. Not a public relay and not radio PHY.",
    });
  }
  if (role === "relay") {
    if (tls) {
      return modeBody("relay-https", href, {
        lan,
        tls: true,
        loopback: false,
        role,
        note: lan
          ? "HTTPS relay on a LAN address the node already has. Not LAN discovery and not a hole punch."
          : "Relay HTTPS. The node already has this address. The Worker is one relay.",
      });
    }
    if (lan) {
      return badInput("A relay URL is https, or http on loopback. A configured LAN URL is direct transport, not a relay register target.");
    }
    return natRefuse("Cleartext to a public host is not relay HTTPS and not a configured LAN URL. This protocol does not punch NAT to invent a path.");
  }
  if (lan) {
    return modeBody("direct-lan", href, {
      lan: true,
      tls,
      loopback: false,
      role,
      note: "Configured LAN direct URL. Same signed envelope. This Worker does not discover the LAN.",
    });
  }
  if (tls) {
    return modeBody("direct-lan", href, {
      lan: false,
      tls: true,
      loopback: false,
      configured_public_https: true,
      role,
      note: "Configured direct HTTPS the node already has. Not LAN discovery, not ICANN DNS, and not a hole punch.",
    });
  }
  return natRefuse("Cleartext to a public host is not a configured LAN URL. This protocol does not punch holes through NAT.");
}

export function natPunchRequest(op, payload) {
  const resolved = String(op || "")
    .trim()
    .toLowerCase();
  if (PUNCH_OPS.has(resolved)) return natRefuse(NAT_REFUSE_MESSAGE);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (
    payload.hole_punch === true ||
    payload.nat_punch === true ||
    payload.punch === true ||
    payload.upnp === true ||
    payload.nat_pmp === true
  ) {
    return natRefuse("hole_punch is refused. This protocol does not punch holes through NAT.");
  }
  const mode = String(payload.bearer_mode || payload.transport || "")
    .trim()
    .toLowerCase();
  if (PUNCH_OPS.has(mode)) {
    return natRefuse("That bearer mode needs NAT hole-punch. Refused. Use relay HTTPS, a configured direct or LAN URL, or loopback.");
  }
  const candidate = payload.direct || payload.direct_url || payload.directUrl || payload.relay || payload.relay_url || payload.url;
  if (candidate && urlRequestsPunch(candidate)) {
    return natRefuse("That URL asks for NAT hole-punch. Refused.");
  }
  return null;
}
