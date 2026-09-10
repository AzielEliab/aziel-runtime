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

for (const slug of slugs) {
  const version = VERSIONS[slug];
  const github =
    slug === "zsolver"
      ? "https://github.com/AzielEliab/zion-pattern-solver"
      : slug === "postking"
        ? "https://github.com/AzielEliab/postking-chess"
        : slug === "azclce"
          ? "https://github.com/AzielEliab/az-clce"
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
assert.ok(citeBody.designs);
assert.equal(citeBody.designs.folder, "docs/designs/");
assert.match(citeBody.designs.how_to_cite, /Eliab, Aziel/);
assert.equal(citeBody.designs.papers.length, 14);
assert.ok(citeBody.designs.papers.some((p) => p.id === "QNS-CD-1.0" && p.path === "docs/designs/QNS-CD-1.0.md" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "4DM-WP-1.0" && p.path === "docs/designs/4DM-WP-1.0.md" && p.kind === "software"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "SUITE-PIPE-1.6.15" && p.path === "docs/designs/SUITE-PIPE-1.6.15.md" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "CL-WP-0.4" && p.kind === "fabric"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "SG-WP-0.1"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "RL-WP-0.1" && p.path === "docs/designs/RL-WP-0.1-runtime.md"));
assert.ok(citeBody.designs.papers.some((p) => p.id === "SEC-FEAT-1.0" && p.path === "docs/designs/SEC-FEAT-1.0.md"));
assert.ok(citeBody.designs.papers.every((p) => p.github.includes("/blob/main/docs/designs/")));
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
