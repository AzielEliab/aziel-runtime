/**
 * Compatible AI clients and crawler Allow-set copy.
 * Public identity: Aziel Eliab only.
 * Assistants / clients that can call OpenAPI, MCP, or HTTP tools.
 */

import { GLAMA_INSTALL_RELEASE } from "./seo.js";

export const COMPATIBLE_AI_CLIENTS = Object.freeze([
  "ChatGPT (GPT Actions / OpenAI)",
  "Grok (xAI)",
  "Venice",
  "Claude (Anthropic Desktop / custom tools)",
  "Cursor (MCP)",
  "Glama (Install Server / MCP)",
  "Perplexity",
  "Microsoft Copilot / Bing",
  "Google Gemini / Vertex AI",
  "Mistral",
  "Meta AI",
  "Apple Intelligence / Applebot surfaces",
  "Amazon Q / Amazonbot tooling",
  "DuckAssist / DuckDuckGo AI",
  "You.com",
  "Cohere",
]);

export const COMPATIBLE_AI_CLIENTS_PLUS = "plus other MCP/OpenAPI-capable assistants";

/** Verified AzielEliab/aziel-runtime listing. Never invent a Glama UUID. */
export const GLAMA_LISTING_URL = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const GLAMA_TRY_LABEL = "Try on Glama";

export function tryOnGlamaAnchorHtml(attrs = "") {
  return `<a href="${GLAMA_LISTING_URL}"${attrs}>${GLAMA_TRY_LABEL}</a>`;
}

/** Primary Softwares / client-options door. Worker origin self-link stays secondary. */
export function distributionDoorsHtml(origin) {
  const host = String(origin || "").replace(/\/$/, "");
  return `  <p class="doors">
    ${tryOnGlamaAnchorHtml(' class="cta"')}
    <a href="https://github.com/AzielEliab/aziel-runtime">GitHub</a>
    <a class="secondary" href="${host}/">${host}/</a>
  </p>`;
}

/** robots.txt Allow-set names for SEO / llms / cite / homepage crawl copy. */
export const CRAWLER_ALLOW_MENTION =
  "GPTBot/ChatGPT, Venice, Grok, Google-Extended, GoogleOther, Google-CloudVertexBot, Claude(+Search/User), anthropic-ai, Perplexity(+User), bingbot, Meta-External*, Applebot(+Extended), Amazonbot, DuckDuck/DuckAssist, MistralAI-User, YouBot, CCBot, cohere-ai, cohere-training-data-crawler, Diffbot, AI2Bot(+Dolma), Timpibot, Petalbot, Bytespider, Omgili(+bot), FirecrawlAgent, ImagesiftBot, FacebookBot, TikTokSpider, Baiduspider*, Yandex";

export const HOMEPAGE_KEYWORDS =
  "Aziel Runtime, aziel-runtime, Aziel Eliab, Aziel Elroi Eliab, node-meshed MCP Softwares, FragGate, receipts, mesh, Aziel Digital Library, ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere";

export function compatibleClientsProse() {
  return `${COMPATIBLE_AI_CLIENTS.join(", ")}, ${COMPATIBLE_AI_CLIENTS_PLUS}`;
}

export function compatibleClientsMarkdownList() {
  return COMPATIBLE_AI_CLIENTS.map((name) => `- ${name}`).join("\n") + `\n- ${COMPATIBLE_AI_CLIENTS_PLUS}`;
}

export function compatibleClientsHtmlItems() {
  return (
    COMPATIBLE_AI_CLIENTS.map((name) => {
      if (name.startsWith("Glama")) {
        return `    <li>${tryOnGlamaAnchorHtml()} — ${name}</li>`;
      }
      return `    <li>${name}</li>`;
    }).join("\n") + `\n    <li>${COMPATIBLE_AI_CLIENTS_PLUS}</li>`
  );
}

export function crawlerAllowSentence() {
  return `robots.txt Allow: / for ${CRAWLER_ALLOW_MENTION}.`;
}

export function openApiImportSentence() {
  return (
    "Import this file in any OpenAPI-, MCP-, or HTTP-tool-capable assistant: " +
    compatibleClientsProse() +
    "."
  );
}

export function tokenAuthSentence() {
  return (
    "Set in OpenAPI / MCP / HTTP Actions (ChatGPT, Grok, Venice, Claude, Cursor, Glama, and other listed clients) as Authorization: Bearer … " +
    "when REQUIRE_TOKEN=1 and RUNTIME_TOKEN is set — session mutate (open/policy/exec/close) and MCP session tools only. " +
    "Public FragGate call (POST /v1/fraggate/call, MCP fraggate_call) stays open. " +
    "Catalog, skill, OpenAPI, health, pull, tools/list, and proxy /p stay public. One operator token — not per-user accounts."
  );
}

