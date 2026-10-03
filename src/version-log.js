/**
 * GitHub identity log for aziel-runtime.
 *
 * The repo version is RUNTIME_VERSION (2.0.0-rc1). The prerelease suffix stays.
 * A strict X.Y.Z parser skips that string. Glama's listing counter and a
 * heritage semver are not substituted in its place.
 * git_sha is a real hex commit from GIT_SHA, GITHUB_SHA, or an explicit sha.
 * A missing sha stays null. The baked build-meta pin is not copied here.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { execFileSync } from "node:child_process";
import pkg from "../package.json" with { type: "json" };

/** GitHub package version. Prerelease suffix is part of the identity. */
export const GITHUB_VERSION = String(pkg.version || "");

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Strict release token. 2.0.0-rc1 does not match, so a logger that keeps
 * only this form never records the GitHub version.
 */
export function strictReleaseVersion(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^v/i, "");
  if (!/^\d+\.\d+\.\d+$/.test(s)) return null;
  return s;
}

export function sanitizeLoggedGitSha(raw) {
  const s = String(raw || "").trim();
  if (!SHA_RE.test(s)) return null;
  return s.toLowerCase();
}

/**
 * Record the GitHub identity. version is always the repo string.
 * offered_version is kept only on rejected_versions when it differs.
 */
export function githubIdentityLog({
  git_sha = null,
  git_sha_source = null,
  offered_version = null,
} = {}) {
  const version = GITHUB_VERSION;
  const offered = offered_version == null || offered_version === "" ? null : String(offered_version).trim();
  const rejected = [];
  if (offered && offered !== version) rejected.push(offered);
  const sha = sanitizeLoggedGitSha(git_sha);
  let source = null;
  if (sha) {
    const named = String(git_sha_source || "").trim();
    source = named || "given";
  }
  return {
    version,
    git_sha: sha,
    git_sha_source: source,
    prerelease_kept: version.includes("-"),
    strict_release_skipped: strictReleaseVersion(version) == null,
    rejected_versions: rejected,
    logged: true,
  };
}

/** Prefer the deploy var, then GITHUB_SHA. Never invent a sha. */
export function githubIdentityFromEnv(env = {}) {
  const deploy = sanitizeLoggedGitSha(env && env.GIT_SHA);
  if (deploy) return githubIdentityLog({ git_sha: deploy, git_sha_source: "deploy_var" });
  const github = sanitizeLoggedGitSha(env && env.GITHUB_SHA);
  if (github) return githubIdentityLog({ git_sha: github, git_sha_source: "github_sha" });
  return githubIdentityLog({});
}

/** Checkout HEAD when git is available. Null in a Worker or a copy without .git. */
export function readCheckoutGitSha(cwd) {
  try {
    const out = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: cwd || undefined,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return sanitizeLoggedGitSha(out);
  } catch {
    return null;
  }
}

export function githubIdentityLogLine(record) {
  const rec = record && record.version ? record : githubIdentityLog(record || {});
  return rec.git_sha ? `github version ${rec.version} git ${rec.git_sha}` : `github version ${rec.version}`;
}
