/**
 * Credibility / inspectability gates — files exist, source is unminified,
 * advertised install is not curl|bash, LICENSE is Apache-2.0.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "../src/index.js";
import { pullRecord } from "../src/runtime-api.js";
import { softwareCatalog } from "../src/software-catalog.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const license = read("LICENSE");
assert.match(license, /Apache License/);
assert.match(license, /Version 2\.0/);
assert.match(read("NOTICE"), /Aziel Eliab/);
assert.match(read("package.json"), /"license": "Apache-2\.0"/);

const wrangler = read("wrangler.toml");
assert.match(wrangler, /^main = "src\/index\.js"/m);
assert.doesNotMatch(wrangler, /^\s*minify\s*=\s*true/m);

const mapped = [
  "src/index.js",
  "src/fraggate/door.js",
  "src/fraggate/registry.js",
  "src/fraggate/codes.js",
  "src/mcp-surface.js",
  "src/mcp-schema.js",
  "src/session-core.js",
  "src/software-catalog.js",
  "src/software-copy.js",
  "src/library-receipts.js",
  "src/remote-transport.js",
  "src/mcp-stdio.js",
];
const inspect = read("docs/2.0/INSPECT.md");
for (const rel of mapped) {
  const src = read(rel);
  const lines = src.split("\n");
  assert.ok(lines.length > 20, `${rel} looks collapsed`);
  assert.ok(src.includes("\n"), `${rel} must be multi-line`);
  assert.match(src, /SPDX-License-Identifier: Apache-2\.0/, `${rel} SPDX`);
  assert.ok(!/^[^\n]{8000,}$/.test(src), `${rel} must not be a single minified line`);
  assert.match(inspect, new RegExp(rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `INSPECT.md maps ${rel}`);
  assert.ok(statSync(join(root, rel)).size > 400, `${rel} too small to be the handler`);
}

assert.match(read("docs/2.0/TESTS.md"), /npm test/);
assert.match(read("docs/GOVERNANCE.md"), /Agent-assisted/);
assert.match(read("docs/DATA.md"), /USES/);
assert.match(read("README.md"), /docs\/2\.0\/INSPECT\.md/);

const origin = "https://aziel-runtime.example";
const fold = PRODUCTS.find((p) => p.slug === "foldlock");
const pull = pullRecord(fold, origin, "# FoldLock\n\npreview");
assert.ok(pull.install.endsWith("/install.sh"));
assert.match(pull.install_sh, /install\.sh/);
assert.doesNotMatch(pull.install_sh, /\|\s*bash/);
assert.ok(pull.install_inspect && Array.isArray(pull.install_inspect.steps));
assert.equal(pull.install_inspect.steps.length, 3);

const catalog = softwareCatalog(origin, PRODUCTS, { runtimeVersion: "2.0.0-rc1", updated_at: "2026-09-20" });
assert.equal(catalog.ok, true);
assert.ok(Array.isArray(catalog.software) && catalog.software.length > 10);
for (const card of catalog.software) {
  assert.equal(typeof card.slug, "string");
  assert.equal(typeof card.name, "string");
  assert.match(card.bucket, /^(plain|gate|lock)$/);
  assert.match(card.status, /^(live|stub|local_only)$/);
  assert.equal(typeof card.one_line, "string");
  assert.ok(card.one_line.length > 8, `${card.slug} one_line`);
}

console.log(`ok inspect: ${mapped.length} unminified sources, Apache-2.0, auditable install`);
