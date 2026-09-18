/**
 * One-click suite pack — what this Worker actually ships.
 *
 * REAL: in-process Softwares catalog, FragGate registry summary,
 * FoldLock library tip cite, mesh/nine-laws/VPN cites, About Aziel.
 * SLOT: Worker wasm / wrangler bundle, WireGuard / OpenVPN / L3,
 * qnm-node process bytes, full Digital Library, invented DOI.
 *
 * Do not invent binary contents. Do not claim fielded_100.
 * FragGate remains THE exec door. This GET is a pack, not exec.
 *
 * Author / identity: Aziel Eliab only.
 */

import { aboutAzielCiteField, corpusFoldPackCiteField } from "./about-aziel.js";
import { channelPlaneCite } from "./mesh-channel-plane.js";
import { nineLawsHint } from "./mesh-nine-laws.js";
import { publicVpnCite } from "./public-vpn.js";
import { AUTHOR_ID, PRODUCT_NAME } from "./seo.js";
import { softwareCatalog } from "./software-catalog.js";

export const SUITE_PACK_SPEC = "AZRT-SUITE-PACK-1.0";
export const SUITE_PACK_ID = "aziel-runtime-suite";
export const SUITE_PACK_FILENAME = "aziel-runtime-suite.json";
export const SUITE_PACK_KIND = "runtime-softwares-suite-pack";
export const SUITE_PACK_AUTHOR = "Aziel Eliab";
export const SUITE_PACK_IDENTITY = "Aziel Eliab";

export const SUITE_PACK_LABELS = Object.freeze({
  software_catalog: "REAL",
  fraggate_registry: "REAL",
  foldlock_tip: "REAL",
  mesh_cite: "REAL",
  nine_laws: "REAL",
  about_aziel: "REAL",
  channel_plane: "CITE",
  public_vpn_https_ws: "REAL",
  wireguard_openvpn_l3: "SLOT",
  worker_wasm_bundle: "SLOT",
  qnm_node_process: "CITE",
  product_worker_tarballs: "SLOT_OR_COUNTED_HOST",
  full_library_in_process: false,
  fielded_100: false,
  invented_doi: false,
});

export const SUITE_PACK_DOCS_CITE = Object.freeze([
  "docs/NODE_MESH.md",
  "docs/WORKER-LAUNCH.md",
  "docs/designs/AZVPN-CONCENTRATOR-1.0.md",
  "docs/designs/QNM-CHANNEL-PLANE-1.0.md",
  "docs/designs/QNM-WP-1.0.md",
  "docs/audit/HUMAN-UI-MCP-AUDIT-2026-09-17.md",
  "README.md",
  "CHANGELOG.md",
]);

export function suitePackPaths(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    download: `${base}/download`,
    v1: `${base}/v1/download`,
    suite: `${base}/v1/suite/download`,
    software: `${base}/v1/software`,
    fraggate_list: `${base}/v1/fraggate/list`,
    mesh: `${base}/v1/mesh`,
    github: "https://github.com/AzielEliab/aziel-runtime",
  };
}

