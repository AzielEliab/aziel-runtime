/**
 * Authoritative live software catalog + client update check.
 *
 * Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) fetch
 * GET /v1/software on each Software-tab request so a GitHub drop that
 * updates this runtime refreshes hub tabs without hand-editing copy.
 *
 * Sort law: Plain A–Z → Gate A–Z → Lock A–Z. Clock ≠ Lock.
 * Framing: separate / sibling software under ONE FragGate door.
 * Never "separate FragGate engines".
 *
 * Public identity: Aziel Eliab only.
 */

import { CATALOG_ALIASES } from "./catalog-meta.js";
import { NAMED_STUBS } from "./fraggate/registry.js";
import { meshHint } from "./mesh.js";
import { LIBRARY_ORIGIN } from "./seo.js";

export const SOFTWARE_SORT_LAW = "plain A–Z → gate A–Z → lock A–Z (Clock ≠ Lock)";
export const SOFTWARE_FRAMING =
  "Separate software / sibling software under one FragGate door. Never separate FragGate engines. Clock is not Lock.";
export const SOFTWARE_HUBS = Object.freeze([
  "https://azieleliab.com",
  "https://www.azielcorpuslibrary.net",
  "https://godlock.uk",
]);
export const BUCKET_RANK = Object.freeze({ plain: 0, gate: 1, lock: 2 });
export const RUNTIME_SOFTWARE_SLUG = "aziel-runtime";

const RUNTIME_ALIASES = Object.freeze({
  runtime: RUNTIME_SOFTWARE_SLUG,
  "aziel-runtime": RUNTIME_SOFTWARE_SLUG,
  azielruntime: RUNTIME_SOFTWARE_SLUG,
  "aziel-eliab-runtime": RUNTIME_SOFTWARE_SLUG,
});

/**
 * Bucket from public name/slug. *clock is never lock (StaticClock ≠ Lock).
 * *gate is gate. *lock (and not clock) is lock. Else plain.
 */
export function softwareBucket(name, slug) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  const s = String(slug || "")
    .trim()
    .toLowerCase();
  const clock = n.endsWith("clock") || s.endsWith("clock");
  const lock = !clock && (n.endsWith("lock") || s.endsWith("lock"));
  const gate = n.includes("gate") || s.includes("gate");
  if (lock) return "lock";
  if (gate) return "gate";
  return "plain";
}

export function compareSoftwareEntries(a, b) {
  const ra = BUCKET_RANK[a && a.bucket] ?? 9;
  const rb = BUCKET_RANK[b && b.bucket] ?? 9;
  if (ra !== rb) return ra - rb;
  return String((a && a.name) || "").localeCompare(String((b && b.name) || ""), "en", {
    sensitivity: "base",
  });
}

export function sortSoftwareEntries(entries) {
  return (entries || []).slice().sort(compareSoftwareEntries);
}

export function workerHostOf(product) {
  if (!product || !product.slug) return null;
  if (product.slug === "aziel-corpus") return LIBRARY_ORIGIN;
  if (!product.worker) return null;
  return `https://${product.worker}.vibelock.workers.dev`;
}

function sanitizeGitSha(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (!/^[0-9a-f]{7,40}$/i.test(s)) return null;
  return s.toLowerCase();
}

export function softwareMeta(env) {
  const sha =
    sanitizeGitSha(env && env.GIT_SHA) ||
    sanitizeGitSha(env && env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) ||
    null;
  const updated =
    (env && env.UPDATED_AT && String(env.UPDATED_AT).trim()) || null;
  return { git_sha: sha, updated_at: updated };
}

function agentHints(base, slug, status) {
  const root = String(base || "").replace(/\/$/, "");
  return {
    mcp: `${root}/mcp`,
    skill: `${root}/v1/skill`,
    fraggate_list: `${root}/v1/fraggate/list`,
    fraggate_describe: `${root}/v1/fraggate/describe?slug=${encodeURIComponent(slug)}`,
    fraggate_call: `${root}/v1/fraggate/call`,
    software: `${root}/v1/software`,
    pull: status === "stub" ? null : `${root}/v1/pull/${slug}`,
    pipeline: "fraggate_list → fraggate_describe → fraggate_call",
  };
}

