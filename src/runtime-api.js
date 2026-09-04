/**
 * Aziel Eliab Runtime — pull + invoke + cite.
 * Public identity: Aziel Eliab only. Forks welcome. Do not invent DOIs.
 */

export const RUNTIME_VERSION = "1.1.0";
export const RUNTIME_ROLE = "runtime";
export const SKILL_INLINE_MAX = 24_000;
export const SKILL_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_UA = "Mozilla/5.0";

/** Extra slugs an installer or AI may type. Values are catalog slugs. */
export const CATALOG_ALIASES = {
  "zion-pattern-solver": "zsolver",
  zionpatternsolver: "zsolver",
  "postking-chess": "postking",
  "az-clce": "azclce",
  "aziel-digital-library": "aziel-corpus",
  "aziel-digital-library-v2": "aziel-corpus",
  azielcorpus: "aziel-corpus",
  corpus: "aziel-corpus",
  "mia-lock": "mialock",
  "mia.lock": "mialock",
  "m.i.a.lock": "mialock",
};

const skillCache = new Map();

export function resolveSlug(raw, bySlug) {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (bySlug[key]) return key;
  const aliased = CATALOG_ALIASES[key];
  if (aliased && bySlug[aliased]) return aliased;
  return null;
}

export function aliasesForSlug(slug) {
  return Object.entries(CATALOG_ALIASES)
    .filter(([, target]) => target === slug)
    .map(([alias]) => alias);
}

