/** AZAI-LATTICE-MONITOR-1.0 checks. Author: Aziel Eliab. */
import assert from "node:assert/strict";
import { DurableStore } from "../src/chainlock/store.js";
import { append, loadChain } from "../src/chainlock/ops.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { reviewLattice } from "../src/azai-lattice-monitor.js";

let n = 0;
const shared = new Map();
const store = new DurableStore(memoryChainWriterNamespace({}, shared));
const empty = await reviewLattice(store, { chains: ["session", "acts"] });
assert.equal(empty.ok, true); n++;
assert.equal(empty.writes, 0); n++;
await Promise.all(["runtime", "ui", "interface"].flatMap((lv) => Array.from({ length: 6 }, (_, i) => append(store, { c: i % 2 ? "acts" : "session", fact: `${lv} ${i}`, username: `u${i}`, offline: i % 3 === 0 }))));
const before = JSON.stringify([...shared.entries()].map(([k, m]) => [k, [...m.keys()].length]));
const r = await reviewLattice(store, { chains: ["session", "acts"] });
assert.equal(JSON.stringify([...shared.entries()].map(([k, m]) => [k, [...m.keys()].length])), before, "monitor wrote nothing"); n++;
assert.equal(r.ok, true, JSON.stringify(r)); n++;
assert.equal(r.chains.reduce((a, c) => a + c.rows, 0), 18); n++;
assert.equal(r.authorizes_action, false); n++;
assert.equal(r.signed, false); n++;
assert.ok(r.chains.every((c) => c.healthy && c.lattice_tips)); n++;
assert.equal(r.cross_chain.dup_stamp, 0); n++;
// tamper: monitor must see it
const key = [...shared.keys()].find((k) => k.includes("session"));
const m = shared.get(key);
const e1 = m.get("e:1");
m.set("e:2", { ...m.get("e:2"), prev: "f".repeat(64) });
const t = await reviewLattice(store, { chains: ["session"] });
assert.equal(t.ok, false); n++;
assert.ok(t.chains[0].breaks.length > 0); n++;
assert.ok(e1); n++;
console.log(`verify-azai-lattice-monitor: ${n} checks ok (AZAI-LATTICE-MONITOR-1.0; read-only, sealed not signed)`);
