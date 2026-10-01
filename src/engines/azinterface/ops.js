/**
 * azinterface in-process ops. Author: Aziel Eliab.
 */
import { meshEnable, meshSecurityCite, meshStatus, meshStayOffHit, readMeshRadioEnv } from "../../mesh.js";
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  NAME,
  PRODUCT,
  PAGE_CYCLES,
  azinterfaceHealth,
  azinterfaceSkill,
  genesisStatus,
  siteStateGet,
  siteStateSet,
  integrityCheck,
  witnessList,
  pageCycleStatus,
} from "./engine.js";

export const AZINTERFACE_OPS = [
  "health",
  "skill",
  "genesis_status",
  "site_state_get",
  "site_state_set",
  "integrity_check",
  "witness_list",
  "page_cycle_status",
  "mesh_radios",
];

/**
 * Mesh radios tile. Status is the default. confirm true calls FragGate mesh enable.
 * MESH_RADIOS=off stays MESH-OFF. GET never enables. Must-stay-off surfaces refuse.
 */
export async function meshRadios(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const status = await meshStatus({}, env);
  const tile = {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    author: AUTHOR,
    door: "fraggate",
    op: "mesh_radios",
    radios: status.radios,
    open_world_awareness: status.open_world_awareness,
    enabled: status.enabled === true,
    suite_presence: status.suite_presence,
    get_never_enables: true,
    bearers: status.bearers,
    env_radios: readMeshRadioEnv(env),
    security: meshSecurityCite(),
    not_a_second_internet: true,
    public_icann: false,
    public_egress_ip: false,
    hosted_vpn: false,
    payload_host: false,
    tools_list_count: 36,
    mesh_op: "enable",
  };
  const stayed = meshStayOffHit(src);
  if (stayed) {
    return {
      ...tile,
      ok: false,
      code: "MESH-STAY-OFF",
      stayed,
      mutated: false,
      message:
        "Mesh radios do not arm Cap-7 egress, ICANN, Mirage vpn-hop, AZVPN kernel transports, AZNet payload hosting, or a loopback fence. forced_loopback and loopback_isolation are not the mesh fence. Open-world awareness stays the 0.0.0.0 bind.",
    };
  }
  if (src.confirm !== true || src.dry_run === true) {
    return {
      ...tile,
      action: "status",
      mutated: false,
      needs_confirm: true,
      dry_run: src.dry_run === true,
      message:
        "Status only. confirm true calls FragGate mesh enable for the suite-presence bearer. GET never enables. MESH_RADIOS=off stays MESH-OFF. Isolation is single-node security-awareness. Phoenix is local wait / re-seal. Open-world awareness binds 0.0.0.0. The Worker does not open that socket.",
    };
  }
  if (readMeshRadioEnv(env) === false) {
    return {
      ...tile,
      ok: false,
      code: "MESH-OFF",
      action: "enable",
      mutated: false,
      radios: "off",
      enabled: false,
      message: "MESH_RADIOS=off keeps transmission radios off. Confirm does not override that env. Join and heartbeat stay MESH-OFF.",
    };
  }
  const bearer = src.bearer != null && String(src.bearer).trim() !== "" ? src.bearer : "suite-presence";
  const enabled = await meshEnable({ bearer }, env);
  const live = enabled && enabled.ok !== false && enabled.enabled === true;
  return {
    ...tile,
    ok: enabled.ok !== false,
    code: enabled.code || (live ? "AZI-MESH-RADIOS" : "MESH-OFF"),
    action: "enable",
    mutated: live,
    confirm: true,
    bearer,
    radios: enabled.radios || (live ? "on" : "off"),
    enabled: enabled.enabled === true,
    bearers: enabled.bearers || tile.bearers,
    receipt: {
      op: "enable",
      code: enabled.code || null,
      radios: enabled.radios,
      enabled: enabled.enabled === true,
      bearers: enabled.bearers,
    },
    message:
      enabled.ok === false
        ? enabled.message
        : "FragGate mesh enable accepted. Suite-presence radios follow the declared bearer. GET still never enables. Isolation is single-node security-awareness. Phoenix is local wait / re-seal. Open-world awareness stays the 0.0.0.0 bind beside those radios.",
  };
}

export function azinterfaceHealthOp(env) {
  return azinterfaceHealth(env);
}

export function azinterfaceSkillOp(env) {
  return azinterfaceSkill(env);
}

export async function runAzinterface(op, payload, _scratch, env) {
  if (op === "health") return azinterfaceHealth(env);
  if (op === "skill") return azinterfaceSkill(env);
  if (op === "genesis_status") return genesisStatus(payload, env);
  if (op === "site_state_get") return siteStateGet(payload, env);
  if (op === "site_state_set") return siteStateSet(payload, env);
  if (op === "integrity_check") return integrityCheck(payload, env);
  if (op === "witness_list") return witnessList(payload, env);
  if (op === "page_cycle_status") return pageCycleStatus(payload, env);
  if (op === "mesh_radios") return meshRadios(payload, env);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, PAGE_CYCLES };
