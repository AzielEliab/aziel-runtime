/**
 * Recompute engine_digest from vendored artifact bytes and write src/engines/digests.js values.
 * Used by tests to refuse a stale embed.
 */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { digestArtifactBytes, ENGINE_ARTIFACTS, ENGINE_DIGESTS } from "../src/engines/digest.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enginesDir = join(root, "src/engines");

export async function computeDigests() {
  const out = {};
  for (const [slug, files] of Object.entries(ENGINE_ARTIFACTS)) {
    const fileBytesByPath = {};
    for (const rel of files) {
      fileBytesByPath[rel] = await readFile(join(enginesDir, rel));
    }
    out[slug] = await digestArtifactBytes(fileBytesByPath);
  }
  return out;
}

export async function writeDigests(digests) {
  const path = join(enginesDir, "digest.js");
  let src = await readFile(path, "utf8");
  const block = Object.entries(digests)
    .map(([slug, hex]) => `  ${JSON.stringify(slug)}: "${hex}",`)
    .join("\n");
  const next = src.replace(
    /export const ENGINE_DIGESTS = \{[\s\S]*?\};/,
    `export const ENGINE_DIGESTS = {\n${block}\n};`,
  );
  if (next === src) throw new Error("ENGINE_DIGESTS block not found in digest.js");
  await writeFile(path, next, "utf8");
}

export async function assertDigestsFresh() {
  const computed = await computeDigests();
  const stale = [];
  for (const [slug, hex] of Object.entries(computed)) {
    assert.match(hex, /^[a-f0-9]{64}$/, slug);
    if (ENGINE_DIGESTS[slug] !== hex) stale.push({ slug, expected: hex, embedded: ENGINE_DIGESTS[slug] });
  }
  return { computed, stale };
}

const isMain = process.argv[1] && process.argv[1].endsWith("hash-engines.mjs");
if (isMain) {
  const { computed, stale } = await assertDigestsFresh();
  if (stale.length) {
    if (process.argv.includes("--write")) {
      await writeDigests(computed);
      console.log("updated src/engines/digest.js ENGINE_DIGESTS");
    } else {
      console.error("stale ENGINE_DIGESTS — run: node scripts/hash-engines.mjs --write");
      for (const row of stale) console.error(JSON.stringify(row));
      process.exit(1);
    }
  }
  for (const [slug, hex] of Object.entries(computed)) {
    console.log(`${slug} ${hex}`);
  }
}
