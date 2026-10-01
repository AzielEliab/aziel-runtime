/**
 * Version and bearer negotiation for AZP-NS-1.0.
 * Unavailable bearers are refused. They are not marked LIVE.
 * Author: Aziel Eliab only.
 */

import { AZP_SPEC } from "../security/claims.js";

export const PROTOCOL_VERSION = AZP_SPEC;
export const ROUTE_CLASSES = Object.freeze(["direct", "relay"]);

export const REFUSED_BEARERS = Object.freeze([
  "tor",
  "udp",
  "radio",
  "sandbox",
  "wireguard",
  "openvpn",
  "cap7-egress",
  "icann",
  "stun",
  "turn",
]);

function refuse(code, message, extra = {}) {
  return { ok: false, code, fail_closed: true, live: false, message, ...extra };
}

export function negotiateVersion(offered) {
  const version = String(offered || "");
  if (version === PROTOCOL_VERSION) {
    return { ok: true, version: PROTOCOL_VERSION, downgraded: false, live: true };
  }
  return refuse("AZP-DOWNGRADE", "Protocol version is refused. Versions are not silently downgraded.", {
    offered: version,
    required: PROTOCOL_VERSION,
  });
}

export function negotiateRouteClass(routeClass) {
  const name = String(routeClass || "");
  if (ROUTE_CLASSES.includes(name)) return { ok: true, route_class: name };
  return refuse("AZP-REFUSE", "Route class is not admitted.");
}

export function negotiateBearer(name) {
  const id = String(name || "").trim().toLowerCase();
  if (!id) return refuse("AZP-BEARER-REFUSE", "Bearer name is empty. Fail closed.");
  if (REFUSED_BEARERS.includes(id)) {
    return refuse("AZP-BEARER-REFUSE", `${id} is not an implemented bearer. Refused.`, {
      bearer: id,
      tor: false,
      udp: false,
      radio_phy: false,
      sandbox: false,
      public_icann: false,
      cap7_public_egress: false,
    });
  }
  if (id === "relay" || id === "direct") return { ok: true, bearer: id, live: false, configured: "caller" };
  return refuse("AZP-BEARER-REFUSE", "Unknown bearer is refused. Nothing is painted LIVE.", { bearer: id });
}
