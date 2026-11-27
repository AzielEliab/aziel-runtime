/**
 * Public /connect page. Paste the MCP URL. No OAuth server is invented.
 * /.well-known/mcp is not an alias: that tree is JSON discovery
 * (/.well-known/mcp.json and /.well-known/mcp/server-card.json).
 * An HTML document there would be parsed as a server card.
 * Author: Aziel Eliab only. NO-LIE.
 */

import {
  claudeDesktopInstallSnippet,
  cursorDeeplink,
  cursorInstallSnippet,
  lmStudioInstallSnippet,
  vscodeInstallLink,
  vscodeInstallSnippet,
} from "./install-snippets.js";
import { AUTHOR_NAME } from "./seo.js";

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyBlock(id, label, value) {
  return `<div class="copy">
  <label for="${esc(id)}">${esc(label)}</label>
  <div class="row">
    <input id="${esc(id)}" readonly value="${esc(value)}">
    <button type="button" data-copy="${esc(id)}">Copy</button>
  </div>
</div>`;
}

function pre(obj) {
  return `<pre>${esc(JSON.stringify(obj, null, 2))}</pre>`;
}

export function connectPageHtml(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const mcp = `${base}/mcp`;
  const actions = `${base}/openapi/adopt-actions.json`;
  const cursor = cursorInstallSnippet(origin);
  const deeplink = cursorDeeplink(origin);
  const vscode = vscodeInstallSnippet(origin);
  const vscodeLink = vscodeInstallLink(origin);
  const lmstudio = lmStudioInstallSnippet(origin);
  const claude = claudeDesktopInstallSnippet(origin);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect Aziel Runtime</title>
<meta name="description" content="Paste the Aziel Runtime MCP URL into ChatGPT, Claude, Grok, Gemini, Cursor, VS Code, or LM Studio. No authentication. No OAuth server.">
<meta name="author" content="${esc(AUTHOR_NAME)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(base)}/connect">
<style>
  body { margin: 0; background: #0e1014; color: #e7e1d6; font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.2rem 3rem; }
  a { color: #e0b15a; }
  h1 { font-size: 1.7rem; margin: 0 0 .4rem; }
  h2 { font-size: 1.15rem; margin: 1.6rem 0 .4rem; }
  code, pre, input { font-family: ui-monospace, monospace; }
  pre, .note { background: #171b22; border: 1px solid #2a3140; border-radius: 8px; padding: .8rem 1rem; overflow: auto; }
  .note { margin: .8rem 0; }
  .copy { margin: .8rem 0 1rem; }
  .row { display: flex; gap: .5rem; }
  input { flex: 1; min-width: 0; background: #171b22; color: #e7e1d6; border: 1px solid #2a3140; border-radius: 8px; padding: .5rem .7rem; }
  button { background: #e0b15a; color: #1a1408; border: 0; border-radius: 8px; padding: .5rem .8rem; font-weight: 650; cursor: pointer; }
  ol { padding-left: 1.2rem; }
</style>
</head>
<body>
<main>
  <p><a href="${esc(base)}/">Aziel Runtime</a></p>
  <h1>Connect</h1>
  <p>Paste this URL. Pick <strong>No authentication</strong>. There is no OAuth server, and this page does not invent one.</p>
  ${copyBlock("mcp-url", "MCP URL (Streamable HTTP)", mcp)}
  ${copyBlock("actions-url", "Slim OpenAPI URL (GPT Actions, second option)", actions)}
  <div class="note">
    <p><code>confirm</code> is consent to run a call. It is not a login.</p>
    <p>Session tools (<code>runtime_session_*</code>) and lattice writes need an operator bearer header. ChatGPT custom MCP cannot attach that header, so those tools are not available from ChatGPT custom MCP.</p>
    <p>Read-only clients that only call tools with <code>readOnlyHint: true</code> can call <code>fraggate_preview</code>. It forces <code>dry_run</code> and does not execute. <code>fraggate_call</code> is unchanged.</p>
    <p>No client on this page has an end-to-end evidence file in the repo. <code>verified_count</code> stays 0 until that evidence exists. Cap-7 is not ICANN.</p>
  </div>

  <h2 id="chatgpt">ChatGPT</h2>
  <ol>
    <li>Open ChatGPT on the web.</li>
    <li>Plugins → Add custom MCP server.</li>
    <li>Paste the MCP URL.</li>
    <li>Authentication: <strong>No authentication</strong>.</li>
  </ol>
  <p>Second option: GPT Actions. Import <a href="${esc(actions)}"><code>/openapi/adopt-actions.json</code></a>. Same rule: no authentication. Steps also at <a href="${esc(base)}/install/chatgpt.md"><code>/install/chatgpt.md</code></a>.</p>

  <h2 id="claude">Claude</h2>
  <p>Claude.ai: Customize → Connectors → Add custom connector. Leave sign-in unset (<strong>No sign in</strong>). Paste the MCP URL.</p>
  <p>Claude Desktop uses this remote HTTP config (<a href="${esc(base)}/install/claude-desktop.json"><code>/install/claude-desktop.json</code></a>):</p>
  ${pre(claude)}

  <h2 id="grok">Grok</h2>
  <ol>
    <li>Open <a href="https://grok.com/connectors">grok.com/connectors</a>.</li>
    <li>Add a custom connector.</li>
    <li>Paste the MCP URL.</li>
    <li>Authentication: <strong>No authentication</strong>.</li>
  </ol>

  <h2 id="gemini">Gemini</h2>
  <p>Google AI Studio, Gemini Enterprise, and the Gemini CLI can add this remote MCP URL with no authentication. The consumer Gemini app has no custom MCP connector. Do not paste this URL there and expect a connector.</p>

  <h2 id="cursor">Cursor</h2>
  <p><a href="${esc(deeplink)}">Install in Cursor</a></p>
  <p>The link is <code>cursor://anysphere.cursor-deeplink/mcp/install?name=aziel-runtime&amp;config=&lt;base64 {url}&gt;</code>. Config is base64 of <code>{"url":"${esc(mcp)}"}</code>.</p>
  <p><code>.cursor/mcp.json</code> (<a href="${esc(base)}/install/cursor.json"><code>/install/cursor.json</code></a>):</p>
  ${pre(cursor)}

  <h2 id="vscode">VS Code</h2>
  <p><a href="${esc(vscodeLink)}">Install in VS Code</a></p>
  <p>The link is <code>vscode:mcp/install?</code> plus the URL-encoded JSON <code>{"name":"aziel-runtime","type":"http","url":"${esc(mcp)}"}</code>.</p>
  <p><code>.vscode/mcp.json</code> (<a href="${esc(base)}/install/vscode.json"><code>/install/vscode.json</code></a>). <code>type</code> is <code>http</code>:</p>
  ${pre(vscode)}

  <h2 id="lmstudio">LM Studio</h2>
  <p>Paste this into LM Studio <code>mcp.json</code> (<a href="${esc(base)}/install/lmstudio.json"><code>/install/lmstudio.json</code></a>). Remote <code>url</code>. No authentication header.</p>
  ${pre(lmstudio)}

  <p class="note">JSON discovery stays at <a href="${esc(base)}/.well-known/mcp.json"><code>/.well-known/mcp.json</code></a> and <a href="${esc(base)}/.well-known/mcp/server-card.json"><code>/.well-known/mcp/server-card.json</code></a>. This HTML page is not served at <code>/.well-known/mcp</code>. A page there would be read as a server card.</p>
</main>
<script>
document.querySelectorAll("button[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const input = document.getElementById(button.getAttribute("data-copy"));
    const value = input ? input.value : "";
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = "Copied";
    } catch {
      input.select();
      document.execCommand("copy");
      button.textContent = "Copied";
    }
    setTimeout(() => { button.textContent = "Copy"; }, 1200);
  });
});
</script>
</body>
</html>`;
}
