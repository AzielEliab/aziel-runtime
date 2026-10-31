#!/usr/bin/env node
/**
 * RIB-048 independent reproduction.
 *
 * Rebuilds the artifact digest from this source revision. The same files produce
 * the same digest. Builder identity is GITHUB_WORKFLOW + GITHUB_RUN_ID when both
 * are set (the CI job), and is otherwise absent. GIT_SHA and other deploy vars
 * are not the builder. This script does not sign the attestation.
 * Not live. Cap-7 is not ICANN. Paid satellite stays HELD.
 * Author: Aziel Eliab.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { artifactDigestFromEntries, checkBuildAttest } from "../src/build-attest.js";

const FILES = ["package.json", "package-lock.json", "src/build-attest.js", "src/build-meta.js"];

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function entries() {
  return FILES.map((path) => ({
    path,
    sha256: sha256(readFileSync(new URL("../" + path, import.meta.url))),
  }));
}

function sourceRevision() {
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim().toLowerCase();
    return /^[a-f0-9]{7,40}$/.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

const listed = entries();
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = process.env.GITHUB_WORKFLOW || null;
const runId = process.env.GITHUB_RUN_ID || null;
const artifact_digest = await artifactDigestFromEntries(listed);
const again = await artifactDigestFromEntries(entries());
if (again !== artifact_digest) {
  console.error("reproduction digest was not stable");
  process.exit(1);
}

const body = {
  spec: "AZRT-BUILD-ATTEST-1.0",
  live: false,
  signed: false,
  source_revision: sourceRevision(),
  build_environment: {
    lockfile_sha256: listed.find((e) => e.path === "package-lock.json").sha256,
    toolchain: {
      node: process.version,
      wrangler: (pkg.devDependencies && pkg.devDependencies.wrangler) || null,
    },
  },
  builder_identity: workflow && runId ? { workflow, run_id: runId } : null,
  builder_identity_source: workflow && runId ? "github-actions" : "absent",
  artifact_digest,
  artifact_kind: "source-manifest",
  cap7_is_icann: false,
  paid_sat: "HELD",
  note: "Same source revision, same digest. Not a signed attestation. Not live. Cap-7 is not ICANN. Paid satellite stays HELD.",
};

if (process.argv.includes("--mismatch")) {
  const flipped = listed.map((e, i) => (i === 0 ? { ...e, sha256: "0".repeat(64) } : e));
  const flippedDigest = await artifactDigestFromEntries(flipped);
  const verdict = checkBuildAttest({
    runningDigest: flippedDigest,
    witnessed: {
      artifact_digest,
      source_revision: body.source_revision,
      builder_identity: { workflow: "ci.yml", run_id: "1" },
    },
    deployVars: { GIT_SHA: "ignored", BUILDER_RUN_ID: "ignored" },
  });
  if (flippedDigest === artifact_digest || verdict.code !== "BUILD-ATTEST-MISMATCH" || verdict.view.builder_identity.run_id !== "1") {
    console.error("one-byte manifest change was not rejected");
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, code: verdict.code, artifact_digest, flipped_digest: flippedDigest, live: false, signed: false }));
} else {
  console.log(JSON.stringify(body, null, 2));
}
