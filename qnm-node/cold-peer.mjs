/**
 * One cold-start peer process. Local Track 2 HTTP only.
 * No relay register. AUTO_UPDATE is not turned on. No public mesh fetch.
 * Author: Aziel Eliab only.
 *
 *   node qnm-node/cold-peer.mjs --data DIR --host 10.88.2.1 --port 18781 --dir DIR
 */

import { readFile, rm, writeFile } from "node:fs/promises";
import { readMachineId } from "./bearers/radio.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import { createColdStart } from "../src/fed-mesh/cold-start.js";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

const data = arg("--data");
const host = arg("--host", "127.0.0.1");
const port = Number(arg("--port", "0")) || 0;
const dir = arg("--dir");
if (!data || !dir) {
  console.error("cold-peer needs --data and --dir");
  process.exit(1);
}

if (process.env.AUTO_UPDATE === "on") {
  console.error("cold-peer refuses AUTO_UPDATE=on");
  process.exit(1);
}

const node = await startInstance({
  dataDir: data,
  port,
  host,
  advertise: host,
  relays: [],
  fixture: false,
  product: "mesh",
});
const armed = await node.track2.arm(["lan"], "operator");
const cold = createColdStart(node.track2, { machineId: readMachineId() || "" });
const inbox = `${dir}/inbox.json`;
const outbox = `${dir}/outbox.json`;

await writeFile(
  `${dir}/ready.json`,
  JSON.stringify({
    ready: true,
    handle: node.handle,
    base: node.base,
    direct: node.directUrl,
    direct_mode: node.directMode,
    listen_host: node.listenHost,
    machine_id: readMachineId(),
    armed: armed.ok === true,
    arm_code: armed.code,
    arm_results: armed.results || [],
    auto_update: {
      enabled: node.auto_update ? node.auto_update.enabled === true : false,
      code: node.auto_update ? node.auto_update.code : "UPDATE-OFF",
      live: node.auto_update ? node.auto_update.live === true : false,
      applied: node.auto_update ? node.auto_update.applied === true : false,
    },
    radio_phy: false,
    public_deployment: false,
  }),
);

async function reply(body) {
  await writeFile(outbox, JSON.stringify(body));
}

let stopped = false;
while (!stopped) {
  let text = "";
  try {
    text = await readFile(inbox, "utf8");
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 40));
    continue;
  }
  await rm(inbox, { force: true });
  let cmd = {};
  try {
    cmd = JSON.parse(text);
  } catch {
    await reply({ ok: false, code: "FED-MESH-BAD-INPUT", message: "Command was not JSON." });
    continue;
  }
  let out;
  try {
    if (cmd.op === "dial-empty") out = await cold.dial();
    else if (cmd.op === "supply") out = await cold.supply(cmd.url);
    else if (cmd.op === "dial") out = await cold.dial();
    else if (cmd.op === "allow") out = node.track2.allowSession(cmd.handle);
    else if (cmd.op === "deliver") out = await cold.deliver({ plaintext: cmd.plaintext, peerMachineId: cmd.peer_machine_id });
    else if (cmd.op === "bootstrap") out = await node.track2.bootstrapList([]);
    else if (cmd.op === "stop") {
      out = { ok: true, code: "MESH-OK", op: "stop" };
      stopped = true;
    } else out = { ok: false, code: "FED-MESH-BAD-INPUT", message: "Unknown cold-peer command." };
  } catch (err) {
    out = { ok: false, code: "COLD-START-PEER", message: String(err && err.message ? err.message : err) };
  }
  await reply(out);
}

await node.stop();
