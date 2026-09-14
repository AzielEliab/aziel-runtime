/**
 * INGEST-RECEIPT-1.0: four laws, re-expand, reheal, no Softwares card.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import {
  CROSS_NETWORK_SURVIVAL,
  INGEST_FOUR_LAWS,
  INGEST_GROWTH,
  INGEST_NOTE,
  INGEST_PAPER,
  INGEST_SPEC,
  INGEST_SURVIVAL,
  INGEST_TIP_STRING,
  REEXPAND_ENOUGH,
  REEXPAND_NOT_ENOUGH,
  REHEAL_ALLOWED_CHATTER,
  dispatchIngestHttp,
  ingestCiteField,
  ingestHint,
  ingestHomepageHtml,
  ingestLlmsBlock,
  ingestSkillText,
  ingestStatus,
} from "../src/ingest-receipt.js";

const paper = readFileSync(new URL("../docs/designs/INGEST-RECEIPT-1.0.md", import.meta.url), "utf8");
const pdf = readFileSync(new URL("../docs/designs/INGEST-RECEIPT-1.0.pdf", import.meta.url));
assert.ok(pdf.slice(0, 5).toString() === "%PDF-");
assert.match(paper, /^# INGEST-RECEIPT-1\.0/m);
assert.match(paper, /Cite, don't merge/);
assert.match(paper, /Many indexes, one tip/);
assert.match(paper, /Training is lossy/);
assert.match(paper, /Public verify/);
assert.match(paper, /RE-EXPAND-FROM-ARCHIVE/);
assert.match(paper, /REHEAL/);
assert.match(paper, /Growth: ON/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /vote-to-fix/);
assert.match(paper, /phoenix-WAIT/);
assert.match(paper, /live \/ locked \/ isolated \/ tip-hash/);
assert.match(paper, /Training residue alone = rumor/);
assert.match(paper, /Crawlers are extra shelves/);
assert.match(paper, /CROSS-NETWORK-SURVIVAL/);
assert.match(paper, /bytes↔hash across independent hosts/);
assert.match(paper, /survive network death/);
assert.ok(paper.includes(INGEST_TIP_STRING), "git paper must carry the HTML+git tip string verbatim");
assert.doesNotMatch(paper, /Softwares-tab product slug ingest/i);

assert.equal(INGEST_SPEC, "INGEST-RECEIPT-1.0");
assert.equal(INGEST_GROWTH, "ON");
assert.equal(INGEST_FOUR_LAWS.length, 4);
assert.equal(INGEST_FOUR_LAWS[0].name, "Cite, don't merge");
assert.equal(INGEST_FOUR_LAWS[1].name, "Many indexes, one tip");
assert.equal(INGEST_FOUR_LAWS[2].name, "Training is lossy");
assert.equal(INGEST_FOUR_LAWS[3].name, "Public verify");
assert.match(INGEST_TIP_STRING, /FragGate ledger_tip/);
assert.match(INGEST_TIP_STRING, /lockset_sha256/);
assert.match(INGEST_NOTE, /Growth-ON/);

assert.ok(SUITE_DESIGNS.some((d) => d.id === "INGEST-RECEIPT-1.0" && d.kind === "fabric" && d.file === "INGEST-RECEIPT-1.0.md"));

const cite = ingestStatus("https://aziel-runtime.example");
assert.equal(cite.ok, true);
assert.equal(cite.spec, INGEST_SPEC);
assert.equal(cite.identity, "Aziel Eliab");
assert.equal(cite.software_tab, false);
assert.equal(cite.fraggate_slug, false);
assert.equal(cite.growth, "ON");
assert.equal(cite.growth_on, true);
assert.equal(cite.umbrella, CROSS_NETWORK_SURVIVAL);
assert.equal(cite.survival, INGEST_SURVIVAL);
assert.equal(cite.cross_network_survival.umbrella, true);
assert.equal(cite.cross_network_survival.survive_network_death, true);
assert.equal(cite.cross_network_survival.crawlers_do_not_re_expand, true);
assert.equal(cite.cross_network_survival.bytes_hash_across_independent_hosts, true);
assert.equal(cite.tip_string, INGEST_TIP_STRING);
assert.equal(cite.paper, INGEST_PAPER);
assert.equal(cite.ingest_as_receipt.cite_dont_merge, true);
assert.equal(cite.ingest_as_receipt.crawlers_do_not_re_expand, true);
assert.equal(cite.ingest_as_receipt.crawlers_do_not_reheal, true);
assert.equal(cite.ingest_as_receipt.training_residue_alone, "rumor");
assert.equal(cite.re_expand_from_archive.restore_from_archive, true);
assert.equal(cite.re_expand_from_archive.not_mesh_growing_from_index, true);
assert.deepEqual(cite.re_expand_from_archive.enough, REEXPAND_ENOUGH.slice());
assert.deepEqual(cite.re_expand_from_archive.not_enough, REEXPAND_NOT_ENOUGH.slice());
assert.equal(cite.reheal.vote_to_fix, false);
assert.equal(cite.reheal.poisoned_node_listens_to_neighbors, false);
assert.deepEqual(cite.reheal.allowed_chatter, REHEAL_ALLOWED_CHATTER.slice());
assert.ok(cite.reheal.heal_from.includes("phoenix-WAIT"));
assert.equal(cite.planes.ingest_as_receipt, "crawlers");
assert.equal(cite.planes.re_expand_from_archive, "archive");
assert.equal(cite.planes.reheal, "poisoned-node");
assert.equal(cite.stable_ids.person, "https://www.azieleliab.com/#aziel");
assert.equal(cite.canonical_urls.ingest, "https://aziel-runtime.example/v1/ingest");

const hint = ingestHint();
assert.equal(hint.software_tab, false);
assert.equal(hint.growth_on, true);
assert.equal(hint.tip_string, INGEST_TIP_STRING);

const field = ingestCiteField("https://aziel-runtime.example");
assert.match(field.how_to_cite, /INGEST-RECEIPT-1\.0/);
assert.equal(field.reheal.vote_to_fix, false);

const get = dispatchIngestHttp("GET", "/v1/ingest", {});
assert.equal(get.status, 200);
assert.equal(get.body.spec, INGEST_SPEC);
assert.equal(get.body.tip_string, INGEST_TIP_STRING);

const reexpand = dispatchIngestHttp("GET", "/v1/ingest/reexpand", {});
assert.equal(reexpand.status, 200);
assert.equal(reexpand.body.focus, "RE-EXPAND-FROM-ARCHIVE");
assert.equal(reexpand.body.re_expand_from_archive.crawlers_do_not_re_expand, true);

const reheal = dispatchIngestHttp("GET", "/v1/ingest/reheal", {});
assert.equal(reheal.status, 200);
assert.equal(reheal.body.focus, "REHEAL");
assert.equal(reheal.body.reheal.vote_to_fix, false);

const laws = dispatchIngestHttp("GET", "/v1/ingest/laws", {});
assert.equal(laws.status, 200);
assert.equal(laws.body.focus, "INGEST-AS-RECEIPT");

const survival = dispatchIngestHttp("GET", "/v1/ingest/survival", {});
assert.equal(survival.status, 200);
assert.equal(survival.body.focus, CROSS_NETWORK_SURVIVAL);
assert.equal(survival.body.cross_network_survival.survival, INGEST_SURVIVAL);

const unknown = dispatchIngestHttp("GET", "/v1/ingest/vote", {});
assert.equal(unknown.status, 404);
assert.equal(unknown.body.code, "INGEST-CITE-ONLY");

const post = dispatchIngestHttp("POST", "/v1/ingest", {});
assert.equal(post.status, 405);
assert.equal(post.body.code, "INGEST-CITE-ONLY");

const vote = dispatchIngestHttp("POST", "/v1/ingest/reheal", { vote: true });
assert.equal(vote.status, 403);
assert.equal(vote.body.code, "INGEST-NO-EXEC");

const restore = dispatchIngestHttp("POST", "/v1/ingest", { reexpand: true });
assert.equal(restore.status, 403);

const html = ingestHomepageHtml();
assert.ok(html.includes(INGEST_TIP_STRING.replace(/&/g, "&amp;")) || html.includes(INGEST_TIP_STRING));
assert.match(html, /RE-EXPAND-FROM-ARCHIVE/);
assert.match(html, /REHEAL/);
assert.match(html, /vote-to-fix/);

const llms = ingestLlmsBlock("https://aziel-runtime.example");
assert.ok(llms.includes(INGEST_TIP_STRING));
assert.match(llms, /Growth-ON/);

const skill = ingestSkillText();
assert.match(skill, /INGEST-RECEIPT-1\.0/);
assert.ok(skill.includes(INGEST_TIP_STRING));

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function http(path, init = {}) {
  return handler(new Request(origin + path, init), {});
}

const res = await http("/v1/ingest");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.spec, "INGEST-RECEIPT-1.0");
assert.equal(body.growth, "ON");
assert.equal(body.software_tab, false);
assert.equal(body.tip_string, INGEST_TIP_STRING);
assert.equal(body.reheal.vote_to_fix, false);
assert.equal(body.re_expand_from_archive.bytes_survive, true);
assert.equal(body.umbrella, CROSS_NETWORK_SURVIVAL);
assert.equal(body.survival, INGEST_SURVIVAL);

const head = await http("/v1/ingest", { method: "HEAD" });
assert.equal(head.status, 200);

const refused = await http("/v1/ingest", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ reheal: true }),
});
assert.equal(refused.status, 403);

const home = await (await http("/")).text();
assert.match(home, /INGEST-RECEIPT-1\.0/);
assert.ok(home.includes(INGEST_TIP_STRING), "homepage HTML must publish the same tip string as git");
assert.match(home, /RE-EXPAND-FROM-ARCHIVE/);
assert.match(home, /REHEAL/);
assert.match(home, /vote-to-fix/);
assert.match(home, /CROSS-NETWORK-SURVIVAL/);
assert.match(home, /bytes↔hash|bytes&harr;hash/);

const llmsTxt = await (await http("/llms.txt")).text();
assert.match(llmsTxt, /INGEST-RECEIPT-1\.0/);
assert.ok(llmsTxt.includes(INGEST_TIP_STRING));
assert.match(llmsTxt, /Cite, don't merge/);
assert.match(llmsTxt, /REHEAL/);
assert.match(llmsTxt, /CROSS-NETWORK-SURVIVAL/);
assert.match(llmsTxt, /bytes↔hash across independent hosts/);

const citeJson = await (await http("/cite.json")).json();
assert.ok(citeJson.designs.papers.some((p) => p.id === "INGEST-RECEIPT-1.0" && p.kind === "fabric" && p.software_tab === false));
assert.equal(citeJson.ingest_receipt.spec, INGEST_SPEC);
assert.equal(citeJson.ingest_receipt.growth_on, true);
assert.equal(citeJson.ingest_receipt.tip_string, INGEST_TIP_STRING);
assert.equal(citeJson.ingest_receipt.reheal.vote_to_fix, false);
assert.equal(citeJson.ingest_receipt.umbrella, CROSS_NETWORK_SURVIVAL);
assert.equal(citeJson.ingest_receipt.survival, INGEST_SURVIVAL);
assert.equal(citeJson.ingest_receipt.cross_network_survival.survive_network_death, true);

const skillTxt = await (await http("/v1/skill")).text();
assert.match(skillTxt, /INGEST-RECEIPT-1\.0/);
assert.match(skillTxt, /\/v1\/ingest/);
assert.ok(skillTxt.includes(INGEST_TIP_STRING));

const sitemap = await (await http("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/ingest/);
assert.match(sitemap, /INGEST-RECEIPT-1\.0\.md/);

const openapi = await (await http("/openapi.json")).json();
assert.ok(openapi.paths["/v1/ingest"]);
assert.match(openapi.paths["/v1/ingest"].get.summary, /INGEST-RECEIPT-1\.0/);
assert.match(openapi.paths["/v1/ingest"].get.summary, /Growth-ON/);

const runtime = await (await http("/v1/runtime.json")).json();
assert.equal(runtime.fabric.ingest_receipt, "INGEST-RECEIPT-1.0");
assert.equal(runtime.endpoints.ingest, origin + "/v1/ingest");
assert.equal(runtime.fabric.ingest_growth, "ON");

const software = await (await http("/v1/software")).json();
assert.ok(!software.software.some((s) => /ingest|reheal|reexpand/i.test(s.slug)));
assert.equal(software.software.length, PRODUCTS.length + NAMED_STUBS.length);
assert.equal(software.ingest_receipt.spec, INGEST_SPEC);
assert.equal(software.ingest_receipt.software_tab, false);

const catalog = await (await http("/v1/catalog.json")).json();
assert.ok(!catalog.products.some((p) => /ingest|reheal|reexpand/i.test(p.slug)));
assert.ok(!catalog.extras.some((e) => /ingest|reheal|reexpand/i.test(e.slug)));

const mcp = await http("/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
});
const init = await mcp.json();
assert.match(init.result.instructions, /INGEST-RECEIPT-1\.0/);
assert.match(init.result.instructions, /REHEAL/);
assert.match(init.result.instructions, /vote-to-fix/);
assert.match(init.result.instructions, /CROSS-NETWORK-SURVIVAL/);

const tools = await http("/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
});
const listed = (await tools.json()).result.tools;
assert.ok(!listed.some((t) => /ingest|reheal|reexpand/i.test(t.name)), "no INGEST-RECEIPT MCP product tool");

const describe = await (await http("/v1/fraggate/describe?slug=peacelock")).json();
assert.ok(describe.ok === true || describe.slug === "peacelock" || describe.name || describe.entry);
const describeText = JSON.stringify(describe);
assert.match(describeText, /INGEST-RECEIPT-1\.0|ingest_receipt/);

console.log(`ok ingest-receipt ${INGEST_SPEC}: four laws, re-expand, reheal, growth-ON, no software card`);
