/**
 * Aziel Eliab Runtime — catalog + pull + proxy + session + in-process engines.
 * 1.1.0 was catalog+proxy that called itself a runtime.
 * 1.2.0 was a session/receipt runtime (exec still proxied).
 * 1.3.0 ran vendored engines inside this isolate for listed slugs.
 * 1.4.0 vendors a true engine for every catalog Software slug.
 * Public identity: Aziel Eliab only. Forks welcome. Do not invent DOIs.
 */
import { honestyFields, trueEngineSlugs } from "./engines/registry.js";

export const RUNTIME_VERSION = "1.4.0";
export const RUNTIME_ROLE = "engine-runtime";
export const RUNTIME_LAYER = "catalog+pull+proxy+session+in-process-engines";
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
  const local = trueEngineSlugs().join(", ");
  return `---
name: Aziel Eliab Runtime
description: >-
  Catalog + pull + proxy front door for every Aziel Eliab product, plus one
  session object and in-process engines for every catalog Software slug.
  1.1.0 was catalog+proxy. 1.2.0 was a session/receipt runtime (exec still
  proxied). 1.3.0 ran listed slugs in-process. 1.4.0 vendors every slug.
---

# Aziel Eliab Runtime

**1.4.0 = catalog + pull + proxy + session + in-process engines** for **every** catalog Software slug.
**1.3.0 = true engine runtime** for listed portable slugs (in-process) + session + pull/proxy.
**1.2.0 = session-runtime** (receipt chain; exec still \`upstreamFetch\`ed product Workers).
**1.1.0 = catalog + pull + proxy** that started calling itself a runtime. Useful front doors. Not exec.

True engine exec on *this* Worker is:

\`open → policy → exec(slug, op, payload) → receipt → close\`

For **true-engine slugs** (\`${local}\`) \`exec\` resolves the slug to a vendored module, computes \`engine_digest\` = SHA-256 of that artifact's bytes, runs the op **inside this Worker isolate** (the jail), wipes scratch buffers, and the receipt includes \`engine_digest\`, \`engine_slug\`, \`engine_op\`, \`ran_in: "aziel-runtime"\`. \`GET /v1/health\` \`engine_slugs\` equals \`true_engine_slugs\` equals the catalog.

If an op **cannot** run without external bindings (KV / D1 / AI / live media), that **op** is marked \`mode: "proxy_fallback"\` while the slug stays a true engine. It does **not** pretend the binding ran here.

\`GET/POST /p/{slug}/{op}\` is still a **proxy**. Proxy without a session receipt is **not** exec.

Cloudflare's Worker / Durable Object isolate **is** the jail. No extra guest isolate is claimed. The receipt still requires that engine's digest.

Closest true *local blends* in the mesh remain: \`azai serve\`, \`forgereceipts ui\`, \`azos ui\`.
Hosted / in-process AZAI is still protocol mirror + Lamb check, **not** the blend.

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
License: Apache-2.0. Forks are welcome and always allowed.
Version: ${RUNTIME_VERSION}
Role: engine-runtime (layer: catalog+pull+proxy+session+in-process-engines)
Host: ${base}/
Everblooming sigil: ${base}/sigil.png
Products: ${n} (${slugs})
True-engine slugs: ${local}
engine_slugs: ${local}
Modules: \`src/engines/{slug}.js\` for every catalog slug (${local})
Packaging: Worker session + in-repo CLI (\`node cli/aziel-runtime.mjs\`). **No counted runtime tarball.**

Always send \`User-Agent: Mozilla/5.0\`. Cloudflare Workers may 403 an empty agent.
Do **not** invent Zenodo DOIs. Cite \`/cite.json\`. Download counters are **not** incremented on pull, skill, health, proxy, or session exec.

## Session (the actual cut)

1. \`POST ${base}/v1/session/open\` — session id, start time, policy defaults, empty receipt chain.
2. \`POST ${base}/v1/session/{id}/policy\` — allow slugs/ops, payload size cap, no download-counter side effects unless explicitly requested (this Worker still has no download KV).
3. \`POST ${base}/v1/session/{id}/exec\` body \`{slug, op, payload}\` — record intent, run the **local in-process engine** for that slug (\`engine_digest\` + \`ran_in: aziel-runtime\`); only binding-only ops are per-op \`proxy_fallback\`. Append a **hash-chained execution receipt owned by this session**.
4. \`GET ${base}/v1/session/{id}/receipt\` or \`.../receipts\` — last receipt / full chain (verifiable locally).
5. \`POST ${base}/v1/session/{id}/close\` — seal. Further exec is 409.

CLI (talks to this Worker, or \`--local\` filesystem session; prefers local engine modules):

\`\`\`bash
node cli/aziel-runtime.mjs session open
node cli/aziel-runtime.mjs session policy --allow-slugs azclce
node cli/aziel-runtime.mjs session exec azclce score '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
node cli/aziel-runtime.mjs session receipt
node cli/aziel-runtime.mjs session close
\`\`\`

## Bootstrap (front doors — still useful)

1. \`GET ${base}/v1/skill\` — this markdown.
2. \`GET ${base}/v1/runtime.json\` — machine manifest (\`version=1.4.0\`, \`role=engine-runtime\`, every catalog slug in \`engine_slugs\` / \`true_engine_slugs\`). Same JSON: \`GET ${base}/v1/runtime\`.
3. \`GET ${base}/v1/bundle\` — every product skill URL + invoke prefix.
   Alias: \`GET ${base}/v1/pull?all=1\`.
4. \`GET ${base}/v1/pull/{slug}\` — name, version, skill URL, counted download, install.sh, ops.
5. \`GET ${base}/v1/pull/{slug}/skill\` — product skill markdown (proxied / cached).
6. Proxy (not exec): \`GET\` or \`POST ${base}/p/{slug}/{op}\`.

You do **not** need to open each product homepage.

## How Grok / ChatGPT / Venice pull + call

- **ChatGPT** — GPT Actions → Import from URL → \`${base}/openapi.json\`
- **Grok** — custom tool / OpenAPI / MCP remote → \`${base}/openapi.json\` or \`POST ${base}/mcp\`
- **Venice** — custom HTTP tools / OpenAPI → same OpenAPI URL
- **Any installer / agent** — \`GET ${base}/v1/runtime.json\` then open a session, or pull one slug and call \`/p/{slug}/{op}\` (proxy only).

MCP tools are named \`{slug}_{op}\` (example: \`decisiongate_check\`, \`foldlock_fold-preview\`). Helpers: \`runtime_skill\`, \`runtime_manifest\`, \`runtime_bundle\`, \`runtime_pull\`, \`runtime_session_open\`, \`runtime_session_policy\`, \`runtime_session_exec\`, \`runtime_session_receipt\`, \`runtime_session_receipts\`, \`runtime_session_close\`. Public, no OAuth.

## Endpoints (this Worker)

| Method | Path | What |
|--------|------|------|
| POST | \`/v1/session/open\` | Create session + genesis receipt. |
| POST | \`/v1/session/{id}/policy\` | Attach allow rules. |
| POST | \`/v1/session/{id}/exec\` | In-process engine for every catalog slug (\`engine_digest\`). Binding-only ops may be per-op proxy_fallback. Hash-chained receipt. |
| GET | \`/v1/session/{id}/receipt\` | Last receipt (verifiable). Includes engine_digest when local. |
| GET | \`/v1/session/{id}/receipts\` | Full receipt chain. |
| POST | \`/v1/session/{id}/close\` | Seal session. |
| GET | \`/v1/skill\` | This markdown. Does not increment downloads. |
| GET | \`/v1/runtime.json\` | Machine manifest. Authority with health: version=1.4.0, role=engine-runtime, all catalog slugs are true engines. |
| GET | \`/v1/runtime\` | Alias of \`/v1/runtime.json\` (same machine manifest). |
| GET | \`/v1/bundle\` | Compact bootstrap of every product. |
| GET | \`/v1/pull?all=1\` | Alias of \`/v1/bundle\`. |
| GET | \`/v1/pull/{slug}\` | Pull record for one product. |
| GET | \`/v1/pull/{slug}/skill\` | Product skill markdown. |
| GET | \`/v1/catalog.json\` | Full catalog (discover). |
| GET/POST | \`/p/{slug}/{op}\` | **Proxy only** — not exec. Service binding preferred. |
| GET | \`/openapi.json\` | Combined OpenAPI 3.1. |
| POST | \`/mcp\` | JSON-RPC MCP-over-HTTP. |
| GET | \`/cite.json\` | How to cite. Aziel Eliab only. No invented DOIs. |
| GET | \`/llms.txt\` | Plain-text catalog + session for crawlers. |
| GET | \`/v1/health\` | Liveness. |

Library front door: https://www.azielcorpuslibrary.net/runtime  
Library engine manifest (same as this Worker): https://www.azielcorpuslibrary.net/runtime/v1/runtime.json  
**Not** the engine manifest: https://www.azielcorpuslibrary.net/v1/runtime is Digital Library package discovery (aziel-corpus), not aziel-runtime.

## Example (Mozilla/5.0)

\`\`\`bash
curl -s -A 'Mozilla/5.0' ${base}/v1/skill
curl -s -A 'Mozilla/5.0' ${base}/v1/runtime.json
SID=$(curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/open -H 'content-type: application/json' -d '{}' | jq -r .session.id)
curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/$SID/policy \\
  -H 'content-type: application/json' \\
  -d '{"allow_slugs":["azclce"],"max_payload_bytes":8192}'
curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/$SID/exec \\
  -H 'content-type: application/json' \\
  -d '{"slug":"azclce","op":"score","payload":{"r":"login button blue","d":"login form submits","p":"login button submits"}}'
curl -s -A 'Mozilla/5.0' ${base}/v1/session/$SID/receipt
curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/$SID/close
\`\`\`

Proxy (not exec — no runtime-owned receipt):

\`\`\`bash
curl -s -A 'Mozilla/5.0' -X POST ${base}/p/azclce/score \\
  -H 'content-type: application/json' \\
  -d '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
\`\`\`

## Honesty

Every catalog Software slug is a true engine (\`true_engine_runtime: true\`). \`engine_slugs\` equals \`true_engine_slugs\`: ${local}. Some ops remain per-op \`proxy_fallback\` when they need product-Worker bindings (AZ-OS session/exec/lattice; Aziel Digital Library live D1 / Whisper / OCR). Cloudflare isolate is the jail; \`engine_digest\` is still required for local exec.

GodLock and MirageGrid are not VPNs. ForgeReceipts is not legal advice. ZionPattern Solver caps confidence at 75% and does not solve cases. VeilLock does not inject into FaceTime. AZ-CLCE detects inconsistency, not intent. ChronoLock is advisory only. The ARK is not a kernel. AZAI hosted /v1 is a protocol mirror + Lamb check, not a paid-key proxy and **not** the local blend. Jeeves is not sovereign. SpectralLock hosted overlay is a 256px preview. EmployeeLock is not a court. FoldLock is not zip. WhistleLock is not a mailer. TrajectoryLock is not a certified forensic instrument. M.I.A.Lock Doe hits are leads, not IDs. Aziel Digital Library is not a 26-card index. AzielTether is not a VPN.

## Cite

Eliab, Aziel. (${new Date().getUTCFullYear()}). Aziel Eliab Runtime ${RUNTIME_VERSION} [Software]. Apache-2.0. ${base}/

Machine-readable: ${base}/cite.json
GitHub: https://github.com/AzielEliab/aziel-runtime
`;
}

