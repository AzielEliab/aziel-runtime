/**
 * AZNews ↔ 4DMap integration honesty: doc present, catalog caps, path exports agree.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { listSoftwareEntries } from "../src/software-catalog.js";
import { PRODUCTS } from "../src/index.js";
import { aznewsJoinCard, AZNEWS_ABSENT_CODE, AZNEWS_ABSENT_MODULE } from "../src/engines/4dmap/aznews.js";
import { LIVE_OPS } from "../src/fraggate/registry.js";

const docPath = fileURLToPath(new URL("../docs/audit/AZNEWS-4DMAP-INTEGRATION-HONESTY.md", import.meta.url));
const doc = fs.readFileSync(docPath, "utf8");

for (const needle of [
  "42",
  "36",
  "news_ingest",
  "news_pin",
  "news_open",
  "AZNEWS-SOURCE-ABSENT",
  "library_pin",
  "AZNEWS-NOT-LIBRARY",
  "separate public AZNews repository",
  "Residual gaps",
]) {
  assert.match(doc, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `doc mentions ${needle}`);
}

assert.equal(listSoftwareEntries(PRODUCTS, "https://rt.example").length, 42);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PUBLIC_MCP_TOOLS.includes("news_pin"), false);
assert.equal(listSoftwareEntries(PRODUCTS, "https://rt.example").some((r) => r.slug === "aznews"), false);

const card = aznewsJoinCard();
assert.equal(card.standalone, true);
assert.equal(card.joined_into, "4dmap");
assert.equal(card.software_tab, false);
assert.equal(card.mcp_tool, false);
assert.equal(card.paths.standalone.op, "news_ingest");
assert.deepEqual(card.paths.joined.ops, ["news_pin", "news_open"]);
assert.equal(card.library_map_is_aznews, false);

const live4d = LIVE_OPS["4dmap"];
for (const op of ["news_status", "news_ingest", "news_pin", "news_open"]) {
  assert.ok(live4d.includes(op), `4dmap LIVE_OPS includes ${op}`);
}

assert.equal(AZNEWS_ABSENT_CODE, "AZNEWS-SOURCE-ABSENT");
assert.match(AZNEWS_ABSENT_MODULE, /aznews-source\.js$/);

console.log("ok aznews-4dmap-honesty");
