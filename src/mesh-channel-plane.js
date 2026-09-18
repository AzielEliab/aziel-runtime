/**
 * QNM channel plane — operator-armed communication cites.
 *
 * wifi / bluetooth / rf / photon are ON as a channel plane.
 * Live OS/hardware bearers run on local qnm-node / qnsd.
 * This Worker cites only. It does not invent RF/BT/Wi-Fi/photon
 * hardware and it is not a VPN / Tor / SOCKS / origin-hiding fabric.
 *
 * suite-presence remains the Worker rollup bearer.
 * Channel plane ≠ VPN. Pairing ≠ tunnel.
 *
 * Identity: Aziel Eliab only. Not a Softwares-tab product.
 * Not a FragGate slug. Not a new MCP tool.
 */

export const CHANNEL_PLANE_SPEC = "QNM-CHANNEL-PLANE-1.0";
export const CHANNEL_PLANE_AUTHOR = "Aziel Eliab";
export const CHANNEL_PLANE_IDENTITY = "Aziel Eliab";
export const CHANNEL_PLANE_PAPER = "docs/designs/QNM-CHANNEL-PLANE-1.0.md";
export const CHANNEL_PLANE_NODE_MESH = "docs/NODE_MESH.md";

export const CHANNEL_PLANE_NOTE =
  "Operator-armed communication channel cites (wifi / bluetooth / rf / photon) are ON as a channel plane. Live OS/hardware bearers run on local qnm-node / qnsd — not Worker-proxied VPN, not Tor, not SOCKS, not origin-hiding. This Worker does not invent RF/BT/Wi-Fi/photon hardware. public_proxy false. suite-presence remains the Worker rollup bearer. Channel plane ≠ VPN.";

export const CHANNEL_CITES = Object.freeze({
  wifi: "on",
  bluetooth: "on",
  rf: "on",
  photon: "on",
});

export const CHANNEL_PLANE = Object.freeze({
  spec: CHANNEL_PLANE_SPEC,
  author: CHANNEL_PLANE_AUTHOR,
  identity: CHANNEL_PLANE_IDENTITY,
  operator_armed: true,
  plane: "channel",
  wifi: "on",
  bluetooth: "on",
  rf: "on",
  photon: "on",
  channels: { ...CHANNEL_CITES },
  bearer: "suite-presence",
  worker_bearer: "suite-presence",
  worker_hardware: false,
  invented_hardware: false,
  public_proxy: false,
  local_process: "qnm-node / qnsd",
  local: "https://github.com/AzielEliab/qnm-node",
  vpn: false,
  tor: false,
  socks: false,
  origin_hiding: false,
  tunnel: false,
  paper: CHANNEL_PLANE_PAPER,
  node_mesh: CHANNEL_PLANE_NODE_MESH,
  note: CHANNEL_PLANE_NOTE,
});

export function channelPlaneCite() {
  return {
    spec: CHANNEL_PLANE_SPEC,
    author: CHANNEL_PLANE_AUTHOR,
    identity: CHANNEL_PLANE_IDENTITY,
    operator_armed: true,
    plane: "channel",
    wifi: "on",
    bluetooth: "on",
    rf: "on",
    photon: "on",
    channels: { ...CHANNEL_CITES },
    bearer: "suite-presence",
    worker_bearer: "suite-presence",
    worker_hardware: false,
    invented_hardware: false,
    public_proxy: false,
    local_process: "qnm-node / qnsd",
    local: "https://github.com/AzielEliab/qnm-node",
    vpn: false,
    tor: false,
    socks: false,
    origin_hiding: false,
    tunnel: false,
    paper: CHANNEL_PLANE_PAPER,
    node_mesh: CHANNEL_PLANE_NODE_MESH,
    note: CHANNEL_PLANE_NOTE,
  };
}

/** Spread onto GET /v1/mesh (+ status) and mesh hint/cite surfaces. */
export function channelPlaneFrame() {
  return {
    channel_plane: channelPlaneCite(),
    channels: { ...CHANNEL_CITES },
    wifi: "on",
    bluetooth: "on",
    rf: "on",
    photon: "on",
    channel_plane_note: CHANNEL_PLANE_NOTE,
    worker_hardware: false,
    invented_hardware: false,
  };
}

export function channelPlaneHint() {
  return {
    spec: CHANNEL_PLANE_SPEC,
    wifi: "on",
    bluetooth: "on",
    rf: "on",
    photon: "on",
    vpn: false,
    public_proxy: false,
    worker_hardware: false,
    note: CHANNEL_PLANE_NOTE,
  };
}
