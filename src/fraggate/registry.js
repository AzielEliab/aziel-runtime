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
import { domainFields } from "../domain-map.js";
import { embeddedDigest } from "../engines/digest.js";
import { MEMORY_CANONICAL_OPS, MEMORY_SLUG, MEMORY_STUB_OPS, memoryKernelEntry } from "../memory.js";
import { MESH_LIVE_OPS, MESH_OP_ALIASES, MESH_SLUG, MESH_STUB_OPS, meshKernelEntry } from "../mesh.js";
import { canonicalize, sha256Hex } from "../session-core.js";
import { FRAGGATE_DOOR, FRAGGATE_KERNEL, FRAGGATE_KERNEL_VERSION } from "./codes.js";

/**
 * Worker UI button names that agents copy into FragGate.
 * Values are catalog LIVE_OPS. FragGate forwards to the real engine method.
 * Do not invent unlock / completeness / fake 200s.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
export const OP_ALIASES = {
  azhub: {
    list_modules: "region_list",
    place: "place_module",
  },
  azbrowser: {
    airlock: "airlock_ingest",
    home: "health",
  },
  azmail: {
    classify: "airlock_classify",
  },
  aznet: {
    doctor: "health",
    pair: "pair_status",
  },
  peacelock: {
    doctor: "health",
  },
  azinterface: {
    genesis_boot: "genesis_status",
    hold: "page_cycle_status",
  },
  "4dmap": {
    frame: "frame_status",
    axis: "axis_describe",
    trace: "walk_trace",
    export: "card_export",
    import: "card_import",
    neighbor: "neighbor_cite",
  },
  chronolock: {
    advise: "advisory",
  },
  mesh: { ...MESH_OP_ALIASES },
};

export function resolveOpAlias(slug, op) {
  const requested = String(op || "").trim();
  const mapped = (OP_ALIASES[slug] || {})[requested];
  if (mapped) return { requested, op: mapped, aliased: true };
  return { requested, op: requested, aliased: false };
}

/**
 * Name-only stub products. Not catalog Software engines. Not hosted Workers.
 * Hubs link describe?slug=… instead of inventing a Worker. Separate software;
 * never a separate FragGate engine.
 */
export const NAMED_STUBS = [
  {
    name: "EmbryoLock",
    slug: "embryolock",
    digest: null,
    description:
      "EmbryoLock is stub / local-not-hosted. Name only. Not a hosted Worker. Not a FragGate engine. Author: Aziel Eliab.",
    note: "stub / local-not-hosted. Hubs may link describe?slug=embryolock. Separate software under the same FragGate door; never a separate FragGate engine. Vault/Custody domain isolation label. Author: Aziel Eliab only.",
  },
  {
    name: "AZChat",
    slug: "azchat",
    digest: null,
    description:
      "AZChat is stub / local-not-hosted. Name only. Product does not exist yet. Not a hosted Worker. Not a FragGate engine. Do not invent a fake engine. Author: Aziel Eliab.",
    note: "stub / local-not-hosted. Name-only refuse until a product exists. Hubs may link describe?slug=azchat. Comms domain isolation label. Same FragGate door; never a separate FragGate engine. Author: Aziel Eliab only.",
  },
];

function namedStubEntry(spec) {
  const domain = domainFields(spec.slug);
  return {
    name: spec.name,
    slug: spec.slug,
    digest: spec.digest == null ? null : spec.digest,
    status: "stub",
    ops: [],
    catalog_ops: [],
    stub_ops: [],
    description: spec.description,
    note: spec.note,
    local_not_hosted: true,
    engine: false,
    true_engine_runtime: false,
    domain: domain.domain,
    domain_id: domain.domain_id,
    placement: domain.placement,
  };
}

/**
 * Ops callable via FragGate on the public runtime.
 * Catalog ops only (plus DecisionGATE evaluate, already hosted), plus
 * durable UI-name aliases that forward to those catalog ops. Always
 * include health+skill when the product is live. Do not invent ops.
 */
