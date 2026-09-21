/**
 * SPORE-1.0: dormant vs live honesty. Pause / preserve / wait / physical-wipe-only.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { LIVE_OPS } from "../src/fraggate/registry.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import { SOFTWARE_COPY } from "../src/software-copy.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { dispatchSurvivalHttp, survivalCiteField, survivalDoc } from "../src/ban-survival.js";
import {
  MESH_SPEC,
  meshFanoutSuitePresence,
  meshJoin,
  meshHeartbeat,
  meshStatus,
  resetMeshStore,
  setMeshRadiosEnabled,
  setSuitePresenceCatalog,
} from "../src/mesh.js";
import { radioStatus } from "../qnm-node/bearers/radio.js";
import {
  REFUSE,
  SPORE,
  SPORE_AUTHOR,
  SPORE_DNA,
  SPORE_DOCS,
  SPORE_FACES,
  SPORE_RULE,
  SPORE_TIP,
  applySpore,
  dormantRefuse,
  isSporeDormant,
  judgeElectronicWipe,
  judgeHistoryRewrite,
  judgeInventedHeartbeat,
  judgePlaneLie,
  judgePretendMetabolism,
  readSporeEnv,
  reconcileForward,
  sporeCite,
  sporeHint,
  sporeLambLens,
  sporeLlmsBlock,
  sporeMode,
  sporeSkillMarkdown,
} from "../src/spore.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const paper = readFileSync(new URL("../docs/designs/SPORE-1.0.md", import.meta.url), "utf8");
const banPaper = readFileSync(new URL("../docs/designs/BAN-SURVIVAL-1.0.md", import.meta.url), "utf8");
const survivalPaper = readFileSync(new URL("../docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
const citeDoc = readFileSync(new URL("../docs/CITE.md", import.meta.url), "utf8");
const designsReadme = readFileSync(new URL("../docs/designs/README.md", import.meta.url), "utf8");
const clientUpdate = readFileSync(new URL("../docs/CLIENT_UPDATE.md", import.meta.url), "utf8");

assert.equal(SPORE, "SPORE-1.0");
assert.equal(SPORE_AUTHOR, "Aziel Eliab");
assert.equal(SPORE_DOCS, "docs/designs/SPORE-1.0.md");
assert.deepEqual(SPORE_FACES.slice(), ["pause", "preserve", "wait", "physical-wipe-only"]);
assert.match(paper, /^# SPORE-1\.0/m);
assert.match(paper, /Author: Aziel Eliab only/);
assert.match(paper, /pause \/ preserve \/ wait \/ physical-wipe-only/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /No new MCP tool/);
assert.match(paper, /memory_resolve/);
assert.match(paper, /BAN-SURVIVAL-1\.0/);
assert.match(paper, /COLD-MULTI-SHELF-1\.0/);
assert.match(paper, /Lamb Lens/);
assert.match(paper, /https:\/\/www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(paper, /15:20 chrome visible|clock face on the homepage/i);
assert.match(banPaper, /SPORE-1\.0/);
assert.match(survivalPaper, /SPORE-1\.0/);
assert.match(nodeMesh, /SPORE-1\.0/);
assert.match(citeDoc, /SPORE-1\.0/);
assert.match(designsReadme, /SPORE-1\.0/);
assert.match(clientUpdate, /SPORE-1\.0/);

assert.ok(SUITE_DESIGNS.some((d) => d.id === SPORE && d.kind === "law" && d.file === "SPORE-1.0.md"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("spore"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("dormancy"));
assert.equal(LIVE_OPS.spore, undefined);
assert.equal(typeof SOFTWARE_COPY.godlock.one_line, "string");
assert.equal(SOFTWARE_COPY.ark.one_line, "Keep a local deniable vault; one phrase opens one vault.");

assert.equal(readSporeEnv({}).dormant, false);
assert.equal(readSporeEnv({ SPORE_DORMANT: "1" }).dormant, true);
assert.equal(readSporeEnv({ POWER_LOSS: "true" }).signal, "POWER_LOSS");
assert.equal(readSporeEnv({ SPORE_MODE: "dormant" }).dormant, true);
assert.equal(sporeMode({}), "live");
assert.equal(sporeMode({ SPORE_DORMANT: "1" }), "dormant");
assert.equal(sporeMode({}, { radios_off: true }), "dormant");
assert.equal(sporeMode({}, { mesh_enabled: false }), "dormant");
assert.equal(isSporeDormant({ OFFLINE: "1" }), true);
assert.equal(isSporeDormant({}), false);

const liveCite = sporeCite({});
assert.equal(liveCite.spec, SPORE);
assert.equal(liveCite.mode, "live");
assert.equal(liveCite.metabolism, "on");
assert.equal(liveCite.pause, false);
assert.equal(liveCite.preserve, true);
assert.equal(liveCite.wait, false);
assert.equal(liveCite.physical_wipe_only, true);
assert.equal(liveCite.invented_heartbeats, false);
assert.equal(liveCite.plane_b, "slot");
assert.equal(liveCite.plane_c, "slot");
assert.equal(liveCite.doi, null);
assert.equal(liveCite.software_tab, false);
assert.equal(liveCite.fraggate_slug, false);
assert.equal(liveCite.lamb_lens.peace, true);
assert.equal(liveCite.lamb_lens.clarity, true);
assert.equal(liveCite.lamb_lens.service, true);
assert.equal(liveCite.lamb_lens.door, false);
assert.deepEqual(liveCite.faces, SPORE_FACES.slice());
assert.equal(liveCite.dna.akm, SPORE_DNA.akm);

const dormantCite = sporeCite({ POWER_LOSS: "1" });
assert.equal(dormantCite.mode, "dormant");
assert.equal(dormantCite.metabolism, "paused");
assert.equal(dormantCite.pause, true);
assert.equal(dormantCite.wait, true);
assert.equal(dormantCite.signal, "POWER_LOSS");

assert.equal(judgeInventedHeartbeat({ dormant: true, invent_live_heartbeat: true }).reason, REFUSE.NO_INVENT_HEARTBEAT);
assert.equal(judgeInventedHeartbeat({}).accept, true);
assert.equal(judgePretendMetabolism({ dormant: true, claim_live_metabolism: true }).reason, REFUSE.NO_PRETEND_METABOLISM);
assert.equal(judgeHistoryRewrite({ rewrite: true }).reason, REFUSE.NO_REWRITE);
assert.equal(judgeHistoryRewrite({ memory_delete: true }).reason, REFUSE.NO_REWRITE);
assert.equal(judgePlaneLie({ plane_b_live: true }).reason, REFUSE.NO_LIE_PLANE);
assert.equal(judgePlaneLie({ plane_c_live: true }).reason, REFUSE.NO_LIE_PLANE);
assert.equal(judgeElectronicWipe({ power_off_is_wipe: true }).reason, REFUSE.PHYSICAL_WIPE_ONLY);
assert.equal(applySpore({}).ok, true);
assert.equal(applySpore({ dormant: true, invent_live_heartbeat: true, plane_b_live: true }).ok, false);

const resume = reconcileForward({});
assert.equal(resume.ok, true);
assert.equal(resume.style, "memory_resolve");
assert.equal(resume.additive, true);
assert.equal(resume.rewrite, false);
assert.equal(resume.mode, "live");
assert.equal(reconcileForward({ sanitize_old_trail: true }).ok, false);
assert.equal(reconcileForward({ rollback: true }).reason, REFUSE.NO_REWRITE);

const refuseBeat = dormantRefuse("heartbeat", { SPORE_DORMANT: "1" });
assert.equal(refuseBeat.ok, false);
assert.equal(refuseBeat.code, REFUSE.NO_INVENT_HEARTBEAT);
assert.equal(refuseBeat.invented_heartbeats, false);
assert.equal(refuseBeat.spore.mode, "dormant");

assert.match(sporeLlmsBlock(), /SPORE-1\.0/);
assert.match(sporeSkillMarkdown(), /physical-wipe-only/);
assert.match(SPORE_TIP, /PAUSE/);
assert.match(SPORE_RULE, /Physical wipe only/);
assert.equal(sporeHint().software_tab, false);
assert.equal(sporeLambLens().after, "fraggate");

resetMeshStore();
setSuitePresenceCatalog([]);
setMeshRadiosEnabled(true);
const liveStatus = await meshStatus({}, {});
assert.equal(liveStatus.spec, MESH_SPEC);
assert.equal(liveStatus.spore.spec, SPORE);
assert.equal(liveStatus.spore.mode, "live");
assert.equal(liveStatus.spore.metabolism, "on");
assert.equal(liveStatus.spore.invented_heartbeats, false);

const liveJoin = await meshJoin({ product: "godlock", node_id: "sporelive" }, {});
assert.equal(liveJoin.ok, true);
assert.equal(liveJoin.spore.mode, "live");

const dormantJoin = await meshJoin({ product: "godlock", node_id: "sporedark" }, { SPORE_DORMANT: "1" });
assert.equal(dormantJoin.ok, false);
assert.equal(dormantJoin.code, REFUSE.NO_INVENT_HEARTBEAT);
assert.equal(dormantJoin.invented_heartbeats, false);
assert.equal(dormantJoin.spore.mode, "dormant");

const dormantBeat = await meshHeartbeat({ node_id: "sporelive" }, { POWER_LOSS: "1" });
assert.equal(dormantBeat.ok, false);
assert.equal(dormantBeat.code, REFUSE.NO_INVENT_HEARTBEAT);

setMeshRadiosEnabled(false);
const radiosOff = await meshJoin({ product: "godlock", node_id: "radiosoff" }, {});
assert.equal(radiosOff.ok, false);
assert.equal(radiosOff.code, "MESH-OFF");
assert.equal(radiosOff.spore.mode, "dormant");
assert.equal(radiosOff.spore.metabolism, "paused");
setMeshRadiosEnabled(true);

resetMeshStore();
setSuitePresenceCatalog([{ slug: "godlock", name: "GodLock" }]);
const fanoutLive = await meshFanoutSuitePresence({});
assert.equal(fanoutLive.skipped, false);
assert.ok(fanoutLive.joined >= 1);

const fanoutDormant = await meshFanoutSuitePresence({ SPORE_DORMANT: "1" });
assert.equal(fanoutDormant.skipped, true);
assert.equal(fanoutDormant.reason, "spore-dormant");
assert.equal(fanoutDormant.invented_heartbeats, false);
assert.equal(fanoutDormant.joined, 0);
resetMeshStore();
setSuitePresenceCatalog([]);

const env = { SESSION: memorySessionNamespace({}) };
const survival = dispatchSurvivalHttp("GET", "/v1/survival", origin, {});
assert.equal(survival.status, 200);
assert.equal(survival.body.spore.spec, SPORE);
assert.equal(survival.body.spore.mode, "live");
assert.deepEqual(survival.body.spore.faces, SPORE_FACES.slice());
assert.equal(survival.body.spore.plane_b, "slot");
assert.equal(survival.body.spore.plane_c, "slot");

const survivalDark = dispatchSurvivalHttp("GET", "/survival", origin, { SPORE_DORMANT: "1" });
assert.equal(survivalDark.body.spore.mode, "dormant");
assert.equal(survivalDark.body.spore.metabolism, "paused");

const citeField = survivalCiteField(origin, {});
assert.equal(citeField.spore.spec, SPORE);
assert.equal(survivalDoc(origin, {}).spore_spec, SPORE);

const citeRes = await handler(new Request(origin + "/cite.json"), env);
const cite = await citeRes.json();
assert.equal(cite.spore.spec, SPORE);
assert.equal(cite.spore.mode, "live");
assert.equal(cite.spore.plane_b, "slot");
assert.equal(cite.spore.software_tab, false);
assert.ok(cite.designs.papers.some((p) => p.id === SPORE && p.path === "docs/designs/SPORE-1.0.md" && p.kind === "law"));
assert.equal(cite.ban_survival.spore.spec, SPORE);

const meshRes = await handler(new Request(origin + "/v1/mesh"), env);
const mesh = await meshRes.json();
assert.equal(mesh.spore.spec, SPORE);
assert.equal(mesh.spore.mode, "live");
assert.equal(mesh.invented_heartbeats, undefined);
assert.equal(mesh.spore.honesty.framagit_url, undefined);
assert.doesNotMatch(JSON.stringify(mesh), /framagit/i);

const healthRes = await handler(new Request(origin + "/v1/health"), env);
const health = await healthRes.json();
assert.equal(health.spore.spec, SPORE);
assert.equal(health.spore.mode, "live");

const llmsRes = await handler(new Request(origin + "/llms.txt"), env);
const llms = await llmsRes.text();
assert.match(llms, /SPORE-1\.0/);
assert.match(llms, /pause \/ preserve \/ wait \/ physical-wipe-only/);

const openapiRes = await handler(new Request(origin + "/openapi.json"), env);
const openapi = await openapiRes.json();
assert.match(openapi.paths["/survival"].get.summary, /SPORE-1\.0/);

const radio = radioStatus();
assert.equal(radio.spore.spec, SPORE);
assert.equal(radio.spore.invented_heartbeats, false);
assert.ok(radio.spore.mode === "live" || radio.spore.mode === "dormant");
if (Object.values(radio.channels).every((row) => row.state === "REFUSE")) {
  assert.equal(radio.spore.mode, "dormant");
}

console.log("verify-spore: ok");
