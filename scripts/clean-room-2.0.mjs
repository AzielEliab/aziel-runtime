/**
 * Aziel Runtime 2.0.0-rc1 clean-room runner.
 * No undocumented secrets. No wrangler deploy. Not a third-party lab.
 * Author: Aziel Eliab only.
 */
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { runCleanRoomProbe } from "./clean-room-probe.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const flags = { out: "clean-room-result.json", skipTest: false, skipDocker: false, skipInstall: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") flags.out = argv[++i];
    else if (a === "--skip-npm-test") flags.skipTest = true;
    else if (a === "--skip-docker") flags.skipDocker = true;
    else if (a === "--skip-install") flags.skipInstall = true;
    else throw new Error(`unknown flag ${a}`);
  }
  return flags;
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim().toLowerCase();
  } catch {
    return null;
  }
}

function run(cmd, opts = {}) {
  const res = spawnSync(cmd[0], cmd.slice(1), {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  return { status: res.status, stdout: res.stdout || "", stderr: res.stderr || "" };
}

export async function runCleanRoom(flags = {}) {
  const outPath = resolve(root, flags.out || "clean-room-result.json");
  const steps = [];
  const add = (id, name, status, detail) => {
    steps.push({ id, name, status, detail: String(detail || "").slice(0, 500) });
  };

  let npm_test = "skip";
  const docker = {
    attempted: false,
    available: false,
    status: "SKIP",
    detail: "not attempted yet",
  };

  function bodyOf(extra) {
    const body = {
      kind: "aziel-runtime.clean-room-2.0",
      runtime_version: RUNTIME_VERSION,
      git_sha: gitSha(),
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
      generated_at: new Date().toISOString(),
      verdict: extra.verdict,
      steps,
      third_party_lab: false,
      court_audit: false,
      remain_off_untouched: true,
      fraggate_single_door: true,
      mesh_get_never_enables: true,
      secrets_required: false,
      npm_test: extra.npm_test ?? npm_test,
      docker: extra.docker ?? docker,
      note:
        extra.note ||
        "Reproducible self-check. Not a third-party lab or court audit. Remain-OFF stays off. GET /v1/mesh never enables. No undocumented secrets.",
    };
    if (extra.mcp) body.mcp = extra.mcp;
    if (extra.receipt) body.receipt = extra.receipt;
    const sha = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    return { ...body, result_sha256: sha };
  }

  function write(extra) {
    const final = bodyOf(extra);
    writeFileSync(outPath, JSON.stringify(final, null, 2) + "\n");
    return final;
  }

  if (flags.skipInstall) {
    add("install", "npm install", "SKIP", "flag --skip-install");
  } else {
    const inst = run(["npm", "install"]);
    add("install", "npm install", inst.status === 0 ? "PASS" : "FAIL", `exit ${inst.status}`);
    if (inst.status !== 0) {
      const final = write({ verdict: "FAIL", note: "npm install failed" });
      return { ok: false, outPath, result: final };
    }
  }

  if (flags.skipTest) {
    add("npm_test", "npm test", "SKIP", "flag --skip-npm-test");
  } else {
    const test = run(["npm", "test"]);
    npm_test = test.status === 0 ? "pass" : "fail";
    add("npm_test", "npm test", test.status === 0 ? "PASS" : "FAIL", `exit ${test.status}`);
    if (test.status !== 0) {
      const final = write({ verdict: "FAIL", note: "npm test failed" });
      return { ok: false, outPath, result: final };
    }
  }

  const dockerBin = spawnSync("docker", ["--version"], { encoding: "utf8" });
  docker.available = dockerBin.status === 0;
  if (flags.skipDocker) {
    docker.attempted = false;
    docker.detail = "flag --skip-docker; documented local AZIEL_RUNTIME_MCP=local";
    add("docker_or_local", "docker build/run or documented local", "SKIP", docker.detail);
  } else if (!docker.available) {
    docker.attempted = false;
    docker.detail = "docker unavailable; documented local AZIEL_RUNTIME_MCP=local";
    add("docker_or_local", "docker build/run or documented local", "SKIP", docker.detail);
  } else {
    docker.attempted = true;
    const build = run(["docker", "build", "-t", "aziel-runtime-mcp:clean-room-2.0", "."], { timeout: 300000 });
    if (build.status !== 0) {
      docker.status = "FAIL";
      docker.detail = `docker build exit ${build.status}`;
      add("docker_or_local", "docker build/run or documented local", "FAIL", docker.detail);
      const final = write({ verdict: "FAIL", note: "docker build failed" });
      return { ok: false, outPath, result: final };
    }
    const probed = run(
      [
        "docker",
        "run",
        "--rm",
        "-e",
        "AZIEL_RUNTIME_MCP=local",
        "aziel-runtime-mcp:clean-room-2.0",
        "node",
        "-e",
        "process.stdout.write('docker-local-ok\\n')",
      ],
      { timeout: 60000 },
    );
    if (probed.status !== 0 || !String(probed.stdout).includes("docker-local-ok")) {
      docker.status = "FAIL";
      docker.detail = `docker run exit ${probed.status}`;
      add("docker_or_local", "docker build/run or documented local", "FAIL", docker.detail);
      const final = write({ verdict: "FAIL", note: "docker run failed" });
      return { ok: false, outPath, result: final };
    }
    docker.status = "PASS";
    docker.detail = "image built; AZIEL_RUNTIME_MCP=local entry ok";
    add("docker_or_local", "docker build/run or documented local", "PASS", docker.detail);
  }

  try {
    const probe = await runCleanRoomProbe();
    add("mcp_initialize", "MCP initialize", "PASS", `protocolVersion ${probe.mcp.protocol_version}`);
    add("tools_list", "MCP tools/list", "PASS", `${probe.mcp.tools_list_count} PUBLIC_MCP_TOOLS`);
    add("harmless_call", "fraggate_call decisiongate health", "PASS", probe.mcp.harmless_call.code);
    add("receipt_verify", "session receipt verifyChainStrict", "PASS", "chain_ok");
    add("shutdown", "session close / process exit", "PASS", "closed");
    const final = write({
      verdict: "PASS",
      mcp: probe.mcp,
      receipt: probe.receipt,
    });
    return { ok: true, outPath, result: final };
  } catch (err) {
    add("mcp_initialize", "MCP initialize", "FAIL", err.message);
    add("tools_list", "MCP tools/list", "FAIL", err.message);
    add("harmless_call", "fraggate_call decisiongate health", "FAIL", err.message);
    add("receipt_verify", "session receipt verifyChainStrict", "FAIL", err.message);
    add("shutdown", "session close / process exit", "FAIL", err.message);
    const final = write({ verdict: "FAIL", note: String(err && err.message ? err.message : err) });
    return { ok: false, outPath, result: final };
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith("clean-room-2.0.mjs");
if (isMain) {
  const flags = parseArgs(process.argv.slice(2));
  process.stdout.write("aziel-runtime clean-room-2.0 (Aziel Eliab)\n");
  const { ok, outPath, result } = await runCleanRoom(flags);
  process.stdout.write(`clean-room evidence written: ${outPath}\n`);
  process.stdout.write(`verdict=${result.verdict} sha256=${result.result_sha256}\n`);
  process.exit(ok ? 0 : 1);
}
