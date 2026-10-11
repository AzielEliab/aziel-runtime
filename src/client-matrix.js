/**
 * Machine install matrix for the full AI client set.
 * CLIENT-EVIDENCE-1.0: status is "verified" only when the repo holds real end-to-end
 * evidence (a recorded tools/call from that client against the live Worker); otherwise
 * "unverified". transport_status "SERVED" only says this Worker serves the transport.
 * slot[] names what is not live.
 * No plugin-store card, Apple private API, DOI, or OAuth IdP is invented.
 * Author: Aziel Eliab only.
 */

import { COMPATIBLE_AI_CLIENTS, COMPATIBLE_AI_CLIENTS_PLUS } from "./ai-clients.js";
import { MCP_PROTOCOL_PREFERRED } from "./mcp-transport.js";
import { AUTHOR_ID, PRODUCT_NAME, RUNTIME_GLAMA } from "./seo.js";

export const CLIENT_CLASS_IDS = Object.freeze([
  "chatgpt",
  "grok",
  "venice",
  "claude",
  "cursor",
  "glama",
  "perplexity",
  "copilot",
  "gemini",
  "mistral",
  "meta",
  "apple",
  "amazon-q",
  "duckassist",
  "you",
  "cohere",
  "other",
]);

const TRANSPORT = Object.freeze({
  chatgpt: "openapi",
  grok: "openapi",
  venice: "openapi",
  claude: "mcp",
  cursor: "mcp",
  glama: "mcp",
  perplexity: "crawl",
  copilot: "crawl",
  gemini: "openapi",
  mistral: "openapi",
  meta: "crawl",
  apple: "crawl",
  "amazon-q": "openapi",
  duckassist: "crawl",
  you: "crawl",
  cohere: "openapi",
  other: "mcp",
});

const SLOT = Object.freeze({
  chatgpt: ["ChatGPT plugin store", "/.well-known/ai-plugin.json"],
  copilot: ["ai-plugin store listing"],
  meta: ["vendor plugin card"],
  apple: ["Apple private API"],
});

if (CLIENT_CLASS_IDS.length !== COMPATIBLE_AI_CLIENTS.length + 1) {
  throw new Error("client class ids drifted from the compatible AI client list");
}

/** Real end-to-end evidence per client id (repo path). Empty today: none is recorded. */
export const CLIENT_EVIDENCE = Object.freeze({});
export const CLIENT_EVIDENCE_RULE =
  "verified only with a recorded end-to-end tools/call from that client against the live Worker, kept in the repo (evidence names the file). Mock tests, crawler fetches, and served transports are not evidence. Everything else is unverified.";

function snippetUrl(id, base) {
  switch (id) {
    case "cursor":
      return `${base}/install/cursor.json`;
    case "claude":
      return `${base}/install/claude-desktop.json`;
    case "glama":
      return RUNTIME_GLAMA;
    case "chatgpt":
    case "grok":
    case "venice":
    case "gemini":
    case "mistral":
    case "amazon-q":
    case "cohere":
      return `${base}/openapi/adopt-actions.json`;
    case "apple":
    case "duckassist":
      return `${base}/llms.txt`;
    default:
      return `${base}/adopt.json`;
  }
}

function alsoUrls(id, base) {
  if (id === "grok" || id === "mistral" || id === "amazon-q" || id === "cohere" || id === "other") {
    return [`${base}/mcp`, `${base}/openapi.json`];
  }
  if (TRANSPORT[id] === "openapi") return [`${base}/openapi.json`];
  if (id === "glama") return [`${base}/mcp`, `${base}/glama.json`];
  if (TRANSPORT[id] === "mcp") return [`${base}/mcp`];
  return [`${base}/llms.txt`];
}

export function clientMatrix(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const names = [...COMPATIBLE_AI_CLIENTS, COMPATIBLE_AI_CLIENTS_PLUS];
  const clients = CLIENT_CLASS_IDS.map((id, i) => {
    const slot = SLOT[id] ? SLOT[id].slice() : [];
    return {
      id,
      name: names[i],
      transport: TRANSPORT[id],
      status: CLIENT_EVIDENCE[id] ? "verified" : "unverified",
      evidence: CLIENT_EVIDENCE[id] || null,
      transport_status: "SERVED",
      snippet_url: snippetUrl(id, base),
      also: alsoUrls(id, base),
      slot,
    };
  });
  return {
    product: PRODUCT_NAME,
    author_id: AUTHOR_ID,
    door: "fraggate",
    auth: "none",
    protocol_preferred: MCP_PROTOCOL_PREFERRED,
    integrate:
      "Softwares {} → pick a slug → fraggate_call { slug, op, payload?, dry_run|confirm } → show display → keep the receipt hash. Library papers: library_lookup.",
    confirm_is_not_auth: true,
    evidence_rule: CLIENT_EVIDENCE_RULE,
    verified_count: clients.filter((c) => c.status === "verified").length,
    clients,
  };
}
