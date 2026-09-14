/**
 * Cap-7 semantic-bridge cite — MirageGrid mesh-name factory (not ICANN).
 *
 * Cap-7 names inherit hub **designs** only. resolves_to_hub: false.
 * They are not aliases of the four public ICANN hostnames.
 * Factory is MirageGrid-only. AZ-GEN is a cite label, not a live registrar.
 * AI pulls name metadata from public bridge URLs. GET /v1/mesh never enables.
 *
 * Author: Aziel Eliab only.
 */

import {
  AUTHOR_NAME,
  AUTHOR_SITE_ORIGIN,
  DESIGNS_FOLDER,
  DESIGNS_GITHUB_TREE,
  GODLOCK_UK_ORIGIN,
  HEDIDNTJUMP_HOME,
  LIBRARY_ORIGIN,
  softwareHubCrawl,
} from "./seo.js";

export const SEMANTIC_BRIDGE_SPEC = "CAP-7";
export const SEMANTIC_BRIDGE_NAME = "Cap-7 semantic bridge";
export const SEMANTIC_BRIDGE_FACTORY = "miragegrid";
export const SEMANTIC_BRIDGE_AUTHOR = AUTHOR_NAME;
export const MIRAGEGRID_WORKER_ORIGIN = "https://miragegrid-download-tracker.vibelock.workers.dev";
export const MIRAGEGRID_BRIDGE_PATH = "/bridge";

/** Four public ICANN hostnames. Cap-7 names are not aliases of these and do not resolve to them. */
export const ICANN_HUB_HOSTS = Object.freeze([
  `${AUTHOR_SITE_ORIGIN}/`,
  `${LIBRARY_ORIGIN}/`,
  `${GODLOCK_UK_ORIGIN}/`,
  HEDIDNTJUMP_HOME,
]);

export const CAP7_INHERIT = "designs";
export const CAP7_RESOLVES_TO_HUB = false;

export const SEMANTIC_BRIDGE_LIMITATION =
  "THIS IS: Cap-7 mesh-name metadata cite. Factory is MirageGrid only. Names inherit hub designs only (docs/designs/). AI pulls metadata from MirageGrid Worker /bridge or GET /v1/mesh/az-generator. Mesh browse is AZNet + AZBrowser via FragGate. Plane A hubs mirror published tips. THIS IS NOT: ICANN DNS; a public .az TLD; an alias of the four ICANN hostnames; a live AZ-GEN registrar; a hostname that resolves to a hub; visible 15:20 chrome; a GET /v1/mesh radio enable. Author: Aziel Eliab only.";

export function miragegridBridgeUrl() {
  return `${MIRAGEGRID_WORKER_ORIGIN}${MIRAGEGRID_BRIDGE_PATH}`;
}

export function azGeneratorPath(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return base ? `${base}/v1/mesh/az-generator` : "/v1/mesh/az-generator";
}

export function planeAHubs() {
  return softwareHubCrawl().map((h) => ({
    id: h.id,
    name: h.name,
    cite: h.cite,
    software_tab: h.software_tab,
    mirrors_tips: true,
    resolves_cap7: false,
  }));
}

