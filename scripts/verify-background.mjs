/**
 * Honest background jobs. Running until a receipt hash. Quiet when missing.
 * tools/list stays 36. FragGate remains the single door.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { mcpInitializeInstructions } from "../src/mcp-surface.js";
import { startRuntimeService } from "../src/runtime-service.js";
import {
  drainBackground,
  honestJobView,
  resetBackgroundJobs,
  sealJob,
} from "../src/background-job.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {};
env.SESSION = memorySessionNamespace(env);

assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PUBLIC_MCP_TOOLS.includes("fraggate_call"), true);
assert.equal(PUBLIC_MCP_TOOLS.includes("fraggate_background"), false);

const instructions = mcpInitializeInstructions({});
assert.match(instructions, /Start here/);
assert.match(instructions, /Tools just work/);
assert.match(instructions, /The door runs before the tool/);
assert.doesNotMatch(instructions, /Call fraggate_list, then fraggate_describe, then fraggate_call/);
assert.match(instructions, /fraggate_call is THE single door/);
assert.match(instructions, /background=true/);
assert.match(instructions, /tools\/list stays 36/);
assert.doesNotMatch(instructions, /\bthis\b/);
assert.doesNotMatch(instructions, /\bAziel\b/);
assert.doesNotMatch(instructions, /\bFragGate\b/);
assert.doesNotMatch(instructions, /\bcounters\b/);
assert.doesNotMatch(instructions, /\bleftover\b/);
assert.doesNotMatch(instructions, /\bretired\b/);

const zero = honestJobView({
  job_id: "job_0123456789abcdef",
  phase: "complete",
  ok: true,
  receipt: { hash: "0".repeat(64) },
  code: "FG-OK",
  message: "Done. Receipt is ready.",
});
assert.equal(zero.done, false);
assert.equal(zero.status, "running");
assert.equal(zero.receipt, null);
assert.equal(zero.code, "FG-BACKGROUND");
assert.match(zero.message, /^Running\./);

const bareOk = sealJob(
  { job_id: "job_0123456789abcdef", phase: "running", receipt: null },
  { ok: true, code: "FG-OK", message: "Done. Receipt is ready." },
);
assert.equal(bareOk.phase, "running");
assert.equal(honestJobView(bareOk).done, false);
assert.equal(honestJobView(bareOk).receipt, null);

function executionContext() {
  return { waitUntil() {} };
}

async function mcp(method, params, id = 1) {
  const res = await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
    env,
    executionContext(),
  );
  assert.equal(res.status, 200);
  return res.json();
}

async function postCall(body, headers = {}) {
  const res = await handler(
    new Request(origin + "/v1/fraggate/call", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    env,
    executionContext(),
  );
  return { status: res.status, data: await res.json(), type: res.headers.get("content-type") || "" };
}

resetBackgroundJobs();

const listed = await mcp("tools/list", {}, 2);
assert.equal(listed.result.tools.length, 36);
const names = listed.result.tools.map((tool) => tool.name);
assert.equal(new Set(names).size, 36);
assert.equal(names.includes("fraggate_background"), false);
const callTool = listed.result.tools.find((tool) => tool.name === "fraggate_call");
assert.match(callTool.description, /CallEnvelope/);
assert.match(callTool.description, /operation-dependent/);
assert.match(callTool.description, /foldlock\/fold-preview/);
assert.match(callTool.description, /dry_run/);
assert.match(callTool.description, /background=true/);
assert.equal(callTool.inputSchema.properties.background.type, "boolean");
assert.match(callTool.inputSchema.properties.job_id.pattern, /job_/);
assert.deepEqual(callTool.inputSchema.required, ["op"]);

const meshStatus = await mcp("tools/call", { name: "mesh_status", arguments: {} }, 3);
assert.equal(meshStatus.result.isError, false);
assert.equal(meshStatus.result.structuredContent.fraggate_entered, true);
assert.notEqual(meshStatus.result.structuredContent.code, "FG-HALLUC-TOOL");

const chainTip = await mcp("tools/call", { name: "chainlock_tip", arguments: {} }, 4);
assert.equal(chainTip.result.isError, false);
assert.equal(chainTip.result.structuredContent.fraggate_entered, true);

const gateCheck = await mcp("tools/call", {
  name: "decisiongate_check",
  arguments: { statement: "Preview a short proposal before any write.", confirm: true },
}, 5);
assert.equal(gateCheck.result.structuredContent.fraggate_entered, true);
assert.notEqual(gateCheck.result.structuredContent.code, "FG-HALLUC-TOOL");

const stubRun = await mcp("tools/call", {
  name: "runtime_run",
  arguments: { slug: "4dmap", op: "truth_score", confirm: true },
}, 6);
assert.equal(stubRun.result.isError, true);
assert.equal(stubRun.result.structuredContent.code, "FG-STUB");
assert.equal(stubRun.result.structuredContent.fraggate_entered, true);

const noConfirm = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "foldlock", op: "fold-preview", payload: { text: "bg" }, background: true },
});
assert.equal(noConfirm.result.isError, true);
assert.equal(noConfirm.result.structuredContent.code, "MCP-CONFIRM-REQUIRED");
assert.equal(noConfirm.result.structuredContent.mutated, false);

const dryBg = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: {
    name: "foldlock/fold-preview",
    payload: { text: "preview" },
    dry_run: true,
    background: true,
  },
});
assert.equal(dryBg.result.isError, false);
assert.equal(dryBg.result.structuredContent.code, "MCP-DRY-RUN");
assert.equal(dryBg.result.structuredContent.mutated, false);
assert.equal(dryBg.result.structuredContent.ledger_written, false);
assert.equal(dryBg.result.structuredContent.result && dryBg.result.structuredContent.result.job_id, undefined);

const dryRefuse = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "not-a-software", op: "health", dry_run: true, background: true },
});
assert.equal(dryRefuse.result.isError, true);
assert.equal(dryRefuse.result.structuredContent.code, "FG-HALLUC-TOOL");
assert.equal(dryRefuse.result.structuredContent.result.ledger_written, false);

const halluc = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "not-a-software", op: "health", confirm: true, background: true },
});
assert.equal(halluc.result.structuredContent.code, "FG-HALLUC-TOOL");
assert.notEqual(halluc.result.structuredContent.code, "FG-BACKGROUND");
assert.ok(halluc.result.structuredContent.ledger_tip, "refused background call still stamps the door ledger");
assert.equal(halluc.result.structuredContent.result && halluc.result.structuredContent.result.status, undefined);

const unknown = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "4dmap", op: "area_estimate", confirm: true, background: true },
});
assert.equal(unknown.result.structuredContent.code, "FG-UNKNOWN-OP");
assert.notEqual(unknown.result.structuredContent.code, "FG-BACKGROUND");

const started = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: {
    name: "foldlock/fold-preview",
    payload: { text: "the cat and the dog" },
    confirm: true,
    background: true,
  },
});
const running = started.result.structuredContent;
assert.equal(started.result.isError, false);
assert.equal(running.code, "FG-BACKGROUND");
assert.equal(running.result.done, false);
assert.equal(running.result.receipt, null);
assert.equal(running.result.status, "running");
assert.equal(running.mutated, false);
assert.equal(running.ledger_written, false);
assert.match(running.display.summary, /^Running\./);
assert.match(running.display.next, /Still running/);
assert.match(running.result.job_id, /^job_[a-f0-9]{16}$/);
assert.doesNotMatch(running.display.summary, /Done/);

await drainBackground();

const polled = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { op: "fold-preview", job_id: running.result.job_id, confirm: true },
});
const done = polled.result.structuredContent;
assert.equal(polled.result.isError, false);
assert.equal(done.code, "FG-OK");
assert.equal(done.result.done, true);
assert.equal(done.result.status, "done");
assert.match(done.result.receipt.hash, /^[a-f0-9]{64}$/);
assert.notEqual(done.result.receipt.hash, "0".repeat(64));
assert.match(done.display.summary, /^Done\./);
assert.equal(done.ledger_written, true);

const quietPoll = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { op: "health", job_id: "job_0123456789abcdef", confirm: true },
});
assert.equal(quietPoll.result.isError, true);
assert.equal(quietPoll.result.structuredContent.code, "job_not_found");
assert.equal(quietPoll.result.structuredContent.result.done, false);
assert.equal(quietPoll.result.structuredContent.result.status, "quiet");
assert.match(quietPoll.result.structuredContent.display.summary, /^Quiet\./);
assert.doesNotMatch(quietPoll.result.structuredContent.display.summary, /Done/);

resetBackgroundJobs();
const httpStart = await postCall({
  slug: "foldlock",
  op: "fold-preview",
  payload: { text: "the cat and the dog" },
  background: true,
});
assert.equal(httpStart.status, 200);
assert.equal(httpStart.data.code, "FG-BACKGROUND");
assert.equal(httpStart.data.done, false);
assert.equal(httpStart.data.receipt, null);
assert.match(httpStart.data.summary, /^Running\./);
assert.match(httpStart.data.job_id, /^job_[a-f0-9]{16}$/);

const httpPreview = await postCall({
  name: "foldlock/fold-preview",
  payload: { text: "preview" },
  dry_run: true,
  background: true,
});
assert.equal(httpPreview.status, 200);
assert.equal(httpPreview.data.code, "MCP-DRY-RUN");
assert.equal(httpPreview.data.mutated, false);
assert.equal(httpPreview.data.ledger_written, false);
assert.equal(httpPreview.data.job_id, undefined);

await drainBackground();
const httpDone = await handler(
  new Request(origin + "/v1/fraggate/background/" + httpStart.data.job_id, {
    headers: { accept: "application/json" },
  }),
  env,
  executionContext(),
);
assert.equal(httpDone.status, 200);
const httpDoneBody = await httpDone.json();
assert.equal(httpDoneBody.done, true);
assert.equal(httpDoneBody.code, "FG-OK");
assert.match(httpDoneBody.receipt.hash, /^[a-f0-9]{64}$/);
assert.match(httpDoneBody.summary, /^Done\./);

const missing = await handler(
  new Request(origin + "/v1/fraggate/background/job_fedcba9876543210", {
    headers: { accept: "application/json" },
  }),
  env,
  executionContext(),
);
assert.equal(missing.status, 404);
const missingBody = await missing.json();
assert.equal(missingBody.code, "job_not_found");
assert.equal(missingBody.status, "quiet");
assert.equal(missingBody.done, false);
assert.equal(missingBody.receipt, null);
assert.match(missingBody.summary, /^Quiet\./);

const html = await handler(
  new Request(origin + "/v1/fraggate/background/job_fedcba9876543210", {
    headers: { accept: "text/html" },
  }),
  env,
  executionContext(),
);
assert.equal(html.status, 404);
assert.match(html.headers.get("content-type") || "", /text\/html/);
const page = await html.text();
assert.match(page, /<p>Quiet\. No record of that job\. Running is not claimed\.<\/p>/);
assert.doesNotMatch(page, /"job_id"/);
assert.doesNotMatch(page, /\{/);

let doorCalls = 0;
const server = await startRuntimeService({
  port: 0,
  onCall() {
    doorCalls += 1;
    return { ok: true };
  },
  onBackground() {
    doorCalls += 1;
    return { ok: true, code: "FG-BACKGROUND" };
  },
  onJob() {
    doorCalls += 1;
    return { code: "job_not_found" };
  },
});
const port = server.address().port;
const statusRes = await fetch(`http://127.0.0.1:${port}/status`);
const statusText = await statusRes.text();
assert.equal(statusRes.status, 200);
assert.match(statusText, /^Running\./);
assert.match(statusText, /does not call FragGate/);
assert.doesNotMatch(statusText, /Done/);
const homeRes = await fetch(`http://127.0.0.1:${port}/`);
assert.match(await homeRes.text(), /^Running\./);
assert.equal(doorCalls, 0);
await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));

function runCli(args, extraEnv, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, "cli/aziel-runtime.mjs"), ...args], {
      env: { ...process.env, ...extraEnv },
      cwd: root,
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`cli timeout: ${args.join(" ")}`));
    }, timeout);
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
}

const home = await mkdtemp(join(tmpdir(), "aziel-bg-"));
const cliEnv = { AZIEL_RUNTIME_HOME: home };
try {
  const preview = await runCli(["call", "foldlock", "fold-preview", "--local", "--dry-run"], cliEnv);
  assert.equal(preview.code, 0, preview.err);
  assert.match(preview.out, /^Preview only\. Nothing was written\./);
  assert.doesNotMatch(preview.out.trim(), /^\{/);

  const refused = await runCli(["call", "not-a-software", "health", "--local", "--dry-run"], cliEnv);
  assert.notEqual(refused.code, 0);
  assert.equal(refused.out, "");
  assert.doesNotMatch(refused.err.trim(), /^\{/);

  const bg = await runCli(
    ["call", "foldlock", "fold-preview", '{"text":"the cat and the dog"}', "--local", "--background"],
    cliEnv,
  );
  assert.equal(bg.code, 0, bg.err);
  assert.match(bg.out, /^Running\./);
  assert.doesNotMatch(bg.out, /Done/);
  assert.doesNotMatch(bg.out.trim(), /^\{/);
  const jobId = (bg.out.match(/job_[a-f0-9]{16}/) || [])[0];
  assert.ok(jobId);

  let finished = null;
  for (let i = 0; i < 40; i++) {
    const poll = await runCli(["job", jobId, "--local"], cliEnv);
    if (poll.code === 0 && /^Done\./.test(poll.out) && /[a-f0-9]{64}/.test(poll.out)) {
      finished = poll;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(finished, "local background call should finish with a receipt hash");
  assert.match(finished.out, /^Done\./);
  assert.doesNotMatch(finished.out.trim(), /^\{/);

  const missingCli = await runCli(["job", "job_0123456789abcdef", "--local"], cliEnv);
  assert.notEqual(missingCli.code, 0);
  assert.match(missingCli.out, /^Quiet\./);
  assert.doesNotMatch(missingCli.out, /Done/);

  const quiet = await runCli(["service", "status"], cliEnv);
  assert.equal(quiet.code, 0, quiet.err);
  assert.match(quiet.out, /^Quiet\./);
  assert.doesNotMatch(quiet.out, /Done/);
  const quietJson = await runCli(["service", "status", "--json"], cliEnv);
  const quietBody = JSON.parse(quietJson.out);
  assert.equal(quietBody.status, "quiet");
  assert.equal(quietBody.door_called, false);

  const noSession = await runCli(
    ["session", "exec", "foldlock", "fold-preview", "{}", "--local", "--background"],
    cliEnv,
  );
  assert.notEqual(noSession.code, 0);
  assert.doesNotMatch(noSession.out, /^Running/);
  assert.match(noSession.err, /session open --local/);

  const opened = await runCli(["session", "open", "--local"], cliEnv);
  assert.equal(opened.code, 0, opened.err);
  const sessionBg = await runCli(
    ["session", "exec", "foldlock", "fold-preview", '{"text":"hello"}', "--local", "--background"],
    cliEnv,
  );
  assert.equal(sessionBg.code, 0, sessionBg.err);
  assert.match(sessionBg.out, /^Running\./);
  const sessionJob = (sessionBg.out.match(/job_[a-f0-9]{16}/) || [])[0];
  assert.ok(sessionJob);
  let sessionDone = null;
  for (let i = 0; i < 40; i++) {
    const poll = await runCli(["job", sessionJob, "--local"], cliEnv);
    if (poll.code === 0 && /^Done\./.test(poll.out) && /[a-f0-9]{64}/.test(poll.out)) {
      sessionDone = poll;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(sessionDone, "session exec --background should finish with a receipt hash");
  assert.doesNotMatch(sessionDone.out.trim(), /^\{/);
} finally {
  await rm(home, { recursive: true, force: true });
}

console.log("ok background: Running until a receipt hash; Quiet when missing; tools/list stays 36");
