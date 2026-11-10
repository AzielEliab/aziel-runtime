/**
 * Two independent node processes deliver one sealed share across a real socket.
 * Loopback-or-LAN address on this machine is local verification.
 * It is not a public deployment, not radio hardware, and not a second device
 * when both processes share this machine id.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { probeLan } from "../qnm-node/bearers/radio.js";
import { QNM_NAMED_LIVE, QNM_SEPARATED, TRAFFIC_PATHS } from "../src/qnm-honesty.js";

const root = new URL("..", import.meta.url).pathname;
const lan = probeLan();
assert.equal(lan.present, true, "this verification needs an up LAN interface");
assert.equal(lan.up, true, "a down interface is not the LAN path");
assert.ok(lan.address, "LAN interface has no IPv4 address");
assert.equal(TRAFFIC_PATHS.paths.lan.live, false);
assert.equal(TRAFFIC_PATHS.paths.lan.packet_live, false);
assert.equal(TRAFFIC_PATHS.paths.wifi.live, false);
assert.equal(TRAFFIC_PATHS.paths.bluetooth.live, false);
assert.equal(TRAFFIC_PATHS.paths.rf.live, false);
assert.equal(TRAFFIC_PATHS.paths.photon.live, false);
assert.equal(QNM_SEPARATED.radio_phy, false);
assert.equal(QNM_NAMED_LIVE.packet_path_live, true);
assert.equal(QNM_NAMED_LIVE.mesh_node_live, true);
assert.equal(QNM_NAMED_LIVE.alt_internet_live, true);

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function startNode(dataDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "qnm-node/fed-instance.mjs",
      "--data",
      dataDir,
      "--port",
      "0",
      "--host",
      "0.0.0.0",
      "--advertise",
      lan.address,
      "--arm",
      "lan",
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`node did not listen\n${out}\n${err}`));
    }, 15000);
    child.stdout.on("data", (chunk) => {
      out += chunk.toString("utf8");
      const line = out.split("\n").find((item) => item.includes("\"direct\""));
      if (!line) return;
      try {
        const info = JSON.parse(line);
        if (!info.direct) return;
        clearTimeout(timer);
        const url = new URL(info.direct);
        resolve({
          child,
          info,
          port: url.port,
          base: `http://${lan.address}:${url.port}`,
        });
      } catch {
        /* wait for a full JSON line */
      }
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString("utf8");
    });
    child.on("exit", (code) => {
      if (code) reject(new Error(`node exited ${code}\n${err}`));
    });
  });
}

