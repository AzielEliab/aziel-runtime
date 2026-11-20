#!/usr/bin/env node
/**
 * Hash a wrangler dry-run outdir. Writes provenance JSON (bundle sha256, git sha).
 * Does not deploy and does not read a secret.
 * Author: Aziel Eliab.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const outdir = process.argv[2];
const dest = process.argv[3] || "provenance/bundle.json";
if (!outdir) {
  console.error("usage: node scripts/bundle-provenance.mjs <outdir> [provenance.json]");
  process.exit(1);
}

function filesUnder(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...filesUnder(path, base));
    else out.push(relative(base, path).split("\\").join("/"));
  }
  return out;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const files = filesUnder(outdir).map((path) => {
  const bytes = readFileSync(join(outdir, path));
  return { path, sha256: sha256(bytes), bytes: bytes.length };
});
const bundle = sha256(files.map((f) => f.path + "\n" + f.sha256 + "\n").join(""));
let git_sha = null;
try {
  git_sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
} catch {
  git_sha = process.env.GITHUB_SHA || null;
}
const body = {
  spec: "AZRT-BUNDLE-PROVENANCE-1.0",
  bundle_sha256: bundle,
  git_sha,
  outdir,
  files,
  live: false,
  signed: false,
  cap7_is_icann: false,
  paid_sat: "HELD",
  note: "sha256 of the wrangler dry-run outdir. Not a deploy. Not the runtime source-manifest digest.",
};
mkdirSync(dest.includes("/") ? dest.slice(0, dest.lastIndexOf("/")) : ".", { recursive: true });
writeFileSync(dest, JSON.stringify(body, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, bundle_sha256: bundle, git_sha, files: files.length, dest }));
