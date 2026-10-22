// LATTICE-TIEBREAK-1.0 (DRAFT): vectors, refusals, concurrency, legacy rows still verify.
import assert from "node:assert/strict";
import { planLattice, verifyLattice, latticeTiebreak, latticeOfflineSecondary, latticePrimary, latticeOnlineSecondary, LATTICE_GENESIS as Z } from "../src/dual-lattice.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const D = "a".repeat(64);
const row = (lattice) => ({ lattice });

// Vectors
const off = await latticeOfflineSecondary(D, "aziel");
ok(off === "7e1ea25d11c9c05dbb7844a69f83456fa56c7dbc67cadb913b16459e6e7a1a85", "offline secondary unchanged");
const raw = await sha256Hex(canonicalize({ chain: "tiebreak", prev: Z, primary: "b".repeat(64), secondary: off, username: "aziel" }));
const v1 = await latticeTiebreak({ prev: Z, primary: "b".repeat(64), secondary: off, username: "aziel" });
ok(v1 === raw, "tiebreak = H(canon{chain,prev,primary,secondary,username})");
ok(canonicalize({ chain: "tiebreak", prev: Z, primary: "p", secondary: "s", username: "u" }) === '{"chain":"tiebreak","prev":"' + Z + '","primary":"p","secondary":"s","username":"u"}', "key order chain,prev,primary,secondary,username");
console.log("vector tiebreak(prev=0, primary=b*64, secondary=off(a*64,aziel), aziel) =", v1);

// AZBot #327 MED: a plain offline write carries NO tiebreak block, so its stamp hash is unchanged.
const rows = [];
const a = await planLattice({ document_hash: D, offline: true, username: "aziel", rows });
ok(!("tiebreak" in a) && a.secondary === off, "plain offline row has no tiebreak block");
ok((await sha256Hex(canonicalize(a))) === "da4699ae6601623f928c1f41063e11812b5ca4fb7eb6f5bc33c13de8ef931f63", "offline lattice block hash pinned (pre-tiebreak value)");
{
  const { composeChainlockStamp } = await import("../src/chainlock/ops.js");
  const st = await composeChainlockStamp({ id: "cl_x", t: "2026-01-01T00:00:00.000Z", fact: "f", offline: true, username: "aziel" }, { prev: Z, rows: [] });
  ok(!("tiebreak" in st.lattice) && st.stamp_sha256 === "fb313787f0ee2edef54fb1748210d5132b52f4acc23df3160c365e8ea4621431", "offline stamp hash pinned (= main a4f8a17; draft ff7712f gave 215bf0b3)");
  const st2 = await composeChainlockStamp({ id: "cl_x", t: "2026-01-01T00:00:00.000Z", fact: "f", offline: true, username: "aziel", sync: true }, { prev: Z, rows: [] });
  ok(st2.stamp_sha256 === st.stamp_sha256, "sync flag on an offline row is ignored");
}
rows.push(row(a));
const s = await planLattice({ document_hash: D, sync: true, username: "aziel", rows });
ok(s.primary === (await latticePrimary(D, a.primary)) && s.secondary === (await latticeOnlineSecondary(s.primary, a.secondary)), "sync row primary/secondary rules unchanged");
ok(s.tiebreak.status === "synced" && s.tiebreak.prev === Z && s.tiebreak.offline_secondary === off, "synced block");
ok(s.tiebreak.hash === (await latticeTiebreak({ prev: Z, primary: s.primary, secondary: off, username: "aziel" })), "synced hash recomputes");
ok(s.username === null, "online row keeps username null");
rows.push(row(s));
await assert.rejects(planLattice({ document_hash: D, sync: true, username: "aziel", rows }), (e) => e.code === "LATTICE-DOUBLE"); checks++;
await assert.rejects(planLattice({ document_hash: D, offline: true, username: "aziel", rows }), (e) => e.code === "LATTICE-DOUBLE"); checks++;
await assert.rejects(planLattice({ document_hash: "c".repeat(64), sync: true, username: "aziel", rows }), (e) => e.code === "LATTICE-SYNC-NO-OFFLINE"); checks++;
await assert.rejects(planLattice({ document_hash: D, sync: true, username: "other", rows }), (e) => e.code === "LATTICE-SYNC-NO-OFFLINE"); checks++;
const v = await verifyLattice(rows);
ok(v.ok && v.tiebreak.synced_rows === 1 && v.tiebreak.tip === s.tiebreak.hash, "verify walks tiebreak");
// Tamper
const bad = JSON.parse(JSON.stringify(rows)); bad[1].lattice.tiebreak.hash = "f".repeat(64);
ok((await verifyLattice(bad)).breaks[0].reason === "tiebreak-miss", "tamper caught");

// Legacy rows (no tiebreak block) still verify, before and mixed
const legacy = [];
for (let i = 0; i < 5; i++) { const p = await planLattice({ document_hash: (i + 1).toString(16).repeat(64), rows: legacy }); legacy.push(row(p)); }
ok(legacy.every((r) => !("tiebreak" in r.lattice)), "online non-sync rows carry no tiebreak");
ok((await verifyLattice(legacy)).ok, "old rows verify");
const old = await verifyLattice([{ x: 1 }, ...legacy]);
ok(old.ok && old.legacy_rows === 1, "pre-lattice legacy rows still allowed");

// Concurrency: 12 users x 4 docs, each offline once, then 3 racing syncs per (user,doc) through a serialized writer.
const chain = [];
let q = Promise.resolve();
const write = (args) => { const run = q.then(async () => { const p = await planLattice({ ...args, rows: chain }); chain.push(row(p)); return p; }); q = run.catch(() => {}); return run; };
const docs = Array.from({ length: 4 }, (_, i) => (i + 3).toString(16).repeat(64));
const users = Array.from({ length: 12 }, (_, i) => `u${i}`);
await Promise.all(users.flatMap((u) => docs.map((d) => write({ document_hash: d, offline: true, username: u }))));
const res = await Promise.allSettled(users.flatMap((u) => docs.flatMap((d) => [0, 1, 2].map(() => write({ document_hash: d, sync: true, username: u })))));
const won = res.filter((r) => r.status === "fulfilled").length;
const dbl = res.filter((r) => r.status === "rejected" && r.reason.code === "LATTICE-DOUBLE").length;
ok(won === 48 && dbl === 96, `exactly one sync per (user,doc): ${won} ok, ${dbl} LATTICE-DOUBLE`);
const hashes = chain.map((r) => r.lattice.tiebreak && r.lattice.tiebreak.hash).filter(Boolean);
ok(new Set(hashes).size === 48, "0 duplicate tiebreak hashes");
ok(new Set(chain.map((r) => r.lattice.primary)).size === chain.length, "0 duplicate primary");
const cv = await verifyLattice(chain);
ok(cv.ok && cv.tiebreak.synced_rows === 48, "concurrent chain verifies");
console.log(`verify-lattice-tiebreak: ${checks} checks pass`);
