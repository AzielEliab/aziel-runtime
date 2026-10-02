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
    hw: "lan-interface",
    note: "First preference. A named LAN interface is not a live packet hop in this phase.",
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
    hw: "wifi-nm",
    note: "Second preference. NetworkManager / Wi-Fi Direct stays NOT-READY until the hop works. A channel-plane cite is not this hop.",
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
    hw: "bluez",
    note: "Third preference. BlueZ presence is not a live hop.",
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
    hw: "rf-beyond-wifi-bt",
    note: "Fourth preference. Dedicated RF mesh hop beyond Wi-Fi and Bluetooth. Prefer cellular / ModemManager when that radio is present. Refuse when it is absent. No fake LIVE.",
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
    hw: "camera-flash",
    note: "Last resort. Optical / LiFi-style light-flash encoding. Refuse when camera or flash hardware is absent. Local qnsd is not this flash path. No mock LIVE.",
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
]);

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
  return `${name} stays NOT-READY on the device-to-device packet plane. FragGate returns FG-STUB. Failover order is ${D2D_ORDER_LABEL}. No hop is live. Cap-7 remains name and land-region metadata. alt_internet_live is false.`;
}

export function d2dCarrierCite() {
  return {
    spec: D2D_SPEC,
    author: D2D_AUTHOR,
    identity: D2D_AUTHOR,
    plane: "packet",
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
    status: D2D_STATUS,
    code: D2D_CODE,
    carriers: D2D_CARRIERS.map((row) => ({ ...row })),
    security: {
      isolation: "single-node security-awareness",
      phoenix: "local wait / re-seal",
      mesh_fenced_to_loopback: false,
      forced_loopback: false,
      loopback_isolation: false,
    },
    paper: D2D_PAPER,
    note: `Packet plane is device-to-device reachability, separate from Cap-7 names. Carriers fail over ${D2D_ORDER_LABEL}. Each layer is ${D2D_STATUS} / ${D2D_CODE} until a real hop works. Channel-plane cites and local radio-hook presence are not this path. No live alternative internet. No public IP egress.`,
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
