/**
 * Public VPN cite — OPERATOR-OVERRIDE 2026-09-17.
 *
 * Public VPN is ON. The REAL concentrator is AZVPN (slug azvpn):
 * application-layer HTTPS / FragGate envelopes (+ WS attach).
 * AZVPN is the automatic backend (default_vpn_backend / auto_use).
 * Callers do not name software=azvpn on mesh / pair / session / browser
 * paths that need a tunnel. Explicit FragGate azvpn/* ops still exist.
 * WireGuard / OpenVPN / L3 exit stay SLOT. Worker does not host a
 * kernel UDP VPN concentrator.
 *
 * Identity: Aziel Eliab only. Not a new MCP tool.
 */

export const PUBLIC_VPN_DATE = "2026-09-17";
export const PUBLIC_VPN_SPEC = "OPERATOR-OVERRIDE-2026-09-17-VPN";
export const PUBLIC_VPN_AUTHOR = "Aziel Eliab";
export const PUBLIC_VPN_IDENTITY = "Aziel Eliab";
export const PUBLIC_VPN_SLUG = "azvpn";
export const PUBLIC_VPN_NAME = "AZVPN";
export const PUBLIC_VPN_PAPER = "docs/designs/AZVPN-CONCENTRATOR-1.0.md";

export const DEFAULT_VPN_BACKEND = PUBLIC_VPN_SLUG;
export const VPN_AUTO_USE = true;

export const PUBLIC_VPN_NOTE =
  "Operator 2026-09-17 armed public VPN. REAL path is AZVPN (slug azvpn): application-layer HTTPS/FragGate encrypted envelopes (+ optional WS attach). AZVPN is the automatic backend (default_vpn_backend:azvpn, auto_use:true) — mesh / AZNet pair / session / AZBrowser paths that need a tunnel auto-select it. Explicit FragGate azvpn/* still exist. Worker terminates those app-layer sessions. WireGuard UDP, OpenVPN, and L3 exit-IP pools stay SLOT — this isolate is not a kernel VPN concentrator. Not Tor. Not origin-hiding. GodLock is a product name, not a kernel VPN. FragGate is THE single public door.";

export const TUNNEL_KIND_MATRIX = Object.freeze({
  https_ws: "REAL",
  fraggate_envelopes: "REAL",
  websocket_attach: "REAL",
  wireguard: "SLOT",
  openvpn: "SLOT",
  l3_exit_pool: "SLOT",
  kernel_udp: "SLOT",
  tun_tap: "SLOT",
});

/** Config cite only. Execution lives in src/azvpn-auto.js. GET never opens. */
export const VPN_AUTO = Object.freeze({
  default_vpn_backend: DEFAULT_VPN_BACKEND,
  auto_use: VPN_AUTO_USE,
  auto_bind: true,
  concentrator_slug: PUBLIC_VPN_SLUG,
  concentrator_name: PUBLIC_VPN_NAME,
  door: "fraggate",
  explicit_ops: ["describe", "open", "status", "list", "close", "send", "recv", "pull", "peers", "attach"],
  hooks: Object.freeze({
    mesh_get: "cite-only",
    mesh_vpn: "ensure",
    aznet_pair: "cite-and-ensure-when-paired-or-armed",
    session_open: "ensure-when-armed",
    azbrowser_vpn: "ensure",
  }),
  note:
    "AZVPN is the automatic public-VPN / tunnel-concentrator backend. Callers do not name software=azvpn. GET /v1/mesh cites this bind and never opens a session. If auto cannot start, refuse honestly — never fake connected.",
});

export function vpnAutoCite(extra = {}) {
  return {
    ...VPN_AUTO,
    hooks: { ...VPN_AUTO.hooks },
    get_never_opens: extra.open === true ? false : true,
    ...extra,
  };
}

export function publicVpnCite() {
  return {
    spec: PUBLIC_VPN_SPEC,
    date: PUBLIC_VPN_DATE,
    author: PUBLIC_VPN_AUTHOR,
    identity: PUBLIC_VPN_IDENTITY,
    operator_armed: true,
    vpn: true,
    public_vpn: true,
    tunnel_concentrator: true,
    concentrator_slug: PUBLIC_VPN_SLUG,
    concentrator_name: PUBLIC_VPN_NAME,
    default_vpn_backend: DEFAULT_VPN_BACKEND,
    auto_use: VPN_AUTO_USE,
    auto_bind: true,
    vpn_auto: vpnAutoCite({ open: false }),
    door: "fraggate",
    worker_terminates_tunnels: true,
    worker_terminates_kernel_udp: false,
    wireguard: false,
    openvpn: false,
    l3_exit_pool: false,
    tor: false,
    socks: false,
    origin_hiding: false,
    kinds: { ...TUNNEL_KIND_MATRIX },
    paper: PUBLIC_VPN_PAPER,
    note: PUBLIC_VPN_NOTE,
  };
}

export function publicVpnHint() {
  const cite = publicVpnCite();
  return {
    vpn: true,
    public_vpn: true,
    tunnel_concentrator: true,
    concentrator_slug: cite.concentrator_slug,
    default_vpn_backend: DEFAULT_VPN_BACKEND,
    auto_use: VPN_AUTO_USE,
    worker_terminates_tunnels: true,
    worker_terminates_kernel_udp: false,
    kinds: { ...TUNNEL_KIND_MATRIX },
    note: PUBLIC_VPN_NOTE,
  };
}

const TRUTHY = new Set(["1", "true", "on", "yes"]);

export function vpnArmed(src) {
  if (!src || typeof src !== "object") return false;
  for (const key of ["vpn", "public_vpn", "tunnel", "tunnel_needed", "tunnel_concentrator"]) {
    const v = src[key];
    if (v === true) return true;
    if (v != null && v !== false && TRUTHY.has(String(v).trim().toLowerCase())) return true;
  }
  return false;
}
