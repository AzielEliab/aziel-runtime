/**
 * Human-side interface orchestration.
 * Plans do not launch or append. Seal uses ACT-RECEIPT-1.0 fields.
 * Live dispatch goes through FragGate. tools/list stays 36.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import {
  INTERFACE_MCP_METHOD,
  VEILLOCK_UI_SCHEMA,
  orchestrate,
  resetInterfaceLedger,
} from "../src/interface-orchestrator.js";
import {
  hashActReceipt,
  recordActReceipt,
  shouldMintActReceipt,
} from "../src/library-receipts.js";
import { memorySessionNamespace } from "../src/session-do.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

resetInterfaceLedger();

async function get(path) {
  return handler(new Request(origin + path, { headers: { accept: "application/json" } }), env);
}

async function post(path, body, headers = {}) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    env,
  );
}

function assertClosed(body) {
  assert.equal(body.joined_call, false);
  assert.equal(body.registered_camera, false);
  assert.equal(body.returns_argv, false);
  assert.equal(body.returns_key, false);
  assert.equal(body.lifts_veil, false);
  assert.equal(body.writes_recording, false);
  assert.equal(body.increments_downloads, false);
  assert.equal(body.launched, false);
  assert.equal(body.boots_local_desk, false);
  assert.equal(body.separate_azinterface_product, false);
  assert.equal(body.writes_public_chain, false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "argv"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "env"), false);
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.identity, "Aziel Eliab only");
  assert.deepEqual(body.lamb_lens, ["Service", "Clarity", "Peace"]);
}

const contractRes = await get("/v1/interface");
assert.equal(contractRes.status, 200);
const contract = await contractRes.json();
assertClosed(contract);
assert.equal(contract.contract.schema, VEILLOCK_UI_SCHEMA);
assert.equal(contract.contract.catalog_status, "local_only");
assert.deepEqual(contract.contract.public_door_ops, []);
assert.equal(contract.contract.local_only, true);
assert.equal(contract.contract.separate_azinterface_product, false);
assert.equal(contract.contract.orchestration_host.built, true);
assert.equal(contract.contract.orchestration_host.software_contract_said_built, false);
assert.equal(contract.contract.orchestration_host.mcp_method, INTERFACE_MCP_METHOD);
assert.equal(contract.contract.receipts.writes_public_chain, false);
assert.deepEqual(contract.contract.receipts.fields_owned_by_runtime, ["hash", "request", "output", "event"]);
assert.deepEqual(contract.contract.receipts.attempt_fields_filled_by_runtime, [
  "request_id",
  "attempt_n",
  "parent_receipt_id",
  "correlation_id",
]);

const tipRes = await get("/v1/interface/forensic");
assert.equal(tipRes.status, 200);
const tip = await tipRes.json();
assert.equal(tip.call, "forensic_tip");
assert.equal(tip.durable, false);
assert.equal(tip.rewrite_key, false);
assert.equal(tip.forensic_finding, false);
assert.equal(tip.court_filing, false);
assert.equal(tip.empty_tip_is_not_success, true);
assert.equal(tip.roster_read, undefined);

assert.equal(shouldMintActReceipt("POST", "/v1/interface"), false);
assert.equal(shouldMintActReceipt("GET", "/v1/interface"), false);
assert.equal(shouldMintActReceipt("POST", "/mcp"), true);

let fetches = 0;
const fetchImpl = async () => {
  fetches += 1;
  throw new Error("public append must not run for a plan");
};
const secret = "super-secret-value";
const refused = await orchestrate({ call: "join_plan", key: secret, url: "https://example.test/meet" }, { fetchImpl });
assert.equal(refused.status, 400);
assert.equal(refused.body.code, "IF-SECRET-REFUSED");
assert.equal(JSON.stringify(refused.body).includes(secret), false);
assert.equal(fetches, 0);

const shell = await orchestrate({ call: "engulf_plan", app: "zoom;id" }, { fetchImpl });
assert.equal(shell.status, 400);
assert.equal(shell.body.code, "IF-BAD-INPUT");
assert.equal(shell.body.executed, false);

const localCmd = await orchestrate({ call: "join", url: "https://teams.microsoft.com/l/meetup-join/abc" }, { fetchImpl });
assert.equal(localCmd.status, 400);
assert.equal(localCmd.body.code, "IF-LOCAL-COMMAND");
assert.equal(localCmd.body.joined_call, false);

const engulf = await orchestrate(
  { call: "engulf_plan", app: "zoom", platform: "linux", have_vcam: true, have_bwrap: true, video_device: "/dev/video10" },
  { fetchImpl },
);
assert.equal(engulf.status, 200);
assertClosed(engulf.body);
assert.equal(engulf.body.engulfs, false);
assert.equal(engulf.body.launch, "not-run");
assert.equal(engulf.body.capability_flags_ignored, true);
assert.equal(engulf.body.detector, "not-run");
assert.equal(engulf.body.video_device_opened, false);
assert.equal(engulf.body.sealed, false);
assert.equal(engulf.body.receipt.spec, "ACT-RECEIPT-1.0");
assert.equal(fetches, 0);

const join = await orchestrate(
  { call: "join_plan", url: "https://teams.microsoft.com/l/meetup-join/abc", platform: "chromium", request_id: "req_interface_1" },
  { fetchImpl },
);
assert.equal(join.status, 200);
assertClosed(join.body);
assert.equal(join.body.executed, false);
assert.equal(join.body.command, null);
assert.equal(join.body.camera, null);
assert.equal(join.body.matched, null);
assert.equal(join.body.attempt_n, 1);
assert.equal(join.body.parent_receipt_id, null);
const again = await orchestrate({ call: "join_plan", request_id: "req_interface_1" }, { fetchImpl });
assert.equal(again.body.attempt_n, 2);
assert.equal(again.body.parent_receipt_id, join.body.receipt.hash);
const recomputed = await hashActReceipt({
  previous_hash: again.body.receipt.previous_hash,
  request: again.body.receipt.request,
  output: again.body.receipt.output,
  event: again.body.receipt.event,
});
assert.equal(recomputed, again.body.receipt.hash);
const tampered = { ...again.body.receipt, output: "launched the camera" };
const tamperedHash = await hashActReceipt({
  previous_hash: tampered.previous_hash,
  request: tampered.request,
  output: tampered.output,
  event: tampered.event,
});
assert.notEqual(tamperedHash, again.body.receipt.hash);

const status = await orchestrate({ call: "status_report" }, { fetchImpl });
assert.equal(status.body.veil, null);
assert.equal(status.body.consent.known, false);
assert.equal(status.body.consent.azos_hook, null);
assert.equal(status.body.lifts_veil, false);

const mesh = await orchestrate({ call: "mesh_awareness" }, { fetchImpl });
assert.equal(mesh.body.joined, false);
assert.equal(mesh.body.roster_read, false);
assert.equal(mesh.body.live_nodes_changed, false);
assert.equal(mesh.body.downloads_changed, false);
assert.equal(Object.prototype.hasOwnProperty.call(mesh.body, "live_nodes"), false);
assert.equal(mesh.body.get_never_enables, true);

let dispatched = 0;
const preview = await orchestrate(
  { call: "plan", slug: "foldlock", op: "fold-preview", payload: { text: "the cat and the dog" } },
  {
    fetchImpl,
    dispatch: async () => {
      dispatched += 1;
      return { ok: true, code: "FG-OK" };
    },
  },
);
assert.equal(preview.body.would_dispatch, true);
assert.equal(preview.body.executed, false);
assert.equal(dispatched, 0);

const unsealed = await orchestrate({ call: "seal", slug: "foldlock", op: "fold-preview" }, { fetchImpl, dispatch: async () => {
  dispatched += 1;
  return { ok: true, code: "FG-OK" };
} });
assert.equal(unsealed.status, 400);
assert.equal(unsealed.body.code, "IF-CONFIRM-REQUIRED");
assert.equal(dispatched, 0);

const localSeal = await orchestrate({ call: "seal", confirm: true, slug: "veillock", op: "inject" }, { fetchImpl, dispatch: async () => {
  dispatched += 1;
  return { ok: true, code: "FG-OK" };
} });
assert.equal(localSeal.status, 200);
assert.equal(localSeal.body.executed, false);
assert.equal(localSeal.body.action_ok, false);
assert.equal(localSeal.body.door.code, "IF-LOCAL-ONLY");
assert.equal(localSeal.body.sealed, true);
assert.equal(localSeal.body.published, false);
assert.equal(localSeal.body.writes_public_chain, false);
assert.equal(localSeal.body.append_refuse, "no-token");
assert.equal(dispatched, 0);
assert.match(localSeal.body.receipt.hash, /^[a-f0-9]{64}$/);

const doorSeal = await post("/v1/interface", {
  call: "seal",
  confirm: true,
  slug: "foldlock",
  op: "fold-preview",
  payload: { text: "the cat and the dog" },
});
assert.equal(doorSeal.status, 200);
const doorBody = await doorSeal.json();
assert.equal(doorBody.door.ran, true);
assert.equal(doorBody.door.through, "fraggate");
assert.equal(doorBody.door.slug, "foldlock");
assert.equal(doorBody.door.op, "fold-preview");
assert.equal(doorBody.executed, doorBody.door.code === "FG-OK");
assert.equal(doorBody.action_ok, doorBody.executed);
assert.match(doorBody.receipt.output, /FragGate foldlock\/fold-preview as /);
assert.equal(doorBody.writes_public_chain, false);
assert.equal(doorBody.increments_downloads, false);

const listed = await post("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
const tools = await listed.json();
const names = tools.result.tools.map((tool) => tool.name);
assert.equal(names.length, 36);
assert.equal(names.length, PUBLIC_MCP_TOOLS.length);
assert.equal(names.includes("interface_orchestrate"), false);
assert.equal(names.includes(INTERFACE_MCP_METHOD), false);

const mcpPlan = await post("/mcp", {
  jsonrpc: "2.0",
  id: 2,
  method: "interface/orchestrate",
  params: { call: "describe", platform: "darwin", app: "FaceTime" },
});
const mcpBody = await mcpPlan.json();
assert.equal(mcpBody.result.ok, true);
assert.equal(mcpBody.result.executed, false);
assert.equal(mcpBody.result.detector, "not-run");
assert.equal(mcpBody.result.writes_public_chain, false);

const skipped = await recordActReceipt(
  { RECEIPT_APPEND_TOKEN: "test-token" },
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "interface/orchestrate", params: { call: "join_plan" } }),
  }),
  new Response("{}", { status: 200 }),
  async () => {
    fetches += 1;
    throw new Error("generic MCP mint must not append an interface plan");
  },
);
assert.equal(skipped.skipped, true);
assert.equal(skipped.refuse, "interface-orchestrator-owns-append");
assert.equal(fetches, 0);

let appended = 0;
const sealedFetch = async (url, init) => {
  appended += 1;
  assert.equal(String(url), "https://www.azielcorpuslibrary.net/v1/receipts/append");
  const sent = JSON.parse(init.body);
  assert.equal(typeof sent.hash, "string");
  assert.equal(typeof sent.request, "string");
  assert.equal(typeof sent.output, "string");
  assert.equal(typeof sent.event, "object");
  assert.equal(JSON.stringify(sent).includes(secret), false);
  return new Response(JSON.stringify({ ok: true, receipt: sent }), { status: 201 });
};
const published = await orchestrate(
  { call: "seal", confirm: true, slug: "veillock" },
  { env: { RECEIPT_APPEND_TOKEN: "test-token" }, fetchImpl: sealedFetch },
);
assert.equal(published.body.published, true);
assert.equal(published.body.writes_public_chain, true);
assert.equal(published.body.executed, false);
assert.equal(appended, 1);
assert.deepEqual(Object.keys(published.body.receipt).filter((key) => ["hash", "request", "output", "event"].includes(key)).sort(), [
  "event",
  "hash",
  "output",
  "request",
]);

resetInterfaceLedger();
const calls = [];
const intake = await orchestrate(
  { call: "worker_intake", task: "fold this note" },
  { dispatch: async (env) => { calls.push(env); return { ok: true, code: "FG-OK" }; } },
);
assert.equal(intake.status, 200);
assert.equal(intake.body.role, "worker");
assert.equal(intake.body.executed, false);
assert.equal(intake.body.merges, false);
assert.equal(intake.body.deploys, false);
assert.equal(intake.body.writes_public_chain, false);
assert.equal(intake.body.steps.some((step) => step.slug === "foldlock" && step.would_dispatch === true && step.executed === false), true);
assert.equal(calls.length, 0);
assert.equal(intake.body.receipt.event.spec, "ACT-RECEIPT-1.0");

const workerRefused = await orchestrate({ call: "worker_intake", task: "deploy the site" });
assert.equal(workerRefused.status, 400);
assert.equal(workerRefused.body.code, "IF-WORKER-REFUSED");
assert.equal(workerRefused.body.executed, false);

const handoff = await orchestrate({ call: "worker_handoff", task: "fold this note", handoff: "azmail" });
assert.equal(handoff.status, 200);
assert.equal(handoff.body.to, "azmail");
assert.equal(handoff.body.executed, false);
assert.equal(handoff.body.domain, "social");

const workerDesk = await orchestrate({ call: "worker_status" });
assert.equal(workerDesk.body.count, 2);
assert.equal(workerDesk.body.tasks.every((row) => row.executed === false), true);

let observed = 0;
const learned = await orchestrate(
  { call: "learner_learn", pins: [{ pin_id: "pin-1" }] },
  { observeImpl: async () => { observed += 1; return { ok: true }; } },
);
assert.equal(learned.status, 200);
assert.equal(learned.body.role, "learner");
assert.equal(learned.body.invented, false);
assert.equal(learned.body.pins_read, false);
assert.equal(learned.body.mesh_read, false);
assert.equal(learned.body.corpus_searched, false);
assert.equal(learned.body.writes_public_chain, false);
assert.equal(learned.body.memory.attempted, false);
assert.equal(observed, 0);
assert.equal(learned.body.notes.some((note) => note.cites.some((cite) => cite.kind === "domain" && cite.slug === "4dmap")), true);
assert.equal(learned.body.notes.some((note) => note.cites.some((cite) => cite.kind === "paper" && cite.id === "ACT-RECEIPT-1.0")), true);
assert.equal(learned.body.notes.some((note) => note.cites.some((cite) => cite.kind === "software" && cite.slug === "aznet")), true);
assert.equal(learned.body.notes.some((note) => note.cites.some((cite) => cite.kind === "pin" && cite.pin_id === "pin-1" && cite.verified_on_4dmap === false)), true);
assert.equal(learned.body.notes.some((note) => note.cites.some((cite) => cite.kind === "receipt" && cite.hash === intake.body.receipt.hash)), true);
const vibeCite = learned.body.notes.find((note) => note.cites.some((cite) => cite.kind === "vibelock"));
assert.ok(vibeCite);
assert.equal(vibeCite.cites[0].detector_ran, false);
assert.equal(vibeCite.cites[0].file_decoded, false);
assert.equal(vibeCite.cites[0].accuracy, null);
assert.equal(vibeCite.cites[0].contract, "softwares");
assert.equal(JSON.stringify(vibeCite).includes("0.99"), false);
assert.match(vibeCite.text, /physics/);
assert.match(vibeCite.text, /mp4/);

const vibeAccuracy = await orchestrate({ call: "learner_learn", vibelock: { accuracy: 0.99, file: "clip.mp4" } });
assert.equal(vibeAccuracy.status, 400);
assert.equal(vibeAccuracy.body.code, "IF-UNCITED");

const vibeUnknown = await orchestrate({
  call: "learner_learn",
  vibelock: { analysis: { checks: [{ name: "magic-accuracy", score: 0.99 }] } },
});
assert.equal(vibeUnknown.status, 400);
assert.equal(vibeUnknown.body.code, "IF-UNCITED");

const vibeRun = await orchestrate({
  call: "learner_learn",
  papers: ["ACT-RECEIPT-1.0"],
  vibelock: { file: "clip.mp4", features: { rms: 0.1, zcr: 0.08 } },
});
assert.equal(vibeRun.status, 200);
const vibeAdvisory = vibeRun.body.notes.find((note) => note.cites.some((cite) => cite.detector_ran === true));
assert.ok(vibeAdvisory);
assert.equal(vibeAdvisory.cites[0].file_decoded, false);
assert.equal(vibeAdvisory.cites[0].accuracy, null);
assert.equal(vibeAdvisory.cites[0].score_kind, "advisory");
assert.equal(vibeAdvisory.cites[0].channels.some((row) => row.name === "spectral" && typeof row.score === "number"), true);
assert.equal(JSON.stringify(vibeAdvisory).includes("accuracy_percent"), false);

const vibePlan = await orchestrate({ call: "worker_intake", task: "deepfake mp4 physics" });
assert.equal(vibePlan.status, 200);
const vibeStep = vibePlan.body.steps.find((step) => step.slug === "vibelock");
assert.ok(vibeStep);
assert.equal(vibeStep.executed, false);
assert.equal(vibeStep.file_decoded, false);
assert.equal(vibeStep.accuracy, null);
assert.equal(vibeStep.contract, "softwares");

const uncited = await orchestrate({ call: "learner_learn", papers: ["NOT-A-PAPER"] });
assert.equal(uncited.status, 400);
assert.equal(uncited.body.code, "IF-UNCITED");

const remembered = await orchestrate(
  { call: "learner_learn", confirm: true, papers: ["ACT-RECEIPT-1.0"] },
  {
    observeImpl: async (_env, src) => {
      observed += 1;
      assert.equal(String(src.fact).includes("secret"), false);
      assert.equal(typeof src.provenance_hash, "string");
      return { ok: true, code: "AKM-OK" };
    },
  },
);
assert.equal(remembered.status, 200);
assert.equal(remembered.body.memory.attempted, true);
assert.equal(remembered.body.memory.ok, true);
assert.equal(remembered.body.memory.writes_public_chain, false);
assert.equal(observed, 1);

const recalled = await orchestrate({ call: "learner_recall", q: "pin-1" });
assert.equal(recalled.body.notes.some((note) => note.cites.some((cite) => cite.pin_id === "pin-1")), true);
assert.equal(recalled.body.akm.attempted, false);
assert.equal(recalled.body.belief_is_not_truth, true);

const home = await (await get("/workspace")).text();
assert.match(home, /id="interface-panel"/);
assert.match(home, /data-if="join_plan"/);
assert.match(home, /data-if="engulf_plan"/);
assert.match(home, /Seal needs the confirm box/);
assert.match(home, /does not launch/);
assert.match(home, /id="desk-azbot"[^>]*data-role="worker"/);
assert.match(home, /id="desk-azai"[^>]*data-role="learner"/);
assert.match(home, /data-bot="intake"/);
assert.match(home, /data-ai="learn"/);
const panelStart = home.indexOf('id="interface-panel"');
const panelEnd = home.indexOf('id="mesh-panel"');
assert.ok(panelStart > 0 && panelEnd > panelStart);
const panel = home.slice(panelStart, panelEnd);
assert.doesNotMatch(panel, /Human side of this runtime/);
assert.doesNotMatch(panel, /class="honesty"/);
assert.match(panel, /class="sw-grid"/);
assert.match(panel, /id="desk-veillock"/);
assert.match(panel, /id="desk-mesh"/);
assert.match(panel, /id="desk-forensic"/);
assert.match(panel, /id="desk-mcp"/);
assert.match(panel, /class="dash-card"/);
assert.match(panel, /class="receipt-board"/);
assert.match(panel, /class="op-rack"/);
assert.match(panel, /ACT-RECEIPT-1.0/);
assert.doesNotMatch(panel, /data-if="(?:wrap|engulf|join|link|play|record)"/);
assert.match(home, /data-dash-slug="veillock"[\s\S]{0,800}#desk-veillock/);
const veil = await (await get("/p/veillock")).text();
assert.match(veil, /workspace#interface-panel/);
assert.match(veil, /local_only/);
assert.match(veil, /Public door ops stay empty/);
assert.doesNotMatch(veil, /data-slug="veillock"[^>]*data-kind="door"/);

const openapi = await (await get("/openapi.json")).json();
assert.equal(typeof openapi.paths["/v1/interface"].post.operationId, "string");
assert.equal(typeof openapi.paths["/v1/interface/forensic"].get.operationId, "string");

console.log("ok interface orchestrator: plans stay local, seal uses ACT-RECEIPT fields, tools/list stays 36");
