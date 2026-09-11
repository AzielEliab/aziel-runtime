/**
 * Compatible AI clients and crawler Allow-set copy.
 * Public identity: Aziel Eliab only.
 * Assistants / clients that can call OpenAPI, MCP, or HTTP tools.
 */

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
  "Aziel Runtime, aziel-runtime, Aziel Eliab, Aziel Elroi Eliab, node-meshed MCP Softwares, digital forensics, systems auditing, FragGate, not an API aggregator, Aziel Digital Library, ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere";

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

- **Glama** — [${GLAMA_TRY_LABEL}](${GLAMA_LISTING_URL}) — primary Install Server via glama.json + Dockerfile CMD \`["node", "cli/mcp-stdio.mjs"]\`
- **ChatGPT** — GPT Actions → Import from URL → \`${host}/openapi.json\`
- **Grok** — custom tool / OpenAPI / MCP remote → \`${host}/openapi.json\` or \`POST ${host}/mcp\`
- **Venice** — custom HTTP tools / OpenAPI → same OpenAPI URL
- **Claude Desktop** — MCP stdio \`node cli/mcp-stdio.mjs\` (see docs/GLAMA.md) or remote \`POST ${host}/mcp\`
- **Cursor (MCP)** — same stdio config or remote \`POST ${host}/mcp\`
- **Any installer / agent** — \`GET ${host}/v1/skill\` or \`GET ${host}/v1/software\`, then \`fraggate_list\` → \`fraggate_describe\` → \`fraggate_call\`. Session tools and \`runtime_run\` are advanced/internal. \`/p/{slug}/{op}\` is proxy only.

MCP is a **thin FragGate door**: pipeline \`fraggate_list\` → \`fraggate_describe\` → \`fraggate_call\`, plus \`runtime_skill\`, \`fraggate_verify\`, \`decisiongate_check\`, \`library_lookup\`, suite \`mesh_*\`, and catalog helpers \`runtime_software\` (\`GET /v1/software\`) / \`runtime_bundle\` / \`runtime_pull\`. Advanced/internal: \`runtime_run\`, \`runtime_manifest\`, \`runtime_session_*\`. Flat \`{slug}_{op}\` names are **not** listed. Prefer FragGate, \`GET /v1/software\`, and \`POST /mcp\`. Public, no OAuth.
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
  <ul>
    <li><strong>${tryOnGlamaAnchorHtml()}</strong> — primary Install Server; Dockerfile CMD <code>["node", "cli/mcp-stdio.mjs"]</code></li>
    <li><strong>ChatGPT</strong> — GPT Actions → Import from URL → <code>${host}/openapi.json</code></li>
    <li><strong>Grok</strong> — custom tool / OpenAPI / MCP remote → <code>${host}/openapi.json</code> or <code>${host}/mcp</code></li>
    <li><strong>Venice</strong> — custom HTTP tools / OpenAPI → same OpenAPI URL</li>
    <li><strong>Claude Desktop</strong> — MCP stdio <code>node cli/mcp-stdio.mjs</code> or remote <code>POST ${host}/mcp</code></li>
    <li><strong>Cursor (MCP)</strong> — same stdio / remote MCP</li>
    <li><strong>Any installer / agent</strong> — start at <code>${host}/v1/skill</code> or <code>${host}/v1/software</code>. Pipeline <code>fraggate_list</code> → <code>fraggate_describe</code> → <code>fraggate_call</code>. Session tools and <code>runtime_run</code> are advanced/internal.</li>
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
