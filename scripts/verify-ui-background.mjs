/**
 * Close UI keeps the Worker runtime alive.
 * Detach does not seal a session or leave the mesh.
 * Softwares count stays 42. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memorySessionNamespace } from "../src/session-do.js";
import { UI_SERVICE_WORKER_JS, refreshUiHolds } from "../src/ui-hold.js";

const handler = (await import("../src/index.js")).default.fetch;
const { meshScheduled } = await import("../src/index.js");
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function get(path) {
  return handler(new Request(origin + path, { headers: { accept: "application/json" } }), env);
}

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const software = await (await get("/v1/software")).json();
assert.equal(software.count, 42, "Softwares count stays 42");

const home = await (await handler(new Request(origin + "/"), env)).text();
const workspace = await (await handler(new Request(origin + "/workspace"), env)).text();
for (const html of [home, workspace]) {
  assert.match(html, /id="ui-close"/);
  assert.match(html, />Close UI</);
  assert.match(html, />Seal session</);
  assert.match(html, /id="ui-reopen"/);
  assert.match(html, /addEventListener\("pagehide"/);
  assert.match(html, /\/v1\/ui\/detach/);
  assert.doesNotMatch(html, /beforeunload/);
  const hideAt = html.indexOf('addEventListener("pagehide"');
  const hide = html.slice(hideAt, hideAt + 180);
  assert.doesNotMatch(hide, /\/close|mesh\/leave|session\//);
  const foldAt = html.indexOf('data-dash-slug="foldlock"');
  assert.ok(foldAt > 0);
  const fold = html.slice(foldAt, foldAt + 1400);
  assert.match(fold, /class="dash-card/);
  assert.doesNotMatch(fold, /software-drawer|dash-run-mobile|ui-close|ui-standby/);
}
const homeHeaders = await handler(new Request(origin + "/"), env);
assert.match(homeHeaders.headers.get("content-security-policy") || "", /script-src 'unsafe-inline'/);
assert.match(homeHeaders.headers.get("content-security-policy") || "", /worker-src 'self'/);

const sw = await get("/sw.js");
assert.equal(sw.status, 200);
assert.match(sw.headers.get("content-type") || "", /javascript/);
const swText = await sw.text();
assert.equal(swText, UI_SERVICE_WORKER_JS);
assert.match(swText, /does not run Aziel Runtime/);
assert.match(swText, /\/v1\/ui\/detach/);
assert.doesNotMatch(swText, /\/v1\/session|mesh\/leave|mesh_leave/);

const source = readFileSync(new URL("../src/ui-hold.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /meshLeave|applyClose|\/v1\/session\/\$\{/);

const opened = await (await post("/v1/session/open", {})).json();
assert.equal(opened.ok, true);
const sessionId = opened.session.id;
assert.match(sessionId, /^sess_[a-f0-9]{32}$/);

const nodeId = "ui-hold-node";
const joined = await (await post("/v1/mesh/join", { product: "foldlock", node_id: nodeId, presence: "live", kind: "human", bearer: "human" })).json();
assert.equal(joined.ok, true, JSON.stringify(joined));

const clientKey = "ui-hold-client";
const detached = await (await post("/v1/ui/detach", {
  client_key: clientKey,
  session_id: sessionId,
  node_id: nodeId,
  product: "foldlock",
})).json();
assert.equal(detached.ok, true);
assert.equal(detached.ui, "detached");
assert.equal(detached.runtime, "running");
assert.equal(detached.session_sealed_by_ui, false);
assert.equal(detached.mesh_left_by_ui, false);
assert.equal(detached.browser_timer, false);
assert.equal(detached.invented_heartbeats, false);
assert.equal(detached.fraggate, "untouched");
assert.equal(detached.library_sync, "untouched");
assert.equal(detached.mcp, "untouched");
assert.equal(detached.session_live, true);
assert.equal(detached.session_id, sessionId);
assert.equal(detached.node_id, nodeId);

const status = await (await get("/v1/session/" + sessionId)).json();
assert.equal(status.ok, true);
assert.equal(status.session.closed, false);
assert.equal(status.session.id, sessionId);

const nodes = await (await get("/v1/mesh/nodes")).json();
assert.match(JSON.stringify(nodes), new RegExp(nodeId));

const health = await get("/v1/health");
assert.equal(health.status, 200);
const mesh = await get("/v1/mesh");
assert.equal(mesh.status, 200);
const listed = await get("/v1/fraggate/list");
assert.equal(listed.status, 200);

const cron = await meshScheduled(env, null, "test");
assert.equal(cron.ui_holds.invented_heartbeats, false);
assert.ok(cron.ui_holds.refreshed >= 1, JSON.stringify(cron.ui_holds));
assert.equal(cron.ui_holds.beats.some((row) => row.code === "MESH-UNKNOWN-NODE" && row.client_key === clientKey), false);

const resumed = await (await get("/v1/ui/resume?client_key=" + clientKey)).json();
assert.equal(resumed.hold, true);
assert.equal(resumed.session_id, sessionId);
assert.equal(resumed.session_live, true);
assert.equal(resumed.node_id, nodeId);
assert.equal(resumed.session_sealed_by_ui, false);
assert.equal(resumed.mesh_left_by_ui, false);

const attached = await (await post("/v1/ui/attach", { client_key: clientKey })).json();
assert.equal(attached.ui, "open");
assert.equal(attached.session_live, true);
assert.equal(attached.session_sealed_by_ui, false);
const quiet = await refreshUiHolds(env);
assert.equal(quiet.beats.some((row) => row.client_key === clientKey && row.mesh === "shell-open"), true);

const sealed = await (await post("/v1/session/" + sessionId + "/close", {})).json();
assert.equal(sealed.ok, true);
assert.equal(sealed.session.closed, true);
const afterSeal = await (await get("/v1/ui/resume?client_key=" + clientKey)).json();
assert.equal(afterSeal.session_live, false);
assert.equal(afterSeal.session_sealed_by_ui, false);
assert.match(afterSeal.session_note, /already sealed/);

const bad = await post("/v1/ui/detach", { client_key: "no" });
assert.equal(bad.status, 400);
const badBody = await bad.json();
assert.equal(badBody.code, "UI-BAD-CLIENT");
assert.equal(badBody.session_sealed_by_ui, false);

const contract = await (await get("/v1/ui/hold")).json();
assert.equal(contract.browser_timer, false);
assert.equal(contract.invented_heartbeats, false);
assert.match(contract.note, /does not|not a browser timer|not rejoined/);

console.log("ok close UI keeps runtime alive");
