/**
 * AZVPN auto-bind — default public VPN / tunnel concentrator backend.
 *
 * Operator 2026-09-17: fill for backend auto use — no need to call in
 * place auto. Mesh, AZNet pair, runtime session, and AZBrowser paths that
 * need a tunnel auto-select AZVPN. Callers do not name software=azvpn.
 * Explicit FragGate azvpn/* ops still exist.
 *
 * GET /v1/mesh cites this bind and never opens a session.
 * If auto cannot start, refuse honestly (no fake connected).
 *
 * Identity: Aziel Eliab only. Not a new MCP tool.
 */

import {
  DEFAULT_VPN_BACKEND,
  PUBLIC_VPN_NAME,
  PUBLIC_VPN_SLUG,
  VPN_AUTO_USE,
  publicVpnCite,
  vpnArmed,
  vpnAutoCite,
} from "./public-vpn.js";
import { findAutoTunnel, openTunnel } from "./engines/azvpn/engine.js";

export const AUTO_PEER = "auto-backend";

export {
  DEFAULT_VPN_BACKEND,
  VPN_AUTO_USE,
  vpnArmed,
  vpnAutoCite,
};

function honestyRefuse(code, message, extra = {}) {
  return {
    ...publicVpnCite(),
    ok: false,
    refused: true,
    auto: true,
    connected: false,
    fake_connected: false,
    default_vpn_backend: DEFAULT_VPN_BACKEND,
    auto_use: VPN_AUTO_USE,
    concentrator_slug: PUBLIC_VPN_SLUG,
    concentrator_name: PUBLIC_VPN_NAME,
    code,
    error: message,
    vpn_auto: vpnAutoCite({ open: true }),
    ...extra,
  };
}

function publicAutoSession(rowOrOpen) {
  if (!rowOrOpen) return null;
  return {
    tunnel_id: rowOrOpen.tunnel_id,
    kind: rowOrOpen.kind || "https_ws",
    peer: rowOrOpen.peer || AUTO_PEER,
    route_id: rowOrOpen.route_id || null,
    state: rowOrOpen.state || (rowOrOpen.closed ? "closed" : "open"),
    honesty: "REAL",
    auto: true,
    backend: PUBLIC_VPN_SLUG,
    expires_at: rowOrOpen.expires_at || null,
    token: rowOrOpen.token || null,
    session_key: rowOrOpen.session_key || null,
    session_key_once: rowOrOpen.session_key_once === true,
    attach: rowOrOpen.attach || null,
    receipt: rowOrOpen.receipt || null,
  };
}

/**
 * Open or reuse the default AZVPN concentrator session.
 * Never claims WireGuard/OpenVPN connected.
 */
export async function ensureDefaultVpnSession(payload = {}, env) {
  if (!VPN_AUTO_USE) {
    return honestyRefuse("AZVPN-AUTO-OFF", "AZVPN auto_use is off. Call FragGate azvpn/open explicitly.");
  }
  try {
    const existing = await findAutoTunnel();
    if (existing && existing.tunnel_id) {
      return {
        ...publicVpnCite(),
        ok: true,
        auto: true,
        already: true,
        connected: true,
        kind: "https_ws",
        fake_connected: false,
        default_vpn_backend: DEFAULT_VPN_BACKEND,
        auto_use: VPN_AUTO_USE,
        concentrator_slug: PUBLIC_VPN_SLUG,
        concentrator_name: PUBLIC_VPN_NAME,
        vpn_auto: vpnAutoCite({ open: true, already: true }),
        tunnel_id: existing.tunnel_id,
        session: publicAutoSession(existing),
      };
    }
    const opened = await openTunnel({
      ...(payload && typeof payload === "object" ? payload : {}),
      kind: "https_ws",
      peer: AUTO_PEER,
      auto: true,
      env,
    });
    if (!opened || opened.ok === false) {
      return honestyRefuse(opened && opened.code ? opened.code : "AZVPN-AUTO-FAIL", opened && opened.error ? opened.error : "AZVPN auto-bind could not start a concentrator session.", {
        detail: opened || null,
      });
    }
    return {
      ...opened,
      ok: true,
      auto: true,
      already: false,
      connected: true,
      fake_connected: false,
      default_vpn_backend: DEFAULT_VPN_BACKEND,
      auto_use: VPN_AUTO_USE,
      concentrator_slug: PUBLIC_VPN_SLUG,
      concentrator_name: PUBLIC_VPN_NAME,
      vpn_auto: vpnAutoCite({ open: true, already: false }),
      session: publicAutoSession(opened),
    };
  } catch (err) {
    return honestyRefuse("AZVPN-AUTO-FAIL", err && err.message ? err.message : "AZVPN auto-bind failed.", {
      exception: true,
    });
  }
}

/** Cite-only bind. GET /v1/mesh and other read paths. Never opens. */
export function vpnAutoGetCite() {
  return {
    ...publicVpnCite(),
    vpn_auto: vpnAutoCite({ open: false, get_never_opens: true }),
    get_never_opens: true,
    auto_opened: false,
    connected: false,
    note:
      "Public VPN auto-bind cite. GET never opens an AZVPN session. POST mesh vpn / paired AZNet / armed session / AZBrowser vpn call ensureDefaultVpnSession.",
  };
}
