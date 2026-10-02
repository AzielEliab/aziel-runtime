/**
 * Device-to-device packet carriers (D2D-CARRIERS-1.0).
 *
 * Phase A scaffold. Separate from the Cap-7 / MirageGrid name plane.
 * Failover order is LAN, Wi-Fi, Bluetooth, RF, then photon light flashes.
 * Every hop stays NOT-READY / FG-STUB until a real path works.
 * Hardware absence refuses. Hardware presence does not paint a hop LIVE.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const D2D_SPEC = "D2D-CARRIERS-1.0";
export const D2D_AUTHOR = "Aziel Eliab";
export const D2D_STATUS = "NOT-READY";
export const D2D_CODE = "FG-STUB";
export const D2D_ORDER_LABEL = "LAN, Wi-Fi, Bluetooth, RF, photon light flashes";
export const D2D_ORDER_ARROW = "LAN → Wi-Fi → Bluetooth → RF → Photon light flashes";
export const D2D_PLANE = "track2-reachability";
export const D2D_PAPER = "docs/designs/D2D-CARRIERS-1.0.md";

export const D2D_CARRIERS = Object.freeze([
  Object.freeze({
    order: 1,
    id: "lan",
    name: "LAN",
    op: "d2d_lan",
    status: D2D_STATUS,
    code: D2D_CODE,
    packet_live: false,
    mock: false,
    functional: true,
    peer_exchange_demonstrated: false,
    absent_code: "QNM-RADIO-ABSENT",
    hw: "lan-interface",
    note: "First preference. Wired or same-L2 ethernet. Hardware absent refuses. A named interface is not a demonstrated peer hop.",
  }),
  Object.freeze({
    order: 2,
    id: "wifi",
    name: "Wi-Fi",
    op: "d2d_wifi",
    status: D2D_STATUS,
    code: D2D_CODE,
    packet_live: false,
    mock: false,
    functional: true,
    peer_exchange_demonstrated: false,
    absent_code: "QNM-RADIO-ABSENT",
    hw: "wifi-nm",
    note: "Second preference. Infrastructure Wi-Fi and Wi-Fi Direct when armed. Absent radio refuses. A channel-plane cite is not this hop.",
  }),
  Object.freeze({
    order: 3,
    id: "bluetooth",
    name: "Bluetooth",
    op: "d2d_bluetooth",
    status: D2D_STATUS,
    code: D2D_CODE,
    packet_live: false,
    mock: false,
    functional: true,
    peer_exchange_demonstrated: false,
    absent_code: "QNM-RADIO-ABSENT",
    hw: "bluez",
    note: "Third preference. Bluetooth or BLE when the radio is present. Absent radio refuses. BlueZ presence is not a demonstrated hop.",
  }),
  Object.freeze({
    order: 4,
    id: "rf",
    name: "RF",
    op: "d2d_rf",
    status: D2D_STATUS,
    code: D2D_CODE,
    packet_live: false,
    mock: false,
    functional: true,
    peer_exchange_demonstrated: false,
    absent_code: "QNM-RADIO-ABSENT",
    hw: "rf-beyond-wifi-bt",
    note: "Fourth preference. Dedicated RF mesh hop beyond Wi-Fi and Bluetooth. Prefer cellular / ModemManager when that radio is present. Refuse when it is absent. No mock LIVE.",
  }),
  Object.freeze({
    order: 5,
    id: "photon",
    name: "Photon",
    op: "d2d_photon",
    status: D2D_STATUS,
    code: D2D_CODE,
    packet_live: false,
    mock: false,
    functional: true,
    peer_exchange_demonstrated: false,
    absent_code: "QNM-RADIO-ABSENT",
    hw: "camera-flash",
    note: "Last resort. Optical / LiFi-style light-flash encoding on camera and flash or LED. Refuse when that hardware is absent. Local qnsd is not this flash path. No mock LIVE.",
  }),
]);

const D2D_EXTRA_OPS = Object.freeze([
  "d2d_discover",
  "d2d-discover",
  "discover",
  "discovery",
  "d2d_tunnel",
  "d2d-tunnel",
  "d2d_multi_hop",
  "d2d-multi-hop",
  "multi_hop",
  "multi-hop",
  "multihop",
  "d2d_packet",
  "alt_internet",
  "packet_forward",
  "mesh_discover",
  "peer_advertise",
  "peer_list",
  "peer_session_open",
  "peer_session_status",
  "peer_session_close",
  "peer_send",
  "peer_recv",
  "outbox_enqueue",
  "outbox_cut",
  "store_forward",
  "path_probe",
  "bootstrap_list",
  "shelf_cite",
  "tip_pull",
  "origin_status",
]);

/** Route-shaped Track 2 names. Door stays FG-STUB. Kernel also cites MESH-NO-ROUTE. */
export const D2D_ROUTE_OPS = Object.freeze([
  "store_forward",
  "path_probe",
  "d2d_multi_hop",
  "d2d-multi-hop",
  "multi_hop",
  "multi-hop",
  "multihop",
  "packet_forward",
]);