export const LIVE_OPS = {
  decisiongate: ["check", "evaluate", "gates", "verify", "doctor", "health", "skill"],
  godlock: ["score", "submit", "health", "skill"],
  "aziel-corpus": ["search", "example", "skill", "health"],
  foldlock: ["fold-preview", "unfold-preview", "health", "skill"],
  azclce: ["score", "classify", "gate", "health", "skill"],
  zsolver: ["patterns", "score", "session", "health", "skill"],
  forgereceipts: ["receipt", "verify", "import_export", "doctor", "health", "skill"],
  codelock: ["render", "health", "skill"],
  glossafilter: ["render", "health", "skill"],
  staticclock: ["advise", "advisory", "anchors", "click", "verify", "timeslate", "import_export", "doctor", "health", "skill"],
  chronolock: ["advisory", "advise", "anchors", "window", "doctor", "health", "skill"],
  azos: ["status", "health", "skill"],
  azai: ["lamb-check", "lamb_check", "health", "skill"],
  postking: ["new", "move", "status", "health", "skill"],
  shadowlock: ["observe", "health", "skill"],
  temporallock: ["genesis", "append", "verify", "timeslate", "gate", "import_export", "doctor", "health", "skill"],
  employeelock: ["append-preview", "verify-canonical", "health", "skill"],
  whistlelock: ["hash-preview", "canon-preview", "health", "skill"],
  trajectorylock: ["example", "analyze", "verify", "schema", "import_export", "doctor", "health", "skill"],
  spectrallock: ["modes", "targets", "overlay", "verify", "doctor", "health", "skill"],
  azbot: ["route", "health", "skill"],
  azieltether: ["verify", "health", "skill"],
  peacelock: ["open", "seal", "break", "show", "verify", "stamp", "upload_envelope", "health", "skill", "doctor"],
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
    "classify",
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
    "airlock",
    "home",
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
    "doctor",
    "pair",
  ],
  azhub: [
    "health",
    "skill",
    "region_list",
    "place_module",
    "remove_module",
    "tether_declare",
    "tether_cut",
    "tether_list",
    "blank_key_status",
    "list_modules",
    "place",
  ],
  azinterface: [
    "health",
    "skill",
    "genesis_status",
    "site_state_get",
    "site_state_set",
    "integrity_check",
    "witness_list",
    "page_cycle_status",
    "genesis_boot",
    "hold",
  ],
  mesh: MESH_LIVE_OPS.slice(),
  memory: MEMORY_CANONICAL_OPS.slice(),
  vibelock: ["analyze", "health", "skill"],
  ark: ["sweep", "levels", "health", "skill"],
  miragegrid: ["assign", "health", "skill"],
  mialock: ["map", "search-options", "queries", "doe-match", "coverage", "example", "health", "skill"],
  "4dmap": [
    "health",
    "skill",
    "pin",
    "span",
    "stack",
    "gap",
    "fork",
    "walk",
    "lens",
    "class",
    "cohort",
    "absence",
    "cap",
    "join",
    "list",
    "example",
    "card_new",
    "card_pin",
    "card_span",
    "card_join",
    "card_walk",
    "card_list",
    "verify_hash",
    "frame_status",
    "axis_describe",
    "walk_trace",
    "card_export",
    "card_import",
    "verify_chain",
    "neighbor_cite",
    "frame",
    "axis",
    "trace",
    "export",
    "import",
    "neighbor",
  ],
  azcoherence: [
    "health",
    "skill",
    "doctor",
    "verify",
    "review_triad",
    "alternate_score",
    "coherence_check",
    "neutralize_hallucination",
  ],
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
  azhub: [
    "scorch_remote",
    "auto_unlock",
    "ranking",
    "completeness_detect",
    "unlock",
    "complete",
    "completeness",
    "rank",
    "scorch",
  ],
  azinterface: [
    "scorch_remote",
    "auto_unlock",
    "ranking",
    "completeness_detect",
    "unlock",
    "complete",
    "completeness",
    "rank",
    "scorch",
    "skip_cycle",
    "invent_cycle",
  ],
  mesh: MESH_STUB_OPS.slice(),
  memory: MEMORY_STUB_OPS.slice(),
  "4dmap": ["truth_score", "lumen_panel", "invent_mark", "backdate_class"],
  azcoherence: [
    "invent_evidence",
    "invent",
    "fabricate",
    "truth_score",
    "truth_claim",
    "akm_calibrate",
    "memory_observe",
    "posterior_as_truth",
    "auto_pass",
    "blend_scores",
  ],
  decisiongate: ["wrap", "execute", "remote", "truth_score", "court"],
  forgereceipts: ["court", "legal_advice", "odyssey", "file_store"],
  temporallock: ["truth_claim", "scheduler", "store_chain", "rollback"],
  staticclock: ["rollback", "remote_shell", "scheduler"],
  chronolock: ["scheduler", "targeting", "virality", "cron"],
  trajectorylock: ["certified", "shooter", "intent", "guilt", "store_media", "face"],
  spectrallock: ["spectrometer", "forensic", "invent_mark"],
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
  const out = productOps.filter((op) => allow.has(op));
  const seen = new Set(out);
  for (const alias of Object.keys(OP_ALIASES[slug] || {})) {
    if (allow.has(alias) && !seen.has(alias)) {
      out.push(alias);
      seen.add(alias);
    }
  }
  return out;
}

