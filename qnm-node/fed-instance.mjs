/**
 * One FED-MESH-1.0 instance. Own key, data directory, and port.
 * The daemon in AzielEliab/qnm-node can speak this same protocol.
 * Author: Aziel Eliab only.
 *
 * L0 (default): one --relay. L1 (opt-in): --relays with more than one URL.
 * Listen defaults to 127.0.0.1. --host 0.0.0.0 or a LAN IP opens /v1/fed-mesh/direct
 * for a second machine. That socket is not qnm-node/awareness.mjs.
 * --arm lan (or --arm order) arms Track 2 carriers. GET never arms them.
 * --fixture is the no-second-device LAN beacon mode. The three QNM named
 * flags are live. Radio PHY stays not live. second_device stays false.
 * The phone client is GET /mobile/ on this same process. mobile_client stays
 * present-not-demonstrated. That page is not an app-store release.
 *   node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --relay http://127.0.0.1:8780/v1/mesh/relay
 *   node qnm-node/fed-instance.mjs --data ./data/b --port 8782 --relays http://127.0.0.1:8780/v1/mesh/relay,http://127.0.0.1:8783/v1/mesh/relay
 *   node qnm-node/fed-instance.mjs --data ./data/a --relay https://<origin>/v1/mesh/relay --product <slug> --heartbeat-sec 180
 *   node qnm-node/fed-instance.mjs ... --log-file ./data/a/node.log --log-max-bytes 1048576   (capped, rotates to .1)
 *   node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --host 0.0.0.0 --advertise 192.168.1.10 --relay http://127.0.0.1:8780/v1/mesh/relay
 */

import { cappedLogger } from "../src/fed-mesh/capped-log.js";
import { startInstance } from "../src/fed-mesh/instance.js";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

const data = arg("--data", "./data/fed-node");
const port = Number(arg("--port", "0")) || 0;
const host = arg("--host", "127.0.0.1");
const advertise = arg("--advertise", "");
const relay = arg("--relay", "");
const relaysArg = arg("--relays", "");
const relays = relaysArg
  ? relaysArg.split(",").map((item) => item.trim()).filter(Boolean)
  : relay
    ? [relay]
    : [];
const passphrase = arg("--passphrase", "");
const armArg = arg("--arm", "");
const fixture = process.argv.includes("--fixture");
const product = arg("--product", "mesh");
const heartbeatSec = Math.max(0, Number(arg("--heartbeat-sec", "0")) || 0);
// MESH-ONBOARD-1.0 log cap: with --log-file, JSON lines go to that file (0600) and it rotates to
// <file>.1 once it would pass --log-max-bytes (default 1 MiB, floor 4 KiB), so at most two
// capped files exist (src/fed-mesh/capped-log.js). Without --log-file, lines go to stdout as before.
const logFile = arg("--log-file", "");
if (logFile) console.log = cappedLogger(logFile, Number(arg("--log-max-bytes", "1048576")));
const node = await startInstance({ dataDir: data, port, host, advertise, relays, passphrase, fixture, product });
console.log(JSON.stringify({
  handle: node.handle,
  listen_host: node.listenHost,
  direct: node.directUrl,
  direct_mode: node.directMode,
  direct_note: node.directNote,
  data,
  relays,
  hole_punch: false,
  stun: false,
  turn: false,
  public_icann: false,
  radio_phy: false,
  awareness_socket: false,
  track2: node.track2.summary(),
  mobile_join: `${node.base}/mobile/`,
  mobile_client: node.mobile_client,
  app_store_release: false,
  mesh_node_live: true,
  alt_internet_live: true,
  packet_path_live: true,
}));
if (armArg) {
  const armed = await node.track2.arm(armArg === "order" ? "order" : armArg.split(","), "operator");
  console.log(JSON.stringify({ arm: armed.ok === true, code: armed.code, results: armed.results || [], armed: armed.armed || [], mesh_node_live: true, alt_internet_live: true, packet_path_live: true, radio_phy: false, get_never_enables: true }));
}
if (relays.length > 1) {
  const registered = await node.registerAll();
  console.log(JSON.stringify({
    registered: registered.registered,
    ok: registered.ok === true,
    code: registered.code,
    hole_punch: false,
    results: registered.results.map((row) => ({ url: row.url, ok: row.ok === true, code: row.code, bearer: row.bearer || null })),
  }));
} else if (relays.length === 1) {
  const registered = await node.register(relays[0], { product });
  console.log(JSON.stringify({ registered: registered.ok === true, handle: node.handle, product, code: registered.code, seq: registered.seq, bearer: registered.bearer || null, hole_punch: false }));
  if (registered.ok === true && heartbeatSec > 0) {
    // MESH-ONBOARD-1.0 node: keep a signed heartbeat on the relay chain while this process runs.
    const beat = async () => {
      const out = await node.heartbeat(relays[0], "live");
      console.log(JSON.stringify({ heartbeat: out.ok === true, handle: node.handle, code: out.code, seq: out.seq || null, at: new Date().toISOString() }));
    };
    setInterval(() => {
      beat().catch((err) => console.log(JSON.stringify({ heartbeat: false, error: String(err && err.message ? err.message : err) })));
    }, Math.max(15, heartbeatSec) * 1000);
  }
}
