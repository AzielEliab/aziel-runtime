/**
 * The alternative internet stays false on this machine.
 * One sentence names what is still missing, and the assistant JSON,
 * the human page, and AZOS all read that same sentence.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { PRODUCTS } from "../src/index.js";
import { SUITE_SOFTWARE_COUNT } from "../src/guide-reason.js";
import { currentAltInternetFact, watchQualifies } from "../src/alt-internet-fact.js";
import { hostHardwareVisible, probeLan, readMachineId, track2CarrierProbe } from "../qnm-node/bearers/radio.js";
import { carrierSentences } from "../src/human-pages.js";
import { plainConsumerText } from "../src/display.js";
import { operatorPageHtml } from "../src/operator-ui.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  const response = await handler(new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" } }), {});
  const type = response.headers.get("content-type") || "";
  const body = type.includes("json") ? await response.json() : await response.text();
  return { status: response.status, body };
}

async function call(slug, op, payload) {
  const response = await handler(
    new Request(origin + "/v1/fraggate/call", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({ slug, op, payload }),
    }),
    {},
  );
  return response.json();
}

assert.equal(SUITE_SOFTWARE_COUNT, 42);
assert.equal(PRODUCTS.length, 41);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PRODUCTS.some((row) => row.slug === "alt-internet" || row.slug === "d2d"), false);

const health = await get("/v1/health");
assert.equal(health.status, 200);
assert.equal(health.body.count, 41);

const software = await get("/v1/software");
assert.equal(software.body.count, 42);
assert.equal(software.body.live_count, 41);

const fact = currentAltInternetFact();
assert.equal(fact.alt_internet_live, false);
assert.equal(fact.packet_path_live, false);
assert.equal(fact.second_device, false);
assert.equal(fact.public_door, "FG-STUB");
assert.equal(fact.public_mail_send_live, false);
assert.equal(fact.kernel_live, false);
assert.equal(fact.boot_live, false);
assert.equal(fact.cap7_name_only, true);
assert.equal(fact.public_icann, false);
assert.equal(fact.bgp, false);
assert.equal(fact.mock, false);
assert.equal(fact.not_live_sentence, fact.missing_line);
assert.deepEqual(fact.path_slots, {
  wireguard: "SLOT",
  openvpn: "SLOT",
  l3: "SLOT",
  kernel_udp: "SLOT",
  tun_tap: "SLOT",
});
assert.match(fact.not_live_sentence, /alt_internet_live is false/);
assert.match(fact.not_live_sentence, /packet_path_live is false/);
assert.match(fact.not_live_sentence, /Still missing: a packet that leaves this machine and arrives on a different machine id/);
assert.match(fact.not_live_sentence, /A same-machine mesh frame does not count/);
assert.match(fact.not_live_sentence, /Cap-7 and \.aziel stay names, not a public registrar and not ICANN or BGP/);
assert.match(fact.not_live_sentence, /WireGuard, OpenVPN, an L3 exit pool, kernel UDP, and TUN\/TAP stay SLOT/);
assert.match(fact.not_live_sentence, /Public mail send, the kernel, and boot stay not live/);
assert.match(fact.not_live_sentence, /The public door stays FG-STUB/);
assert.match(fact.not_live_sentence, /Isolation is single-node security-awareness/);
assert.match(fact.not_live_sentence, /Phoenix is a local wait and re-seal/);
assert.match(fact.not_live_sentence, /That is not a loopback fence/);
assert.ok(fact.missing.includes("a packet that leaves this machine and arrives on a different machine id"));

const sameMachine = {
  left_machine: false,
  arrived_other_machine: false,
  same_machine_id: true,
  mock: false,
  machine_id: "a".repeat(32),
  peer_machine_id: "a".repeat(32),
};
assert.equal(watchQualifies(sameMachine), false);
assert.equal(watchQualifies({ ...sameMachine, left_machine: true, arrived_other_machine: true, same_machine_id: false, peer_machine_id: "b".repeat(32) }), true);
assert.equal(watchQualifies({ left_machine: true, arrived_other_machine: true, same_machine_id: false, mock: true, machine_id: "a".repeat(32), peer_machine_id: "b".repeat(32) }), false);
assert.equal(fact.alt_internet_live, false);

if (hostHardwareVisible()) {
  const lan = probeLan();
  const probe = track2CarrierProbe();
  assert.deepEqual(probe.order, ["lan", "wifi", "bluetooth", "rf", "photon"]);
  assert.equal(fact.host_hardware_visible, true);
  assert.equal(fact.machine_id, readMachineId());
  if (fact.machine_id) assert.match(fact.not_live_sentence, new RegExp(fact.machine_id));
  assert.match(fact.not_live_sentence, /A second device stays false while both ends share that id/);
  if (lan.present && lan.up) {
    assert.equal(probe.carriers.lan.state, "HW-PRESENT");
    assert.equal(probe.carriers.lan.hardware, lan.kind);
    assert.notEqual(lan.kind, "lo");
    assert.match(fact.not_live_sentence, new RegExp(`LAN interface ${lan.kind}`));
    if (lan.address) assert.match(fact.not_live_sentence, new RegExp(lan.address.replace(/\./g, "\\.")));
    const route = readFileSync("/proc/net/route", "utf8");
    const def = route.split("\n").slice(1).map((line) => line.trim().split(/\s+/)).find((cols) => cols[1] === "00000000" && cols[2] && cols[2] !== "00000000");
    if (def) assert.equal(lan.kind, def[0]);
  }
  for (const id of ["wifi", "bluetooth", "rf", "photon"]) {
    const row = probe.carriers[id];
    assert.notEqual(row.state, "LIVE", id);
    assert.equal(row.packet_live, false, id);
    if (row.state === "REFUSE") {
      assert.equal(row.code, "QNM-RADIO-ABSENT", id);
      assert.match(fact.not_live_sentence, /QNM-RADIO-ABSENT/);
      assert.ok(fact.missing.some((item) => item.startsWith(`${id} (`)), id);
    }
  }
} else {
  assert.match(fact.not_live_sentence, /This isolate cannot see host hardware \(worker_hardware is false\)/);
  assert.equal(fact.machine_id, null);
}

const forged = {
  carry: true,
  alt_internet_live: true,
  packet_path_live: true,
  alt_internet_earned: true,
  packet_path_earned: true,
  second_device: true,
  booted: true,
  installed: true,
  kernel_base: true,
  public_mail_send_live: true,
};
const net = await call("azos", "internet_base", forged);
assert.equal(net.ok, true);
assert.equal(net.result.alt_internet_live, false);
assert.equal(net.result.packet_path_live, false);
assert.equal(net.result.alt_internet_earned, false);
assert.equal(net.result.packet_path_earned, false);
assert.equal(net.result.booted, false);
assert.equal(net.result.kernel_base, false);
assert.equal(net.result.public_mail_send_live, false);
assert.equal(net.result.kernel_live, false);
assert.equal(net.result.boot_live, false);
assert.equal(net.result.public_door, "FG-STUB");
assert.equal(net.result.missing_line, fact.not_live_sentence);
assert.equal(net.result.not_live_sentence, fact.not_live_sentence);
assert.equal(net.result.line, "Internet base is present. Not live.");
if (net.result.carry && net.result.carry.code === "PACKET-CARRIED") {
  assert.equal(net.result.carry.alt_internet_live, false);
  assert.equal(net.result.carry.packet_live, false);
  assert.equal(net.result.carry.packet_path_live, false);
  assert.equal(net.result.carry.left_machine, false);
  assert.equal(net.result.carry.arrived_other_machine, false);
  assert.equal(net.result.carry.same_machine_id, true);
  assert.equal(net.result.carry.second_device, false);
  assert.equal(net.result.second_device, false);
  assert.equal(net.result.carry.local_host, net.result.carry.remote_host);
  assert.equal(net.result.carry.local_host, fact.machine_id);
  assert.equal(net.result.carry.public_door, "FG-STUB");
  assert.notEqual(net.result.carry.interface, "lo");
}

const status = await call("azos", "status");
const boot = await call("azos", "boot_path", { handoff: true, booted: true, kernel_base: true, installed: true });
const mesh = await get("/v1/mesh");
assert.equal(status.result.missing_line, fact.not_live_sentence);
assert.equal(status.result.alt_internet_live, false);
assert.equal(status.result.packet_path_live, false);
assert.equal(status.result.kernel, false);
assert.equal(status.result.booted, false);
assert.equal(boot.result.missing_line, fact.not_live_sentence);
assert.equal(boot.result.booted, false);
assert.equal(boot.result.kernel_base, false);
assert.equal(mesh.body.missing_line, fact.not_live_sentence);
assert.equal(mesh.body.d2d_carriers.not_live_sentence, fact.not_live_sentence);
assert.equal(mesh.body.d2d_carriers.alt_internet_live, false);
assert.equal(mesh.body.d2d_carriers.packet_path_live, false);
assert.equal(mesh.body.alt_internet_live, false);
assert.equal(mesh.body.packet_path_live, false);

const operator = operatorPageHtml(origin, null);
const workspace = await get("/workspace");
assert.equal(workspace.status, 200);
assert.ok(operator.includes(fact.not_live_sentence));
assert.ok(workspace.body.includes(fact.not_live_sentence));
assert.ok(carrierSentences().includes(fact.not_live_sentence));

const plain = plainConsumerText({
  code: "MESH-OK",
  live_nodes: 0,
  d2d_carriers: { worker_door: "FG-STUB", alt_internet_live: false, packet_path_live: false, not_live_sentence: fact.not_live_sentence },
  not_live_sentence: fact.not_live_sentence,
});
assert.ok(plain.includes(fact.not_live_sentence));

const mail = await call("azmail", "smtp_send", { to: "a@b.c", text: "no" });
assert.equal(mail.ok, false);
assert.equal(mail.code, "FG-STUB");

console.log("ok alt internet fact: flags stay false and the missing sentence matches");
