/**
 * Additive human-discoverability text routes.
 *
 * NEW surfaces only: /help.txt, /addendum.txt, /help/softwares.txt,
 * /help/fraggate.txt, /help/glama.txt. Do not fold this copy into
 * /llms.txt, /ai.txt, or /cite.json.
 *
 * Designed-purpose copy. FragGate is THE single door. Softwares one_line
 * SoT is software-copy.js. Placement honesty stays off Softwares purpose. Person @id locked.
 * Identity: Aziel Eliab only.
 */

import { SOFTWARE_COPY, softwareCopySlugs } from "./software-copy.js";
import { softwareBucket } from "./software-catalog.js";
import { SOFTWARE_FAQ_NAMES } from "./softwares-faq.js";
import {
  AUTHOR_ID,
  AUTHOR_NAME,
  PRODUCT_NAME,
  GLAMA_DISCOVERY_LEAD,
  GLAMA_EXAMPLE_FIRST_CALL,
  GLAMA_HOW_TO_USE,
  RUNTIME_ABSTRACT,
  RUNTIME_GLAMA,
  RUNTIME_GLAMA_AT,
  RUNTIME_GITHUB,
} from "./seo.js";

export const HELP_SPEC = "AZRT-HELP-TXT-1.0";

export const HELP_PATHS = Object.freeze([
  "/help.txt",
  "/addendum.txt",
  "/help/softwares.txt",
  "/help/fraggate.txt",
  "/help/glama.txt",
]);

const BUCKET_RANK = Object.freeze({ plain: 0, gate: 1, lock: 2 });

function baseOf(origin) {
  return String(origin || "").replace(/\/$/, "") || "https://aziel-runtime.vibelock.workers.dev";
}