export function runtimeSkillMarkdown(origin, products) {
  const base = origin.replace(/\/$/, "");
  const n = products.length;
  const slugs = products.map((p) => p.slug).join(", ");
  return `---
name: Aziel Eliab Runtime
description: >-
  Root source for Grok, ChatGPT, Venice, and any installer to discover, pull,
  invoke, and cite every Aziel Eliab product without visiting each Worker first.
---

# Aziel Eliab Runtime

This Worker is a **runtime** — **pull + invoke + cite** — not only a catalog.

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
License: Apache-2.0. Forks are welcome and always allowed.
Version: ${RUNTIME_VERSION}
Host: ${base}/
Everblooming sigil: ${base}/sigil.png
Products: ${n} (${slugs})

Always send \`User-Agent: Mozilla/5.0\`. Cloudflare Workers may 403 an empty agent.
Do **not** invent Zenodo DOIs. Cite \`/cite.json\`. Download counters are **not** incremented on pull, skill, health, or invoke-proxy routes.

## Bootstrap (start here)

1. \`GET ${base}/v1/skill\` — this markdown (how to pull + call).
2. \`GET ${base}/v1/runtime.json\` — machine manifest (\`role=runtime\`).
3. \`GET ${base}/v1/bundle\` — compact listing: every product skill URL + invoke prefix.
   Alias: \`GET ${base}/v1/pull?all=1\`.
4. \`GET ${base}/v1/pull/{slug}\` — name, version, skill URL (and inline skill when small), counted download, install.sh, ops, OpenAPI, banners, catalog aliases.
5. \`GET ${base}/v1/pull/{slug}/skill\` — that product's skill markdown (proxied / cached from the product Worker).
6. Invoke: \`GET\` or \`POST ${base}/p/{slug}/{op}\` (service-binding proxy to the product \`/v1/{op}\`).

You do **not** need to open each product homepage.

## How Grok / ChatGPT / Venice pull + call

- **ChatGPT** — GPT Actions → Import from URL → \`${base}/openapi.json\`
- **Grok** — custom tool / OpenAPI / MCP remote → \`${base}/openapi.json\` or \`POST ${base}/mcp\`
- **Venice** — custom HTTP tools / OpenAPI → same OpenAPI URL
- **Any installer / agent** — \`GET ${base}/v1/runtime.json\` then \`GET ${base}/v1/bundle\`, then pull one slug and call \`/p/{slug}/{op}\`

MCP tools are named \`{slug}_{op}\` (example: \`decisiongate_check\`, \`foldlock_fold-preview\`). Runtime helpers: \`runtime_skill\`, \`runtime_manifest\`, \`runtime_bundle\`, \`runtime_pull\`. Public, no OAuth.

## Runtime endpoints (this Worker)

| Method | Path | What |
|--------|------|------|
| GET | \`/v1/skill\` | This markdown. Does not increment downloads. |
| GET | \`/v1/runtime.json\` | Machine manifest. role=runtime. |
| GET | \`/v1/bundle\` | Compact bootstrap of every product. |
| GET | \`/v1/pull?all=1\` | Alias of \`/v1/bundle\`. |
| GET | \`/v1/pull/{slug}\` | Pull record for one product. |
| GET | \`/v1/pull/{slug}/skill\` | Product skill markdown. |
| GET | \`/v1/catalog.json\` | Full catalog (discover). |
| GET/POST | \`/p/{slug}/{op}\` | Invoke via service binding (fallback: public Worker URL). |
| GET | \`/openapi.json\` | Combined OpenAPI 3.1. |
| POST | \`/mcp\` | JSON-RPC MCP-over-HTTP. |
| GET | \`/cite.json\` | How to cite. Aziel Eliab only. No invented DOIs. |
| GET | \`/llms.txt\` | Plain-text runtime for crawlers. |
| GET | \`/v1/health\` | Liveness. |

Library front door: https://www.azielcorpuslibrary.net/runtime  
Library JSON alias: https://www.azielcorpuslibrary.net/v1/runtime

## Example (Mozilla/5.0)

\`\`\`bash
curl -s -A 'Mozilla/5.0' ${base}/v1/skill
curl -s -A 'Mozilla/5.0' ${base}/v1/runtime.json
curl -s -A 'Mozilla/5.0' ${base}/v1/bundle
curl -s -A 'Mozilla/5.0' ${base}/v1/pull/foldlock
curl -s -A 'Mozilla/5.0' ${base}/v1/pull/foldlock/skill
curl -s -A 'Mozilla/5.0' -X POST ${base}/p/azclce/score \\
  -H 'content-type: application/json' \\
  -d '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
\`\`\`

## Honesty

GodLock and MirageGrid are not VPNs. ForgeReceipts is not legal advice. ZionPattern Solver caps confidence at 75% and does not solve cases. VeilLock does not inject into FaceTime. AZ-CLCE detects inconsistency, not intent. ChronoLock is advisory only. The ARK is not a kernel. AZAI hosted /v1 is not a paid-key proxy. Jeeves is not sovereign. SpectralLock hosted overlay is a 256px preview. EmployeeLock is not a court. FoldLock is not zip. WhistleLock is not a mailer. TrajectoryLock is not a certified forensic instrument. M.I.A.Lock Doe hits are leads, not IDs. Aziel Digital Library is not a 26-card index. AzielTether is not a VPN.

## Cite

Eliab, Aziel. (${new Date().getUTCFullYear()}). Aziel Eliab Runtime ${RUNTIME_VERSION} [Software]. Apache-2.0. ${base}/

Machine-readable: ${base}/cite.json
GitHub: https://github.com/AzielEliab/aziel-runtime
`;
}

export function runtimeManifest(origin, products) {
  const base = origin.replace(/\/$/, "");
  return {
    ok: true,
    role: RUNTIME_ROLE,
    product: "aziel-runtime",
    name: "Aziel Eliab Runtime",
    version: RUNTIME_VERSION,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    license: "Apache-2.0",
    forks: "welcome",
    doi: null,
    doi_note: "No DOI invented. Cite /cite.json. Zenodo software deposit needed for a live record.",
    product_count: products.length,
    products: products.map((p) => p.slug),
    host: base + "/",
    github: "https://github.com/AzielEliab/aziel-runtime",
    library_front_door: "https://www.azielcorpuslibrary.net/runtime",
    sigil: base + "/sigil.png",
    sigil_stamp: "Everblooming",
    user_agent: DEFAULT_UA,
    kv_increment: false,
    endpoints: {
      skill: base + "/v1/skill",
      runtime: base + "/v1/runtime.json",
      discover: base + "/v1/catalog.json",
      pull: base + "/v1/pull/{slug}",
      pull_skill: base + "/v1/pull/{slug}/skill",
      bundle: base + "/v1/bundle",
      pull_all: base + "/v1/pull?all=1",
      invoke: base + "/p/{slug}/{op}",
      cite: base + "/cite.json",
      openapi: base + "/openapi.json",
      mcp: base + "/mcp",
      health: base + "/v1/health",
      llms: base + "/llms.txt",
      sitemap: base + "/sitemap.xml",
      robots: base + "/robots.txt",
    },
  };
}

