/**
 * miragegrid in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { miragegridBridgeCite } from "../../semantic-bridge.js";
import { landCap7Shuffle } from "../../cap7-shuffle.js";
import { LIMITATION, MOTTO, VERSION, assign, listNodes, meshView, routeView, buildCircuit, verifyReceipt, makePool } from "./engine.js";

const LIVE = ["health", "skill", "assign", "verify-receipt", "nodes", "bridge", "shuffle", "doctor"];
const STUB = ["vpn-hop", "hop", "tunnel", "mesh"];
export const MIRAGEGRID_OPS = ["health", "skill", "assign", "route", "circuit", "verify-receipt", "nodes", "bridge", "shuffle", "mesh", "doctor"];

function envelope() {
  return {
    product: "miragegrid",
    name: "MirageGrid",
    version: VERSION,
    role: "ephemeral control-plane assignment",
    motto: MOTTO,
    axes: ["assign", "receipt", "nodes", "bridge", "shuffle"],
    neighbors: ["azieltether", "aznet"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: {
      vpn: false,
      hop: false,
      public_icann: false,
      live_registrar: false,
      radio_phy: false,
      resolves_to_hub: false,
      internet_reachable: false,
      standard_internet_reaches_cap7: false,
      az_domains_public_icann: true,
      az_domains_resolves_to_hub: true,
      false_site_count: 3,
      name_may_change: true,
      canonical_hubs_immutable: true,
      fifth_product: false,
    },
  };
}

export function miragegridHealth() {
  return capabilityHealth(envelope());
}

export function miragegridSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Ephemeral session node assignment plus Cap-7 bridge cite and ping→land update shuffle. Not a VPN, not ICANN, not a live registrar. Factory shuffle land is LIVE. Standard internet does not reach Cap-7. mesh/hop stay refuse on the public door.",
  });
}

export function miragegridDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "MirageGrid doctor: assign / verify-receipt / nodes / bridge cite / shuffle land. vpn-hop stays refuse. Cap-7 is .az duplication + shift (StaticClock + cloak + AZVPN). Standard internet does not reach Cap-7. AZ domains resolve via hub HTTPS (public_icann true, resolves_to_hub true). Three of seven are false sites. Factory land is LIVE. radio_phy false.",
  });
}

export async function runMiragegrid(op, payload, scratch) {
  if (op === "health") return miragegridHealth();
  if (op === "skill") return miragegridSkill();
  if (op === "doctor") return miragegridDoctor();
  if (op === "assign") return { ...(await assign(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
  if (op === "nodes") return { ...listNodes(), true_engine_runtime: true };
  if (op === "mesh") return { ...meshView(), true_engine_runtime: true };
  if (op === "route") return { ...routeView((payload && payload.src) || (payload && payload.src_id), (payload && payload.dst) || (payload && payload.dst_id)), true_engine_runtime: true };
  if (op === "circuit") {
    const entropy = crypto.getRandomValues(new Uint8Array(32));
    const ts = (payload && payload.timestamp) || new Date().toISOString();
    return { ...(await buildCircuit(entropy, ts, (payload && payload.hops) || 3)), true_engine_runtime: true, limitation: LIMITATION };
  }
  if (op === "verify-receipt") {
    return { ok: true, result: await verifyReceipt(payload || {}, makePool()), true_engine_runtime: true };
  }
  if (op === "bridge") {
    const origin = (payload && payload.origin) || "";
    return miragegridBridgeCite(origin, payload);
  }
  if (op === "shuffle") {
    return landCap7Shuffle(payload || {});
  }
  return { unsupported: true };
}
