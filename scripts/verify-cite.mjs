/**
 * Guardrails: no invented DOIs; related identifiers + tarball citations present.
 */
import assert from "node:assert/strict";
import {
  VERSIONS,
  DOI_BY_SLUG,
  DOI_KIND_BY_SLUG,
  SHARED_METHOD_PAPER_DOI,
  FIRST_TIME_DEPOSIT_SLUGS,
  relatedIdentifiers,
  softwareTarball,
  citationFields,
  zenodoDepositMetadata,
  citeZenodoBlock,
  productHowToCite,
} from "../src/catalog-meta.js";

const KNOWN_DOIS = new Set(Object.values(DOI_BY_SLUG));

for (const [slug, doi] of Object.entries(DOI_BY_SLUG)) {
  assert.match(doi, /^10\.5281\/zenodo\.\d+$/, `${slug} DOI shape`);
  assert.ok(!doi.includes("XXXX"), `${slug} must not be a placeholder DOI`);
}

for (const slug of FIRST_TIME_DEPOSIT_SLUGS) {
  assert.equal(DOI_BY_SLUG[slug], undefined, `${slug} must not invent a DOI`);
}

assert.equal(DOI_BY_SLUG.foldlock, SHARED_METHOD_PAPER_DOI);
assert.equal(DOI_BY_SLUG.whistlelock, SHARED_METHOD_PAPER_DOI);
assert.equal(DOI_KIND_BY_SLUG.foldlock, "shared_method_paper");
assert.equal(DOI_KIND_BY_SLUG.whistlelock, "shared_method_paper");

const slugs = Object.keys(VERSIONS);
assert.ok(slugs.includes("azieltether"));
assert.ok(slugs.includes("peacelock"));
assert.ok(slugs.includes("azmail"));
assert.ok(slugs.includes("azbrowser"));
assert.ok(slugs.includes("aznet"));
assert.ok(slugs.includes("azhub"));
assert.ok(slugs.includes("azinterface"));
assert.ok(slugs.includes("aziel-corpus"));
assert.ok(slugs.includes("4dmap"));
assert.ok(slugs.includes("azcoherence"));
assert.ok(slugs.includes("embryolock"));

for (const slug of slugs) {
  const version = VERSIONS[slug];
  const github =
    slug === "zsolver"
      ? "https://github.com/AzielEliab/zion-pattern-solver"
      : slug === "postking"
        ? "https://github.com/AzielEliab/postking-chess"
        : slug === "azclce"
          ? "https://github.com/AzielEliab/az-clce"
          : slug === "azcoherence"
            ? "https://github.com/AzielEliab/AZCoherence"
            : `https://github.com/AzielEliab/${slug}`;
  const download =
    slug === "aziel-corpus"
      ? "https://www.azielcorpuslibrary.net/download"
      : `https://${slug}-download-tracker.vibelock.workers.dev/download`;
  const product = {
    slug,
    name: slug,
    github,
    version,
    doi: DOI_BY_SLUG[slug] || null,
    oneLine: slug,
    banner: "",
  };
  const urls = { download };
  const ids = relatedIdentifiers(product, urls);
  assert.equal(ids[0].identifier, github);
  assert.equal(ids[0].relation, "isSupplementTo");
  assert.equal(ids[0].resource_type, "software");
  assert.equal(ids[1].identifier, download);
  assert.equal(ids[1].relation, "isIdenticalTo");
  assert.equal(ids[1].resource_type, "software");
  if (DOI_KIND_BY_SLUG[slug] === "shared_method_paper") {
    assert.equal(ids[2].identifier, SHARED_METHOD_PAPER_DOI);
    assert.equal(ids[2].relation, "isDocumentedBy");
    assert.equal(ids[2].scheme, "doi");
  }

  const tarball = softwareTarball(slug, version, download);
  if (slug === "aziel-corpus") {
    assert.equal(tarball.filename, "aziel-digital-library-2.6.2.zip");
    assert.equal(tarball.content_type, "application/zip");
  } else {
    assert.equal(tarball.filename, `${slug}-${version}.tar.gz`);
    assert.equal(tarball.content_type, "application/gzip");
  }

  const cite = citationFields(product, urls);
  assert.equal(cite.software_deposit_needed, true);
  assert.deepEqual(cite.zenodo_deposit.metadata.creators, [{ name: "Eliab, Aziel" }]);
  const meta = zenodoDepositMetadata(product, urls);
  assert.equal(meta.upload_type, "software");
  assert.equal(meta.license, "Apache-2.0");
  assert.match(productHowToCite(product), /Eliab, Aziel/);
  if (!DOI_BY_SLUG[slug]) {
    assert.equal(cite.doi, null);
    assert.equal(cite.zenodo_status, "deposit_needed");
  } else {
    assert.ok(KNOWN_DOIS.has(cite.doi));
  }
}