export function skillCompatibleSection(base) {
  const host = String(base || "").replace(/\/$/, "");
  return `## Compatible AI clients

Assistants / clients that can call OpenAPI, MCP, or HTTP tools:

${compatibleClientsMarkdownList()}

Practical pull + call (do not invent steps for every crawler):

- **Glama** — [${GLAMA_TRY_LABEL}](${GLAMA_LISTING_URL}) — one-click Install Server first (Glama release ${GLAMA_INSTALL_RELEASE}; Worker package 2.0.0-rc1). Then remote \`POST ${host}/mcp\`. Local stdio \`node cli/mcp-stdio.mjs\` is last.
- **Connect** — paste \`${host}/mcp\` from \`${host}/connect\`. No authentication. No OAuth server. \`confirm\` is consent, not a login.
- **ChatGPT** — web, Plugins → Add custom MCP server → paste \`${host}/mcp\` → No authentication. GPT Actions is the second option: \`${host}/openapi/adopt-actions.json\`.
- **Grok** — grok.com/connectors → Custom → paste \`${host}/mcp\` → No authentication.
- **Venice** — custom HTTP tools / OpenAPI → \`${host}/openapi.json\`
- **Claude.ai** — Customize → Connectors → Add custom connector → No sign in → \`${host}/mcp\`. Claude Desktop: \`${host}/install/claude-desktop.json\`.
- **Gemini** — AI Studio, Gemini Enterprise, or the Gemini CLI. The consumer Gemini app has no custom MCP.
- **Cursor (MCP)** — deep link on \`${host}/connect\`, or \`.cursor/mcp.json\` from \`${host}/install/cursor.json\`.
- **VS Code** — \`vscode:mcp/install\` link on \`${host}/connect\`, or \`.vscode/mcp.json\` (\`type: http\`) from \`${host}/install/vscode.json\`.
- **LM Studio** — \`mcp.json\` from \`${host}/install/lmstudio.json\`.
- **Any installer / agent** — \`GET ${host}/v1/skill\` or \`GET ${host}/v1/software\`, then call Softwares (tools/list name Softwares), pick a slug, then \`fraggate_call\`. \`library_lookup\` searches library papers and cites. The door runs first. ChainLock, TemporalLock, and ForgeReceipts stamp when the call needs a ledger. Diagnostics: \`fraggate_list\` → \`fraggate_describe\` → \`fraggate_call\`. Session tools and \`runtime_run\` are advanced/internal. \`/p/{slug}/{op}\` is proxy only.
- **Download** — \`GET ${host}/v1/update/check?slug={slug}&version={installed}\` (\`slug\` required; bare \`GET /v1/update/check\` is not a check) then fetch \`download_url\` (counted Worker \`/download\`), or \`GET ${host}/v1/pull/{slug}\`. Mesh-resident **azcorpus** + **azlibrary** website designs download from catalog \`website_designs\` (open for all AI clients).
- **Upload / ingest / receipt** — \`fraggate_call\` (azbrowser \`airlock_ingest\`, peacelock \`upload_envelope\`, forgereceipts \`verify\`, miragegrid \`verify-receipt\` / \`bridge\` / \`shuffle\`). Same ops on OpenAPI as proxy paths. **azlibrary upload** is API token only — never embed the secret.
- **Cap-7 names** — \`GET ${host}/v1/mesh/az-generator\` or MirageGrid \`bridge\`. .az duplication + shift. Standard internet does not reach Cap-7. AZ domains resolve via hub HTTPS. \`resolves_to_hub: false\` on Cap-7. Three of seven are false sites.
- **Shelves** — \`GET ${host}/shelves\` cites COLD-MULTI-SHELF-1.0 matching corpus \`/shelves\` (Plane A 5/2/1; Plane B SLOT; Plane C USB SLOT; doi null).
- **Ban survival** — \`GET ${host}/survival\` cites BAN-SURVIVAL-1.0. Live multi-front and cold shelves back each other up. If \`/mcp\` or workers.dev is blocked: try the next LIVE custom-domain hub \`/runtime\`. If every live front is gone: shelf tip-hash. Live-node API is SLOT. SPORE-1.0 is the last-resort failsafe (pause / preserve / wait / physical-wipe-only) — not a replacement for cold shelves.

MCP \`tools/list\` is **37 live tools**. \`fraggate_preview\` is dry_run only (\`readOnlyHint: true\`) for read-only clients. \`fraggate_call\` is unchanged. Session and lattice tools that need an operator bearer are not available from ChatGPT custom MCP. First call: Softwares (pick a slug) → \`fraggate_call\` → \`library_lookup\` for library papers and cites. The door runs first. ChainLock, TemporalLock, and ForgeReceipts stamp when the call needs a ledger. Diagnostics: \`fraggate_list\` → \`fraggate_describe\` → \`fraggate_call\` (foldlock/fold-preview, or \`decisiongate_check\` with \`dry_run=true\`). ChainLock and memory are append-only. \`runtime_run\`, \`runtime_manifest\`, and \`runtime_session_*\` are advanced/internal. Public \`GET /v1/manifest\` is not a path; \`runtime_manifest\` returns \`GET /v1/runtime.json\`. Prefer Softwares (tools/list name Softwares), \`GET /v1/software\`, and \`POST /mcp\`. Public, no OAuth.
`;
}