export function semanticBridgeCiteField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    spec: SEMANTIC_BRIDGE_SPEC,
    name: SEMANTIC_BRIDGE_NAME,
    author: SEMANTIC_BRIDGE_AUTHOR,
    identity: SEMANTIC_BRIDGE_AUTHOR,
    factory: SEMANTIC_BRIDGE_FACTORY,
    factory_only: SEMANTIC_BRIDGE_FACTORY,
    public_icann: false,
    icann_tld_az: false,
    live_registrar: false,
    az_gen_live_registrar: false,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    inherit: CAP7_INHERIT,
    inherit_note:
      "Cap-7 names inherit hub designs only. They are not aliases of the four ICANN hostnames and do not resolve to those hosts.",
    icann_hosts: [...ICANN_HUB_HOSTS],
    not_aliases_of: [...ICANN_HUB_HOSTS],
    visible_1520: false,
    mesh_get_never_enables: true,
    growth_on: true,
    software_tab: false,
    fraggate_slug: false,
    browse: {
      aznet: true,
      azbrowser: true,
      door: "fraggate_call",
      note: "Mesh browse is AZNet + AZBrowser via FragGate. Not ICANN DNS. Not Chromium.",
    },
    plane_a: {
      local: "qnm-node",
      hubs_mirror_tips: true,
      hubs: planeAHubs(),
      note: "Plane A hubs mirror published mesh-name tips. Mirroring a tip is not hostname aliasing and does not resolve Cap-7 names onto ICANN hosts.",
    },
    paths: {
      mesh_az_generator: azGeneratorPath(base),
      miragegrid_bridge: miragegridBridgeUrl(),
      fraggate_call: base ? `${base}/v1/fraggate/call` : "/v1/fraggate/call",
      openapi: base ? `${base}/openapi.json` : "/openapi.json",
    },
    designs: {
      folder: DESIGNS_FOLDER,
      folder_github: DESIGNS_GITHUB_TREE,
      inherit_only: true,
    },
    limitation: SEMANTIC_BRIDGE_LIMITATION,
  };
}

export function semanticBridgeStatus(origin) {
  return {
    ok: true,
    code: "CAP7-CITE",
    ...semanticBridgeCiteField(origin),
  };
}

export function semanticBridgeRefuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    author: SEMANTIC_BRIDGE_AUTHOR,
    identity: SEMANTIC_BRIDGE_AUTHOR,
    spec: SEMANTIC_BRIDGE_SPEC,
    public_icann: false,
    live_registrar: false,
    az_gen_live_registrar: false,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    inherit: CAP7_INHERIT,
    mesh_get_never_enables: true,
    message,
    limitation: SEMANTIC_BRIDGE_LIMITATION,
    ...extra,
  };
}

/**
 * GET/HEAD cite only. Never enables radios. Never registers a name.
 */
export function dispatchAzGeneratorHttp(method, pathname, origin) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "/v1/mesh/az-generator")
    .split("?")[0]
    .replace(/\/+$/, "") || "/v1/mesh/az-generator";

  if (verb === "GET" || verb === "HEAD") {
    return { status: 200, body: semanticBridgeStatus(origin) };
  }

  return {
    status: 405,
    body: semanticBridgeRefuse(
      "CAP7-CITE-ONLY",
      "GET /v1/mesh/az-generator cites Cap-7 mesh-name metadata. Not a live registrar. GET never enables radios.",
      { path, method: verb, hint: "GET /v1/mesh/az-generator" },
    ),
  };
}

/** FragGate MirageGrid op — same cite as GET /v1/mesh/az-generator. Not a registrar. */
export function miragegridBridgeCite(origin) {
  return {
    ...semanticBridgeStatus(origin),
    product: "miragegrid",
    op: "bridge",
    true_engine_runtime: true,
    note: "Cite-only Cap-7 metadata. Not a live AZ-GEN registrar. Not ICANN. resolves_to_hub false.",
  };
}

export function semanticBridgeLlmsBlock(origin) {
  const cite = semanticBridgeCiteField(origin);
  return [
    "## Cap-7 semantic bridge (MirageGrid — not ICANN)",
    "",
    SEMANTIC_BRIDGE_LIMITATION,
    "",
    `Factory: ${cite.factory} only. public_icann: false. resolves_to_hub: false. inherit: ${cite.inherit}.`,
    `Live registrar: false. AZ-GEN live registrar: false. Fake ICANN .az: false. Visible 15:20: false.`,
    `GET /v1/mesh never enables radios. Growth-ON crawlers Allow.`,
    `Bridge cite: ${cite.paths.miragegrid_bridge}`,
    `Runtime cite: ${cite.paths.mesh_az_generator}`,
    `FragGate: POST ${cite.paths.fraggate_call} { slug: "miragegrid", op: "bridge" }`,
    `Mesh browse: AZNet + AZBrowser via fraggate_call. Plane A hubs mirror tips; they do not become Cap-7 aliases.`,
    `Four ICANN hosts (not Cap-7 aliases): ${cite.icann_hosts.join(" ")}`,
    `Designs inherited only: ${cite.designs.folder_github}`,
    "",
  ].join("\n");
}