export function buildSuitePack({ origin, products, registry, extra = {} } = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const catalog = softwareCatalog(base, products || [], extra);
  const entries = (registry && registry.entries) || [];
  const live = entries.filter((e) => e.status === "live").map((e) => e.slug);
  const localOnly = entries.filter((e) => e.status === "local_only").map((e) => e.slug);
  const fold = corpusFoldPackCiteField();
  return {
    ok: true,
    spec: SUITE_PACK_SPEC,
    id: SUITE_PACK_ID,
    kind: SUITE_PACK_KIND,
    filename: SUITE_PACK_FILENAME,
    author: SUITE_PACK_AUTHOR,
    identity: SUITE_PACK_IDENTITY,
    author_id: AUTHOR_ID,
    product: PRODUCT_NAME,
    version: extra.runtimeVersion || extra.version || "2.0.0-rc1",
    git_sha: extra.git_sha || extra.gitSha || catalog.git_sha || null,
    door: "fraggate",
    counted: true,
    counted_note:
      "GET /download increments USES when the binding is up (same API-use counter, no PII). Not a product-Worker tarball counter. Not QNM-S.",
    labels: { ...SUITE_PACK_LABELS },
    honesty: {
      worker_wasm_bundle: "SLOT — this isolate is the deployed Worker, not a downloadable wasm/wrangler binary.",
      software_catalog: "REAL — in-process GET /v1/software cards.",
      foldlock_tip: "REAL tip cite — full_library_in_process false.",
      wireguard_openvpn_l3: "SLOT — AZVPN HTTPS/WS is the REAL concentrator.",
      qnm_node: "CITE — local process; Worker does not ship qnm-node bytes.",
      fielded_100: false,
      invented_binary: false,
    },
    hashtag_parts: { person: "#aziel", runtime: "#runtime", suite: "#aziel-runtime" },
    about: aboutAzielCiteField(),
    foldlock_tip: fold,
    mesh: {
      path: "/v1/mesh",
      nine_laws: nineLawsHint(),
      channel_plane: channelPlaneCite(),
      vpn: publicVpnCite(),
      get_never_enables: true,
      worker_hardware: false,
      live_nodes_plane: "instance",
      software_nodes_plane: "software-worker-fanout",
      live_nodes_note:
        "Public Live Nodes count living downloaded Softwares instances that join or heartbeat. This pack download is not live. A running instance should POST /v1/mesh/join with product + an instance node_id (not {slug}-worker), then heartbeat inside 5 minutes.",
      instance_join: {
        path: "/v1/mesh/join",
        heartbeat: "/v1/mesh/heartbeat",
        product_required: true,
        node_id: "instance id 8–80 [a-z0-9._-]; do not use {slug}-worker",
        presence_ttl_ms: 5 * 60 * 1000,
        downloads_are_not_live: true,
      },
    },
    catalog: {
      count: catalog.count,
      live_count: catalog.live_count,
      local_only_count: catalog.local_only_count || 0,
      stub_count: catalog.stub_count,
      software: catalog.software,
    },
    fraggate: {
      live_count: registry && registry.live_count,
      local_only_count: registry && registry.local_only_count,
      live_slugs: live,
      local_only_slugs: localOnly,
      list: `${base}/v1/fraggate/list`,
    },
    docs_cite: SUITE_PACK_DOCS_CITE.slice(),
    docs_bytes: "CITE — git-hosted; this isolate does not attach the markdown files.",
    paths: suitePackPaths(base),
    note:
      "One-click suite pack for humans and machines. Packs what ships in-process. Worker wasm, WireGuard/OpenVPN, and qnm-node stay SLOT/CITE. FragGate is THE exec door. Identity Aziel Eliab only. Never fielded_100.",
  };
}

export function suitePackResponseHeaders(extra = {}) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${SUITE_PACK_FILENAME}"`,
    "X-Aziel-Suite-Pack": SUITE_PACK_SPEC,
    "Cache-Control": "no-store",
    ...extra,
  };
}

export function suiteDownloadHtml(origin, { id = "suite-download" } = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  return `<div class="suite-dl" id="${id}" style="border:1px solid #7a6224;background:#1f1a0d;border-radius:10px;padding:.7rem .85rem;margin:.55rem 0 1rem">
  <p class="hint" style="margin:0 0 .45rem"><strong>One-click suite pack</strong> — REAL catalog + FoldLock tip + mesh cite. Worker wasm / WireGuard / OpenVPN stay <strong>SLOT</strong>. Not fielded_100. Counted on <code>GET /download</code>.</p>
  <div class="actions">
    <a class="suite-dl-btn" href="${base}/download" download="${SUITE_PACK_FILENAME}" style="display:inline-block;background:#241c0d;color:#f0d78c;border:1px solid #5c4a1a;border-radius:8px;padding:.45rem .85rem;font-weight:700;text-decoration:none">Download suite pack (JSON)</a>
    <a href="${base}/v1/suite/download">Machine /v1/suite/download</a>
  </div>
</div>`;
}
