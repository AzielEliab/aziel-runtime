/**
 * ORIGIN-CUTOVER-1.0: home-origin stays SLOT and serves AZNet.
 * Live CF hubs are not retargeted. Phoenix is local. REHEAL is cited.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import { REHEAL } from "../src/reheal.js";
import { SPEC as AZNET_ENGINE_SPEC, ROLE as AZNET_ROLE } from "../src/engines/aznet/engine.js";
import { survivalStackCite } from "../src/spore.js";
import {
  AZNET_SLUG,
  HOME_ORIGIN_ID,
  HOME_ORIGIN_SHELF,
  L0,
  NAMING_LOCK,
  ORIGIN_CUTOVER,
  ORIGIN_CUTOVER_DOCS,
  PHOENIX_REHEAL_CITE,
  REFUSE,
  homeOriginScaffold,
  judgeHomeOrigin,
  originCutoverCite,
  survivalRegistry,
} from "../src/origin-cutover.js";
import {
  FAMILY_BLAST_RADII,
  MIN_INDEPENDENT_SHELVES,
  PUBLISHED_SURFACE_IDS,
  SHELF_REGISTRY,
  independentLiveBlastRadii,
  shelvesCiteField,
  shelvesDoc,
} from "../src/cold-multi-shelf.js";

const paper = readFileSync(new URL(`../${ORIGIN_CUTOVER_DOCS}`, import.meta.url), "utf8");
const checklist = readFileSync(new URL("../tools/cold_shelf/HOME-ORIGIN-MINI-PC.md", import.meta.url), "utf8");
const cold = readFileSync(new URL("../docs/designs/COLD-MULTI-SHELF-1.0.md", import.meta.url), "utf8");
const survivalPaper = readFileSync(new URL("../docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md", import.meta.url), "utf8");

assert.equal(ORIGIN_CUTOVER, "ORIGIN-CUTOVER-1.0");
assert.match(paper, /^# ORIGIN-CUTOVER-1\.0/m);
assert.match(paper, /sidenet means AZNet/);
assert.match(paper, /no separate sidenet brand/);
assert.match(paper, /L0/);
assert.match(paper, /unbroken/);
assert.match(paper, /AZN-WP-0\.1/);
assert.doesNotMatch(paper, /Sidenet P3/);
assert.match(paper, /Author: Aziel Eliab only/);
assert.match(paper, /https:\/\/www\.azieleliab\.com\/#aziel/);
assert.match(paper, /REHEAL-1\.0/);
assert.match(paper, /phoenix-WAIT/);
assert.match(paper, /OC-NO-DNS-RENT/);
assert.match(paper, /OC-NO-LIVE-DNS-CHANGE/);
assert.match(paper, /CNS-ZENODO-NOT-LIVE/);
assert.match(paper, /doi/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /No new MCP tool/);
assert.match(checklist, /sha256sum -c SHA256SUMS/);
assert.match(checklist, /does not rent DNS/);
assert.match(checklist, /Do not swap A records/);
assert.doesNotMatch(checklist, /cloudflared tunnel create|wrangler dns|registrar/i);
assert.match(survivalPaper, /ORIGIN-CUTOVER-1\.0/);
assert.match(cold, /home-origin/);

assert.ok(SUITE_DESIGNS.some((d) => d.id === ORIGIN_CUTOVER && d.kind === "law" && d.file === "ORIGIN-CUTOVER-1.0.md"));
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.ok(!PUBLIC_MCP_TOOLS.includes("origin_cutover"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("sidenet"));

assert.equal(HOME_ORIGIN_SHELF.id, HOME_ORIGIN_ID);
assert.equal(HOME_ORIGIN_SHELF.status, "slot");
assert.equal(HOME_ORIGIN_SHELF.deposited, false);
assert.equal(HOME_ORIGIN_SHELF.hash_verify, null);
assert.equal(HOME_ORIGIN_SHELF.hostname, null);
assert.equal(HOME_ORIGIN_SHELF.ip, null);
assert.equal(HOME_ORIGIN_SHELF.url, null);
assert.equal(HOME_ORIGIN_SHELF.dns_rented, false);
assert.equal(HOME_ORIGIN_SHELF.live_dns_changed, false);
assert.equal(HOME_ORIGIN_SHELF.doi, null);
assert.equal(HOME_ORIGIN_SHELF.breaks_live_cf_hubs, false);
assert.equal(HOME_ORIGIN_SHELF.published_surface, false);
assert.equal(HOME_ORIGIN_SHELF.software_tab, false);
assert.equal(NAMING_LOCK.sidenet, AZNET_SLUG);
assert.equal(NAMING_LOCK.separate_brand, false);
assert.equal(NAMING_LOCK.serves, "aznet");
assert.equal(L0.status, "unbroken");
assert.equal(L0.spec, "AZN-WP-0.1");
assert.equal(L0.hosts_payloads, false);
assert.equal(L0.changed_by_origin_cutover, false);
assert.equal(AZNET_ENGINE_SPEC, "AZN-WP-0.1");
assert.equal(AZNET_ROLE, "silent verification side-net");
assert.equal(HOME_ORIGIN_SHELF.serves, "aznet");
assert.equal(HOME_ORIGIN_SHELF.layer, "aznet-p3");
assert.equal(HOME_ORIGIN_SHELF.l0, "unbroken");
assert.equal(HOME_ORIGIN_SHELF.reheal, REHEAL);
assert.equal(HOME_ORIGIN_SHELF.neighbor_phoenix, false);
assert.equal(HOME_ORIGIN_SHELF.phoenix_local_only, true);

const row = SHELF_REGISTRY.find((s) => s.id === HOME_ORIGIN_ID);
assert.equal(row.status, "slot");
assert.ok(!SHELF_REGISTRY.some((s) => s.id === HOME_ORIGIN_ID && s.status === "live"));
assert.deepEqual(independentLiveBlastRadii(), ["cf-github"]);
assert.equal(independentLiveBlastRadii().length < MIN_INDEPENDENT_SHELVES, true);
assert.equal(PUBLISHED_SURFACE_IDS.length, 5);
assert.deepEqual(FAMILY_BLAST_RADII.slice(), ["cloudflare", "github"]);
assert.ok(!PUBLISHED_SURFACE_IDS.includes(HOME_ORIGIN_ID));

const registry = survivalRegistry(SHELF_REGISTRY);
assert.equal(registry.honest, true);
assert.deepEqual(registry.lies, []);
assert.equal(registry.independent_live_count, 1);
assert.equal(registry.independent_requirement_met, false);
assert.equal(registry.min_independent_shelves, 3);
assert.equal(registry.published_surfaces, 5);
assert.equal(registry.zenodo_plane_b_blocked, true);
assert.equal(registry.doi, null);
assert.ok(registry.slot.includes(HOME_ORIGIN_ID));
assert.ok(!registry.live.includes(HOME_ORIGIN_ID));
assert.ok(registry.live.includes("plane-a-cf-github"));
assert.ok(registry.slot.includes("plane-b-zenodo-tip-pack"));
assert.ok(registry.slot.includes("plane-b-codeberg-tip-pack"));
assert.equal(registry.phoenix_reheal.reheal, REHEAL);
assert.equal(registry.phoenix_reheal.phoenix_local_only, true);
assert.equal(registry.phoenix_reheal.neighbor_phoenix, false);
assert.equal(registry.phoenix_reheal.public_hostname_resurrection, false);
assert.equal(registry.breaks_live_cf_hubs, false);
assert.equal(PHOENIX_REHEAL_CITE.reheal, REHEAL);

const cite = originCutoverCite();
assert.equal(cite.serves, "aznet");
assert.equal(cite.naming_lock.sidenet, "aznet");
assert.equal(cite.naming_lock.separate_brand, false);
assert.equal(cite.l0.status, "unbroken");
assert.equal(cite.status, "slot");
assert.equal(cite.dns_rented, false);
assert.equal(cite.deposited, false);
assert.equal(cite.hash_verify, null);
assert.equal(cite.zenodo_live, false);
assert.equal(cite.doi, null);

const scaffold = homeOriginScaffold();
assert.equal(scaffold.promotes_live, false);
assert.equal(scaffold.dns_rented, false);
assert.equal(scaffold.live_dns_changed, false);
assert.equal(scaffold.breaks_live_cf_hubs, false);
assert.ok(scaffold.steps.some((step) => /Do not rent a domain/.test(step)));
assert.ok(scaffold.steps.some((step) => /phoenix-WAIT/.test(step)));

assert.equal(judgeHomeOrigin({}).status, "slot");
assert.equal(judgeHomeOrigin({}).live, false);
assert.equal(judgeHomeOrigin({ rent_dns: true }).reason, REFUSE.NO_DNS_RENT);
assert.equal(judgeHomeOrigin({ change_live_dns: true }).reason, REFUSE.NO_LIVE_DNS_CHANGE);
assert.equal(judgeHomeOrigin({ swap_a_record: true }).breaks_live_cf_hubs, false);
assert.equal(judgeHomeOrigin({ hostname: "home.example" }).reason, REFUSE.NO_INVENTED_HOST);
assert.equal(judgeHomeOrigin({ ip: "203.0.113.10" }).reason, REFUSE.NO_INVENTED_HOST);
assert.equal(judgeHomeOrigin({ status: "live" }).reason, REFUSE.HOME_ORIGIN_SLOT);
assert.equal(judgeHomeOrigin({ doi: "10.5281/zenodo.1" }).reason, REFUSE.ZENODO_NOT_LIVE);
assert.equal(judgeHomeOrigin({ neighbor_phoenix: true }).reason, REFUSE.PHOENIX_LOCAL_ONLY);
assert.equal(judgeHomeOrigin({ resurrect_hostname: true }).phoenix_local_only, true);
assert.equal(judgeHomeOrigin({ vote_to_fix: true }).reason, REFUSE.NO_NEIGHBOR_HEAL);
assert.equal(judgeHomeOrigin({ vote_to_fix: true }).reheal, REHEAL);
assert.equal(judgeHomeOrigin({ separate_sidenet_brand: true }).reason, REFUSE.NO_SIDENET_BRAND);
assert.equal(judgeHomeOrigin({ break_l0: true }).reason, REFUSE.L0_UNBROKEN);
assert.equal(judgeHomeOrigin({ rename_aznet: true }).breaks_live_cf_hubs, false);

const origin = "https://aziel-runtime.example";
const shelves = shelvesDoc(origin);
assert.equal(shelves.origin_cutover.status, "slot");
assert.equal(shelves.origin_cutover.hostname, null);
assert.equal(shelves.survival_registry.honest, true);
assert.equal(shelves.survival_registry.independent_live_count, 1);
assert.equal(shelves.survival_registry.independent_requirement_met, false);
assert.equal(shelves.phoenix_reheal.reheal, REHEAL);
assert.equal(shelves.phoenix_reheal.neighbor_phoenix, false);
assert.equal(shelves.registry.independent_live_count, 1);
assert.ok(shelves.registry.slot.includes(HOME_ORIGIN_ID));
assert.ok(!shelves.registry.live.includes(HOME_ORIGIN_ID));

const field = shelvesCiteField(origin);
assert.equal(field.origin_cutover.status, "slot");
assert.equal(field.origin_cutover.doi, null);
assert.equal(field.survival_registry.honest, true);
assert.equal(field.survival_registry.published_surfaces, 5);
assert.deepEqual(field.survival_registry.family_blast_radii, ["cloudflare", "github"]);
assert.equal(field.phoenix_reheal.public_hostname_resurrection, false);
assert.equal(field.independent_live_count, 1);
assert.equal(field.plane_b.zenodo.zenodo_live, false);
assert.equal(field.plane_b.zenodo.doi, null);

const handler = (await import("../src/index.js")).default.fetch;
const get = (path) => handler(new Request(origin + path), {});
const httpShelves = await (await get("/shelves")).json();
assert.equal(httpShelves.origin_cutover.id, HOME_ORIGIN_ID);
assert.equal(httpShelves.survival_registry.honest, true);
assert.equal(httpShelves.registry.planes.A.status, "live");
assert.equal(httpShelves.registry.planes.B.status, "slot");
assert.equal(httpShelves.registry.planes.C.status, "slot");

const httpSurvival = await (await get("/survival")).json();
assert.equal(httpSurvival.origin_cutover.status, "slot");
assert.equal(httpSurvival.origin_cutover.serves, "aznet");
assert.equal(httpSurvival.origin_cutover.l0.status, "unbroken");
assert.equal(httpSurvival.spore.l0.status, "unbroken");
assert.equal(httpSurvival.spore.naming_lock.separate_brand, false);
assert.deepEqual(
  httpSurvival.survival_stack.map((row) => row.id),
  ["live-fronts", "cold-shelves", "spore"],
);
assert.ok(httpSurvival.survival_stack.every((row) => row.serves === "aznet"));
assert.deepEqual(
  survivalStackCite().map((row) => row.id),
  ["live-fronts", "cold-shelves", "spore"],
);
assert.equal(httpSurvival.origin_cutover.breaks_live_cf_hubs, false);
assert.equal(httpSurvival.survival_registry.honest, true);
assert.equal(httpSurvival.survival_registry.independent_requirement_met, false);
assert.equal(httpSurvival.phoenix_reheal.reheal, REHEAL);
assert.equal(httpSurvival.public_hostname_resurrection, false);

const citeJson = await (await get("/cite.json")).json();
assert.equal(citeJson.shelves.origin_cutover.status, "slot");
assert.equal(citeJson.shelves.survival_registry.doi, null);
assert.equal(citeJson.shelves.independent_live_count, 1);
assert.equal(citeJson.shelves.published_surfaces, 5);
assert.ok(citeJson.designs.papers.some((p) => p.id === ORIGIN_CUTOVER && p.kind === "law" && p.software_tab === false));

const software = await (await get("/v1/software")).json();
assert.equal(software.count, 42);
assert.ok(software.software.some((p) => p.slug === "aznet"));
assert.ok(!software.software.some((p) => p.slug === "origin-cutover" || p.slug === "sidenet" || p.slug === "home-origin"));

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /ORIGIN-CUTOVER-1\.0/);
assert.match(llms, /home-origin/);
assert.match(llms, /sidenet means AZNet/);
assert.match(llms, /L0 stays unbroken/);
assert.match(llms, /SLOT/);
assert.match(llms, /REHEAL-1\.0/);
assert.match(llms, /phoenix-WAIT/);

console.log(
  `ok ${ORIGIN_CUTOVER}: home-origin SLOT; no DNS rent; live CF hubs unchanged; phoenix local; ${REHEAL}; independent live 1/3`,
);
