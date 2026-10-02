/**
 * Paste-ready remote MCP configs. Auth stays none. No OAuth header is invented.
 * Author: Aziel Eliab only.
 */

import { MCP_PROTOCOL_HEADER, MCP_PROTOCOL_PREFERRED } from "./mcp-transport.js";

function mcpUrl(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return `${base}/mcp`;
}

function protocolHeaders() {
  return { [MCP_PROTOCOL_HEADER]: MCP_PROTOCOL_PREFERRED };
}

/** Cursor mcp.json remote server. Paste under the user's MCP config. */
export function cursorInstallSnippet(origin) {
  return {
    mcpServers: {
      "aziel-runtime": {
        url: mcpUrl(origin),
        headers: protocolHeaders(),
      },
    },
  };
}

/** Claude Desktop remote HTTP MCP. Preferred protocol 2025-11-25. */
export function claudeDesktopInstallSnippet(origin) {
  return {
    mcpServers: {
      "aziel-runtime": {
        type: "http",
        url: mcpUrl(origin),
        headers: protocolHeaders(),
      },
    },
  };
}
