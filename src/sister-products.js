/**
 * Cite-only sister products — not FragGate true-engines, not Softwares-tab cards.
 *
 * Trades-Runtime lives on its own Worker / MCP. aziel-runtime cites it honestly
 * and does not execute company ops through fraggate_call.
 *
 * Author / identity: Aziel Eliab only.
 */

export const AUTHOR_NAME = "Aziel Eliab";

export const TRADES_RUNTIME_SLUG = "trades-runtime";
export const TRADES_RUNTIME_NAME = "Trades-Runtime";
export const TRADES_RUNTIME_VERSION = "0.3.3";
export const TRADES_RUNTIME_GITHUB = "https://github.com/AzielEliab/trades-runtime";
export const TRADES_RUNTIME_ORIGIN = "https://trades-runtime.vibelock.workers.dev";
export const TRADES_RUNTIME_HOME = `${TRADES_RUNTIME_ORIGIN}/`;
export const TRADES_RUNTIME_MCP = `${TRADES_RUNTIME_ORIGIN}/mcp`;
export const TRADES_RUNTIME_DOWNLOAD = `${TRADES_RUNTIME_ORIGIN}/download`;
export const TRADES_RUNTIME_CITE = `${TRADES_RUNTIME_ORIGIN}/cite.json`;
export const TRADES_RUNTIME_LLMS = `${TRADES_RUNTIME_ORIGIN}/llms.txt`;
export const TRADES_RUNTIME_SKILL = `${TRADES_RUNTIME_ORIGIN}/v1/skill`;
export const TRADES_RUNTIME_OPENAPI = `${TRADES_RUNTIME_ORIGIN}/openapi.json`;
export const TRADES_RUNTIME_HEALTH = `${TRADES_RUNTIME_ORIGIN}/v1/health`;

export const TRADES_RUNTIME_ONE_LINE =
  "Shadow-first local BYO runtime for HVAC/plumbing/electrical/sewer/cross-trades. BYO ServiceTitan+ProBooks. Human authority. Not hosted company OS. live_backends false.";

export const SISTER_PRODUCTS_NOTE =
  "Sister products cited honestly. Not Softwares-tab engines. Not FragGate true-engines. Not MASTER-33 isolation software. aziel-runtime fraggate_call does not execute their company ops. Identity Aziel Eliab only.";

export const CATALOG_EXTRAS_SISTER_NOTE =
  "extras[] may also list cite-only sister products (trades-runtime) that are not kernel doors, not FragGate true-engines, not MASTER-33 isolation software, and not executed by fraggate_call.";

export function tradesRuntimeRecord() {
  return {
    slug: TRADES_RUNTIME_SLUG,
    name: TRADES_RUNTIME_NAME,
    version: TRADES_RUNTIME_VERSION,
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    github: TRADES_RUNTIME_GITHUB,
    worker: TRADES_RUNTIME_ORIGIN,
    worker_home: TRADES_RUNTIME_HOME,
    mcp: TRADES_RUNTIME_MCP,
    download: TRADES_RUNTIME_DOWNLOAD,
    cite: TRADES_RUNTIME_CITE,
    llms: TRADES_RUNTIME_LLMS,
    skill: TRADES_RUNTIME_SKILL,
    openapi: TRADES_RUNTIME_OPENAPI,
    health: TRADES_RUNTIME_HEALTH,
    one_line: TRADES_RUNTIME_ONE_LINE,
    live_backends: false,
    hosted_company_os: false,
    software_tab: false,
    fraggate_engine: false,
    true_engine_runtime: false,
    engine: false,
    isolation_software: false,
    nested_softwares_exec: false,
    fraggate_call: false,
    how_to_cite: `Eliab, Aziel. (2026). ${TRADES_RUNTIME_NAME} ${TRADES_RUNTIME_VERSION} [Software]. Apache-2.0. ${TRADES_RUNTIME_GITHUB}`,
    note: SISTER_PRODUCTS_NOTE,
  };
}

/** Lightweight catalog extra — cite-only, never a PRODUCTS true-engine slug. */
export function tradesRuntimeCiteCard() {
  return {
    ...tradesRuntimeRecord(),
    kind: "cite_only",
    spec: TRADES_RUNTIME_VERSION,
    door: "none",
    catalog_card: false,
  };
}

export function sisterProductCrawl() {
  return [tradesRuntimeRecord()];
}

export function sisterProductCiteField() {
  return {
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    software_tab: false,
    fraggate_engine: false,
    isolation_software: false,
    fraggate_call: false,
    nested_softwares_exec: false,
    note: SISTER_PRODUCTS_NOTE,
    products: sisterProductCrawl(),
  };
}

export function sisterProductHubFields() {
  return {
    trades_runtime: TRADES_RUNTIME_HOME,
    trades_runtime_name: TRADES_RUNTIME_NAME,
    trades_runtime_version: TRADES_RUNTIME_VERSION,
    trades_runtime_github: TRADES_RUNTIME_GITHUB,
    trades_runtime_mcp: TRADES_RUNTIME_MCP,
    trades_runtime_download: TRADES_RUNTIME_DOWNLOAD,
    trades_runtime_cite: TRADES_RUNTIME_CITE,
    trades_runtime_llms: TRADES_RUNTIME_LLMS,
    trades_runtime_software_tab: false,
    trades_runtime_fraggate_engine: false,
    trades_runtime_fraggate_call: false,
    trades_runtime_live_backends: false,
    sister_products: sisterProductCiteField(),
  };
}

export function llmsSisterProductsBlock() {
  const lines = [
    "## Sister products",
    "",
    SISTER_PRODUCTS_NOTE,
    "",
  ];
  for (const p of sisterProductCrawl()) {
    lines.push(`### ${p.name} (${p.slug})`);
    lines.push(p.one_line);
    lines.push(`Version: ${p.version}`);
    lines.push(`GitHub: ${p.github}`);
    lines.push(`Worker: ${p.worker}`);
    lines.push(`MCP: ${p.mcp}`);
    lines.push(`Download: ${p.download}`);
    lines.push(`cite.json: ${p.cite}`);
    lines.push(`llms.txt: ${p.llms}`);
    lines.push(`live_backends: ${p.live_backends}`);
    lines.push("fraggate_call: false (aziel-runtime does not execute company ops)");
    lines.push("");
  }
  return lines.join("\n");
}
