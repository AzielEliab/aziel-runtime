/** AUTO-UPDATE-1.0 adoption: real reach probe, wired hooks, shared Softwares updater, JS/Python parity.
 * Default off, live:false. Test keys only inside this file. The pinned release key is the one already in the repo. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { ACCEPTED_CHANNELS, RELEASE_KEY_FINGERPRINT, RELEASE_PUBLIC_KEY, UPDATE_CODES as C, verifyManifest } from "../src/auto-update/manifest.js";
import { initialState, pause, resume } from "../src/auto-update/updater.js";
import { onInternetReach, onPeerContact, onNetworkEvent } from "../src/auto-update/triggers.js";
import { probeInternetReach, REACH_PROBE_URL } from "../src/auto-update/reach.js";
import { fetchStableRelease, RELEASE_MANIFEST_NAME } from "../src/auto-update/release-fetch.js";
import { softwaresCheckOnline, softwaresPause } from "../src/auto-update/softwares.js";
import { ADOPTION_GAPS, AUTO_UPDATE_ENABLED_DEFAULT, AUTO_UPDATE_LIVE, adoptSoftwares, notifyCarrierContact, notifyPeerContact } from "../src/auto-update/adopt.js";
import { attachInternetReconnect } from "../src/auto-update/reconnect.js";
import { createNodeUpdateHost } from "../src/auto-update/node-host.js";
import { catalogAutoUpdateReport } from "../src/software-catalog.js";
import { openPeerSession } from "../src/fed-mesh/track2.js";
import { cap7Honesty, QNM_MEMBERSHIP, QNM_NAMED_LIVE } from "../src/qnm-honesty.js";

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const b64u = (b) => Buffer.from(b).toString("base64url");
const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));

async function release(product, seq, channel = "stable") {
  const body = product + "-" + seq;
  const bytes = new TextEncoder().encode(body);
  const manifest = {
    spec: "AZ-UPDATE-MANIFEST-1.0", product, version: "2.0." + seq, version_seq: seq, git_sha: "e".repeat(40), channel,
    artifact: { name: product + ".pkg", size: bytes.length, sha256: await sha256Hex(bytes) }, issued_at: "t", prev_manifest_hash: null,
  };
  const signature = b64u(await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, new TextEncoder().encode(canonicalize(manifest))));
  return { manifest, signature, bytes: body };
}
function host(product, { reach, enabled = true } = {}) {
  let state = initialState(product, 1);
  let t = 0;
  let fetches = 0;
  const h = {
    enabled, nodeId: "node-A", rows: [], rel: null, active: "a", prev: null, staged: null, fetches: () => fetches,
    now: () => "2026-10-22T12:00:" + String(t++).padStart(2, "0") + "Z",
    load: async () => structuredClone(state), save: async (s) => { state = structuredClone(s); },
    fetchRelease: async () => { fetches += 1; return h.rel && { manifest: h.rel.manifest, signature: h.rel.signature }; },
    fetchArtifact: async () => new TextEncoder().encode(h.rel.bytes),
    stage: async (b) => { h.staged = b; }, swap: async () => { h.prev = h.active; h.active = h.staged; },
    healthCheck: async () => true, rollback: async () => { h.active = h.prev; },
    writeReceipt: async (r) => { h.rows.push(r); }, get state() { return state; },
  };
  if (reach !== undefined) h.internetReachable = async () => reach;
  return h;
}
const o = { publicKey: pub };

ok(AUTO_UPDATE_LIVE === false && AUTO_UPDATE_ENABLED_DEFAULT === false, "auto-update default off and not live");
ok(JSON.parse(readFileSync("package.json", "utf8")).version === "2.0.0-rc1", "version lock");
ok(ACCEPTED_CHANNELS.length === 1 && ACCEPTED_CHANNELS[0] === "stable", "one channel list");
ok(!readFileSync("src/auto-update/manifest.js", "utf8").includes("UPDATE_CHANNEL"), "no second channel constant");
ok(!readFileSync("src/auto-update/triggers.js", "utf8").includes("UPDATE_CHANNEL"), "triggers reuse verifyManifest");
const rawKey = Buffer.from(RELEASE_PUBLIC_KEY, "base64url");
ok(rawKey.length === 32 && await sha256Hex(rawKey) === RELEASE_KEY_FINGERPRINT, "pinned key is the existing release key");
ok(RELEASE_PUBLIC_KEY === "_3mc9CfQWexUWcyqDadNoQLjb6fFFPRv_XfWirwuH9s", "slot is the key already in the repo");
const shaped = (await release("aziel-runtime", 2)).manifest;
ok((await verifyManifest(shaped, "aa", { product: "aziel-runtime", installed_seq: 1, floor_seq: 1 }, { publicKey: null })).code === C.noKey, "null key refuses");
ok((await verifyManifest(shaped, "aa", { product: "aziel-runtime", installed_seq: 1, floor_seq: 1 }, { publicKey: "" })).code === C.noKey, "empty key refuses");

const cap = cap7Honesty();
ok(QNM_NAMED_LIVE.mesh_node_live === true && QNM_NAMED_LIVE.alt_internet_live === true && QNM_NAMED_LIVE.packet_path_live === true, "QNM trio stays on");
ok(QNM_MEMBERSHIP.get_never_enables === true, "GET never enables");
ok(cap.cap7_name_only === true && cap.public_icann === false && cap.paid_registrar === false && cap.dns_publish === false && cap.cap7_public_egress === false && cap.cap7_registrar_live === false, "Cap-7 locks stay");

const gi = readFileSync(".gitignore", "utf8");
ok(gi.includes("__pycache__/") && gi.includes("*.pyc"), "pyc ignored");
ok(execFileSync("git", ["ls-files", "*.pyc", "*__pycache__*"]).toString().trim() === "", "no committed pyc");

let saw = null;
const hit = await probeInternetReach({ fetchImpl: async (url, init) => { saw = { url, method: init.method }; return { status: 204 }; }, timeoutMs: 500 });
ok(hit.reachable === true && hit.live === false && saw.method === "HEAD" && saw.url === REACH_PROBE_URL, "probe is a real HEAD");
ok((await probeInternetReach({ fetchImpl: async () => { throw new Error("offline"); } })).code === "UPDATE-INTERNET-UNREACHABLE", "probe failure is unreachable");
ok((await probeInternetReach({ fetchImpl: null })).code === "UPDATE-NO-REACH-PROBE", "missing fetch refuses");
const liveProbe = await probeInternetReach({ timeoutMs: 1500 });
ok(typeof liveProbe.reachable === "boolean" && liveProbe.live === false, "live probe returns a boolean");

const pre = await fetchStableRelease({
  fetchImpl: async (url) => {
    if (String(url).includes("/releases/latest")) return { ok: true, json: async () => ({ prerelease: true, draft: false, assets: [{ name: RELEASE_MANIFEST_NAME, browser_download_url: "https://example.test/m" }] }) };
    throw new Error("test build must not be downloaded");
  },
});
ok(pre === null, "prerelease is not offered");
const rcOffer = await fetchStableRelease({
  fetchImpl: async (url) => {
    if (String(url).includes("/releases/latest")) return { ok: true, json: async () => ({ prerelease: false, draft: false, assets: [{ name: RELEASE_MANIFEST_NAME, browser_download_url: "https://example.test/m" }] }) };
    return { ok: true, json: async () => ({ manifest: { channel: "rc" }, signature: "aa" }) };
  },
});
ok(rcOffer === null, "non-stable channel is not offered");

const noKey = host("aziel-runtime", { reach: true, enabled: true });
noKey.rel = await release("aziel-runtime", 2);
ok((await onInternetReach(noKey, { publicKey: null })).code === C.noKey && noKey.fetches() === 0 && noKey.rows.length === 0, "empty key does not fetch");
const offFlag = host("azos", { reach: true, enabled: false });
offFlag.rel = await release("azos", 2);
ok((await onInternetReach(offFlag, o)).code === C.off && offFlag.fetches() === 0 && offFlag.state.installed_seq === 1, "disabled does not fetch");

const offline = host("azos", { reach: false });
offline.rel = await release("azos", 2);
ok((await onInternetReach(offline, o)).code === "UPDATE-INTERNET-UNREACHABLE" && offline.fetches() === 0 && offline.rows.length === 0, "offline no fetch");
const noProbe = host("azos", { enabled: true });
noProbe.probe = { fetchImpl: null };
ok((await onInternetReach(noProbe, o)).code === "UPDATE-NO-REACH-PROBE" && noProbe.fetches() === 0, "no fetch implementation refuses");

const up = host("azos", { reach: true });
up.rel = await release("azos", 2, "rc");
ok((await onInternetReach(up, o)).code === C.channel && up.state.installed_seq === 1, "rc channel refused");
up.rel = await release("azos", 2);
const applied = await onInternetReach(up, o);
ok(applied.code === C.ok && applied.trigger === "internet" && applied.live === false && up.state.installed_seq === 2, "reachable stable applies");
ok((await onNetworkEvent(up, "bogus", o)).code === "UPDATE-EVENT-UNKNOWN", "unknown event refused");
await pause(up);
ok((await onInternetReach(up, o)).code === C.paused && up.state.installed_seq === 2, "pause blocks apply");
await resume(up);

const sick = host("aziel-runtime", { reach: true });
sick.healthCheck = async () => false;
sick.rel = await release("aziel-runtime", 4);
const rolled = await onInternetReach(sick, o);
ok(rolled.code === C.health && rolled.row.outcome === "rolled_back" && sick.state.installed_seq === 1 && sick.state.floor_seq === 1, "rollback on failed health, floor unchanged");
sick.healthCheck = async () => true;
sick.rel = await release("aziel-runtime", 4);
ok((await onInternetReach(sick, o)).code === C.ok && sick.state.installed_seq === 4, "health pass applies");
sick.rel = await release("aziel-runtime", 3);
ok((await onInternetReach(sick, o)).code === C.downgrade && sick.state.installed_seq === 4, "never downgrade");

const lonely = host("aziel-runtime");
lonely.carrierPresent = async () => false;
lonely.offline = true;
const peer = await onPeerContact(lonely, o);
ok(peer.code === C.carrier && peer.trigger === "mesh" && peer.live === false, "absent carrier refuses");
const peerOff = host("aziel-runtime", { enabled: false });
peerOff.carrierPresent = async () => { throw new Error("disabled must not scan carriers"); };
ok((await onPeerContact(peerOff, o)).code === C.off, "disabled peer does not scan");
ok((await notifyPeerContact({ armed: new Set(["lan"]) })).code === "UPDATE-OFF", "peer hook default off");
ok((await notifyCarrierContact({}, "lan")).code === "UPDATE-OFF", "carrier hook default off");

const track2 = readFileSync("src/fed-mesh/track2.js", "utf8");
ok(track2.includes("await notifyPeerContact(state)"), "peer session calls onPeerContact hook");
ok(track2.includes("await notifyCarrierContact(state, carrier)"), "carrier ingest calls onPeerContact hook");
const inst = readFileSync("src/fed-mesh/instance.js", "utf8");
ok(inst.includes("adoptNodeInstall") && inst.includes("adoptSoftwares"), "node install calls the updater");
ok(readFileSync("src/engines/azos/ops.js", "utf8").includes('adoptProduct("azos")'), "azos engine hook");
ok(readFileSync("src/engines/azinterface/ops.js", "utf8").includes('adoptProduct("azinterface")'), "azinterface engine hook");
ok(readFileSync("src/software-catalog.js", "utf8").includes("softwaresDecision"), "softwares catalog hook");
ok(readFileSync("src/index.js", "utf8").includes("adoptSoftwares"), "software route calls shared updater");
ok(readFileSync("src/mesh.js", "utf8").includes("enabled: false"), "install GET stays disabled");
ok(ADOPTION_GAPS.map((g) => g.leg).join() === "azos,azinterface", "external legs listed as gaps");
ok(ADOPTION_GAPS.every((g) => g.repo && g.gap && !/wired in that repo/i.test(g.gap)), "gaps stay honest");

const { installPlan } = await import("../src/mesh-onboard.js");
const plan = installPlan({ origin: "https://aziel-runtime.example", slug: "aziel-runtime", version: "1.0.0", products: [{ slug: "aziel-runtime" }] });
ok(plan.ok === true && plan.auto_update.enabled === false && plan.auto_update.live === false && plan.auto_update.code === "UPDATE-OFF", "install stamp off");
ok(plan.live === false && plan.mesh_node_live === true && plan.alt_internet_live === true && plan.packet_path_live === true, "install QNM flags unchanged");
ok(plan.auto_update.softwares.count === 1 && plan.auto_update.softwares.enabled === false && plan.auto_update.softwares.live === false, "install softwares updater off");
const { softwareCatalog } = await import("../src/software-catalog.js");
const catalog = softwareCatalog("https://aziel-runtime.example", []);
ok(catalog.count === catalog.software.length && catalog.count > 0, "catalog adoption guard holds the count");
ok(!("auto_update_report" in catalog), "matching catalog decision adds no report");
ok(catalogAutoUpdateReport([{ slug: "a" }], { count: 1, enabled: false, live: false, code: "UPDATE-OFF" }) === null, "matching decision is silent");
const mismatch = catalogAutoUpdateReport([{ slug: "a" }, { slug: "b" }], { count: 1, enabled: false, live: false, code: "UPDATE-OFF" });
ok(mismatch && mismatch.live === false && mismatch.decision_count === 1 && mismatch.catalog_count === 2, "catalog mismatch is reported");

const { startInstance } = await import("../src/fed-mesh/instance.js");
const nodeDir = mkdtempSync(join(tmpdir(), "au-node-"));
const node = await startInstance({ dataDir: nodeDir, port: 0, product: "aziel-runtime" });
ok(node.auto_update.enabled === false && node.auto_update.live === false && node.auto_update.code === "UPDATE-OFF", "running node calls updater off");
ok(!existsSync(join(nodeDir, "auto-update-state.json")), "disabled node does not write update state");
await node.stop();

let reaches = 0;
let ping = null;
const watch = attachInternetReconnect({ enabled: true }, {
  debounceMs: 40,
  onReach: async () => { reaches += 1; },
  watchImpl(fire) { ping = fire; return { close() { ping = null; } }; },
});
ok(watch.ok === true && watch.code === "UPDATE-RECONNECT-WATCH" && watch.live === false, "reconnect watch");
ping();
ping();
await new Promise((resolve) => setTimeout(resolve, 90));
ok(reaches === 1, "reconnect is debounced");
watch.stop();
if (ping) ping();
await new Promise((resolve) => setTimeout(resolve, 60));
ok(reaches === 1, "stopped reconnect does not fire");
const noWatch = attachInternetReconnect({ enabled: true }, { paths: ["/no/such/reconnect-watch"] });
ok(noWatch.ok === false && noWatch.code === "UPDATE-NO-RECONNECT-WATCH" && noWatch.live === false, "missing watch is a refusal");
noWatch.stop();

const hostDir = mkdtempSync(join(tmpdir(), "au-host-"));
const bare = await createNodeUpdateHost({ dataDir: hostDir, product: "aziel-runtime", nodeId: "n" });
ok(typeof bare.loadAll === "function" && typeof bare.saveAll === "function" && typeof bare.fetchRelease === "function" && typeof bare.fetchArtifact === "function", "node host store and slug fetch");
bare.fetchImpl = async () => { throw new Error("no release"); };
const softBare = await adoptSoftwares(["aziel-runtime"], bare);
ok(softBare.enabled === true && softBare.live === false && softBare.results["aziel-runtime"] && softBare.results["aziel-runtime"] !== "UPDATE-OFF", "node host softwares returns a real code");

const prevUpdate = process.env.AUTO_UPDATE;
process.env.AUTO_UPDATE = "on";
const onDir = mkdtempSync(join(tmpdir(), "au-on-"));
let onNode = null;
let peerA = null;
let peerB = null;
try {
  onNode = await startInstance({ dataDir: onDir, port: 0, product: "aziel-runtime" });
  ok(onNode.auto_update.enabled === true && onNode.auto_update.live === false, "AUTO_UPDATE=on stays enabled");
  ok(typeof onNode.auto_update.code === "string" && onNode.auto_update.code.startsWith("UPDATE-") && onNode.auto_update.code !== "UPDATE-OFF", "boot code " + onNode.auto_update.code);
  ok(onNode.auto_update.applied !== true, "boot does not apply");
  ok(onNode.auto_update.reconnect && onNode.auto_update.reconnect.live === false && (onNode.auto_update.reconnect.code === "UPDATE-RECONNECT-WATCH" || onNode.auto_update.reconnect.code === "UPDATE-NO-RECONNECT-WATCH"), "reconnect reported");
  const lonely = await notifyPeerContact(onNode.track2.state);
  ok(lonely.enabled === true && lonely.live === false && lonely.code === "UPDATE-CARRIER-ABSENT", "no carrier refuses");
  await onNode.stop();
  onNode = null;

  peerA = await startInstance({ dataDir: mkdtempSync(join(tmpdir(), "au-a-")), port: 0, host: "127.0.0.1", advertise: "127.0.0.1", fixture: true, product: "aziel-runtime" });
  peerB = await startInstance({ dataDir: mkdtempSync(join(tmpdir(), "au-b-")), port: 0, host: "127.0.0.1", advertise: "127.0.0.1", fixture: true, product: "aziel-runtime" });
  ok(!!peerA.directUrl && !!peerB.directUrl, "loopback direct urls");
  ok((await peerA.track2.arm("lan", "operator")).ok === true && (await peerB.track2.arm("lan", "operator")).ok === true, "lan armed by the operator");
  peerA.track2.allowSession(peerB.handle);
  peerB.track2.allowSession(peerA.handle);
  const exchanged = await peerA.track2.exchange(peerB.track2);
  ok(exchanged.ok === true, "beacon exchange");
  const aHost = peerA.track2.state.autoUpdateHost;
  const bHost = peerB.track2.state.autoUpdateHost;
  ok((await aHost.carrierPresent("wifi")) === false && (await aHost.carrierPresent("bluetooth")) === false && (await aHost.carrierPresent("rf")) === false && (await aHost.carrierPresent("photon")) === false, "radio carriers stay absent");
  const noSession = await onPeerContact(aHost);
  ok(noSession.ok === false && noSession.enabled === true && noSession.code === "UPDATE-PEER-NO-ROUTE", "peer without a session is no route");
  const opened = await openPeerSession(peerA.track2, peerB.track2);
  ok(opened.ok === true, "track2 session open");
  const same = await onPeerContact(aHost);
  ok(same.enabled === true && same.applied === false && same.carrier === "lan" && same.code === "UPDATE-PEER-NOT-NEWER", "hello over the session is not an apply");

  const rel = await release("aziel-runtime", 2);
  bHost.publicKey = pub;
  bHost.healthCheck = async () => true;
  bHost.internetReachable = async () => true;
  bHost.fetchImpl = async (url) => {
    const u = String(url);
    if (u.includes("/releases/latest")) return { ok: true, json: async () => ({ prerelease: false, draft: false, assets: [{ name: RELEASE_MANIFEST_NAME, browser_download_url: "https://example.test/manifest" }] }) };
    if (u.includes("/manifest")) return { ok: true, json: async () => ({ manifest: rel.manifest, signature: rel.signature, url: "https://example.test/artifact" }) };
    if (u.includes("/artifact")) return { ok: true, arrayBuffer: async () => new TextEncoder().encode(rel.bytes).buffer };
    throw new Error(u);
  };
  const seeded = await onInternetReach(bHost);
  ok(seeded.code === C.ok && bHost._servedBytes instanceof Uint8Array, "peer stores a verified build");
  const forged = await onPeerContact(aHost);
  ok(forged.code === C.sig && forged.applied !== true && forged.row && forged.row.lattice && forged.row.lattice.primary, "pinned key checks the peer signature");
  aHost.publicKey = pub;
  bHost._servedBytes = new TextEncoder().encode("tampered");
  const hashed = await onPeerContact(aHost);
  ok(hashed.code === C.hash && hashed.applied !== true, "peer hash is checked");
  bHost._servedBytes = new TextEncoder().encode(rel.bytes);
  const rolledPeer = await onPeerContact(aHost);
  ok(rolledPeer.code === C.health && rolledPeer.row && rolledPeer.row.outcome === "rolled_back" && rolledPeer.row.source === "mesh:lan", "verified peer bytes roll back");
  const aState = await aHost.load();
  ok(aState.installed_seq === 0 && aState.floor_seq === 0, "peer rollback does not raise the floor");
} finally {
  if (prevUpdate === undefined) delete process.env.AUTO_UPDATE;
  else process.env.AUTO_UPDATE = prevUpdate;
  if (onNode) await onNode.stop();
  if (peerA) await peerA.stop();
  if (peerB) await peerB.stop();
  rmSync(hostDir, { recursive: true, force: true });
}

const { runAzos } = await import("../src/engines/azos/ops.js");
const { runAzinterface } = await import("../src/engines/azinterface/ops.js");
const azosHealth = await runAzos("health", {}, null, {});
ok(azosHealth && !("auto_update" in azosHealth), "azos health does not claim auto-update");
const aziHealth = await runAzinterface("health", {}, null, {});
ok(aziHealth && aziHealth.live === true && !("auto_update" in aziHealth), "azinterface health live flag unchanged");

const slugs = ["chainlock", "peacelock", "veillock"];
let store = null;
const srows = [];
const active = {};
const rels = { chainlock: await release("chainlock", 3), peacelock: await release("veillock", 3), veillock: await release("veillock", 4, "rc") };
const sh = {
  enabled: true, nodeId: "node-S", publicKey: pub, now: () => "2026-10-22T12:00:00Z",
  loadAll: async () => structuredClone(store), saveAll: async (a) => { store = structuredClone(a); },
  fetchRelease: async (s) => rels[s] && { manifest: rels[s].manifest, signature: rels[s].signature },
  fetchArtifact: async (s) => new TextEncoder().encode(rels[s].bytes),
  stage: async (s, b) => { active[s + ":staged"] = b; }, swap: async (s) => { active[s] = active[s + ":staged"]; },
  healthCheck: async () => true, rollback: async () => {}, writeReceipt: async (r) => { srows.push(r); },
};
const sr = await softwaresCheckOnline(sh, [...slugs, "BAD SLUG"], { publicKey: pub });
ok(sr.count === 3 && sr.live === false, "bad slug dropped, count is input only");
ok(sr.results.chainlock === C.ok && sr.results.peacelock === C.product && sr.results.veillock === C.channel, "per-slug verdicts");
ok(store.items.chainlock.installed_seq === 3 && store.items.peacelock.installed_seq === 0, "per-slug state");
ok(srows.length === 3 && store.tips && store.tips.primary !== srows[0].lattice.primary, "one shared receipt chain");
await softwaresPause(sh, true);
rels.peacelock = await release("peacelock", 5);
ok((await softwaresCheckOnline(sh, ["peacelock"], { publicKey: pub })).results.peacelock === C.paused, "global pause");
await softwaresPause(sh, false);
ok((await softwaresCheckOnline(sh, ["peacelock"], { publicKey: pub })).results.peacelock === C.ok && store.items.peacelock.installed_seq === 5, "resume");
const offSoft = await softwaresCheckOnline({ ...sh, enabled: false }, ["chainlock"]);
ok(offSoft.code === "UPDATE-OFF" && offSoft.enabled === false && offSoft.live === false, "shared updater default path stays off");

let py = true;
try { execFileSync("python3", ["-c", "import cryptography"], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }); } catch { py = false; }
if (py) {
  const pyEnv = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
  const empty = execFileSync("python3", ["-c", "import sys; sys.path.insert(0,'tools'); import auto_update_updater as U, auto_update_verify as V\nclass H:\n  enabled=True\n  def internet_reachable(self):\n    raise SystemExit('probed')\nprint(U.on_internet_reach(H(), None)['code']); assert V.ACCEPTED_CHANNELS==('stable',); assert V.RELEASE_PUBLIC_KEY"], { env: pyEnv }).toString().trim();
  ok(empty === "UPDATE-NO-KEY", "python empty key refuses before probe");
  const steps = [
    { rel: await release("azos", 2), reach: false },
    { rel: await release("azos", 2, "rc"), reach: true },
    { op: "pause" },
    { rel: await release("azos", 2), reach: true },
    { op: "resume" },
    { rel: await release("azos", 2), reach: true },
    { rel: await release("azos", 2), reach: true },
  ];
  const j = host("azos");
  const codes = [];
  for (const s of steps) {
    if (s.op === "pause") { await pause(j); codes.push("paused"); continue; }
    if (s.op === "resume") { await resume(j); codes.push("resumed"); continue; }
    j.rel = s.rel;
    j.internetReachable = async () => s.reach;
    codes.push((await onInternetReach(j, o)).code);
  }
  const dir = mkdtempSync(join(tmpdir(), "aup-"));
  const f = join(dir, "c.json");
  writeFileSync(f, JSON.stringify({ enabled: true, node_id: "node-A", product: "azos", installed_seq: 1, public_key: pub, steps }));
  const p = JSON.parse(execFileSync("python3", ["tools/auto_update_parity.py", f], { env: pyEnv }).toString());
  ok(JSON.stringify(p.codes) === JSON.stringify(codes), "python codes " + JSON.stringify(p.codes) + " vs " + JSON.stringify(codes));
  ok(p.tips && p.tips.primary === j.state.tips.primary && p.tips.secondary === j.state.tips.secondary, "python lattice tips == js");
  ok(p.installed_seq === 2 && j.state.installed_seq === 2 && p.rows === j.rows.length, "python state == js");
}
console.log(`verify-auto-update-adoption: ${n} checks ok${py ? " (python parity)" : " (python crypto missing: parity skipped)"}`);
