/**
 * Session object: open → policy → exec → receipt → close.
 * Hash chain is owned by aziel-runtime. Close rejects further exec.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  applyClose,
  applyOpen,
  applyPolicy,
  canonicalize,
  commitExec,
  digestText,
  newSessionId,
  openSession,
  recordIntent,
  sha256Hex,
  verifyChainStrict,
} from "../src/session-core.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

const env = {
  AZCLCE: {
    fetch: async () =>
      new Response(JSON.stringify({ ok: true, triple: 0.66, note: "mock" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  },
};
env.SESSION = memorySessionNamespace(env);

async function req(path, init) {
  return handler(new Request(origin + path, init), env);
}

async function jsonReq(path, method, body) {
  const res = await req(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// --- pure core ---
const now = "2026-09-04T00:00:00.000Z";
const sid = newSessionId();
assert.match(sid, /^sess_[a-f0-9]{32}$/);
const session = openSession({ id: sid, now, version: RUNTIME_VERSION, source: "test" });
await applyOpen(session, now);
await applyPolicy(session, { allow_slugs: ["azclce"], max_payload_bytes: 4096 }, "2026-09-04T00:00:01.000Z");
const payload = { r: "login button blue", d: "login form submits", p: "login button submits" };
const payloadText = JSON.stringify(payload);
const { intent } = await recordIntent(
  session,
  { slug: "azclce", op: "score", payload, payloadText, knownSlugs: new Set(["azclce"]) },
  "2026-09-04T00:00:02.000Z",
);
const reqDig = await digestText(payloadText);
const resDig = await digestText('{"ok":true}');
await commitExec(
  session,
  {
    intent,
    status: 200,
    latencyMs: 3,
    requestDigest: reqDig.sha256,
    responseDigest: resDig.sha256,
    error: null,
    upstream: "mock",
    responseBytes: resDig.bytes,
    contentType: "application/json",
  },
  "2026-09-04T00:00:03.000Z",
);
await applyClose(session, "2026-09-04T00:00:04.000Z");
const verified = await verifyChainStrict(session.receipts);
assert.equal(verified.ok, true);
assert.equal(session.receipts.length, 4);
assert.equal(session.receipts[0].event, "open");
assert.equal(session.receipts[1].event, "policy");
assert.equal(session.receipts[2].event, "exec");
assert.equal(session.receipts[3].event, "close");
assert.equal(session.receipts[0].prev_hash, "0".repeat(64));
assert.equal(session.receipts[1].prev_hash, session.receipts[0].hash);
assert.equal(session.receipts[2].owner, "aziel-runtime");
let closed = false;
try {
  await recordIntent(session, { slug: "azclce", op: "score", payload, payloadText, knownSlugs: new Set(["azclce"]) }, now);
} catch (err) {
  closed = err.code === "session_closed";
  assert.equal(err.status, 409);
}
assert.equal(closed, true);

const tampered = structuredClone(session.receipts);
tampered[2].payload.result.status = 999;
const bad = await verifyChainStrict(tampered);
assert.equal(bad.ok, false);
assert.ok(bad.errors.some((e) => e.error === "hash_mismatch"));

const hex = await sha256Hex(canonicalize({ a: 1, b: [2] }));
assert.equal(hex.length, 64);

// --- HTTP happy path ---
const opened = await jsonReq("/v1/session/open", "POST", {});
assert.equal(opened.status, 200);
assert.equal(opened.data.ok, true);
assert.ok(opened.data.session.id.startsWith("sess_"));
assert.equal(opened.data.receipt.event, "open");
const id = opened.data.session.id;

const policy = await jsonReq(`/v1/session/${id}/policy`, "POST", {
  allow_slugs: ["azclce"],
  allow_ops: ["score", "health"],
  max_payload_bytes: 8192,
});
assert.equal(policy.status, 200);
assert.deepEqual(policy.data.session.policy.allow_slugs, ["azclce"]);

const denied = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "foldlock",
  op: "health",
  payload: {},
});
assert.equal(denied.status, 403);
assert.equal(denied.data.code, "slug_not_allowed");

const exec = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "azclce",
  op: "score",
  payload,
});
assert.equal(exec.status, 200);
assert.equal(exec.data.receipt.event, "exec");
assert.equal(exec.data.receipt.owner, "aziel-runtime");
assert.equal(exec.data.exec.status, 200);
assert.equal(exec.data.exec.mode, "local");
assert.equal(exec.data.exec.true_engine_runtime, true);
assert.equal(exec.data.exec.ran_in, "aziel-runtime");
assert.ok(exec.data.display);
assert.match(exec.data.display.title, /AZ-CLCE|Score/);
assert.ok(exec.data.display.summary);
assert.ok(Object.prototype.hasOwnProperty.call(exec.data, "result"));
assert.match(exec.data.exec.engine_digest, /^[a-f0-9]{64}$/);
assert.equal(exec.data.receipt.payload.result.engine_digest, exec.data.exec.engine_digest);
assert.equal(exec.data.receipt.payload.result.true_engine_runtime, true);
assert.equal(exec.data.receipt.payload.result.ran_in, "aziel-runtime");
assert.ok(exec.data.receipt.payload.intent.payload_digest);
assert.ok(exec.data.receipt.payload.result.response_digest);
assert.match(exec.data.receipt.hash, /^[a-f0-9]{64}$/);

const receipt = await jsonReq(`/v1/session/${id}/receipt`, "GET");
assert.equal(receipt.status, 200);
assert.equal(receipt.data.verified.ok, true);
assert.equal(receipt.data.receipt.event, "exec");

const receipts = await jsonReq(`/v1/session/${id}/receipts`, "GET");
assert.equal(receipts.status, 200);
assert.equal(receipts.data.verified.ok, true);
assert.ok(receipts.data.receipts.length >= 3);

const closedHttp = await jsonReq(`/v1/session/${id}/close`, "POST", {});
assert.equal(closedHttp.status, 200);
assert.equal(closedHttp.data.session.closed, true);
assert.equal(closedHttp.data.receipt.event, "close");
assert.equal(closedHttp.data.verified.ok, true);

const after = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "azclce",
  op: "score",
  payload,
});
assert.equal(after.status, 409);
assert.equal(after.data.code, "session_closed");

const afterPolicy = await jsonReq(`/v1/session/${id}/policy`, "POST", { allow_slugs: ["*"] });
assert.equal(afterPolicy.status, 409);

// MCP session tools exist
const mcpList = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  env,
);
const mcpTools = (await mcpList.json()).result.tools;
const tools = mcpTools.map((t) => t.name);
for (const name of [
  "runtime_session_open",
  "runtime_session_policy",
  "runtime_session_exec",
  "runtime_session_receipt",
  "runtime_session_receipts",
  "runtime_session_close",
]) {
  assert.ok(tools.includes(name), name);
}
assert.ok(tools.includes("runtime_run"), "runtime_run");
const sessionTool = mcpTools.find((t) => t.name === "runtime_session_open");
assert.match(sessionTool.description, /\[advanced\/internal\]/);

const openapi = await (await req("/openapi.json")).json();
assert.ok(openapi.paths["/v1/session/open"]);
assert.ok(openapi.paths["/v1/session/{id}/exec"]);
assert.ok(openapi.paths["/v1/session/{id}/close"]);

const skill = await (await req("/v1/skill")).text();
assert.match(skill, /1\.1\.0 = catalog \+ pull \+ proxy/);
assert.match(skill, /1\.2\.0 = session-runtime/);
assert.match(skill, /1\.3\.0/);
assert.match(skill, /1\.4\.0/);
assert.match(skill, /1\.4\.1/);
assert.match(skill, /1\.6\.0/);
assert.match(skill, /1\.5\.0/);
assert.match(skill, /How an agent uses this like software/);
assert.match(skill, /open → policy → exec/);
assert.match(skill, /Proxy without a session receipt is \*\*not\*\* exec/);
assert.match(skill, /engine_digest/);

const manifest = await (await req("/v1/runtime.json")).json();
assert.equal(manifest.role, "engine-runtime");
assert.equal(manifest.proxy_is_not_exec, true);
assert.ok(manifest.true_engine_slugs.includes("azclce"));
assert.ok(manifest.endpoints.session_exec.includes("/v1/session/{id}/exec"));

// CLI local open/policy/close (no network)
const home = await mkdtemp(join(tmpdir(), "aziel-runtime-"));
function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, "cli/aziel-runtime.mjs"), "--local", ...args], {
      env: { ...process.env, AZIEL_RUNTIME_HOME: home },
      cwd: root,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(err || out || `exit ${code}`));
      else resolve(JSON.parse(out));
    });
  });
}
const cliOpen = await runCli(["session", "open"]);
assert.equal(cliOpen.mode, "local");
assert.ok(cliOpen.session.id);
const cliPol = await runCli(["session", "policy", "--allow-slugs", "azclce"]);
assert.deepEqual(cliPol.session.policy.allow_slugs, ["azclce"]);
const cliExec = await runCli([
  "session",
  "exec",
  "azclce",
  "score",
  '{"r":"login button blue","d":"login form submits","p":"login button submits"}',
]);
assert.equal(cliExec.exec.mode, "local");
assert.equal(cliExec.exec.true_engine_runtime, true);
assert.equal(cliExec.exec.ran_in, "local-jail");
assert.match(cliExec.exec.engine_digest, /^[a-f0-9]{64}$/);
assert.equal(cliExec.receipt.payload.result.true_engine_runtime, true);
assert.equal(cliExec.receipt.payload.result.ran_in, "local-jail");
const cliClose = await runCli(["session", "close"]);
assert.equal(cliClose.session.closed, true);
assert.equal(cliClose.verified.ok, true);
await rm(home, { recursive: true, force: true });

assert.ok(PRODUCTS.length >= 20);
console.log(`ok session ${RUNTIME_VERSION}: core chain, HTTP open→policy→exec→receipt→close, 409 after close, MCP, CLI --local`);
