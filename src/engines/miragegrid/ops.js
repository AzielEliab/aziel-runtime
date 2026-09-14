/**
 * miragegrid in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { miragegridBridgeCite } from "../../semantic-bridge.js";
import { LIMITATION, MOTTO, VERSION, assign, listNodes, meshView, routeView, buildCircuit, verifyReceipt, makePool } from "./engine.js";

const LIVE = ["health", "skill", "assign", "verify-receipt", "nodes", "bridge", "doctor"];
const STUB = ["vpn-hop", "hop", "tunnel", "mesh"];
export const MIRAGEGRID_OPS = ["health", "skill", "assign", "route", "circuit", "verify-receipt", "nodes", "bridge", "mesh", "doctor"];

function envelope() {
  return {
    product: "miragegrid",
    name: "MirageGrid",
    version: VERSION,
    role: "ephemeral control-plane assignment",
    motto: MOTTO,
    axes: ["assign", "receipt", "nodes", "bridge"],
    neighbors: ["azieltether", "aznet"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { vpn: false, hop: false, public_icann: false, live_registrar: false, resolves_to_hub: false },
  };
}

export function miragegridHealth() {
  return capabilityHealth(envelope());
}

export function miragegridSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Ephemeral session node assignment plus Cap-7 bridge cite. Not a VPN, not ICANN, not a live registrar. mesh/hop stay refuse on the public door.",
  });
}

export function miragegridDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "MirageGrid doctor: assign / verify-receipt / nodes / bridge cite. vpn-hop stays refuse. Cap-7 names inherit designs only; resolves_to_hub false.",
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
    return miragegridBridgeCite(origin);
  }
  return { unsupported: true };
}
