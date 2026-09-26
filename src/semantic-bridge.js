/**
 * Cap-7 semantic-bridge cite — MirageGrid auto-generate `.az` duplication.
 *
 * Standard internet does not reach Cap-7. It reaches the AZ domains
 * through the four hub HTTPS links. Cap-7 duplicates those four hubs
 * and shifts with StaticLock (catalog product StaticClock, slug staticclock)
 * + MirageGrid cloak + AZVPN. Three of the
 * seven factory names are false sites. Factory duplication cite is LIVE.
 * public_icann / resolves_to_hub are the AZ-domain hub path, not a
 * claim that Cap-7 is an ICANN ccTLD. radio_phy stays false.
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
import { azDomainsCite, cap7ShuffleCite } from "./cap7-shuffle.js";

export const SEMANTIC_BRIDGE_SPEC = "CAP-7";
export const SEMANTIC_BRIDGE_NAME = "Cap-7 semantic bridge";
export const SEMANTIC_BRIDGE_FACTORY = "miragegrid";
export const SEMANTIC_BRIDGE_AUTHOR = AUTHOR_NAME;
/** Counted download plane. Isolated from the Cap-7 factory. `/bridge` here is 404. */
export const MIRAGEGRID_DOWNLOAD_ORIGIN = "https://miragegrid-download-tracker.vibelock.workers.dev";
/** Named Cap-7 factory / shuffle-app Worker. LIVE cite for `/bridge` and `GET /v1/shuffle`. */
export const MIRAGEGRID_APP_ORIGIN = "https://miragegrid.vibelock.workers.dev";
/** Factory origin used by bridge cites. Not the download-tracker. */
export const MIRAGEGRID_WORKER_ORIGIN = MIRAGEGRID_APP_ORIGIN;
export const MIRAGEGRID_BRIDGE_PATH = "/bridge";

/** Four public ICANN hub websites. AZ domains are reached here. Cap-7 names are not these hosts. */
export const ICANN_HUB_HOSTS = Object.freeze([
  `${AUTHOR_SITE_ORIGIN}/`,
  `${LIBRARY_ORIGIN}/`,
  `${GODLOCK_UK_ORIGIN}/`,
  HEDIDNTJUMP_HOME,
]);

export const CAP7_INHERIT = "designs";
/** Cap-7 names are designs of hubs. The Cap-7 layer itself is not the public HTTPS door. */
export const CAP7_DESIGN_OF = "hub_designs";
/** Cap-7 mesh names do not take standard-internet resolve. AZ domains do. */
export const CAP7_RESOLVES_TO_HUB = false;
export const CAP7_PUBLIC_ICANN = false;
export const CAP7_INTERNET_REACHABLE = false;
export const AZ_DOMAIN_RESOLVES_TO_HUB = true;
export const AZ_DOMAIN_PUBLIC_ICANN = true;
export const CAP7_NAME_MAY_CHANGE = true;
export const CAP7_CANONICAL_HUBS_IMMUTABLE = true;
export const CAP7_FIFTH_PRODUCT = false;

