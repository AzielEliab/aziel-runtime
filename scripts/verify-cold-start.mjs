/**
 * COLD-START-1.0. Offline first hop, then a sealed share.
 * Refusals stay in-process. Loopback delivery stays same-machine.
 * When sudo and ip are present, two network namespaces on a veth exchange
 * one share. That pair is one kernel and one machine id, so second_device
 * stays false. No public mesh GET. No production POST. No AUTO_UPDATE.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { watchQualifies } from "../src/alt-internet-fact.js";
import { versionBody } from "../src/auto-update/version.js";
import { D2D_STATUS, d2dCarrierCite } from "../src/d2d-carriers.js";
import { classifyStartingAddress, createColdStart, deliveryWatch } from "../src/fed-mesh/cold-start.js";
import { createIdentity } from "../src/fed-mesh/identity.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import { createTrack2 } from "../src/fed-mesh/track2.js";
import { PAID_SATELLITE_HELD, TRAFFIC_PATHS } from "../src/qnm-honesty.js";
import { readMachineId } from "../qnm-node/bearers/radio.js";
import { sha256Hex } from "../src/session-core.js";

const exec = promisify(execFile);
const repo = fileURLToPath(new URL("..", import.meta.url));
const peerScript = fileURLToPath(new URL("../qnm-node/cold-peer.mjs", import.meta.url));
const ip = existsSync("/usr/sbin/ip") ? "/usr/sbin/ip" : existsSync("/sbin/ip") ? "/sbin/ip" : "";
let checks = 0;

function check(cond, message) {
  assert.equal(cond, true, message);
  checks += 1;
}

const cite = d2dCarrierCite();
check(cite.phases.E === "scaffold", "public phase E stays scaffold");
check(cite.needs_starting_address === true, "public cite still needs a starting address");
check(cite.second_device === false, "public cite second_device stays false");
check(cite.worker_door === "FG-STUB", "public door stays FG-STUB");
check(D2D_STATUS === "NOT-READY", "public D2D status stays NOT-READY");
check(cite.live_multi_provider === false, "live_multi_provider stays false");
for (const id of ["lan", "wifi", "bluetooth", "rf", "photon"]) {
  check(TRAFFIC_PATHS.paths[id].enabled === true, `${id} switch on`);
  check(TRAFFIC_PATHS.paths[id].live === false, `${id} live stays false`);
  check(TRAFFIC_PATHS.paths[id].packet_live === false, `${id} packet_live stays false`);
}
check(TRAFFIC_PATHS.paths.satellite_relay.enabled === false, "satellite relay stays disabled");
check(TRAFFIC_PATHS.paths.xm_sdars.enabled === false, "XM SDARS stays disabled");
check(PAID_SATELLITE_HELD.held === true && PAID_SATELLITE_HELD.spend === false && PAID_SATELLITE_HELD.live === false, "paid satellite held");
const version = await versionBody({}, {}, "2.0.0-rc1");
check(version.live === false && version.auto_update.enabled === false, "updater stays off");
check(version.manifest_hash === null, "no invented release manifest");

const hostId = readMachineId();
check(typeof hostId === "string" && /^[a-f0-9]{32}$/.test(hostId), "this host has a machine id");

const differ = deliveryWatch({
  machineId: "a".repeat(32),
  peerMachineId: "b".repeat(32),
  loopback: false,
  arrived: true,
});
check(differ.second_device === true && differ.same_machine === false, "different ids qualify only as a watch");
check(watchQualifies({ ...differ.watch, same_machine_id: true }) === false, "a posted same-id flag cannot qualify matching logic in reverse");
const sameIds = deliveryWatch({
  machineId: hostId,
  peerMachineId: hostId,
  loopback: false,
  arrived: true,
});
check(sameIds.second_device === false && sameIds.same_machine === true, "this machine id does not qualify as a second device");
const loopLie = deliveryWatch({
  machineId: "a".repeat(32),
  peerMachineId: "b".repeat(32),
  loopback: true,
  arrived: true,
});
check(loopLie.second_device === false, "loopback does not qualify");

let fetches = 0;
const coldNode = createTrack2({ identity: await createIdentity(), fixture: true, tipHash: "ab".repeat(32) });
await coldNode.arm(["lan"]);
const cold = createColdStart(coldNode, {
  machineId: hostId,
  fetchImpl() {
    fetches += 1;
    throw new Error("fetch");
  },
});
const empty = await cold.dial();
check(empty.ok === false && empty.code === "COLD-START-NEEDS-ADDRESS" && empty.needs_starting_address === true, "empty cold start");
check(fetches === 0 && empty.fetches === 0, "empty cold start does not dial");
for (const [url, code] of [
  ["http://10.1.2.3/poison", "FED-MESH-POISON"],
  ["https://aziel-runtime.vibelock.workers.dev/v1/mesh", "COLD-START-HTTP-ONLY"],
  ["http://peer.local:9/v1/fed-mesh/discover", "COLD-START-NOT-LOCAL"],
  ["http://example.com:9/v1/fed-mesh/discover", "COLD-START-NOT-LOCAL"],
  ["stun:10.1.2.3:3478", "FED-MESH-NAT-REFUSE"],
  ["https://10.1.2.3:9/v1/fed-mesh/discover", "COLD-START-HTTP-ONLY"],
  ["http://10.1.2.3:9/v1/fed-mesh/discover?stun=1", "FED-MESH-NAT-REFUSE"],
  ["http://10.1.2.3/v1/fed-mesh/discover", "FED-MESH-BAD-INPUT"],
  ["http://8.8.8.8:9/v1/fed-mesh/discover", "COLD-START-NOT-LOCAL"],
]) {
  const refused = classifyStartingAddress(url);
  check(refused.ok === false && refused.code === code && refused.fetched === false, `${url} -> ${code} (got ${refused.code})`);
  check(fetches === 0, "refusal did not fetch");
}
const stored = await cold.supply("http://10.1.2.3:9/v1/fed-mesh/discover");
check(stored.ok === true && stored.needs_starting_address === true && stored.lan === true && fetches === 0, "supply stores a LAN address and does not dial");

const root = await mkdtemp(join(tmpdir(), "cold-loop-"));
const left = await startInstance({ dataDir: join(root, "left"), fixture: true, port: 0, host: "127.0.0.1" });
const right = await startInstance({ dataDir: join(root, "right"), fixture: true, port: 0, host: "127.0.0.1" });
const seen = [];
try {
  check((await left.track2.arm(["lan"])).ok === true, "left arms lan");
  check((await right.track2.arm(["lan"])).ok === true, "right arms lan");
  const loop = createColdStart(left.track2, {
    machineId: hostId,
    fetchImpl(url, init) {
      const parsed = new URL(url);
      assert.equal(parsed.hostname, "127.0.0.1");
      seen.push(`${init && init.method} ${parsed.pathname}`);
      return fetch(url, init);
    },
  });
  const before = await loop.dial();
  check(before.code === "COLD-START-NEEDS-ADDRESS" && seen.length === 0, "loopback node still needs an address");
  const gave = await loop.supply(`${right.base}/v1/fed-mesh/discover`);
  check(gave.ok === true && gave.loopback === true && seen.length === 0, "loopback supply does not dial");
  const dialed = await loop.dial();
  check(dialed.ok === true && dialed.mutual === true, `loopback dial ${dialed.code}`);
  check(dialed.needs_starting_address === false && dialed.starting_address_accepted === true, "local cold record accepted the address");
  check(dialed.signed_list_needs_starting_address === true && dialed.signed_list_live === false && dialed.signed_peers === 1, "signed list stays a scaffold");
  check(dialed.live === false && dialed.public_door === "FG-STUB" && dialed.updater === "OFF", "dial does not open the public door");
  const boot = await (await fetch(`${left.base}/v1/fed-mesh/bootstrap`)).json();
  check(boot.needs_starting_address === true && boot.live === false && boot.list.peers.length === 0, "GET bootstrap stays empty");
  check(right.track2.allowSession(left.handle).ok === true, "responder allows the initiator");
  const share = "cold-start loopback share";
  const sent = await loop.deliver({ plaintext: share, peerMachineId: hostId });
  check(sent.ok === true && sent.loopback === true && sent.bearer_mode === "loopback", `loopback deliver ${sent.code} ${sent.bearer_mode}`);
  check(sent.second_device === false && sent.same_machine === true && sent.physical_devices === 1, "loopback is not a second device");
  check(sent.plaintext_sha256 === (await sha256Hex(share)) && sent.plaintext_on_wire === false, "loopback share hash");
  check(sent.plaintext_returned === false, "peer HTTP response is a hash receipt");
  check(sent.peer_exchange_wifi === false && sent.peer_exchange_rf === false && sent.peer_exchange_photon === false, "other carriers were not this share");
  check(seen.every((row) => row.startsWith("POST /v1/fed-mesh/")), "loopback dialed only fed-mesh paths");
  check(left.auto_update.enabled === false && left.auto_update.code === "UPDATE-OFF" && left.auto_update.live === false, "node updater stayed off");
} finally {
  await left.stop();
  await right.stop();
  await rm(root, { recursive: true, force: true });
}

async function sudoIp(args) {
  await exec("sudo", ["-n", ip, ...args], { timeout: 15000 });
}

let cross = null;
if (ip && hostId) {
  let sudoOk = false;
  try {
    await exec("sudo", ["-n", "true"], { timeout: 5000 });
    sudoOk = true;
  } catch {
    sudoOk = false;
  }
  if (sudoOk) {
    const tag = String(process.pid);
    const nsA = `csa${tag}`;
    const nsB = `csb${tag}`;
    const ifA = `va${tag}`.slice(0, 15);
    const ifB = `vb${tag}`.slice(0, 15);
    const user = (await exec("id", ["-un"])).stdout.trim();
    const work = await mkdtemp(join(tmpdir(), "cold-veth-"));
    const dirA = join(work, "a");
    const dirB = join(work, "b");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dirA);
    await mkdir(dirB);
    const logs = { a: "", b: "" };
    const children = [];
    const cleanup = async () => {
      for (const child of children) {
        try {
          child.kill("SIGTERM");
        } catch {
          /* already gone */
        }
      }
      for (const args of [
        ["netns", "exec", nsA, ip, "link", "del", ifA],
        ["netns", "del", nsA],
        ["netns", "del", nsB],
        ["link", "del", ifA],
        ["link", "del", ifB],
      ]) {
        try {
          await sudoIp(args);
        } catch {
          /* already gone */
        }
      }
      await rm(work, { recursive: true, force: true });
    };
    try {
      await sudoIp(["netns", "add", nsA]);
      await sudoIp(["netns", "add", nsB]);
      await sudoIp(["link", "add", ifA, "type", "veth", "peer", "name", ifB]);
      await sudoIp(["link", "set", ifA, "netns", nsA]);
      await sudoIp(["link", "set", ifB, "netns", nsB]);
      await sudoIp(["netns", "exec", nsA, ip, "addr", "add", "10.88.2.1/24", "dev", ifA]);
      await sudoIp(["netns", "exec", nsB, ip, "addr", "add", "10.88.2.2/24", "dev", ifB]);
      await sudoIp(["netns", "exec", nsA, ip, "link", "set", ifA, "up"]);
      await sudoIp(["netns", "exec", nsB, ip, "link", "set", ifB, "up"]);
      await sudoIp(["netns", "exec", nsA, ip, "link", "set", "lo", "up"]);
      await sudoIp(["netns", "exec", nsB, ip, "link", "set", "lo", "up"]);
      const stateA = (await exec("sudo", ["-n", ip, "netns", "exec", nsA, "cat", `/sys/class/net/${ifA}/operstate`])).stdout.trim();
      const stateB = (await exec("sudo", ["-n", ip, "netns", "exec", nsB, "cat", `/sys/class/net/${ifB}/operstate`])).stdout.trim();
      check(stateA === "up" && stateB === "up", `veth operstate ${stateA}/${stateB}`);

      function spawnPeer(ns, dir, host, port) {
        const child = spawn(
          "sudo",
          ["-n", ip, "netns", "exec", ns, "runuser", "-u", user, "--", process.execPath, peerScript, "--data", join(dir, "data"), "--host", host, "--port", String(port), "--dir", dir],
          {
            cwd: repo,
            env: { PATH: "/usr/sbin:/usr/bin:/bin", HOME: process.env.HOME || "/tmp", LANG: "C" },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        const key = ns === nsA ? "a" : "b";
        child.stdout.on("data", (chunk) => {
          logs[key] += chunk;
        });
        child.stderr.on("data", (chunk) => {
          logs[key] += chunk;
        });
        children.push(child);
        return child;
      }

      spawnPeer(nsA, dirA, "10.88.2.1", 18781);
      spawnPeer(nsB, dirB, "10.88.2.2", 18782);

      async function ready(dir, label) {
        const start = Date.now();
        while (Date.now() - start < 20000) {
          try {
            return JSON.parse(await readFile(join(dir, "ready.json"), "utf8"));
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 40));
          }
        }
        throw new Error(`${label} did not become ready\n${logs.a}\n${logs.b}`);
      }

      async function ask(dir, command) {
        const outbox = join(dir, "outbox.json");
        await rm(outbox, { force: true });
        await writeFile(join(dir, "inbox.json"), JSON.stringify(command));
        const start = Date.now();
        while (Date.now() - start < 20000) {
          try {
            const body = JSON.parse(await readFile(outbox, "utf8"));
            await rm(outbox, { force: true });
            return body;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 40));
          }
        }
        throw new Error(`${command.op} timed out\n${logs.a}\n${logs.b}`);
      }

      const readyA = await ready(dirA, "nsA");
      const readyB = await ready(dirB, "nsB");
      check(readyA.ready === true && readyA.armed === true, `nsA arm ${readyA.arm_code}`);
      check(readyB.ready === true && readyB.armed === true, `nsB arm ${readyB.arm_code}`);
      check(readyA.machine_id === hostId && readyB.machine_id === hostId, "both namespaces read this machine id");
      check(readyA.direct_mode === "direct-lan" && readyB.direct_mode === "direct-lan", "advertised URL is direct-lan");
      check(readyA.auto_update.enabled === false && readyA.auto_update.live === false && readyB.auto_update.code === "UPDATE-OFF", "namespace nodes left the updater off");
      const denied = await ask(dirA, { op: "dial-empty" });
      check(denied.code === "COLD-START-NEEDS-ADDRESS" && denied.fetches === 0, "namespace cold start does not dial");
      const bad = await ask(dirA, { op: "supply", url: "https://example.com:9/v1/fed-mesh/discover" });
      check(bad.code === "COLD-START-HTTP-ONLY" && bad.fetched === false, "namespace node refuses a public URL");
      const supplied = await ask(dirA, { op: "supply", url: "http://10.88.2.2:18782/v1/fed-mesh/discover" });
      check(supplied.ok === true && supplied.lan === true && supplied.fetches === 0, "namespace supply does not dial");
      const allowed = await ask(dirB, { op: "allow", handle: readyA.handle });
      check(allowed.ok === true, "nsB allows nsA");
      const dialed = await ask(dirA, { op: "dial" });
      check(dialed.ok === true && dialed.mutual === true && dialed.loopback === false && dialed.mode === "direct-lan", `veth dial ${dialed.code} ${dialed.message}`);
      check(dialed.needs_starting_address === false && dialed.signed_list_needs_starting_address === true && dialed.signed_list_live === false, "veth cold record versus signed list");
      check(dialed.public_door === "FG-STUB" && dialed.live_multi_provider === false && dialed.paid_satellite_spend === false, "veth dial stays off the public door");
      const share = "cold-start veth share";
      const sent = await ask(dirA, { op: "deliver", plaintext: share, peer_machine_id: readyB.machine_id });
      check(sent.ok === true, `veth deliver ${sent.code} ${sent.message}`);
      check(sent.origin === "http://10.88.2.2:18782" && sent.bearer_mode === "direct-lan" && sent.loopback === false, "share crossed the veth");
      check(sent.second_device === false && sent.same_machine === true && sent.machine_id === hostId && sent.peer_machine_id === hostId, "one machine id keeps second_device false");
      check(sent.physical_devices === 1 && sent.public_deployment === false && sent.radio_phy === false, "not a second device and not a deployment");
      check(sent.plaintext_sha256 === (await sha256Hex(share)) && sent.plaintext_on_wire === false, "veth plaintext stayed off the envelope");
      check(sent.ciphertext_sha256 && sent.ciphertext_sha256 !== sent.plaintext_sha256, "ciphertext hash is a different value");
      check(sent.peer_exchange_bluetooth === false && sent.peer_exchange_photon === false, "radio carriers were not this share");
      const listed = await ask(dirA, { op: "bootstrap" });
      check(listed.needs_starting_address === true && listed.live === false && listed.peers.length === 0, "GET-equivalent empty list stays honest");
      await ask(dirA, { op: "stop" });
      await ask(dirB, { op: "stop" });
      cross = {
        ok: true,
        network_namespaces: 2,
        cross_link: true,
        beyond_localhost: true,
        bearer_mode: sent.bearer_mode,
        origin: sent.origin,
        same_machine: true,
        second_device: false,
        physical_devices: 1,
        machine_id: hostId,
        plaintext_sha256: sent.plaintext_sha256,
        ciphertext_sha256: sent.ciphertext_sha256,
        plaintext_on_wire: false,
        public_deployment: false,
        public_door: "FG-STUB",
        updater: "OFF",
        paid_satellite: "HELD",
      };
    } finally {
      await cleanup();
    }
  }
}

check(cross && cross.ok === true && cross.second_device === false && cross.cross_link === true, "two-namespace LAN share");
console.log(JSON.stringify({ cold_start: cross, checks }));
console.log(`ok cold-start: ${checks} checks`);