const block = citeZenodoBlock();
assert.equal(block.audit.live_aziel_eliab_records, 0);
assert.deepEqual(block.first_time_deposits, FIRST_TIME_DEPOSIT_SLUGS);
assert.equal(block.shared_method_paper.doi, SHARED_METHOD_PAPER_DOI);
assert.ok(block.curl.create_deposition.includes("zenodo.org/api/deposit/depositions"));

const handler = (await import("../src/index.js")).default.fetch;
const citeRes = await handler(new Request("https://aziel-runtime.example/cite.json"), {});
const catalogRes = await handler(new Request("https://aziel-runtime.example/v1/catalog.json"), {});
const citeBody = await citeRes.json();
const catalogBody = await catalogRes.json();
assert.equal(citeRes.status, 200);
assert.equal(citeBody.author, "Aziel Eliab");
assert.equal(citeBody.aka, "Aziel Elroi Eliab");
assert.equal(citeBody.alternateName, "Aziel Elroi Eliab");
assert.equal(citeBody.identity, "Aziel Eliab");
assert.equal(citeBody.stats.person_id, "https://www.azieleliab.com/#aziel");
assert.equal(citeBody.social_status.author, "Aziel Eliab");
assert.equal(catalogBody.stats.person_id, "https://www.azieleliab.com/#aziel");
assert.ok(catalogBody.social_status.hubs.some((h) => h.id === "godlock" && h.stats === "https://godlock.uk/stats"));
assert.ok(citeBody.stats.hubs.some((h) => h.id === "corpus" && h.stats === "https://www.azielcorpuslibrary.net/stats" && h.version === "https://www.azielcorpuslibrary.net/v1/health"));
assert.ok(catalogBody.stats.hubs.some((h) => h.id === "corpus" && !h.stats.endsWith("/v1/stats")));
assert.match(citeBody.library_how_to_cite, /Aziel Digital Library/);
assert.equal(citeBody.products.length, slugs.length);
assert.equal(catalogBody.count, slugs.length);
assert.ok(!catalogBody.products.some((p) => p.slug === "fraggate"));
assert.equal(catalogBody.door, "fraggate");
assert.equal(catalogBody.fraggate.slug, "fraggate");
assert.equal(catalogBody.fraggate.github, "https://github.com/AzielEliab/fraggate");
assert.ok(catalogBody.extras.some((e) => e.slug === "fraggate"));
assert.ok(catalogBody.extras.some((e) => e.slug === "mesh" && e.kind === "kernel"));
assert.ok(citeBody.extras.some((e) => e.slug === "fraggate"));
assert.ok(citeBody.extras.some((e) => e.slug === "mesh"));
assert.ok(citeBody.semantic_bridge);
assert.equal(citeBody.semantic_bridge.spec, "CAP-7");
assert.equal(citeBody.semantic_bridge.factory, "miragegrid");
assert.equal(citeBody.semantic_bridge.resolves_to_hub, false);
assert.equal(citeBody.semantic_bridge.inherit, "designs");
assert.equal(citeBody.semantic_bridge.public_icann, false);
assert.equal(citeBody.semantic_bridge.az_gen_live_registrar, false);
assert.equal(citeBody.semantic_bridge.visible_1520, false);
assert.equal(citeBody.semantic_bridge.mesh_get_never_enables, true);
assert.ok(citeBody.semantic_bridge.not_aliases_of.includes("https://www.azieleliab.com/"));
assert.equal(citeBody.semantic_bridge.name_may_change, true);
assert.equal(citeBody.semantic_bridge.fifth_product, false);
assert.ok(citeBody.website_designs);
assert.deepEqual(citeBody.website_designs.ids, ["azcorpus", "azlibrary"]);
assert.equal(citeBody.website_designs.designs.find((d) => d.id === "azlibrary").upload.never_embed_secret, true);
assert.ok(catalogBody.website_designs);
assert.deepEqual(catalogBody.website_designs.ids, ["azcorpus", "azlibrary"]);
assert.ok(citeBody.designs);
assert.equal(citeBody.designs.folder, "docs/designs/");
assert.match(citeBody.designs.how_to_cite, /Eliab, Aziel/);
assert.equal(citeBody.designs.papers.length, 26);
assert.ok(citeBody.designs.papers.some((p) => p.id === "AKM-TRIAD-1.0" && p.path === "docs/designs/AKM-TRIAD-1.0.md" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "ACT-RECEIPT-1.0" && p.path === "docs/designs/ACT-RECEIPT-1.0.md" && p.kind === "fabric" && p.software_tab === false));
assert.ok(citeBody.designs.papers.some((p) => p.id === "QNS-CD-1.0" && p.path === "docs/designs/QNS-CD-1.0.md" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "4DM-WP-1.0" && p.path === "docs/designs/4DM-WP-1.0.md" && p.kind === "software"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "SUITE-PIPE-1.6.15" && p.path === "docs/designs/SUITE-PIPE-1.6.15.md" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "MASTER-33" && p.path === "docs/designs/MASTER-33-SOFTWARE.md" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "MASTER-ARCHITECTURE-2.0" && p.path === "docs/designs/MASTER-ARCHITECTURE-2.0.md"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "CL-WP-0.4" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "SG-WP-0.1"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "RL-WP-0.1" && p.path === "docs/designs/RL-WP-0.1-runtime.md"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "SEC-FEAT-1.0" && p.path === "docs/designs/SEC-FEAT-1.0.md"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "REMAIN-OFF-BY-DESIGN-2026-09-10" && p.path === "docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md" && p.kind === "law"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "AZRT-1.9-CLOSE-1.0" && p.path === "docs/designs/AZRT-1.9-CLOSE-1.0.md" && p.kind === "law"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "AZRT-1.9-GAPS-CLOSE" && p.path === "docs/designs/AZRT-1.9-GAPS-CLOSE.md" && p.kind === "law"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "AZL-DONATE-1.0" && p.path === "docs/designs/AZL-DONATE-1.0.md" && p.kind === "law" && p.software_tab === false));
assert.ok(citeBody.designs.papers.some((p) => p.id === "CROSS-NETWORK-SURVIVAL-1.0" && p.path === "docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md" && p.kind === "law" && p.software_tab === false));
assert.ok(citeBody.designs.papers.some((p) => p.id === "NO-LIE-NO-REWRITE-1.0" && p.path === "docs/designs/NO-LIE-NO-REWRITE-1.0.md" && p.kind === "law" && p.software_tab === false));
assert.ok(citeBody.designs.papers.some((p) => p.id === "REDLINE-2026-09-14" && p.path === "docs/designs/REDLINE-2026-09-14.md" && p.kind === "law" && p.software_tab === false));
assert.ok(citeBody.designs.papers.some((p) => p.id === "COLD-MULTI-SHELF-1.0" && p.path === "docs/designs/COLD-MULTI-SHELF-1.0.md" && p.kind === "law" && p.software_tab === false));
assert.equal(citeBody.semantic_bridge.design_of, "hub_designs");
assert.equal(citeBody.redline.spec, "REDLINE-2026-09-14");
assert.equal(citeBody.redline.person_id, "https://www.azieleliab.com/#aziel");
assert.equal(citeBody.redline.cap7.design_of, "hub_designs");
assert.equal(citeBody.redline.cap7.resolves_to_hub, false);
assert.equal(citeBody.redline.attack_sims.pointer, "scripts/verify-redline.mjs");
assert.equal(citeBody.tls.via, "cloudflare");
assert.equal(citeBody.tls.client_side_crypto_claim, false);
assert.equal(citeBody.shelves.spec, "COLD-MULTI-SHELF-1.0");
assert.equal(citeBody.shelves.redline.spec, "REDLINE-2026-09-14");
assert.equal(citeBody.shelves.cap7.design_of, "hub_designs");
assert.equal(citeBody.shelves.cap7.resolves_to_hub, false);
assert.equal(citeBody.shelves.attack_sims.pointer, "scripts/verify-redline.mjs");
assert.equal(citeBody.shelves.lockset_doi, null);
assert.equal(citeBody.shelves.independent_live_count, 1);
assert.equal(citeBody.shelves.published_surfaces, 5);
assert.equal(citeBody.shelves.runtime_is_shelf, false);
assert.equal(citeBody.shelves.visible_1520, false);
assert.equal(citeBody.cold_multi_shelf, "COLD-MULTI-SHELF-1.0");
assert.equal(citeBody.survival.spec, "CROSS-NETWORK-SURVIVAL-1.0");
assert.equal(
  citeBody.survival.tip,
  "CROSS-NETWORK-SURVIVAL-1.0: someone still has bytes that match the published tip — not a living network, not LLM memory, not a public hostname that still answers.",
);
assert.ok(citeBody.designs.papers.every((p) => p.github.includes("/blob/main/docs/designs/")));
assert.ok(citeBody.audits);
assert.equal(citeBody.audits.folder, "docs/audit/");
assert.equal(citeBody.audits.author, "Aziel Eliab");
assert.equal(citeBody.audits.identity, "Aziel Eliab");
assert.equal(citeBody.audits.not_software_tab, true);
assert.equal(citeBody.audits.not_fraggate_slug, true);
assert.equal(citeBody.audits.mesh_get_never_enables, true);
assert.equal(citeBody.audits.feature_state.id, "FEATURE-STATE-2026-09-10");
assert.equal(citeBody.audits.feature_state.path, "docs/audit/FEATURE-STATE-2026-09-10.md");
assert.equal(citeBody.audits.feature_state.kind, "audit");
assert.equal(citeBody.audits.feature_state.software_tab, false);
assert.equal(citeBody.audits.feature_state.fraggate_slug, false);
assert.equal(citeBody.audits.feature_state.authoritative_for, "1.7.3+");
assert.match(citeBody.audits.feature_state.github, /FEATURE-STATE-2026-09-10\.md/);
assert.match(citeBody.audits.feature_state.pdf, /FEATURE-STATE-2026-09-10\.pdf/);
assert.match(citeBody.audits.feature_state.how_to_cite, /Eliab, Aziel/);
assert.equal(citeBody.audits.feature_state.companion, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.equal(citeBody.audits.remain_off_by_design.id, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.equal(citeBody.audits.remain_off_by_design.path, "docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md");
assert.equal(citeBody.audits.remain_off_by_design.kind, "law");
assert.equal(citeBody.audits.remain_off_by_design.item_count, 33);
assert.equal(citeBody.audits.remain_off_by_design.do_not_enable, true);
assert.equal(citeBody.audits.remain_off_by_design.companion, "FEATURE-STATE-2026-09-10");
assert.equal(citeBody.audits.remain_off_by_design.software_tab, false);
assert.equal(citeBody.audits.remain_off_by_design.fraggate_slug, false);
assert.match(citeBody.audits.remain_off_by_design.github, /REMAIN-OFF-BY-DESIGN-2026-09-10\.md/);
assert.match(citeBody.audits.remain_off_by_design.pdf, /REMAIN-OFF-BY-DESIGN-2026-09-10\.pdf/);
assert.match(citeBody.audits.remain_off_by_design.how_to_cite, /Eliab, Aziel/);
assert.equal(catalogBody.fraggate.worker, "fraggate-download-tracker");
assert.equal(catalogBody.fraggate.engine, false);
assert.equal(catalogBody.fraggate.worker_home, "https://fraggate-download-tracker.vibelock.workers.dev/");
assert.equal(catalogBody.fraggate.download, "https://fraggate-download-tracker.vibelock.workers.dev/download");
assert.equal(citeBody.fraggate.worker, "fraggate-download-tracker");
const wl = citeBody.products.find((p) => p.slug === "whistlelock");
assert.equal(wl.doi, SHARED_METHOD_PAPER_DOI);
assert.equal(wl.doi_kind, "shared_method_paper");
assert.equal(wl.software_tarball.filename, "whistlelock-0.1.0.tar.gz");
const god = citeBody.products.find((p) => p.slug === "godlock");
assert.equal(god.doi, null);
assert.equal(god.zenodo_status, "deposit_needed");
assert.ok(god.related_identifiers.length >= 2);

console.log(
  `ok ${slugs.length} products, ${Object.keys(DOI_BY_SLUG).length} historical DOIs, ${FIRST_TIME_DEPOSIT_SLUGS.length} first-time deposits`,
);
