/** TETHER-REFUSALS-1.0: pushAll sends the internal refusals chain to AZ-OS, signed and verified like the roster. */
import assert from "node:assert/strict";
import { pushAll, tetherKey, TETHER_CHAINS, TETHER_REFUSAL_CHAIN, TETHER_ROUTE } from "../src/azos-tether.js";
import { REFUSAL_CHAIN, sealRefusal } from "../src/receipt-guard.js";
import { ROSTER } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { verifyLattice, LATTICE_GENESIS } from "../src/dual-lattice.js";
let n = 0;
assert.equal(TETHER_REFUSAL_CHAIN, REFUSAL_CHAIN); n++;
assert.ok(TETHER_CHAINS.includes("refusals")); n++;
for (const c of ROSTER) assert.ok(TETHER_CHAINS.includes(c), c);
n++;
const env = { TETHER_SIGNING_SEED: "22".repeat(32) /* test-only seed */, GIT_SHA: "b".repeat(40) };
const key = await tetherKey(env);
const state = new Map();
const posts = [];
const fetcher = async (url, init = {}) => {
  const path = new URL(url).pathname;
  if (path === "/v1/tether" && (!init.method || init.method === "GET")) return Response.json({ ok: true, public_key: key.public_key, chains: [...state.values()] });
  if (path === TETHER_ROUTE) {
    const packet = JSON.parse(init.body);
    posts.push(packet.chain);
    const prev = state.get(packet.chain);
    const anchor = prev ? prev.tips : { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS };
    const res = await verifyLattice(packet.rows, { pick: (r) => r, anchor, legacyAllowed: false });
    if (!res.ok) return Response.json({ ok: false, code: "TETHER-LINK" }, { status: 409 });
    const row = { chain: packet.chain, tips: res.tips, rows: (prev ? prev.rows : 0) + packet.rows.length, verified: true };
    state.set(packet.chain, row);
    return Response.json({ ok: true, stored: true, verified: true, chain: packet.chain, tips: res.tips, rows: row.rows });
  }
  return new Response("nf", { status: 404 });
};
const store = new MemoryStore();
const r1 = await sealRefusal(store, { code: "MCP-CONFIRM-REQUIRED", tool: "fraggate_call", slug: "foldlock", op: "fold", args: { a: 1 }, minuteBucket: 1 });
const r2 = await sealRefusal(store, { code: "FG-STUB", tool: "fraggate_call", slug: "embryolock", op: "wipe", args: { b: 2 }, minuteBucket: 2 });
assert.equal(r1.sealed, true); assert.equal(r2.sealed, true); n++;
const out = await pushAll(env, { store, fetcher });
assert.equal(out.ok, true, JSON.stringify(out)); n++;
assert.ok(posts.includes("refusals")); n++;
const ref = out.chains.find((c) => c.chain === "refusals");
assert.equal(ref.azos_updated, true); assert.equal(state.get("refusals").rows, 2); n++;
assert.equal(state.get("refusals").tips.primary, r2.lattice.primary); n++;
console.log(`ok tether refusals: ${n} checks`);
