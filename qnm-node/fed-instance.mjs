/**
 * One FED-MESH-1.0 instance. Own key, data directory, and port.
 * The daemon in AzielEliab/qnm-node can speak this same protocol.
 * Author: Aziel Eliab only.
 *
 *   node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --relay http://127.0.0.1:8780/v1/mesh/relay
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
const node = await startInstance({ dataDir: data, port, relays: relay ? [relay] : [] });
console.log(JSON.stringify({ handle: node.handle, direct: node.directUrl, data, relay: relay || null }));
if (relay) {
  const registered = await node.register(relay);
  console.log(JSON.stringify({ registered: registered.ok === true, code: registered.code, seq: registered.seq }));
}