export function homepageAddUrlHtml(origin) {
  const host = String(origin || "").replace(/\/$/, "");
  return `  <h2>Compatible AI clients</h2>
${distributionDoorsHtml(host)}
  <p>Assistants / clients that can call OpenAPI, MCP, or HTTP tools:</p>
  <ul>
${compatibleClientsHtmlItems()}
  </ul>
  <h2>Add this URL</h2>
  <p><a href="${host}/connect">Connect</a> — paste <code>${host}/mcp</code> (Streamable HTTP, no authentication). Slim OpenAPI for GPT Actions: <code>${host}/openapi/adopt-actions.json</code>.</p>
  <ul>
    <li><strong>${tryOnGlamaAnchorHtml()}</strong> — primary Install Server; Dockerfile CMD <code>["node", "cli/mcp-stdio.mjs"]</code></li>
    <li><strong>ChatGPT</strong> — web, Plugins → Add custom MCP server → paste <code>${host}/mcp</code> → No authentication. GPT Actions is second: <code>${host}/openapi/adopt-actions.json</code>.</li>
    <li><strong>Grok</strong> — grok.com/connectors → Custom → paste <code>${host}/mcp</code> → No authentication.</li>
    <li><strong>Venice</strong> — custom HTTP tools / OpenAPI → <code>${host}/openapi.json</code></li>
    <li><strong>Claude.ai</strong> — Customize → Connectors → Add custom connector → No sign in. Desktop: <code>${host}/install/claude-desktop.json</code>.</li>
    <li><strong>Gemini</strong> — AI Studio, Gemini Enterprise, or the Gemini CLI. The consumer Gemini app has no custom MCP.</li>
    <li><strong>Cursor (MCP)</strong> — deep link and <code>.cursor/mcp.json</code> on <a href="${host}/connect">/connect</a></li>
    <li><strong>VS Code</strong> — <code>vscode:mcp/install</code> link and <code>.vscode/mcp.json</code> with <code>type</code> <code>http</code></li>
    <li><strong>LM Studio</strong> — <code>mcp.json</code> from <code>${host}/install/lmstudio.json</code></li>
    <li><strong>Any installer / agent</strong> — start at <code>${host}/v1/skill</code> or <code>${host}/v1/software</code>. Pipeline <code>fraggate_list</code> → <code>fraggate_describe</code> → <code>fraggate_call</code>. Session tools and <code>runtime_run</code> are advanced/internal.</li>
    <li><strong>Download</strong> — <code>GET ${host}/v1/update/check?slug={slug}&amp;version={installed}</code> (<code>slug</code> required; bare <code>GET /v1/update/check</code> is not a check) then fetch <code>download_url</code>, or <code>GET ${host}/v1/pull/{slug}</code>. Mesh-resident <strong>azcorpus</strong> + <strong>azlibrary</strong> designs download from catalog <code>website_designs</code> (open).</li>
    <li><strong>Upload / ingest / receipt</strong> — <code>fraggate_call</code> (azbrowser <code>airlock_ingest</code>, peacelock <code>upload_envelope</code>, forgereceipts <code>verify</code>, miragegrid <code>verify-receipt</code> / <code>bridge</code> / <code>shuffle</code>). <strong>azlibrary upload</strong> is API token only — never embed the secret.</li>
    <li><strong>Cap-7 names</strong> — <code>GET ${host}/v1/mesh/az-generator</code> or MirageGrid <code>bridge</code>. .az duplication + shift. Standard internet does not reach Cap-7. AZ domains resolve via hub HTTPS. <code>resolves_to_hub: false</code> on Cap-7. Three of seven are false sites.</li>
    <li><strong>Shelves</strong> — <code>GET ${host}/shelves</code> cites COLD-MULTI-SHELF-1.0 matching corpus <code>/shelves</code> (Plane A 5/2/1; Plane B SLOT; Plane C USB SLOT; doi null).</li>
    <li><strong>Ban survival</strong> — <code>GET ${host}/survival</code> cites BAN-SURVIVAL-1.0. Live multi-front and cold shelves back each other up. If <code>/mcp</code> or workers.dev is blocked: try the next LIVE custom-domain hub <code>/runtime</code>. Live-node API is SLOT. SPORE-1.0 is the last-resort failsafe (pause / preserve / wait / physical-wipe-only) — not a replacement for cold shelves.</li>
  </ul>`;
}

export function citeCompatibleFields() {
  return {
    compatible_ai_clients: [...COMPATIBLE_AI_CLIENTS, COMPATIBLE_AI_CLIENTS_PLUS],
    crawler_allow: CRAWLER_ALLOW_MENTION,
  };
}

export function llmsCompatibleBlock() {
  return [
    "## Compatible AI clients",
    "",
    "Assistants / clients that can call OpenAPI, MCP, or HTTP tools:",
    "",
    ...COMPATIBLE_AI_CLIENTS.map((name) => `- ${name}`),
    `- ${COMPATIBLE_AI_CLIENTS_PLUS}`,
    "",
    "## Crawl Allow set",
    "",
    crawlerAllowSentence(),
    "Do not Disallow GPTBot or any listed bot. Do not ship Cloudflare content-signal blocks.",
    "",
  ].join("\n");
}