export function liveSoftwareCard(product, origin, meta = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const host = workerHostOf(product);
  const bucket = softwareBucket(product.name, product.slug);
  return {
    slug: product.slug,
    name: product.name,
    bucket,
    status: "live",
    version: product.version || null,
    one_line: product.oneLine || product.one_line || product.name,
    worker_home: host ? `${host}/` : null,
    download_url: host ? `${host}/download` : null,
    github: product.github || null,
    mcp: `${base}/mcp`,
    agent: agentHints(base, product.slug, "live"),
    updated_at: meta.updated_at || null,
    git_sha: meta.git_sha || null,
    door: "fraggate",
    kind: "software",
    mesh: meshHint("/v1/mesh"),
  };
}

export function stubSoftwareCard(spec, origin, meta = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const bucket = softwareBucket(spec.name, spec.slug);
  return {
    slug: spec.slug,
    name: spec.name,
    bucket,
    status: "stub",
    version: spec.version || null,
    one_line: spec.description || spec.one_line || spec.note || spec.name,
    worker_home: null,
    download_url: null,
    github: spec.github || null,
    mcp: `${base}/mcp`,
    agent: agentHints(base, spec.slug, "stub"),
    updated_at: meta.updated_at || null,
    git_sha: meta.git_sha || null,
    door: "fraggate",
    kind: "software",
    local_not_hosted: true,
    engine: false,
    note: spec.note || "stub / local-not-hosted. Name only. Not a FragGate engine.",
    mesh: meshHint("/v1/mesh"),
  };
}

export function listSoftwareEntries(products, origin, meta = {}) {
  const live = (products || []).map((p) => liveSoftwareCard(p, origin, meta));
  const stubs = (NAMED_STUBS || []).map((s) => stubSoftwareCard(s, origin, meta));
  return sortSoftwareEntries(live.concat(stubs));
}

export function softwareCatalog(origin, products, extra = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const meta = {
    updated_at: extra.updated_at || extra.updatedAt || null,
    git_sha: extra.git_sha || extra.gitSha || null,
  };
  const software = listSoftwareEntries(products, base, meta);
  return {
    ok: true,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    version: extra.runtimeVersion || extra.version || null,
    door: "fraggate",
    kernel: "https://github.com/AzielEliab/fraggate",
    framing: SOFTWARE_FRAMING,
    sort_law: SOFTWARE_SORT_LAW,
    updated_at: meta.updated_at,
    git_sha: meta.git_sha,
    count: software.length,
    live_count: software.filter((s) => s.status === "live").length,
    stub_count: software.filter((s) => s.status === "stub").length,
    software,
    mcp: `${base}/mcp`,
    fraggate: `${base}/v1/fraggate`,
    fraggate_software: `${base}/v1/fraggate/software`,
    catalog: `${base}/v1/catalog.json`,
    update_check: `${base}/v1/update/check`,
    update_manifest: `${base}/v1/update/manifest`,
    hubs: SOFTWARE_HUBS.slice(),
    hubs_note:
      "Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) fetch GET /v1/software on each Software-tab request. A GitHub drop that updates this runtime refreshes those tabs without hand-editing hub copy.",
    note: SOFTWARE_FRAMING,
    mesh: {
      ...meshHint("/v1/mesh"),
      status: `${base}/v1/mesh/status`,
      nodes: `${base}/v1/mesh/nodes`,
      note: "Suite node mesh kernel. Default OFF. Not a Softwares-tab product. Anon-broadcast stays local-only.",
    },
  };
}

export function resolveSoftwareSlug(raw, products) {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (RUNTIME_ALIASES[key]) return RUNTIME_SOFTWARE_SLUG;
  if (products && products.some((p) => p.slug === key)) return key;
  const aliased = CATALOG_ALIASES[key];
  if (aliased && products && products.some((p) => p.slug === aliased)) return aliased;
  if ((NAMED_STUBS || []).some((s) => s.slug === key)) return key;
  const stubAlias = CATALOG_ALIASES[key];
  if (stubAlias && (NAMED_STUBS || []).some((s) => s.slug === stubAlias)) return stubAlias;
  const byName = (products || []).find((p) => String(p.name).toLowerCase() === key);
  if (byName) return byName.slug;
  const stubName = (NAMED_STUBS || []).find((s) => String(s.name).toLowerCase() === key);
  if (stubName) return stubName.slug;
  return null;
}

