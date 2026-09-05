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
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBridgeContext,
  parseCliArgs,
  runStdioLoop,
  usage,
} from "../src/mcp-stdio.js";

async function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  if (flags.help) {
    process.stderr.write(usage());
    process.exit(0);
  }
  const ctx = createBridgeContext({ flags });
  ctx.log(
    `aziel-runtime-mcp ${ctx.local ? "local" : "bridge"} ${ctx.local ? "in-process" : ctx.url + "/mcp"}`,
  );
  process.stdin.resume();
  await runStdioLoop({ ctx });
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  main().catch((err) => {
    process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
    process.exit(1);
  });
}

export { main };
