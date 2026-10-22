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

// Follow-up to #352 (AZBot LOWs): top-level join code, log modes on open/rotate, long lines,
// capped node.err, and an accurate not-yet line when no node was started. Each fails on c1edb383.
{
  const { spawn, execFileSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const http = await import("node:http");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const onboard = await import("../src/mesh-onboard.js");
  const capped = await import("../src/fed-mesh/capped-log.js");
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const posix = process.platform !== "win32";
  const mode = (f) => fs.statSync(f).mode & 0o777;
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
  const SHA = "0123456789abcdef0123456789abcdef01234567";
  const products = [{ slug: "aziel-runtime" }];
  const root = fs.mkdtempSync(join(tmpdir(), "onboard-lows-"));
  try {
    // LOW 1a: the awk top-level scan itself (the same program the script runs).
    assert.equal(typeof onboard.JOIN_TOP_CODE_AWK, "string", "JOIN_TOP_CODE_AWK exported");
    const top = (body) => execFileSync("sh", ["-c", 'printf "%s" "$1" | awk "$2"', "x", body, onboard.JOIN_TOP_CODE_AWK]).toString().replace(/\n$/, "");
    const table = [
      // Since #357 the program prints only MESH-OK (it compares itself), never another code.
      ['{"ok":true,"code":"MESH-OK","node_id":"n"}', "MESH-OK"],
      ['{\n  "ok": true,\n  "code" : "MESH-OK"\n}', "MESH-OK"],
      ['{"a":1,"b":true,"c":null,"code":"MESH-OK"}', "MESH-OK"],
      ['{"ok":false,"code":"MESH-OFF","detail":{"code":"MESH-OK"}}', ""],
      ['{"ok":false,"detail":{"code":"MESH-OK"}}', ""],
      ['{"ok":false,"list":[{"code":"MESH-OK"}],"code":"MESH-BAD"}', ""],
      ['{"code":{"code":"MESH-OK"}}', ""],
      ['{"code":"MESH-OK","code":"MESH-OFF"}', ""],
      ['{"msg":"\\"code\\":\\"MESH-OK\\"","code":"NO"}', ""],
      ['{"note":"MESH-OK","code":"MESH-OFF"}', ""],
      ['{"code":"MESH\\u002dOK"}', ""],
      ['{"code":"MESH-OK"} trailing', ""],
      ['[{"code":"MESH-OK"}]', ""],
      ['{"code":"MESH-OK"', ""],
      ["", ""],
    ];
    for (const [body, want] of table) assert.equal(top(body), want, "top-level code of " + body);

    // LOW 1b: end to end. A 200 refusal with a nested MESH-OK must not print Joined.
    const nested = await listen((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":false,"code":"MESH-OFF","detail":{"code":"MESH-OK","ok":true}}'); });
    const real = await listen((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true,"code":"MESH-OK","note":{"code":"MESH-OFF"}}'); });
    const empty = join(root, "emptysrc"); fs.mkdirSync(empty);
    try {
      for (const [srv, joined] of [[nested, false], [real, true]]) {
        const sh = join(root, `join-${srv.address().port}.sh`);
        fs.writeFileSync(sh, onboard.installScript(onboard.installPlan({ origin: `http://127.0.0.1:${srv.address().port}`, slug: "aziel-runtime", version: "1.0.0", products, sourceRef: SHA })));
        const home = join(root, `h-${srv.address().port}`);
        const r = await runSh(sh, { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh"), AZIEL_MESH_SRC_DIR: empty });
        assert.equal(r.status, 0, r.stderr);
        assert.equal(/Joined the mesh as /.test(r.stdout), joined, r.stdout);
        if (!joined) assert.match(r.stdout, /has not joined the mesh/);
      }
    } finally {
      for (const srv of [nested, real]) await new Promise((r) => srv.close(r));
    }

    // LOW 2: an existing 0644 log and its .1 are tightened on open, and .1 is 0600 after a rotate.
    if (posix) {
      const d = join(root, "modes"); fs.mkdirSync(d);
      const f = join(d, "node.log");
      fs.writeFileSync(f, "old\n", { mode: 0o644 }); fs.chmodSync(f, 0o644);
      fs.writeFileSync(f + ".1", "older\n", { mode: 0o644 }); fs.chmodSync(f + ".1", 0o644);
      const log = capped.cappedLogger(f, 4096);
      assert.equal(mode(f), 0o600, "existing log tightened on open");
      assert.equal(mode(f + ".1"), 0o600, "existing .1 tightened on open");
      assert.equal(log.refused, null);
      fs.chmodSync(f, 0o644); // loosened behind the logger's back: the rotate must still leave .1 at 0600
      for (let i = 0; i < 200; i++) log("y".repeat(60));
      assert.ok(fs.existsSync(f + ".1"));
      assert.equal(mode(f + ".1"), 0o600, ".1 is 0600 after rotate");
      assert.equal(mode(f), 0o600, "fresh log after rotate is 0600");
    }

    // LOW 3: one line longer than the cap never makes the file pass the cap (UTF-8 safe).
    {
      const d = join(root, "long"); fs.mkdirSync(d);
      const f = join(d, "node.log");
      const log = capped.cappedLogger(f, 4096);
      log("start");
      log("\u00e9".repeat(10000)); // 20000 bytes of 2-byte characters
      assert.ok(fs.statSync(f).size <= 4096, "size " + fs.statSync(f).size);
      assert.ok(!fs.existsSync(f + ".1") || fs.statSync(f + ".1").size <= 4096);
      const text = fs.readFileSync(f, "utf8");
      assert.ok(text.endsWith(capped.LOG_TRUNC_MARK), "truncation marker");
      assert.ok(!text.includes("\ufffd"), "no split UTF-8 character");
      log("x".repeat(4095)); // exactly cap with the newline
      assert.ok(fs.statSync(f).size <= 4096);
      // Raw writer: a 3x-cap chunk is split, both files stay under the cap.
      const w = capped.cappedWriter(join(d, "node.err"), 4096);
      w(Buffer.alloc(3 * 4096 + 7, 0x61));
      assert.ok(fs.statSync(join(d, "node.err")).size <= 4096 && fs.statSync(join(d, "node.err.1")).size <= 4096);
      assert.ok(!fs.existsSync(join(d, "node.err.2")));
    }

    // LOW 4: node.err goes through qnm-node/capped-run.mjs (cap, rotate to .1, 0600), not a raw redirect.
    {
      const script = onboard.installScript(onboard.installPlan({ origin: "http://127.0.0.1:1", slug: "aziel-runtime", version: "1.0.0", products, sourceRef: SHA }));
      assert.ok(!/> "\$DIR\/node\.err"/.test(script), "no uncapped node.err redirect");
      assert.match(script, /capped-run\.mjs" --err-file "\$DIR\/node\.err" --err-max-bytes 1048576 -- /);
      const run = join(repo, "qnm-node", "capped-run.mjs");
      const d = join(root, "err"); fs.mkdirSync(d);
      const noisy = join(d, "noisy.mjs");
      fs.writeFileSync(noisy, "for (let i = 0; i < 300; i++) process.stderr.write('e'.repeat(100) + '\\n'); process.stdout.write('out\\n'); process.exitCode = 3;\n");
      const errFile = join(d, "node.err");
      const r = await new Promise((resolve) => {
        const c = spawn(process.execPath, [run, "--err-file", errFile, "--err-max-bytes", "4096", "--", noisy], { stdio: "ignore" });
        c.on("close", (code) => resolve(code));
      });
      assert.equal(r, 3, "child exit code passed through");
      assert.ok(fs.statSync(errFile).size <= 4096 && fs.statSync(errFile + ".1").size <= 4096, "node.err capped");
      assert.ok(!fs.existsSync(errFile + ".2"));
      if (posix) { assert.equal(mode(errFile), 0o600); assert.equal(mode(errFile + ".1"), 0o600); }
      const bad = await new Promise((resolve) => { const c = spawn(process.execPath, [run, "--", noisy], { stdio: "ignore" }); c.on("close", resolve); });
      assert.equal(bad, 2, "no --err-file: fails closed, starts nothing");
      // SIGTERM to the wrapper (what the pid file holds) stops the node.
      const sleeper = join(d, "sleep.mjs");
      fs.writeFileSync(sleeper, "console.error('up'); setInterval(() => {}, 1000);\n");
      const w = spawn(process.execPath, [run, "--err-file", join(d, "s.err"), "--", sleeper], { stdio: "ignore" });
      for (let i = 0; i < 50 && !(fs.existsSync(join(d, "s.err")) && fs.readFileSync(join(d, "s.err"), "utf8").includes("up")); i++) await new Promise((x) => setTimeout(x, 100));
      const gone = new Promise((resolve) => w.on("close", resolve));
      w.kill("SIGTERM");
      const t = setTimeout(() => w.kill("SIGKILL"), 10000);
      await gone; clearTimeout(t);
    }

    // LOW 4 end to end + INFO: a real node run leaves a 0600 node.err; no node -> no "did not register".
    {
      const relayMod = await import("../src/fed-mesh/local-http.js");
      const relay = await relayMod.startRelayServer();
      const origin = relay.url.replace(/\/v1\/mesh\/relay$/, "");
      try {
        const sh = join(root, "real.sh");
        fs.writeFileSync(sh, onboard.installScript(onboard.installPlan({ origin, slug: "aziel-runtime", version: "2.0.0", products, sourceRef: SHA })));
        const home = join(root, "h-real");
        const meshHome = join(home, "mesh");
        const r = await runSh(sh, { ...process.env, HOME: home, AZIEL_MESH_HOME: meshHome, AZIEL_MESH_SRC_DIR: repo });
        const nd = join(meshHome, fs.readdirSync(meshHome).find((n) => n.startsWith("aziel-runtime-2.0.0-")));
        try {
          assert.equal(r.status, 0, r.stderr);
          assert.match(r.stdout, /Mesh node #[A-Z0-9]+ is running/, r.stdout);
          assert.ok(!/did not register|No local mesh node was started/.test(r.stdout));
          if (posix && fs.existsSync(join(nd, "node.err"))) assert.equal(mode(join(nd, "node.err")), 0o600, "node.err 0600");
        } finally {
          try { process.kill(Number(fs.readFileSync(join(nd, "node.pid"), "utf8").trim()), "SIGTERM"); } catch { /* gone */ }
        }
        // Node started but never registers (relay gone): "did not register" is accurate here.
        await relay.stop();
        const home2 = join(root, "h-noreg");
        const r2 = await runSh(sh, { ...process.env, HOME: home2, AZIEL_MESH_HOME: join(home2, "mesh"), AZIEL_MESH_SRC_DIR: repo });
        for (const n of fs.readdirSync(join(home2, "mesh"))) { try { process.kill(Number(fs.readFileSync(join(home2, "mesh", n, "node.pid"), "utf8").trim()), "SIGTERM"); } catch { /* gone */ } }
        assert.equal(r2.status, 0, r2.stderr);
        assert.match(r2.stdout, /The local mesh node did not register, so this app is not a mesh node yet\./, r2.stdout);
      } finally {
        await relay.stop().catch(() => {});
      }
      // No node started (unpinned, empty source, no node 20 paths): the accurate not-yet line.
      for (const [label, plan, env] of [
        ["unpinned", onboard.installPlan({ origin: "http://127.0.0.1:9", slug: "aziel-runtime", version: "1.0.0", products }), {}],
        ["empty source", onboard.installPlan({ origin: "http://127.0.0.1:9", slug: "aziel-runtime", version: "1.0.0", products, sourceRef: SHA }), { AZIEL_MESH_SRC_DIR: empty }],
      ]) {
        const sh = join(root, `nostart-${label.replace(/ /g, "-")}.sh`);
        fs.writeFileSync(sh, onboard.installScript(plan));
        const home = join(root, `h-nostart-${label.replace(/ /g, "-")}`);
        const r = await runSh(sh, { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh"), ...env });
        assert.equal(r.status, 0, r.stderr);
        assert.ok(!/did not register/.test(r.stdout), label + ": no 'did not register' when no node started: " + r.stdout);
        assert.match(r.stdout, /No local mesh node was started, so this app is not a mesh node yet\./, label);
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log("verify-mesh-onboard: #352 LOWs ok (top-level join code, log modes, long lines, capped node.err, not-yet wording)");
}

// Follow-up to #357 (AZBot LOWs + INFO): the join check fails closed on escapes, control characters
// and non-JSON structure, runs in linear time, the reply is capped at 256 KB, the node dies with
// its wrapper, and the capped log never follows a symlink. Every case below fails on 616a3d68.
{
  const { spawn, spawnSync, execFileSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const http = await import("node:http");
  const { tmpdir } = await import("node:os");
  const { join, delimiter } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const onboard = await import("../src/mesh-onboard.js");
  const capped = await import("../src/fed-mesh/capped-log.js");
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const posix = process.platform !== "win32";
  const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const root = fs.mkdtempSync(join(tmpdir(), "onboard-357-"));
  const tested = [];
  try {
    // Every awk on this machine (awk, gawk, mawk, nawk, original-awk, busybox awk), plus any extra
    // awk executables listed in MESH_ONBOARD_AWKS (path-separated). Each gets its own PATH dir.
    const awks = [];
    if (posix) {
      const seen = new Set();
      const which = (name) => { try { return execFileSync("sh", ["-c", 'command -v "$1"', "x", name]).toString().trim(); } catch { return ""; } };
      const add = (label, body, key) => {
        if (seen.has(key)) return;
        seen.add(key);
        const dir = join(root, `awk-${awks.length}`);
        fs.mkdirSync(dir);
        fs.writeFileSync(join(dir, "awk"), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
        awks.push({ label, dir, slow: label === "busybox" });
      };
      const extra = (process.env.MESH_ONBOARD_AWKS || "").split(delimiter).filter(Boolean);
      for (const name of ["awk", "gawk", "mawk", "nawk", "original-awk"]) {
        const p = which(name);
        if (!p) continue;
        const real = fs.realpathSync(p);
        const label = /busybox/.test(real) ? "busybox" : real.split("/").pop();
        add(label, `exec '${real}' "$@"`, real);
      }
      const bb = which("busybox");
      if (bb && spawnSync(bb, ["awk", "BEGIN{print 1}"]).status === 0) add("busybox", `exec '${fs.realpathSync(bb)}' awk "$@"`, "busybox");
      for (const p of extra) add(`extra:${p}`, `exec '${p}' "$@"`, "extra:" + p);
      assert.ok(awks.length >= 1, "at least one awk");
    }

    // The exact join test line from the generated install.sh, run with JOIN_OUT set and one awk on PATH.
    const script = onboard.installScript(onboard.installPlan({ origin: "http://127.0.0.1:9", slug: "aziel-runtime", version: "1.0.0", products: [{ slug: "aziel-runtime" }] }));
    const line = script.split("\n").find((l) => l.startsWith(`if [ "$(printf '%s' "$JOIN_OUT" | awk `));
    assert.ok(line, "join test line present");
    const joinedVia = (awk, input) => {
      if (Buffer.byteLength(input) > 100000) {
        // Too big for one env var: feed the same program on stdin, as printf would.
        const r = spawnSync(join(awk.dir, "awk"), [onboard.JOIN_TOP_CODE_AWK], { input, encoding: "utf8", maxBuffer: 1 << 26 });
        return r.stdout === "MESH-OK\n";
      }
      const r = spawnSync("sh", ["-c", line], { env: { ...process.env, PATH: awk.dir + delimiter + process.env.PATH, JOIN_OUT: input, NODE: "n-1" }, encoding: "utf8" });
      return /^Joined the mesh as n-1\.$/m.test(r.stdout);
    };
    const parsesOk = (input) => { try { const o = JSON.parse(input); return !!o && typeof o === "object" && !Array.isArray(o) && o.code === "MESH-OK"; } catch { return false; } };

    // AZBot's fuzz cases for #357 (all 64 entries of f357/fuzz.mjs). want = Joined or not.
    const realReply = JSON.stringify({ ok: true, code: "MESH-OK", node: { id: "n-1", peers: Array.from({ length: 900 }, (_, i) => ({ id: "p" + i, code: i % 2 ? "MESH-OK" : "MESH-NO", note: '{"code":"MESH-OK"} [ ] \\" ' })) } }, null, 2);
    const fuzz = {
      plain: '{"code":"MESH-OK"}', ws: ' \n\t{ "code" \r\n :\n "MESH-OK" \n}\n ', refusal: '{"code":"MESH-REFUSED"}',
      nested_under_refusal: '{"code":"MESH-REFUSED","d":{"code":"MESH-OK"}}', nested_only: '{"d":{"code":"MESH-OK"}}',
      nested_arr: '{"d":[{"code":"MESH-OK"}],"x":1}', nested_first: '{"d":{"code":"MESH-OK"},"code":"NO"}',
      dup_ok_ok: '{"code":"MESH-OK","code":"MESH-OK"}', dup_ok_no: '{"code":"MESH-OK","code":"NO"}', dup_no_ok: '{"code":"NO","code":"MESH-OK"}',
      dup_obj_ok: '{"code":{},"code":"MESH-OK"}', nonstr_num: '{"code":1}', nonstr_true_then_ok: '{"code":true}', nonstr_obj: '{"code":{"x":"MESH-OK"}}',
      nonstr_arr: '{"code":["MESH-OK"]}', nonstr_null: '{"code":null}',
      split_lines: '{"code":"MESH-\nOK"}', split_key: '{"co\nde":"MESH-OK"}', split_ws: '{"code"\n:\n"MESH-OK"\n}',
      uni_val: '{"code":"MESH\\u002dOK"}', uni_key: '{"co\\u0064e":"MESH-OK"}',
      uni_key_dup_after: '{"code":"MESH-OK","co\\u0064e":"MESH-REFUSED"}', uni_key_dup_before: '{"co\\u0064e":"MESH-REFUSED","code":"MESH-OK"}',
      str_contains: '{"code":"NO","msg":"\\"code\\":\\"MESH-OK\\""}', str_contains2: '{"msg":"{\\"code\\":\\"MESH-OK\\"}"}',
      braces_in_str: '{"a":"}}}{{[[","code":"MESH-OK","b":"]]"}', braces_in_str_close: '{"a":"}","code":"NO"} {"code":"MESH-OK"}',
      esc_backslash_end: '{"a":"\\\\","code":"MESH-OK"}', esc_quote: '{"a":"\\"","code":"MESH-OK"}',
      trailing_junk: '{"code":"MESH-OK"}x', trailing_obj: '{"code":"MESH-OK"}{}', two_objs: '{"code":"NO"}{"code":"MESH-OK"}',
      top_array: '[{"code":"MESH-OK"}]', top_str: '"MESH-OK"', bare: "MESH-OK", empty: "",
      trunc1: '{"code":"MESH-OK"', trunc2: '{"code":"MESH-OK",', trunc3: '{"code":"MESH-OK","a":"', trunc_mid: '{"code":"MESH-OK","d":{',
      raw_nl_in_val: '{"code":"MESH-OK\n"}', raw_nl2: '{"code":"MESH-OK\n\n\n"}', raw_tab_val: '{"code":"MESH-OK\t"}',
      raw_cr_val: '{"code":"MESH-OK\r"}',
      missing_colon: '{"code" "MESH-OK"}', missing_comma: '{"a":1 "code":"MESH-OK"}', extra_comma: '{"code":"MESH-OK",}', lead_comma: '{,"code":"MESH-OK"}',
      bareword_val: '{"x":garbage,"code":"MESH-OK"}', bareword_key: '{x:1,"code":"MESH-OK"}', unbalanced_close: '{"d":]],"code":"MESH-OK"}',
      mismatched: '{"d":{],"code":"MESH-OK"}', key_only: '{"code"}', colon_code_key_twice: '{"code":"MESH-OK":"x"}',
      single_quotes: "{'code':'MESH-OK'}", bom: '\ufeff{"code":"MESH-OK"}', nbsp: '{\u00a0"code":"MESH-OK"}',
      unicode_other: '{"msg":"h\u00e9llo \u2603 \ud834\udd1e","code":"MESH-OK"}',
      shell_inj: `{"code":"$(touch ${root}/PWNED)\`touch ${root}/PWNED2\`"}`,
      shell_inj2: `{"code":"MESH-OK'; touch ${root}/PWNED3; '"}`, awk_inj: `{"code":"\\"); system(\\"touch ${root}/PWNED4\\")#"}`,
      real_105k: realReply, real_nested_only: realReply.replace('"code": "MESH-OK"', '"code": "MESH-NO"'),
      oversize_ok: '{"pad":"' + "x".repeat(1100000) + '","code":"MESH-OK"}',
    };
    assert.equal(Object.keys(fuzz).length, 64, "every case of AZBot's f357/fuzz.mjs table (64 entries; the review notes say 62)");
    // Valid JSON that we refuse on purpose (fail closed): duplicate code keys, and any escape in a
    // top-level key or in the code value. Everything else must agree with JSON.parse.
    const failClosed = new Set(["dup_ok_ok", "dup_no_ok", "dup_obj_ok", "uni_val", "uni_key", "uni_key_dup_before"]);
    // The false positives AZBot found on 616a3d68: each must now be refused.
    const wasJoined = ["uni_key_dup_after", "raw_nl_in_val", "raw_nl2", "extra_comma", "bareword_val", "mismatched"];
    for (const n of wasJoined) assert.equal(parsesOk(fuzz[n]), false, n);
    // More of the same kinds (escaped / control / structure), also Joined on 616a3d68.
    const more = {
      uni_key_dup_mixed: '{"code":"MESH-OK","\\u0063ode":"NO"}',
      esc_key_short: '{"code":"MESH-OK","c\\/ode":1}',
      bad_escape_val: '{"code":"MESH-OK","a":"\\q"}',
      bad_u_escape: '{"code":"MESH-OK","a":"\\u12"}',
      raw_nl_other: '{"code":"MESH-OK","a":"x\ny"}',
      raw_ctl_key: '{"code":"MESH-OK","a\u0001":1}',
      raw_lf_code_only: '{"code":"MESH-OK\n\n"}',
      trailing_comma_arr: '{"code":"MESH-OK","a":[1,]}',
      trailing_comma_nested: '{"code":"MESH-OK","a":{"b":1,}}',
      bareword_nested: '{"code":"MESH-OK","a":[nope]}',
      bad_number: '{"code":"MESH-OK","a":01}',
      bad_number2: '{"code":"MESH-OK","a":1.}',
      mismatched2: '{"code":"MESH-OK","a":[}]}',
      close_extra: '{"code":"MESH-OK","a":[]]}',
      double_colon: '{"code"::"MESH-OK"}',
      comma_colon: '{"code","MESH-OK"}',
      value_no_comma: '{"a":"x""code":"MESH-OK"}',
      lit_then_str: '{"a":true"code":"MESH-OK"}',
    };
    // esc_key_short is valid JSON (key "c/ode") refused on purpose: an escaped top-level key.
    for (const [n, v] of Object.entries(more)) assert.equal(parsesOk(v), n === "esc_key_short", n);
    for (const awk of awks) {
      for (const [name, input] of Object.entries(fuzz)) {
        const want = failClosed.has(name) ? false : parsesOk(input);
        assert.equal(joinedVia(awk, input), want, `${awk.label}: fuzz ${name}`);
      }
      for (const [name, input] of Object.entries(more)) assert.equal(joinedVia(awk, input), false, `${awk.label}: ${name}`);
      for (let i = 1; i <= 4; i++) assert.ok(!fs.existsSync(join(root, i === 1 ? "PWNED" : "PWNED" + i)), `${awk.label}: no injection`);
      tested.push(awk.label);
    }

    // Speed: no quadratic string building. Worst-case shapes: busybox at the 256 KB cap within 5 s,
    // other awks at 1 MiB within 4 s (616a3d68: busybox 15-29 s, mawk 1 MiB 15 s).
    const shape = (n) => {
      const fill = (pre, unit, post) => pre + unit.repeat(Math.floor((n - pre.length - post.length) / unit.length)) + post;
      return {
        one_string: fill('{"code":"MESH-OK","p":"', "x", '"}'),
        newlines: fill('{"code":"MESH-OK","p":', "\n", "1}"),
        esc_quotes: fill('{"code":"MESH-OK","p":"', '\\"', '"}'),
        many_strings: fill('{"code":"MESH-OK","p":["', 'x","', 'x"]}'),
        deep: '{"code":"MESH-OK","p":' + "[".repeat(Math.floor(n / 2) - 20) + "]".repeat(Math.floor(n / 2) - 20) + "}",
        many_lits: fill('{"code":"MESH-OK","p":[', "1,", "1]}"),
      };
    };
    for (const awk of awks) {
      const n = awk.slow ? onboard.JOIN_MAX_BYTES : 1048576;
      const budget = awk.slow ? 5000 : 4000;
      for (const [name, input] of Object.entries(shape(n))) {
        const t = Date.now();
        const r = spawnSync(join(awk.dir, "awk"), [onboard.JOIN_TOP_CODE_AWK], { input, encoding: "utf8", timeout: 60000, maxBuffer: 1 << 26 });
        const ms = Date.now() - t;
        assert.equal(r.stdout, "MESH-OK\n", `${awk.label}: ${name} accepted`);
        assert.ok(ms < budget, `${awk.label}: ${name} ${n} bytes took ${ms} ms (budget ${budget})`);
      }
    }

    // Reply cap: curl --max-filesize 262144. A valid MESH-OK reply over 256 KB is not a join.
    assert.equal(onboard.JOIN_MAX_BYTES, 262144);
    assert.ok(script.includes("curl -fsS --max-filesize 262144 "), "join reply capped at 256 KB");
    {
      const big = '{"code":"MESH-OK","pad":"' + "x".repeat(300000) + '"}';
      const ok = '{"code":"MESH-OK","pad":"' + "x".repeat(200000) + '"}';
      for (const [body, joined] of [[big, false], [ok, true]]) {
        const srv = await new Promise((resolve) => { const s = http.createServer((req, res) => { req.resume(); res.writeHead(200, { "content-type": "application/json" }); res.end(body); }); s.listen(0, "127.0.0.1", () => resolve(s)); });
        try {
          const sh = join(root, `cap-${joined}.sh`);
          const empty = join(root, `cap-src-${joined}`); fs.mkdirSync(empty);
          fs.writeFileSync(sh, onboard.installScript(onboard.installPlan({ origin: `http://127.0.0.1:${srv.address().port}`, slug: "aziel-runtime", version: "1.0.0", products: [{ slug: "aziel-runtime" }], sourceRef: "0123456789abcdef0123456789abcdef01234567" })));
          const home = join(root, `cap-h-${joined}`);
          const r = await new Promise((resolve) => {
            const c = spawn("sh", [sh], { env: { ...process.env, HOME: home, AZIEL_MESH_HOME: join(home, "mesh"), AZIEL_MESH_SRC_DIR: empty }, stdio: ["ignore", "pipe", "pipe"] });
            let out = ""; c.stdout.on("data", (d) => (out += d)); c.stderr.resume();
            c.on("close", (status) => resolve({ status, out }));
          });
          assert.equal(r.status, 0);
          assert.equal(/Joined the mesh as /.test(r.out), joined, `reply of ${body.length} bytes: ${r.out}`);
        } finally {
          await new Promise((r) => srv.close(r));
        }
      }
    }

    // Orphan node: SIGKILL the capped-run wrapper (what node.pid holds); the quiet node must stop too.
    if (posix) {
      const run = join(repo, "qnm-node", "capped-run.mjs");
      const d = join(root, "orphan"); fs.mkdirSync(d);
      for (const [label, body] of [
        ["quiet", "require('node:fs').writeFileSync(process.argv[2], String(process.pid)); setInterval(() => {}, 1000);\n"],
        ["ignores TERM", "process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(process.argv[2], String(process.pid)); setInterval(() => {}, 1000);\n"],
      ]) {
        const child = join(d, `${label.replace(/ /g, "-")}.cjs`);
        const pidFile = join(d, `${label.replace(/ /g, "-")}.pid`);
        fs.writeFileSync(child, body);
        const w = spawn(process.execPath, [run, "--err-file", join(d, "o.err"), "--", child, pidFile], { stdio: "ignore" });
        for (let i = 0; i < 100 && !fs.existsSync(pidFile); i++) await sleep(50);
        const pid = Number(fs.readFileSync(pidFile, "utf8"));
        assert.ok(pid > 1 && alive(pid), label + ": node up");
        const gone = new Promise((resolve) => w.on("close", resolve));
        w.kill("SIGKILL");
        await gone;
        let i = 0;
        for (; i < 120 && alive(pid); i++) await sleep(50);
        const still = alive(pid);
        if (still) process.kill(pid, "SIGKILL");
        assert.equal(still, false, `${label}: node still running ${i * 50} ms after its wrapper was SIGKILLed`);
      }
    }

    // INFO: the capped log never follows a symlink (O_NOFOLLOW + fchmod on the open fd).
    if (posix) {
      const d = join(root, "links"); fs.mkdirSync(d);
      const victim = join(d, "victim.txt");
      const fresh = () => { fs.rmSync(victim, { force: true }); fs.writeFileSync(victim, "keep\n"); fs.chmodSync(victim, 0o644); };
      const untouched = (what) => {
        assert.equal(fs.readFileSync(victim, "utf8"), "keep\n", what + ": victim content unchanged");
        assert.equal(fs.statSync(victim).mode & 0o777, 0o644, what + ": victim mode unchanged");
      };
      // Symlink at the log path when it opens.
      for (const make of [capped.cappedLogger, capped.cappedWriter]) {
        fresh();
        const f = join(d, `a-${make.name}.log`);
        fs.symlinkSync(victim, f);
        const log = make(f, 4096);
        log("hello\n");
        assert.equal(log.refused, "LOG-MODE-REFUSED", make.name + ": symlink log refused");
        untouched(make.name + " symlink log");
      }
      // Symlink at <file>.1.
      fresh();
      {
        const f = join(d, "b.log");
        fs.symlinkSync(victim, f + ".1");
        const log = capped.cappedLogger(f, 4096);
        for (let i = 0; i < 200; i++) log("z".repeat(60));
        assert.equal(log.refused, "LOG-MODE-REFUSED", "symlink .1 refused");
        untouched("symlink .1");
      }
      // Swapped for a symlink after open.
      fresh();
      {
        const f = join(d, "c.log");
        const log = capped.cappedLogger(f, 4096);
        log("first");
        assert.equal(log.refused, null);
        fs.rmSync(f); fs.symlinkSync(victim, f);
        log("second");
        assert.equal(log.refused, "LOG-MODE-REFUSED", "swapped-in symlink refused");
        untouched("swapped-in symlink");
      }
      // A plain log still works and stays 0600.
      {
        const f = join(d, "ok.log");
        const log = capped.cappedLogger(f, 4096);
        for (let i = 0; i < 200; i++) log("ok " + i);
        assert.equal(log.refused, null);
        assert.equal(fs.statSync(f).mode & 0o777, 0o600);
        assert.equal(fs.statSync(f + ".1").mode & 0o777, 0o600);
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(`verify-mesh-onboard: #357 LOWs ok (64 AZBot fuzz cases + 18 more on ${tested.join(", ") || "no awk"}; linear time; 256 KB reply cap; node dies with wrapper; no symlink follow)`);
}
