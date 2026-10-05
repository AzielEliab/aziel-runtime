/**
 * Device-to-device packet carriers (D2D-CARRIERS-1.0).
 *
 * Separate from the Cap-7 / MirageGrid name plane.
 * Failover order is LAN, Wi-Fi, Bluetooth, RF, then photon light flashes.
 * Phase B/C run on the local node: LAN discovery is LIVE-when-armed,
 * and the peer tunnel is LIVE-when-session. Phase D store-forward is
 * LIVE-when-three-local-nodes / fixture on that local node. Phase E
 * bootstrap and shelf cites stay scaffold. The public Worker door stays
 * FG-STUB. RF and photon refuse without hardware. No mock LIVE.
 * alt_internet_live stays false. WARN-5 stays STANDS-until-demonstrated
 * and is not closed by the fixture.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { currentAltInternetFact } from "./alt-internet-fact.js";

export const D2D_SPEC = "D2D-CARRIERS-1.0";
export const D2D_AUTHOR = "Aziel Eliab";
export const D2D_STATUS = "NOT-READY";
export const D2D_CODE = "FG-STUB";
export const D2D_ORDER_LABEL = "LAN, Wi-Fi, Bluetooth, RF, photon light flashes";
export const D2D_ORDER_ARROW = "LAN → Wi-Fi → Bluetooth → RF → Photon light flashes";
export const D2D_PLANE = "track2-reachability";
export const D2D_PAPER = "docs/designs/D2D-CARRIERS-1.0.md";
/** Local three-node path. Public door stays FG-STUB. Not a second physical device. */
export const D2D_STORE_FORWARD = "LIVE-when-three-local-nodes / fixture";
/** Phone client of the local node. Shipping the client is not a demonstrated device. */
export const D2D_MOBILE_CLIENT = "present-not-demonstrated";
export const D2D_MOBILE_PAPER = "docs/designs/TRACK2-MOBILE-JOIN-1.0.md";

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
    discovery: "LIVE-when-armed",
    note: "First preference. Local node beacons presence and tip hash when the operator arms LAN. Discovery is LIVE only after two peers verify each other. The public Worker stays FG-STUB. A named interface is not alt-internet LIVE.",
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
    discovery: "ARMED-when-HW",
    note: "Second preference. Arm records real Wi-Fi hardware. A LAN beacon is not a Wi-Fi exchange. A phone that reaches the LAN beacon over Wi-Fi is still the LAN client. That path does not set peer_exchange_demonstrated. Absent radio refuses QNM-RADIO-ABSENT. No mock LIVE.",
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
    discovery: "ARMED-when-HW",
    note: "Third preference. Arm records real Bluetooth hardware. Absent radio refuses QNM-RADIO-ABSENT. BlueZ presence is not a demonstrated hop. No mock LIVE.",
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
    discovery: "REFUSE-without-HW",
    note: "Fourth preference. Dedicated RF mesh hop beyond Wi-Fi and Bluetooth. Prefer cellular / ModemManager when that radio is present. Refuse QNM-RADIO-ABSENT when it is absent. No mock LIVE.",
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
    discovery: "REFUSE-without-HW",
    note: "Last resort. Optical / LiFi-style light-flash encoding on camera and flash or LED. Refuse QNM-RADIO-ABSENT when that hardware is absent. Local qnsd is not this flash path. No mock LIVE.",
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
  const fact = currentAltInternetFact();
  return {
    spec: D2D_SPEC,
    author: D2D_AUTHOR,
    identity: D2D_AUTHOR,
    plane: D2D_PLANE,
    phase: "B+C+D",
    phases: {
      A: "landed",
      B: "LIVE-when-armed",
      C: "LIVE-when-session",
      D: D2D_STORE_FORWARD,
      E: "scaffold",
    },
    lan_discovery: "LIVE-when-armed",
    wifi_discovery: "ARMED-when-HW",
    bluetooth_discovery: "ARMED-when-HW",
    rf_discovery: "REFUSE-without-HW",
    photon_discovery: "REFUSE-without-HW",
    peer_tunnel: "LIVE-when-session",
    store_forward: D2D_STORE_FORWARD,
    store_forward_public: "FG-STUB",
    worker_runs_store_forward: false,
    second_device: fact.second_device === true,
    mobile_client: D2D_MOBILE_CLIENT,
    mobile_demonstrated: false,
    app_store_release: false,
    mobile_paper: D2D_MOBILE_PAPER,
    bootstrap_list: "scaffold",
    needs_starting_address: true,
    shelf_cite: "scaffold",
    live_multi_provider: false,
    cold_shelf_live: false,
    dns_cut: false,
    origin_cutover: false,
    warn5_closed: false,
    worker_door: "FG-STUB",
    worker_hardware: false,
    machine_id: fact.machine_id,
    missing: fact.missing,
    not_live_sentence: fact.not_live_sentence,
    missing_line: fact.missing_line,
    host_hardware_visible: fact.host_hardware_visible,
    local_node: "qnm-node",
    get_never_enables: true,
    separate_from: "cap7-name",
    cap7_is_name_plane: true,
    cap7_public_icann: false,
    cap7_public_egress: false,
    mirage_is_azvpn: false,
    aznet_replaces_internet: false,
    not_a_second_internet: true,
    alt_internet_live: fact.alt_internet_live === true,
    packet_path_live: fact.packet_path_live === true,
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
    note: `Track 2 node-mesh packet reachability stays ${D2D_STATUS} on the public Worker (${D2D_CODE}). Local LAN discovery is LIVE-when-armed. The peer tunnel is LIVE-when-session. Local store-forward is ${D2D_STORE_FORWARD}: three in-process nodes can deliver a sealed object, second_device is false, and that fixture does not close WARN-5. Wi-Fi and Bluetooth arm when that hardware is present and do not inherit a LAN beacon. The mobile join client speaks the local LAN beacon and sealed peer session. mobile_client stays present-not-demonstrated. A phone on Wi-Fi is that LAN path, not a Wi-Fi carrier exchange, and not an app-store release. RF and photon light flashes refuse QNM-RADIO-ABSENT without hardware, and there is no mock LIVE. peer_exchange_demonstrated stays false on those carriers. Phase E bootstrap lists and shelf cites stay scaffold. live_multi_provider stays false. Cold shelves stay SLOT. Failover is ${D2D_ORDER_ARROW}. Cap-7 / .aziel stay Track 1 name-plane metadata. MirageGrid is not AZVPN. AZNet is the hash-continuity side-net and does not host payloads. Isolation is single-node security-awareness. Phoenix is local wait / re-seal. WARN-5 stays STANDS-until-demonstrated. alt_internet_live is false.`,
  };
}

export function d2dCarrierFrame() {
  const cite = d2dCarrierCite();
  return {
    d2d_carriers: cite,
    d2d_status: D2D_STATUS,
    d2d_code: D2D_CODE,
    packet_path_live: cite.packet_path_live === true,
    alt_internet_live: cite.alt_internet_live === true,
    second_device: cite.second_device === true,
    not_live_sentence: cite.not_live_sentence,
    missing_line: cite.missing_line,
  };
}
