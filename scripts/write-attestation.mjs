/**
 * Write an independent-validation attestation JSON + JUnit summary.
 * Not a third-party lab. Author: Aziel Eliab only.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_VERSION } from "../src/runtime-api.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function gitSha() {
  const envSha = String(process.env.GITHUB_SHA || process.env.GIT_SHA || "").trim();
  if (/^[0-9a-f]{7,40}$/i.test(envSha)) return envSha.toLowerCase();
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim().toLowerCase();
  } catch {
    return null;
  }
}

export function buildAttestation({
  npm_test = "pass",
  exit_code = 0,
  git_sha = gitSha(),
  generated_at = new Date().toISOString(),
} = {}) {
  const body = {
    kind: "aziel-runtime.independent-validation",
    runtime_version: RUNTIME_VERSION,
    git_sha,
    npm_test,
    exit_code,
    generated_at,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    third_party_lab: false,
    court_audit: false,
    note: "Published reproducible self-check. Not a third-party lab or court audit. Remain-OFF stays off. GET /v1/mesh never enables.",
  };
  const canonical = JSON.stringify(body);
  const sha256 = createHash("sha256").update(canonical).digest("hex");
  return { ...body, attestation_sha256: sha256 };
}

export function junitXml(attestation) {
  const ok = attestation.npm_test === "pass" && Number(attestation.exit_code) === 0;
  const fail = ok
    ? ""
    : `<failure message="npm test ${attestation.npm_test}">exit_code=${attestation.exit_code}</failure>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="aziel-runtime.independent-validation" tests="1" failures="${ok ? 0 : 1}" time="0">
  <testcase classname="aziel-runtime" name="npm test ${attestation.runtime_version}" time="0">${fail}</testcase>
  <properties>
    <property name="runtime_version" value="${attestation.runtime_version}"/>
    <property name="git_sha" value="${attestation.git_sha || ""}"/>
    <property name="attestation_sha256" value="${attestation.attestation_sha256}"/>
    <property name="third_party_lab" value="false"/>
  </properties>
</testsuite>
`;
}

const isMain = process.argv[1] && process.argv[1].endsWith("write-attestation.mjs");
if (isMain) {
  const outIdx = process.argv.indexOf("--out");
  const out = resolve(root, outIdx >= 0 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : "attestation.json");
  const junitOut = out.replace(/\.json$/i, ".junit.xml");
  const fail = process.argv.includes("--fail");
  const attestation = buildAttestation({
    npm_test: fail ? "fail" : "pass",
    exit_code: fail ? 1 : 0,
  });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(attestation, null, 2) + "\n");
  writeFileSync(junitOut, junitXml(attestation));
  console.log(out);
  console.log(junitOut);
}
