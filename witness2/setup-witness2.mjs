#!/usr/bin/env node
/**
 * AZRT-WITNESS-QUORUM-1.0 slot 2 setup on Codeberg (Forgejo). Dry run unless --apply.
 *
 *   CODEBERG_TOKEN=... node witness2/setup-witness2.mjs [--owner AzielEliab] [--repo aziel-witness2] --apply
 *
 * Needs a Codeberg access token with scopes write:repository and write:user (repo create). The token is read
 * from the environment only, sent only in an Authorization header to codeberg.org, and never printed.
 * Steps (each idempotent): create the public repo, enable Actions, generate a fresh Ed25519 witness key IN
 * MEMORY, store the private half only as the repo Actions secret WITNESS2_ED25519_PKCS8 (no file, no copy),
 * push the kit (witness2/kit) with keys/witness2.pub, and print the two PUBLIC values for wrangler.toml.
 * If the repo already has keys/witness2.pub, no new key is made (rotate by hand; the log pins one key).
 * Author: Aziel Eliab.
 */
import { generateKeyPairSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://codeberg.org/api/v1";
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const owner = opt("--owner", "AzielEliab");
const repo = opt("--repo", "aziel-witness2");
const apply = args.includes("--apply");
const logUrl = `https://codeberg.org/${owner}/${repo}/raw/branch/main/anchors/log.jsonl`;
const kit = join(dirname(fileURLToPath(import.meta.url)), "kit");

if (!apply) {
  console.log(JSON.stringify({ dry_run: true, owner, repo, would: ["create repo (public)", "enable Actions", "generate Ed25519 key in memory", "PUT actions secret WITNESS2_ED25519_PKCS8", "push witness2/kit + keys/witness2.pub"], witness2_log_url: logUrl, needs: "CODEBERG_TOKEN (scopes write:repository, write:user)" }, null, 2));
  process.exit(0);
}
const token = process.env.CODEBERG_TOKEN;
if (!token) { console.error("CODEBERG_TOKEN is not set; nothing done"); process.exit(2); }
const h = { authorization: `token ${token}`, "content-type": "application/json", accept: "application/json" };
const api = async (method, path, body) => {
  const r = await fetch(API + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};

let r = await api("GET", `/repos/${owner}/${repo}`);
if (r.status === 404) {
  r = await api("POST", "/user/repos", { name: repo, private: false, auto_init: false, default_branch: "main", description: "Second witness for aziel-runtime (different key, host and provider; same account holder). AZRT-WITNESS-QUORUM-1.0 slot 2, designed to sign every 15 minutes once set up" });
  if (r.status !== 201) throw new Error(`repo create refused: HTTP ${r.status}`);
}
r = await api("PATCH", `/repos/${owner}/${repo}`, { has_actions: true });
if (r.status !== 200) throw new Error(`enable Actions refused: HTTP ${r.status}`);

const existing = await fetch(`https://codeberg.org/${owner}/${repo}/raw/branch/main/keys/witness2.pub`);
let pub = existing.ok ? (await existing.text()).trim() : null;
if (!pub) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  pub = publicKey.export({ format: "jwk" }).x;
  const der = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
  r = await api("PUT", `/repos/${owner}/${repo}/actions/secrets/WITNESS2_ED25519_PKCS8`, { data: der });
  if (r.status !== 201 && r.status !== 204) throw new Error(`secret store refused: HTTP ${r.status}; no key was kept`);
  const work = mkdtempSync(join(tmpdir(), "witness2-"));
  try {
    cpSync(kit, work, { recursive: true });
    writeFileSync(join(work, "keys", "witness2.pub"), pub + "\n");
    // The token goes to git through the environment (not argv, so it is not in the process list).
    const genv = { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: `Authorization: token ${token}`, GIT_TERMINAL_PROMPT: "0" };
    const git = (...a) => execFileSync("git", a, { cwd: work, env: genv, stdio: ["ignore", "ignore", "inherit"] });
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("-c", "user.name=AzielEliab", "-c", "user.email=AzielEliab@noreply.codeberg.org", "commit", "-q", "-m", "witness2 kit (AZRT-WITNESS-QUORUM-1.0 slot 2)");
    git("push", "-q", `https://codeberg.org/${owner}/${repo}.git`, "main");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
console.log(JSON.stringify({ ok: true, repo: `codeberg.org/${owner}/${repo}`, wrangler_vars: { WITNESS2_LOG_URL: logUrl, WITNESS2_PUBLIC_KEY: pub, WITNESS2_NAME: "codeberg" }, next: "Run the witness2 workflow once (workflow_dispatch), check the log URL serves a signed row, then add the three vars to wrangler.toml [vars] in a PR." }, null, 2));