export function runtimeManifest(origin, products) {
  const base = origin.replace(/\/$/, "");
  const slugs = products.map((p) => p.slug);
  const honesty = honestyFields(slugs);
  return {
    ok: true,
    role: RUNTIME_ROLE,
    layer: RUNTIME_LAYER,
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
    products: slugs,
    host: base + "/",
    github: "https://github.com/AzielEliab/aziel-runtime",
    library_front_door: "https://www.azielcorpuslibrary.net/runtime",
    sigil: base + "/sigil.png",
    sigil_stamp: "Everblooming",
    user_agent: DEFAULT_UA,
    kv_increment: false,
    counted_tarball: false,
    ...honesty,
    local_blends: ["azai serve", "forgereceipts ui", "azos ui"],
    honest: {
      "1.1.0": "catalog + pull + proxy that called itself a runtime",
      "1.2.0": "session-runtime: open → policy → exec → receipt → close; exec still proxied",
      "1.3.0": "true engine runtime for listed slugs (in-process) + session + pull/proxy front doors",
      "1.4.0": "every catalog Software slug is a true in-process engine; binding-only ops stay per-op proxy_fallback",
    },
    endpoints: {
      session_open: base + "/v1/session/open",
      session_policy: base + "/v1/session/{id}/policy",
      session_exec: base + "/v1/session/{id}/exec",
      session_receipt: base + "/v1/session/{id}/receipt",
      session_receipts: base + "/v1/session/{id}/receipts",
      session_close: base + "/v1/session/{id}/close",
      skill: base + "/v1/skill",
      runtime: base + "/v1/runtime.json",
      runtime_alias: base + "/v1/runtime",
      discover: base + "/v1/catalog.json",
      pull: base + "/v1/pull/{slug}",
      pull_skill: base + "/v1/pull/{slug}/skill",
      bundle: base + "/v1/bundle",
      pull_all: base + "/v1/pull?all=1",
      invoke: base + "/p/{slug}/{op}",
      invoke_note: "proxy only — not exec",
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
  const honesty = honestyFields(products.map((p) => p.slug));
  return {
    ok: true,
    role: RUNTIME_ROLE,
    layer: RUNTIME_LAYER,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    version: RUNTIME_VERSION,
    product_count: products.length,
    skill: base + "/v1/skill",
    runtime: base + "/v1/runtime.json",
    session: base + "/v1/session/open",
    invoke: base + "/p/{slug}/{op}",
    invoke_note: "proxy only — not exec",
    cite: base + "/cite.json",
    user_agent: DEFAULT_UA,
    true_engine_slugs: honesty.true_engine_slugs,
    proxy_is_not_exec: true,
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
    "/v1/session/open": {
      post: {
        operationId: "runtime_session_open",
        summary: "Open a session (id, policy defaults, empty hash-chained receipt list).",
        tags: ["session"],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Session + genesis receipt" } },
      },
    },
    "/v1/session/{id}/policy": {
      post: {
        operationId: "runtime_session_policy",
        summary: "Attach allow rules (slugs, ops, payload cap). Identity remains Aziel Eliab.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Updated policy + receipt" }, "409": { description: "Session closed" } },
      },
    },
    "/v1/session/{id}/exec": {
      post: {
        operationId: "runtime_session_exec",
        summary: "Runtime-owned exec: local engine when vendored (engine_digest + ran_in), else explicit proxy_fallback. Not the same as proxy /p/{slug}/{op}.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slug", "op"],
                properties: {
                  slug: { type: "string" },
                  op: { type: "string" },
                  payload: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Exec receipt" },
          "403": { description: "Policy denied" },
          "409": { description: "Session closed" },
        },
      },
    },
    "/v1/session/{id}/receipt": {
      get: {
        operationId: "runtime_session_receipt",
        summary: "Last runtime-owned receipt. Hash chain is verifiable locally.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Last receipt + verified" } },
      },
    },
    "/v1/session/{id}/receipts": {
      get: {
        operationId: "runtime_session_receipts",
        summary: "Full hash-chained receipt list for a session.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Receipt chain + verified" } },
      },
    },
    "/v1/session/{id}/close": {
      post: {
        operationId: "runtime_session_close",
        summary: "Seal the session. Further exec is rejected.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Final receipt" }, "409": { description: "Already closed" } },
      },
    },
    "/v1/skill": {
      get: {
        operationId: "runtime_skill",
        summary: "Skill markdown: 1.4.0 in-process engines for every catalog slug plus session and catalog/pull/proxy. Honest about 1.1.0 / 1.2.0 / 1.3.0 / 1.4.0.",
        tags: ["runtime"],
        responses: { "200": { description: "text/markdown skill" } },
      },
    },
    "/v1/runtime.json": {
      get: {
        operationId: "runtime_manifest",
        summary: "Machine manifest. role=engine-runtime. Every catalog slug is a true engine; binding-only ops stay per-op proxy_fallback. Identity Aziel Eliab.",
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
