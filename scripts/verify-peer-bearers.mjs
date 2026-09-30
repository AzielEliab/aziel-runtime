/**
 * Peer bearers: relay HTTPS, direct/LAN, loopback.
 * NAT hole-punch refuses. GET /v1/mesh never enables.
 * Softwares stay 42. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { classifyPeerUrl, NAT_REFUSE_CODE, survivalMethods } from "../src/fed-mesh/bearers.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import { startRelayServer } from "../src/fed-mesh/local-http.js";
import { relayCite } from "../src/fed-mesh/relay.js";
import { humanDoorScript, workspacePaneHtml } from "../src/human-ui.js";
import { PRODUCTS } from "../src/index.js";
import { MESH_MCP_TOOLS, dispatchMeshHttp, runMeshOp } from "../src/mesh.js";
import { requestLimitKind } from "../src/request-limits.js";
import { listSoftwareEntries } from "../src/software-catalog.js";

const httpsRelay = classifyPeerUrl("https://aziel-runtime.vibelock.workers.dev/v1/mesh/relay", { role: "relay" });
assert.equal(httpsRelay.ok, true);
assert.equal(httpsRelay.mode, "relay-https");
assert.equal(httpsRelay.hole_punch, false);
assert.equal(httpsRelay.public_icann, false);
assert.equal(httpsRelay.radio_phy, false);
assert.equal(httpsRelay.get_never_enables, true);

const loopback = classifyPeerUrl("http://127.0.0.1:8780/v1/mesh/relay", { role: "relay" });
assert.equal(loopback.mode, "loopback");
const v6 = classifyPeerUrl("http://[::1]:8780/v1/mesh/relay", { role: "relay" });
assert.equal(v6.mode, "loopback");

const lan = classifyPeerUrl("http://192.168.1.20:8781/v1/fed-mesh/direct", { role: "direct" });
assert.equal(lan.ok, true);
assert.equal(lan.mode, "direct-lan");
assert.equal(lan.lan, true);
assert.equal(lan.hole_punch, false);

const lanAsRelay = classifyPeerUrl("http://10.1.2.3/v1/mesh/relay", { role: "relay" });
assert.equal(lanAsRelay.ok, false);
assert.equal(lanAsRelay.code, "FED-MESH-BAD-INPUT");

const configuredHttps = classifyPeerUrl("https://203.0.113.5/v1/fed-mesh/direct", { role: "direct" });
assert.equal(configuredHttps.mode, "direct-lan");
assert.equal(configuredHttps.lan, false);
assert.equal(configuredHttps.configured_public_https, true);
assert.equal(configuredHttps.public_icann, false);

const publicClear = classifyPeerUrl("http://203.0.113.10/v1/fed-mesh/direct", { role: "direct" });
assert.equal(publicClear.code, NAT_REFUSE_CODE);
assert.equal(publicClear.hole_punch, false);
assert.equal(publicClear.not_a_second_internet, true);

const stun = classifyPeerUrl("stun:203.0.113.8:3478", { role: "direct" });
assert.equal(stun.code, NAT_REFUSE_CODE);
assert.equal(stun.radio_phy, false);
assert.equal(stun.name, "AZnet");
assert.equal(stun.aznet_replaces_internet, false);

const punchUrl = classifyPeerUrl("https://relay.example/v1/mesh/relay?hole_punch=1", { role: "relay" });
assert.equal(punchUrl.code, NAT_REFUSE_CODE);

const cards = listSoftwareEntries(PRODUCTS, "https://example.test");
assert.equal(cards.length, 42);
assert.equal(cards.every((card) => card.mesh && card.mesh.peer_bearers == null), true);
assert.equal(cards.every((card) => card.mesh && card.mesh.survival_methods == null), true);

const menu = survivalMethods();
assert.equal(menu.default, "L0");
assert.equal(menu.fork, false);
assert.equal(menu.replaces_l0, false);
assert.equal(menu.l0_live, true);
assert.equal(menu.l1_live, false);
assert.equal(menu.single_method, false);
assert.equal(menu.plane_a_is_one_tunnel, true);
assert.equal(menu.independent_requirement_met, false);
assert.equal(menu.do_not_paint_slot_as_live, true);
assert.equal(menu.aznet_replaces_internet, false);
assert.equal(menu.doi, null);
assert.equal(menu.cid, null);
assert.equal(menu.invented_doi, false);
assert.equal(menu.invented_cid, false);
assert.equal(menu.zenodo_live, false);
assert.equal(menu.no_fan, true);
assert.equal(menu.runtime_is_shelf, false);
assert.equal(menu.softwares_count, 42);
assert.deepEqual(
  menu.methods.map((method) => method.id),
  ["cf-worker-edge", "multi-relay", "direct-lan", "cap7-mesh-dns", "home-origin", "cold-shelves", "phoenix"],
);
assert.equal(menu.methods.every((method) => method.replaces_l0 === false), true);
const byId = Object.fromEntries(menu.methods.map((method) => [method.id, method]));
assert.equal(byId["cf-worker-edge"].status, "live");
assert.equal(byId["cf-worker-edge"].layer, "L0");
assert.equal(byId["multi-relay"].status, "live-when-configured");
assert.equal(byId["multi-relay"].live, false);
assert.equal(byId["multi-relay"].implemented, true);
assert.equal(byId["direct-lan"].live, false);
assert.equal(byId["direct-lan"].nat_refuse, NAT_REFUSE_CODE);
assert.equal(byId["cap7-mesh-dns"].status, "live");
assert.equal(byId["cap7-mesh-dns"].live, true);
assert.equal(byId["cap7-mesh-dns"].factory_exec, true);
assert.equal(byId["cap7-mesh-dns"].public_icann, false);
assert.equal(byId["cap7-mesh-dns"].public_egress_ip, false);
assert.equal(byId["cap7-mesh-dns"].resolves_to_hub, false);
assert.equal(byId["cap7-mesh-dns"].replaces_l0, false);
assert.equal(byId["cap7-mesh-dns"].not_a_second_internet, true);
assert.equal(byId["cap7-mesh-dns"].this_pr, true);
assert.equal(byId["cap7-mesh-dns"].dns_publish, false);
assert.deepEqual(byId["cap7-mesh-dns"].ops, ["geo-target", "session-stick", "egress-rotate"]);
assert.equal(byId["home-origin"].status, "slot");
assert.equal(byId["home-origin"].layer, "L3");
assert.equal(byId["home-origin"].cutover, false);
assert.equal(byId["home-origin"].shelf_id, "home-origin-mini-pc");
assert.equal(byId["home-origin"].dns_rented, false);
assert.equal(byId["home-origin"].deposited, false);
assert.equal(byId["cold-shelves"].status, "slot");
assert.equal(byId["cold-shelves"].live, false);
assert.equal(byId["cold-shelves"].doi, null);
assert.equal(byId["cold-shelves"].cid, null);
assert.equal(byId["cold-shelves"].zenodo_live, false);
assert.equal(byId["cold-shelves"].zenodo_refuse, "CNS-ZENODO-NOT-LIVE");
assert.equal(byId["cold-shelves"].hash_verify_pass_is_not_live, true);
assert.equal(byId["cold-shelves"].codeberg.live, false);
assert.equal(byId["cold-shelves"].codeberg.hash_verify, "pass");
assert.equal(byId["cold-shelves"].archive_org.live, false);
assert.equal(byId["cold-shelves"].third_forge.url, null);
assert.equal(byId["cold-shelves"].third_forge.refuse, "CNS-NO-FORGE-MIRROR");
assert.equal(byId["cold-shelves"].gitflic.status, "refused");
assert.equal(byId["cold-shelves"].gitflic.live, false);
assert.equal(byId["cold-shelves"].gitflic.refuse, "CNS-GITFLIC-EMAIL");
assert.equal(byId["cold-shelves"].usb.status, "slot");
assert.equal(byId.phoenix.status, "live");
assert.equal(byId.phoenix.controller_hunt, false);
assert.equal(byId.phoenix.vote_to_fix, false);
assert.equal(byId.phoenix.public_hostname_resurrection, false);
const armedRelay = survivalMethods({
  relays: ["http://127.0.0.1:8780/v1/mesh/relay", "http://127.0.0.1:8783/v1/mesh/relay"],
});
assert.equal(armedRelay.methods.find((method) => method.id === "multi-relay").live, true);
assert.equal(armedRelay.methods.find((method) => method.id === "multi-relay").probed, false);
assert.equal(armedRelay.methods.find((method) => method.id === "cf-worker-edge").replaces_l0, false);
const oneRelay = survivalMethods({ relays: ["http://127.0.0.1:8780/v1/mesh/relay"] });
assert.equal(oneRelay.methods.find((method) => method.id === "multi-relay").live, false);
const armedDirect = survivalMethods({ directUrl: "http://192.168.1.20:8781/v1/fed-mesh/direct" });
assert.equal(armedDirect.methods.find((method) => method.id === "direct-lan").live, true);
assert.equal(armedDirect.methods.find((method) => method.id === "direct-lan").mode, "direct-lan");
assert.equal(armedDirect.methods.find((method) => method.id === "direct-lan").reachability_claimed, false);
const stunned = survivalMethods({ directUrl: "stun:203.0.113.8:3478" });
assert.equal(stunned.methods.find((method) => method.id === "direct-lan").live, false);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(MESH_MCP_TOOLS.includes("mesh_status"), true);
assert.equal(MESH_MCP_TOOLS.some((name) => /hole|nat|stun/.test(name)), false);

const html = workspacePaneHtml("https://example.test", []);
assert.match(html, /id="dash-softwares-title"/);
assert.match(html, /id="mesh-bearer-note"/);
assert.match(html, /FED-MESH-NAT-REFUSE/);
assert.match(html, /Not radio PHY/);
assert.match(html, /L0 stays the public path/);
assert.match(html, /data-mesh="status"/);
assert.match(html, /data-mesh="join"/);
assert.match(html, /L1 does not replace L0/);
assert.match(html, /cold shelves stay SLOT/);
assert.match(html, /No invented DOI/);
const script = humanDoorScript();
assert.match(script, /peer_bearers/);
assert.match(script, /NAT hole-punch refused/);
assert.match(script, /not a second internet/);
assert.match(script, /L0 default/);
assert.match(script, /L1 opt-in/);
assert.match(script, /survival L0 live, L1 when configured, shelves SLOT, doi null/);
assert.match(script, /L2 Cap-7 factory live, not ICANN, not egress IP/);
assert.match(script, /L3 shelves SLOT, L4 not a full OS/);
assert.doesNotMatch(script, /L2–L4 cite only/);
assert.match(script, /AZnet/);
assert.match(html, /AZnet does not replace the internet/);
const handler = (await import("../src/index.js")).default.fetch;
const pageRes = await handler(new Request("https://example.test/workspace"));
assert.equal(pageRes.status, 200);
const page = await pageRes.text();
assert.match(page, /id="mesh-bearer-note"/);
assert.match(page, /id="dash-softwares"/);
assert.match(page, /peer_bearers/);
assert.match(page, /Not radio PHY/);
const meshRes = await handler(new Request("https://example.test/v1/mesh", { headers: { accept: "application/json" } }));
const meshBody = await meshRes.json();
assert.equal(meshBody.get_never_enables, true);
assert.equal(meshBody.hole_punch, false);
assert.equal(meshBody.peer_bearers.not_a_second_internet, true);
assert.equal(meshBody.peer_bearers.public_icann, false);
assert.equal(meshBody.peer_bearers.radio_phy, false);
assert.equal(meshBody.peer_bearers.default_layer, "L0");
assert.equal(meshBody.peer_bearers.opt_in, true);
assert.equal(meshBody.peer_bearers.replaces_l0, false);
assert.equal(meshBody.peer_bearers.aznet_replaces_internet, false);
assert.equal(meshBody.peer_bearers.layers.fork, false);
assert.equal(meshBody.peer_bearers.layers.default, "L0");
assert.equal(meshBody.peer_bearers.layers.L0.must_keep, true);
assert.equal(meshBody.peer_bearers.layers.L1.opt_in, true);
assert.equal(meshBody.peer_bearers.layers.L1.default, false);
assert.equal(meshBody.peer_bearers.layers.L1.replaces_l0, false);
assert.equal(meshBody.peer_bearers.layers.L2.this_pr, true);
assert.equal(meshBody.peer_bearers.layers.L2.dns_publish, false);
assert.equal(meshBody.peer_bearers.layers.L2.public_icann, false);
assert.equal(meshBody.peer_bearers.layers.L3.this_pr, true);
assert.equal(meshBody.peer_bearers.layers.L3.home_origin, "slot");
assert.equal(meshBody.peer_bearers.layers.L4.this_pr, true);
assert.equal(meshBody.peer_bearers.layers.L4.full_os, false);
assert.equal(meshBody.peer_bearers.layers.L4.softwares_ui, false);
assert.equal(meshBody.aznet_layers.default, "L0");
assert.equal(meshBody.aznet_layers.L2.dns_publish, false);
assert.equal(meshBody.peer_bearers.layers.aznet_replaces_internet, false);
assert.equal(meshBody.peer_bearers.layers.softwares_frozen, true);
assert.equal(meshBody.peer_bearers.layers.softwares_count, 42);
assert.equal(meshBody.enabled, true);
assert.deepEqual(meshBody.bearers, ["suite-presence"]);
assert.equal(meshBody.suite_presence, "on");
assert.equal(meshBody.op, "status");
assert.equal(meshBody.code, "MESH-OK");
assert.equal(meshBody.survival_methods.default, "L0");
assert.equal(meshBody.survival_methods.l0_live, true);
assert.equal(meshBody.survival_methods.l1_live, false);
assert.equal(meshBody.survival_methods.doi, null);
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "cold-shelves").status, "slot");
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "home-origin").status, "slot");
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "home-origin").live, false);
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "cap7-mesh-dns").status, "live");
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "cap7-mesh-dns").factory_exec, true);
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "cap7-mesh-dns").public_icann, false);
assert.equal(meshBody.survival_methods.methods.find((method) => method.id === "phoenix").vote_to_fix, false);
assert.equal(meshBody.peer_bearers.survival.default_live, "cf-worker-edge");
assert.equal(meshBody.peer_bearers.survival.methods.length, 7);
assert.equal(requestLimitKind("/v1/mesh/hole-punch", "POST"), "mesh_mutate");

const before = await dispatchMeshHttp("GET", "/v1/mesh", {}, {}, "https://example.test", new URLSearchParams());
assert.equal(before.status, 200);
assert.equal(before.body.get_never_enables, true);
assert.equal(before.body.hole_punch, false);
assert.equal(before.body.not_a_second_internet, true);
assert.equal(before.body.worker_is_one_relay, true);
assert.equal(before.body.peer_bearers.name, "AZnet");
assert.equal(before.body.peer_bearers.layers.default, "L0");
assert.equal(before.body.peer_bearers.layers.L1.replaces_l0, false);
assert.equal(before.body.peer_bearers.aznet_replaces_internet, false);
assert.equal(before.body.enabled, true);
assert.deepEqual(before.body.bearers, ["suite-presence"]);
assert.equal(before.body.peer_bearers.public_icann, false);
assert.equal(before.body.peer_bearers.radio_phy, false);
assert.deepEqual(
  before.body.peer_bearers.modes.map((mode) => mode.id),
  ["relay-https", "direct-lan", "loopback"],
);

const punched = await dispatchMeshHttp("POST", "/v1/mesh/hole-punch", { hole_punch: true }, {}, "https://example.test", new URLSearchParams());
assert.equal(punched.status, 403);
assert.equal(punched.body.code, NAT_REFUSE_CODE);
assert.equal(punched.body.hole_punch, false);
assert.equal(punched.body.get_never_enables, true);
assert.equal(punched.body.public_icann, false);
assert.equal(punched.body.replaces_l0, false);
assert.equal(punched.body.aznet_replaces_internet, false);
assert.equal(punched.body.default_layer, "L0");

const queried = await dispatchMeshHttp("GET", "/v1/mesh", {}, {}, "https://example.test", new URLSearchParams("hole_punch=1"));
assert.equal(queried.status, 403);
assert.equal(queried.body.code, NAT_REFUSE_CODE);

const after = await dispatchMeshHttp("GET", "/v1/mesh", {}, {}, "https://example.test", new URLSearchParams());
assert.equal(after.body.enabled, before.body.enabled);
assert.deepEqual(after.body.bearers, before.body.bearers);
assert.equal(after.body.get_never_enables, true);

const door = await runMeshOp("hole-punch", {}, {});
assert.equal(door.code, NAT_REFUSE_CODE);
assert.equal(door.hole_punch, false);
assert.equal(door.replaces_l0, false);
assert.equal(door.aznet_replaces_internet, false);
const l0status = await runMeshOp("status", {}, {});
assert.equal(l0status.code, "MESH-OK");
assert.equal(l0status.op, "status");
assert.equal(l0status.enabled, true);
assert.deepEqual(l0status.bearers, ["suite-presence"]);
assert.equal(l0status.get_never_enables, true);
assert.equal(l0status.peer_bearers.layers.default, "L0");
const l0enable = await runMeshOp("enable", { bearer: "suite-presence" }, {});
assert.equal(l0enable.code, "MESH-OK");
assert.equal(l0enable.op, "enable");
assert.ok(l0enable.bearers.includes("suite-presence"));
const armed = await runMeshOp("enable", { bearer: "suite-presence", hole_punch: true }, {});
assert.equal(armed.code, NAT_REFUSE_CODE);

const relayRead = await dispatchMeshHttp("GET", "/v1/mesh/relay", {}, {}, "https://example.test", new URLSearchParams());
assert.equal(relayRead.status, 200);
assert.equal(relayRead.body.health, "up");
assert.equal(relayRead.body.health_check, "GET /v1/mesh/relay");
assert.equal(relayRead.body.get_never_enables, true);
assert.equal(relayRead.body.hole_punch, false);
assert.equal(relayRead.body.peer_bearers.worker_is_one_relay, true);
assert.equal(relayRead.body.enabled, before.body.enabled);

const cite = await relayCite();
assert.equal(cite.health, "up");
assert.equal(cite.peer_bearers.relay_fallback, true);
assert.equal(cite.relay_sees_plaintext, false);

const l0relay = await startRelayServer();
const l0root = await mkdtemp(join(tmpdir(), "peer-bearers-l0-"));
const l0alice = await startInstance({ dataDir: join(l0root, "alice"), relays: [l0relay.url] });
const l0bob = await startInstance({ dataDir: join(l0root, "bob"), relays: [l0relay.url] });
try {
  const regA = await l0alice.register(l0relay.url);
  const regB = await l0bob.register(l0relay.url);
  assert.equal(regA.ok, true, regA.message);
  assert.equal(regB.ok, true, regB.message);
  assert.equal(regA.seq, 1);
  const sent = await l0alice.send(l0relay.url, {
    to: l0bob.handle,
    enc_public_key: l0bob.enc_public_key,
    plaintext: "l0-relay",
  });
  assert.equal(sent.ok, true, sent.message);
  assert.equal(sent.hole_punch, false);
  const pulled = await l0bob.pull(l0relay.url);
  assert.equal(pulled.messages.length, 1);
  assert.equal(await l0bob.open(pulled.messages[0].envelope), "l0-relay");
  const l0health = await (await fetch(l0alice.base + "/health")).json();
  assert.equal(l0health.default_layer, "L0");
  assert.equal(l0health.survival.methods.find((method) => method.id === "multi-relay").live, false);
  assert.equal(l0health.survival.methods.find((method) => method.id === "cf-worker-edge").live, true);
} finally {
  await l0alice.stop();
  await l0bob.stop();
  await l0relay.stop();
  await rm(l0root, { recursive: true, force: true });
}

const down = "http://127.0.0.1:1/v1/mesh/relay";
const relayA = await startRelayServer();
const relayB = await startRelayServer();
const root = await mkdtemp(join(tmpdir(), "peer-bearers-"));
const alice = await startInstance({ dataDir: join(root, "alice"), relays: [down, relayA.url, relayB.url] });
const bob = await startInstance({ dataDir: join(root, "bob"), relays: [relayA.url, relayB.url] });

try {
  const localHealth = await (await fetch(alice.base + "/health")).json();
  assert.equal(localHealth.survival.methods.find((method) => method.id === "multi-relay").live, true);
  assert.equal(localHealth.survival.methods.find((method) => method.id === "multi-relay").probed, false);
  assert.equal(localHealth.survival.replaces_l0, false);
  const health = await alice.health(relayA.url);
  assert.equal(health.ok, true, health.message);
  assert.equal(health.health, "up");
  assert.equal(health.mode, "loopback");
  assert.equal(health.get_never_enables, true);
  assert.equal(health.hole_punch, false);

  const picked = await alice.selectRelay([down, relayB.url]);
  assert.equal(picked.ok, true, picked.message);
  assert.equal(picked.url, relayB.url);
  assert.equal(picked.hole_punch, false);

  const regA = await alice.registerAll();
  assert.equal(regA.registered, 2, JSON.stringify(regA.results));
  assert.equal(regA.hole_punch, false);
  assert.equal(regA.results[0].ok, false);
  assert.equal(regA.results[0].code, "FED-MESH-RELAY-DOWN");
  const regB = await bob.registerAll();
  assert.equal(regB.registered, 2, JSON.stringify(regB.results));

  const dir = async (relay, handle) => {
    const res = await fetch(`${relay}/directory?handle=${encodeURIComponent(handle)}`);
    return res.json();
  };
  assert.equal((await dir(relayA.url, alice.handle)).seq, 1);
  assert.equal((await dir(relayB.url, alice.handle)).seq, 1);

  const sentA = await alice.send(relayA.url, {
    to: bob.handle,
    enc_public_key: bob.enc_public_key,
    plaintext: "relay-a",
  });
  assert.equal(sentA.ok, true, sentA.message);
  assert.equal(sentA.bearer, "loopback");
  assert.equal(sentA.hole_punch, false);
  assert.equal(JSON.stringify(sentA.envelope).includes("relay-a"), false);
  assert.equal((await dir(relayA.url, alice.handle)).seq, 2);
  assert.equal((await dir(relayB.url, alice.handle)).seq, 1);

  const pulled = await bob.pull(relayA.url);
  assert.equal(pulled.messages.length, 1);
  assert.equal(await bob.open(pulled.messages[0].envelope), "relay-a");

  const direct = await alice.sendDirect(bob.directUrl, {
    to: bob.handle,
    enc_public_key: bob.enc_public_key,
    plaintext: "on-loopback",
  });
  assert.equal(direct.ok, true, direct.message);
  assert.equal(direct.bearer, "loopback");
  assert.equal(direct.direct, true);
  assert.equal(direct.fallback, false);
  assert.equal(direct.hole_punch, false);
  const inbox = await bob.directInbox();
  assert.equal(inbox.at(-1).text, "on-loopback");

  const nat = await alice.sendReachable({
    directUrl: "stun:203.0.113.8:3478",
    to: bob.handle,
    enc_public_key: bob.enc_public_key,
    plaintext: "should-not-send",
  });
  assert.equal(nat.code, NAT_REFUSE_CODE);
  assert.equal(nat.hole_punch, false);
  assert.equal((await bob.directInbox()).length, inbox.length);
  assert.equal((await dir(relayA.url, alice.handle)).seq, 2);

  const via = await alice.sendReachable({
    directUrl: "http://127.0.0.1:1/v1/fed-mesh/direct",
    to: bob.handle,
    enc_public_key: bob.enc_public_key,
    plaintext: "fell-back",
  });
  assert.equal(via.ok, true, via.message);
  assert.equal(via.fallback, true);
  assert.equal(via.hole_punch, false);
  assert.equal(via.get_never_enables, true);
  const pulledFallback = await bob.pull(relayA.url);
  const opened = [];
  for (const row of pulledFallback.messages || []) opened.push(await bob.open(row.envelope));
  assert.ok(opened.includes("fell-back"));
  assert.equal((await bob.directInbox()).length, inbox.length);

  console.log("verify-peer-bearers: ok");
} finally {
  await alice.stop();
  await bob.stop();
  await relayA.stop();
  await relayB.stop();
  await rm(root, { recursive: true, force: true });
}
