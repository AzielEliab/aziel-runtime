// 4DMAP-PLOT-PERSIST-1.0. Author: Aziel Eliab.
import assert from "node:assert/strict";
import { mapPlot, mapRead } from "../src/engines/4dmap/map-store.js";
import { runFourdmap } from "../src/engines/4dmap/ops.js";
import { memoryRepo as memRepo } from "../src/engines/4dmap/aznews-live.js";
const repo = memRepo ? memRepo() : null;
assert.ok(repo, "aznews-live exports memRepo for tests");
const lp = await runFourdmap("library_pin", { record_id: "r1", title: "Test", lat: 40.12, lon: -86.21, date: "2026-10-10" }, null, null);
assert.equal(lp.persisted.stored, false);
const a = await mapPlot(repo, { card: lp.card });
assert.equal(a.stored, true); assert.equal(a.layer, "plotted");
const b = await mapPlot(repo, { card: lp.card });
assert.equal(b.already_stored, true);
const bad = await mapPlot(repo, { card: { ...lp.card, h: "x", t: { ...lp.card.t, lat: 84, lon: 0 } } });
assert.equal(bad.code, "4DMAP-PLOT-COORD");
const r = await mapRead(repo, { layers: "plotted" });
assert.equal(r.pins.length, 1);
console.log("verify-4dmap-plot-persist: ok");
// confirm gate: bound store, no persist_confirmed -> refused, nothing stored.
const calls = [];
const env = { AZNEWS: { getByName: () => ({ fetch: async (req) => { calls.push(await req.json()); return new Response(JSON.stringify({ ok: true, stored: true })); } }) } };
const nc = await runFourdmap("library_pin", { title: "T2", lat: 41.12, lon: -87.21, date: "2026-10-10" }, null, env);
assert.equal(nc.persisted.code, "MCP-CONFIRM-REQUIRED"); assert.equal(calls.length, 0);
const yc = await runFourdmap("library_pin", { title: "T3", lat: 41.12, lon: -87.21, date: "2026-10-10", persist_confirmed: true }, null, env);
assert.equal(yc.persisted.stored, true); assert.equal(calls[0].op, "map_plot");
console.log("verify-4dmap-plot-persist: confirm gate ok");