const D2D_ROUTE_SET = new Set(D2D_ROUTE_OPS);

export function isD2dRouteOp(op) {
  return D2D_ROUTE_SET.has(String(op || "").trim().toLowerCase());
}

function carrierOpNames(row) {
  return [row.op, row.id, row.op.split("_").join("-")];
}

export const D2D_STUB_OPS = Object.freeze(
  [...new Set([...D2D_CARRIERS.flatMap(carrierOpNames), ...D2D_EXTRA_OPS])],
);

const D2D_STUB_SET = new Set(D2D_STUB_OPS);

export function isD2dStubOp(op) {
  return D2D_STUB_SET.has(String(op || "").trim().toLowerCase());
}

export function d2dStubMessage(op) {
  const name = String(op || "d2d").trim() || "d2d";
  return `${name} stays NOT-READY on Track 2 packet reachability (${D2D_ORDER_ARROW}). FragGate returns FG-STUB. WARN-5 is STANDS-until-demonstrated. Cap-7 stays the name plane (MG-NO-IP-EXIT). alt_internet_live is false.`;
}

export function d2dCarrierCite() {
  return {
    spec: D2D_SPEC,
    author: D2D_AUTHOR,
    identity: D2D_AUTHOR,
    plane: D2D_PLANE,
    phase: "A",
    separate_from: "cap7-name",
    cap7_is_name_plane: true,
    cap7_public_icann: false,
    cap7_public_egress: false,
    mirage_is_azvpn: false,
    aznet_replaces_internet: false,
    not_a_second_internet: true,
    alt_internet_live: false,
    packet_path_live: false,
    field_1_0: false,
    warn5: "STANDS-until-demonstrated",
    warn5_permanent_stay_off: false,
    preference: "failover",
    order: D2D_CARRIERS.map((row) => row.id),
    order_label: D2D_ORDER_LABEL,
    order_arrow: D2D_ORDER_ARROW,
    status: D2D_STATUS,
    code: D2D_CODE,
    warn5_until: "demonstrated",
    warn5_by_design: "separate-from-icann",
    refuse: {
      packet: D2D_CODE,
      radio_absent: "QNM-RADIO-ABSENT",
      cap7_egress: "MG-NO-IP-EXIT",
      cap7_egress_engine: "MG-NOT-PUBLIC-EGRESS",
      bearer: "AZP-BEARER-REFUSE",
      payload: "AZN-NO-PAYLOAD",
      route: "MESH-NO-ROUTE",
      stay_off: "MESH-STAY-OFF",
      nat: "FED-MESH-NAT-REFUSE",
    },
    carriers: D2D_CARRIERS.map((row) => ({ ...row })),
    security: {
      isolation: "single-node security-awareness",
      phoenix: "local wait / re-seal",
      mesh_fenced_to_loopback: false,
      forced_loopback: false,
      loopback_isolation: false,
    },
    paper: D2D_PAPER,
    note: `Track 2 node-mesh packet reachability stays ${D2D_STATUS} / STANDS-until-demonstrated. Failover is ${D2D_ORDER_ARROW}. RF and photon light flashes are functional carriers: refuse QNM-RADIO-ABSENT when that hardware is absent, and do not paint LIVE without a demonstrated peer exchange. Cap-7 / .aziel stay Track 1 name-plane metadata. MirageGrid is not AZVPN. AZNet is the hash-continuity side-net and does not host payloads. Isolation is single-node security-awareness. Phoenix is local wait / re-seal. alt_internet_live is false.`,
  };
}

export function d2dCarrierFrame() {
  return {
    d2d_carriers: d2dCarrierCite(),
    d2d_status: D2D_STATUS,
    d2d_code: D2D_CODE,
    packet_path_live: false,
    alt_internet_live: false,
  };
}