export function semanticBridgeSkillMarkdown(origin) {
  const cite = semanticBridgeCiteField(origin);
  return `## Cap-7 semantic bridge (MirageGrid)

Cap-7 mesh names are **MirageGrid-only**. They inherit hub **designs** only (\`docs/designs/\`). \`resolves_to_hub: false\`. They are **not** aliases of the four ICANN hostnames (${cite.icann_hosts.join(", ")}).

AI pulls mesh-generated **name metadata** (not a registration) from:

- \`${cite.paths.miragegrid_bridge}\`
- \`GET ${cite.paths.mesh_az_generator}\`
- \`fraggate_call\` \`{ slug: "miragegrid", op: "bridge" }\`

\`public_icann: false\`. No live AZ-GEN registrar. No fake ICANN \`.az\`. No visible 15:20. \`GET /v1/mesh\` never enables radios.

Mesh browse: **AZNet + AZBrowser** via \`fraggate_call\` (not Chromium, not ICANN DNS). Plane A hubs mirror published tips; mirroring a tip does not resolve a Cap-7 name onto a hub hostname.

${SEMANTIC_BRIDGE_LIMITATION}
`;
}

export function dualSurfaceAgentHowTo(origin) {
  const host = String(origin || "").replace(/\/$/, "");
  return `## Dual surface — upload / download / invoke

Agents (MCP / OpenAPI in AI clients) and humans (Worker UI + counted \`/download\`) share one backend. FragGate is THE executable door. \`POST /p/{slug}/{op}\` is **proxy**, not exec.

### Download (agent)

1. \`GET ${host}/v1/software\` or MCP \`runtime_software\` — catalog cards include \`download_url\`.
2. \`GET ${host}/v1/update/check?slug={slug}&version={installed}\` — if \`update_available\`, fetch \`download_url\` (counted product Worker \`/download\`).
3. \`GET ${host}/v1/pull/{slug}\` — pull record with \`download\`, skill, ops. MCP \`runtime_pull\`.
4. \`GET ${host}/v1/update/manifest\` — latest versions.

Do **not** increment product download counters on skill, health, proxy, or session exec.

### Upload / ingest / receipt (agent — \`fraggate_call\` / OpenAPI)

Call \`POST ${host}/v1/fraggate/call\` or MCP \`fraggate_call\` with \`{ slug, op, payload }\`. Same ops are listed on \`GET ${host}/openapi.json\` as \`/p/{slug}/{op}\` **proxy** paths — prefer FragGate.

| Slug | Ops | Act |
|------|-----|-----|
| azbrowser | airlock_ingest, receipt_list, verify, receipt_verify | Ingest a URL/text through the airlock; list/verify receipts |
| peacelock | upload_envelope | Upload a client-held envelope (not a transcript) |
| forgereceipts | verify, import_export | Verify a receipt; client-held JSON import/export |
| miragegrid | verify-receipt, bridge | Verify a control-plane receipt; Cap-7 name-metadata cite |
| aznet | stamp, verify_hash, receipt_verify | Side-net hash stamp / verify (never hosts payloads) |
| azchat | verify_receipt, import_export | Chat receipt verify; client-held JSON |
| azmail | verify_receipt, import_export | Mail receipt verify (not SMTP) |

Humans use the product Worker UI and counted \`/download\`. Agents stay in chat: show \`display.title\` / \`display.summary\`, then take the next input.
`;
}
