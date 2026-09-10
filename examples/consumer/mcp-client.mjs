#!/usr/bin/env node
/**
 * Independent MCP caller for Aziel Runtime.
 * Uses the public HTTP MCP door. FragGate only. Author: Aziel Eliab.
 */
const origin = (process.env.AZIEL_RUNTIME_ORIGIN || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");

async function mcp(method, params = {}, id = 1) {
  const res = await fetch(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return res.json();
}

const listed = await mcp("tools/call", { name: "fraggate_list", arguments: {} });
const allow = listed.result?.structuredContent?.result?.allowlist || {};
console.log("origin", origin);
console.log("slugs", Object.keys(allow).sort().join(","));

const described = await mcp("tools/call", { name: "fraggate_describe", arguments: { slug: "aziel-corpus" } });
console.log("describe", described.result?.structuredContent?.result?.slug || described);

const called = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "aziel-corpus", op: "search", payload: { q: "Florence" } },
});
const result = called.result?.structuredContent?.result || called;
console.log("search_count", result?.result?.count ?? result?.count ?? result);