function sortedSoftwareRows() {
  return softwareCopySlugs()
    .map((slug) => {
      const name = SOFTWARE_FAQ_NAMES[slug] || slug;
      return {
        slug,
        name,
        bucket: softwareBucket(name, slug),
        one_line: SOFTWARE_COPY[slug].one_line,
      };
    })
    .sort((a, b) => {
      const ra = BUCKET_RANK[a.bucket] ?? 9;
      const rb = BUCKET_RANK[b.bucket] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
}

function identityLines() {
  return [
    `Product: ${PRODUCT_NAME}`,
    `Author: ${AUTHOR_NAME} only`,
    `Person @id: ${AUTHOR_ID}`,
    `Spec: ${HELP_SPEC}`,
  ];
}

export function helpTxt(origin) {
  const base = baseOf(origin);
  return [
    `# ${PRODUCT_NAME} help`,
    "",
    ...identityLines(),
    "",
    RUNTIME_ABSTRACT,
    "",
    "## FragGate — THE single public door",
    "",
    "FragGate is THE single public door.",
    "Use one door for every catalog engine:",
    "",
    "1. fraggate_list — see hashed products and ops",
    "2. fraggate_describe — read one product card",
    "3. fraggate_call — run one op",
    "",
    `Prefer POST ${base}/mcp (JSON-RPC tools/list → tools/call) or POST ${base}/v1/fraggate/call.`,
    `HTTP: GET ${base}/v1/fraggate/list · GET ${base}/v1/fraggate/describe?slug={slug}.`,
    "",
    "## Softwares catalog — one_line SSoT",
    "",
    `GET ${base}/v1/software is the Softwares catalog hubs refresh from.`,
    "one_line = designed action. description = Use X to … It exists so …",
    "Sort: Plain A–Z → Gate A–Z → Lock A–Z.",
    `Full catalog one_lines: ${base}/help/softwares.txt`,
    "",
    "## Dual surface",
    "",
    "Agents: OpenAPI + MCP through FragGate (list → describe → call).",
    "Humans: Worker UI + counted /download.",
    `OpenAPI: ${base}/openapi.json`,
    `Human workspace: ${base}/workspace`,
    `Download: ${base}/download`,
    "",
    "## Glama + MCP clients",
    "",
    `Install / Try on Glama: ${RUNTIME_GLAMA}`,
    `Remote MCP: POST ${base}/mcp`,
    "Compatible clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.",
    `Glama addendum: ${base}/help/glama.txt`,
    `FragGate addendum: ${base}/help/fraggate.txt`,
    "",
    "## Honesty",
    "",
    "Cite visits, letters, DOIs, and live doors from published bytes.",
    "engine_digest is required on true engines. Growth-ON crawlers Allow.",
    `Machine cite: ${base}/cite.json · ${base}/llms.txt · ${base}/ai.txt`,
    `Longer addendum: ${base}/addendum.txt`,
    `GitHub: ${RUNTIME_GITHUB}`,
    "",
  ].join("\n");
}

export function addendumTxt(origin) {
  const base = baseOf(origin);
  return [
    `# ${PRODUCT_NAME} addendum`,
    "",
    ...identityLines(),
    "",
    "This file is a human-readable addendum. /llms.txt and /cite.json stay the machine crawler pack.",
    "",
    "## What Aziel Runtime is",
    "",
    RUNTIME_ABSTRACT,
    "",
    "FragGate is THE single public executable door (list → describe → call).",
    "Softwares are catalog products with true in-process engines where live.",
    "QNM read-only suite-presence is ON by default. GET /v1/mesh never enables radios beyond that.",
    "",
    "## How agents start",
    "",
    `1. Install MCP at ${base}/mcp or import OpenAPI at ${base}/openapi.json.`,
    "2. Call fraggate_list (or GET /v1/fraggate/list).",
    "3. Call fraggate_describe for one slug.",
    "4. Call fraggate_call with { slug, op, payload }.",
    "5. Show display.title and display.summary, then take the next input.",
    "",
    "## How humans start",
    "",
    `Open ${base}/ or ${base}/workspace. Use the FragGate console and counted /download.`,
    `Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) refresh Softwares tabs from GET ${base}/v1/software.`,
    "",
    "## Softwares one_line law",
    "",
    "one_line names the designed action. description is Use X to … It exists so …",
    "Source of truth: src/software-copy.js, served on GET /v1/software.",
    `Plain-text catalog: ${base}/help/softwares.txt`,
    "",
    "## Glama",
    "",
    `Install / Try on Glama: ${RUNTIME_GLAMA}`,
    `Remote MCP: POST ${base}/mcp`,
    "Local stdio is the last path (node cli/mcp-stdio.mjs). Same FragGate door as Cursor and Claude.",
    "",
    "## Cold shelves (LIVE / SLOT)",
    "",
    "Plane A LIVE: 5 published surfaces (4 CF hubs + GitHub) / 2 family radii / 1 independent live.",
    "Plane B SLOT: Codeberg + archive.org hash-verify PASS still SLOT; Framagit URL null; doi null.",
    "Plane C USB SLOT.",
    `Machine registry: GET ${base}/shelves`,
    "",
    "## Related machine files",
    "",
    `- ${base}/llms.txt`,
    `- ${base}/ai.txt`,
    `- ${base}/cite.json`,
    `- ${base}/person.jsonld`,
    `- ${base}/who-is`,
    `- ${base}/help.txt`,
    `- ${base}/help/fraggate.txt`,
    `- ${base}/help/glama.txt`,
    `- ${base}/help/softwares.txt`,
    "",
  ].join("\n");
}

export function helpSoftwaresTxt(origin) {
  const base = baseOf(origin);
  const rows = sortedSoftwareRows();
  const lines = [
    `# Softwares catalog — ${PRODUCT_NAME}`,
    "",
    ...identityLines(),
    "",
    `SSoT: GET ${base}/v1/software (one_line + description from src/software-copy.js).`,
    "Sort: Plain A–Z → Gate A–Z → Lock A–Z.",
    "Hubs refresh Softwares tabs from that JSON route.",
    "",
  ];
  let lastBucket = "";
  for (const row of rows) {
    if (row.bucket !== lastBucket) {
      lastBucket = row.bucket;
      const label = row.bucket === "plain" ? "Plain" : row.bucket === "gate" ? "Gate" : "Lock";
      lines.push(`## ${label}`, "");
    }
    lines.push(`- ${row.name} (${row.slug}) — ${row.one_line}`);
  }
  lines.push("", `Door: FragGate list → describe → call. See ${base}/help/fraggate.txt.`, "");
  return lines.join("\n");
}

export function helpFraggateTxt(origin) {
  const base = baseOf(origin);
  return [
    `# FragGate — THE single public door`,
    "",
    ...identityLines(),
    "",
    "FragGate is the public executable door for Aziel Runtime Softwares.",
    "",
    "## Pipeline",
    "",
    "list → describe → call. That pipeline is the diagnostic door. Callers do not start there.",
    "Start here: tools just work. The door runs first, then the tool. confirm=true writes. dry_run=true previews and writes nothing. background=true returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36.",
    "",
    `- MCP tools: fraggate_list, fraggate_describe, fraggate_verify, fraggate_call`,
    `- HTTP list: GET ${base}/v1/fraggate/list`,
    `- HTTP describe: GET ${base}/v1/fraggate/describe?slug={slug}`,
    `- HTTP call: POST ${base}/v1/fraggate/call`,
    `- MCP surface: POST ${base}/mcp`,
    "",
    "## Call body",
    "",
    '{ "slug": "foldlock", "op": "pack-verify", "payload": {} }',
    "",
    "Read display.title and display.summary on the return, then take the next input.",
    "",
    "## Catalog vs door",
    "",
    `GET ${base}/v1/software is the Softwares-tab catalog (one_line SSoT).`,
    "FragGate list is the hashed live/stub registry for execution.",
    "Whitestone is a live Worker-only placement (web app + zip) with FragGate status none.",
    "",
    `Help index: ${base}/help.txt`,
    "",
  ].join("\n");
}

export function helpGlamaTxt(origin) {
  const base = baseOf(origin);
  return [
    `# Glama + MCP clients — ${PRODUCT_NAME}`,
    "",
    GLAMA_DISCOVERY_LEAD,
    "",
    "## How to use",
    "",
    ...GLAMA_HOW_TO_USE,
    "Worker remote: https://aziel-runtime.vibelock.workers.dev/mcp",
    GLAMA_EXAMPLE_FIRST_CALL,
    "MCP tools/list is 36 live tools. FragGate is the single door.",
    "",
    ...identityLines(),
    "",
    `Install / Try on Glama: ${RUNTIME_GLAMA}`,
    `Listing alias: ${RUNTIME_GLAMA_AT}`,
    `Remote MCP: POST ${base}/mcp`,
    `OpenAPI: ${base}/openapi.json`,
    "",
    "## Install",
    "",
    "1. One-click Install Server on Glama (Deploy is live; Install Server ON; Auto-Release ON). Glama release 2.0.7. Worker / server package stays 2.0.0-rc1.",
    `2. Remote MCP: POST ${base}/mcp`,
    "3. Local stdio last: node cli/mcp-stdio.mjs. Dockerfile CMD is [\"node\", \"cli/mcp-stdio.mjs\"] and bridges to this Worker /mcp.",
    "",
    "Cursor and Claude Desktop can use the remote POST above. ChatGPT GPT Actions, Grok, and Venice can import OpenAPI 3.1.",
    "",
    "## First call",
    "",
    "Call the tool you need. The door runs first. Diagnostics: fraggate_list → fraggate_describe → fraggate_call.",
    "Example: fraggate_call { slug: foldlock, op: fold-preview }, or decisiongate_check with dry_run=true.",
    "Show display.title and display.summary, then take the next input.",
    `Softwares cards (one_line) live at GET ${base}/v1/software.`,
    "",
    "MCP tools/list is 36 live tools. Start on the FragGate door. ChainLock and memory are append-only.",
    "",
    "Compatible clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.",
    "",
    `Help index: ${base}/help.txt`,
    "",
  ].join("\n");
}

export function helpTxtForPath(pathname, origin) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  if (path === "/help.txt" || path === "/help") return helpTxt(origin);
  if (path === "/addendum.txt" || path === "/addendum") return addendumTxt(origin);
  if (path === "/help/softwares.txt" || path === "/help/softwares") return helpSoftwaresTxt(origin);
  if (path === "/help/fraggate.txt" || path === "/help/fraggate") return helpFraggateTxt(origin);
  if (path === "/help/glama.txt" || path === "/help/glama") return helpGlamaTxt(origin);
  return null;
}

export function isHelpTxtPath(pathname) {
  return helpTxtForPath(pathname, "") != null;
}

export function helpSitemapEntries(origin) {
  const base = baseOf(origin);
  return HELP_PATHS.map((path) => ({
    loc: `${base}${path}`,
    priority: path === "/help.txt" ? "0.88" : "0.8",
    changefreq: "weekly",
  }));
}

export function helpOpenApiPaths() {
  return {
    "/help.txt": {
      get: {
        operationId: "help_txt",
        summary:
          "Human help text: FragGate door, Softwares catalog one_line SSoT, Glama, dual-surface. Additive — does not replace /llms.txt.",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain help" } },
      },
    },
    "/addendum.txt": {
      get: {
        operationId: "help_addendum_txt",
        summary: "Longer human addendum for FragGate, Softwares, Glama, dual-surface, LIVE/SLOT shelves.",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain addendum" } },
      },
    },
    "/help/softwares.txt": {
      get: {
        operationId: "help_softwares_txt",
        summary: "Plain-text Softwares catalog one_lines (SSoT from GET /v1/software).",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain Softwares one_lines" } },
      },
    },
    "/help/fraggate.txt": {
      get: {
        operationId: "help_fraggate_txt",
        summary: "Human help for FragGate list → describe → call.",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain FragGate help" } },
      },
    },
    "/help/glama.txt": {
      get: {
        operationId: "help_glama_txt",
        summary: "Human help for Glama Install Server and MCP/OpenAPI clients.",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain Glama help" } },
      },
    },
  };
}
