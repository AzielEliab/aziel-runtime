/**
 * Fleet SEO mirror of the Unseal Cos pattern (live tip 5b3c878e).
 * Pretty paths, one Aziel handles tab, and one footer on hub HTML.
 * Growth-ON Allow. Cap-7 is not ICANN. Paid satellite stays HELD.
 * decryption_complete stays false. Not LIVE until Dual CLEAR + Aziel merge OK + Cos.
 * No visible 15:20 identity-lock HTML. Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FURNACE_AZIEL,
  FURNACE_HOME,
  FURNACE_NAME,
  RUNTIME_WORKER_HOME,
  UNSEAL_AZIEL,
  UNSEAL_AZIEL_HTTP,
  UNSEAL_HOME,
  UNSEAL_LLMS,
  UNSEAL_NAME,
  UNSEAL_SITEMAP,
  officialAzielSitesHubFields,
} from "./official-sites.js";
import {
  AUTHOR_GITHUB,
  AUTHOR_ID,
  AUTHOR_NAME,
  AUTHOR_SITE_ORIGIN,
  ECOSYSTEM_HEADING,
  ECOSYSTEM_LINKS,
  GODLOCK_UK_ORIGIN,
  HEDIDNTJUMP_HOME,
  LIBRARY_ORIGIN,
  RUNTIME_GLAMA,
} from "./seo.js";
import { PERSON_GITHUB_SECONDARY, X_HANDLE, X_URL } from "./person-index.js";
import { TRADES_RUNTIME_MCP, TRADES_RUNTIME_ORIGIN } from "./sister-products.js";

export const AZIEL_HANDLES_PATH = "/aziel";
export const SOFTWARE_PRETTY_PATH = "/software";
export const DOORS_URL = `${AUTHOR_SITE_ORIGIN}/doors`;
export const OFFICIAL_RUNTIME = RUNTIME_WORKER_HOME;
export const UNSEAL_COS_TIP = "5b3c878e";
export const PATTERN_LIVE_GATE = "Dual CLEAR + Aziel merge OK + Cos";

/** Cap-7 is a design name. It is not an ICANN registration and not a public egress address. */
export const CAP7_PUBLIC =
  "Cap-7 is not an ICANN registration and is not a public egress address.";
/** Paid satellite stays held. This copy does not buy a domain, change DNS, or spend. */
export const PAID_SAT_PUBLIC = "Paid satellite stays HELD.";
/** Pattern stays unpublished as LIVE until those three gates clear. */
export const PATTERN_HOLD_PUBLIC = "Not LIVE until Dual CLEAR, Aziel merge OK, and Cos.";
/** Unseal lattice flag. This Worker does not claim the book is open. */
export const DECRYPTION_PUBLIC = "decryption_complete stays false.";
export const GROWTH_ON_ALLOW = "Growth-ON. Allow.";
export const HDJ_NOTE = "He Didn't Jump is a handle, not a Live Node.";
export const UNSEAL_NOTE =
  `${UNSEAL_NAME} is a handle, not a Live Node, and is not LIVE on this Worker until Dual CLEAR, Aziel merge OK, and Cos. Official doors ${UNSEAL_HOME} and ${UNSEAL_AZIEL}. The /aziel path on that host is HTTP ${UNSEAL_AZIEL_HTTP}. Cos tip ${UNSEAL_COS_TIP}.`;
export const FURNACE_NOTE =
  `${FURNACE_NAME} is an official Aziel site and a handle, not a Live Node. Doors ${FURNACE_HOME} and ${FURNACE_AZIEL}. Not LIVE on this Worker until Dual CLEAR, Aziel merge OK, and Cos.`;

/**
 * Same-origin human tabs. Each one is a path a crawler can fetch.
 * Hash fragments on / are not the crawl path.
 */
