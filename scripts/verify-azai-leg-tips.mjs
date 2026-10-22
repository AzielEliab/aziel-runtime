// AZAI-LEG-TIPS-1.0 (lattice plan step 8): AZAI compares runtime lattice tips with both legs' stored tether tips.
import assert from "node:assert/strict";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { append, loadChain } from "../src/chainlock/ops.js";
import { storeFor } from "../src/chainlock/store.js";
import { compareLegTips, classifyLegTip } from "../src/azai-leg-tips.js";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
for (let i = 0; i < 3; i++) await append(env, { c: "learn", subject: "legs", fact: `leg fact ${i}` });
const rows = await loadChain(storeFor(env), "learn");
const L = rows.map((r) => r.lattice);
const tip = (l) => ({ primary: l.primary, secondary: l.secondary });
const leg = (chains, calls) => async (url) => { calls.push(url); return new Response(JSON.stringify({ chains, public_key: "k" }), { status: 200 }); };

ok(classifyLegTip(rows, tip(L[2])) === "match", "match");
ok(classifyLegTip(rows, tip(L[0])) === "behind", "behind");
ok(classifyLegTip(rows, { primary: "f".repeat(64), secondary: "e".repeat(64) }) === "fork", "fork: unknown tip");
ok(classifyLegTip(rows, { primary: L[2].primary, secondary: "e".repeat(64) }) === "fork", "fork: secondary diverges");
ok(classifyLegTip(rows, null) === "absent", "absent");

const calls = [];
const r1 = await compareLegTips(env, { chains: ["learn"], azosFetcher: leg([{ chain: "learn", tips: tip(L[2]) }], calls), azinterfaceFetcher: leg([{ chain: "learn", tips: tip(L[1]) }], calls) });
ok(r1.ok && r1.chains[0].azos === "match" && r1.chains[0].azinterface === "behind" && r1.forks === 0, "3 legs agree / one behind");
ok(calls.every((u) => u.endsWith("/v1/tether")) && calls.length === 2, "only GET /v1/tether read on each leg");
const r2 = await compareLegTips(env, { chains: ["learn"], azosFetcher: leg([{ chain: "learn", tips: tip(L[2]) }], []), azinterfaceFetcher: leg([{ chain: "learn", tips: { primary: "a".repeat(64), secondary: "b".repeat(64) } }], []) });
ok(!r2.ok && r2.forks === 1 && r2.chains[0].azinterface === "fork", "cross-leg fork detected");
const r3 = await compareLegTips(env, { chains: ["learn"], azosFetcher: null, azinterfaceFetcher: async () => { throw new Error("down"); } });
ok(r3.chains[0].azos === "unbound" && r3.chains[0].azinterface === "unreachable" && r3.legs.azos.reachable === false, "unreadable legs fail closed (never match)");
ok(r3.read_only && r3.writes === 0 && r3.authorizes_action === false, "read-only");

const { default: worker } = await import("../src/index.js");
const env2 = { ...env, AZOS: { fetch: leg([{ chain: "learn", tips: tip(L[2]) }], []) }, AZINTERFACE: { fetch: leg([{ chain: "learn", tips: { primary: "a".repeat(64), secondary: "b".repeat(64) } }], []) } };
const plain = await (await worker.fetch(new Request("https://rt.example/v1/azai/lattice"), env2, {})).json();
ok(plain.cross_leg === undefined, "no leg fetch unless ?legs=1");
const withLegs = await (await worker.fetch(new Request("https://rt.example/v1/azai/lattice?legs=1"), env2, {})).json();
ok(withLegs.cross_leg && withLegs.cross_leg.forks === 1 && withLegs.ok === false, "route reports the cross-leg fork");
console.log(`verify-azai-leg-tips: ${checks} checks pass`);
