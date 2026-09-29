/**
 * FED-MESH-1.0 peer bearers. Not a second internet.
 * Relay HTTPS, a configured direct or LAN URL, and loopback.
 * NAT hole-punch is refused. No public ICANN DNS. No radio PHY.
 * Author: Aziel Eliab only.
 */

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

export function peerBearerCite() {
  return {
    spec: FED_SPEC,
    not_a_second_internet: true,
    sidenet: false,
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
    note: "Peer bearers are relay HTTPS, a configured direct or LAN URL, and loopback. A peer with no public address and no configured direct URL uses a relay. This protocol does not punch holes through NAT. The Worker does not publish ICANN DNS and does not claim radio PHY without hardware. GET /v1/mesh never enables. This is not a second internet.",
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
