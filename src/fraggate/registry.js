/**
 * Hashed FragGate registry over the aziel-runtime catalog.
 * Live on the public mesh is every catalog Software product that makes
 * sense on a public agent door: advisory / score / classify / gate /
 * search / preview / render / verify / hash / receipt / game / overlay /
 * route / status. Device-local (VeilLock) stays local_only. Stub verbs
 * (scorch / wipe / send / vpn / mesh / inject / blend / exec) refuse
 * forever. Not the old 5-only cut, and not a dump of destructive fantasies.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { CATALOG_ALIASES } from "../catalog-meta.js";
import { embeddedDigest } from "../engines/digest.js";
import { canonicalize, sha256Hex } from "../session-core.js";
import { FRAGGATE_DOOR, FRAGGATE_KERNEL, FRAGGATE_KERNEL_VERSION } from "./codes.js";

/**
 * Ops callable via FragGate on the public runtime.
 * Catalog ops only (plus DecisionGATE evaluate, already hosted). Always
 * include health+skill when the product is live. Do not invent ops.
 */
export const LIVE_OPS = {
  decisiongate: ["check", "evaluate", "health", "skill"],
  godlock: ["score", "submit", "health", "skill"],
  "aziel-corpus": ["search", "example", "skill", "health"],
  foldlock: ["fold-preview", "unfold-preview", "health", "skill"],
  azclce: ["score", "classify", "gate", "health", "skill"],
  zsolver: ["patterns", "score", "session", "health", "skill"],
  forgereceipts: ["receipt", "health", "skill"],
  codelock: ["render", "health", "skill"],
  glossafilter: ["render", "health", "skill"],
  staticclock: ["advise", "health", "skill"],
  chronolock: ["advisory", "anchors", "health", "skill"],
  azos: ["status", "health", "skill"],
  azai: ["lamb-check", "lamb_check", "health", "skill"],
  postking: ["new", "move", "status", "health", "skill"],
  shadowlock: ["observe", "health", "skill"],
  temporallock: ["genesis", "append", "verify", "health", "skill"],
  employeelock: ["append-preview", "verify-canonical", "health", "skill"],
  whistlelock: ["hash-preview", "canon-preview", "health", "skill"],
  trajectorylock: ["example", "analyze", "health", "skill"],
  spectrallock: ["modes", "overlay", "health", "skill"],
  azbot: ["route", "health", "skill"],
  azieltether: ["verify", "health", "skill"],
  peacelock: ["open", "seal", "break", "show", "verify", "stamp", "upload_envelope", "health", "skill"],
  azmail: [
    "airlock_classify",
    "scrub",
    "trust_score",
    "mesh_post",
    "mesh_poll",
    "mesh_listen",
    "mesh_enable",
    "mesh_disable",
    "keyword_alert_set",
    "keyword_alert_list",
    "keyword_alert_check",
    "health",
    "skill",
  ],
  azbrowser: [
    "ethical_search",
    "lamb_lens_search",
    "navigate",
    "airlock_ingest",
    "tab_open",
    "tab_list",
    "receipt_list",
    "verify",
    "receipt_verify",
    "health",
    "skill",
  ],
  aznet: [
    "health",
    "pair_status",
    "garden_list",
    "stamp",
    "verify_hash",
    "memorial_list",
    "memorial_append",
    "receipt_verify",
    "skill",
  ],
  vibelock: ["analyze", "health", "skill"],
  ark: ["sweep", "levels", "health", "skill"],
  miragegrid: ["assign", "health", "skill"],
  mialock: ["map", "search-options", "queries", "doe-match", "coverage", "example", "health", "skill"],
};

/**
 * Named but never hosted. Asking these is a stub refuse, not exec.
 * Destructive / send / mesh-hop / device-inject / blend fantasies —
 * even if the engine has no such op.
 */
