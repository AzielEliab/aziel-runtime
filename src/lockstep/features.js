/**
 * AZ-LOCKSTEP-1.0 feature union. One row per feature any leg has. For each leg:
 *   native  - the leg serves it itself
 *   proxied - the leg serves it over its AZIEL_RUNTIME service binding; runtime absent -> 503 fail-closed
 *   source  - the leg is where the data starts (the others copy or proxy it)
 *   refused - the route answers with a coded ok:false refusal because the feature cannot really work on this
 *             leg yet (never a mock)
 *   gap     - not wired on this leg yet (listed so it cannot be forgotten; never painted as present)
 * Each leg's own test checks every non-gap route answers (not 404) with the runtime binding absent.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
const f = (id, label, legs) => Object.freeze({ id, label, legs: Object.freeze(legs) });
const r = (status, route, method = "GET") => Object.freeze(method === "GET" ? { status, route } : { status, route, method });

export const LEGS = Object.freeze(["aziel-runtime", "azinterface", "azos"]);

export const FEATURE_UNION = Object.freeze([
  f("health", "Health and build stamp", { "aziel-runtime": r("native", "/v1/health"), azinterface: r("native", "/v1/health"), azos: r("native", "/v1/health") }),
  f("version", "Version + auto-update adoption field (AUTO-UPDATE-1.0, live:false)", { "aziel-runtime": r("source", "/v1/version"), azinterface: r("gap", "/v1/version"), azos: r("gap", "/v1/version") }),
  f("skill", "Skill card", { "aziel-runtime": r("native", "/v1/skill"), azinterface: r("native", "/v1/skill"), azos: r("native", "/v1/skill") }),
  f("cite", "cite.json", { "aziel-runtime": r("native", "/cite.json"), azinterface: r("native", "/cite.json"), azos: r("native", "/cite.json") }),
  f("llms", "llms.txt / ai.txt / robots / sitemap", { "aziel-runtime": r("native", "/llms.txt"), azinterface: r("native", "/llms.txt"), azos: r("native", "/llms.txt") }),
  f("openapi", "OpenAPI document", { "aziel-runtime": r("native", "/openapi.json"), azinterface: r("native", "/openapi.json"), azos: r("native", "/openapi.json") }),
  f("lockstep", "Shared contract + design tokens", { "aziel-runtime": r("source", "/v1/lockstep"), azinterface: r("native", "/v1/lockstep"), azos: r("native", "/v1/lockstep") }),
  f("design", "Design tokens CSS", { "aziel-runtime": r("source", "/design/tokens.css"), azinterface: r("native", "/design/tokens.css"), azos: r("native", "/design/tokens.css") }),
  f("mesh", "Node mesh status", { "aziel-runtime": r("source", "/v1/mesh"), azinterface: r("proxied", "/v1/mesh"), azos: r("proxied", "/v1/mesh") }),
  f("runtime_sync", "Runtime sync (tips compared)", { "aziel-runtime": r("source", "/v1/receipts/tip"), azinterface: r("native", "/v1/runtime/sync"), azos: r("native", "/v1/runtime/sync") }),
  f("refusals", "Refusal receipts chain", { "aziel-runtime": r("source", "/v1/receipts/refusals"), azinterface: r("native", "/v1/refusals"), azos: r("native", "/v1/refusals") }),
  f("aznews_api", "AZNews feed", { "aziel-runtime": r("source", "/v1/aznews"), azinterface: r("native", "/v1/aznews"), azos: r("native", "/v1/aznews") }),
  f("aznews_page", "AZNews human page", { "aziel-runtime": r("native", "/aznews"), azinterface: r("native", "/aznews"), azos: r("native", "/aznews") }),
  f("newsmap", "4DMap / news map copy", { "aziel-runtime": r("source", "/v1/4dmap/pins"), azinterface: r("native", "/v1/newsmap"), azos: r("native", "/v1/newsmap") }),
  f("fraggate", "FragGate door (list/describe/software)", { "aziel-runtime": r("source", "/v1/fraggate"), azinterface: r("proxied", "/v1/fraggate"), azos: r("proxied", "/v1/fraggate") }),
  f("mcp", "MCP endpoint", { "aziel-runtime": r("source", "/mcp"), azinterface: r("native", "/mcp"), azos: r("proxied", "/mcp") }),
  f("azpipe", "AZPipe architecture", { "aziel-runtime": r("source", "/v1/azpipe/arch"), azinterface: r("native", "/v1/azpipe/arch"), azos: r("proxied", "/v1/azpipe/arch") }),
  f("runtime_card", "Runtime card", { "aziel-runtime": r("source", "/v1/runtime"), azinterface: r("proxied", "/v1/runtime"), azos: r("proxied", "/v1/runtime") }),
  f("tether", "Signed lattice-tip tether (receive + verify)", { "aziel-runtime": r("source", "/v1/tether"), azinterface: r("native", "/v1/tether"), azos: r("native", "/v1/tether") }),
  f("lattice", "Integrity lattice view", { "aziel-runtime": r("source", "/v1/receipts/tip"), azinterface: r("native", "/v1/lattice"), azos: r("native", "/v1/lattice") }),
  f("prefab", "Prefab hook records (installed:false)", { "aziel-runtime": r("source", "/v1/software"), azinterface: r("native", "/v1/prefab"), azos: r("native", "/v1/prefab") }),
  f("arc_session", "ARC session shell (session/exec/halt/close/invite/revoke/status)", { "aziel-runtime": r("native", "/v1/session/open", "POST"), azinterface: r("refused", "/v1/status"), azos: r("native", "/v1/status") }),
  f("download_tracker", "Download tracker (stats/count/go/install.sh)", { "aziel-runtime": r("native", "/v1/stats"), azinterface: r("native", "/stats"), azos: r("native", "/stats") }),
  f("sigil", "Sigil brand assets", { "aziel-runtime": r("native", "/sigil.png"), azinterface: r("native", "/sigil.svg"), azos: r("native", "/sigil.svg") }),
  f("hints", "First-run hints popup", { "aziel-runtime": r("native", "/workspace"), azinterface: r("native", "/"), azos: r("native", "/") }),
  f("workspace", "Human workspace / operator UI", { "aziel-runtime": r("native", "/workspace"), azinterface: r("proxied", "/workspace"), azos: r("proxied", "/workspace") }),
  f("anchor", "External anchor heads", { "aziel-runtime": r("source", "/v1/anchor/heads"), azinterface: r("proxied", "/v1/anchor/heads"), azos: r("proxied", "/v1/anchor/heads") }),
  f("software_catalog", "Softwares catalog", { "aziel-runtime": r("source", "/v1/software"), azinterface: r("proxied", "/v1/fraggate/software"), azos: r("proxied", "/v1/software") }),
  f("receipts", "Receipts lattice tip", { "aziel-runtime": r("source", "/v1/receipts/tip"), azinterface: r("proxied", "/v1/receipts/tip"), azos: r("proxied", "/v1/receipts/tip") }),
  f("memory", "Memory surface", { "aziel-runtime": r("source", "/v1/memory"), azinterface: r("proxied", "/v1/memory"), azos: r("proxied", "/v1/memory") }),
  f("qns", "QNS", { "aziel-runtime": r("source", "/v1/qns"), azinterface: r("proxied", "/v1/qns"), azos: r("proxied", "/v1/qns") }),
  f("uses", "Cited human uses", { "aziel-runtime": r("source", "/v1/uses"), azinterface: r("proxied", "/v1/uses"), azos: r("proxied", "/v1/uses") }),
  f("update", "Update manifest", { "aziel-runtime": r("source", "/v1/update/manifest"), azinterface: r("proxied", "/v1/update/manifest"), azos: r("proxied", "/v1/update/manifest") }),
  f("catalog_json", "Catalog JSON", { "aziel-runtime": r("source", "/v1/catalog.json"), azinterface: r("proxied", "/v1/catalog.json"), azos: r("proxied", "/v1/catalog.json") }),
  f("about", "About page", { "aziel-runtime": r("source", "/about"), azinterface: r("proxied", "/about"), azos: r("proxied", "/about") }),
  f("globe", "4DMap globe page", { "aziel-runtime": r("source", "/4dmap/globe"), azinterface: r("proxied", "/4dmap/globe"), azos: r("proxied", "/4dmap/globe") }),
  f("install_clients", "MCP client install cards", { "aziel-runtime": r("source", "/install/cursor.json"), azinterface: r("proxied", "/install/cursor.json"), azos: r("proxied", "/install/cursor.json") }),
]);

export function featureGaps() {
  const out = [];
  for (const row of FEATURE_UNION) {
    const missing = LEGS.filter((l) => row.legs[l].status === "gap");
    if (missing.length) out.push({ id: row.id, label: row.label, present_in: LEGS.filter((l) => row.legs[l].status !== "gap"), missing_in: missing });
  }
  return out;
}
