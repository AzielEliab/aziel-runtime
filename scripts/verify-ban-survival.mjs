/**
 * BAN-SURVIVAL-1.0: named same-tunnel failover + honest DEGRADED + no invented live door.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import {
  BAN_SURVIVAL,
  BAN_SURVIVAL_DOCS,
  BAN_SURVIVAL_RULE,
  BAN_SURVIVAL_TIP,
  CLIENT_ORDER,
  COLD_FALLBACK,
  EXEC_PATHS,
  NAMED_ROUTES,
  PRIMARY_WORKER_ORIGIN,
  READ_PATHS,
  REFUSE,
  applyBanSurvival,
  blockedRouteRefuse,
  bridgeOrigins,
  dispatchSurvivalHttp,
  doorMode,
  failoverCite,
  isExecPath,
  isReadPath,
  isRouteBlocked,
  isSurvivalPath,
  judgeBannedHostLive,
  judgeInventedLiveShelf,
  judgeLlmReplica,
  judgeSecondDoor,
  judgeUnmarkedHydra,
  namedExecOrigins,
  nextExecOrigin,
  parseBlockedRoutes,
  rateLimitFailoverCite,
  shouldFailoverStatus,
  survivalCiteField,
  survivalDoc,
  survivalLlmsBlock,
  survivalSkillMarkdown,
} from "../src/ban-survival.js";
import { LOCKSET_TIP } from "../src/cold-multi-shelf.js";

const paper = readFileSync(new URL("../docs/designs/BAN-SURVIVAL-1.0.md", import.meta.url), "utf8");
const survival = readFileSync(new URL("../docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
const clientUpdate = readFileSync(new URL("../docs/CLIENT_UPDATE.md", import.meta.url), "utf8");
const citeDoc = readFileSync(new URL("../docs/CITE.md", import.meta.url), "utf8");
const designsReadme = readFileSync(new URL("../docs/designs/README.md", import.meta.url), "utf8");

assert.equal(BAN_SURVIVAL, "BAN-SURVIVAL-1.0");
assert.equal(BAN_SURVIVAL_DOCS, "docs/designs/BAN-SURVIVAL-1.0.md");
assert.match(paper, /^# BAN-SURVIVAL-1\.0/m);
assert.match(paper, /Author: Aziel Eliab only/);
assert.match(paper, /Never invent a live door/);
assert.match(paper, /Never claim a banned host is LIVE/);
assert.match(paper, /service binding/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /No new MCP tool/);
assert.match(paper, /BAN-NO-LIE/);
assert.match(paper, /BAN-NO-HYDRA/);
assert.match(paper, /BAN-NO-SECOND-DOOR/);
assert.match(paper, /https:\/\/www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(paper, /15:20 chrome visible|clock face on the homepage/i);
assert.match(survival, /BAN-SURVIVAL-1\.0/);
assert.match(nodeMesh, /BAN-SURVIVAL-1\.0/);
assert.match(clientUpdate, /BAN-SURVIVAL-1\.0/);
assert.match(citeDoc, /BAN-SURVIVAL-1\.0/);
assert.match(designsReadme, /BAN-SURVIVAL-1\.0/);

assert.ok(SUITE_DESIGNS.some((d) => d.id === BAN_SURVIVAL && d.kind === "law" && d.status === "live"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("ban_survival"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("runtime_survival"));
assert.equal(PUBLIC_MCP_TOOLS.includes("fraggate_call"), true);

assert.deepEqual(namedExecOrigins(), [
  PRIMARY_WORKER_ORIGIN,
  "https://www.azielcorpuslibrary.net/runtime",
  "https://www.azieleliab.com/runtime",
  "https://godlock.uk/runtime",
]);
assert.ok(NAMED_ROUTES.every((r) => r.independent === false));
assert.ok(NAMED_ROUTES.every((r) => r.blast_radius === "cf-github"));
assert.equal(COLD_FALLBACK.plane_b.status, "slot");
assert.equal(COLD_FALLBACK.plane_c.status, "slot");
assert.equal(COLD_FALLBACK.lockset_tip, LOCKSET_TIP);
assert.ok(CLIENT_ORDER.length >= 4);
assert.ok(EXEC_PATHS.includes("/mcp"));
assert.ok(EXEC_PATHS.includes("/v1/fraggate/call"));
assert.ok(READ_PATHS.includes("/survival"));
assert.ok(READ_PATHS.includes("/cite.json"));
assert.ok(READ_PATHS.includes("/shelves"));
assert.equal(isExecPath("/mcp"), true);
assert.equal(isExecPath("/cite.json"), false);
assert.equal(isReadPath("/survival"), true);
assert.equal(isSurvivalPath("/doors"), true);
assert.equal(isSurvivalPath("/v1/failover"), true);
assert.equal(isSurvivalPath("/mcp"), false);

assert.equal(judgeBannedHostLive({ banned_host_is_live: true }).reason, REFUSE.NO_LIE);
assert.equal(judgeUnmarkedHydra({ unnamed_failover: true }).reason, REFUSE.NO_HYDRA);
assert.equal(judgeSecondDoor({ secret_backdoor: true }).reason, REFUSE.NO_SECOND_DOOR);
assert.equal(judgeInventedLiveShelf({ plane_b_live: true }).reason, REFUSE.NO_FAN);
assert.equal(judgeLlmReplica({ llm_memory_is_replica: true }).reason, REFUSE.NO_LLM_REPLICA);
assert.equal(applyBanSurvival({}).ok, true);
assert.equal(applyBanSurvival({ lie_to_survive: true, second_door: true }).ok, false);

assert.deepEqual(parseBlockedRoutes({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp,library-runtime" }), [
  { id: "workers-dev", path: "/mcp" },
  { id: "library-runtime", path: null },
]);
assert.equal(doorMode({}), "LIVE");
assert.equal(doorMode({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" }), "DEGRADED");
assert.ok(isRouteBlocked({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" }, PRIMARY_WORKER_ORIGIN, "/mcp"));
assert.equal(isRouteBlocked({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" }, PRIMARY_WORKER_ORIGIN, "/cite.json"), null);

const quarantined = blockedRouteRefuse({ id: "workers-dev", path: "/mcp" }, PRIMARY_WORKER_ORIGIN);
assert.equal(quarantined.status, 503);
assert.equal(quarantined.mode, "DEGRADED");
assert.equal(quarantined.lie_to_survive, false);
assert.equal(quarantined.failover.spec, BAN_SURVIVAL);

assert.deepEqual(bridgeOrigins({ url: "https://example.test/runtime" }, {}), ["https://example.test/runtime"]);
assert.deepEqual(bridgeOrigins({}, { AZIEL_RUNTIME_FAILOVER: "0" }), [PRIMARY_WORKER_ORIGIN]);
assert.ok(bridgeOrigins({}, {}).includes("https://www.azielcorpuslibrary.net/runtime"));
assert.equal(nextExecOrigin(PRIMARY_WORKER_ORIGIN), "https://www.azielcorpuslibrary.net/runtime");
assert.equal(shouldFailoverStatus(429), true);
assert.equal(shouldFailoverStatus(200), false);

const cite = survivalCiteField(PRIMARY_WORKER_ORIGIN);
assert.equal(cite.spec, BAN_SURVIVAL);
assert.equal(cite.doi, null);
assert.equal(cite.second_door, false);
assert.equal(cite.software_tab, false);
assert.equal(cite.cold_fallback.plane_b, "slot");
assert.match(cite.survival, /\/survival$/);

const doc = survivalDoc(PRIMARY_WORKER_ORIGIN, { BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" });
assert.equal(doc.mode, "DEGRADED");
assert.equal(doc.fraggate_is_the_door, true);
assert.equal(doc.routes[0].status, "blocked");
assert.deepEqual(doc.routes[0].blocked_paths, ["/mcp"]);
assert.equal(doc.routes[1].status, "live");
assert.equal(doc.cold_fallback.plane_b.live_ready, false);

const http = dispatchSurvivalHttp("GET", "/survival", PRIMARY_WORKER_ORIGIN, {});
assert.equal(http.status, 200);
assert.equal(http.body.spec, BAN_SURVIVAL);
assert.equal(http.body.mode, "LIVE");
assert.equal(dispatchSurvivalHttp("POST", "/survival", PRIMARY_WORKER_ORIGIN, {}).status, 405);

const failover = rateLimitFailoverCite({ scope: "mcp", limit: 1, retry_after: 2 }, PRIMARY_WORKER_ORIGIN);
assert.equal(failover.spec, BAN_SURVIVAL);
assert.equal(failover.rate_limit.code, "RATE_LIMIT");
assert.ok(failover.exec_origins.includes(PRIMARY_WORKER_ORIGIN));
assert.equal(failoverCite(PRIMARY_WORKER_ORIGIN).lie_to_survive, false);

const llms = survivalLlmsBlock(PRIMARY_WORKER_ORIGIN);
assert.match(llms, /BAN-SURVIVAL-1\.0/);
assert.match(llms, BAN_SURVIVAL_TIP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
assert.match(llms, /Never invent a live door/);
assert.match(survivalSkillMarkdown(PRIMARY_WORKER_ORIGIN), /DEGRADED/);
assert.match(BAN_SURVIVAL_RULE, /Never invent a live door/);

const handler = (await import("../src/index.js")).default.fetch;
const origin = PRIMARY_WORKER_ORIGIN;
async function get(path, env = {}) {
  return handler(new Request(origin + path), env);
}
const res = await get("/survival");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.spec, BAN_SURVIVAL);
assert.equal(body.mode, "LIVE");
assert.equal(body.second_door, false);
assert.equal(body.lie_to_survive, false);
assert.match(res.headers.get("cache-control") || "", /max-age=120/);

const citeRes = await get("/cite.json");
const citeBody = await citeRes.json();
assert.equal(citeBody.ban_survival.spec, BAN_SURVIVAL);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/survival"]);
assert.ok(openapi.paths["/v1/survival"]);

const blocked = await handler(
  new Request(origin + "/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }),
  { BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" },
);
assert.equal(blocked.status, 503);
const blockedBody = await blocked.json();
assert.equal(blockedBody.mode, "DEGRADED");
assert.equal(blockedBody.failover.spec, BAN_SURVIVAL);

const stillCite = await get("/cite.json", { BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" });
assert.equal(stillCite.status, 200);

console.log("verify-ban-survival: ok");
