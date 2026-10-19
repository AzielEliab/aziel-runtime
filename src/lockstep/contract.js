/**
 * AZ-LOCKSTEP-1.0: one machine-readable contract for aziel-runtime, AZInterface, and AZ-OS,
 * built from the runtime's own code (no hand-typed copies of counts or flags). Served at
 * GET /v1/lockstep with its SHA-256 (canonical JSON). The committed snapshot
 * contract/lockstep.json must equal what this builds, or npm test fails (scripts/verify-lockstep.mjs).
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { RUNTIME_VERSION } from "../runtime-api.js";
import { SURFACE_HONESTY, HONESTY_SENTENCES } from "../surface-honesty.js";
import { currentAltInternetFact } from "../alt-internet-fact.js";
import * as FG from "../fraggate/codes.js";
import { buildRegistry } from "../fraggate/registry.js";
import { MASTER_33_SLUGS } from "../domain-map.js";
import { ANCHOR_CHAINS } from "../anchor.js";
import { LATTICE_NAMES, LATTICE_GENESIS } from "../dual-lattice.js";
import { TETHER_SPEC, TETHER_KIND, TETHER_ROUTE, TETHER_STATUS_ROUTE, TETHER_CHAINS } from "../azos-tether.js";
import { RECEIPTS_LATTICE_TIP_SPEC } from "../receipts-lattice-tip.js";
import { MESH_SPEC } from "../mesh.js";
import { FEATURE_UNION, LEGS } from "./features.js";
import { newUserHintsHtml } from "../mesh-onboard.js";
import { DESIGN_TOKENS } from "./design-tokens.js";
import { tokensCss } from "./tokens-css.js";
import { LOCKSTEP_SPEC, LOCKSTEP_PATH, LOCKSTEP_CODES, hashOf, sha256Hex } from "./consumer.js";

/** Public Ed25519 key of the runtime tether signer. Public, not a secret; both legs pin the same value. */
export const TETHER_PUBKEY = "C9Psex_Bf8uG_nCwIeiskejJaBYUSYn7lHkPm4qV6Ik";

let registryCache = null;
export function buildLockstepContract(products) {
  if (!registryCache) registryCache = buildRegistry(products);
  const fact = currentAltInternetFact();
  const flags = {
    alt_internet_live: fact.alt_internet_live === true,
    packet_path_live: fact.packet_path_live === true,
    second_device: fact.second_device === true,
    public_mail_send_live: false,
    public_smtp_send: SURFACE_HONESTY.public_smtp_send === true,
    kernel_live: false,
    kernel_base: SURFACE_HONESTY.kernel_base === true,
    booted: SURFACE_HONESTY.booted === true,
    installed: SURFACE_HONESTY.installed === true,
    os_yet: SURFACE_HONESTY.os_yet === true,
    mesh_node_live: false,
    one_click_install_live: false,
    witness_dual: false,
    receipts_signed: false,
  };
  const fgCodes = Object.entries(FG).filter(([k, v]) => /^FG_[A-Z_]+$/.test(k) && typeof v === "string" && v.startsWith("FG-")).map(([, v]) => v).sort();
  return {
    spec: LOCKSTEP_SPEC,
    author: "Aziel Eliab",
    runtime: { version: RUNTIME_VERSION, product: "aziel-runtime" },
    locks: {
      softwares: SURFACE_HONESTY.softwares,
      mcp_tools: FG.PUBLIC_MCP_TOOLS.length,
      stub_op_count: registryCache.stub_op_count,
      software_count: MASTER_33_SLUGS.length,
      health_count: SURFACE_HONESTY.health_count,
    },
    flags,
    states: {
      d2d_status: SURFACE_HONESTY.d2d_status,
      warn5: SURFACE_HONESTY.warn5,
      smtp_send: SURFACE_HONESTY.smtp_send,
      veillock: SURFACE_HONESTY.veillock,
      vpn: { wireguard: SURFACE_HONESTY.wireguard, openvpn: SURFACE_HONESTY.openvpn, l3: SURFACE_HONESTY.l3, kernel_udp: SURFACE_HONESTY.kernel_udp, tun_tap: SURFACE_HONESTY.tun_tap },
      witness: "single",
      signing: "hash-linked-sealed-not-signed",
    },
    // Fixed sentences only. fact.not_live_sentence names this machine's own interfaces, so it is not part of a cross-leg contract.
    sentences: { ...HONESTY_SENTENCES },
    doors: {
      door: FG.FRAGGATE_DOOR,
      kernel_version: FG.FRAGGATE_KERNEL_VERSION,
      mcp_path: "/mcp",
      mcp_tools: [...FG.PUBLIC_MCP_TOOLS].map((t) => (typeof t === "string" ? t : t.name)).sort(),
      fraggate_paths: ["/v1/fraggate", "/v1/fraggate/list", "/v1/fraggate/describe", "/v1/fraggate/call", "/v1/fraggate/software"],
    },
    refusal_codes: { fraggate: fgCodes, lockstep: Object.values(LOCKSTEP_CODES).sort(), runtime_sync_unreachable: "RUNTIME-SYNC-UNREACHABLE" },
    chains: {
      source: "chainlock",
      anchor_chains: [...ANCHOR_CHAINS],
      tether_chains: [...TETHER_CHAINS],
      lattice_names: [...LATTICE_NAMES],
      lattice_genesis: LATTICE_GENESIS,
      hash: "SHA-256 over canonical JSON (sorted keys, no undefined)",
      primary_rule: "primary = H({document, prev: primary_prev})",
      secondary_rule: "online: H({offline:false, prev: secondary_prev, primary}); offline: H({primary: document_hash, username})",
      lattice_tip_spec: RECEIPTS_LATTICE_TIP_SPEC,
      lattice_tip_path: "/v1/receipts/tip",
      tether_spec: TETHER_SPEC,
      tether_kind: TETHER_KIND,
      tether_status_path: TETHER_STATUS_ROUTE,
      tether_receive_path: TETHER_ROUTE,
      tether_pubkey: TETHER_PUBKEY,
    },
    mesh: {
      spec: MESH_SPEC,
      path: "/v1/mesh",
      bootstrap_path: "/v1/mesh/bootstrap",
      install_path: "/v1/mesh/install",
      nodes_are_not_unique_humans: true,
      counters: ["nodes", "rollup.nodes", "human_uses", "active_nodes", "peer_count"],
      one_identity: "aziel-runtime mesh; legs read it over the AZIEL_RUNTIME service binding",
    },
    legs: Object.fromEntries(LEGS.map((l) => [l, { independent: true, optional: true, binding: l === "aziel-runtime" ? null : "AZIEL_RUNTIME" }])),
    features: FEATURE_UNION.map((row) => ({ id: row.id, label: row.label, legs: row.legs })),
    design: { spec: DESIGN_TOKENS.spec, tokens_path: "/design/tokens.json", css_path: "/design/tokens.css" },
    path: LOCKSTEP_PATH,
  };
}

export function designCss() {
  return tokensCss(DESIGN_TOKENS);
}

let docCache = null;
/** { spec, contract, contract_sha256, tokens_sha256, css_sha256, hints_sha256 }; git_sha added by the route. */
export async function lockstepDocument(products) {
  if (docCache) return docCache;
  const contract = buildLockstepContract(products);
  docCache = {
    spec: LOCKSTEP_SPEC,
    contract,
    contract_sha256: await hashOf(contract),
    tokens_sha256: await hashOf(DESIGN_TOKENS),
    css_sha256: await sha256Hex(designCss()),
    hints_sha256: await sha256Hex(newUserHintsHtml()),
  };
  return docCache;
}
