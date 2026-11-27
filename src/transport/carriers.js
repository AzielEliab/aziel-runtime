/**
 * Carrier adapters for the one sealed frame.
 * LAN, relay, photon, and future Bluetooth / RF all call sealFrame.
 * This module does not set mesh_node_live, alt_internet_live, or packet_path_live.
 * Author: Aziel Eliab only.
 */
import { openFrame, sealFrame } from "./sealed-frame.js";

export const CARRIER_NAMES = Object.freeze(["lan", "relay", "photon", "bluetooth", "rf"]);

export function carrierForBearer(mode) {
  const name = String(mode || "");
  if (name === "relay") return "relay";
  if (name === "photon") return "photon";
  if (name === "bluetooth") return "bluetooth";
  if (name === "rf") return "rf";
  return "lan";
}

export function carrierAdapter(name) {
  const carrier = CARRIER_NAMES.includes(name) ? name : "lan";
  return {
    carrier,
    live: false,
    async seal(opts = {}) {
      return sealFrame({ ...opts, carrier, version: opts.version });
    },
    async open(opts = {}) {
      return openFrame({ ...opts, carrier: opts.carrier || carrier });
    },
  };
}

export const lanCarrier = carrierAdapter("lan");
export const relayCarrier = carrierAdapter("relay");
export const photonCarrier = carrierAdapter("photon");
export const bluetoothCarrier = carrierAdapter("bluetooth");
export const rfCarrier = carrierAdapter("rf");
