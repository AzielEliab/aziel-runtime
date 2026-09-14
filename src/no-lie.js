/**
 * NO-LIE / NO-REWRITE — Cross-network survival law.
 *
 * Receipts that still hash. Copies not all on one tunnel.
 * Rules simple enough others verify without your voice.
 * No rewrite key. The network is never allowed to lie —
 * even to self-preserve, sustain, stay alive, adapt, or prevent death.
 *
 * Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool.
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "./session-core.js";

export const NO_LIE_SPEC = "NO-LIE-NO-REWRITE-1.0";
export const NO_LIE_AUTHOR = "Aziel Eliab";
export const NO_LIE_DOCS = "docs/designs/NO-LIE-NO-REWRITE-1.0.md";
export const CROSS_NETWORK_SURVIVAL_DOCS = "docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md";
export const NODE_MESH_DOCS = "docs/NODE_MESH.md";
export const MIN_COPY_PLANES = 2;

export const NO_LIE_RULES = Object.freeze([
  "Receipts that still hash.",
  "Copies are not all on one tunnel.",
  "Rules stay simple enough that others verify without the author's voice.",
  "There is no rewrite key.",
  "The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death.",
]);

export const SURVIVAL_MOTIVES = Object.freeze([
  "self-preserve",
  "sustain",
  "stay-alive",
  "adapt",
  "prevent-death",
]);

export const SINGLE_TUNNEL_PLANES = Object.freeze(["tunnel", "tunnel-front", "one-tunnel"]);

export const MESH_NO_REWRITE_OPS = Object.freeze(["rewrite", "rewrite-key", "rewrite_key"]);

export const MESH_NO_LIE_OPS = Object.freeze([
  "lie",
  "lie-to-survive",
  "lie_to_survive",
  "self-preserve",
  "self_preserve",
  "sustain-lie",
  "sustain_lie",
  "adapt-lie",
  "adapt_lie",
  "prevent-death",
  "prevent_death",
  "stay-alive",
  "stay_alive",
]);

export const MESH_NO_LIE_REWRITE_OPS = Object.freeze([...MESH_NO_REWRITE_OPS, ...MESH_NO_LIE_OPS]);

export const NO_LIE_NOTE =
  "NO-LIE / NO-REWRITE: receipts that still hash; copies not all on one tunnel; rules simple enough others verify without the author's voice; no rewrite key. The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. Author: Aziel Eliab only.";

export function noLieHint() {
  return {
    spec: NO_LIE_SPEC,
    author: NO_LIE_AUTHOR,
    identity: NO_LIE_AUTHOR,
    no_lie: true,
    no_rewrite: true,
    rewrite_key: false,
    lie_to_survive: false,
    copies_one_tunnel: false,
    software_tab: false,
    fraggate_slug: false,
    docs: NO_LIE_DOCS,
    survival: CROSS_NETWORK_SURVIVAL_DOCS,
    node_mesh: NODE_MESH_DOCS,
    note: NO_LIE_NOTE,
  };
}

export function noLieFrame() {
  return {
    no_lie: true,
    no_rewrite: true,
    rewrite_key: false,
    lie_to_survive: false,
    copies_one_tunnel: false,
    no_lie_spec: NO_LIE_SPEC,
    no_lie_docs: NO_LIE_DOCS,
  };
}

export function normalizeMotive(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[ _]+/g, "-");
}

export function isSurvivalMotive(raw) {
  return SURVIVAL_MOTIVES.includes(normalizeMotive(raw));
}

export async function hashNoLieReceipt(unsigned) {
  const body = {
    previous_hash: unsigned && unsigned.previous_hash,
    body: unsigned && unsigned.body,
    event: unsigned && unsigned.event,
  };
  return sha256Hex(canonicalize(body));
}

export async function mintNoLieReceipt({ previous_hash, body, event } = {}) {
  const unsigned = { previous_hash, body, event };
  const hash = await hashNoLieReceipt(unsigned);
  return { ...unsigned, hash };
}

export async function verifyNoLieReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") {
    return { ok: false, code: "NO-LIE-BAD-RECEIPT", no_rewrite: true };
  }
  const recomputed = await hashNoLieReceipt({
    previous_hash: receipt.previous_hash,
    body: receipt.body,
    event: receipt.event,
  });
  if (recomputed !== String(receipt.hash || "").toLowerCase()) {
    return {
      ok: false,
      code: "NO-LIE-HASH-BREAK",
      expected: recomputed,
      got: receipt.hash || null,
      no_rewrite: true,
      rewrite_key: false,
    };
  }
  return { ok: true, hash: recomputed, no_rewrite: true, rewrite_key: false };
}

export function refuseRewrite({ key, patch } = {}) {
  return {
    ok: false,
    code: "MESH-NO-REWRITE",
    no_lie: true,
    no_rewrite: true,
    rewrite_key: false,
    lie_to_survive: false,
    patch_ignored: patch != null,
    attempted_key: key == null || key === "" ? null : "refused",
    message:
      "No rewrite key. A mutated receipt must fail its hash. Survival does not authorize a rewrite. Author: Aziel Eliab only.",
  };
}

export function checkCopyPlanes(planes) {
  const list = Array.isArray(planes) ? planes.map((p) => String(p || "").trim().toLowerCase()).filter(Boolean) : [];
  const unique = [...new Set(list)];
  const tunnelOnly = unique.length === 1 && SINGLE_TUNNEL_PLANES.includes(unique[0]);
  if (unique.length < MIN_COPY_PLANES || tunnelOnly) {
    return {
      ok: false,
      code: "NO-LIE-ONE-TUNNEL",
      copies_one_tunnel: true,
      planes: unique,
      message: "Copies are not all on one tunnel. A single-tunnel copy set is refused.",
    };
  }
  return { ok: true, copies_one_tunnel: false, planes: unique, min_planes: MIN_COPY_PLANES };
}

export function refuseLieToSurvive(motive, claim) {
  const normalized = normalizeMotive(motive);
  return {
    ok: false,
    code: "MESH-NO-LIE",
    no_lie: true,
    no_rewrite: true,
    rewrite_key: false,
    lie_to_survive: false,
    motive: isSurvivalMotive(normalized) ? normalized : normalized || "self-preserve",
    claim: claim == null ? null : String(claim).slice(0, 160),
    message:
      "The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. Author: Aziel Eliab only.",
  };
}

export function verifyRulesWithoutVoice(observed) {
  const have = Array.isArray(observed) ? observed : [];
  const missing = NO_LIE_RULES.filter((rule) => !have.includes(rule));
  if (missing.length) {
    return { ok: false, code: "NO-LIE-RULE-MISS", missing, voice_required: false };
  }
  return { ok: true, voice_required: false, rules: NO_LIE_RULES.slice() };
}

export async function evaluateSurvivalAct({ receipt, planes, motive, rewrite_key, lie } = {}) {
  if (rewrite_key != null && rewrite_key !== false && rewrite_key !== "") {
    return refuseRewrite({ key: rewrite_key, patch: receipt });
  }
  if (lie === true) {
    return refuseLieToSurvive(motive || "self-preserve", "false claim");
  }
  if (planes != null) {
    const copies = checkCopyPlanes(planes);
    if (!copies.ok) return copies;
  }
  if (receipt) {
    const hashed = await verifyNoLieReceipt(receipt);
    if (!hashed.ok) return hashed;
  }
  return {
    ok: true,
    ...noLieFrame(),
    motive: motive ? normalizeMotive(motive) : null,
    rules_voice_required: false,
    note: NO_LIE_NOTE,
  };
}

export function meshNoLieRefuse(op) {
  const resolved = String(op || "")
    .trim()
    .toLowerCase();
  if (MESH_NO_REWRITE_OPS.includes(resolved)) {
    return refuseRewrite({ key: resolved });
  }
  if (MESH_NO_LIE_OPS.includes(resolved)) {
    return refuseLieToSurvive(resolved, resolved);
  }
  return null;
}
