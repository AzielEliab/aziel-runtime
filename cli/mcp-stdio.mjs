#!/usr/bin/env node
/**
 * aziel-runtime stdio MCP — Glama / Claude Desktop entrypoint.
 *
 *   node cli/mcp-stdio.mjs
 *   npm run mcp
 *   aziel-runtime-mcp
 *
 * Default bridges to POST $AZIEL_RUNTIME_URL/mcp.
 * --local (or AZIEL_RUNTIME_MCP=local) runs the Worker /mcp handler in-process.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBridgeContext,
  interactiveHint,
  parseCliArgs,
  runStdioLoop,
  usage,
} from "../src/mcp-stdio.js";
import { githubIdentityLog, githubIdentityLogLine, readCheckoutGitSha } from "../src/version-log.js";

async function main() {
  const { flags, rest } = parseCliArgs(process.argv.slice(2));
  if (flags.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (rest.length) {
    process.stderr.write(`Unknown argument "${rest[0]}".\nNext: aziel-runtime-mcp --help\n`);
    process.exit(1);
  }
  if (process.stdin.isTTY) {
    process.stderr.write(interactiveHint());
  }
  const ctx = createBridgeContext({ flags });
  if (ctx.local) {
    // RIB-039: in-process receipts name this resolved module file and its sha256.
    const { setLocalServerIdentity } = await import("../src/server-provenance.js");
    setLocalServerIdentity(await resolveServerFile(process.argv[1] || self));
  }
  const identity = githubIdentityLog({
    git_sha: readCheckoutGitSha(),
    git_sha_source: "git_head",
  });
  ctx.log(githubIdentityLogLine(identity));
  ctx.log(
    `aziel-runtime-mcp ${ctx.local ? "local" : "bridge"} ${ctx.local ? "in-process" : ctx.url + "/mcp"}`,
  );
  if (!ctx.local) {
    ctx.log("aziel-runtime-mcp egress: outbound DNS + HTTPS to *.vibelock.workers.dev / Cloudflare");
  }
  process.stdin.resume();
  await runStdioLoop({ ctx });
}

const self = fileURLToPath(import.meta.url);

/** Resolve the executable/module file (symlinks followed) and hash it. Null with a reason on failure. */
export async function resolveServerFile(file) {
  try {
    const { realpath, readFile } = await import("node:fs/promises");
    const { createHash } = await import("node:crypto");
    const path = await realpath(resolve(file));
    const sha256 = createHash("sha256").update(await readFile(path)).digest("hex");
    return { path, sha256, reason: null };
  } catch (err) {
    return { path: null, sha256: null, reason: String((err && err.code) || (err && err.message) || err).slice(0, 120) };
  }
}
if (process.argv[1] && resolve(process.argv[1]) === self) {
  main().catch((err) => {
    process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
    process.exit(1);
  });
}

export { main };
