// CITED-ORIGIN-1.0 ingest into 4dmap-v1. Author: Aziel Eliab.
import assert from "node:assert/strict";
import { memoryRepo } from "../src/engines/4dmap/aznews-live.js";
import { mapTick, mapRead, originPinDocs } from "../src/engines/4dmap/map-store.js";
const page = { ok: true, scanned: 3, done: true, next_after: "r3", no_origin: [{ record_id: "r3" }], origins: [
  { record_id: "r1", title: "Letter", pin_type: "library-aziel-report", place_name: "London", lat: 51.5085, lon: -0.1257, method: "written-at", evidence: "Written at London" },
  { record_id: "r2", title: "Report", pin_type: "corpus-report", place_name: "Kingston", lat: 17.997, lon: -76.7936, method: "dateline", evidence: "KINGSTON -" },
  { record_id: "rX", title: "Junk", pin_type: "corpus-report", place_name: "Nowhere", lat: 84, lon: 0 },
  { record_id: "rY", title: "Wrong type", pin_type: "corpus-event", place_name: "Paris", lat: 48.85, lon: 2.35 },
] };
assert.equal(originPinDocs(page).length, 2);
const fetchImpl = async (url) => new Response(JSON.stringify(String(url).includes("/api/origins") ? page : { events: [] }), { headers: { "content-type": "application/json" } });
const repo = memoryRepo();
for (let i = 0; i < 4; i++) await mapTick(repo, { fetchImpl, force: true });
const r = await mapRead(repo, {});
assert.equal(r.cited_origins.pink, 1); assert.equal(r.cited_origins.dark_green, 1);
assert.equal(r.cited_origins.last_pass.scanned, 3);
const pink = r.pins.find((p) => p.pin_type === "library-aziel-report");
assert.equal(pink.color, "pink");
// Append-only: a second identical pass stores nothing new.
const before = r.ledger_rows;
await mapTick(repo, { fetchImpl, force: true, now: Date.now() + 25 * 3600 * 1000 });
assert.equal((await mapRead(repo, {})).ledger_rows, before);
console.log("verify-map-cited-origins: ok");
