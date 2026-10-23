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
    // B352-2: no valid GIT_SHA -> no node source at all (never codeload main).
    for (const bad of ["", "not-a-sha", "main", "0123456789abcdef"]) {
      const unpinned = installPlan({ origin, slug: "aziel-runtime", products: [{ slug: "aziel-runtime" }], sourceRef: bad });
      const un = unpinned.steps.find((s) => s.id === "node");
      assert.equal(un.source, null); assert.equal(un.source_ref, null); assert.equal(un.source_pinned, false);
      assert.equal(un.refused, "ONBOARD-NODE-UNPINNED");
      const unSh = installScript(unpinned);
      assert.ok(!/codeload|tar\.gz|src-main/.test(unSh), "unpinned script never downloads a node source");
    }
    assert.equal(node.source_pinned, true); assert.equal(node.source_sha256, null);
    assert.equal(installPlan({ origin, slug: "aziel-runtime", products: [{ slug: "aziel-runtime" }], sourceRef: "0123456789abcdef0123456789abcdef01234567", sourceSha256: "zz" }).steps.find((s) => s.id === "node").source_sha256, null);
    assert.equal(installPlan({ origin, slug: "aziel-runtime", products: [{ slug: "aziel-runtime" }], sourceSha256: "a".repeat(64) }).steps.find((s) => s.id === "node").source_sha256, null, "no sha256 pin without a commit pin");
    assert.match(installScript(plan), /umask 077/);
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
    // B352-1: key material is owner-only (explicit modes, not umask luck).
    const { statSync } = await import("node:fs");
    const mode = (f) => statSync(f).mode & 0o777;
    if (process.platform !== "win32") {
      assert.equal(mode(join(nodeDir, "data", "identity.json")), 0o600, "identity.json 0600");
      assert.equal(mode(join(nodeDir, "data")), 0o700, "data dir 0700");
      assert.equal(mode(nodeDir), 0o700, "node dir 0700 under umask 077");
      assert.equal(mode(join(nodeDir, "node.log")), 0o600, "node.log 0600");
    }
    // The relay's local origin has no /v1/mesh/join, so the script must not claim a join.
    assert.match(run.stdout, /has not joined the mesh/); assert.ok(!/Joined the mesh as/.test(run.stdout));
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

