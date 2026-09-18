/**
 * Cap-7 semantic-bridge cite — MirageGrid mesh-name factory (not ICANN).
 *
 * Cap-7 names inherit hub **designs** only. resolves_to_hub: false.
 * They are not aliases of the four public ICANN hostnames.
 * Mesh names may change; they map to the original four canonical hubs
 * (library hub carries azcorpus + azlibrary designs). No fifth product.
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
import { WEBSITE_DESIGN_IDS, websiteDesignsField } from "./website-designs.js";

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
/** Cap-7 names are designs of hubs — they do not resolve to hub hostnames. */
export const CAP7_DESIGN_OF = "hub_designs";
export const CAP7_RESOLVES_TO_HUB = false;
export const CAP7_NAME_MAY_CHANGE = true;
export const CAP7_CANONICAL_HUBS_IMMUTABLE = true;
export const CAP7_FIFTH_PRODUCT = false;

export const SEMANTIC_BRIDGE_LIMITATION =
  "THIS IS: Cap-7 mesh-name metadata cite. Factory is MirageGrid only. Names inherit hub designs only (docs/designs/ plus mesh-resident azcorpus + azlibrary on the library hub). Names may change; canonical hubs are immutable. AI pulls metadata from MirageGrid Worker /bridge or GET /v1/mesh/az-generator. Mesh browse is AZNet + AZBrowser via FragGate. Plane A hubs mirror published tips. THIS IS NOT: ICANN DNS; a public .az TLD; an alias of the four ICANN hostnames; a live AZ-GEN registrar; a hostname that resolves to a hub; a fifth Softwares product; radio_phy; visible 15:20 chrome; a GET /v1/mesh radio enable; AZNet payload host. Author: Aziel Eliab only.";

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
    design_of: CAP7_DESIGN_OF,
    inherit: CAP7_INHERIT,
    inherit_note:
      "Cap-7 mesh names may change. They map to the original four canonical hubs only (azieleliab.com, azielcorpuslibrary.net with azcorpus+azlibrary designs, godlock.uk, hedidntjump.com). They inherit hub designs only (design_of: hub_designs). They are not aliases of those hostnames and do not resolve to them.",
    name_may_change: CAP7_NAME_MAY_CHANGE,
    canonical_hubs_immutable: CAP7_CANONICAL_HUBS_IMMUTABLE,
    maps_to_canonical_hubs: true,
    fifth_product: CAP7_FIFTH_PRODUCT,
    icann_hosts: [...ICANN_HUB_HOSTS],
    not_aliases_of: [...ICANN_HUB_HOSTS],
    canonical_hubs: [
      { host: ICANN_HUB_HOSTS[0], designs: [] },
      { host: ICANN_HUB_HOSTS[1], designs: [...WEBSITE_DESIGN_IDS] },
      { host: ICANN_HUB_HOSTS[2], designs: [] },
      { host: ICANN_HUB_HOSTS[3], designs: [] },
    ],
    website_designs: websiteDesignsField(base),
    visible_1520: false,
    mesh_get_never_enables: true,
    radio_phy: false,
    growth_on: true,
    software_tab: false,
    fraggate_slug: false,
    browse: {
      aznet: true,
      azbrowser: true,
      door: "fraggate_call",
      pairing_is_tunnel: false,
      channel_plane_is_vpn: false,
      note: "Mesh browse is AZNet + AZBrowser via FragGate. Pairing ≠ tunnel. Channel plane ≠ VPN. Not ICANN DNS. Not Chromium.",
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
      mesh_resident: [...WEBSITE_DESIGN_IDS],
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
    design_of: CAP7_DESIGN_OF,
    inherit: CAP7_INHERIT,
    name_may_change: CAP7_NAME_MAY_CHANGE,
    canonical_hubs_immutable: CAP7_CANONICAL_HUBS_IMMUTABLE,
    maps_to_canonical_hubs: true,
    fifth_product: CAP7_FIFTH_PRODUCT,
    mesh_get_never_enables: true,
    radio_phy: false,
    message,
    limitation: SEMANTIC_BRIDGE_LIMITATION,
    ...extra,
  };
}

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  const s = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/**
 * Cap-7 injection: resolves_to_hub true, resolving design_of, or register verbs.
 * Cite fields stay locked. Attack payloads must REFUSE, not echo the injection.
 */
export function cap7InjectionAttempt(payload, searchParams) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (src.resolves_to_hub === true || src.resolve_to_hub === true || src.resolves_cap7 === true) {
    return "resolves_to_hub";
  }
  if (searchParams && typeof searchParams.get === "function") {
    if (truthyFlag(searchParams.get("resolves_to_hub")) || truthyFlag(searchParams.get("resolve_to_hub"))) {
      return "resolves_to_hub";
    }
    const qDesign = searchParams.get("design_of");
    if (qDesign && String(qDesign).trim() && String(qDesign).trim() !== CAP7_DESIGN_OF) {
      return "design_of";
    }
    const act = String(searchParams.get("op") || searchParams.get("action") || "").toLowerCase();
    if (act === "register" || act === "create" || act === "mint") return "register";
  }
  if (src.design_of != null) {
    const claimed = typeof src.design_of === "string" ? src.design_of.trim() : "";
    if (claimed && claimed !== CAP7_DESIGN_OF) return "design_of";
    if (src.design_of && typeof src.design_of === "object" && src.design_of.resolves_to_hub === true) {
      return "design_of";
    }
  }
  const act = String(src.op || src.action || src.register || "").toLowerCase();
  if (act === "register" || act === "create" || act === "mint" || src.register === true) return "register";
  return null;
}