export const TAB_PATHS = Object.freeze([
  { href: "/", label: "Runtime" },
  { href: SOFTWARE_PRETTY_PATH, label: "Softwares" },
  { href: "/workspace", label: "Workspace" },
  { href: "/about", label: "About" },
  { href: AZIEL_HANDLES_PATH, label: "Aziel" },
  { href: "/platforms", label: "Platforms" },
  { href: "/survival", label: "Survival" },
  { href: "/shelves", label: "Shelves" },
  { href: "/doors", label: "Doors" },
  { href: "/aznews", label: "AZNews" },
  { href: "/agents", label: "Agents" },
  { href: "/operator", label: "Operator" },
]);

export const AZIEL_PAGE_TITLE = "Aziel handles — Aziel Runtime";
export const AZIEL_PAGE_DESCRIPTION =
  `Public handles for Aziel Eliab. Same doors as ${DOORS_URL}. ${HDJ_NOTE} ${CAP7_PUBLIC} ${PAID_SAT_PUBLIC} ${DECRYPTION_PUBLIC} ${PATTERN_HOLD_PUBLIC}`;

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseOf(origin) {
  return String(origin || "").replace(/\/$/, "");
}

/** Public doors, plus this Worker's handles tab. He Didn't Jump is not a Live Node. */
export function azielHandles(origin) {
  const base = baseOf(origin);
  const local = `${base || OFFICIAL_RUNTIME.replace(/\/$/, "")}${AZIEL_HANDLES_PATH}`;
  return [
    { label: "azieleliab.com", href: `${AUTHOR_SITE_ORIGIN}/` },
    { label: "GitHub", href: AUTHOR_GITHUB },
    { label: "Secondary source", href: PERSON_GITHUB_SECONDARY },
    { label: "Corpus", href: `${LIBRARY_ORIGIN}/` },
    { label: "Corpus · AzielEliab", href: `${LIBRARY_ORIGIN}/AzielEliab` },
    { label: "GodLock", href: `${GODLOCK_UK_ORIGIN}/` },
    { label: "He Didn't Jump", href: HEDIDNTJUMP_HOME },
    { label: "Runtime", href: `${AUTHOR_SITE_ORIGIN}/runtime` },
    { label: "Official Runtime", href: OFFICIAL_RUNTIME },
    { label: "Try on Glama", href: RUNTIME_GLAMA },
    { label: "Trades-Runtime", href: `${TRADES_RUNTIME_ORIGIN}/` },
    { label: "Trades-Runtime MCP", href: TRADES_RUNTIME_MCP },
    { label: `X ${X_HANDLE}`, href: X_URL },
    { label: FURNACE_NAME, href: FURNACE_HOME },
    { label: `${FURNACE_NAME} · Aziel`, href: FURNACE_AZIEL },
    { label: UNSEAL_NAME, href: UNSEAL_HOME },
    { label: `${UNSEAL_NAME} · Aziel`, href: UNSEAL_AZIEL },
    { label: "Aziel Runtime handles", href: local },
  ];
}

export function tabPathsAbsolute(origin) {
  const base = baseOf(origin);
  return TAB_PATHS.map((tab) => base + (tab.href === "/" ? "/" : tab.href));
}

export function unsealCite() {
  return {
    name: UNSEAL_NAME,
    origin: UNSEAL_HOME,
    home: UNSEAL_HOME,
    aziel: UNSEAL_AZIEL,
    aziel_http: UNSEAL_AZIEL_HTTP,
    sitemap: UNSEAL_SITEMAP,
    llms: UNSEAL_LLMS,
    cos_tip: UNSEAL_COS_TIP,
    live: false,
    live_node: false,
    official: true,
    software_tab: false,
    decryption_complete: false,
    paid_satellite: "HELD",
    cap7_is_icann: false,
    resolves_to_hub: false,
    held_until: PATTERN_LIVE_GATE,
    note: UNSEAL_NOTE,
  };
}

