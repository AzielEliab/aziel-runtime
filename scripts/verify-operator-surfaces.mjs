/**
 * Operator surfaces: AZOS and aziel-runtime share one honesty door.
 * A missing dependency is pending. A mock is not a pass.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import os from "node:os";
import { PRODUCTS } from "../src/index.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { fraggateCall } from "../src/fraggate/door.js";
import { executeLocal } from "../src/engines/runner.js";
import {
  encodeBluetoothFrame,
  encodePhotonFrame,
  encodeRfFrame,
  encodeWifiFrame,
  kernelBase,
  parseBluetoothFrame,
  parseCpioNewc,
  parsePhotonFrame,
  parseRfFrame,
  parseWifiFrame,
  secondDevice,
} from "../src/bases.js";
import { softwareCatalog } from "../src/software-catalog.js";
import { currentAltInternetFact } from "../src/alt-internet-fact.js";
import { operatorPageHtml } from "../src/operator-ui.js";
import { attachWorkspace, publicDemoWorkspace } from "../src/workspace.js";
import { fixtureLabeledScanner, listenSmtpSink } from "../src/engines/azmail/guard.js";
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
  assert.equal(body.second_device, false);
  assert.equal(body.alt_internet_live, body.packet_path_live);
  assert.equal(body.packet_path_live, body.second_device);
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
assert.equal((page.match(/class="primary"/g) || []).length, 1);
assert.ok(page.includes("IP: <strong>Not masked</strong>"));
assert.ok(page.includes("No radio reads as Absent."));
assert.ok(page.includes("<strong>pending</strong>"));
assert.ok(page.includes("Human check: <strong>Stop</strong>. This site wants to check that you're a person. Please do this part yourself."));
assert.ok(page.includes("<strong>Not an OS yet</strong>"));
assert.ok(page.includes("A browser tab is not the OS"));
assert.ok(page.includes("Guardian: <strong>On</strong>"));
assert.ok(page.includes("Internet base: <strong>present, not live</strong>"));
assert.ok(page.includes("Mail send base: <strong>present</strong>. Public send stays refused."));
assert.ok(page.includes("Kernel base: <strong>present, not booted</strong>"));
assert.ok(page.includes("Internet base"));
assert.ok(page.includes("Mail send base"));
assert.equal(page.includes("Turn Guardian off"), false);
assert.equal(page.includes("guardian_off"), false);
assert.ok(page.includes("Boot path"));
const started = operatorPageHtml("https://aziel-runtime.example", {
  op: "mode_list",
  line: "Not an OS yet",
  modes: [
    { id: "server", line: "Run AZOS as a service on a computer you already have." },
    { id: "bootstrap", line: "Start AZOS from a USB drive or SD card without changing your computer." },
    { id: "install", line: "Install AZOS as the main system on a device. This replaces what is there." },
  ],
  lattice_receipt: { present: true, chained: true, missing: false },
});
assert.ok(started.includes("Run AZOS as a service on a computer you already have."));
assert.ok(started.includes("Receipt: present, chained"));
const absentPage = operatorPageHtml("https://aziel-runtime.example", {
  op: "cellular",
  status: "Absent",
  line: "Cellular: Absent. This device has no cellular radio we can use.",
  lattice_receipt: { present: true, chained: true, missing: false },
});
assert.ok(absentPage.includes("Cellular: <strong>Absent</strong>"));
assert.ok(absentPage.includes("IP: <strong>Not masked</strong>"));
assert.ok(absentPage.includes("<strong>pending</strong>"));
assert.equal(absentPage.includes("15:20"), false);

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
assert.equal(classifyCall(registry.bySlug.azos, "boot_path").kind, "live");
assert.equal(classifyCall(registry.bySlug.azos, "guardian").kind, "live");
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
assert.equal(serverList.everything_bundle, false);
assert.equal(serverList.os_yet, false);
assert.equal(serverList.is_os, false);
assert.equal(serverList.complete, false);
assert.equal(serverList.browser_tab_is_os, false);
assert.equal(serverList.line, "Not an OS yet");
assert.ok(serverList.files.some((row) => row.name === "azos-kernel" && row.present === false));
assert.ok(serverList.files.some((row) => row.name === "azos-userspace" && row.present === false));
const bad = await local("azos", "download_check", { mode: "server", files: { "azos-kernel": "00" } }, dead);
assert.equal(bad.complete, false);
assert.equal(bad.continue_enabled, false);
assert.equal(bad.line, "Not an OS yet");
const good = await local(
  "azos",
  "download_check",
  { mode: "server", files: { "azos-kernel": "ff".repeat(32), "azos-userspace": "aa".repeat(32) } },
  dead,
);
assert.equal(good.complete, false);
assert.equal(good.continue_enabled, false);
assert.equal(good.os_yet, false);
assert.equal(good.line, "Not an OS yet");
const bootList = await local("azos", "download_list", { mode: "bootstrap" }, dead);
assert.equal(bootList.os_yet, false);
assert.equal(bootList.wrap_is_os, false);
assert.equal(bootList.files.some((row) => row.name === "azos-server-note.txt"), false);
const installList = await local("azos", "download_list", { mode: "install" }, dead);
assert.equal(installList.complete, false);
assert.equal(installList.line, "Not an OS yet");
const phoneList = await local("azos", "download_list", { mode: "phone" }, dead);
assert.equal(phoneList.files[0].name, "azos-web-app.txt");
assert.equal(phoneList.web_app_is_os, false);
assert.equal(phoneList.browser_tab_is_os, false);
assert.equal(phoneList.complete, false);
assert.match(phoneList.line, /Not an OS yet/);
const noList = await local("azos", "download_list", { mode: "everything" }, dead);
assert.equal(noList.code, "AZOS-NO-LIST");
assert.match(noList.line, /Nothing has been downloaded/);
const boot = await local("azos", "boot_path", { os_yet: true, bootable: true }, dead);
assert.equal(boot.os_yet, false);
assert.equal(boot.bootable, false);
assert.equal(boot.is_os, false);
assert.equal(boot.browser_tab_is_os, false);
assert.equal(boot.phone_flash_is_os, false);
assert.equal(boot.line, "Not an OS yet");
assert.equal(boot.complete, false);
assert.equal(boot.booted, false);
assert.equal(boot.installed, false);
assert.equal(boot.stay_off, false);
assert.equal(boot.userspace_base, true);
assert.equal(boot.userspace_format, "cpio-newc");
assert.equal(boot.kernel_base, false);
assert.ok(boot.userspace_bytes >= 512);
assert.equal(typeof boot.userspace_sha256, "string");
assert.ok(boot.handoff_names.includes("usr/azos/principles.txt"));
assert.ok(boot.handoff_names.includes("TRAILER!!!"));
if (boot.userspace_base === true) {
  const built = await kernelBase();
  const parsed = parseCpioNewc(built.archive);
  assert.deepEqual(parsed.names, built.names);
  assert.ok(parsed.names.includes("TRAILER!!!"));
  assert.match(parsed.files["usr/azos/principles.txt"], /Integrity precedes execution/);
  assert.equal(built.kernel_base, false);
  assert.equal(built.booted, false);
  assert.equal(built.installed, false);
} else {
  assert.fail("userspace handoff was marked present without a parsed cpio");
}
if (boot.booted === true || boot.kernel_base === true || boot.installed === true) {
  assert.fail("boot flags are true while no machine image booted");
}
const handoff = await local("azos", "boot_path", { handoff: true }, dead);
assert.equal(handoff.os_yet, false);
assert.equal(handoff.host_replaced, false);
assert.equal(handoff.stay_off, false);
assert.equal(handoff.kernel_base, false);
assert.equal(handoff.booted, false);
assert.equal(handoff.installed, false);
assert.equal(handoff.line, "Not an OS yet");
assert.equal(handoff.kernel_line, "The kernel base is present. It has not booted a machine.");
assert.equal(handoff.packet_path_live, false);
assert.equal(handoff.alt_internet_live, false);
if (String(handoff.handoff_guest_log || "").includes("AZOS-BOOTED")) {
  assert.match(handoff.handoff_guest_log, /AZOS-INSTALLED/);
  assert.equal(handoff.handoff_code, "BOOT-HANDOFF");
  assert.equal(handoff.booted, false);
  assert.equal(handoff.kernel_base, false);
  assert.equal(handoff.installed, false);
}
if (handoff.booted === true || handoff.kernel_base === true || handoff.installed === true) {
  assert.fail("boot flags are true while this host is not AZOS");
}
const injected = new Uint8Array(600);
injected[0x202] = 0x48;
injected[0x203] = 0x64;
injected[0x204] = 0x72;
injected[0x205] = 0x53;
const injectedBoot = await local("azos", "boot_path", {}, { ...dead, AZOS_BOOT: { real: true, mock: false, kind: "kernel", bytes: injected } });
assert.equal(injectedBoot.os_yet, false);
assert.equal(injectedBoot.line, "Not an OS yet");
if (handoff.handoff_code !== "BOOT-HANDOFF") {
  markPending("machine-boot", "The guest handoff log was absent, so this host stays not booted");
}
const guard = await local("azos", "guardian", {}, dead);
assert.equal(guard.guardian, "On");
assert.equal(guard.enabled, true);
assert.equal(guard.can_disable, false);
assert.equal(guard.always_on, true);
assert.equal(guard.observed, true);
assert.equal(guard.watched_others, false);
assert.equal(guard.score_is_source, false);
assert.equal(guard.claim_allowed, true);
assert.equal(guard.field_1_0, false);
assert.equal(guard.lattice_receipt.chained, true);
const guardRead = await azaiReadReceipt(guard.lattice_receipt.sealed_sha256);
assert.equal(guardRead.guardian, "On");
assert.equal(guardRead.guardian_can_disable, false);
assert.equal(guardRead.watched_others, false);
assert.match(guardRead.note, /guardian on/);
const guardOff = await local("azos", "guardian", { off: true }, dead);
assert.equal(guardOff.guardian, "On");
assert.equal(guardOff.enabled, true);
assert.equal(guardOff.can_disable, false);
assert.equal(guardOff.code, "GUARDIAN-ALWAYS-ON");
const guardSpy = await local("azos", "guardian", { watch_other: true, text: "OTHER-PRIVATE-DATA", camera_other: true, off_machine: true }, dead);
assert.equal(guardSpy.observed, false);
assert.equal(guardSpy.watched_others, false);
assert.equal(guardSpy.off_machine, false);
assert.equal(guardSpy.camera_other, false);
assert.equal(guardSpy.code, "GUARDIAN-NOT-SURVEILLANCE");
assert.equal(guardSpy.guardian, "On");
assert.equal(JSON.stringify(guardSpy).includes("OTHER-PRIVATE-DATA"), false);

const phone = await local("azos", "phone_path", { model: "unlocked", bootloader: "unlocked" }, dead);
assert.equal(phone.path, "bootstrap");
assert.equal(phone.flash_executed, false);
assert.equal(phone.sim_wiped, false);
assert.equal(phone.esim_wiped, false);
assert.equal(phone.is_os, false);
assert.equal(phone.browser_tab_is_os, false);
assert.equal(phone.wrap_is_os, false);
assert.equal(phone.phone_flash_is_os, false);
assert.match(phone.line, /Not an OS yet/);
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

const net = await local("azos", "internet_base", { alt_internet_live: true, alt_internet_earned: true }, dead);
assert.equal(net.base, true);
assert.equal(net.stay_off, false);
assert.equal(net.live, false);
assert.equal(net.alt_internet_live, false);
assert.equal(net.packet_path_live, false);
assert.equal(net.public_door, "FG-STUB");
assert.equal(net.installed, false);
assert.deepEqual(net.carrier_order, ["lan", "wifi", "bluetooth", "rf", "photon"]);
assert.ok(net.carriers.every((row) => row.packet_live === false && row.packet_counted !== true));
assert.equal(net.cellular_counts, false);
assert.equal(net.cellular_optional, true);
assert.equal(net.line, "Internet base is present. Not live.");
const altFact = currentAltInternetFact();
assert.equal(altFact.alt_internet_live, false);
assert.equal(altFact.packet_path_live, false);
assert.equal(net.missing_line, altFact.not_live_sentence);
assert.equal(net.not_live_sentence, altFact.not_live_sentence);
assert.ok(page.includes(altFact.not_live_sentence));
const netCell = await local(
  "azos",
  "internet_base",
  {},
  { ...dead, CELL_RADIO: { real: true, mock: false, present: true, roundTrip: async () => ({ ok: true, mock: false }) } },
);
assert.equal(netCell.cellular_status, "Live");
assert.equal(netCell.cellular_counts, false);
assert.equal(netCell.alt_internet_live, false);
assert.equal(netCell.packet_path_live, false);
const netMock = await local(
  "azos",
  "internet_base",
  {},
  { ...dead, CELL_RADIO: { real: true, mock: false, present: true, roundTrip: async () => ({ ok: true, mock: true }) } },
);
assert.equal(netMock.alt_internet_live, false);
assert.equal(netMock.packet_path_live, false);
assert.equal(netMock.cellular_status, "No service");
const lanCandidates = [];
for (const [name, rows] of Object.entries(os.networkInterfaces())) {
  if (name === "lo") continue;
  for (const row of rows || []) {
    if ((row.family === "IPv4" || row.family === 4) && row.internal !== true) lanCandidates.push({ name, address: row.address });
  }
}
const netCarry = await local(
  "azos",
  "internet_base",
  { carry: true, alt_internet_live: true, alt_internet_earned: true, second_device: true, packet_path_live: true, booted: true, installed: true },
  dead,
);
assert.equal(netCarry.base, true);
assert.equal(netCarry.live, false);
assert.equal(netCarry.booted, false);
assert.equal(netCarry.installed, false);
assert.equal(netCarry.second_device, false);
assert.equal(netCarry.public_icann, false);
assert.equal(netCarry.bgp, false);
assert.equal(netCarry.cap7_name_only, true);
assert.equal(netCarry.public_door, "FG-STUB");
assert.deepEqual(netCarry.carrier_order, ["lan", "wifi", "bluetooth", "rf", "photon"]);
const payloadBytes = new Uint8Array([1, 2, 3, 4]);
for (const [encode, parse] of [
  [encodeWifiFrame, parseWifiFrame],
  [encodeBluetoothFrame, parseBluetoothFrame],
  [encodeRfFrame, parseRfFrame],
  [encodePhotonFrame, parsePhotonFrame],
]) {
  const parsed = parse(encode(payloadBytes));
  assert.ok(parsed);
  assert.equal(parsed.packet_live, false);
  assert.equal(parsed.mock, false);
  assert.equal(parsed.payload.byteLength, payloadBytes.byteLength);
}
assert.equal(secondDevice("a".repeat(32), "b".repeat(32)), true);
assert.equal(secondDevice("a".repeat(32), "a".repeat(32)), false);
for (const id of ["wifi", "bluetooth", "rf", "photon"]) {
  const row = netCarry.carriers.find((item) => item.id === id);
  const held = (netCarry.carry.refused || []).find((item) => item.id === id);
  assert.equal(row.packet_live, false, id);
  assert.notEqual(row.packet_counted, true, id);
  assert.notEqual(row.mock, true, id);
  assert.ok(held, id);
  assert.equal(held.packet_live, false, id);
  assert.notEqual(held.mock, true, id);
  assert.equal(held.frame_ok, true, id);
  if (row.state !== "HW-PRESENT") {
    assert.equal(row.code, "QNM-RADIO-ABSENT", id);
    assert.equal(held.code, "QNM-RADIO-ABSENT", id);
  }
  if (held.packet_live === true) assert.fail(`${id} packet_live is true without a received frame`);
}
assert.equal(netCarry.packet_path_live, false);
assert.equal(netCarry.packet_path_earned, false);
assert.equal(netCarry.alt_internet_live, false);
assert.equal(netCarry.alt_internet_earned, false);
assert.equal(netCarry.line, "Internet base is present. Not live.");
assert.equal(netCarry.missing_line, altFact.not_live_sentence);
assert.equal(netCarry.not_live_sentence, altFact.not_live_sentence);
assert.equal(netCarry.d2d_status, "NOT-READY");
assert.equal(netCarry.warn5, "STANDS-until-demonstrated");
assert.ok(netCarry.carriers.every((row) => row.packet_live === false));
if (lanCandidates.length) {
  assert.equal(netCarry.carry.ok, true);
  assert.equal(netCarry.carry.code, "PACKET-CARRIED");
  assert.equal(netCarry.carry.carrier, "lan");
  assert.equal(netCarry.carry.bytes_match, true);
  assert.equal(netCarry.carry.mock, false);
  assert.equal(netCarry.carry.mesh, true);
  assert.equal(netCarry.carry.packet_live, false);
  assert.equal(netCarry.carry.alt_internet_live, false);
  assert.equal(netCarry.carry.second_device, false);
  assert.equal(netCarry.carry.public_icann, false);
  assert.equal(netCarry.carry.bgp, false);
  assert.equal(netCarry.carry.public_door, "FG-STUB");
  assert.equal(netCarry.carry.frame_magic, "AZMESH1");
  assert.equal(netCarry.carry.src_node, "az-node-a");
  assert.equal(netCarry.carry.dst_node, "az-node-b");
  assert.notEqual(netCarry.carry.src_node, netCarry.carry.dst_node);
  assert.equal(netCarry.carry.local_host, netCarry.carry.remote_host);
  assert.equal(netCarry.carry.bytes, 16);
  assert.match(netCarry.carry.sent_sha256, /^[a-f0-9]{64}$/);
  assert.equal(netCarry.carry.sent_sha256, netCarry.carry.received_sha256);
  assert.notEqual(netCarry.carry.sent_frame_sha256, netCarry.carry.received_frame_sha256);
  assert.ok(lanCandidates.some((row) => row.address === netCarry.carry.address && row.name === netCarry.carry.interface));
  assert.notEqual(netCarry.carry.interface, "lo");
} else {
  assert.equal(netCarry.carry.ok, false);
}
if (netCarry.packet_path_live === true || netCarry.alt_internet_live === true) {
  assert.fail("packet path or alt internet is true while the public door is FG-STUB");
}
if (netCarry.carry && netCarry.carry.packet_live === true) {
  assert.fail("nested packet_live is true while the human page says the packet path is not live");
}
if (netCarry.second_device === true && netCarry.carry.local_host === netCarry.carry.remote_host) {
  assert.fail("second_device is true while both endpoints are this machine");
}
assert.equal(netCarry.alt_internet_live, netCarry.packet_path_live);
assert.equal(netCarry.packet_path_live, netCarry.second_device);
assert.equal(netCarry.second_device, netCarry.watch_qualifies);
if (netCarry.carry) {
  assert.equal(netCarry.carry.alt_internet_live, netCarry.carry.packet_path_live);
  assert.equal(netCarry.carry.packet_path_live, netCarry.carry.second_device);
  if (netCarry.carry.same_machine_id === true && netCarry.carry.second_device === true) {
    assert.fail("same machine id set second_device true");
  }
  if (netCarry.carry.local_host && netCarry.carry.local_host === netCarry.carry.remote_host && netCarry.second_device === true) {
    assert.fail("same machine set second_device true");
  }
}
if (
  (netCarry.alt_internet_live === true) !== (netCarry.packet_path_live === true) ||
  (netCarry.packet_path_live === true) !== (netCarry.second_device === true)
) {
  assert.fail("arrival flags diverged");
}

const mailHeld = await local("azmail", "mail_send_base", { confirm: true, from: "operator@azmail.local", to: "friend@example.com", text: "hello" }, dead);
assert.equal(mailHeld.base, true);
assert.equal(mailHeld.sent, false);
assert.equal(mailHeld.live, false);
assert.equal(mailHeld.public_live, false);
assert.equal(mailHeld.public_smtp_send, false);
assert.equal(mailHeld.e2e, false);
assert.equal(classifyCall(registry.bySlug.azmail, "smtp_send").kind, "stub");
assert.match(mailHeld.line, /Public send stays refused/);
assert.equal(classifyCall(registry.bySlug.azmail, "smtp").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azchat, "smtp_send").kind, "stub");
const sink = await listenSmtpSink();
const mailSent = await local(
  "azmail",
  "mail_send_base",
  { confirm: true, from: "operator@azmail.local", to: "friend@example.com", subject: "base", text: "hello base" },
  {
    ...dead,
    AZMAIL_SCANNER: fixtureLabeledScanner(),
    AZMAIL_SMTP_HOST: sink.host,
    AZMAIL_SMTP_PORT: sink.port,
    AZMAIL_SMTP_ALLOW_CLEARTEXT: true,
  },
);
await sink.close();
assert.equal(mailSent.sent, true, JSON.stringify(mailSent));
assert.equal(mailSent.public_smtp_send, false);
assert.equal(mailSent.public_mta, false);
assert.equal(mailSent.catalog_smtp_send, "FG-STUB");
assert.equal(mailSent.sent_paints_public_smtp, false);
assert.equal(mailSent.sent_paints_public_mta, false);
assert.equal(mailSent.public_demo_arms_mail, false);
assert.equal(mailSent.confirm_is_authentication, false);
assert.match(mailSent.line, /Public send stays refused/);
assert.equal(mailSent.public_live, false);
assert.equal(mailSent.live, false);
assert.equal(mailSent.e2e, false);
assert.equal(mailSent.external_smtp_e2e, false);
assert.equal(sink.messages.length, 1);
const demoMail = await local(
  "azmail",
  "mail_send_base",
  { confirm: true, from: "operator@azmail.local", to: "friend@example.com", subject: "demo", text: "no" },
  attachWorkspace(
    {
      ...dead,
      AZMAIL_SCANNER: fixtureLabeledScanner(),
      AZMAIL_SMTP_HOST: "127.0.0.1",
      AZMAIL_SMTP_PORT: 2525,
      AZMAIL_SMTP_ALLOW_CLEARTEXT: true,
    },
    publicDemoWorkspace(),
  ),
);
assert.equal(demoMail.sent, false);
assert.equal(demoMail.code, "MAIL-BASE-PUBLIC-DEMO");
assert.equal(demoMail.public_smtp_send, false);
assert.equal(demoMail.public_mta, false);
assert.equal(demoMail.live, false);
assert.equal(demoMail.public_demo_arms_mail, false);
assert.equal(demoMail.confirm_is_authentication, false);
const smtpHeld = await fraggateCall(
  { slug: "azmail", op: "smtp_send", payload: { from: "operator@azmail.local", to: "friend@example.com", subject: "held", text: "not sent" } },
  registry,
  registry.bySlug,
  dead,
);
assert.equal(smtpHeld.ok, false);
assert.equal(smtpHeld.code, "FG-STUB");
assert.equal(smtpHeld.result, null);
const doorSink = await listenSmtpSink();
const smtpSent = await fraggateCall(
  {
    slug: "azmail",
    op: "smtp_send",
    payload: { from: "operator@azmail.local", to: "friend@example.com", subject: "door", text: "hello door" },
  },
  registry,
  registry.bySlug,
  {
    ...dead,
    AZMAIL_SCANNER: fixtureLabeledScanner(),
    AZMAIL_SMTP_HOST: doorSink.host,
    AZMAIL_SMTP_PORT: doorSink.port,
    AZMAIL_SMTP_ALLOW_CLEARTEXT: true,
  },
);
await doorSink.close();
assert.equal(smtpSent.ok, false, JSON.stringify(smtpSent));
assert.equal(smtpSent.code, "FG-STUB");
assert.equal(smtpSent.result, null);
assert.equal(doorSink.messages.length, 0);
assert.equal(classifyCall(registry.bySlug.azmail, "smtp_send").kind, "stub");
if (smtpSent.result && smtpSent.result.sent === true) {
  assert.fail("smtp_send refused and still reported sent");
}
if (mailSent.public_smtp_send === true) {
  assert.fail("public_smtp_send is true while public smtp_send stays refused");
}

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
assert.ok(postedHtml.includes("Not an OS yet"));
assert.ok(postedHtml.includes("Guardian: On"));
assert.equal(postedHtml.includes("Turn Guardian off"), false);

for (const row of pending) {
  assert.equal(row.status, "pending", row.name);
  assert.notEqual(row.status, "pass");
}
console.log(JSON.stringify({ pending }, null, 2));
console.log("ok operator-surfaces");