export const STUB_OPS = {
  ark: ["scorch", "wipe", "unlock", "encrypt"],
  whistlelock: ["send", "mail", "release"],
  miragegrid: ["vpn-hop", "hop", "tunnel", "mesh"],
  azieltether: ["mesh-join", "vpn", "arm"],
  azmail: [
    "smtp",
    "smtp_send",
    "send",
    "mail",
    "deliver",
    "imap",
    "pop3",
    "mx",
    "identify",
    "deanonymize",
    "unmask",
    "whois",
    "harvest",
    "credential_capture",
    "login",
  ],
  veillock: ["inject", "intercept", "facetime"],
  azos: ["exec", "shell", "lattice"],
  azai: ["blend", "complete", "chat"],
  employeelock: ["court", "judge"],
  peacelock: ["transcript", "transcribe", "motive", "counterfactual", "invent", "waive-duty", "bypass-duty"],
  azbrowser: [
    "tor_exit",
    "tor",
    "onion",
    "phoenix_wipe",
    "wipe",
    "scorch",
    "chromium",
    "chromium_exec",
    "chrome",
    "exec",
    "playwright",
    "puppeteer",
    "proxy",
    "unrestricted_proxy",
    "socks",
    "vpn",
    "keylog",
    "keylogger",
    "clipboard",
    "harvest",
    "spy",
    "surveillance",
    "wiretap",
    "intercept",
    "inject",
    "track",
  ],
  aznet: [
    "payload_host",
    "serve_content_for_peer",
    "analytics",
    "ranking",
    "repair_integrity_bypass",
    "interface",
    "lumen",
    "hub",
    "interface_hook",
    "lumen_hook",
    "hub_hook",
  ],
};

const LIVE_SLUGS = new Set(Object.keys(LIVE_OPS));

export function liveOpList() {
  const out = [];
  for (const [slug, ops] of Object.entries(LIVE_OPS)) {
    for (const op of ops) out.push(`${slug}/${op}`);
  }
  return out;
}

function catalogOps(product) {
  return (product.ops || []).map((o) => o.op);
}

function statusFor(slug) {
  if (LIVE_SLUGS.has(slug)) return "live";
  return "local_only";
}

function publicOps(slug, productOps) {
  if (!LIVE_SLUGS.has(slug)) return [];
  const allow = new Set(LIVE_OPS[slug] || []);
  return productOps.filter((op) => allow.has(op));
}

export function registryEntry(product) {
  const slug = product.slug;
  const ops = catalogOps(product);
  const status = statusFor(slug);
  const public_ops = publicOps(slug, ops);
  return {
    name: product.name,
    slug,
    digest: embeddedDigest(slug),
    status,
    ops: public_ops,
    catalog_ops: ops,
    stub_ops: (STUB_OPS[slug] || []).slice(),
    description: product.oneLine || product.name,
    note:
      status === "live"
        ? "Live on the public FragGate door."
        : "Named in the registry. Local / in-process engine exists; not live on the public mesh.",
  };
}

export function buildRegistry(products) {
  const entries = (products || []).map((p) => registryEntry(p));
  const bySlug = Object.fromEntries(entries.map((e) => [e.slug, e]));
  const byName = Object.fromEntries(entries.map((e) => [String(e.name).toLowerCase(), e]));
  const live = entries.filter((e) => e.status === "live");
  const local_only = entries.filter((e) => e.status === "local_only");
  const stub = entries.filter((e) => e.status === "stub");
  // stub_ops are named refuse verbs (may sit on live or local_only products).
  // stub_count is products whose status is "stub" — not the op-list length.
  const stub_ops = Object.entries(STUB_OPS).flatMap(([slug, ops]) => ops.map((op) => ({ slug, op, status: "stub" })));
  return {
    door: FRAGGATE_DOOR,
    kernel: FRAGGATE_KERNEL,
    kernel_version: FRAGGATE_KERNEL_VERSION,
    entries,
    bySlug,
    byName,
    live_count: live.length,
    stub_count: stub.length,
    stub_op_count: stub_ops.length,
    local_only_count: local_only.length,
    stub_ops,
  };
}

export async function registryDigest(registry) {
  const spec = (registry.entries || []).map((e) => ({
    name: e.name,
    slug: e.slug,
    digest: e.digest,
    status: e.status,
    ops: e.ops,
    stub_ops: e.stub_ops,
  }));
  return sha256Hex(canonicalize(spec));
}

