#!/usr/bin/env node
/**
 * Optional local jail: run one engine op in a child Node process, then exit.
 * Stdin: { slug, op, payload }
 * Stdout: executeLocal result JSON
 * Author: Aziel Eliab.
 */
import { executeLocal } from "./runner.js";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

const body = await readStdin();
const out = await executeLocal({
  slug: body.slug,
  op: body.op,
  payload: body.payload,
  ranIn: "local-jail",
});
if (!out) {
  process.stdout.write(
    JSON.stringify({
      error: "no local engine",
      slug: body.slug,
      op: body.op,
      mode: "proxy_fallback",
      true_engine_runtime: false,
    }) + "\n",
  );
  process.exit(2);
}
process.stdout.write(JSON.stringify(out) + "\n");
