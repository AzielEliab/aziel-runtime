/**
 * Mesh-resident website designs — azcorpus + azlibrary.
 *
 * Named on Softwares catalog + skill. Downloadable to nodes.
 * Not Softwares-tab products. Not FragGate slugs. Not a fifth product.
 * Live on the library hub (azielcorpuslibrary.net) as designs Cap-7 inherits.
 * azlibrary upload is API token only — never embed the secret.
 * Download is open for all AI clients (MCP / OpenAPI dual-surface).
 *
 * Author: Aziel Eliab only.
 */

import { AUTHOR_NAME, DESIGNS_FOLDER, DESIGNS_GITHUB_TREE, LIBRARY_ORIGIN } from "./seo.js";

export const WEBSITE_DESIGN_IDS = Object.freeze(["azcorpus", "azlibrary"]);
export const WEBSITE_DESIGN_KIND = "website_design";
export const WEBSITE_DESIGN_HUB_ID = "library";
export const WEBSITE_DESIGN_GITHUB = "https://github.com/AzielEliab/aziel-corpus";

export const WEBSITE_DESIGN_LIMITATION =
  "THIS IS: mesh-resident website designs azcorpus + azlibrary, named on GET /v1/software and runtime_skill, downloadable to nodes. Download is open for all AI clients (MCP / OpenAPI). azlibrary upload is API token only. THIS IS NOT: a fifth Softwares product; a FragGate slug; an ICANN hostname alias; a secret embedded in catalog/skill/MCP/OpenAPI. Author: Aziel Eliab only.";

function libraryHome() {
  return `${LIBRARY_ORIGIN}/`;
}

function libraryDownload() {
  return `${LIBRARY_ORIGIN}/download`;
}

export function azcorpusDesign(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    id: "azcorpus",
    name: "azcorpus",
    kind: WEBSITE_DESIGN_KIND,
    mesh_resident: true,
    downloadable_to_nodes: true,
    software_tab: false,
    fraggate_slug: false,
    fifth_product: false,
    hub_id: WEBSITE_DESIGN_HUB_ID,
    hub: libraryHome(),
    download_open: true,
    download_url: libraryDownload(),
    github: WEBSITE_DESIGN_GITHUB,
    upload: false,
    dual_surface: {
      mcp: true,
      openapi: true,
      catalog: base ? `${base}/v1/software` : "/v1/software",
      skill: base ? `${base}/v1/skill` : "/v1/skill",
    },
    note: "Mesh-resident website design downloadable to nodes. Not a Softwares-tab product. Not a FragGate slug.",
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
  };
}

export function azlibraryDesign(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    id: "azlibrary",
    name: "azlibrary",
    kind: WEBSITE_DESIGN_KIND,
    mesh_resident: true,
    downloadable_to_nodes: true,
    software_tab: false,
    fraggate_slug: false,
    fifth_product: false,
    hub_id: WEBSITE_DESIGN_HUB_ID,
    hub: libraryHome(),
    download_open: true,
    download_url: libraryDownload(),
    github: WEBSITE_DESIGN_GITHUB,
    upload: {
      method: "api_token_only",
      never_embed_secret: true,
      token_in: "env / keychain / Authorization Bearer at call time",
      not_in: ["catalog", "skill", "mcp_tool_schema", "openapi_example", "cite", "llms"],
      note: "azlibrary upload accepts an operator API token only. Catalog and skill name the rule. They never embed the secret.",
    },
    dual_surface: {
      mcp: true,
      openapi: true,
      catalog: base ? `${base}/v1/software` : "/v1/software",
      skill: base ? `${base}/v1/skill` : "/v1/skill",
    },
    note: "Mesh-resident website design downloadable to nodes. Upload is API token only. Never embed the secret. Not a Softwares-tab product. Not a FragGate slug.",
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
  };
}

export function websiteDesignCards(origin) {
  return [azcorpusDesign(origin), azlibraryDesign(origin)];
}

export function websiteDesignsField(origin) {
  const cards = websiteDesignCards(origin);
  return {
    ok: true,
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    kind: WEBSITE_DESIGN_KIND,
    ids: [...WEBSITE_DESIGN_IDS],
    software_tab: false,
    fraggate_slug: false,
    fifth_product: false,
    mesh_resident: true,
    downloadable_to_nodes: true,
    download_open: true,
    hub: libraryHome(),
    hub_id: WEBSITE_DESIGN_HUB_ID,
    designs: cards,
    designs_folder: DESIGNS_FOLDER,
    designs_github: DESIGNS_GITHUB_TREE,
    limitation: WEBSITE_DESIGN_LIMITATION,
  };
}

export function websiteDesignsOnCorpusCard(origin) {
  return {
    website_designs: [...WEBSITE_DESIGN_IDS],
    website_designs_note:
      "azcorpus + azlibrary are mesh-resident website designs on this library hub. Downloadable to nodes. Not extra Softwares. azlibrary upload is API token only (never embed the secret). Download is open.",
    website_designs_cards: websiteDesignCards(origin),
  };
}

export function websiteDesignsSkillMarkdown(origin) {
  const field = websiteDesignsField(origin);
  return `## Mesh-resident website designs (azcorpus + azlibrary)

**azcorpus** and **azlibrary** are mesh-resident website designs on the library hub (\`${field.hub}\`). They are **downloadable to nodes**. They are **not** Softwares-tab products, **not** FragGate slugs, and **not** a fifth product.

- Download is **open** for all AI clients (MCP \`runtime_software\` / \`GET /v1/software\`, OpenAPI, counted \`${field.hub}download\`).
- **azlibrary upload** is **API token only**. Never embed the secret in catalog, skill, MCP schema, OpenAPI examples, or cite.
- Dual-surface: agents stay in MCP / OpenAPI; humans use the library Worker UI + counted \`/download\`.

${WEBSITE_DESIGN_LIMITATION}
`;
}

export function websiteDesignsLlmsBlock(origin) {
  const field = websiteDesignsField(origin);
  return [
    "## Mesh-resident website designs (azcorpus + azlibrary)",
    "",
    WEBSITE_DESIGN_LIMITATION,
    "",
    `Named on GET /v1/software website_designs and runtime_skill. Hub: ${field.hub}`,
    "azcorpus: download open. Not a FragGate slug.",
    "azlibrary: download open. Upload API token only. Never embed secret.",
    "Not a fifth Softwares product. Cap-7 inherits these designs on the library hub.",
    "",
  ].join("\n");
}