async function waitArmed(base) {
  const deadline = Date.now() + 10000;
  let last = null;
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/health`);
    last = await res.json();
    if (last && last.track2 && Array.isArray(last.track2.armed) && last.track2.armed.includes("lan")) return last;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`LAN carrier was not armed: ${JSON.stringify(last && last.track2)}`);
}

const work = await mkdtemp(join(tmpdir(), "lan-peer-"));
const nodes = [];
try {
  const left = await startNode(join(work, "left"));
  const right = await startNode(join(work, "right"));
  nodes.push(left, right);
  assert.notEqual(left.child.pid, right.child.pid);
  assert.notEqual(left.child.pid, process.pid);
  assert.notEqual(right.child.pid, process.pid);
  const leftHealth = await waitArmed(left.base);
  const rightHealth = await waitArmed(right.base);
  assert.equal(leftHealth.worker_hardware, false);
  assert.equal(leftHealth.track2.radio_phy, false);
  assert.equal(leftHealth.track2.packet_path_live, true);
  assert.equal(leftHealth.track2.public_deployment, false);
  assert.equal(rightHealth.track2.alt_internet_live, true);
  assert.notEqual(leftHealth.handle, rightHealth.handle);

  const plaintext = "lan-peer-\u00b5-bytes";
  const posted = await fetch(`${left.base}/v1/fed-mesh/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ peer_base: right.base, plaintext }),
  });
  const delivered = await posted.json();
  assert.equal(delivered.ok, true, JSON.stringify(delivered));
  assert.equal(delivered.integrity, true);
  assert.equal(delivered.bytes, Buffer.byteLength(plaintext));
  assert.equal(delivered.plaintext_sha256, sha256(plaintext));
  assert.equal(delivered.ciphertext_sha256, sha256(delivered.envelope.ciphertext));
  assert.equal(delivered.lan, true);
  assert.equal(delivered.loopback, false);
  assert.equal(delivered.host, lan.address);
  assert.equal(delivered.bearer_mode, "direct-lan");
  assert.equal(delivered.local_socket_verified, true);
  assert.equal(delivered.fixture, false);
  assert.equal(delivered.public_deployment, false);
  assert.equal(delivered.hardware_live, false);
  assert.equal(delivered.radio_phy, false);
  assert.equal(delivered.wifi_live, false);
  assert.equal(delivered.bluetooth_live, false);
  assert.equal(delivered.rf_live, false);
  assert.equal(delivered.photon_live, false);
  assert.equal(delivered.lan_public_live, false);
  assert.equal(delivered.warn5_closed, false);
  assert.equal(delivered.public_door, "FG-STUB");
  assert.equal(delivered.second_device, false);
  assert.equal(delivered.same_machine, true);
  assert.equal(delivered.packet_path_live, true);
  assert.equal(delivered.azvpn_is_packet_path, false);
  assert.equal(delivered.scope, "local-process-verification");
  assert.ok(delivered.machine_id);
  assert.equal(delivered.peer_machine_id, delivered.machine_id);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const at = Math.min(8, delivered.envelope.ciphertext.length - 1);
  const cur = delivered.envelope.ciphertext[at];
  const swap = alphabet[(Math.max(0, alphabet.indexOf(cur)) + 1) % alphabet.length];
  const flipped = delivered.envelope.ciphertext.slice(0, at) + swap + delivered.envelope.ciphertext.slice(at + 1);
  const tampered = await fetch(`${right.base}/v1/fed-mesh/peer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...delivered.envelope, ciphertext: flipped }),
  });
  const tamperBody = await tampered.json();
  assert.equal(tamperBody.ok, false);
  assert.equal(tamperBody.code, "AZP-BAD-SIG");
  assert.equal(tamperBody.plaintext, null);
  assert.equal(tamperBody.integrity, false);

  const after = await (await fetch(`${left.base}/health`)).json();
  assert.equal(after.track2.local_socket_verified, true);
  assert.equal(after.track2.in_process, false);
  assert.equal(after.track2.radio_phy, false);
  assert.equal(after.track2.public_deployment, false);
  const rightStatus = await (await fetch(`${right.base}/v1/fed-mesh/discover`)).json();
  assert.equal(rightStatus.carriers.wifi.live, false);
  assert.equal(rightStatus.carriers.rf.live, false);
  assert.equal(rightStatus.carriers.photon.live, false);
  assert.equal(rightStatus.carriers.bluetooth.peer_exchange_demonstrated, false);

  const refused = await fetch(`${left.base}/v1/fed-mesh/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ peer_base: "https://example.com", plaintext: "no" }),
  });
  const refuseBody = await refused.json();
  assert.equal(refuseBody.ok, false);
  assert.equal(refuseBody.code, "FED-MESH-NO-ROUTE");
  assert.equal(refuseBody.sent, false);
  assert.equal(refuseBody.public_egress, false);

  console.log(JSON.stringify({
    ok: true,
    interface: lan.kind,
    address: lan.address,
    bytes: delivered.bytes,
    plaintext_sha256: delivered.plaintext_sha256,
    ciphertext_sha256: delivered.ciphertext_sha256,
    bearer_mode: delivered.bearer_mode,
    same_machine: delivered.same_machine,
    second_device: delivered.second_device,
    radio_phy: false,
    public_deployment: false,
    pids: [left.child.pid, right.child.pid],
  }));
} finally {
  for (const node of nodes) node.child.kill();
  await rm(work, { recursive: true, force: true });
}