// MESH-ONBOARD-1.0 audit fixes (B352-1, B352-2, LOWs): modes, pinned source, failed download,
// sha256 pin, capped log, and "Joined the mesh as" only when the mesh accepted the join.
{
  const { spawn, execFileSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const http = await import("node:http");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { createHash } = await import("node:crypto");
  const { startRelayServer } = await import("../src/fed-mesh/local-http.js");
  const { openInstance } = await import("../src/fed-mesh/instance.js");
  const { cappedLogger } = await import("../src/fed-mesh/capped-log.js");
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const runSh = (file, env) =>
    new Promise((resolve) => {
      const child = spawn("sh", [file], { env, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), 90000);
      child.stdout.on("data", (c) => (stdout += c));
      child.stderr.on("data", (c) => (stderr += c));
      child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
    });
  const listen = (handler) => new Promise((resolve) => { const srv = http.createServer(handler); srv.listen(0, "127.0.0.1", () => resolve(srv)); });
  const mode = (f) => fs.statSync(f).mode & 0o777;
  const posix = process.platform !== "win32";
  const SHA = "0123456789abcdef0123456789abcdef01234567";
  const products = [{ slug: "aziel-runtime" }];
  const NOT_YET = /not a mesh node yet/;
  const welcome = NEW_USER_HINTS.find((h) => h.id === "welcome").text;
  const root = fs.mkdtempSync(join(tmpdir(), "onboard-fix-"));
  const relay = await startRelayServer();
  const origin = relay.url.replace(/\/v1\/mesh\/relay$/, "");
  const killNode = (meshHome) => {
    for (const n of fs.existsSync(meshHome) ? fs.readdirSync(meshHome) : []) {
      const pidFile = join(meshHome, n, "node.pid");
      if (fs.existsSync(pidFile)) { try { process.kill(Number(fs.readFileSync(pidFile, "utf8").trim()), "SIGTERM"); } catch { /* gone */ } }
    }
  };
  try {
    // B352-1 at the library level: explicit 0600 / 0700 even under a permissive umask, and an
    // older 0644 identity.json is tightened on open. No seed is printed by this test.
    if (posix) {
      const old = process.umask(0o022);
      try {
        const d = join(root, "lib-node", "data");
        const n1 = await openInstance({ dataDir: d });
        assert.equal(mode(join(d, "identity.json")), 0o600);
        assert.equal(mode(d), 0o700);
        if (n1.stop) await n1.stop().catch(() => {});
        fs.chmodSync(join(d, "identity.json"), 0o644); fs.chmodSync(d, 0o755);
        const n2 = await openInstance({ dataDir: d });
        assert.equal(mode(join(d, "identity.json")), 0o600, "0644 identity tightened on open");
        assert.equal(mode(d), 0o700);
        assert.equal(n2.identity.handle, n1.identity.handle, "same identity after re-tightening");
        if (n2.stop) await n2.stop().catch(() => {});
        const k = join(root, "lib-ks", "data");
        await openInstance({ dataDir: k, passphrase: "test-only-passphrase" });
        assert.equal(mode(join(k, "keystore.json")), 0o600); assert.equal(mode(join(k, "identity.json")), 0o600);
      } finally {
        process.umask(old);
      }
    }

    // Capped log: rotates to .1 at the cap, never grows past it, 0600.
    {
      const f = join(root, "cap", "node.log");
      fs.mkdirSync(join(root, "cap"));
      const log = cappedLogger(f, 4096);
      for (let i = 0; i < 400; i++) log(JSON.stringify({ heartbeat: true, i, pad: "x".repeat(40) }));
      assert.ok(fs.statSync(f).size <= 4096, "node.log stays under the cap");
      assert.ok(fs.existsSync(f + ".1") && fs.statSync(f + ".1").size <= 4096, "one rotated file, also capped");
      assert.ok(!fs.existsSync(f + ".2"));
      if (posix) assert.equal(mode(f), 0o600);
      assert.match(fs.readFileSync(f, "utf8").trim().split("\n").pop(), /"i":399/);
    }

    // B352-2 no SHA: the script starts no node and says so honestly, exit 0.
    {
      const sh = join(root, "unpinned.sh");
      fs.writeFileSync(sh, installScript(installPlan({ origin, slug: "aziel-runtime", version: "1.0.0", products })));
      const home = join(root, "h-unpinned");
      const r = await runSh(sh, { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh") });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /no pinned deployed commit/); assert.match(r.stdout, NOT_YET);
      assert.ok(!r.stdout.includes(welcome));
      const left = fs.existsSync(join(home, "mesh")) ? fs.readdirSync(join(home, "mesh")) : [];
      assert.deepEqual(left, [], "no source or node dir without a pinned commit");
    }

    // LOW 1: failed download (proxy refuses) -> not-yet line, exit 0, no empty source dir left.
    {
      const sh = join(root, "faildl.sh");
      fs.writeFileSync(sh, installScript(installPlan({ origin, slug: "aziel-runtime", version: "1.0.0", products, sourceRef: SHA })));
      const home = join(root, "h-faildl");
      const r = await runSh(sh, { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh"), https_proxy: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", ALL_PROXY: "http://127.0.0.1:9" });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /could not be downloaded/); assert.match(r.stdout, NOT_YET);
      assert.ok(!r.stdout.includes(welcome));
      const left = fs.existsSync(join(home, "mesh")) ? fs.readdirSync(join(home, "mesh")) : [];
      assert.ok(!left.some((n) => n.startsWith("src-") || n.startsWith(".src-tmp")), "no empty or partial source dir: " + left.join(","));
    }

    // sha256 pin: a real tarball of this tree served locally. Wrong pin -> refused, right pin -> node runs.
    {
      // The committed tree under test (HEAD), shaped like a codeload tarball (one top-level dir, no node_modules).
      const tgz = execFileSync("git", ["-C", repo, "archive", "--format=tar.gz", "--prefix=aziel-runtime-x/", "HEAD"], { maxBuffer: 1 << 28 });
      const good = createHash("sha256").update(tgz).digest("hex");
      const srv = await listen((req, res) => { res.writeHead(200, { "content-type": "application/gzip" }); res.end(tgz); });
      const tarUrl = `http://127.0.0.1:${srv.address().port}/tar.gz/${SHA}`;
      const withUrl = (pin) => {
        const p = installPlan({ origin, slug: "aziel-runtime", version: "1.0.0", products, sourceRef: SHA, sourceSha256: pin });
        p.steps.find((s) => s.id === "node").source = tarUrl; // test-only: local copy instead of codeload
        return installScript(p);
      };
      try {
        const bad = join(root, "badpin.sh");
        fs.writeFileSync(bad, withUrl("f".repeat(64)));
        const hb = join(root, "h-badpin");
        const r1 = await runSh(bad, { ...process.env, HOME: hb, AZIEL_MESH_HOME: join(hb, "mesh") });
        assert.equal(r1.status, 0, r1.stderr);
        assert.match(r1.stdout, /did not match its pinned sha256/); assert.match(r1.stdout, NOT_YET);
        assert.ok(!fs.readdirSync(join(hb, "mesh")).some((n) => n.startsWith("src-") || n.startsWith(".src-tmp")));

        const ok = join(root, "goodpin.sh");
        fs.writeFileSync(ok, withUrl(good));
        const hg = join(root, "h-goodpin");
        try {
          const r2 = await runSh(ok, { ...process.env, HOME: hg, AZIEL_MESH_HOME: join(hg, "mesh") });
          assert.equal(r2.status, 0, r2.stderr);
          assert.match(r2.stdout, /Mesh node #[A-Z0-9]+ is running/, r2.stdout);
          assert.ok(r2.stdout.includes(welcome));
          const names = fs.readdirSync(join(hg, "mesh"));
          assert.ok(names.includes(`src-${SHA}-${good.slice(0, 16)}`), "cache keyed by commit + sha256");
          if (posix) {
            const nd = join(hg, "mesh", names.find((n) => n.startsWith("aziel-runtime-1.0.0-")));
            assert.equal(mode(join(nd, "data", "identity.json")), 0o600);
            assert.equal(mode(join(nd, "data")), 0o700);
          }
        } finally {
          killNode(join(hg, "mesh"));
        }
      } finally {
        await new Promise((r) => srv.close(r));
      }
    }

    // Wording: "Joined the mesh as" only when the mesh accepted the join (2xx + MESH-OK).
    {
      const { default: worker } = await import("../src/index.js");
      const accept = await listen(async (req, res) => {
        let body = "";
        for await (const c of req) body += c;
        const r = await worker.fetch(new Request("https://aziel-runtime.example" + req.url, { method: req.method, headers: { "content-type": "application/json" }, body: req.method === "POST" ? body : undefined }), {}, { waitUntil() {} });
        res.writeHead(r.status, { "content-type": "application/json" }); res.end(await r.text());
      });
      const refuseSrv = await listen((req, res) => { res.writeHead(409, { "content-type": "application/json" }); res.end('{"ok":false,"code":"MESH-OFF"}'); });
      const okBody = await listen((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":false,"code":"MESH-BAD-INPUT"}'); });
      const empty = join(root, "emptysrc"); fs.mkdirSync(empty);
      try {
        for (const [srv, joined] of [[accept, true], [refuseSrv, false], [okBody, false]]) {
          const o = `http://127.0.0.1:${srv.address().port}`;
          const sh = join(root, `join-${srv.address().port}.sh`);
          fs.writeFileSync(sh, installScript(installPlan({ origin: o, slug: "aziel-runtime", version: "1.0.0", products, sourceRef: SHA })));
          const home = join(root, `h-join-${srv.address().port}`);
          const r = await runSh(sh, { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh"), AZIEL_MESH_SRC_DIR: empty });
          assert.equal(r.status, 0, r.stderr);
          assert.equal(/Joined the mesh as aziel-runtime-1\.0\.0-[0-9a-f]{8}\./.test(r.stdout), joined, r.stdout);
          if (!joined) assert.match(r.stdout, /has not joined the mesh/);
          assert.match(r.stdout, NOT_YET, "no node source -> still not a mesh node yet, even when joined");
          assert.ok(!r.stdout.includes(welcome));
        }
      } finally {
        for (const srv of [accept, refuseSrv, okBody]) await new Promise((r) => srv.close(r));
      }
    }
  } finally {
    await relay.stop();
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log("verify-mesh-onboard: audit fixes ok (modes, pinned source, failed download, sha256 pin, log cap, join wording)");
}