export function bundleRecord(product, origin) {
  const base = origin.replace(/\/$/, "");
  return {
    slug: product.slug,
    name: product.name,
    version: product.version || null,
    skill_url: `${base}/v1/pull/${product.slug}/skill`,
    worker_skill: productUrlsSkill(product),
    invoke_prefix: `${base}/p/${product.slug}`,
    ops: (product.ops || []).map((o) => `${o.method} /p/${product.slug}/${o.op}`),
    download: downloadUrl(product),
    install: installUrl(product),
  };
}

export function bundleJson(origin, products) {
  const base = origin.replace(/\/$/, "");
  return {
    ok: true,
    role: RUNTIME_ROLE,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    version: RUNTIME_VERSION,
    product_count: products.length,
    skill: base + "/v1/skill",
    runtime: base + "/v1/runtime.json",
    invoke: base + "/p/{slug}/{op}",
    cite: base + "/cite.json",
    user_agent: DEFAULT_UA,
    products: products.map((p) => bundleRecord(p, origin)),
  };
}

function workerHostOf(product) {
  if (product.slug === "aziel-corpus") return "https://www.azielcorpuslibrary.net";
  return `https://${product.worker}.vibelock.workers.dev`;
}

function downloadUrl(product) {
  return workerHostOf(product) + "/download";
}

function installUrl(product) {
  return workerHostOf(product) + "/install.sh";
}

function productUrlsSkill(product) {
  return workerHostOf(product) + "/v1/skill";
}

export function pullRecord(product, origin, skillText, extra = {}) {
  const base = origin.replace(/\/$/, "");
  const host = workerHostOf(product);
  const inline =
    typeof skillText === "string" && skillText.length > 0 && skillText.length <= SKILL_INLINE_MAX
      ? skillText
      : null;
  return {
    ok: true,
    role: "product",
    slug: product.slug,
    name: product.name,
    version: product.version || null,
    one_line: product.oneLine,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    license: "Apache-2.0",
    github: product.github,
    skill_url: `${base}/v1/pull/${product.slug}/skill`,
    worker_skill: host + "/v1/skill",
    ...(inline ? { skill: inline } : skillText ? { skill_bytes: skillText.length, skill_inline: false } : {}),
    download: host + "/download",
    count: host + "/count",
    install: host + "/install.sh",
    install_sh: `curl -fsSL ${host}/install.sh | bash`,
    openapi: host + "/openapi.json",
    runtime_openapi: base + "/openapi.json",
    ops: product.ops,
    banner: product.banner || null,
    limitations: product.banner || product.oneLine || null,
    aliases: {
      catalog_card: `${base}/p/${product.slug}`,
      catalog_skill: `${base}/p/${product.slug}/skill`,
      catalog_health: `${base}/p/${product.slug}/health`,
      invoke_prefix: `${base}/p/${product.slug}`,
      worker_home: host + "/",
      slugs: [product.slug, ...aliasesForSlug(product.slug)],
    },
    doi: product.doi || null,
    doi_note: product.doi
      ? "Historical DOI only. Do not invent a replacement. See /cite.json."
      : "No DOI. Zenodo software deposit needed. Do not invent one.",
    skill_source: extra.skill_source || null,
    kv_increment: false,
  };
}