export function fleetCiteFields(origin) {
  return {
    tab_paths: tabPathsAbsolute(origin),
    paths_not_hash_only: true,
    doors: DOORS_URL,
    aziel_handles: `${baseOf(origin)}${AZIEL_HANDLES_PATH}`,
    software_pretty_path: `${baseOf(origin)}${SOFTWARE_PRETTY_PATH}`,
    aziel_handle_list: azielHandles(origin).map((row) => ({ label: row.label, href: row.href })),
    aziel_handles_note: `Same public doors as ${DOORS_URL}. ${HDJ_NOTE}`,
    cap7_is_icann: false,
    cap7_note: CAP7_PUBLIC,
    paid_satellite: "HELD",
    decryption_complete: false,
    pattern_live: false,
    pattern_live_gate: PATTERN_LIVE_GATE,
    growth: "ON",
    crawl: "Allow",
    ...officialAzielSitesHubFields(),
    unseal: unsealCite(),
    furnace_site: {
      name: FURNACE_NAME,
      home: FURNACE_HOME,
      aziel: FURNACE_AZIEL,
      live: false,
      live_node: false,
      official: true,
      software_tab: false,
      decryption_complete: false,
      note: FURNACE_NOTE,
    },
  };
}

export function fleetLlmsBlock(origin) {
  const paths = tabPathsAbsolute(origin).map((href) => `- ${href}`).join("\n");
  const handles = azielHandles(origin).map((row) => `- ${row.href}`).join("\n");
  return [
    "Growth-ON. Allow: /",
    "",
    "Paths (not hash-only):",
    "",
    paths,
    "",
    "Product cards are /p/{slug}. Hash fragments on / are not the crawl path.",
    `Softwares HTML is ${baseOf(origin)}${SOFTWARE_PRETTY_PATH}. Programs still use JSON at ${baseOf(origin)}/v1/software.`,
    `Aziel handles tab: ${baseOf(origin)}${AZIEL_HANDLES_PATH}`,
    "",
    `Handles, same public doors as ${DOORS_URL} :`,
    "",
    handles,
    "",
    "He Didn't Jump is a handle. It is not a Live Node.",
    FURNACE_NOTE,
    UNSEAL_NOTE,
    "Cap-7: not an ICANN name. Paid satellite stays HELD.",
    DECRYPTION_PUBLIC,
    PATTERN_HOLD_PUBLIC,
    `Person: ${AUTHOR_ID}`,
    "",
  ].join("\n");
}

export function fleetWhoIsBlock(origin) {
  const lines = [
    "## Aziel handles",
    "",
    `Unique paths, not hash-only. The Aziel tab is ${baseOf(origin)}${AZIEL_HANDLES_PATH}.`,
    ...azielHandles(origin).map((row) => `- ${row.label}: ${row.href}`),
    "",
    "He Didn't Jump is a handle. It is not a Live Node.",
    `${CAP7_PUBLIC} ${PAID_SAT_PUBLIC}`,
    FURNACE_NOTE,
    UNSEAL_NOTE,
    "decryption_complete: false.",
    "Growth-ON Allow.",
    "",
  ];
  return lines.join("\n");
}

export function azielHandlesText(origin) {
  return [
    "Handles",
    "",
    "Public identity on this page is Aziel Eliab.",
    "",
    ...azielHandles(origin).map((row) => `${row.label} ${row.href}`),
    "",
    HDJ_NOTE,
    CAP7_PUBLIC,
    PAID_SAT_PUBLIC,
    DECRYPTION_PUBLIC,
    PATTERN_HOLD_PUBLIC,
    "",
  ].join("\n");
}

export function azielHandlesJson(origin) {
  return {
    ok: true,
    product: "Aziel Runtime",
    author: AUTHOR_NAME,
    title: "Aziel handles",
    path: AZIEL_HANDLES_PATH,
    identity: AUTHOR_NAME,
    person_id: AUTHOR_ID,
    doors: DOORS_URL,
    handles: azielHandles(origin),
    he_didnt_jump_is_live_node: false,
    cap7_is_icann: false,
    cap7_note: CAP7_PUBLIC,
    paid_satellite: "HELD",
    decryption_complete: false,
    pattern_live: false,
    pattern_live_gate: PATTERN_LIVE_GATE,
    cos_tip: UNSEAL_COS_TIP,
    growth: "ON",
    crawl: "Allow",
    ...officialAzielSitesHubFields(),
    unseal: unsealCite(),
    furnace_site: {
      name: FURNACE_NAME,
      home: FURNACE_HOME,
      aziel: FURNACE_AZIEL,
      live: false,
      live_node: false,
      official: true,
      software_tab: false,
    },
    text: azielHandlesText(origin),
  };
}