/** Compare dotted numeric versions. Returns a-b (neg if a < b). Null if unparseable. */
export function compareVersions(a, b) {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  if (!pa || !pb) return null;
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export function parseVersionParts(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^v/i, "");
  if (!s) return null;
  const core = s.split(/[-+]/)[0];
  if (!/^\d+(\.\d+)*$/.test(core)) return null;
  return core.split(".").map((n) => Number(n));
}

function updateAvailable(current, latest) {
  if (!latest) return false;
  if (!current) return true;
  const cmp = compareVersions(current, latest);
  if (cmp != null) return cmp < 0;
  return String(current).trim() !== String(latest).trim();
}

export function updateCheck({ slug, version, current } = {}, origin, products, extra = {}) {
  const installed = version != null && version !== "" ? version : current;
  const key = resolveSoftwareSlug(slug, products);
  if (!key) {
    return {
      ok: false,
      error: "unknown product",
      slug: slug || null,
      hint: "GET /v1/software or GET /v1/update/manifest",
      status: 404,
    };
  }

  const base = String(origin || "").replace(/\/$/, "");
  const catalog = softwareCatalog(base, products, extra);
  const card = catalog.software.find((s) => s.slug === key);

  if (key === RUNTIME_SOFTWARE_SLUG) {
    const latest = extra.runtimeVersion || extra.version || null;
    const available = updateAvailable(installed, latest);
    return {
      ok: true,
      slug: RUNTIME_SOFTWARE_SLUG,
      current: installed != null && installed !== "" ? String(installed) : null,
      latest,
      update_available: available,
      download_url: null,
      notes:
        "Aziel Eliab Runtime has no counted tarball. Worker + in-repo CLI. Hubs/clients refresh GET /v1/software. install.sh / local UI / mobile: compare version then pull GitHub or redeploy.",
      github: "https://github.com/AzielEliab/aziel-runtime",
      software: `${base}/v1/software`,
      status: 200,
    };
  }

  if (!card) {
    return {
      ok: false,
      error: "unknown product",
      slug: key,
      hint: "GET /v1/software or GET /v1/update/manifest",
      status: 404,
    };
  }

  const latest = card.version || null;
  const available = card.status === "stub" ? false : updateAvailable(installed, latest);
  const notes =
    card.status === "stub"
      ? "Stub / local-not-hosted. Name only. No Worker download. Not a FragGate engine. Hubs link describe?slug=" +
        card.slug +
        "."
      : available
        ? `Newer ${card.name} ${latest} is available. Counted package: ${card.download_url}. install.sh / local UI / mobile should offer update.`
        : latest
          ? `${card.name} ${latest} is current.`
          : `${card.name} has no published version yet.`;

  return {
    ok: true,
    slug: card.slug,
    current: installed != null && installed !== "" ? String(installed) : null,
    latest,
    update_available: available,
    download_url: card.download_url,
    notes,
    github: card.github,
    worker_home: card.worker_home,
    status: 200,
  };
}

export function updateManifest(origin, products, extra = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const catalog = softwareCatalog(base, products, extra);
  const items = catalog.software.map((s) => ({
    slug: s.slug,
    name: s.name,
    bucket: s.bucket,
    status: s.status,
    latest: s.version,
    download_url: s.download_url,
    github: s.github,
    check: `${base}/v1/update/check?slug=${encodeURIComponent(s.slug)}&version=`,
  }));
  items.push({
    slug: RUNTIME_SOFTWARE_SLUG,
    name: "Aziel Eliab Runtime",
    bucket: "plain",
    status: "live",
    latest: extra.runtimeVersion || extra.version || null,
    download_url: null,
    github: "https://github.com/AzielEliab/aziel-runtime",
    check: `${base}/v1/update/check?slug=${RUNTIME_SOFTWARE_SLUG}&version=`,
  });
  return {
    ok: true,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    version: extra.runtimeVersion || extra.version || null,
    door: "fraggate",
    framing: SOFTWARE_FRAMING,
    updated_at: extra.updated_at || extra.updatedAt || null,
    git_sha: extra.git_sha || extra.gitSha || null,
    software: `${base}/v1/software`,
    check: `${base}/v1/update/check?slug={slug}&version={installed}`,
    client_note:
      "install.sh, local UIs, and mobile: GET /v1/update/check?slug=<product>&version=<installed>. If update_available, fetch download_url (counted Worker /download). Hubs refresh tabs from GET /v1/software.",
    count: items.length,
    latest: items,
  };
}
