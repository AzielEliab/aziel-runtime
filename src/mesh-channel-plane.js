/**
 * QNM channel plane — operator-armed communication cites.
 *
 * wifi / bluetooth / rf / photon are cite/operator-armed.
 * Live OS/hardware bearers run on local qnm-node / qnsd.
 * This Worker cites only. It does not invent RF/BT/Wi-Fi/photon
 * hardware. A cite is not a live Worker radio.
 * Receive-only RF bands and the satellite relay are switches.
 * AM, FM, and SDR satellite receive ship enabled and live false.
 * XM SDARS and the satellite relay stay HELD: paid plans and paid
 * terminals are not switched on. Nothing is purchased. No checkout.
 * Public VPN auto-binds
 * AZVPN (HTTPS/WS REAL). This plane is not a WireGuard/OpenVPN kernel
 * concentrator. Not Tor / SOCKS / origin-hiding.
 *
 * suite-presence remains the Worker rollup bearer.
 * Pairing ≠ tunnel. Concentrator slug is azvpn.
 *
 * Identity: Aziel Eliab only. Not a Softwares-tab product.
 * Not a FragGate slug. Not a new MCP tool.
 */

import { TRAFFIC_PATHS } from "./qnm-honesty.js";

export const CHANNEL_PLANE_SPEC = "QNM-CHANNEL-PLANE-1.0";
export const CHANNEL_PLANE_AUTHOR = "Aziel Eliab";
export const CHANNEL_PLANE_IDENTITY = "Aziel Eliab";
export const CHANNEL_PLANE_PAPER = "docs/designs/QNM-CHANNEL-PLANE-1.0.md";
export const CHANNEL_PLANE_NODE_MESH = "docs/NODE_MESH.md";
export const CHANNEL_CITE = "cite";
export const CHANNEL_DISPLAY = "cite/operator-armed";
export const CHANNEL_ABSENT = "QNM-RADIO-ABSENT";
export const CHANNEL_ORDER = Object.freeze(["lan", "wifi", "bluetooth", "rf", "photon", "satellite_relay"]);
export const RF_BAND_SPEC = "QNM-RF-BANDS-1.0";
export const RF_BAND_PAPER = "docs/designs/QNM-RF-BANDS-1.0.md";
export const RF_BAND_IDS = Object.freeze(["am", "fm", "xm_sdars", "sat_rx"]);
export const SATELLITE_RELAY_ID = "satellite_relay";

export const CHANNEL_PLANE_NOTE =
  "Operator-armed communication channel cites (wifi / bluetooth / rf / photon) are cite/operator-armed. They are not live Worker radios. Live OS/hardware bearers run on local qnm-node / qnsd and refuse QNM-RADIO-ABSENT when that hardware is absent. Order is LAN, then Wi-Fi, then Bluetooth, then RF, then photon. Those traffic-path switches are enabled and live false until code on that path carries traffic. AM, FM, and SDR satellite receive are enabled and live false. XM SDARS and the satellite relay stay HELD (paid plan and paid terminal). No spend, no SKU, no plan, no checkout. The relay does not transmit. Absent devices refuse QNM-RADIO-ABSENT. Nothing is purchased. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT; GET cites only). This plane is not a kernel UDP concentrator. public_proxy false. suite-presence remains the Worker rollup bearer. Pairing ≠ tunnel.";

const CHANNEL_NAMES = Object.freeze(["wifi", "bluetooth", "rf", "photon"]);

export const CHANNEL_CITES = Object.freeze({
  wifi: CHANNEL_CITE,
  bluetooth: CHANNEL_CITE,
  rf: CHANNEL_CITE,
  photon: CHANNEL_CITE,
});

function pathRow(id) {
  return TRAFFIC_PATHS.paths[id] || {};
}

function channelRow(id) {
  return {
    id,
    state: CHANNEL_CITE,
    display: CHANNEL_DISPLAY,
    hardware: false,
    live: false,
    enabled: pathRow(id).enabled === true,
    worker_hardware: false,
    operator_armed: true,
    refuse_when_absent: true,
    code: CHANNEL_ABSENT,
  };
}

function rfBand(id, extra) {
  const path = pathRow(id);
  const enabled = path.enabled === true;
  const held = path.held === true;
  return Object.freeze({
    id,
    parent: "rf",
    spec: RF_BAND_SPEC,
    receive_only: true,
    hardware: false,
    worker_hardware: false,
    refuse_when_absent: true,
    code: CHANNEL_ABSENT,
    mock: false,
    ...extra,
    enabled,
    live: false,
    held,
    transmit: false,
    purchased: false,
    paid_ok: false,
    paid_terminal: false,
    checkout: false,
    state: held || !enabled ? "HELD" : "ARMED",
  });
}