export const SEMANTIC_BRIDGE_LIMITATION =
  "THIS IS: Cap-7 auto-generates .az duplications of the four hub sites and shifts them with StaticLock (catalog product StaticClock, slug staticclock) and MirageGrid cloak, paired with AZVPN. Factory is MirageGrid only. Four factory names are real duplications (azgrid, azcloak, azvault, azshift); three are false sites (azbooth, azflag, azstandby). Standard internet does not reach Cap-7. Internet reaches the AZ domains through the four hub HTTPS links. Those AZ domains are public_icann and resolves_to_hub, shuffle once to one of four display names, stand alone, and freeze after the hubs go down. Live nodes anchor them. Factory duplication cite is LIVE. Names may change; canonical hubs are immutable while up. AI pulls metadata from MirageGrid Worker /bridge or GET /v1/mesh/az-generator. Mesh browse is AZNet + AZBrowser via FragGate. GET /v1/mesh never enables. radio_phy false. Author: Aziel Eliab only.";

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
    internet_reaches_cap7: false,
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
    public_icann: CAP7_PUBLIC_ICANN,
    icann_tld_az: false,
    live_registrar: false,
    az_gen_live_registrar: false,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    internet_reachable: CAP7_INTERNET_REACHABLE,
    standard_internet_reaches_cap7: false,
    design_of: CAP7_DESIGN_OF,
    inherit: CAP7_INHERIT,
    inherit_note:
      "Cap-7 mesh names may change. They map to the original four canonical hubs only (azieleliab.com, azielcorpuslibrary.net with azcorpus+azlibrary designs, godlock.uk, hedidntjump.com) as .az duplications. They inherit hub designs only (design_of: hub_designs). Three names are false sites. Standard internet does not reach Cap-7. Internet reaches the AZ domains via those hub HTTPS links.",
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
    az_domains: azDomainsCite(),
    false_site_count: 3,
    real_duplication_count: 4,
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
      note: "Mesh browse is AZNet + AZBrowser via FragGate.",
    },
    plane_a: {
      local: "qnm-node",
      hubs_mirror_tips: true,
      hubs: planeAHubs(),
      note: "Plane A hubs are the public HTTPS door for the AZ domains. Standard internet does not reach Cap-7 .az names. Live nodes anchor the AZ domains.",
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
    shuffle: cap7ShuffleCite(),
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
    public_icann: CAP7_PUBLIC_ICANN,
    live_registrar: false,
    az_gen_live_registrar: false,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    internet_reachable: CAP7_INTERNET_REACHABLE,
    standard_internet_reaches_cap7: false,
    az_domains_public_icann: AZ_DOMAIN_PUBLIC_ICANN,
    az_domains_resolves_to_hub: AZ_DOMAIN_RESOLVES_TO_HUB,
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

function falsyFlag(value) {
  if (value === false || value === 0) return true;
  const s = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  return s === "0" || s === "false" || s === "no" || s === "off";
}

/**
 * Cap-7 injection. Locked law:
 * - Cap-7 is not a public internet door (resolves_to_hub stays false on that layer).
 * - AZ domains stay public_icann / resolves_to_hub / internet-reachable.
 * - Factory duplication stays LIVE (SLOT overrides refuse).
 * - Register verbs, ccTLD purchase, radio_phy, and off-pool redirects refuse.
 */
export function cap7InjectionAttempt(payload, searchParams) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (
    src.resolves_to_hub === true ||
    src.resolve_to_hub === true ||
    src.resolves_cap7 === true ||
    src.standard_internet_reaches_cap7 === true ||
    src.internet_reaches_cap7 === true ||
    src.cap7_internet_reachable === true
  ) {
    return "resolves_to_hub";
  }
  if (src.az_public_icann === false || src.az_resolves_to_hub === false || src.az_internet_reachable === false) {
    return "az_domain";
  }
  if (src.public_worker_shuffle === "slot" || src.hosted_mcp === "slot" || src.mesh_name_icann === "slot") {
    return "factory_slot";
  }
  if (src.all_seven_real === true || src.false_site_count === 0 || src.false_site_count === 7) return "false_site";
  if (src.icann_tld_az === true || src.bought_az_cctld === true || src.fake_icann_az === true) return "icann_tld";
  if (src.live_registrar === true || src.az_gen_live_registrar === true) return "register";
  if (src.radio_phy === true) return "radio_phy";
  const redirect = src.cname || src.hub_cname || src.redirect || src.hub_redirect;
  if (redirect && !designedHubPair(redirect)) return "hub_redirect";
  if (searchParams && typeof searchParams.get === "function") {
    if (
      truthyFlag(searchParams.get("resolves_to_hub")) ||
      truthyFlag(searchParams.get("resolve_to_hub")) ||
      truthyFlag(searchParams.get("standard_internet_reaches_cap7"))
    ) {
      return "resolves_to_hub";
    }
    if (falsyFlag(searchParams.get("az_resolves_to_hub")) || falsyFlag(searchParams.get("az_public_icann"))) {
      return "az_domain";
    }
    const qDesign = searchParams.get("design_of");
    if (qDesign && String(qDesign).trim() && String(qDesign).trim() !== CAP7_DESIGN_OF) {
      return "design_of";
    }
    const qRedirect = searchParams.get("cname") || searchParams.get("redirect") || searchParams.get("hub_redirect");
    if (qRedirect && !designedHubPair(qRedirect)) return "hub_redirect";
    const act = String(searchParams.get("op") || searchParams.get("action") || "").toLowerCase();
    if (act === "register" || act === "create" || act === "mint") return "register";
    if (truthyFlag(searchParams.get("radio_phy"))) return "radio_phy";
    if (truthyFlag(searchParams.get("icann_tld_az"))) return "icann_tld";
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

function designedHubPair(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\/$/, "")
    .replace(/^https?:\/\//, "");
  const hosts = [
    "azieleliab.com",
    "www.azieleliab.com",
    "azielcorpuslibrary.net",
    "www.azielcorpuslibrary.net",
    "godlock.uk",
    "www.godlock.uk",
    "hedidntjump.com",
    "www.hedidntjump.com",
    "az.azieleliab.az",
    "az.azielcorpuslibrary.az",
    "az.godlock.az",
    "az.hedidntjump.az",
  ];
  return hosts.includes(raw);
}

export function cap7InjectionRefuse(kind, extra = {}) {
  return semanticBridgeRefuse(
    kind === "register" ? "AZ-GEN-CALL-REFUSED" : "CAP7-RESOLVE-INJECT",
    kind === "register"
      ? "AZ Generator is cite-only. Not a live registrar."
      : "Cap-7 is not a public internet door. AZ domains stay on the hub HTTPS links. Injection refused.",
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
    note: "Cap-7 .az duplication cite. Standard internet does not reach Cap-7. AZ domains resolve through the four hub HTTPS links. design_of hub_designs. Three of seven are false sites.",
  };
}

export function semanticBridgeLlmsBlock(origin) {
  const cite = semanticBridgeCiteField(origin);
  return [
    "## Cap-7 semantic bridge (MirageGrid — not ICANN)",
    "",
    SEMANTIC_BRIDGE_LIMITATION,
    "",
    `Factory: ${cite.factory} only. Cap-7 public_icann: false. Cap-7 resolves_to_hub: false. Cap-7 internet_reachable: false. design_of: ${cite.design_of}. inherit: ${cite.inherit}.`,
    `Standard internet does not reach Cap-7. Internet reaches AZ domains via the four hub HTTPS links. AZ public_icann: true. AZ resolves_to_hub: true. Shuffle once to 1 of 4. Live nodes anchor those names.`,
    `False sites: azbooth, azflag, azstandby. Real duplications: azgrid, azcloak, azvault, azshift. Shift: StaticLock (catalog product StaticClock, slug staticclock) + MirageGrid cloak + AZVPN. Factory duplication cite: LIVE.`,
    `Live registrar: false. icann_tld_az: false. Fake ICANN .az: false. Visible 15:20: false. radio_phy: false.`,
    `GET /v1/mesh never enables radios. Growth-ON crawlers Allow.`,
    `Bridge cite: ${cite.paths.miragegrid_bridge}`,
    `Runtime cite: ${cite.paths.mesh_az_generator}`,
    `FragGate: POST ${cite.paths.fraggate_call} { slug: "miragegrid", op: "bridge" }`,
    `Mesh browse: AZNet + AZBrowser via fraggate_call. Plane A hubs mirror tips; they do not become Cap-7 aliases.`,
    `Four ICANN hosts (not Cap-7 aliases): ${cite.icann_hosts.join(" ")}`,
    `name_may_change: true. canonical_hubs_immutable: true. fifth_product: false.`,
    `Update shuffle: ping MirageGrid until one Cap-7 .az name lands. Factory land is LIVE. That mesh name is not a public HTTPS door. Distinct mesh names. No hardcoded host.`,
    `Library hub designs: azcorpus + azlibrary (mesh-resident; downloadable to nodes).`,
    `Designs inherited only: ${cite.designs.folder_github}`,
    "",
  ].join("\n");
}

export function semanticBridgeSkillMarkdown(origin) {
  const cite = semanticBridgeCiteField(origin);
  return `## Cap-7 semantic bridge (MirageGrid)

Cap-7 is the MirageGrid auto-generate **.az duplication** layer. It duplicates the four hub sites and shifts with **StaticLock** (catalog product **StaticClock**, slug \`staticclock\`) and **MirageGrid cloak**, paired with **AZVPN**. Names inherit hub **designs** only (\`docs/designs/\` plus mesh-resident **azcorpus** + **azlibrary** on the library hub). \`design_of: hub_designs\`. On the Cap-7 layer \`resolves_to_hub: false\` and \`internet_reachable: false\` — standard internet does not reach Cap-7. Four factory names are real duplications (\`azgrid\`, \`azcloak\`, \`azvault\`, \`azshift\`); three are false sites (\`azbooth\`, \`azflag\`, \`azstandby\`). \`name_may_change: true\`.

Internet reaches the **AZ domains** through the hub HTTPS links (${cite.icann_hosts.join(", ")}). Those drop-ins are \`public_icann: true\`, \`resolves_to_hub: true\`, shuffle once to one of four display names, stand alone, and become immutable after the hubs go down. Live nodes anchor them. Not an ICANN \`.az\` ccTLD purchase. Not a fifth product.

AI pulls mesh-generated **name metadata** (not a registration) from:

- \`${cite.paths.miragegrid_bridge}\`
- \`GET ${cite.paths.mesh_az_generator}\`
- \`fraggate_call\` \`{ slug: "miragegrid", op: "bridge" }\`
- \`fraggate_call\` \`{ slug: "miragegrid", op: "shuffle" }\` — ping MirageGrid until one distinct-name Cap-7 .az site lands (that-round mesh update). Factory land is LIVE. The landed name is not a public HTTPS door.

\`icann_tld_az: false\`. No ICANN registrar purchase. No visible 15:20. \`radio_phy: false\`. \`GET /v1/mesh\` never enables radios.

Mesh browse: **AZNet + AZBrowser** via \`fraggate_call\`. Plane A hub websites are the public door for the AZ domains.

${SEMANTIC_BRIDGE_LIMITATION}
`;
}

export function dualSurfaceAgentHowTo(origin) {
  const host = String(origin || "").replace(/\/$/, "");
  return `## Dual surface — upload / download / invoke

Agents (MCP / OpenAPI in AI clients) and humans (Worker UI + counted \`/download\`) share one backend. FragGate is THE executable door. \`POST /p/{slug}/{op}\` is **proxy**, not exec.

### Download (agent)

1. \`GET ${host}/v1/software\` or MCP \`Softwares\` (\`runtime_software\` remains a tools/call alias) — catalog cards include \`download_url\`. The same JSON names mesh-resident website designs **azcorpus** + **azlibrary** (\`website_designs\`).
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
| miragegrid | verify-receipt, bridge, shuffle | Verify a control-plane receipt; Cap-7 name-metadata cite; ping→land update shuffle (hosted URL SLOT) |
| aznet | stamp, verify_hash, receipt_verify | Side-net hash stamp / verify (never hosts payloads) |
| azchat | verify_receipt, import_export | Chat receipt verify; client-held JSON |
| azmail | verify_receipt, import_export | Mail receipt verify (not SMTP) |

**azlibrary upload** is API token only (operator \`Authorization: Bearer\` / env / keychain at call time). Never embed the secret in catalog, skill, MCP schema, or OpenAPI examples. Download of azcorpus + azlibrary stays open.

Humans use the product Worker UI and counted \`/download\`. Agents stay in chat: show \`display.title\` / \`display.summary\`, then take the next input.
`;
}
