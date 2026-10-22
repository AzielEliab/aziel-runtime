import assert from "node:assert/strict";
const { default: worker } = await import("../src/index.js");
const { installPlan, installScript, bootstrapList, NEW_USER_HINTS } = await import("../src/mesh-onboard.js");
const o = "https://aziel-runtime.example";
const get = (p) => worker.fetch(new Request(o + p), {}, { waitUntil() {} });
let r = await get("/v1/mesh/install?slug=vibelock&version=1.2.0");
let b = await r.json();
assert.equal(r.status, 200); assert.equal(b.ok, true); assert.equal(b.node_per_version, true);
assert.equal(b.live, false); assert.equal(b.alt_internet_live, false); assert.ok(b.hints.length >= 4);
assert.match(b.steps[2].body.node_id, /^vibelock-1\.2\.0-<random>$/);
r = await get("/v1/mesh/install?slug=Not%20A%20Slug"); assert.equal(r.status, 400); assert.equal((await r.json()).code, "ONBOARD-BAD-SLUG");
r = await get("/v1/mesh/install?slug=nope-not-real"); assert.equal((await r.json()).code, "ONBOARD-UNKNOWN-SLUG");
r = await get("/v1/mesh/install.sh?slug=vibelock&version=1.2.0");
const sh = await r.text();
assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /shellscript/);
assert.match(sh, /^#!\/bin\/sh/); assert.match(sh, /https:\/\/[a-z0-9-]+\.vibelock\.workers\.dev\/install\.sh/); assert.match(sh, /\/v1\/mesh\/join/); assert.match(sh, /not live yet/);
r = await get("/v1/mesh/install.sh?slug=bad%27slug"); assert.equal(r.status, 400); assert.match(await r.text(), /exit 1/);
r = await get("/v1/mesh/bootstrap");
b = await r.json();
assert.equal(r.status, 200); assert.equal(b.phase, "E"); assert.equal(b.needs_starting_address, true);
assert.equal(b.live_multi_provider, false); assert.equal(b.live, false); assert.equal(b.starting_address_count, 1);
const bl = bootstrapList({ origin: o, nodes: [{ node_id: "a", presence_class: "live" }, { node_id: "b", presence_class: "stale" }] });
assert.equal(bl.peer_count, 1);
assert.ok(NEW_USER_HINTS.every((h) => !/aziel/i.test(h.text)));
console.log("verify-mesh-onboard: ok");
{
  const r = await worker.fetch(new Request(o + "/workspace"), {}, { waitUntil() {} });
  const html = await r.text();
  assert.match(html, /id="azrt-hints"/); assert.match(html, /azrt\.hints\.v1/); assert.match(html, /Got it/);
  { const { newUserHintsHtml } = await import("../src/mesh-onboard.js"); const h = newUserHintsHtml(); assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(h)); assert.equal((h.match(/"id":/g) || []).length, 5); } // AGENT-SUBNET-1.0 adds the first-run "agents" hint (additive)
  console.log("verify-mesh-onboard: hints popup ok");
}
function newUserHintsHtml_() { return ""; }

// MESH-ONBOARD-1.0 real node: the one-click script starts a local FED-MESH node with its own key,
// registers it on the relay with a signed statement, and only then says the app is a mesh node.
{
  const { spawn } = await import("node:child_process");
  const runSh = (file, env) =>
    new Promise((resolve) => {
      const child = spawn("sh", [file], { env, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), 60000);
      child.stdout.on("data", (c) => (stdout += c));
      child.stderr.on("data", (c) => (stderr += c));
      child.on("close", (status) => {
        clearTimeout(timer);
        resolve({ status, stdout, stderr });
      });
    });
  const { mkdirSync: mkd, mkdtempSync, rmSync, readFileSync: rfs, writeFileSync: wfs, readdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { startRelayServer } = await import("../src/fed-mesh/local-http.js");
  const { startInstance } = await import("../src/fed-mesh/instance.js");
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const relay = await startRelayServer();
  const origin = relay.url.replace(/\/v1\/mesh\/relay$/, "");
  const root = mkdtempSync(join(tmpdir(), "onboard-"));
  try {
    // Signed heartbeat on the relay chain.
    const probe = await startInstance({ dataDir: join(root, "probe"), relays: [relay.url] });
    assert.equal((await probe.register(relay.url)).ok, true);
    const hb = await probe.heartbeat(relay.url);
    assert.equal(hb.ok, true, hb.message);
    assert.equal(hb.op, "heartbeat");
    await probe.stop();

    const plan = installPlan({ origin, slug: "aziel-runtime", version: "9.9.9", products: [{ slug: "aziel-runtime" }], sourceRef: "0123456789abcdef0123456789abcdef01234567" });
    const node = plan.steps.find((s) => s.id === "node");
    assert.ok(node, "plan has a real node step");
    assert.equal(node.relay, `${origin}/v1/mesh/relay`);
    assert.match(node.source, /codeload\.github\.com\/AzielEliab\/aziel-runtime\/tar\.gz\/0123456789abcdef0123456789abcdef01234567$/);
    assert.equal(installPlan({ origin, slug: "aziel-runtime", products: [{ slug: "aziel-runtime" }], sourceRef: "not-a-sha" }).steps.find((s) => s.id === "node").source_ref, "main");
    const script = installScript(plan);
    const scriptPath = join(root, "install.sh");
    wfs(scriptPath, script);
    const welcome = NEW_USER_HINTS.find((h) => h.id === "welcome").text;

    // Real run: the node starts and registers before the welcome hint prints.
    const home = join(root, "home");
    const run = await runSh(scriptPath, { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh"), AZIEL_MESH_SRC_DIR: repo });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /Mesh node #[A-Z0-9]+ is running/);
    assert.ok(run.stdout.includes(welcome), "welcome hint after registration");
    const nodeDir = join(home, "mesh", readdirSync(join(home, "mesh")).find((n) => n.startsWith("aziel-runtime-9.9.9-")));
    const pid = Number(rfs(join(nodeDir, "node.pid"), "utf8").trim());
    const handle = (run.stdout.match(/Mesh node (#[A-Z0-9]+)/) || [])[1];
    try {
      const dir = await (await fetch(`${relay.url}/directory?handle=${encodeURIComponent(handle)}`)).json();
      assert.equal(dir.ok, true, "relay has the new node's signed register");
      assert.ok(dir.seq >= 1);
      process.kill(pid, 0);
    } finally {
      try { process.kill(pid, "SIGTERM"); } catch { /* gone */ }
    }

    // No node source: no node, and the script does not claim one.
    const empty = join(root, "empty");
    mkd(empty, { recursive: true });
    const home2 = join(root, "home2");
    const fail = await runSh(scriptPath, { ...process.env, HOME: home2, AZIEL_MESH_HOME: join(home2, "mesh"), AZIEL_MESH_SRC_DIR: empty });
    assert.equal(fail.status, 0, fail.stderr);
    assert.equal(fail.stdout.includes(welcome), false, "no welcome hint without a registered node");
    assert.match(fail.stdout, /not a mesh node yet/);
  } finally {
    await relay.stop();
    rmSync(root, { recursive: true, force: true });
  }
  console.log("verify-mesh-onboard: real node ok");
}