export function compactEntries(registry) {
  return (registry.entries || []).map((e) => ({
    name: e.name,
    slug: e.slug,
    digest: e.digest,
    status: e.status,
    ops: e.ops,
    description: e.description,
  }));
}

export function resolveRegistryName(raw, registry, bySlug) {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (registry.bySlug[key]) return registry.bySlug[key];
  if (registry.byName[key]) return registry.byName[key];
  const aliased = CATALOG_ALIASES[key];
  if (aliased && registry.bySlug[aliased]) return registry.bySlug[aliased];
  if (bySlug && bySlug[key] && registry.bySlug[key]) return registry.bySlug[key];
  return null;
}

/**
 * Parse a CallEnvelope / describe target.
 * Accepts { name, slug, op } or a leftover {slug}_{op} string.
 * Known slugs win as prefixes so azbrowser_ethical_search maps
 * to slug=azbrowser op=ethical_search (not last-underscore split).
 */
export function parseTarget(args, registry, bySlug) {
  const src = args && typeof args === "object" ? args : {};
  let rawName = src.name || src.slug || src.product || src.tool || "";
  let op = src.op || src.verb || "";
  rawName = String(rawName || "").trim();
  op = String(op || "").trim();

  if (!op && rawName.includes("/")) {
    const [a, b] = rawName.split("/");
    rawName = a;
    op = b || "";
  }

  if (!op && rawName.includes("_") && registry && registry.bySlug) {
    const slugs = Object.keys(registry.bySlug).sort((a, b) => b.length - a.length);
    let prefixed = false;
    for (const slug of slugs) {
      const prefix = `${slug}_`;
      if (rawName === slug) continue;
      if (rawName.startsWith(prefix)) {
        op = rawName.slice(prefix.length);
        rawName = slug;
        prefixed = true;
        break;
      }
    }
    if (!prefixed) {
      const idx = rawName.lastIndexOf("_");
      const maybeSlug = rawName.slice(0, idx);
      const maybeOp = rawName.slice(idx + 1).replace(/_/g, "-");
      const entry = resolveRegistryName(maybeSlug, registry, bySlug);
      if (entry) {
        rawName = entry.slug;
        op = maybeOp;
      }
    }
  } else if (!op && rawName.includes("_")) {
    const idx = rawName.lastIndexOf("_");
    const maybeSlug = rawName.slice(0, idx);
    const maybeOp = rawName.slice(idx + 1).replace(/_/g, "-");
    const entry = resolveRegistryName(maybeSlug, registry, bySlug);
    if (entry) {
      rawName = entry.slug;
      op = maybeOp;
    }
  }

  const entry = resolveRegistryName(rawName, registry, bySlug);
  return {
    raw: rawName,
    op,
    entry,
    slug: entry ? entry.slug : rawName ? String(rawName).toLowerCase() : "",
  };
}

export function classifyCall(entry, op) {
  const action = String(op || "").trim();
  if (!entry) {
    return { kind: "halluc", status: null };
  }
  const stubs = STUB_OPS[entry.slug] || [];
  if (action && stubs.includes(action)) {
    return { kind: "stub", status: "stub" };
  }
  if (entry.status === "live" && action && (LIVE_OPS[entry.slug] || []).includes(action)) {
    return { kind: "live", status: "live" };
  }
  if (entry.status === "live" && action) {
    return { kind: "unknown_op", status: "live" };
  }
  if (!action) {
    return { kind: "unknown_op", status: entry.status };
  }
  return { kind: "local_only", status: "local_only" };
}

export function registrySummary(registry, digest) {
  return {
    door: FRAGGATE_DOOR,
    kernel: FRAGGATE_KERNEL,
    kernel_version: FRAGGATE_KERNEL_VERSION,
    registry_digest: digest,
    live_count: registry.live_count,
    stub_count: registry.stub_count,
    stub_op_count: registry.stub_op_count,
    local_only_count: registry.local_only_count,
    product_count: (registry.entries || []).length,
    allowlist: LIVE_OPS,
    live_ops: liveOpList(),
    stub_ops: registry.stub_ops || [],
  };
}
