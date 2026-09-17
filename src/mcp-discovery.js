/**
 * Honest MCP discovery surfaces for registry validators (Sentinel, etc.).
 *
 * GET /.well-known/mcp/server-card.json — server card (not a Glama listing).
 * GET /.well-known/oauth-protected-resource — RFC 9728 public-resource metadata.
 * No OAuth IdP is invented. Auth stays none (public), matching GET /mcp.
 *
 * Author: Aziel Eliab only. Lamb Lens: Service → Clarity → Peace. NO-LIE / NO-REWRITE.
 */

import { PUBLIC_DOOR_TOOLS, PUBLIC_MCP_TOOLS, PUBLIC_MCP_POINTER } from "./fraggate/codes.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import {
  AUTHOR_NAME,
  PRODUCT_NAME,
  PRODUCT_SLUG,
  RUNTIME_ABSTRACT,
  RUNTIME_GITHUB,
  RUNTIME_GLAMA,
  RUNTIME_HUB_URL,
} from "./seo.js";
import { MCP_PROTOCOL_PREFERRED, MCP_PROTOCOL_SUPPORTED } from "./mcp-transport.js";

export const LIVE_MCP_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const LIVE_MCP_URL = `${LIVE_MCP_ORIGIN}/mcp`;
export const MCP_PROTOCOL_VERSION = MCP_PROTOCOL_PREFERRED;

export const MCP_SERVER_CARD_PATHS = Object.freeze([
  "/.well-known/mcp/server-card.json",
  "/mcp/.well-known/mcp/server-card.json",
]);

export const OAUTH_PROTECTED_RESOURCE_PATHS = Object.freeze([
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
  "/mcp/.well-known/oauth-protected-resource",
]);

function normalizeDiscoveryPath(pathname) {
  let p = String(pathname || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p;
}

export function mcpDiscoveryKind(pathname) {
  const path = normalizeDiscoveryPath(pathname);
  if (MCP_SERVER_CARD_PATHS.includes(path)) return "server-card";
  if (OAUTH_PROTECTED_RESOURCE_PATHS.includes(path)) return "oauth-protected-resource";
  return null;
}

export function mcpEndpointUrl(origin) {
  const base = String(origin || LIVE_MCP_ORIGIN).replace(/\/$/, "") || LIVE_MCP_ORIGIN;
  return `${base}/mcp`;
}

/**
 * Complete honest server card. Name matches initialize serverInfo.name.
 * Does not claim the experimental SEP-2127 $schema (that schema requires
 * reverse-DNS name/namespace). Do not invent a Glama UUID or OAuth server.
 */
export function mcpServerCard(origin) {
  const base = String(origin || LIVE_MCP_ORIGIN).replace(/\/$/, "") || LIVE_MCP_ORIGIN;
  const endpoint = `${base}/mcp`;
  return {
    name: PRODUCT_SLUG,
    title: PRODUCT_NAME,
    version: RUNTIME_VERSION,
    description:
      "NodeMesh'd MCP Softwares suite for digital forensics and auditing — not an API aggregator. FragGate door over streamable HTTP JSON-RPC.",
    abstract: RUNTIME_ABSTRACT,
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    homepage: RUNTIME_HUB_URL,
    support: RUNTIME_GITHUB,
    transport: "streamable-http",
    encoding: "JSON-RPC MCP-over-HTTP",
    endpoint: "POST /mcp",
    url: endpoint,
    protocolVersion: MCP_PROTOCOL_VERSION,
    remotes: [
      {
        type: "streamable-http",
        url: endpoint,
        supportedProtocolVersions: MCP_PROTOCOL_SUPPORTED.slice(),
      },
    ],
    auth: {
      type: "none",
      public: true,
      note: "auth: none (public). No OAuth authorization server. No bearer required.",
    },
    tools: {
      door: "fraggate",
      pipeline: PUBLIC_DOOR_TOOLS.slice(),
      summary:
        "Thin FragGate door matching public POST /mcp tools/list. Pipeline: runtime_skill / fraggate_list → fraggate_describe → fraggate_call. Flat {slug}_{op} names are not listed.",
      names: PUBLIC_MCP_TOOLS.slice(),
      count: PUBLIC_MCP_TOOLS.length,
      pointer: PUBLIC_MCP_POINTER,
    },
    links: {
      homepage: RUNTIME_HUB_URL,
      support: RUNTIME_GITHUB,
      openapi: `${base}/openapi.json`,
      llms: `${base}/llms.txt`,
      skill: `${base}/v1/skill`,
      software: `${base}/v1/software`,
      install: RUNTIME_GLAMA,
    },
  };
}

/**
 * RFC 9728 Protected Resource Metadata for a public MCP.
 * authorization_servers is empty — there is no IdP. Do not invent one.
 */
export function oauthProtectedResource(origin) {
  const resource = mcpEndpointUrl(origin);
  const base = String(origin || LIVE_MCP_ORIGIN).replace(/\/$/, "") || LIVE_MCP_ORIGIN;
  return {
    resource,
    authorization_servers: [],
    bearer_methods_supported: [],
    scopes_supported: [],
    resource_name: PRODUCT_SLUG,
    resource_documentation: resource,
    auth: "none (public)",
    note: "Public MCP. No authorization server. GET/POST /mcp require no bearer. Do not invent an OAuth IdP.",
    links: {
      openapi: `${base}/openapi.json`,
      llms: `${base}/llms.txt`,
      server_card: `${base}/.well-known/mcp/server-card.json`,
    },
  };
}
