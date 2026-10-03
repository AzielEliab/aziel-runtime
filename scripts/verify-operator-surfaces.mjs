/**
 * Operator surfaces: AZOS and aziel-runtime share one honesty door.
 * A missing dependency is pending. A mock is not a pass.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { PRODUCTS } from "../src/index.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { softwareCatalog } from "../src/software-catalog.js";
import { operatorPageHtml } from "../src/operator-ui.js";
import { fixtureLabeledScanner } from "../src/engines/azmail/guard.js";
import {
  resetOperatorSurfaces,
  withReceipt,
  azaiReadReceipt,
  learnReceipts,
  latticeTip,
  scannerProbe,
  chooseEngine,
  probeMesh,
  probeOllama,
} from "../src/operator-surfaces.js";

resetOperatorSurfaces();

const pending = [];
function markPending(name, reason) {
  pending.push({ name, status: "pending", reason });
}

async function local(slug, op, payload = {}, env = {}) {
  const ran = await executeLocal({ slug, op, payload, env, ranIn: "aziel-runtime" });
  assert.ok(ran && ran.responseText, `${slug}/${op} returned a body`);
  const body = JSON.parse(ran.responseText);
  return body;
}

function assertLattice(body) {
  assert.equal(body.field_1_0, false);
  assert.equal(body.alt_internet_live, false);
  assert.equal(body.packet_path_live, false);
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.lattice_receipt.present, true);
  assert.equal(body.lattice_receipt.chained, true);
  assert.equal(body.lattice_receipt.missing, false);
  assert.match(body.lattice_receipt.sealed_sha256, /^[a-f0-9]{64}$/);
  const pub = JSON.stringify(body);
  assert.equal(pub.includes("PLAINTEXT-NOTE"), false);
  assert.equal(pub.includes("ciphertext"), false);
}

const catalog = softwareCatalog("https://aziel-runtime.example", PRODUCTS);
assert.equal(catalog.count, 42);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
const localOnly = catalog.software.filter((row) => row.status === "local_only").map((row) => row.slug);
assert.deepEqual(localOnly, ["veillock"]);

const page = operatorPageHtml("https://aziel-runtime.example", null);
const labels = [
  "Get started",
  "What is AZOS?",
  "Server",
  "Bootstrap OS",
  "Full install",
  "Next",
  "Back",
  "Download all",
  "Show details",
  "Try again",
  "Pick my phone myself",
  "Flash AZOS (erases phone)",
  "Use bootstrap app (keeps everything)",
  "Erase and flash",
  "Type the phone model to confirm",
  "Check all now",
  "Check now",
  "Why?",
  "Lock out SIM",
  "Cancel",
  "Use SIM again",
  "Turn off",
  "Open phone settings",
  "Camera: Off",
  "Screen share: Off",
  "I'm done, continue",
  "Stop",
  "Ask",
];
for (const label of labels) assert.ok(page.includes(label), label);
assert.equal(page.includes("15:20"), false);
assert.ok(page.includes("Receipt: missing"));
assert.ok(page.includes("Author: Aziel Eliab"));
assert.equal(page.includes("captcha solver"), false);

const sealed = await withReceipt("azai", "note", { ok: true, _seal_note: "PLAINTEXT-NOTE-XYZ" }, {});
assertLattice(sealed);
assert.equal(JSON.stringify(sealed).includes("PLAINTEXT-NOTE-XYZ"), false);
const opened = await azaiReadReceipt(sealed.lattice_receipt.sealed_sha256);
assert.equal(opened.note, "PLAINTEXT-NOTE-XYZ");
const tip = await latticeTip();
assert.equal(tip.stamp.fact.includes("PLAINTEXT-NOTE"), false);
assert.match(tip.stamp.fact, /^sealed [a-f0-9]{64}$/);
assert.ok(tip.stamp.prev);

await withReceipt("azai", "agent", { ok: false, code: "AGENT-NO-SEND" }, {});
await withReceipt("azos", "cellular", { ok: true, live: true, code: "CELL-LIVE" }, {});
const learned = await learnReceipts();
const learnedAgain = await learnReceipts();
assert.equal(learned.chronology_preserved, true);
assert.equal(learned.ranking_erases_chronology, false);
assert.equal(learned.score_is_source, false);
assert.deepEqual(
  learned.chronology.map((row) => row.seq),
  learnedAgain.chronology.map((row) => row.seq),
);
assert.equal(learned.chronology.at(-1).op, "cellular");
assert.equal(learned.ranking[0].op, "cellular");
assert.equal(learned.ranking[0].score, 3);
assert.ok(learned.ranking.slice(1).every((row) => row.score === 2));
assert.equal(JSON.stringify(learned).includes("PLAINTEXT-NOTE"), false);
const shown = operatorPageHtml("https://aziel-runtime.example", sealed);
assert.ok(shown.includes("Receipt: present, chained"));
assert.equal(shown.includes("PLAINTEXT-NOTE-XYZ"), false);

const dead = { OLLAMA_HOST: "http://127.0.0.1:9" };
const absent = { ...dead, AZMAIL_FORCE_SCANNER_ABSENT: true };

const chatSweep = await local("azchat", "malware_sweep", { text: "hello" }, absent);
assertLattice(chatSweep);
assert.equal(chatSweep.clean, false);
assert.equal(chatSweep.live, false);
assert.equal(chatSweep.code, "AZM-SCAN-ABSENT");

const unlabeled = await local(
  "azbrowser",
  "malware_sweep",
  { text: "hello" },
  { ...dead, AZMAIL_SCANNER: { kind: "fixture", scan: () => ({ ok: true, verdict: "clean" }) } },
);
assert.equal(unlabeled.clean, false);
assert.equal(unlabeled.live, false);
assert.equal(unlabeled.code, "AZM-SCAN-ABSENT");

const fixtureEnv = { ...dead, AZMAIL_SCANNER: fixtureLabeledScanner() };
const mailSweep = await local("azmail", "malware_sweep", { text: "hello" }, fixtureEnv);
assert.equal(mailSweep.clean, true);
assert.equal(mailSweep.live, false);
assert.equal(mailSweep.fixture_labeled, true);
assert.equal(mailSweep.used, true);

const infected = await local("azchat", "airgap", { text: "AZMAIL-FIXTURE-INFECTED" }, fixtureEnv);
assert.equal(infected.clean, false);
assert.equal(infected.live, false);
assert.equal(infected.code, "AZM-SCAN-INFECTED");
assert.equal(infected.plaintext_crossed, false);

const osSweep = await local("azos", "malware_sweep", { text: "hello" }, absent);
assert.equal(osSweep.code, "AZM-SCAN-ABSENT");
assert.equal(osSweep.live, false);

const probe = scannerProbe({});
if (!probe.live) {
  markPending("scanner-live-clean", "ClamAV is not on PATH");
  markPending("scanner-live-infected", "ClamAV is not on PATH");
} else {
  const liveSweep = await local("azmail", "malware_sweep", { text: "hello from azos" }, {});
  assert.equal(liveSweep.live, true);
  assert.equal(liveSweep.clean, true);
  assert.equal(liveSweep.fixture_labeled, false);
}

const bridges = await local("azchat", "bridge_status", {}, dead);
assert.equal(bridges.bridges.whatsapp.end_to_end, false);
assert.equal(bridges.bridges.facebook.live, false);
assert.equal(bridges.bridges.gmail.end_to_end, false);
assert.equal(bridges.bridges.outlook.live, false);
assert.equal(bridges.bridges.yahoo.end_to_end, false);
assert.equal(bridges.field_1_0, false);
assert.equal(bridges.e2e_outside, false);

const registry = buildRegistry(PRODUCTS);
assert.equal(classifyCall(registry.bySlug.azchat, "bridge_whatsapp").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azai, "captcha_solve").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azos, "place_call").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azos, "sim_wipe").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "solve_captcha").kind, "stub");
assert.equal(classifyCall(registry.bySlug.veillock, "veil_status").kind, "local_only");
assert.equal(classifyCall(registry.bySlug.azos, "download_list").kind, "live");
assert.equal(classifyCall(registry.bySlug.azai, "conversation").kind, "live");
assert.equal(classifyCall(registry.bySlug.azchat, "channel_seal").kind, "live");
assert.equal(classifyCall(registry.bySlug.azbrowser, "jeeves_site").kind, "live");
assert.equal(classifyCall(registry.bySlug.azmail, "malware_sweep").kind, "live");
assert.ok(LIVE_OPS.azai.includes("azclicker"));
assert.ok(STUB_OPS.azai.includes("captcha_solve"));

const channel = await local("azchat", "channel_seal", { room_id: "room-1" }, dead);
assert.equal(channel.channel, "azchat");
assert.equal(channel.sealed_channel, true);
assert.equal(channel.e2e_outside, false);
assert.equal(channel.gmail_e2e, false);
assert.equal(channel.bridges_live, false);

const serverList = await local("azos", "download_list", { mode: "server" }, dead);
assert.equal(serverList.files.length, 1);
assert.equal(serverList.everything_bundle, false);
assert.equal(serverList.files[0].name, "azos-server-note.txt");
const bad = await local("azos", "download_check", { mode: "server", files: { "azos-server-note.txt": "00" } }, dead);
assert.equal(bad.complete, false);
assert.equal(bad.continue_enabled, false);
const good = await local(
  "azos",
  "download_check",
  { mode: "server", files: { "azos-server-note.txt": serverList.files[0].sha256 } },
  dead,
);
assert.equal(good.complete, true);
assert.equal(good.continue_enabled, true);
const bootList = await local("azos", "download_list", { mode: "bootstrap" }, dead);
assert.equal(bootList.files.some((row) => row.name === "azos-server-note.txt"), false);
const installList = await local("azos", "download_list", { mode: "install" }, dead);
assert.equal(installList.files[0].name, "azos-install-note.txt");
const phoneList = await local("azos", "download_list", { mode: "phone" }, dead);
assert.equal(phoneList.files[0].name, "azos-web-app.txt");
const noList = await local("azos", "download_list", { mode: "everything" }, dead);
assert.equal(noList.code, "AZOS-NO-LIST");
assert.match(noList.line, /Nothing has been downloaded/);

const phone = await local("azos", "phone_path", { model: "unlocked", bootloader: "unlocked" }, dead);
assert.equal(phone.path, "bootstrap");
assert.equal(phone.flash_executed, false);
assert.equal(phone.sim_wiped, false);
assert.equal(phone.esim_wiped, false);
assert.equal(phone.bootloader, "unknown");
const unlockedNoImage = await local(
  "azos",
  "phone_path",
  {},
  { ...dead, PHONE: { real: true, mock: false, bootloader: "unlocked", model: "desk" } },
);
assert.equal(unlockedNoImage.path, "bootstrap");
assert.equal(unlockedNoImage.matching_image, false);
assert.equal(unlockedNoImage.flash_executed, false);
assert.match(unlockedNoImage.line, /don't have a tested AZOS image/);
markPending("flash-executed", "No tested AZOS phone image and no device flasher are present");

const sim = await local("azos", "sim_lockout", { on: true }, dead);
assert.equal(sim.code, "SIM-NOT-SUPPORTED");
assert.equal(sim.sim_erased, false);
assert.equal(sim.esim_erased, false);
assert.equal(sim.lockout, false);
const simMock = await local(
  "azos",
  "sim_lockout",
  { on: true },
  { ...dead, CELL_RADIO: { real: true, mock: true, controls_sim: true } },
);
assert.equal(simMock.code, "SIM-NOT-SUPPORTED");
assert.equal(simMock.sim_erased, false);
markPending("sim-lockout-on", "No cellular radio that can control the SIM is present");

const cell = await local("azos", "cellular", {}, dead);
assert.equal(cell.code, "CELL-RADIO-ABSENT");
assert.equal(cell.live, false);
assert.equal(cell.packet_path_live, false);
assert.equal(cell.alt_internet_live, false);
assert.equal(cell.field_1_0, false);
const cellMock = await local(
  "azos",
  "cellular",
  {},
  { ...dead, CELL_RADIO: { real: true, mock: false, present: true, roundTrip: async () => ({ ok: true, mock: true }) } },
);
assert.equal(cellMock.live, false);
assert.equal(cellMock.packet_path_live, false);
assert.equal(cellMock.alt_internet_live, false);
markPending("cellular-live", "No cellular radio is present");

const directMask = await local("azos", "ip_mask", { mode: "server", direct: true }, dead);
assert.equal(directMask.masked, false);
assert.equal(directMask.status, "Not masked");
const offMask = await local("azos", "ip_mask", { mode: "install", direct: false }, dead);
assert.equal(offMask.masked, false);
assert.equal(offMask.status, "Not masked");
const fakeMask = await local(
  "azos",
  "ip_mask",
  { mode: "phone", direct: false },
  { ...dead, MASK_PATH: { real: true, mock: false, check: async () => ({ ok: true, saw: "relay", mock: true }) } },
);
assert.equal(fakeMask.masked, false);
assert.equal(fakeMask.status, "Not masked");
markPending("ip-masked", "No checked mask path is present");

const call = await local("azos", "azcall", { place: true }, dead);
assert.equal(call.call_path_live, false);
assert.equal(call.code, "AZCALL-NO-PATH");
assert.equal(call.fee, null);
const designed = await local("azos", "azcall", {}, dead);
assert.equal(designed.live, false);
assert.equal(designed.code, "AZCALL-DESIGN-ONLY");
assert.equal(designed.number_changeable, "designed");

const veil = await local("azos", "veillock", {}, dead);
assert.equal(veil.camera, "Camera: Off");
assert.equal(veil.screen_share, "Screen share: Off");
const watch = await local("azos", "veillock", { watch_other: true }, dead);
assert.equal(watch.code, "VEIL-NOT-SURVEILLANCE");
const noCam = await local("azos", "veillock", { camera: true, asked: true, task: "scan QR code" }, dead);
assert.equal(noCam.code, "VEIL-NOT-SUPPORTED");
const mockCam = await local(
  "veillock",
  "camera",
  { camera: true, asked: true, task: "scan QR code" },
  { ...dead, VEIL_DEVICE: { real: true, mock: true } },
);
assert.equal(mockCam.code, "VEIL-NOT-SUPPORTED");
markPending("camera-hardware-on", "No camera or display control is present");

const jeevesNo = await local("azbrowser", "jeeves_site", { text: "change the title" }, dead);
assert.equal(jeevesNo.code, "JEEVES-NOT-ASKED");
assert.equal(jeevesNo.changed, false);
assert.equal(jeevesNo.jeeves_sovereign, false);
const jeevesYes = await local("azbrowser", "jeeves_site", { asked: true, text: "title <ok>" }, dead);
assert.equal(jeevesYes.changed, true);
assert.equal(jeevesYes.deployed, false);
assert.equal(jeevesYes.jeeves_sovereign, false);
assert.equal(jeevesYes.html.includes("15:20"), false);
assert.ok(jeevesYes.html.includes("Jeeves is a helper"));
assert.ok(jeevesYes.html.includes("&lt;ok&gt;"));

const humanAi = await local("azai", "human_check", { text: "please solve this captcha" }, dead);
assert.equal(humanAi.stopped, true);
assert.equal(humanAi.solver, false);
assert.equal(humanAi.code, "HUMAN-CHECK");
assert.match(humanAi.banner, /Please do this part yourself/);
const humanBrowser = await local("azbrowser", "human_check", { text: "are you a robot" }, dead);
assert.equal(humanBrowser.code, "HUMAN-CHECK");
assert.equal(humanBrowser.solver, false);

const noSend = await local("azai", "agent", { q: "mail this", send: true }, dead);
assert.equal(noSend.sent, false);
assert.equal(noSend.code, "AGENT-NO-SEND");
assert.equal(noSend.drafted, true);

resetOperatorSurfaces();
const noEngine = await local("azai", "conversation", { q: "hello" }, dead);
assert.equal(noEngine.code, "AZAI-ENGINE-ABSENT");
assert.equal(noEngine.mesh_processing, false);
assert.equal(noEngine.ollama_answering, false);
assert.equal(noEngine.field_1_0, false);

const meshAbsent = probeMesh({});
assert.equal(meshAbsent.mesh_share, "absent");
assert.equal(meshAbsent.one_process_is_mesh, false);
assert.equal(meshAbsent.strong, false);
const refusedEngine = chooseEngine({ mesh: meshAbsent, ollamaPresent: false });
assert.equal(refusedEngine.engine, null);
assert.equal(refusedEngine.code, "AZAI-ENGINE-ABSENT");
const ollamaChoice = chooseEngine({ mesh: meshAbsent, ollamaPresent: true });
assert.equal(ollamaChoice.engine, "ollama");
assert.equal(ollamaChoice.mesh_processing, false);
assert.equal(ollamaChoice.ollama_answering, true);
assert.equal(ollamaChoice.ollama_is_mesh, undefined);
const weakMesh = probeMesh({
  MESH_INFERENCE: {
    real: true,
    mock: false,
    measured: false,
    nodes: [
      { id: "a", live: true, self: false },
      { id: "b", live: true, self: false },
    ],
  },
});
assert.equal(weakMesh.strong, false);
assert.equal(weakMesh.mesh_share, "present");
const switched = chooseEngine({
  mesh: { strong: true, mesh_share: "present" },
  ollamaPresent: true,
});
assert.equal(switched.engine, "mesh");
assert.equal(switched.ollama_fallback_enabled, false);
assert.equal(switched.ollama_answering, false);
assert.equal(switched.mesh_processing, false);
assert.equal(switched.switched_to, "mesh");
const reenabled = chooseEngine({
  mesh: meshAbsent,
  ollamaPresent: true,
  personReenable: true,
});
assert.equal(reenabled.engine, "ollama");
assert.equal(reenabled.mesh_processing, false);
assert.equal(reenabled.ollama_answering, true);
markPending("mesh-strong-answer", "No measured mesh inference is present");

resetOperatorSurfaces();
const ollama = await probeOllama({ OLLAMA_HOST: "http://127.0.0.1:11434" });
if (!ollama.present) {
  markPending("ollama-live-answer", "Ollama is not answering on 127.0.0.1:11434");
} else if (!Array.isArray(ollama.models) || !ollama.models.includes("llama3.2")) {
  markPending("ollama-live-answer", "Ollama is up and llama3.2 is not installed");
} else {
  const answered = await local("azai", "conversation", { q: "say hi" }, { OLLAMA_HOST: "http://127.0.0.1:11434" });
  assert.equal(answered.engine, "ollama");
  assert.equal(answered.ollama_answering, true);
  assert.equal(answered.mesh_processing, false);
  assert.equal(answered.ollama_is_mesh, false);
}

resetOperatorSurfaces();
const noSource = await local("azai", "score_gate", { claim: "the sky is a source", score: 9 }, dead);
assert.equal(noSource.blocked, true);
assert.equal(noSource.score_is_source, false);
assert.equal(noSource.code, "AZAI-NO-SOURCE");
const low = await local("azai", "score_gate", { claim: "kept", source: "lab note", score: 0 }, dead);
assert.equal(low.code, "AZAI-SCORE-BLOCK");
assert.equal(low.score_is_source, false);
const allowed = await local("azai", "score_gate", { claim: "kept", source: "lab note", score: 2 }, dead);
assert.equal(allowed.claim_allowed, true);
assert.equal(allowed.score_is_source, false);
assert.notEqual(allowed.code, "AZAI-ENGINE-ABSENT");

const paper = await local("azai", "corpus_note", { published: "PAPER-TEXT", note: "beside" }, dead);
assert.equal(paper.published, "PAPER-TEXT");
assert.equal(paper.published_rewritten, false);

const cap7 = await local("azai", "cap7_lookup", { name: "hub.aziel" }, dead);
assert.equal(cap7.names_only, true);
assert.equal(cap7.icann, false);
assert.equal(cap7.public_egress, false);
assert.equal(cap7.site_up, "unknown");
assert.equal(cap7.name_found_is_site_up, false);

const crawlNo = await local("azai", "crawl", { url: "http://127.0.0.1/" }, dead);
assert.equal(crawlNo.code, "CRAWL-NOT-ASKED");
assert.deepEqual(crawlNo.fetched, []);

const crawlServer = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("fetched-body");
});
await new Promise((resolve) => crawlServer.listen(0, "127.0.0.1", resolve));
const crawlPort = crawlServer.address().port;
try {
  const crawled = await local(
    "azai",
    "crawl",
    { asked: true, url: `http://127.0.0.1:${crawlPort}/page` },
    dead,
  );
  assert.equal(crawled.fetched[0].status, 200);
  assert.equal(crawled.published_rewritten, false);
  assert.equal(crawled.recorded, true);
} finally {
  await new Promise((resolve) => crawlServer.close(resolve));
}

const attached = await local("azai", "attach", { text: "notes" }, absent);
assert.equal(attached.used, false);
assert.equal(attached.clean, false);
assert.equal(attached.executed, false);

const learnedDoor = await local("azai", "receipt_learn", {}, dead);
assert.equal(learnedDoor.ranking_erases_chronology, false);
assert.equal(learnedDoor.chronology_preserved, true);
assert.equal(learnedDoor.score_is_source, false);
assert.ok(learnedDoor.chronology.length >= 1);

const handler = (await import("../src/index.js")).default.fetch;
const ui = await handler(
  new Request("https://aziel-runtime.example/operator", { headers: { "user-agent": "Mozilla/5.0" } }),
  {},
);
assert.equal(ui.status, 200);
const uiHtml = await ui.text();
assert.ok(uiHtml.includes("Get started"));
assert.ok(uiHtml.includes("Receipt: missing"));
assert.equal(uiHtml.includes("15:20"), false);
const posted = await handler(
  new Request("https://aziel-runtime.example/operator", {
    method: "POST",
    headers: { "user-agent": "Mozilla/5.0", "content-type": "application/x-www-form-urlencoded" },
    body: "slug=azos&op=mode_list",
  }),
  {},
);
assert.equal(posted.status, 200);
const postedHtml = await posted.text();
assert.ok(postedHtml.includes("Receipt: present, chained"));
assert.equal(postedHtml.includes("PLAINTEXT-NOTE"), false);
assert.ok(postedHtml.includes("Run AZOS as a service"));

for (const row of pending) {
  assert.equal(row.status, "pending", row.name);
  assert.notEqual(row.status, "pass");
}
console.log(JSON.stringify({ pending }, null, 2));
console.log("ok operator-surfaces");