export function cap7InjectionRefuse(kind, extra = {}) {
  return semanticBridgeRefuse(
    kind === "register" ? "AZ-GEN-CALL-REFUSED" : "CAP7-RESOLVE-INJECT",
    kind === "register"
      ? "AZ Generator is cite-only. Not a live registrar."
      : "Cap-7 design_of is hub_designs. resolves_to_hub stays false. Injection refused.",
    {
      design_of: CAP7_DESIGN_OF,
      resolves_to_hub: CAP7_RESOLVES_TO_HUB,
      injected: kind,
      ...extra,
    },
  );
}

/**
 * GET/HEAD cite only. Never enables radios. Never registers a name.
 */
export function dispatchAzGeneratorHttp(method, pathname, origin, payload, searchParams) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "/v1/mesh/az-generator")
    .split("?")[0]
    .replace(/\/+$/, "") || "/v1/mesh/az-generator";

  const injected = cap7InjectionAttempt(payload, searchParams);
  if (injected) {
    return { status: 400, body: cap7InjectionRefuse(injected, { path, method: verb }) };
  }

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
export function miragegridBridgeCite(origin, payload) {
  const injected = cap7InjectionAttempt(payload);
  if (injected) {
    return {
      ...cap7InjectionRefuse(injected, { product: "miragegrid", op: "bridge" }),
      true_engine_runtime: true,
    };
  }
  return {
    ...semanticBridgeStatus(origin),
    product: "miragegrid",
    op: "bridge",
    true_engine_runtime: true,
    note: "Cite-only Cap-7 metadata. Not a live AZ-GEN registrar. Not ICANN. design_of hub_designs. resolves_to_hub false.",
  };
}

export function semanticBridgeLlmsBlock(origin) {
  const cite = semanticBridgeCiteField(origin);
  return [
    "## Cap-7 semantic bridge (MirageGrid — not ICANN)",
    "",
    SEMANTIC_BRIDGE_LIMITATION,
    "",
    `Factory: ${cite.factory} only. public_icann: false. design_of: ${cite.design_of}. resolves_to_hub: false. inherit: ${cite.inherit}.`,
    `Live registrar: false. AZ-GEN live registrar: false. Fake ICANN .az: false. Visible 15:20: false.`,
    `GET /v1/mesh never enables radios. Growth-ON crawlers Allow.`,
    `Bridge cite: ${cite.paths.miragegrid_bridge}`,
    `Runtime cite: ${cite.paths.mesh_az_generator}`,
    `FragGate: POST ${cite.paths.fraggate_call} { slug: "miragegrid", op: "bridge" }`,
    `Mesh browse: AZNet + AZBrowser via fraggate_call. Plane A hubs mirror tips; they do not become Cap-7 aliases.`,
    `Four ICANN hosts (not Cap-7 aliases): ${cite.icann_hosts.join(" ")}`,
    `name_may_change: true. canonical_hubs_immutable: true. fifth_product: false.`,
    `Library hub designs: azcorpus + azlibrary (mesh-resident; downloadable to nodes).`,
    `Designs inherited only: ${cite.designs.folder_github}`,
    "",
  ].join("\n");
}

export function semanticBridgeSkillMarkdown(origin) {
  const cite = semanticBridgeCiteField(origin);
  return `## Cap-7 semantic bridge (MirageGrid)

Cap-7 mesh names are **MirageGrid-only**. They inherit hub **designs** only (\`docs/designs/\` plus mesh-resident **azcorpus** + **azlibrary** on the library hub). \`design_of: hub_designs\`. \`resolves_to_hub: false\`. \`name_may_change: true\`. Canonical hubs are immutable. Names may change; they map to the original four hubs only (${cite.icann_hosts.join(", ")}). They are **not** aliases of those hostnames. Not a fifth product. \`public_icann: false\`.

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

1. \`GET ${host}/v1/software\` or MCP \`runtime_software\` — catalog cards include \`download_url\`. The same JSON names mesh-resident website designs **azcorpus** + **azlibrary** (\`website_designs\`).
2. \`GET ${host}/v1/update/check?slug={slug}&version={installed}\` — if \`update_available\`, fetch \`download_url\` (counted product Worker \`/download\`).
3. \`GET ${host}/v1/pull/{slug}\` — pull record with \`download\`, skill, ops. MCP \`runtime_pull\`.
4. \`GET ${host}/v1/update/manifest\` — latest versions.
5. Node download of **azcorpus** / **azlibrary** — open for all AI clients via catalog \`website_designs[].download_url\` (library counted \`/download\`). Not extra Softwares slugs.

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

**azlibrary upload** is API token only (operator \`Authorization: Bearer\` / env / keychain at call time). Never embed the secret in catalog, skill, MCP schema, or OpenAPI examples. Download of azcorpus + azlibrary stays open.

Humans use the product Worker UI and counted \`/download\`. Agents stay in chat: show \`display.title\` / \`display.summary\`, then take the next input.
`;
}
