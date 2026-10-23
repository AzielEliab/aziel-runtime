// RECEIPT-LEVEL-1.0 (lattice plan step 5): optional level + software tags on ChainLock stamps.
// Old hashes unchanged; 42 software slugs x 3 levels -> 0 duplicates; verify ok.
// Slugs are synthetic (sw-01..sw-42): this test does not read or change the Softwares registry.
import assert from "node:assert/strict";
import { composeChainlockStamp, saveChain, verify, receiptTags, stampSha256, RECEIPT_LEVELS, RECEIPT_RESERVED_FIELDS } from "../src/chainlock/ops.js";
import { verifyLattice } from "../src/dual-lattice.js";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const G = "0".repeat(64);
const FIX = { c: "learn", k: "fact", s: "golden", f: "golden fact", id: "cl_000000000000000000000000", t: "2026-10-22T00:00:00.000Z" };

// 1. Golden: an untagged stamp hashes exactly as on main 2d181b9.
const gold = await composeChainlockStamp(FIX, { prev: G, rows: [] });
ok(gold.stamp_sha256 === "8acf162a0191bff39b9b674c6c05fa5ff7aeb2e2c34a223b03394fa27e382362", "golden stamp unchanged");
ok(gold.lattice.document_hash === "62a48d3e0adf9656489e173a8723b3f5187b3a23db41466b3a5e2d4afde35b86", "golden document hash unchanged");
ok(!("level" in gold) && !("software" in gold), "no tags when absent");
// Invalid tags are dropped, so hashes stay golden.
const bad = await composeChainlockStamp({ ...FIX, level: "kernel", software: "Bad Slug!" }, { prev: G, rows: [] });
ok(bad.stamp_sha256 === gold.stamp_sha256, "invalid tags dropped");
ok(JSON.stringify(receiptTags({ level: " UI ", software: "AZ-OS" })) === '{"level":"ui","software":"az-os"}', "normalized");
ok(RECEIPT_LEVELS.length === 3 && RECEIPT_RESERVED_FIELDS.includes("tiebreak"), "levels + reserved tie-break name");
const tb = await composeChainlockStamp({ ...FIX, tiebreak: "x" }, { prev: G, rows: [] });
ok(tb.stamp_sha256 === gold.stamp_sha256 && !("tiebreak" in tb), "tie-break chain not built");

// 2. 42 x 3 chained rows, online and offline.
const rows = [];
for (let i = 1; i <= 42; i++) {
  for (const level of RECEIPT_LEVELS) {
    const src = { c: "learn", k: "fact", s: "lvl", f: `same text`, level, software: `sw-${String(i).padStart(2, "0")}` };
    if (rows.length % 2) Object.assign(src, { offline: true, username: "aziel" });
    const prev = rows.length ? rows[rows.length - 1].stamp_sha256 : G;
    const st = await composeChainlockStamp(src, { prev, rows });
    ok(st.level === level && st.software === src.software, "tags stored");
    ok((await stampSha256(st)) === st.stamp_sha256, "stamp recomputes");
    rows.push(st);
  }
}
const uniq = (xs) => new Set(xs).size === xs.length;
ok(rows.length === 126, "126 rows");
ok(uniq(rows.map((r) => r.stamp_sha256)), "0 dup stamp");
ok(uniq(rows.map((r) => r.lattice.document_hash)), "0 dup document (tags separate same text per level/software)");
ok(uniq(rows.map((r) => r.lattice.primary)), "0 dup primary");
ok(uniq(rows.map((r) => r.lattice.secondary)), "0 dup secondary");
const lat = await verifyLattice(rows);
ok(lat.ok && lat.lattice_rows === 126, "lattice verify ok");
// An offline repeat of the same tagged document refuses LATTICE-DOUBLE.
const dup = rows.find((r) => r.lattice.offline);
await assert.rejects(composeChainlockStamp({ c: "learn", k: "fact", s: "lvl", f: "same text", level: dup.level, software: dup.software, offline: true, username: "aziel" }, { prev: rows.at(-1).stamp_sha256, rows }), (e) => e.code === "LATTICE-DOUBLE");
checks++;

// 3. Mixed legacy + tagged chain verifies through the public verify.
const m = new Map();
const store = { get: async (k) => m.get(k) ?? null, put: async (k, v) => void m.set(k, v) };
const g0 = await composeChainlockStamp({ c: "learn", k: "fact", s: "x", f: "untagged" }, { prev: "GENESIS", rows: [] });
const mixed = [g0];
const t1 = await composeChainlockStamp({ c: "learn", k: "fact", s: "x", f: "tagged", level: "interface", software: "azinterface" }, { prev: g0.stamp_sha256, rows: mixed });
mixed.push(t1);
await saveChain(store, "learn", mixed);
const v = await verify(store, { c: "learn" });
if (!v.ok) console.error(JSON.stringify(v).slice(0, 1500));
ok(v.ok === true, "verify ok on legacy + tagged rows");

console.log(`verify-receipt-level: ${checks} checks pass`);
