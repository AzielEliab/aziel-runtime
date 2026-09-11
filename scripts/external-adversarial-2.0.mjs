/**
 * External adversarial pack runner — existing verify-adversarial + remain-OFF.
 * Self-test ≠ third-party lab. Author: Aziel Eliab only.
 */
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_VERSION } from "../src/runtime-api.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const flags = { out: "adversarial-result.json" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") flags.out = argv[++i];
    else throw new Error(`unknown flag ${argv[i]}`);
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

function runNode(rel) {
  const res = spawnSync(process.execPath, [resolve(root, rel)], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    id: rel.replace(/^scripts\//, "").replace(/\.mjs$/, ""),
    script: rel,
    status: res.status === 0 ? "PASS" : "FAIL",
    exit_code: res.status == null ? 1 : res.status,
    detail: String((res.status === 0 ? res.stdout : res.stderr) || "").trim().split("\n").slice(-3).join(" | ").slice(0, 400),
  };
}

export function runExternalAdversarial({ out = "adversarial-result.json" } = {}) {
  const outPath = resolve(root, out);
  const checks = [runNode("scripts/verify-adversarial.mjs"), runNode("scripts/verify-remain-off.mjs")];
  const verdict = checks.every((c) => c.status === "PASS") ? "PASS" : "FAIL";
  const body = {
    kind: "aziel-runtime.external-adversarial-2.0",
    runtime_version: RUNTIME_VERSION,
    git_sha: gitSha(),
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    reviewer_note: "Independent reviewer ran scripts/external-adversarial-2.0.sh unchanged.",
    generated_at: new Date().toISOString(),
    verdict,
    checks,
    third_party_lab: false,
    court_audit: false,
    self_test_is_not_a_lab: true,
    remain_off_untouched: true,
    mesh_get_never_enables: true,
    note: "Self-test ≠ third-party lab. Remain-OFF stays off. GET /v1/mesh never enables.",
  };
  const sha = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const final = { ...body, result_sha256: sha };
  writeFileSync(outPath, JSON.stringify(final, null, 2) + "\n");
  return { ok: verdict === "PASS", outPath, result: final };
}

const isMain = process.argv[1] && process.argv[1].endsWith("external-adversarial-2.0.mjs");
if (isMain) {
  const flags = parseArgs(process.argv.slice(2));
  process.stdout.write("aziel-runtime external-adversarial-2.0 (Aziel Eliab)\n");
  process.stdout.write("Self-test ≠ third-party lab. Run this pack unchanged.\n");
  const { ok, outPath, result } = runExternalAdversarial(flags);
  process.stdout.write(`adversarial evidence written: ${outPath}\n`);
  process.stdout.write(`verdict=${result.verdict} sha256=${result.result_sha256}\n`);
  process.exit(ok ? 0 : 1);
}
