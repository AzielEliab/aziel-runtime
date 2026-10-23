// Every wired DOI: Zenodo record removed (2026-09-02), no live replacement
// (doi.org answers 302 to the removed Zenodo record). HTML keeps each DOI as text and links the product's repo paper;
// it must never link https://doi.org/ (dead). Data fields (cite.json doi/doi_url,
// JSON-LD identifier) are unchanged.
import worker, { PRODUCTS } from "../src/index.js";
import { DOI_BY_SLUG, PAPER_URL_BY_SLUG } from "../src/catalog-meta.js";

globalThis.fetch = async () => new Response("offline", { status: 503 });
const ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
const ctx = { waitUntil() {}, passThroughOnException() {} };
const get = (path, accept = "text/html") => worker.fetch(new Request(ORIGIN + path, { headers: { accept } }), {}, ctx);

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error("FAIL " + msg);
  }
};

const slugs = Object.keys(DOI_BY_SLUG);
ok(slugs.length === 15 && new Set(Object.values(DOI_BY_SLUG)).size === 14, "15 products / 14 unique historical DOIs unchanged");
ok(JSON.stringify(Object.keys(PAPER_URL_BY_SLUG).sort()) === JSON.stringify(slugs.sort()), "a paper link for every DOI slug");
for (const slug of slugs) {
  const p = PRODUCTS.find((x) => x.slug === slug);
  ok(p && p.doi === DOI_BY_SLUG[slug], `${slug}: product DOI unchanged`);
  ok(PAPER_URL_BY_SLUG[slug].startsWith(`${p.github}/blob/main/docs/`), `${slug}: paper link is in ${p.github}`);
}

const pages = { "/": await (await get("/")).text() };
for (const slug of slugs) pages[`/p/${slug}`] = await (await get(`/p/${slug}`)).text();
for (const [path, page] of Object.entries(pages)) {
  ok(!/href="https?:\/\/(dx\.)?doi\.org\//.test(page), `${path}: no dead doi.org href`);
  ok(!page.includes("doi.org 410"), `${path}: no unverified 'doi.org 410' wording`);
}
for (const slug of slugs) {
  ok(pages["/"].includes(`<span class="doi">${DOI_BY_SLUG[slug]}</span>`), `/ keeps DOI text for ${slug}`);
  ok(pages["/"].includes(`href="${PAPER_URL_BY_SLUG[slug]}"`), `/ links ${slug} paper`);
  ok(pages[`/p/${slug}`].includes(`<span class="doi">${DOI_BY_SLUG[slug]}</span>`), `/p/${slug} keeps DOI text`);
  ok(pages[`/p/${slug}`].includes(`href="${PAPER_URL_BY_SLUG[slug]}"`), `/p/${slug} links its paper`);
  ok(pages[`/p/${slug}`].includes("Zenodo record removed (2026-09-02)"), `/p/${slug} says Zenodo record removed (2026-09-02)`);
}

if (failed) {
  console.error(`verify-doi-paper-links: ${failed} failed`);
  process.exit(1);
}
console.log(`verify-doi-paper-links: ${slugs.length} DOIs kept as text, ${slugs.length} repo paper links, no doi.org href on / or /p/<slug>`);
