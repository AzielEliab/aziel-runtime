/**
 * SOT-SYNC-1.0: one catalog tip, outlet matrix, dry_run then confirm.
 * Unreachable outlets keep last-known inventory. Softwares stay 42.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { BUILD_GIT_SHA } from "../src/build-meta.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { interfaceLedgerSnapshot, orchestrate } from "../src/interface-orchestrator.js";
import { meshFanoutSuitePresence, resetMeshStore } from "../src/mesh.js";
import { resetSotStore, runSotMeshOp, setOutletPushUrl } from "../src/sot-sync.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

resetMeshStore();
resetSotStore();

let citeDown = false;
const seen = [];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sotFetch(url, init = {}) {
  const u = String(url);
  const method = String(init.method || "GET").toUpperCase();
  seen.push(`${method} ${u}`);
  assert.equal(u.includes("evil.example"), false, "refused hosts are not fetched");
  if (u.startsWith("https://www.azieleliab.com/cite.json") && method === "GET") {
    if (citeDown) throw new Error("cite down");
    return jsonResponse({
      suite_version: "2.0.0-rc1",
      git_sha: BUILD_GIT_SHA,
      softwares_count: 42,
      software: [{ slug: "foldlock", version: "tip-fixture" }],
    });
  }
  if (u === "https://godlock.uk/runtime/v1/software" && method === "GET") {
    return jsonResponse({
      version: "0.0.0-stale",
      git_sha: "abc1234abc1234",
      software: [{ slug: "foldlock", version: "0.0.1" }],
    });
  }
  if (method === "POST" && u.endsWith("/v1/mesh/outlet")) return jsonResponse({ ok: true });
  return new Response("absent", { status: 404 });
}

function env() {
  return { sotFetch };
}

async function jsonReq(path, init = {}) {
  const res = await handler(new Request(origin + path, {
    headers: { "user-agent": "Mozilla/5.0", accept: "application/json" },
    ...init,
  }), env());
  const data = await res.json();
  return { status: res.status, data };
}

function post(path, body) {
  return jsonReq(path, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0", accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
}

const software = await jsonReq("/v1/software");
assert.equal(software.status, 200);
assert.equal(software.data.count, 42);
assert.equal(software.data.software.some((card) => card.slug === "jeeves" || card.slug === "ask-jeeves"), false);
const corpus = software.data.software.find((card) => card.slug === "aziel-corpus");
assert.equal(corpus.suite_help.software_tab, false);
assert.equal(corpus.suite_help.interface_call, "jeeves_help");

const missing = await post("/v1/mesh/sot-sync", {});
assert.equal(missing.status, 400);
assert.equal(missing.data.code, "SOT-CONFIRM-REQUIRED");
assert.equal(missing.data.receipt, null);

const dry = await post("/v1/mesh/sot-sync", { dry_run: true });
assert.equal(dry.status, 200);
assert.equal(dry.data.code, "SOT-DRY-RUN");
assert.equal(dry.data.written, false);
assert.equal(dry.data.receipt, null);
assert.equal(dry.data.sot.version_id, null);
assert.match(dry.data.sot.version_id_note, /does not expose version_id/);
assert.equal(dry.data.sot.softwares_count, 42);
assert.equal(dry.data.sot.git_sha, BUILD_GIT_SHA);
assert.equal(dry.data.sot.ask_jeeves.software_tab, false);
assert.equal(dry.data.sot.ask_jeeves.in_softwares_cards, false);
assert.equal(dry.data.sot.software_slugs.includes("jeeves"), false);
assert.equal(dry.data.live_body_sync, false);
assert.equal(dry.data.mesh_broadcast, false);
assert.equal(dry.data.nodes_unchanged, true);
assert.equal(dry.data.live_nodes_unchanged, true);
assert.ok(dry.data.outlets.length >= 12);
for (const id of ["azieleliab-cite", "azieleliab-jsonld", "azieleliab-llms", "azieleliab-catalog", "godlock.uk-catalog", "library-cite", "corpus-runtime-mirror", "runtime-frozen-cite", "mesh-sot-ledger"]) {
  assert.ok(dry.data.outlets.some((row) => row.id === id), id);
}
const citePlan = dry.data.outlets.find((row) => row.id === "azieleliab-cite");
assert.ok(citePlan.fields.some((field) => field.field === "git_sha"));
assert.equal(citePlan.invented, false);
assert.equal(citePlan.last_applied, null);
const godlockPlan = dry.data.outlets.find((row) => row.id === "godlock.uk-catalog");
assert.equal(godlockPlan.status, "drifted");
assert.ok(godlockPlan.would_change.includes("git_sha"));
assert.ok(godlockPlan.would_change.includes("suite_version"));
const ledgerPlan = dry.data.outlets.find((row) => row.id === "mesh-sot-ledger");
assert.equal(ledgerPlan.last_applied, null);

const pushed = setOutletPushUrl("godlock.uk-catalog", "https://godlock.uk/v1/mesh/outlet");
assert.equal(pushed.ok, true);
const refusedPush = setOutletPushUrl("godlock.uk-catalog", "https://evil.example/hook");
assert.equal(refusedPush.ok, false);

const joined = await post("/v1/mesh/join", {
  product: "foldlock",
  node_id: "foldlock01",
  outlet_hook: "https://aziel-runtime.vibelock.workers.dev/v1/mesh/outlet",
});
assert.equal(joined.status, 200);
assert.equal(joined.data.outlet_hook_stored, true);

const badJoin = await post("/v1/mesh/join", {
  product: "foldlock",
  node_id: "foldlock02",
  outlet_hook: "https://evil.example/hook",
});
assert.equal(badJoin.status, 200);
assert.equal(badJoin.data.outlet_hook_stored, false);
assert.equal(badJoin.data.outlet_hook_refused, "SOT-HOOK-HOST");

await meshFanoutSuitePresence(env());
const meshBefore = await jsonReq("/v1/mesh");
assert.equal(meshBefore.status, 200);

const applied = await post("/v1/mesh/sot-sync", { confirm: true });
assert.equal(applied.status, 200);
assert.equal(applied.data.code, "SOT-APPLIED");
assert.equal(applied.data.decisiongate.final_state, "PASS");
assert.equal(applied.data.receipt.event.spec, "ACT-RECEIPT-1.0");
assert.match(applied.data.receipt.hash, /^[0-9a-f]{64}$/);
assert.equal(typeof applied.data.receipt.request, "string");
assert.equal(typeof applied.data.receipt.output, "string");
assert.equal(applied.data.receipt.event.tool, "sot-sync");
const ledger = applied.data.outlets.find((row) => row.id === "mesh-sot-ledger");
assert.equal(ledger.status, "ok");
assert.equal(ledger.apply, "written");
assert.equal(ledger.last_applied.git_sha, BUILD_GIT_SHA);
assert.equal(ledger.last_applied.softwares_count, 42);
assert.equal(ledger.last_applied.version_id, null);
const godlock = applied.data.outlets.find((row) => row.id === "godlock.uk-catalog");
assert.equal(godlock.apply, "written");
assert.equal(godlock.last_applied.suite_version, applied.data.sot.suite_version);
assert.notEqual(godlock.last_applied.git_sha, "abc1234abc1234");
const cite = applied.data.outlets.find((row) => row.id === "azieleliab-cite");
assert.equal(cite.apply, "awaiting_adapter");
assert.equal(cite.last_applied, null);
assert.equal(cite.last_known.software_versions.foldlock, "tip-fixture");
assert.equal(Object.keys(cite.last_known.software_versions).length, 1);
assert.equal(cite.last_known.software_versions.jeeves, undefined);
const hook = applied.data.outlets.find((row) => row.id === "mesh-foldlock01");
assert.ok(hook);
assert.equal(hook.apply, "written");
assert.equal(hook.last_known, null);
const dark = applied.data.outlets.find((row) => row.id === "azieleliab-jsonld");
assert.equal(dark.status, "unreachable");
assert.equal(dark.last_known, null);
assert.equal(dark.invented, false);

citeDown = true;
const again = await post("/v1/mesh/sot-sync", { confirm: true });
assert.equal(again.status, 200);
const citeAgain = again.data.outlets.find((row) => row.id === "azieleliab-cite");
assert.equal(citeAgain.status, "unreachable");
assert.equal(citeAgain.apply, "unreachable");
assert.equal(citeAgain.last_known.software_versions.foldlock, "tip-fixture");
assert.equal(Object.keys(citeAgain.last_known.software_versions).length, 1);
assert.equal(citeAgain.last_applied, null);
assert.equal(again.data.receipt.previous_hash, applied.data.receipt.hash);

const meshAfter = await jsonReq("/v1/mesh");
assert.equal(meshAfter.data.nodes, meshBefore.data.nodes);
assert.equal(meshAfter.data.live_nodes, meshBefore.data.live_nodes);
assert.equal(meshAfter.data.software_nodes, meshBefore.data.software_nodes);

const listed = await jsonReq("/v1/mesh/outlets");
assert.equal(listed.status, 200);
assert.equal(listed.data.outlets.find((row) => row.id === "mesh-sot-ledger").last_applied.softwares_count, 42);
assert.equal(listed.data.outlets.some((row) => String(row.id).includes("foldlock02")), false);

const door = await post("/v1/fraggate/call", { slug: "mesh", op: "sot-status", payload: {} });
assert.equal(door.status, 200);
assert.equal(door.data.ok, true);
const doorBody = door.data.result || door.data;
assert.equal(doorBody.sot ? doorBody.sot.softwares_count : door.data.sot.softwares_count, 42);

const viaInterface = await orchestrate({ call: "mesh_sot_sync", dry_run: true }, { fetchImpl: sotFetch });
assert.equal(viaInterface.status, 200);
assert.equal(viaInterface.body.code, "SOT-DRY-RUN");
assert.equal(viaInterface.body.receipt, null);
assert.equal(viaInterface.body.tools_list_unchanged, true);
assert.equal(viaInterface.body.confirm_is_consent, true);
assert.equal(viaInterface.body.tenant_auth, false);
assert.equal(viaInterface.body.receipt_same_as_http, true);

const viaMissing = await orchestrate({ call: "mesh_sot_sync" }, { fetchImpl: sotFetch });
assert.equal(viaMissing.body.code, "SOT-CONFIRM-REQUIRED");
assert.equal(viaMissing.body.receipt, null);
const viaBearer = await orchestrate({ call: "mesh_sot_sync", confirm: true, authorization: "Bearer not-consent" }, { fetchImpl: sotFetch });
assert.equal(viaBearer.body.code, "IF-SECRET-REFUSED");
assert.equal(viaBearer.body.receipt == null, true);

const both = await orchestrate({ call: "mesh_sot_sync", dry_run: true, confirm: true }, { fetchImpl: sotFetch });
assert.equal(both.body.code, "SOT-DRY-RUN");
assert.equal(both.body.written, false);
assert.equal(both.body.receipt, null);

const ledgerBefore = interfaceLedgerSnapshot().length;
const viaConfirm = await orchestrate({ call: "mesh_sot_sync", confirm: true }, { fetchImpl: sotFetch });
assert.equal(viaConfirm.status, 200);
assert.equal(viaConfirm.body.code, "SOT-APPLIED");
assert.equal(viaConfirm.body.confirm_is_consent, true);
assert.equal(viaConfirm.body.tenant_auth, false);
assert.match(viaConfirm.body.receipt.hash, /^[0-9a-f]{64}$/);
assert.equal(typeof viaConfirm.body.receipt.request, "string");
assert.equal(typeof viaConfirm.body.receipt.output, "string");
assert.equal(viaConfirm.body.receipt.event.tool, "sot-sync");
assert.equal(viaConfirm.body.receipt.previous_hash, again.data.receipt.hash);
assert.equal(interfaceLedgerSnapshot().length, ledgerBefore);

const slowFetch = (url, init) => {
  const u = String(url);
  if (u.includes("azieleliab.com/cite.json") || u.includes("/person.jsonld")) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response("late", { status: 200 })), 8000);
      if (init && init.signal) {
        init.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        });
      }
    });
  }
  return sotFetch(url, init);
};
const slowStart = Date.now();
const slow = await runSotMeshOp("sot-sync", { dry_run: true, origin }, { sotFetch: slowFetch });
const slowMs = Date.now() - slowStart;
assert.ok(slowMs < 4500, `parallel probes took ${slowMs}ms`);
const slowCite = slow.outlets.find((row) => row.id === "azieleliab-cite");
const slowGodlock = slow.outlets.find((row) => row.id === "godlock.uk-catalog");
assert.equal(slowCite.status, "unreachable");
assert.equal(slowCite.last_known.software_versions.foldlock, "tip-fixture");
assert.equal(slowCite.invented, false);
assert.notEqual(slowGodlock.status, "unreachable");
assert.equal(slow.sot.softwares_count, 42);
assert.equal(slow.sot.version_id, null);

const openapi = await jsonReq("/openapi.json");
assert.ok(openapi.data.paths["/v1/mesh/sot"]);
assert.ok(openapi.data.paths["/v1/mesh/outlets"]);
assert.ok(openapi.data.paths["/v1/mesh/sot-sync"]);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PUBLIC_MCP_TOOLS.includes("mesh_sot_sync"), false);

const home = await handler(new Request(origin + "/", { headers: { "user-agent": "Mozilla/5.0", accept: "text/html" } }), env());
const html = await home.text();
assert.match(html, /data-domain-tab="elroi"/);
assert.match(html, /data-elroi-tab="corpus"/);
assert.doesNotMatch(html, /data-domain-tab="corpus"/);
assert.match(html, /id="sot-desk"/);

console.log("verify-sot-sync: ok");
