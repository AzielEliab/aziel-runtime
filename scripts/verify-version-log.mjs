/**
 * GitHub version log. The repo string 2.0.0-rc1 stays intact.
 * A strict X.Y.Z skip, Glama's listing counter, and heritage 1.6.2 are not the log.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { BUILD_GIT_SHA } from "../src/build-meta.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { incrementUse, memoryUsesKv, readUses } from "../src/uses.js";
import {
  githubIdentityFromEnv,
  githubIdentityLog,
  githubIdentityLogLine,
  readCheckoutGitSha,
  strictReleaseVersion,
} from "../src/version-log.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const glama = JSON.parse(readFileSync(new URL("../glama.json", import.meta.url), "utf8"));
const TIP = "584da805bb082e37a00bd2d1e9a5e7c1ef7183b5";

assert.equal(RUNTIME_VERSION, "2.0.0-rc1");
assert.equal(pkg.version, "2.0.0-rc1");
assert.equal(glama.version, "2.0.0-rc1");
assert.equal(strictReleaseVersion("2.0.0-rc1"), null);
assert.equal(strictReleaseVersion("v2.0.0-rc1"), null);
assert.equal(strictReleaseVersion("2.0.10"), "2.0.10");
assert.equal(strictReleaseVersion("1.6.2"), "1.6.2");

const logged = githubIdentityLog({ git_sha: TIP, git_sha_source: "deploy_var" });
assert.equal(logged.logged, true);
assert.equal(logged.version, "2.0.0-rc1");
assert.equal(logged.version.includes("-rc1"), true);
assert.notEqual(logged.version, "2.0.0");
assert.equal(logged.git_sha, TIP);
assert.equal(logged.git_sha_source, "deploy_var");
assert.equal(logged.prerelease_kept, true);
assert.equal(logged.strict_release_skipped, true);
assert.equal(githubIdentityLogLine(logged), `github version 2.0.0-rc1 git ${TIP}`);

const glamaCounter = githubIdentityLog({
  offered_version: "2.0.10",
  git_sha: TIP,
  git_sha_source: "deploy_var",
});
assert.equal(glamaCounter.version, "2.0.0-rc1");
assert.deepEqual(glamaCounter.rejected_versions, ["2.0.10"]);

const heritage = githubIdentityLog({ offered_version: "1.6.2" });
assert.equal(heritage.version, "2.0.0-rc1");
assert.deepEqual(heritage.rejected_versions, ["1.6.2"]);

const stripped = githubIdentityLog({ offered_version: "2.0.0" });
assert.equal(stripped.version, "2.0.0-rc1");
assert.deepEqual(stripped.rejected_versions, ["2.0.0"]);

const listingLabel = githubIdentityLog({ offered_version: "2.0.7" });
assert.equal(listingLabel.version, "2.0.0-rc1");
assert.deepEqual(listingLabel.rejected_versions, ["2.0.7"]);

const unbound = githubIdentityFromEnv({});
assert.equal(unbound.version, "2.0.0-rc1");
assert.equal(unbound.git_sha, null);
assert.notEqual(unbound.git_sha, BUILD_GIT_SHA);

const fromDeploy = githubIdentityFromEnv({ GIT_SHA: TIP });
assert.equal(fromDeploy.git_sha, TIP);
assert.equal(fromDeploy.git_sha_source, "deploy_var");

const fromGithub = githubIdentityFromEnv({ GITHUB_SHA: "a02b58d0945b6ebcabde4bbc33764dbcba0b349b" });
assert.equal(fromGithub.git_sha, "a02b58d0945b6ebcabde4bbc33764dbcba0b349b");
assert.equal(fromGithub.git_sha_source, "github_sha");

const badSha = githubIdentityFromEnv({ GIT_SHA: "2.0.10" });
assert.equal(badSha.git_sha, null);
assert.equal(badSha.version, "2.0.0-rc1");

const head = readCheckoutGitSha();
const expectedHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
assert.equal(head, expectedHead);
assert.match(head, /^[0-9a-f]{40}$/);
const checkout = githubIdentityLog({ git_sha: head, git_sha_source: "git_head" });
assert.equal(checkout.version, "2.0.0-rc1");
assert.equal(checkout.git_sha, head);

const kvEnv = { USES: memoryUsesKv(), GIT_SHA: TIP };
const row = await incrementUse(kvEnv, {
  host: "origin",
  method: "POST",
  path: "/mcp",
  status: 200,
  op: "mcp",
});
assert.equal(row.entry.version, "2.0.0-rc1");
assert.equal(row.entry.git_sha, TIP);
assert.equal(row.entry.git_sha_source, "deploy_var");
assert.equal(row.entry.version.includes("2.0.10"), false);

const snap = await readUses(kvEnv);
assert.equal(snap.version, "2.0.0-rc1");
assert.equal(snap.git_sha, TIP);
assert.equal(snap.git_sha_source, "deploy_var");
assert.equal(snap.recent[0].version, "2.0.0-rc1");
assert.equal(snap.recent[0].git_sha, TIP);

const quiet = { USES: memoryUsesKv() };
const quietRow = await incrementUse(quiet, { host: "origin", method: "GET", path: "/v1/skill", status: 200 });
assert.equal(quietRow.entry.version, "2.0.0-rc1");
assert.equal(quietRow.entry.git_sha, undefined);
assert.notEqual(quietRow.entry.git_sha, BUILD_GIT_SHA);
const quietSnap = await readUses(quiet);
assert.equal(quietSnap.version, "2.0.0-rc1");
assert.equal(quietSnap.git_sha, undefined);

console.log("ok github version log: 2.0.0-rc1 kept, commit recorded, Glama counter rejected");