/** Receive-only sub-rows under rf. AM, FM, and sat_rx are armed and not live. XM stays HELD. */
export const RF_BANDS = Object.freeze({
  am: rfBand("am", {
    band: "530-1700 kHz",
    device: "sdr",
    mesh_transmit: false,
    absent_note: "AM receive needs an SDR. The mesh does not transmit on AM. Without an SDR the band refuses QNM-RADIO-ABSENT.",
  }),
  fm: rfBand("fm", {
    band: "88-108 MHz",
    device: "sdr",
    mesh_transmit: false,
    absent_note: "FM receive needs an SDR. The mesh does not transmit on FM. Without an SDR the band refuses QNM-RADIO-ABSENT.",
  }),
  xm_sdars: rfBand("xm_sdars", {
    band: "2320-2345 MHz",
    device: "siriusxm-tuner",
    encrypted: true,
    subscription: true,
    subscription_held: false,
    one_way: true,
    mesh_traffic: false,
    skus: false,
    plans: false,
    spend: false,
    absent_note: "XM SDARS needs a licensed SiriusXM tuner and a paid plan. That plan stays HELD. No SKU, no checkout, no spend. Without the tuner the band refuses QNM-RADIO-ABSENT. It is encrypted, one-way, and cannot carry mesh traffic.",
  }),
  sat_rx: rfBand("sat_rx", {
    band: "satellite-downlink",
    kinds: Object.freeze(["weather", "gnss", "amateur-downlink"]),
    device: "sdr",
    absent_note: "Satellite receive (weather, GNSS, amateur downlinks) needs an SDR. Without an SDR the band refuses QNM-RADIO-ABSENT.",
  }),
});

/** Listed after photon. Paid terminals and plans stay HELD. Not a purchase. */
export const SATELLITE_RELAY_SWITCH = Object.freeze({
  id: SATELLITE_RELAY_ID,
  held: true,
  enabled: false,
  live: false,
  transmit: false,
  purchased: false,
  paid_ok: false,
  paid_terminal: false,
  checkout: false,
  skus: false,
  plans: false,
  spend: false,
  software_path: false,
  encryption_allowed: false,
  hardware: false,
  worker_hardware: false,
  state: "HELD",
  code: CHANNEL_ABSENT,
  envelope_spec: "FED-MESH-1.0",
  envelope_kind: "store-and-forward",
  mock: false,
  note: "Paid satellite terminals and plans stay HELD. Transmit is off. live is false. No spend, no SKU, no plan, no checkout. Nothing is purchased. Without a terminal the relay refuses QNM-RADIO-ABSENT.",
});

