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
import { classifyPeerUrl, NAT_REFUSE_CODE } from "../src/fed-mesh/bearers.js";
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
assert.equal(stun.sidenet, false);

const punchUrl = classifyPeerUrl("https://relay.example/v1/mesh/relay?hole_punch=1", { role: "relay" });
assert.equal(punchUrl.code, NAT_REFUSE_CODE);

const cards = listSoftwareEntries(PRODUCTS, "https://example.test");
assert.equal(cards.length, 42);
assert.equal(cards.every((card) => card.mesh && card.mesh.peer_bearers == null), true);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(MESH_MCP_TOOLS.includes("mesh_status"), true);
assert.equal(MESH_MCP_TOOLS.some((name) => /hole|nat|stun/.test(name)), false);

const html = workspacePaneHtml("https://example.test", []);
assert.match(html, /id="dash-softwares-title"/);
assert.match(html, /id="mesh-bearer-note"/);
assert.match(html, /FED-MESH-NAT-REFUSE/);
assert.match(html, /Not radio PHY/);
const script = humanDoorScript();
assert.match(script, /peer_bearers/);
assert.match(script, /NAT hole-punch refused/);
assert.match(script, /not a second internet/);
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
assert.equal(requestLimitKind("/v1/mesh/hole-punch", "POST"), "mesh_mutate");

const before = await dispatchMeshHttp("GET", "/v1/mesh", {}, {}, "https://example.test", new URLSearchParams());
assert.equal(before.status, 200);
assert.equal(before.body.get_never_enables, true);
assert.equal(before.body.hole_punch, false);
assert.equal(before.body.not_a_second_internet, true);
assert.equal(before.body.worker_is_one_relay, true);
assert.equal(before.body.peer_bearers.sidenet, false);
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

const down = "http://127.0.0.1:1/v1/mesh/relay";
const relayA = await startRelayServer();
const relayB = await startRelayServer();
const root = await mkdtemp(join(tmpdir(), "peer-bearers-"));
const alice = await startInstance({ dataDir: join(root, "alice"), relays: [down, relayA.url, relayB.url] });
const bob = await startInstance({ dataDir: join(root, "bob"), relays: [relayA.url, relayB.url] });

try {
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
