/**
 * AI door, human pages, and AZOS must say the same facts.
 * A stub, slot, warning, or refusal is not live and is not booted.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { buildRegistry } from "../src/fraggate/registry.js";
import { PRODUCTS } from "../src/index.js";
import { HONESTY_SENTENCES, SURFACE_HONESTY } from "../src/surface-honesty.js";

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

const sentences = Object.values(HONESTY_SENTENCES);
const operator = await get("/operator");
const workspace = await get("/workspace");
assert.equal(operator.status, 200);
assert.equal(workspace.status, 200);
const human = `${operator.body}\n${workspace.body}`;

const status = await call("azos", "status");
const boot = await call("azos", "boot_path", { handoff: true, booted: true, kernel_base: true, installed: true });
const net = await call("azos", "internet_base", {
  carry: true,
  alt_internet_live: true,
  packet_path_live: true,
  alt_internet_earned: true,
  packet_path_earned: true,
});
const smtp = await call("azmail", "smtp_send", { to: "a@b.c", text: "no" });
const mesh = await get("/v1/mesh");
const software = await get("/v1/software");
const door = await get("/v1/fraggate");
const registry = buildRegistry(PRODUCTS);

assert.equal(status.ok, true);
assert.equal(status.result.booted, false);
assert.equal(status.result.kernel, false);
assert.equal(status.result.installed, false);
assert.equal(status.result.os_yet, false);
assert.equal(status.result.packet_path_live, false);
assert.equal(status.result.alt_internet_live, false);
assert.equal(status.result.public_smtp_send, false);

assert.equal(boot.ok, true);
assert.equal(boot.result.booted, false);
assert.equal(boot.result.kernel_base, false);
assert.equal(boot.result.installed, false);
assert.equal(boot.result.os_yet, false);
assert.equal(boot.result.line, HONESTY_SENTENCES.os);
assert.equal(boot.result.packet_path_live, false);
assert.equal(boot.result.alt_internet_live, false);
if (boot.result.booted === true && String(boot.result.handoff_guest_log || "").includes("AZOS-BOOTED")) {
  assert.fail("booted is true while the host was not replaced");
}

assert.equal(net.ok, true);
assert.equal(net.result.alt_internet_live, false);
assert.equal(net.result.packet_path_live, false);
assert.equal(net.result.alt_internet_earned, false);
assert.equal(net.result.packet_path_earned, false);
assert.equal(net.result.booted, false);
assert.equal(net.result.public_door, "FG-STUB");
assert.equal(net.result.d2d_status, "NOT-READY");
assert.equal(net.result.warn5, SURFACE_HONESTY.warn5);
assert.equal(net.result.line, HONESTY_SENTENCES.internet);
if (net.result.carry) {
  assert.equal(net.result.carry.packet_live, false);
  assert.equal(net.result.carry.alt_internet_live, false);
}

assert.equal(smtp.ok, false);
assert.equal(smtp.code, "FG-STUB");
assert.equal(smtp.result, null);
assert.equal(registry.stub_op_count, 363);
assert.equal(door.body.stub_op_count, 363);
assert.equal(SURFACE_HONESTY.stub_op_count, 363);

assert.equal(mesh.body.d2d_carriers.status, "NOT-READY");
assert.equal(mesh.body.d2d_carriers.packet_path_live, false);
assert.equal(mesh.body.d2d_carriers.alt_internet_live, false);
assert.equal(mesh.body.d2d_carriers.warn5, "STANDS-until-demonstrated");

assert.equal(software.body.count, 42);
assert.equal(software.body.live_count, 41);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
const bySlug = Object.fromEntries(software.body.software.map((row) => [row.slug, row]));
assert.equal(bySlug.veillock.status, "local_only");
assert.equal(bySlug.whitestone.worker_only, true);
assert.equal(bySlug.whitestone.door, "none");
assert.match(bySlug.azmail.description, /Public smtp_send stays refused/);
assert.match(bySlug.veillock.description, /VeilLock stays local_only/);
assert.match(bySlug.whitestone.description, /Whitestone is worker-only and has no public door/);
const vpn = await call("azvpn", "describe");
assert.equal(vpn.ok, true);
assert.equal(vpn.result.honesty.wireguard, "SLOT");
assert.equal(vpn.result.honesty.openvpn, "SLOT");
assert.equal(vpn.result.honesty.l3_exit_pool, "SLOT");
assert.equal(vpn.result.honesty.kernel_udp, "SLOT");
assert.equal(vpn.result.honesty.tun_tap, "SLOT");
assert.equal(vpn.result.worker_terminates_kernel_udp, false);

const ai = JSON.stringify({
  status: status.result,
  boot: boot.result,
  net: net.result,
  d2d: mesh.body.d2d_carriers,
  azmail: bySlug.azmail,
  azvpn: bySlug.azvpn,
  veillock: bySlug.veillock,
  whitestone: bySlug.whitestone,
});
const os = JSON.stringify({ status: status.result, boot: boot.result, net: net.result });
for (const sentence of sentences) {
  assert.ok(human.includes(sentence), `human page missing: ${sentence}`);
  assert.ok(ai.includes(sentence), `AI door missing: ${sentence}`);
  assert.ok(os.includes(sentence), `AZOS missing: ${sentence}`);
}

const surfaces = [human, ai, os];
for (const text of surfaces) {
  assert.equal(text.includes("smtp_send is LIVE"), false);
  assert.equal(text.includes("smtp_send queues"), false);
  assert.equal(text.includes("WireGuard and OpenVPN stay unavailable"), false);
  assert.equal(/packet path is live/i.test(text.replaceAll("packet path is not live", "")), false);
  assert.equal(/alternative internet is live/i.test(text.replaceAll("alternative internet is not live", "")), false);
  assert.equal(/"alt_internet_live":true/.test(text.replaceAll(" ", "")), false);
  assert.equal(/"packet_path_live":true/.test(text.replaceAll(" ", "")), false);
  assert.equal(/"booted":true/.test(text.replaceAll(" ", "")), false);
  assert.equal(/"kernel_base":true/.test(text.replaceAll(" ", "")), false);
  assert.equal(/"public_smtp_send":true/.test(text.replaceAll(" ", "")), false);
}

console.log("ok surface agreement: AI, human, and AZOS share the same stub, slot, and refusal facts");
