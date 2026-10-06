/**
 * QNM channel plane — operator-armed communication cites.
 *
 * wifi / bluetooth / rf / photon are cite/operator-armed.
 * Live OS/hardware bearers run on local qnm-node / qnsd.
 * This Worker cites only. It does not invent RF/BT/Wi-Fi/photon
 * hardware. A cite is not a live Worker radio. Public VPN auto-binds
 * AZVPN (HTTPS/WS REAL). This plane is not a WireGuard/OpenVPN kernel
 * concentrator. Not Tor / SOCKS / origin-hiding.
 *
 * suite-presence remains the Worker rollup bearer.
 * Pairing ≠ tunnel. Concentrator slug is azvpn.
 *
 * Identity: Aziel Eliab only. Not a Softwares-tab product.
 * Not a FragGate slug. Not a new MCP tool.
 */

export const CHANNEL_PLANE_SPEC = "QNM-CHANNEL-PLANE-1.0";
export const CHANNEL_PLANE_AUTHOR = "Aziel Eliab";
export const CHANNEL_PLANE_IDENTITY = "Aziel Eliab";
export const CHANNEL_PLANE_PAPER = "docs/designs/QNM-CHANNEL-PLANE-1.0.md";
export const CHANNEL_PLANE_NODE_MESH = "docs/NODE_MESH.md";
export const CHANNEL_CITE = "cite";
export const CHANNEL_DISPLAY = "cite/operator-armed";
export const CHANNEL_ABSENT = "QNM-RADIO-ABSENT";
export const CHANNEL_ORDER = Object.freeze(["lan", "wifi", "bluetooth", "rf", "photon"]);

export const CHANNEL_PLANE_NOTE =
  "Operator-armed communication channel cites (wifi / bluetooth / rf / photon) are cite/operator-armed. They are not live Worker radios. Live OS/hardware bearers run on local qnm-node / qnsd and refuse QNM-RADIO-ABSENT when that hardware is absent. Order is LAN, then Wi-Fi, then Bluetooth, then RF, then photon. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT; GET cites only). This plane is not a kernel UDP concentrator. public_proxy false. suite-presence remains the Worker rollup bearer. Pairing ≠ tunnel.";

const CHANNEL_NAMES = Object.freeze(["wifi", "bluetooth", "rf", "photon"]);

export const CHANNEL_CITES = Object.freeze({
  wifi: CHANNEL_CITE,
  bluetooth: CHANNEL_CITE,
  rf: CHANNEL_CITE,
  photon: CHANNEL_CITE,
});

function channelRow(id) {
  return {
    id,
    state: CHANNEL_CITE,
    display: CHANNEL_DISPLAY,
    hardware: false,
    live: false,
    worker_hardware: false,
    operator_armed: true,
    refuse_when_absent: true,
    code: CHANNEL_ABSENT,
  };
}

export const CHANNEL_ROWS = Object.freeze({
  wifi: Object.freeze(channelRow("wifi")),
  bluetooth: Object.freeze(channelRow("bluetooth")),
  rf: Object.freeze(channelRow("rf")),
  photon: Object.freeze(channelRow("photon")),
});

function citeBody() {
  return {
    spec: CHANNEL_PLANE_SPEC,
    author: CHANNEL_PLANE_AUTHOR,
    identity: CHANNEL_PLANE_IDENTITY,
    operator_armed: true,
    plane: "channel",
    display: CHANNEL_DISPLAY,
    wifi: CHANNEL_CITE,
    bluetooth: CHANNEL_CITE,
    rf: CHANNEL_CITE,
    photon: CHANNEL_CITE,
    channels: { ...CHANNEL_CITES },
    rows: {
      wifi: { ...CHANNEL_ROWS.wifi },
      bluetooth: { ...CHANNEL_ROWS.bluetooth },
      rf: { ...CHANNEL_ROWS.rf },
      photon: { ...CHANNEL_ROWS.photon },
    },
    carrier_order: CHANNEL_ORDER.slice(),
    bearer: "suite-presence",
    worker_bearer: "suite-presence",
    worker_hardware: false,
    worker_radios_live: false,
    invented_hardware: false,
    public_proxy: false,
    local_process: "qnm-node / qnsd",
    local: "https://github.com/AzielEliab/qnm-node",
    local_radio_hooks: {
      path: "qnm-node/bearers/radio.js",
      law: "LIVE-when-HW-present / refuse-when-absent",
      mock: false,
      worker_hardware: false,
    },
    vpn: true,
    public_vpn: true,
    tunnel_concentrator: true,
    concentrator_slug: "azvpn",
    default_vpn_backend: "azvpn",
    auto_use: true,
    worker_terminates_tunnels: true,
    worker_terminates_kernel_udp: false,
    tor: false,
    socks: false,
    origin_hiding: false,
    tunnel: false,
    paper: CHANNEL_PLANE_PAPER,
    node_mesh: CHANNEL_PLANE_NODE_MESH,
    note: CHANNEL_PLANE_NOTE,
  };
}

export const CHANNEL_PLANE = Object.freeze({
  ...citeBody(),
  channels: Object.freeze({ ...CHANNEL_CITES }),
  rows: CHANNEL_ROWS,
  carrier_order: CHANNEL_ORDER,
});

export function channelPlaneCite() {
  return citeBody();
}

/** Spread onto GET /v1/mesh (+ status) and mesh hint/cite surfaces. */
export function channelPlaneFrame() {
  return {
    channel_plane: channelPlaneCite(),
    channels: { ...CHANNEL_CITES },
    wifi: CHANNEL_CITE,
    bluetooth: CHANNEL_CITE,
    rf: CHANNEL_CITE,
    photon: CHANNEL_CITE,
    channel_plane_note: CHANNEL_PLANE_NOTE,
    channel_display: CHANNEL_DISPLAY,
    worker_hardware: false,
    worker_radios_live: false,
    invented_hardware: false,
  };
}

export function channelPlaneHint() {
  return {
    spec: CHANNEL_PLANE_SPEC,
    wifi: CHANNEL_CITE,
    bluetooth: CHANNEL_CITE,
    rf: CHANNEL_CITE,
    photon: CHANNEL_CITE,
    display: CHANNEL_DISPLAY,
    vpn: true,
    public_vpn: true,
    concentrator_slug: "azvpn",
    default_vpn_backend: "azvpn",
    auto_use: true,
    public_proxy: false,
    worker_hardware: false,
    worker_radios_live: false,
    note: CHANNEL_PLANE_NOTE,
  };
}

const LIVE_CHANNEL_WORDS = new Set(["on", "live", "true", "1", "yes", "enable", "enabled"]);

/** True when a Worker body claims a radio it cannot see. */
export function workerClaimsRadioHardware(body) {
  const src = body && typeof body === "object" ? body : {};
  const hardwareAbsent = src.worker_hardware === false || (src.channel_plane && src.channel_plane.worker_hardware === false);
  if (!hardwareAbsent) return false;
  const plane = src.channel_plane && typeof src.channel_plane === "object" ? src.channel_plane : {};
  const channels = src.channels && typeof src.channels === "object" ? src.channels : {};
  for (const name of CHANNEL_NAMES) {
    for (const value of [src[name], channels[name], plane[name]]) {
      if (value === true) return true;
      if (typeof value === "string" && LIVE_CHANNEL_WORDS.has(value.trim().toLowerCase())) return true;
    }
    const row = plane.rows && plane.rows[name];
    if (row && (row.hardware === true || row.live === true)) return true;
  }
  if (plane.worker_radios_live === true || src.worker_radios_live === true) return true;
  return false;
}
