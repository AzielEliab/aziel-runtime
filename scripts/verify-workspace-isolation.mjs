/**
 * F02 caller isolation: public-demo vs private-workspace.
 * HTTP + MCP. confirm:true is not authentication.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { resetAzhubStore } from "../src/engines/azhub/engine.js";
import { resetAzinterfaceStore } from "../src/engines/azinterface/engine.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryUsesKv } from "../src/uses.js";
import { PUBLIC_DEMO_ID, resolveCallerWorkspace } from "../src/workspace.js";

resetLedger();
resetAzhubStore();
resetAzinterfaceStore();

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

function makeEnv(token) {
  const env = {
    REQUIRE_TOKEN: "1",
    RUNTIME_TOKEN: token,
    USES: memoryUsesKv(),
    AZMAIL_MESH: memoryUsesKv(),
    AZBROWSER_TABS: memoryUsesKv(),
  };
  env.SESSION = memorySessionNamespace(env);
  return env;
}

async function fraggate(env, body, headers = {}) {
  const res = await handler(
    new Request(origin + "/v1/fraggate/call", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    env,
  );
  return { status: res.status, body: await res.json() };
}

async function mcpCall(env, args, headers = {}) {
  const res = await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "fraggate_call", arguments: args },
      }),
    }),
    env,
  );
  return { status: res.status, body: await res.json() };
}

async function sessionOpen(env, token) {
  const res = await handler(
    new Request(origin + "/v1/session/open", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    }),
    env,
  );
  const data = await res.json();
  assert.equal(res.status, 200, JSON.stringify(data));
  assert.match(data.session.id, /^sess_[a-f0-9]{32}$/);
  return data.session.id;
}

async function sessionExec(env, token, sessionId, slug, op, payload) {
  const res = await handler(
    new Request(`${origin}/v1/session/${sessionId}/exec`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slug, op, payload }),
    }),
    env,
  );
  return { status: res.status, body: await res.json() };
}

function listedIds(result) {
  const regions = (result && result.regions) || [];
  return regions.flatMap((r) => (r.modules || []).map((m) => m.id));
}

// --- resolver honesty ---
const demo = await resolveCallerWorkspace({
  request: new Request(origin + "/v1/fraggate/call", { method: "POST" }),
  env: { REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "local-audit-secret" },
});
assert.equal(demo.ok, true);
assert.equal(demo.workspace.contract, "public-demo");
assert.equal(demo.workspace.workspace_id, PUBLIC_DEMO_ID);
assert.equal(demo.workspace.shared, true);
assert.equal(demo.workspace.isolated, false);
assert.equal(demo.workspace.confirm_is_not_auth, true);

const mismatch = await resolveCallerWorkspace({
  request: new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { Authorization: "Bearer nope" },
  }),
  env: { REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "local-audit-secret" },
});
assert.equal(mismatch.ok, false);
assert.equal(mismatch.code, "token_mismatch");

// --- audit reproduction: two anonymous callers share labeled public-demo ---
const envA = makeEnv("local-audit-secret");
const envB = makeEnv("local-audit-secret");
const placedPublic = await fraggate(envA, {
  slug: "azhub",
  op: "place_module",
  payload: { region: "core", module_id: "local-audit-marker", label: "local-audit-marker" },
});
assert.equal(placedPublic.status, 200);
assert.equal(placedPublic.body.ok, true);
assert.equal(placedPublic.body.result.isolation.contract, "public-demo");
assert.equal(placedPublic.body.result.isolation.shared, true);
assert.match(placedPublic.body.result.isolation.note, /public-demo/);

const readPublic = await fraggate(envB, { slug: "azhub", op: "region_list", payload: {} });
assert.equal(readPublic.status, 200);
assert.equal(listedIds(readPublic.body.result).includes("local-audit-marker"), true);
assert.equal(readPublic.body.result.isolation.contract, "public-demo");
assert.equal(readPublic.body.isolation.contract, "public-demo");

// --- public cannot read private operator workspace ---
const alice = makeEnv("alice-secret");
const bobPublic = makeEnv("bob-secret");
const alicePlace = await fraggate(
  alice,
  { slug: "azhub", op: "place_module", payload: { region: "core", module_id: "alice-private" } },
  { Authorization: "Bearer alice-secret" },
);
assert.equal(alicePlace.status, 200);
assert.equal(alicePlace.body.result.ok, true);
assert.equal(alicePlace.body.result.isolation.contract, "private-workspace");
assert.equal(alicePlace.body.result.isolation.auth, "runtime_token");
assert.equal(alicePlace.body.result.isolation.isolated_from_public_demo, true);

const publicSeesAlice = await fraggate(bobPublic, { slug: "azhub", op: "region_list", payload: {} });
assert.equal(listedIds(publicSeesAlice.body.result).includes("alice-private"), false);
assert.equal(publicSeesAlice.body.result.isolation.contract, "public-demo");

// --- private cannot read public-demo ---
const publicMarker = await fraggate(alice, {
  slug: "azhub",
  op: "place_module",
  payload: { region: "core", module_id: "public-only-marker" },
});
assert.equal(publicMarker.body.result.isolation.contract, "public-demo");
const aliceLists = await fraggate(
  alice,
  { slug: "azhub", op: "region_list", payload: {} },
  { Authorization: "Bearer alice-secret" },
);
assert.equal(listedIds(aliceLists.body.result).includes("public-only-marker"), false);
assert.equal(listedIds(aliceLists.body.result).includes("alice-private"), true);

// --- two operator tokens cannot read each other ---
const bob = makeEnv("bob-secret");
const bobPlace = await fraggate(
  bob,
  { slug: "azhub", op: "place_module", payload: { region: "core", module_id: "bob-private" } },
  { Authorization: "Bearer bob-secret" },
);
assert.equal(bobPlace.body.result.isolation.contract, "private-workspace");
const bobLists = await fraggate(
  bob,
  { slug: "azhub", op: "region_list", payload: {} },
  { Authorization: "Bearer bob-secret" },
);
assert.equal(listedIds(bobLists.body.result).includes("bob-private"), true);
assert.equal(listedIds(bobLists.body.result).includes("alice-private"), false);
assert.equal(listedIds(aliceLists.body.result).includes("bob-private"), false);

// --- confirm:true is not authentication ---
const confirmOnly = await fraggate(alice, {
  slug: "azhub",
  op: "region_list",
  payload: { owner: "alice", workspace_id: "ws_operator_fake", confirm: true },
  confirm: true,
  owner: "alice",
  workspace_id: "steal-alice",
});
assert.equal(confirmOnly.body.result.isolation.contract, "public-demo");
assert.equal(listedIds(confirmOnly.body.result).includes("alice-private"), false);

// --- MCP public vs token (same rules) ---
function mcpEngine(mcp) {
  const fg = mcp.body && mcp.body.result && mcp.body.result.structuredContent && mcp.body.result.structuredContent.result;
  return fg && fg.result ? fg.result : fg;
}

const mcpPublic = await mcpCall(alice, {
  slug: "azhub",
  op: "place_module",
  payload: { region: "west", module_id: "mcp-public-marker" },
  confirm: true,
});
assert.equal(mcpPublic.body.result.structuredContent.code, "FG-OK");
assert.equal(mcpEngine(mcpPublic).isolation.contract, "public-demo");

const mcpAlice = await mcpCall(
  alice,
  {
    slug: "azhub",
    op: "region_list",
    payload: {},
    confirm: true,
  },
  { Authorization: "Bearer alice-secret" },
);
const mcpAliceIds = listedIds(mcpEngine(mcpAlice));
assert.equal(mcpAliceIds.includes("alice-private"), true);
assert.equal(mcpAliceIds.includes("mcp-public-marker"), false);

const mcpBob = await mcpCall(
  bob,
  { slug: "azhub", op: "region_list", payload: {}, confirm: true },
  { Authorization: "Bearer bob-secret" },
);
const mcpBobIds = listedIds(mcpEngine(mcpBob));
assert.equal(mcpBobIds.includes("alice-private"), false);
assert.equal(mcpBobIds.includes("bob-private"), true);

// --- session-scoped isolation (HTTP) ---
const sessEnv = makeEnv("session-secret");
const sessA = await sessionOpen(sessEnv, "session-secret");
const sessB = await sessionOpen(sessEnv, "session-secret");
assert.notEqual(sessA, sessB);
const execA = await sessionExec(sessEnv, "session-secret", sessA, "azhub", "place_module", {
  region: "core",
  module_id: "session-a-only",
});
assert.equal(execA.status, 200);
assert.equal(execA.body.result.isolation.contract, "private-workspace");
assert.equal(execA.body.result.isolation.auth, "session");
assert.equal(execA.body.result.isolation.isolated, true);

const execB = await sessionExec(sessEnv, "session-secret", sessB, "azhub", "region_list", {});
assert.equal(listedIds(execB.body.result).includes("session-a-only"), false);
const execAList = await sessionExec(sessEnv, "session-secret", sessA, "azhub", "region_list", {});
assert.equal(listedIds(execAList.body.result).includes("session-a-only"), true);

// FragGate + verified session_id uses the same session workspace
const doorSess = await fraggate(
  sessEnv,
  { slug: "azhub", op: "region_list", payload: {}, session_id: sessA },
  { Authorization: "Bearer session-secret" },
);
assert.equal(listedIds(doorSess.body.result).includes("session-a-only"), true);
assert.equal(doorSess.body.result.isolation.auth, "session");

const doorSessB = await fraggate(
  sessEnv,
  { slug: "azhub", op: "region_list", payload: {}, session_id: sessB },
  { Authorization: "Bearer session-secret" },
);
assert.equal(listedIds(doorSessB.body.result).includes("session-a-only"), false);

const doorSessAnon = await fraggate(sessEnv, {
  slug: "azhub",
  op: "region_list",
  payload: {},
  session_id: sessA,
});
assert.equal(doorSessAnon.status, 401);
assert.equal(doorSessAnon.body.code, "token_required");

// --- AZInterface cycle state does not bleed ---
resetAzinterfaceStore();
const ifaceA = await fraggate(
  alice,
  { slug: "azinterface", op: "integrity_check", payload: { witness: "alice-w" } },
  { Authorization: "Bearer alice-secret" },
);
assert.equal(ifaceA.body.result.current, "integrity");
assert.equal(ifaceA.body.result.isolation.contract, "private-workspace");
const ifacePublic = await fraggate(alice, { slug: "azinterface", op: "page_cycle_status", payload: {} });
assert.equal(ifacePublic.body.result.current, "OFF");
assert.equal(ifacePublic.body.result.isolation.contract, "public-demo");
const ifaceBob = await fraggate(
  bob,
  { slug: "azinterface", op: "page_cycle_status", payload: {} },
  { Authorization: "Bearer bob-secret" },
);
assert.equal(ifaceBob.body.result.current, "OFF");
assert.equal(ifaceBob.body.result.isolation.contract, "private-workspace");

const ready = await handler(new Request(origin + "/v1/ready"), alice);
const readyBody = await ready.json();
assert.equal(readyBody.fraggate_call_public, true);
assert.match(readyBody.token_note, /Public FragGate call stays open/);
assert.equal(readyBody.workspace_isolation.confirm_is_not_auth, true);

console.log("ok workspace-isolation F02: public-demo labeled; private HTTP+MCP isolated; confirm≠auth");
