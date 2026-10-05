/**
 * Sentences for pages a person opens in a browser.
 * Machine doors stay JSON. A refusal and a not-live flag stay visible in the sentence.
 * Author: Aziel Eliab only.
 */

import { d2dCarrierCite } from "./d2d-carriers.js";

const HUMAN_CITE = Object.freeze({
  "/platforms": "platforms",
  "/survival": "survival",
  "/doors": "survival",
  "/failover": "survival",
  "/shelves": "shelves",
  "/cold-copy": "shelves",
});

function normPath(pathname) {
  return String(pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
}

/** Browser cite pages. /v1 aliases stay JSON. */
export function humanCiteKind(pathname) {
  const path = normPath(pathname);
  if (path.startsWith("/v1/")) return "";
  return HUMAN_CITE[path] || "";
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function flagLine(name, value, whenFalse, whenTrue) {
  if (value === true) return whenTrue;
  if (value === false) return whenFalse;
  return `${name} was not reported.`;
}

/** Honesty lines read from the live carrier cite. */
export function carrierSentences() {
  const d = d2dCarrierCite();
  const lines = [
    flagLine(
      "alt_internet_live",
      d.alt_internet_live,
      "An alternative internet is not live (alt_internet_live is false).",
      "An alternative internet is marked live (alt_internet_live is true).",
    ),
    flagLine(
      "packet_path_live",
      d.packet_path_live,
      "A packet path is not live (packet_path_live is false).",
      "A packet path is marked live (packet_path_live is true).",
    ),
    flagLine(
      "field_1_0",
      d.field_1_0,
      "Field 1.0 is not live (field_1_0 is false).",
      "Field 1.0 is marked live (field_1_0 is true).",
    ),
    flagLine(
      "second_device",
      d.second_device,
      "There is no second device (second_device is false).",
      "A second device is marked present (second_device is true).",
    ),
    `The phone page is ${d.mobile_client} (mobile_client). mobile_demonstrated is ${d.mobile_demonstrated === true}. app_store_release is ${d.app_store_release === true}.`,
    `The public worker door stays ${d.worker_door}.`,
  ];
  if (typeof d.not_live_sentence === "string" && d.not_live_sentence) lines.push(d.not_live_sentence);
  return lines;
}

function refusalSentences(body) {
  if (!body || body.ok !== false) return [];
  const code = body.code ? String(body.code) : "refused";
  const message = typeof body.message === "string" && body.message.trim() ? ` ${body.message.trim()}` : "";
  return [`This address only answers a read. Code: ${code}.${message}`];
}

function platformSentences(body) {
  const rows = Array.isArray(body && body.platforms) ? body.platforms : [];
  const names = rows.map((row) => (row && row.label ? String(row.label) : "")).filter(Boolean);
  const where = names.length ? names.join(", ") : "Windows, Mac, Linux, Android, and iPhone";
  const lines = [
    `You can open this in a browser on ${where}.`,
    body && body.all_live === true
      ? "That browser path is live."
      : body && body.all_live === false
        ? "That browser path is not live."
        : "Whether that browser path is live was not reported.",
    flagLine(
      "native_app_store",
      body && body.native_app_store,
      "There is no app-store release (native_app_store is false). A home-screen icon is the same browser page. This is not a one-click native install.",
      "An app-store release is marked live (native_app_store is true).",
    ),
    "This page does not start an Android, iPhone, or desktop app.",
    "This is not a live mesh node.",
  ];
  return lines.concat(carrierSentences());
}

function survivalSentences(body) {
  const src = body && typeof body === "object" ? body : {};
  const mode = src.mode ? String(src.mode) : "unreported";
  const node = src.live_node_api && typeof src.live_node_api === "object" ? src.live_node_api : {};
  const cap = src.cap7_aznet && typeof src.cap7_aznet === "object" ? src.cap7_aznet : {};
  const cut = src.origin_cutover && typeof src.origin_cutover === "object" ? src.origin_cutover : {};
  const lines = [
    mode === "LIVE"
      ? "The named live doors are up (mode LIVE)."
      : mode === "DEGRADED"
        ? "A front is degraded (mode DEGRADED)."
        : `Mode is ${mode}.`,
    flagLine(
      "second_door",
      src.second_door,
      "There is no second door (second_door is false).",
      "A second door is marked present (second_door is true).",
    ),
    flagLine(
      "lie_to_survive",
      src.lie_to_survive,
      "The network is not allowed to lie to survive (lie_to_survive is false).",
      "lie_to_survive is true.",
    ),
    flagLine(
      "rewrite_key",
      src.rewrite_key,
      "There is no rewrite key (rewrite_key is false).",
      "A rewrite key is marked present (rewrite_key is true).",
    ),
    src.shelves_are_not_a_live_door === true
      ? "Cold shelves are not a live door."
      : "Whether cold shelves are a live door was not reported.",
    `The live-node API is ${node.status || "unreported"}. Code: ${node.code || "BAN-NODE-API-NOT-ATTESTED"}. That roster is not a live mesh node.`,
    flagLine(
      "standard_internet_reaches_cap7",
      cap.standard_internet_reaches_cap7,
      "Ordinary internet does not reach Cap-7 (standard_internet_reaches_cap7 is false).",
      "Ordinary internet is marked as reaching Cap-7 (standard_internet_reaches_cap7 is true).",
    ),
    flagLine(
      "spore_replaces_cold_shelves",
      src.spore_replaces_cold_shelves,
      "Spore does not replace the shelves (spore_replaces_cold_shelves is false).",
      "Spore is marked as replacing the shelves (spore_replaces_cold_shelves is true).",
    ),
    cut.live_dns_changed === true
      ? `Origin cutover is ${cut.status || "unreported"}. A live DNS change is marked (live_dns_changed is true).`
      : `Origin cutover is ${cut.status || "unreported"}. There is no live DNS change (live_dns_changed is false).`,
  ];
  return lines.concat(carrierSentences());
}

function shelfSentences(body) {
  const src = body && typeof body === "object" ? body : {};
  const registry = src.registry && typeof src.registry === "object" ? src.registry : {};
  const planes = src.planes && typeof src.planes === "object" ? src.planes : registry.planes || {};
  const planeA = planes.A || {};
  const planeB = planes.B || {};
  const planeC = planes.C || {};
  const honesty = planeB.honesty && typeof planeB.honesty === "object" ? planeB.honesty : {};
  const cHonesty = planeC.honesty && typeof planeC.honesty === "object" ? planeC.honesty : {};
  const surfaces = planeA.published_surfaces != null ? planeA.published_surfaces : registry.published_surfaces;
  const independent = registry.independent_live_count != null ? registry.independent_live_count : "unreported";
  const lines = [
    planeA.status === "live"
      ? `Plane A is live. It is one tunnel with ${surfaces == null ? "the published" : surfaces} published surfaces and ${independent} independent copy. Five surfaces are not five shelves.`
      : `Plane A is ${planeA.status || "unreported"}. It is not painted live from this page.`,
    planeB.status === "live"
      ? "Plane B is marked live."
      : "Plane B is not live. A hash match is not a live shelf.",
    honesty.framagit_url === null || honesty.framagit_url === undefined
      ? "The Framagit URL is null."
      : `The Framagit URL is ${honesty.framagit_url}.`,
    flagLine(
      "zenodo_live",
      planeB.zenodo_live === true || honesty.zenodo_live === true
        ? true
        : planeB.zenodo_live === false || honesty.zenodo_live === false
          ? false
          : undefined,
      "Zenodo is not live (zenodo_live is false).",
      "Zenodo is marked live (zenodo_live is true).",
    ),
    planeB.doi === null || registry.lockset_doi === null
      ? "doi is null."
      : "A doi was reported. This page does not invent one.",
    planeC.status === "live"
      ? "Plane C is marked live."
      : `Plane C, the USB copy, is not attested (${cHonesty.slot_until || "CNS-OPERATOR-ATTEST"}). It is not live.`,
  ];
  return lines.concat(carrierSentences());
}

function sentencesFor(kind, body) {
  const refused = refusalSentences(body);
  if (refused.length && (!body || body.spec == null)) return refused;
  const rest =
    kind === "platforms" ? platformSentences(body) : kind === "survival" ? survivalSentences(body) : shelfSentences(body);
  return refused.concat(rest);
}

function jsonTwin(kind) {
  if (kind === "platforms") return "/v1/platforms";
  if (kind === "survival") return "/v1/survival";
  return "/v1/shelves";
}

function pageTitle(kind) {
  if (kind === "platforms") return "Platforms";
  if (kind === "survival") return "Survival";
  return "Shelves";
}

/** Full HTML document. The JSON body is not pasted into the page. */
export function humanCiteHtml({ kind, body, origin, pathname }) {
  const base = String(origin || "").replace(/\/$/, "");
  const path = normPath(pathname);
  const twin = jsonTwin(kind);
  const title = pageTitle(kind);
  const paras = sentencesFor(kind, body)
    .map((line) => `  <p>${esc(line)}</p>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    body { margin: 0 auto; max-width: 40rem; padding: 1.5rem 1.1rem 3rem; font: 1.05rem/1.55 system-ui, sans-serif; }
    a { color: inherit; }
    h1 { font-size: 1.8rem; font-weight: 650; letter-spacing: 0; }
    p { margin: 0.7rem 0; }
  </style>
</head>
<body>
  <main>
  <p><a href="${esc(base)}/">Back</a></p>
  <h1>${esc(title)}</h1>
${paras}
  <p>Programs still use JSON at <a href="${esc(base + twin)}">${esc(twin)}</a>. This page is ${esc(path)}.</p>
  </main>
</body>
</html>`;
}
