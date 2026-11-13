/**
 * Two independent node processes deliver one sealed share.
 * Non-loopback uses TLS and an operator pin. The peer response is a receipt.
 * Same machine id stays second_device false.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isLanHost } from "../src/fed-mesh/bearers.js";
import { peerFetch } from "../src/fed-mesh/local-tls.js";
import { probeLan } from "../qnm-node/bearers/radio.js";
import { QNM_NAMED_LIVE, QNM_SEPARATED, TRAFFIC_PATHS } from "../src/qnm-honesty.js";

assert.equal(isLanHost("fd.example.com"), false);
assert.equal(isLanHost("fc.example.com"), false);
assert.equal(isLanHost("not-a-lan.local"), false);
assert.equal(isLanHost("8.8.8.8"), false);
assert.equal(isLanHost("example.com"), false);
assert.equal(isLanHost("forecast.example"), false);
assert.equal(isLanHost("10.1.1.1"), true);
assert.equal(isLanHost("192.168.1.20"), true);
assert.equal(isLanHost("172.30.0.2"), true);
assert.equal(isLanHost("169.254.1.1"), true);
assert.equal(isLanHost("fd12:3456::1"), true);
assert.equal(isLanHost("fe80::1"), true);
assert.equal(isLanHost("127.0.0.1"), false);

const root = new URL("..", import.meta.url).pathname;
const lan = probeLan();
assert.equal(lan.present, true, "this verification needs an up LAN interface");
assert.equal(lan.up, true, "a down interface is not the LAN path");
assert.ok(lan.address, "LAN interface has no IPv4 address");
assert.equal(TRAFFIC_PATHS.paths.lan.live, false);
assert.equal(TRAFFIC_PATHS.paths.lan.packet_live, false);
assert.equal(TRAFFIC_PATHS.paths.wifi.packet_live, false);
assert.equal(QNM_SEPARATED.radio_phy, false);
assert.equal(QNM_NAMED_LIVE.packet_path_live, true);
assert.equal(QNM_NAMED_LIVE.mesh_node_live, true);
assert.equal(QNM_NAMED_LIVE.alt_internet_live, true);

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const adminToken = randomBytes(24).toString("hex");

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
      "--secure",
      "--arm",
      "lan",
    ], {
      cwd: root,
      env: { ...process.env, FED_MESH_ADMIN_TOKEN: adminToken },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`node did not listen\n${out}\n${err}`));
    }, 20000);
    child.stdout.on("data", (chunk) => {
      out += chunk.toString("utf8");
      const line = out.split("\n").find((item) => item.includes("\"direct\""));
      if (!line) return;
      try {
        const info = JSON.parse(line);
        if (!info.direct || !info.tls_sha256) return;
        clearTimeout(timer);
        const url = new URL(info.direct);
        resolve({
          child,
          info,
          port: url.port,
          pin: info.tls_sha256,
          loop: `https://127.0.0.1:${url.port}`,
          lanBase: `https://${lan.address}:${url.port}`,
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

async function waitArmed(node) {
  const deadline = Date.now() + 10000;
  let last = null;
  while (Date.now() < deadline) {
    const res = await peerFetch(`${node.loop}/health`, { tlsPin: node.pin });
    last = res.json;
    if (res.transportOk && last && last.track2 && Array.isArray(last.track2.armed) && last.track2.armed.includes("lan")) return last;
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
  assert.equal(left.info.tls, true);
  assert.match(left.info.direct, new RegExp(`^https://${lan.address.replace(/\./g, "\\.")}:\\d+/v1/fed-mesh/direct$`));
  const leftHealth = await waitArmed(left);
  const rightHealth = await waitArmed(right);
  assert.equal(leftHealth.worker_hardware, false);
  assert.equal(leftHealth.track2.radio_phy, false);
  assert.equal(leftHealth.track2.packet_path_live, true);
  assert.equal(leftHealth.tls, true);
  assert.equal(leftHealth.plaintext_transport, false);
  assert.notEqual(leftHealth.handle, rightHealth.handle);

  const openAllow = await peerFetch(`${right.lanBase}/v1/fed-mesh/allow`, {
    method: "POST",
    json: { handle: leftHealth.handle },
    tlsPin: right.pin,
    headers: { "x-aziel-admin-token": adminToken },
  });
  assert.equal(openAllow.json.code, "FED-MESH-LOCAL-ADMIN");
  assert.equal(openAllow.json.allowlist_changed, false);

  const noToken = await peerFetch(`${right.loop}/v1/fed-mesh/allow`, {
    method: "POST",
    json: { handle: leftHealth.handle },
    tlsPin: right.pin,
  });
  assert.equal(noToken.json.code, "FED-MESH-LOCAL-ADMIN");

  const allowRight = await peerFetch(`${right.loop}/v1/fed-mesh/allow`, {
    method: "POST",
    json: { handle: leftHealth.handle },
    tlsPin: right.pin,
    headers: { "x-aziel-admin-token": adminToken },
  });
  assert.equal(allowRight.json.ok, true, JSON.stringify(allowRight.json));
  const allowLeft = await peerFetch(`${left.loop}/v1/fed-mesh/allow`, {
    method: "POST",
    json: { handle: rightHealth.handle },
    tlsPin: left.pin,
    headers: { "x-aziel-admin-token": adminToken },
  });
  assert.equal(allowLeft.json.ok, true, JSON.stringify(allowLeft.json));

  const clear = await peerFetch(`${left.loop}/v1/fed-mesh/deliver`, {
    method: "POST",
    json: { peer_base: `http://${lan.address}:${right.port}`, plaintext: "no" },
    tlsPin: left.pin,
    headers: { "x-aziel-admin-token": adminToken },
  });
  assert.equal(clear.json.code, "FED-MESH-TLS-REQUIRED");
  assert.equal(clear.json.sent, false);

  const remoteDeliver = await peerFetch(`${left.lanBase}/v1/fed-mesh/deliver`, {
    method: "POST",
    json: { peer_base: right.lanBase, plaintext: "no", tls_sha256: right.pin },
    tlsPin: left.pin,
    headers: { "x-aziel-admin-token": adminToken },
  });
  assert.equal(remoteDeliver.json.code, "FED-MESH-LOCAL-ADMIN");
  assert.equal(remoteDeliver.json.sent, false);

  const plaintext = "lan-peer-\u00b5-bytes";
  const posted = await peerFetch(`${left.loop}/v1/fed-mesh/deliver`, {
    method: "POST",
    json: { peer_base: right.lanBase, plaintext, tls_sha256: right.pin },
    tlsPin: left.pin,
    headers: { "x-aziel-admin-token": adminToken },
  });
  const delivered = posted.json;
  assert.equal(delivered.ok, true, JSON.stringify(delivered));
  assert.equal(posted.raw.includes(plaintext), false);
  assert.equal(delivered.plaintext, null);
  assert.equal(delivered.plaintext_returned, false);
  assert.equal(delivered.integrity, true);
  assert.equal(delivered.bytes, Buffer.byteLength(plaintext));
  assert.equal(delivered.plaintext_sha256, sha256(plaintext));
  assert.equal(delivered.ciphertext_sha256, sha256(delivered.envelope.ciphertext));
  assert.equal(delivered.tls, true);
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
  assert.equal(delivered.second_device, false);
  assert.equal(delivered.same_machine, true);
  assert.equal(delivered.packet_path_live, true);
  assert.equal(delivered.azvpn_is_packet_path, false);
  assert.equal(delivered.pin_source, "operator");
  assert.ok(delivered.machine_id);
  assert.equal(delivered.peer_machine_id, delivered.machine_id);

  const replay = await peerFetch(`${right.lanBase}/v1/fed-mesh/peer`, {
    method: "POST",
    json: delivered.envelope,
    tlsPin: right.pin,
  });
  assert.equal(replay.json.ok, false);
  assert.equal(replay.json.code, "FED-MESH-REPLAY");
  assert.equal(replay.json.plaintext, null);
  assert.equal(replay.json.integrity, false);
  assert.equal(replay.raw.includes(plaintext), false);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const at = Math.min(8, delivered.envelope.ciphertext.length - 1);
  const cur = delivered.envelope.ciphertext[at];
  const swap = alphabet[(Math.max(0, alphabet.indexOf(cur)) + 1) % alphabet.length];
  const flipped = delivered.envelope.ciphertext.slice(0, at) + swap + delivered.envelope.ciphertext.slice(at + 1);
  const tampered = await peerFetch(`${right.lanBase}/v1/fed-mesh/peer`, {
    method: "POST",
    json: { ...delivered.envelope, ciphertext: flipped },
    tlsPin: right.pin,
  });
  assert.equal(tampered.json.ok, false);
  assert.equal(tampered.json.code, "AZP-BAD-SIG");
  assert.equal(tampered.json.plaintext, null);
  assert.equal(tampered.raw.includes(plaintext), false);

  const after = await peerFetch(`${left.loop}/health`, { tlsPin: left.pin });
  assert.equal(after.json.track2.local_socket_verified, true);
  assert.equal(after.json.track2.in_process, false);
  assert.equal(after.json.track2.radio_phy, false);
  assert.equal(after.json.track2.second_device, false);

  console.log(JSON.stringify({
    ok: true,
    interface: lan.kind,
    address: lan.address,
    bytes: delivered.bytes,
    plaintext_sha256: delivered.plaintext_sha256,
    ciphertext_sha256: delivered.ciphertext_sha256,
    bearer_mode: delivered.bearer_mode,
    tls: true,
    plaintext_returned: false,
    same_machine: true,
    second_device: false,
    radio_phy: false,
    public_deployment: false,
    pids: [left.child.pid, right.child.pid],
  }));
} finally {
  for (const node of nodes) node.child.kill();
  await rm(work, { recursive: true, force: true });
}
