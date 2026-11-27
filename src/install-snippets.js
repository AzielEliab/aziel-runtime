/**
 * Paste-ready remote MCP configs. Auth stays none. No OAuth header is invented.
 * Author: Aziel Eliab only.
 */

import { LIVE_MCP_ORIGIN } from "./mcp-discovery.js";
import { MCP_PROTOCOL_HEADER, MCP_PROTOCOL_PREFERRED } from "./mcp-transport.js";

/**
 * Paste snippets may name only these origins. A request Host is not a paste URL.
 * Trailing-dot hosts, other hosts, and non-https origins fall back to the live MCP origin.
 */
export const PASTE_ORIGIN_ALLOWLIST = Object.freeze([LIVE_MCP_ORIGIN]);

export function pasteOrigin(origin) {
  let url;
  try {
    url = new URL(String(origin || ""));
  } catch {
    return LIVE_MCP_ORIGIN;
  }
  if (url.protocol !== "https:") return LIVE_MCP_ORIGIN;
  if (url.username || url.password || url.port) return LIVE_MCP_ORIGIN;
  const host = url.hostname;
  if (!host || host.endsWith(".") || host.startsWith(".") || host.includes("..")) return LIVE_MCP_ORIGIN;
  const normalized = `https://${host}`;
  if (!PASTE_ORIGIN_ALLOWLIST.includes(normalized)) return LIVE_MCP_ORIGIN;
  return normalized;
}

function mcpUrl(origin) {
  return `${pasteOrigin(origin)}/mcp`;
}

function actionsUrl(origin) {
  return `${pasteOrigin(origin)}/openapi/adopt-actions.json`;
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

function base64Utf8(text) {
  const bytes = new TextEncoder().encode(String(text));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Cursor one-click install. config is base64 of { url }. No auth field. */
export function cursorDeeplink(origin) {
  const config = base64Utf8(JSON.stringify({ url: mcpUrl(origin) }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=aziel-runtime&config=${encodeURIComponent(config)}`;
}

/** VS Code .vscode/mcp.json. type http. No auth header. */
export function vscodeInstallSnippet(origin) {
  return {
    servers: {
      "aziel-runtime": {
        type: "http",
        url: mcpUrl(origin),
      },
    },
  };
}

/** vscode:mcp/install?<urlencoded json> */
export function vscodeInstallLink(origin) {
  const payload = { name: "aziel-runtime", type: "http", url: mcpUrl(origin) };
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify(payload))}`;
}

/** LM Studio mcp.json. Remote url. No auth header. */
export function lmStudioInstallSnippet(origin) {
  return {
    mcpServers: {
      "aziel-runtime": {
        url: mcpUrl(origin),
      },
    },
  };
}

/** ChatGPT steps. Custom MCP first. GPT Actions second. No OAuth. */
export function chatgptInstallMarkdown(origin) {
  const base = pasteOrigin(origin);
  const mcp = mcpUrl(origin);
  return `# ChatGPT

Paste this MCP URL. Pick **No authentication**. There is no OAuth server.

\`\`\`text
${mcp}
\`\`\`

## Custom MCP (web)

1. Open ChatGPT on the web.
2. Plugins → Add custom MCP server.
3. Paste \`${mcp}\`.
4. Authentication: **No authentication**.

\`confirm\` is consent to run a call. It is not a login.

Session tools (\`runtime_session_*\`) and lattice writes need an operator bearer header. ChatGPT custom MCP cannot attach that header, so those tools are not available from ChatGPT custom MCP.

Read-only clients that only call tools with \`readOnlyHint: true\` can call \`fraggate_preview\`. It forces \`dry_run\` and does not execute. \`fraggate_call\` is unchanged.

## GPT Actions (second option)

Import \`${base}/openapi/adopt-actions.json\`.

No authentication. This is not the custom MCP path.
`;
}
