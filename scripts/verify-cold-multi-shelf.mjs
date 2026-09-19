/**
 * COLD-MULTI-SHELF-1.0: runtime cite matches corpus#96 /shelves honesty.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUITE_DESIGNS } from "../src/seo.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import {
  COLD_MULTI_SHELF,
  COLD_MULTI_SHELF_DOCS,
  COLD_MULTI_SHELF_RULE,
  ARCHIVE_ORG_TIP_PACK,
  ARCHIVE_ORG_TIP_PACK_202609,
  ARCHIVE_ORG_TIP_PACK_URLS,
  CODEBERG_TIP_PACK,
  CORPUS_SHELVES,
  FAMILY_BLAST_RADII,
  LOCKSET_TIP,
  MIN_INDEPENDENT_SHELVES,
  PAPER_DEPOSITS,
  PLANE_B_WORKING_TARGETS,
  PUBLISHED_SURFACE_IDS,
  REFUSE,
  SHELF_REGISTRY,
  claimShelfLive,
  independentLiveBlastRadii,
  judgePlaneAMirrors,
  judgePublishedSurfaces,
  judgeZenodoTipReuse,
  planeBLiveReady,
  shelvesCap7Cite,
  shelvesCiteField,
  shelvesDoc,
  shelvesRedlineCite,
  isShelvesPath,
} from "../src/cold-multi-shelf.js";
import { ATTACK_SIM_POINTER, REDLINE_SPEC } from "../src/redline.js";
import { CAP7_DESIGN_OF, CAP7_RESOLVES_TO_HUB } from "../src/semantic-bridge.js";

const glama = JSON.parse(readFileSync(new URL("../glama.json", import.meta.url), "utf8"));
assert.ok(glama.keywords.includes("cold-multi-shelf") || glama.keywords.includes("cold-shelf"));
assert.doesNotMatch(JSON.stringify(glama), /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

const paper = readFileSync(new URL("../docs/designs/COLD-MULTI-SHELF-1.0.md", import.meta.url), "utf8");
const survival = readFileSync(new URL("../docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
const citeDoc = readFileSync(new URL("../docs/CITE.md", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

assert.equal(COLD_MULTI_SHELF, "COLD-MULTI-SHELF-1.0");
assert.equal(COLD_MULTI_SHELF_DOCS, "docs/designs/COLD-MULTI-SHELF-1.0.md");
assert.match(paper, /^# COLD-MULTI-SHELF-1\.0/m);
assert.match(paper, /Author: Aziel Eliab only/);
assert.match(paper, /5 published surfaces/);
assert.match(paper, /CNS-PLANE-B-ALL-TARGETS/);
assert.match(paper, /CNS-ZENODO-IP-BAN/);
assert.match(paper, /CNS-OPERATOR-ATTEST/);
assert.match(paper, /b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37/);
assert.match(paper, /codeberg\.org\/AzielEliab\/aziel-lockset-tip/);
assert.match(paper, /archive\.org\/details\/aziel-lockset-tip/);
assert.match(paper, /aziel-lockset-tip_202609/);
assert.match(paper, /Same blast_radius/);
assert.match(paper, /Framagit/);
assert.match(paper, /CNS-NO-FORGE-MIRROR/);
assert.match(paper, /FRAMAGIT-TIP-PACK-CHECKLIST/);
assert.doesNotMatch(paper, /framagit\.org\/AzielEliab/i);
assert.match(paper, /CNS-GITFLIC-EMAIL/);
assert.match(paper, /CNS-GITLAB-CF-LOOP/);
assert.doesNotMatch(paper, /archive\.org \+ GitFlic URL null/);
assert.match(paper, /doi.*null/i);
assert.match(paper, /https:\/\/www\.azieleliab\.com\/#aziel/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /No new MCP tool/);
assert.match(paper, /No visible 15:20/);
assert.match(paper, /redline\.spec/);
assert.match(paper, /design_of: hub_designs/);
assert.match(paper, /scripts\/verify-redline\.mjs/);
assert.doesNotMatch(paper, /15:20 chrome visible|clock face on the homepage/i);
assert.match(survival, /CROSS-NETWORK-SURVIVAL-1\.0/);
assert.match(nodeMesh, /COLD-MULTI-SHELF-1\.0/);
assert.match(citeDoc, /COLD-MULTI-SHELF-1\.0/);
assert.match(readme, /COLD-MULTI-SHELF-1\.0/);

assert.ok(
  SUITE_DESIGNS.some((d) => d.id === "COLD-MULTI-SHELF-1.0" && d.kind === "law" && d.file === "COLD-MULTI-SHELF-1.0.md"),
);
assert.ok(!PUBLIC_MCP_TOOLS.includes("shelves"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("cold_multi_shelf"));

assert.equal(PUBLISHED_SURFACE_IDS.length, 5);
assert.deepEqual(FAMILY_BLAST_RADII.slice(), ["cloudflare", "github"]);
assert.deepEqual(PLANE_B_WORKING_TARGETS.slice(), ["codeberg", "archive.org", "framagit"]);
assert.equal(MIN_INDEPENDENT_SHELVES, 3);
assert.equal(LOCKSET_TIP, "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245");
assert.equal(CODEBERG_TIP_PACK.hash_verify || "pass", "pass");
assert.equal(CODEBERG_TIP_PACK.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.equal(ARCHIVE_ORG_TIP_PACK.url, "https://archive.org/details/aziel-lockset-tip");
assert.equal(ARCHIVE_ORG_TIP_PACK.hash_verify, "pass");
assert.equal(ARCHIVE_ORG_TIP_PACK.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.equal(ARCHIVE_ORG_TIP_PACK_202609.url, "https://archive.org/details/aziel-lockset-tip_202609");
assert.equal(ARCHIVE_ORG_TIP_PACK_202609.identifier, "aziel-lockset-tip_202609");
assert.equal(ARCHIVE_ORG_TIP_PACK_202609.hash_verify, "pass");
assert.equal(ARCHIVE_ORG_TIP_PACK_202609.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.equal(ARCHIVE_ORG_TIP_PACK_202609.ia_flat_sha256, null);
assert.equal(ARCHIVE_ORG_TIP_PACK_202609.wrap, "zip");
assert.deepEqual(ARCHIVE_ORG_TIP_PACK_URLS.slice(), [
  "https://archive.org/details/aziel-lockset-tip",
  "https://archive.org/details/aziel-lockset-tip_202609",
]);
assert.equal(ARCHIVE_ORG_TIP_PACK.secondary_items.length, 1);
assert.equal(ARCHIVE_ORG_TIP_PACK.secondary_items[0].url, ARCHIVE_ORG_TIP_PACK_202609.url);
assert.equal(ARCHIVE_ORG_TIP_PACK.secondary_items[0].independent_shelf, false);
assert.equal(planeBLiveReady(), false);
assert.deepEqual(independentLiveBlastRadii(), ["cf-github"]);
assert.equal(PAPER_DEPOSITS.every((p) => p.reuse_as_plane_b === false && p.tip_verified === false), true);

const four = judgePlaneAMirrors({ count_four_hosts_as_four_shelves: true });
assert.equal(four.accept, false);
assert.equal(four.reason, REFUSE.PLANE_A_ONE_TUNNEL);

const five = judgePublishedSurfaces({ five_independent_shelves: true });
assert.equal(five.accept, false);
assert.equal(five.reason, REFUSE.SURFACES_NOT_INDEPENDENT);

const sixth = judgePublishedSurfaces({ runtime_is_sixth_surface: true });
assert.equal(sixth.accept, false);
assert.equal(sixth.reason, REFUSE.RUNTIME_NOT_SHELF);

const zenodo = judgeZenodoTipReuse({ doi: "10.5281/zenodo.21435707" });
assert.equal(zenodo.accept, false);
assert.equal(zenodo.reuse_as_plane_b, false);

const invented = judgeZenodoTipReuse({ doi: "10.5281/zenodo.99999999" });
assert.equal(invented.accept, false);
assert.equal(invented.reason, REFUSE.FAKE_DEPOSIT);

const codeberg = SHELF_REGISTRY.find((s) => s.id === "plane-b-codeberg-tip-pack");
assert.equal(codeberg.status, "slot");
assert.equal(codeberg.hash_verify, "pass");
assert.equal(codeberg.live_ready, false);
assert.equal(codeberg.doi, null);
assert.equal(claimShelfLive(codeberg).live, false);
assert.equal(claimShelfLive(codeberg).reason, REFUSE.PLANE_B_ALL_TARGETS);

const archive = SHELF_REGISTRY.find((s) => s.id === "plane-b-archive-org-tip-pack");
assert.equal(archive.url, "https://archive.org/details/aziel-lockset-tip");
assert.equal(archive.hash_verify, "pass");
assert.equal(archive.live_ready, false);
assert.equal(archive.status, "slot");
assert.equal(archive.independent, true);
assert.equal(archive.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.equal(archive.secondary_items.length, 1);
assert.equal(archive.secondary_items[0].url, "https://archive.org/details/aziel-lockset-tip_202609");
assert.equal(archive.secondary_items[0].independent_shelf, false);
assert.equal(claimShelfLive(archive).live, false);
assert.equal(claimShelfLive(archive).reason, REFUSE.PLANE_B_ALL_TARGETS);
const archive202609 = SHELF_REGISTRY.find((s) => s.id === "plane-b-archive-org-tip-pack-202609");
assert.equal(archive202609.url, "https://archive.org/details/aziel-lockset-tip_202609");
assert.equal(archive202609.hash_verify, "pass");
assert.equal(archive202609.live_ready, false);
assert.equal(archive202609.status, "slot");
assert.equal(archive202609.independent, false);
assert.equal(archive202609.blast_radius, "archive-org");
assert.equal(archive202609.same_pack_as, "plane-b-archive-org-tip-pack");
assert.equal(archive202609.required_for_plane_b_live, false);
assert.equal(archive202609.doi, null);
assert.equal(archive202609.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.equal(archive202609.wrap, "zip");
assert.equal(archive202609.ia_flat_sha256, null);
assert.equal(claimShelfLive(archive202609).live, false);
assert.equal(claimShelfLive(archive202609).reason, REFUSE.PLANE_B_ALL_TARGETS);
const framagit = SHELF_REGISTRY.find((s) => s.id === "plane-b-framagit-tip-pack");
assert.equal(framagit.status, "slot");
assert.equal(framagit.url, null);
assert.equal(framagit.hash_verify, null);
assert.equal(framagit.tip_verified, false);
assert.equal(framagit.live_ready, false);
assert.equal(framagit.required_for_plane_b_live, true);
assert.equal(framagit.refuse, REFUSE.NO_FORGE);
assert.equal(framagit.plane_b_refuse, REFUSE.PLANE_B_ALL_TARGETS);
assert.equal(framagit.checklist, "tools/cold_shelf/FRAMAGIT-TIP-PACK-CHECKLIST.md");
assert.equal(framagit.expect_pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.doesNotMatch(JSON.stringify(framagit), /framagit\.org\//i);
assert.equal(claimShelfLive(framagit).live, false);
assert.equal(claimShelfLive(framagit).reason, REFUSE.NO_FORGE);
const framagitChecklist = readFileSync(
  new URL("../tools/cold_shelf/FRAMAGIT-TIP-PACK-CHECKLIST.md", import.meta.url),
  "utf8",
);
assert.match(framagitChecklist, /CNS-NO-FORGE-MIRROR/);
assert.match(framagitChecklist, /CNS-PLANE-B-ALL-TARGETS/);
assert.match(framagitChecklist, /b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37/);
assert.match(framagitChecklist, /Do not invent a Framagit URL/);
assert.doesNotMatch(framagitChecklist, /https:\/\/framagit\.org\/AzielEliab\/aziel-lockset-tip/);
const altForgeChecklist = readFileSync(
  new URL("../tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md", import.meta.url),
  "utf8",
);
assert.match(altForgeChecklist, /CNS-NO-FORGE-MIRROR/);
assert.match(altForgeChecklist, /FRAMAGIT-TIP-PACK-CHECKLIST/);
const gitflic = SHELF_REGISTRY.find((s) => s.id === "plane-b-gitflic-ru-tip-pack");
assert.equal(gitflic.status, "refused");
assert.equal(gitflic.url, null);
assert.equal(gitflic.refuse, REFUSE.GITFLIC_EMAIL);
const gitlab = SHELF_REGISTRY.find((s) => s.id === "plane-b-gitlab-tip-pack");
assert.equal(gitlab.status, "refused");
assert.equal(gitlab.url, null);
assert.equal(gitlab.refuse, REFUSE.GITLAB_CF_LOOP);
const zenodoShelf = SHELF_REGISTRY.find((s) => s.id === "plane-b-zenodo-tip-pack");
assert.equal(zenodoShelf.status, "refused");
assert.equal(zenodoShelf.doi, null);
const usb = SHELF_REGISTRY.find((s) => s.id === "plane-c-usb-airgap");
assert.equal(usb.status, "slot");
assert.equal(usb.refuse, REFUSE.OPERATOR_ATTEST);

assert.equal(isShelvesPath("/shelves"), true);
assert.equal(isShelvesPath("/v1/shelves"), true);
assert.equal(isShelvesPath("/cold-copy"), true);
assert.equal(isShelvesPath("/v1/mesh"), false);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const get = (path) => handler(new Request(origin + path), {});

const shelvesRes = await get("/shelves");
assert.equal(shelvesRes.status, 200);
const shelves = await shelvesRes.json();
assert.equal(shelves.spec, COLD_MULTI_SHELF);
assert.equal(shelves.rule, COLD_MULTI_SHELF_RULE);
assert.equal(shelves.lockset_doi ?? shelves.registry.lockset_doi, null);
assert.equal(shelves.registry.lockset_doi, null);
assert.equal(shelves.registry.published_surfaces, 5);
assert.equal(shelves.registry.independent_live_count, 1);
assert.equal(shelves.registry.independent_requirement_met, false);
assert.equal(shelves.registry.growth_on, true);
assert.equal(shelves.registry.visible_1520, false);
assert.equal(shelves.registry.runtime_is_shelf, false);
assert.equal(shelves.registry.planes.B.doi, null);
assert.equal(shelves.registry.planes.B.live_ready, false);
assert.deepEqual(shelves.registry.planes.B.working_targets, ["codeberg", "archive.org", "framagit"]);
assert.ok(shelves.registry.refused.includes("plane-b-gitflic-ru-tip-pack"));
assert.ok(shelves.registry.refused.includes("plane-b-gitlab-tip-pack"));
assert.ok(shelves.registry.slot.includes("plane-b-framagit-tip-pack"));
assert.ok(shelves.registry.slot.includes("plane-b-archive-org-tip-pack"));
assert.ok(shelves.registry.slot.includes("plane-b-archive-org-tip-pack-202609"));
assert.ok(!shelves.registry.live.includes("plane-b-archive-org-tip-pack-202609"));
assert.equal(shelves.registry.planes.B.working_targets.filter((t) => t === "archive.org").length, 1);
assert.match(shelves.registry.planes.B.note, /aziel-lockset-tip_202609/);
assert.match(shelves.registry.note, /aziel-lockset-tip_202609/);
assert.equal(shelves.source_of_truth, CORPUS_SHELVES);
assert.equal(shelves.visible_1520, false);
assert.equal(shelves.person_id, "https://www.azieleliab.com/#aziel");
assert.equal(shelves.runtime.published_surface, false);
assert.equal(shelves.runtime.independent, false);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-archive-org-tip-pack").url,
  "https://archive.org/details/aziel-lockset-tip",
);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-archive-org-tip-pack").hash_verify,
  "pass",
);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-archive-org-tip-pack-202609").url,
  "https://archive.org/details/aziel-lockset-tip_202609",
);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-archive-org-tip-pack-202609").independent,
  false,
);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-framagit-tip-pack").url,
  null,
);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-framagit-tip-pack").refuse,
  REFUSE.NO_FORGE,
);
assert.equal(
  shelves.registry.shelves.find((s) => s.id === "plane-b-framagit-tip-pack").hash_verify,
  null,
);
assert.equal(shelves.redline.spec, REDLINE_SPEC);
assert.equal(shelves.redline.field, "redline");
assert.equal(shelves.redline.cite, origin + "/cite.json");
assert.equal(shelves.cap7.design_of, CAP7_DESIGN_OF);
assert.equal(shelves.cap7.resolves_to_hub, CAP7_RESOLVES_TO_HUB);
assert.equal(shelves.attack_sims.refuse, true);
assert.equal(shelves.attack_sims.pointer, ATTACK_SIM_POINTER);
assert.ok(shelves.attack_sims.sims.some((s) => s.code === "CAP7-RESOLVE-INJECT"));
assert.equal(shelves.redline.cap7.design_of, "hub_designs");
assert.equal(shelves.redline.cap7.resolves_to_hub, false);

const v1 = await (await get("/v1/shelves")).json();
assert.equal(v1.spec, COLD_MULTI_SHELF);
assert.deepEqual(v1.registry.live, shelves.registry.live);
const alias = await (await get("/cold-copy")).json();
assert.equal(alias.spec, COLD_MULTI_SHELF);
const alias2 = await (await get("/v1/cold-copy")).json();
assert.equal(alias2.spec, COLD_MULTI_SHELF);

const head = await handler(new Request(origin + "/shelves", { method: "HEAD" }), {});
assert.equal(head.status, 200);
assert.equal(await head.text(), "");

const post = await handler(new Request(origin + "/shelves", { method: "POST", body: "{}" }), {});
assert.equal(post.status, 405);

const cite = await (await get("/cite.json")).json();
assert.equal(cite.shelves.spec, COLD_MULTI_SHELF);
assert.equal(cite.shelves.lockset_doi, null);
assert.equal(cite.shelves.doi, null);
assert.equal(cite.shelves.independent_live_count, 1);
assert.equal(cite.shelves.published_surfaces, 5);
assert.equal(cite.shelves.runtime_is_shelf, false);
assert.equal(cite.shelves.growth_on, true);
assert.equal(cite.shelves.visible_1520, false);
assert.equal(cite.shelves.person_id, "https://www.azieleliab.com/#aziel");
assert.equal(cite.shelves.plane_b.codeberg.hash_verify, "pass");
assert.equal(cite.shelves.plane_b.archive_org.url, "https://archive.org/details/aziel-lockset-tip");
assert.equal(cite.shelves.plane_b.archive_org.hash_verify, "pass");
assert.equal(cite.shelves.plane_b.archive_org.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
assert.equal(cite.shelves.plane_b.archive_org.secondary_items[0].url, "https://archive.org/details/aziel-lockset-tip_202609");
assert.equal(cite.shelves.plane_b.archive_org_202609.url, "https://archive.org/details/aziel-lockset-tip_202609");
assert.equal(cite.shelves.plane_b.archive_org_202609.independent, false);
assert.equal(cite.shelves.plane_b.archive_org_202609.hash_verify, "pass");
assert.deepEqual(cite.shelves.archive_org_tip_packs, [
  "https://archive.org/details/aziel-lockset-tip",
  "https://archive.org/details/aziel-lockset-tip_202609",
]);
assert.equal(cite.shelves.plane_b.honesty.hash_verify_pass_is_not_live, true);
assert.equal(cite.shelves.plane_b.honesty.do_not_paint_slot_as_live, true);
assert.equal(cite.shelves.plane_b.honesty.framagit_url, null);
assert.equal(cite.shelves.plane_b.honesty.zenodo_live, false);
assert.equal(cite.shelves.plane_b.codeberg.hash_verify_pass_is_not_live, true);
assert.equal(cite.shelves.plane_c.honesty.do_not_paint_slot_as_live, true);
assert.equal(cite.shelves.plane_c.honesty.attested, false);
assert.equal(cite.shelves.plane_b.framagit.url, null);
assert.equal(cite.shelves.plane_b.framagit.hash_verify, null);
assert.equal(cite.shelves.plane_b.framagit.refuse, REFUSE.NO_FORGE);
assert.equal(cite.shelves.plane_b.framagit.plane_b_refuse, REFUSE.PLANE_B_ALL_TARGETS);
assert.deepEqual(cite.shelves.plane_b.working_targets, ["codeberg", "archive.org", "framagit"]);
assert.equal(cite.shelves.redline.spec, REDLINE_SPEC);
assert.equal(cite.shelves.cap7.design_of, "hub_designs");
assert.equal(cite.shelves.cap7.resolves_to_hub, false);
assert.equal(cite.shelves.attack_sims.pointer, ATTACK_SIM_POINTER);
assert.equal(cite.redline.spec, REDLINE_SPEC);
assert.equal(cite.redline.cap7.design_of, "hub_designs");
assert.equal(cite.redline.attack_sims.pointer, ATTACK_SIM_POINTER);
assert.equal(cite.shelves.plane_b.gitflic_ru.status, "refused");
assert.equal(cite.shelves.plane_b.gitflic_ru.refuse, "CNS-GITFLIC-EMAIL");
assert.equal(cite.shelves.plane_b.gitlab.status, "refused");
assert.equal(cite.shelves.plane_b.gitlab.refuse, "CNS-GITLAB-CF-LOOP");
assert.equal(cite.shelves.plane_b.zenodo.status, "refused");
assert.equal(cite.semantic_bridge.resolves_to_hub, false);
assert.equal(cite.semantic_bridge.public_icann, false);
assert.equal(cite.semantic_bridge.fifth_product, false);
assert.equal(cite.author_id, "https://www.azieleliab.com/#aziel");

const catalog = await (await get("/v1/catalog.json")).json();
assert.equal(catalog.shelves.spec, COLD_MULTI_SHELF);
assert.equal(catalog.shelves.runtime_is_shelf, false);

const software = await (await get("/v1/software")).json();
assert.equal(software.shelves.spec, COLD_MULTI_SHELF);
assert.equal(software.survival.spec, "CROSS-NETWORK-SURVIVAL-1.0");

const runtime = await (await get("/v1/runtime.json")).json();
assert.match(runtime.endpoints.shelves, /\/shelves$/);
assert.match(runtime.endpoints.shelves_json, /\/v1\/shelves$/);
assert.equal(runtime.fabric.cold_multi_shelf, COLD_MULTI_SHELF);
assert.equal(runtime.fabric.lockset_doi, null);

const llms = await (await get("/llms.txt")).text();
const ai = await (await get("/ai.txt")).text();
assert.equal(llms, ai);
assert.match(llms, /COLD-MULTI-SHELF-1\.0/);
assert.match(llms, /5 published surfaces/);
assert.match(llms, /CNS-PLANE-B-ALL-TARGETS/);
assert.match(llms, /CNS-ZENODO-IP-BAN/);
assert.match(llms, /CNS-OPERATOR-ATTEST/);
assert.match(llms, /b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37/);
assert.match(llms, /archive\.org\/details\/aziel-lockset-tip/);
assert.match(llms, /aziel-lockset-tip_202609/);
assert.match(llms, /same blast_radius/);
assert.match(llms, /Framagit/);
assert.match(llms, /CNS-NO-FORGE-MIRROR/);
assert.match(llms, /CNS-GITFLIC-EMAIL/);
assert.match(llms, /CNS-GITLAB-CF-LOOP/);
assert.doesNotMatch(llms, /archive\.org \+ GitFlic URL null/);
assert.match(llms, /www\.azieleliab\.com\/#aziel/);
assert.match(llms, /resolves_to_hub: false/);
assert.match(llms, /REDLINE-2026-09-14/);
assert.match(llms, /design_of: hub_designs/);
assert.match(llms, /verify-redline\.mjs/);
assert.doesNotMatch(llms, /doi: 10\.5281\/zenodo\.\d+ \(lockset tip\)/);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /COLD-MULTI-SHELF-1\.0/);
assert.match(skill, /CNS-ZENODO-IP-BAN/);
assert.match(skill, /archive\.org\/details\/aziel-lockset-tip/);
assert.match(skill, /aziel-lockset-tip_202609/);
assert.match(skill, /same blast_radius/);
assert.match(skill, /Framagit/);
assert.match(skill, /CNS-NO-FORGE-MIRROR/);
assert.match(skill, /CNS-GITFLIC-EMAIL/);
assert.match(skill, /CNS-GITLAB-CF-LOOP/);
assert.match(skill, /resolves_to_hub: false/);
assert.match(skill, /REDLINE-2026-09-14/);
assert.match(skill, /design_of: hub_designs/);
assert.match(skill, /verify-redline\.mjs/);

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/shelves/);
assert.match(sitemap, /\/v1\/shelves/);
assert.match(sitemap, /COLD-MULTI-SHELF-1\.0\.md/);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/shelves"]);
assert.ok(openapi.paths["/v1/shelves"]);
assert.match(openapi.paths["/shelves"].get.summary, /COLD-MULTI-SHELF/);
assert.match(openapi.paths["/v1/shelves"].get.summary, /COLD-MULTI-SHELF/);
assert.match(openapi.paths["/shelves"].get.summary, /archive\.org\/details\/aziel-lockset-tip/);
assert.match(openapi.paths["/shelves"].get.summary, /aziel-lockset-tip_202609/);
assert.match(openapi.paths["/shelves"].get.summary, /Framagit/);
assert.match(openapi.paths["/shelves"].get.summary, /REDLINE-2026-09-14/);
assert.match(openapi.paths["/shelves"].get.summary, /design_of/);
assert.match(openapi.paths["/shelves"].get.summary, /verify-redline/);
assert.match(openapi.info.description, /COLD-MULTI-SHELF/);
assert.match(openapi.info.description, /Framagit/);

assert.equal(shelvesCiteField(origin).lockset_doi, null);
assert.equal(shelvesDoc(origin).registry.planes.B.doi, null);
assert.equal(shelvesCap7Cite().design_of, "hub_designs");
assert.equal(shelvesCap7Cite().resolves_to_hub, false);
assert.equal(shelvesRedlineCite(origin).spec, REDLINE_SPEC);
assert.equal(shelvesCiteField(origin).redline.spec, REDLINE_SPEC);
assert.equal(shelvesCiteField(origin).attack_sims.pointer, ATTACK_SIM_POINTER);

console.log(
  `ok ${COLD_MULTI_SHELF}: Plane A 5/2/1; Plane B Codeberg+archive.org PASS still SLOT (primary + 202609 same blast_radius); Framagit URL null CNS-NO-FORGE-MIRROR; GitFlic/GitLab refused; doi null; Plane C SLOT; runtime not a shelf`,
);
