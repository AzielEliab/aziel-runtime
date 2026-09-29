/**
 * AZ-OS offline stub. Talks L0 only when --relay is set.
 * No Softwares UI. No mesh enable. No host exec.
 * Author: Aziel Eliab only.
 *
 *   node qnm-node/offline-node.mjs
 *   node qnm-node/offline-node.mjs --relay http://127.0.0.1:8780/v1/mesh/relay --data ./data/offline
 */

import { offlineNodePlan } from "../src/fed-mesh/aznet-layers.js";
import { startInstance } from "../src/fed-mesh/instance.js";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

const relay = arg("--relay", "");
const data = arg("--data", "./data/offline-node");
const port = Number(arg("--port", "0")) || 0;
const plan = offlineNodePlan({ relay });
console.log(JSON.stringify(plan));

if (!plan.when_online.use_l0) {
  process.exit(0);
}

const node = await startInstance({ dataDir: data, port, relays: [relay] });
const registered = await node.register(relay);
console.log(
  JSON.stringify({
    mode: "online-l0",
    handle: node.handle,
    registered: registered.ok === true,
    code: registered.code,
    hole_punch: false,
    get_never_enables: true,
    public_icann: false,
  }),
);
await node.stop();
