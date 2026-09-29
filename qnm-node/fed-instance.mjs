/**
 * One FED-MESH-1.0 instance. Own key, data directory, and port.
 * The daemon in AzielEliab/qnm-node can speak this same protocol.
 * Author: Aziel Eliab only.
 *
 *   node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --relay http://127.0.0.1:8780/v1/mesh/relay
 *   node qnm-node/fed-instance.mjs --data ./data/b --port 8782 --relays http://127.0.0.1:8780/v1/mesh/relay,http://127.0.0.1:8783/v1/mesh/relay
 */

import { startInstance } from "../src/fed-mesh/instance.js";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

const data = arg("--data", "./data/fed-node");
const port = Number(arg("--port", "0")) || 0;
const relay = arg("--relay", "");
const relaysArg = arg("--relays", "");
const relays = relaysArg
  ? relaysArg.split(",").map((item) => item.trim()).filter(Boolean)
  : relay
    ? [relay]
    : [];
const node = await startInstance({ dataDir: data, port, relays });
console.log(JSON.stringify({
  handle: node.handle,
  direct: node.directUrl,
  data,
  relays,
  hole_punch: false,
  public_icann: false,
  radio_phy: false,
}));
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
  const registered = await node.register(relays[0]);
  console.log(JSON.stringify({ registered: registered.ok === true, code: registered.code, seq: registered.seq, bearer: registered.bearer || null, hole_punch: false }));
}