/** Shared colophon. Ecosystem mark, crawl files, pretty paths. No 15:20 chrome. */
export function siteFooterHtml() {
  const eco = ECOSYSTEM_LINKS.map(
    (link) => `<li><a href="${esc(link.url)}">${esc(link.label)}</a></li>`,
  ).join("");
  const paths = TAB_PATHS.map((tab) => `<a href="${esc(tab.href)}">${esc(tab.href)}</a>`).join(" · ");
  return `<footer id="aziel-runtime-site-footer" style="margin:2rem 0 0;padding:1rem 0 0;border-top:1px solid #2a3140;color:#9aa3b2;font:14px/1.55 system-ui,sans-serif">
<nav class="ecosystem" aria-label="${esc(ECOSYSTEM_HEADING)}"><p>${esc(ECOSYSTEM_HEADING)}</p><ul style="margin:.4rem 0 0;padding-left:1.2rem">${eco}</ul></nav>
<p>${esc(AUTHOR_NAME)} · <a href="/cite.json">cite.json</a> · <a href="/llms.txt">llms.txt</a> · <a href="/ai.txt">ai.txt</a> · <a href="/sitemap.xml">sitemap</a> · <a href="${AZIEL_HANDLES_PATH}">Aziel</a> · Apache-2.0</p>
<p class="paths">Paths: ${paths}.</p>
<p>${esc(GROWTH_ON_ALLOW)}</p>
<p>${esc(HDJ_NOTE)} ${esc(CAP7_PUBLIC)} ${esc(PAID_SAT_PUBLIC)} ${esc(DECRYPTION_PUBLIC)} ${esc(FURNACE_NOTE)} ${esc(UNSEAL_NOTE)}</p>
</footer>`;
}

/** Stamp the shared footer onto a full HTML document. Skips a document that already has it. */
export function injectSiteFooter(html) {
  const body = String(html || "");
  if (body.includes('id="aziel-runtime-site-footer"')) return body;
  if (!/<html[\s>]/i.test(body) && !/<\/body>/i.test(body)) return body;
  const foot = siteFooterHtml();
  if (/<\/body>/i.test(body)) return body.replace(/<\/body>/i, `${foot}</body>`);
  return body + foot;
}

export function azielPageHtml(origin) {
  const base = baseOf(origin);
  const canonical = `${base}${AZIEL_HANDLES_PATH}`;
  const items = azielHandles(base)
    .map((row) => `    <li><a href="${esc(row.href)}">${esc(row.label)}</a></li>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(AZIEL_PAGE_TITLE)}</title>
<meta name="description" content="${esc(AZIEL_PAGE_DESCRIPTION)}">
<meta name="author" content="${esc(AUTHOR_NAME)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" type="text/plain" href="${esc(base)}/llms.txt" title="llms.txt">
<link rel="alternate" type="application/json" href="${esc(base)}/cite.json" title="cite.json">
</head>
<body>
<main>
  <p><a href="/">← Aziel Runtime</a> · <a href="${SOFTWARE_PRETTY_PATH}">Softwares</a> · <a href="/about">About</a></p>
  <h1>Aziel</h1>
  <h2>Handles</h2>
  <p>Public identity on this page is ${esc(AUTHOR_NAME)}. The handles below are the public doors listed on <a href="${esc(DOORS_URL)}">azieleliab.com</a>. Each site keeps its own receipt tip. ${esc(HDJ_NOTE)} ${esc(FURNACE_NOTE)} ${esc(UNSEAL_NOTE)}</p>
  <ul class="handles">
${items}
  </ul>
  <p>${esc(CAP7_PUBLIC)} ${esc(PAID_SAT_PUBLIC)} ${esc(DECRYPTION_PUBLIC)} ${esc(PATTERN_HOLD_PUBLIC)}</p>
</main>
</body>
</html>`;
}