export function registryEntry(product) {
  const slug = product.slug;
  const ops = catalogOps(product);
  const status = statusFor(slug);
  const public_ops = publicOps(slug, ops);
  const domain = domainFields(slug);
  return {
    name: product.name,
    slug,
    digest: embeddedDigest(slug),
    status,
    ops: public_ops,
    catalog_ops: ops,
    stub_ops: (STUB_OPS[slug] || []).slice(),
    op_aliases: { ...(OP_ALIASES[slug] || {}) },
    description: product.oneLine || product.name,
    domain: domain.domain,
    domain_id: domain.domain_id,
    placement: domain.placement,
    note:
      status === "live"
        ? "Live on the public FragGate door."
        : "Named in the registry. Local / in-process engine exists; not live on the public mesh.",
  };
}

export function buildRegistry(products) {
  const entries = (products || [])
    .map((p) => registryEntry(p))
    .concat(NAMED_STUBS.map(namedStubEntry))
    .concat([meshKernelEntry(), memoryKernelEntry()]);
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
    domain: e.domain || null,
    domain_id: e.domain_id || null,
    placement: e.placement || null,
    local_not_hosted: e.local_not_hosted || false,
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
  const stubAliased = NAMED_STUBS.find((s) => s.slug === key || String(s.name).toLowerCase() === key);
  if (stubAliased && registry.bySlug[stubAliased.slug]) return registry.bySlug[stubAliased.slug];
  if (bySlug && bySlug[key] && registry.bySlug[key]) return registry.bySlug[key];
  if (
    key === MESH_SLUG ||
    key === "node-mesh" ||
    key === "nodemesh" ||
    key === "node mesh" ||
    key === "qnm" ||
    key === "qnm-build" ||
    key === "quantum-node-mesh" ||
    key === "quantum node mesh"
  ) {
    return registry.bySlug[MESH_SLUG] || null;
  }
  if (key === MEMORY_SLUG || key === "akm" || key === "akm-triad" || key === "adaptive-memory") {
    return registry.bySlug[MEMORY_SLUG] || null;
  }
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
  if (entry.status === "stub") {
    return { kind: "stub", status: "stub" };
  }
  const stubs = STUB_OPS[entry.slug] || [];
  if (action && stubs.includes(action)) {
    return { kind: "stub", status: "stub" };
  }
  const resolved = resolveOpAlias(entry.slug, action);
  const live = LIVE_OPS[entry.slug] || [];
  if (entry.status === "live" && action && (live.includes(action) || live.includes(resolved.op))) {
    return { kind: "live", status: "live", op: resolved.op, requested: resolved.requested, aliased: resolved.aliased };
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
    op_aliases: OP_ALIASES,
    stub_ops: registry.stub_ops || [],
  };
}
