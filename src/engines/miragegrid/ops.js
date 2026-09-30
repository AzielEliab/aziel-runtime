/**
 * miragegrid in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { miragegridBridgeCite } from "../../semantic-bridge.js";
import { landCap7Shuffle } from "../../cap7-shuffle.js";
import { LIMITATION, MOTTO, VERSION, assign, listNodes, meshView, routeView, buildCircuit, verifyReceipt, makePool } from "./engine.js";

const LIVE = ["health", "skill", "assign", "verify-receipt", "nodes", "bridge", "shuffle", "doctor"];
const STUB = ["vpn-hop", "hop", "tunnel", "mesh", "geo-target", "session-stick", "egress-rotate"];
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
      anonymity_network: false,
      packet_mesh: false,
      packet_forwarding: false,
      hop: false,
      public_icann: false,
      public_icann_registrar: false,
      live_registrar: false,
      cap7_factory: true,
      hub_mirror_count: 4,
      decoy_count: 3,
      per_node_aziel_slots: false,
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
      suite_vpn: "azvpn",
      planned: {
        geo: "geo-target",
        sticky_session: "session-stick",
        egress_rotation: "egress-rotate",
        status: "planned",
        live: false,
      },
    },
  };
}

export function miragegridHealth() {
  return capabilityHealth(envelope());
}

export function miragegridSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Ephemeral session node assignment plus Cap-7 mesh-name metadata. The Cap-7 factory is a mesh-name factory and is not a public ICANN registrar: four hub mirrors (azgrid, azcloak, azvault, azshift) and three decoys (azbooth, azflag, azstandby), distinct from per-node .aziel slots. Factory shuffle land is LIVE. Standard internet does not reach Cap-7. AZVPN is the suite VPN concentrator. MirageGrid is not a VPN, not an anonymity network, and not a packet mesh. vpn-hop, hop, tunnel, and mesh stay FG-STUB. The MirageGrid mesh op is not the QNM suite mesh. geo-target, session-stick, and egress-rotate are planned and stay FG-STUB until real. Author Aziel Eliab only.",
  });
}

export function miragegridDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "MirageGrid doctor: assign / verify-receipt / nodes / bridge cite / shuffle land. vpn-hop, hop, tunnel, and mesh stay FG-STUB. geo-target, session-stick, and egress-rotate are planned and stay FG-STUB until real. The MirageGrid mesh op is not the QNM suite mesh. Cap-7 is a mesh-name factory, not a public ICANN registrar: four hub mirrors azgrid, azcloak, azvault, azshift and three decoys azbooth, azflag, azstandby (not per-node .aziel slots). Shift is StaticLock; catalog product StaticClock, slug staticclock; cloak + AZVPN. AZVPN is the suite VPN concentrator. Standard internet does not reach Cap-7. AZ domains resolve via hub HTTPS (public_icann true, resolves_to_hub true). Factory land is LIVE. radio_phy false. Author Aziel Eliab only.",
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
