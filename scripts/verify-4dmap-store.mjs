/**
 * 4DMAP-STORE-1.0: the standalone 4DMap pin store (no AZNews), its walk, and its
 * signed copy chain (AZRT-MAP-COPY-1.0) to every bound receiver. No network.
 */
import assert from "node:assert/strict";
import { memoryRepo } from "../src/engines/4dmap/aznews-live.js";
import { mapTick, mapRead, corpusPinDocs, referencePinDocs, CORPUS_EVENTS_URL, MAP_STORE_SPEC } from "../src/engines/4dmap/map-store.js";
import { pushCopies, MAP_TETHER_SPEC, MAP_TETHER_ROUTE, NEWS_TETHER_ROUTE } from "../src/aznews-tether.js";
import { tetherStatement } from "../src/azos-tether.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { verifyLattice, LATTICE_GENESIS } from "../src/dual-lattice.js";

const NOW = Date.parse("2026-10-09T08:00:00Z");
let events = [
  { event_id: "AZEVT-1", event_date: "1101", place_name: "Somewhere", lat: 10, lon: 20, title: "Event one", record_id: "AZDOC-1", status: "ESTIMATED", confidence: 0.8, source: "AUTO_COORD", library: "aziel", pin_type: "library-aziel-event" },
  { event_id: "AZEVT-2", event_date: "1950", place_name: "Paris", lat: 48.85, lon: 2.35, title: "Event two", pin_type: "corpus-event" },
  { event_id: "AZEVT-3", title: "No place", lat: null, lon: null },
  { event_id: "AZEVT-4", title: "Bad lat", lat: 123, lon: 0 },
];
let corpusCalls = 0;
const fetchImpl = async (url) => {
  assert.equal(String(url), CORPUS_EVENTS_URL);
  corpusCalls += 1;
  return new Response(JSON.stringify({ ok: true, events }));
};

// Pure helpers.
assert.equal(corpusPinDocs({ events }).length, 2, "events without a finite, in-range place are skipped");
const refs = referencePinDocs();
assert.ok(refs.length > 600 && refs.every((r) => r.doc.layer === "reference"));

const repo = memoryRepo();
const t1 = await mapTick(repo, { fetchImpl, now: NOW });
assert.equal(t1.reference.added, 400, "bounded per tick");
assert.equal(t1.corpus, null, "no room left for corpus on the first tick");
const t2 = await mapTick(repo, { fetchImpl, now: NOW + 60000 });
assert.equal(t2.reference.added, refs.length - 400);
assert.equal(t2.corpus.added, 2);
assert.equal(corpusCalls, 1);
const t3 = await mapTick(repo, { fetchImpl, now: NOW + 120000 });
assert.equal(t3.corpus, null, "corpus is polled every 10 minutes, not every tick");
assert.equal(t3.rows_appended, 0);
// A changed corpus event is stored again and supersedes the old row.
events = events.map((e) => (e.event_id === "AZEVT-1" ? { ...e, status: "CONFIRMED" } : e));
const t4 = await mapTick(repo, { fetchImpl, now: NOW + 11 * 60000 });
assert.equal(t4.corpus.changed, 1);
assert.equal(t4.corpus.added, 0);

// Reads: no AZNews anywhere; newest row per source id; layer filter.
const all = await mapRead(repo, {}, { now: NOW + 11 * 60000 });
assert.equal(all.spec, MAP_STORE_SPEC);
assert.equal(all.needs_aznews, false);
assert.equal(all.layers.corpus.count, 2);
assert.equal(all.layers.reference.count, refs.length);
assert.equal(all.pins.length, refs.length + 2);
const ev1 = all.pins.find((p) => p.source_id === "corpus:AZEVT-1");
assert.equal(ev1.source.status, "CONFIRMED");
assert.ok(ev1.supersedes_seq > 0);
assert.ok(all.last10.every((p) => p.layer === "corpus"));
const corpusOnly = await mapRead(repo, { layers: "corpus" });
assert.equal(corpusOnly.pins.length, 2);
assert.ok(all.lattice_walk.verified_through >= refs.length, "the walk verifies the map ledger from genesis");
assert.equal(all.lattice_walk.breaks.length, 0);

// Signed copy chain "4dmap" to two receivers; each verifies from genesis.
function receiver() {
  const st = { tip_seq: 0, tips: null, rows: [] };
  const fetcher = async (url, init = {}) => {
    assert.ok(String(url).endsWith(MAP_TETHER_ROUTE), "4dmap chain uses its own route");
    assert.ok(!String(url).endsWith(NEWS_TETHER_ROUTE));
    if (!init.method) return new Response(JSON.stringify({ ok: true, tip_seq: st.tip_seq, tips: st.tips }));
    const p = JSON.parse(init.body);
    assert.equal(p.spec, MAP_TETHER_SPEC);
    assert.equal(p.chain, "4dmap");
    assert.equal(p.kind, "map-rows");
    const pub = await crypto.subtle.importKey("raw", Buffer.from(p.public_key, "base64url"), { name: "Ed25519" }, false, ["verify"]);
    assert.ok(await crypto.subtle.verify("Ed25519", pub, Buffer.from(p.sig, "base64url"), new TextEncoder().encode(tetherStatement(p))));
    const v = await verifyLattice(p.rows, { pick: (r) => r.lattice, anchor: st.tips || { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS }, legacyAllowed: false });
    assert.ok(v.ok);
    for (const r of p.rows) assert.equal(await sha256Hex(canonicalize(r.doc)), r.lattice.document_hash);
    const last = p.rows[p.rows.length - 1];
    st.rows.push(...p.rows);
    st.tip_seq = last.seq;
    st.tips = { primary: last.lattice.primary, secondary: last.lattice.secondary };
    return new Response(JSON.stringify({ ok: true, tip_seq: st.tip_seq }));
  };
  return { st, fetcher };
}
const a = receiver();
const b = receiver();
const env = { TETHER_SIGNING_SEED: "22".repeat(32) };
const targets = [{ name: "azos", origin: "https://azos.test", fetcher: a.fetcher }, { name: "azinterface", origin: "https://azi.test", fetcher: b.fetcher }];
let rounds = 0;
let out;
do {
  out = await pushCopies(env, repo, { chain: "4dmap", targets });
  rounds += 1;
} while (out.targets.some((t) => t.lag_rows > 0) && rounds < 10);
assert.ok(out.ok);
assert.equal(a.st.tip_seq, await repo.count());
assert.equal(b.st.tip_seq, await repo.count());
// One receiver down does not stop the other.
const down = { name: "down", origin: "https://down.test", fetcher: async () => { throw new Error("unreachable"); } };
const mixed = await pushCopies(env, repo, { chain: "4dmap", targets: [down, { name: "azos", origin: "https://azos.test", fetcher: a.fetcher }] });
assert.equal(mixed.ok, false);
assert.equal(mixed.targets[0].code, "NEWS-TETHER-ERROR");
assert.equal(mixed.targets[1].code, "NEWS-TETHER-CURRENT");
// No key: nothing is sent.
const nokey = await pushCopies({}, repo, { chain: "4dmap", targets });
assert.ok(nokey.targets.every((t) => t.code === "NEWS-TETHER-KEY-ABSENT"));

console.log(JSON.stringify({ ok: true, map_rows: await repo.count(), reference: refs.length, corpus: 2, push_rounds: rounds }));