export function fallbackSkillMarkdown(product, origin) {
  const base = origin.replace(/\/$/, "");
  const host = workerHostOf(product);
  const ops = (product.ops || [])
    .map((o) => `| ${o.method} | \`/v1/${o.op}\` · \`${base}/p/${product.slug}/${o.op}\` | ${o.summary} |`)
    .join("\n");
  const example = JSON.stringify(product.example || {}, null, 2);
  return `---
name: ${product.name}
description: >-
  ${product.oneLine || product.name} Hosted via aziel-runtime pull + invoke.
  Author Aziel Eliab.
---

# ${product.name}

${product.oneLine || product.name}

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
${product.version ? `Version: ${product.version}` : ""}
${product.banner ? `\n**Banner / limitation:** ${product.banner}\n` : ""}

Always send \`User-Agent: Mozilla/5.0\`.

This skill was served from **aziel-runtime** because the product Worker \`/v1/skill\` was not available. Prefer \`${base}/v1/pull/${product.slug}/skill\` on the next call.

## Pull + invoke (do not visit the product homepage first)

- Pull: \`${base}/v1/pull/${product.slug}\`
- Skill: \`${base}/v1/pull/${product.slug}/skill\`
- Invoke prefix: \`${base}/p/${product.slug}\`
- Worker: ${host}/
- Counted download: ${host}/download
- Install: \`curl -fsSL ${host}/install.sh | bash\`
- GitHub: ${product.github}

## Ops

| Method | Path | What |
|--------|------|------|
${ops}

## Example

\`\`\`bash
curl -s -A 'Mozilla/5.0' -X POST ${base}/p/${product.slug}/${(product.ops.find((o) => o.method === "POST") || product.ops[0] || { op: "health" }).op} \\
  -H 'content-type: application/json' \\
  -d '${example.replace(/'/g, "’")}'
\`\`\`

Apache-2.0. Forks welcome. Do not invent a DOI.
`;
}

function looksLikeSkill(text, contentType) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed[0] === "{" || trimmed[0] === "[") return false;
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("json")) return false;
  if (ct.includes("markdown") || ct.includes("text/plain") || ct.includes("text/x-markdown")) return true;
  return trimmed.startsWith("#") || trimmed.startsWith("---") || trimmed.includes("\n# ");
}

export async function fetchProductSkill(env, product, upstreamFetch) {
  const now = Date.now();
  const hit = skillCache.get(product.slug);
  if (hit && now - hit.at < SKILL_TTL_MS && hit.text) {
    return { text: hit.text, source: hit.source + "+cache", contentType: hit.contentType };
  }
  try {
    const { res, target } = await upstreamFetch(env, product, "/v1/skill", {
      method: "GET",
      headers: {
        accept: "text/markdown, text/plain, */*",
        "user-agent": DEFAULT_UA,
      },
    });
    if (res && res.ok) {
      const contentType = res.headers.get("content-type") || "text/markdown; charset=utf-8";
      const text = await res.text();
      if (looksLikeSkill(text, contentType)) {
        skillCache.set(product.slug, { text, at: now, source: target, contentType });
        return { text, source: target, contentType };
      }
    }
  } catch {
    /* fallback below */
  }
  return { text: null, source: null, contentType: "text/markdown; charset=utf-8" };
}

export function markdownResponse(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
    },
  });
}

export function runtimeStaticPaths() {
  return {
    "/v1/skill": {
      get: {
        operationId: "runtime_skill",
        summary: "Runtime skill markdown: how Grok/ChatGPT/Venice pull + call.",
        tags: ["runtime"],
        responses: { "200": { description: "text/markdown skill" } },
      },
    },
    "/v1/runtime.json": {
      get: {
        operationId: "runtime_manifest",
        summary: "Machine manifest. role=runtime. Pull, invoke, cite endpoints, product count, identity Aziel Eliab.",
        tags: ["runtime"],
        responses: { "200": { description: "Runtime manifest JSON" } },
      },
    },
    "/v1/bundle": {
      get: {
        operationId: "runtime_bundle",
        summary: "Compact bootstrap: every product skill URL + invoke prefix.",
        tags: ["runtime"],
        responses: { "200": { description: "Bundle JSON" } },
      },
    },
    "/v1/pull": {
      get: {
        operationId: "runtime_pull_query",
        summary: "Pull one product (?slug=) or the full bundle (?all=1).",
        tags: ["runtime"],
        parameters: [
          { name: "all", in: "query", schema: { type: "string" } },
          { name: "slug", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Pull or bundle JSON" } },
      },
    },
    "/v1/pull/{slug}": {
      get: {
        operationId: "runtime_pull",
        summary: "Pull record: name, version, skill_url, inline skill, download, install.sh, ops, OpenAPI, banners, aliases.",
        tags: ["runtime"],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Pull JSON" }, "404": { description: "Unknown slug" } },
      },
    },
    "/v1/pull/{slug}/skill": {
      get: {
        operationId: "runtime_pull_skill",
        summary: "Product skill markdown proxied/cached from the product Worker.",
        tags: ["runtime"],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "text/markdown skill" }, "404": { description: "Unknown slug" } },
      },
    },
  };
}