export const CHANNEL_ROWS = Object.freeze({
  wifi: Object.freeze(channelRow("wifi")),
  bluetooth: Object.freeze(channelRow("bluetooth")),
  rf: Object.freeze({
    ...channelRow("rf"),
    bands: RF_BANDS,
  }),
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
    rf_bands_spec: RF_BAND_SPEC,
    rf_bands_paper: RF_BAND_PAPER,
    rf_bands: {
      am: { ...RF_BANDS.am },
      fm: { ...RF_BANDS.fm },
      xm_sdars: { ...RF_BANDS.xm_sdars },
      sat_rx: { ...RF_BANDS.sat_rx },
    },
    traffic_paths_spec: TRAFFIC_PATHS.spec,
    traffic_paths_enabled: TRAFFIC_PATHS.enabled === true,
    traffic_paths_live: false,
    traffic_paths_open: TRAFFIC_PATHS.open_paths.slice(),
    traffic_paths_held: TRAFFIC_PATHS.held_paths.slice(),
    traffic_paths: { ...TRAFFIC_PATHS.paths },
    paid_satellite_held: TRAFFIC_PATHS.paid_satellite.held === true,
    paid_satellite_checkout: false,
    paid_satellite_skus: false,
    paid_satellite_plans: false,
    paid_satellite_spend: false,
    satellite_relay: { ...SATELLITE_RELAY_SWITCH },
    rows: {
      wifi: { ...CHANNEL_ROWS.wifi },
      bluetooth: { ...CHANNEL_ROWS.bluetooth },
      rf: { ...CHANNEL_ROWS.rf, bands: { ...RF_BANDS } },
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
    traffic_paths_enabled: TRAFFIC_PATHS.enabled === true,
    traffic_paths_live: false,
    traffic_paths_open: TRAFFIC_PATHS.open_paths.slice(),
    traffic_paths_held: TRAFFIC_PATHS.held_paths.slice(),
    traffic_paths: { ...TRAFFIC_PATHS.paths },
    paid_satellite_held: TRAFFIC_PATHS.paid_satellite.held === true,
    paid_satellite_checkout: false,
    paid_satellite_skus: false,
    paid_satellite_plans: false,
    paid_satellite_spend: false,
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

function claimsLiveValue(value) {
  if (value === true) return true;
  if (typeof value === "string" && LIVE_CHANNEL_WORDS.has(value.trim().toLowerCase())) return true;
  return false;
}

function rowClaimsLive(row) {
  if (!row || typeof row !== "object") return false;
  // enabled is the traffic-path switch. It is not a PHY and not a live hop.
  if (row.live === true || row.hardware === true || row.transmit === true || row.packet_live === true) return true;
  if (claimsLiveValue(row.state) || claimsLiveValue(row.live)) return true;
  return false;
}

function pushBag(bags, bag) {
  if (bag && typeof bag === "object") bags.push(bag);
}

function bandBags(src, plane) {
  const bags = [];
  pushBag(bags, plane.rows && plane.rows.rf && plane.rows.rf.bands);
  pushBag(bags, plane.rf_bands);
  pushBag(bags, src.rf_bands);
  pushBag(bags, src.bands);
  pushBag(bags, src.channels && src.channels.rf && src.channels.rf.bands);
  pushBag(bags, plane.channels && plane.channels.rf && plane.channels.rf.bands);
  pushBag(bags, src.traffic_paths);
  pushBag(bags, plane.traffic_paths);
  return bags;
}

function relayRows(src, plane) {
  const out = [];
  if (src.satellite_relay && typeof src.satellite_relay === "object") out.push(src.satellite_relay);
  if (plane.satellite_relay && typeof plane.satellite_relay === "object") out.push(plane.satellite_relay);
  if (src.traffic_paths && src.traffic_paths.satellite_relay) out.push(src.traffic_paths.satellite_relay);
  if (plane.traffic_paths && plane.traffic_paths.satellite_relay) out.push(plane.traffic_paths.satellite_relay);
  if (plane.rows && plane.rows.satellite_relay) out.push(plane.rows.satellite_relay);
  const lists = [src.d2d_carriers && src.d2d_carriers.carriers, plane.carriers, src.carriers];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (row && row.id === SATELLITE_RELAY_ID) out.push(row);
    }
  }
  return out;
}

function deviceNamed(row) {
  if (!row || typeof row !== "object") return false;
  if (row.hardware === true) return true;
  return typeof row.hardware === "string" && row.hardware.length > 0 && row.hardware !== "false";
}

/**
 * True when a Worker body claims a radio it cannot see.
 * A receive-only band or the satellite relay that reads live, transmit,
 * packet_live, or hardware true without a device is that claim.
 * enabled true is the traffic-path switch and is not that claim.
 * The worker never has the device.
 */
export function workerClaimsRadioHardware(body) {
  const src = body && typeof body === "object" ? body : {};
  const hardwareAbsent = src.worker_hardware === false || (src.channel_plane && src.channel_plane.worker_hardware === false);
  const plane = src.channel_plane && typeof src.channel_plane === "object" ? src.channel_plane : {};
  const channels = src.channels && typeof src.channels === "object" ? src.channels : {};
  if (hardwareAbsent) {
    for (const name of CHANNEL_NAMES) {
      for (const value of [src[name], channels[name], plane[name]]) {
        if (claimsLiveValue(value)) return true;
      }
      const row = plane.rows && plane.rows[name];
      if (row && (row.hardware === true || row.live === true)) return true;
    }
    if (plane.worker_radios_live === true || src.worker_radios_live === true) return true;
    for (const bag of bandBags(src, plane)) {
      for (const id of RF_BAND_IDS) {
        if (rowClaimsLive(bag[id])) return true;
      }
    }
    for (const id of RF_BAND_IDS) {
      if (claimsLiveValue(src[id]) || claimsLiveValue(channels[id]) || claimsLiveValue(plane[id])) return true;
    }
    for (const row of relayRows(src, plane)) {
      if (rowClaimsLive(row)) return true;
    }
    if (claimsLiveValue(src.satellite_relay) || claimsLiveValue(plane.satellite_relay)) return true;
  }
  for (const bag of bandBags(src, plane)) {
    for (const id of RF_BAND_IDS) {
      const row = bag[id];
      if (!rowClaimsLive(row)) continue;
      if (!deviceNamed(row) || row.code === CHANNEL_ABSENT) return true;
    }
  }
  for (const row of relayRows(src, plane)) {
    if (!rowClaimsLive(row)) continue;
    if (!deviceNamed(row) || row.code === CHANNEL_ABSENT) return true;
  }
  return false;
}
