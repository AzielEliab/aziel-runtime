/**
 * 4DMAP-STORE-1.0: the standalone 4DMap pin store (no AZNews), its walk, and its
 * signed copy chain (AZRT-MAP-COPY-1.0) to every bound receiver. No network.
 */
import assert from "node:assert/strict";
import { memoryRepo } from "../src/engines/4dmap/aznews-live.js";
import { mapTick, mapRead, mapLink, corpusPinDocs, referencePinDocs, corpusJunk, coordinateLooksReal, CORPUS_EVENTS_URL, MAP_STORE_SPEC } from "../src/engines/4dmap/map-store.js";
import { pushCopies, MAP_TETHER_SPEC, MAP_TETHER_ROUTE, NEWS_TETHER_ROUTE } from "../src/aznews-tether.js";
import { tetherStatement } from "../src/azos-tether.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { verifyLattice, LATTICE_GENESIS } from "../src/dual-lattice.js";

const NOW = Date.parse("2026-10-09T08:00:00Z");
async function walkCheck(repo) {
  const { verifyLattice } = await import("../src/dual-lattice.js");
  const rows = await repo.rowRange(1, await repo.count());
  return (await verifyLattice(rows, { pick: (r) => r.lattice, legacyAllowed: false })).ok;
}
let events = [
  { event_id: "AZEVT-1", event_date: "1101", place_name: "Somewhere", lat: 10.5, lon: 20.25, title: "Event one", record_id: "AZDOC-1", status: "ESTIMATED", confidence: 0.8, source: "AUTO_COORD", library: "aziel", pin_type: "library-aziel-event" },
  { event_id: "AZEVT-2", event_date: "1950", place_name: "Paris", lat: 48.85, lon: 2.35, title: "Event two", pin_type: "corpus-event" },
  { event_id: "AZEVT-3", title: "No place", lat: null, lon: null },
  { event_id: "AZEVT-4", title: "Bad lat", lat: 123, lon: 0 },
];
let corpusCalls = 0;
const fetchImpl = async (url) => {
  assert.equal(String(url), CORPUS_EVENTS_URL + "?include_retracted=1");
  corpusCalls += 1;
  return new Response(JSON.stringify({ ok: true, events }));
};

// Pure helpers.
assert.equal(corpusPinDocs({ events }).length, 2, "events without a finite, in-range place are skipped");
assert.equal(corpusPinDocs({ events }).retractions.length, 2, "and they are refused as junk, never pinned");
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

// ---- GEO-PIN-QUALITY-1.0: junk is refused and stored junk is retracted (append-only) ----
for (const [lat, lon] of [[0.0001, 0.0094], [0.1075, 0.1144], [84, 0], [40, 0], [32, 41]]) assert.equal(coordinateLooksReal(lat, lon), false);
assert.equal(corpusJunk({ place_name: "coord 84.0000,0.0000", lat: 84, lon: 0 }).retracted, "geoparser_junk");
assert.equal(corpusJunk({ place_name: "Seattle", lat: 47.6, lon: -122.3, retracted: "duplicate_in_document", retract_reason: "dup" }).by, "aziel-corpus");
{
  const r2 = memoryRepo();
  let evs = [
    { event_id: "J1", place_name: "Svalbard", lat: 78.2, lon: 15.6, title: "HVAC Valve guide", event_date: "2099" }, // stored before the rule existed
    { event_id: "G1", place_name: "Paris", lat: 48.85, lon: 2.35, title: "1950 — Paris Peace talks", event_date: "1950" },
    { event_id: "R1", place_name: "Rosetta", lat: 31.4, lon: 30.417, title: "2026-09-12 — Rosetta Stone Ankara talks", event_date: "2026-09-12" },
  ];
  const f2 = async () => new Response(JSON.stringify({ ok: true, events: evs }));
  await mapTick(r2, { fetchImpl: f2, now: NOW });
  await mapTick(r2, { fetchImpl: f2, now: NOW + 60000, force: true });
  let read = await mapRead(r2, { layers: "corpus" });
  assert.equal(read.pins.length, 3, "an old junk pin was stored before the rule");
  // Upstream now marks it junk: a retraction row is appended; nothing is deleted.
  evs = evs.map((e) => (e.event_id === "J1" ? { ...e, retracted: "geoparser_junk", retract_reason: "bare coordinate pair" } : e));
  const before = await r2.count();
  const t = await mapTick(r2, { fetchImpl: f2, now: NOW + 120000, force: true });
  assert.equal(t.corpus.retracted, 1);
  assert.equal(await r2.count(), before + 1, "append-only: one retraction row");
  read = await mapRead(r2, { layers: "corpus" });
  assert.equal(read.pins.length, 2, "retracted pins are hidden by default");
  assert.equal(read.retracted.count, 1);
  const all2 = await mapRead(r2, { layers: "corpus", include_retracted: "1" });
  const j = all2.pins.find((p) => p.source_id === "corpus:J1");
  assert.equal(j.retracted, "geoparser_junk");
  assert.ok(j.supersedes_seq > 0);
  assert.equal((await r2.rowGet(j.supersedes_seq)).doc.event, "HVAC Valve guide", "the original row is still there");
  assert.equal((await mapTick(r2, { fetchImpl: f2, now: NOW + 180000, force: true })).corpus.retracted, 0, "retracted once");
  // ---- 4DMAP-LINK-1.0 ----
  const items = [
    { item_id: "n-1", seq: 10, document_hash: "a".repeat(64), outlet_id: "x", outlet: "X", title: "Rosetta Stone Ankara talks resume in Rosetta", published: "2026-10-08T10:00:00Z", event_location: { name: "Rosetta", lat: 31.4, lon: 30.42 } },
    { item_id: "n-2", seq: 11, document_hash: "b".repeat(64), outlet_id: "x", outlet: "X", title: "Paris markets open", published: "2026-10-08T10:00:00Z", event_location: { name: "Paris", lat: 48.85, lon: 2.35 } },
    { item_id: "n-3", seq: 12, document_hash: "c".repeat(64), outlet_id: "x", outlet: "X", title: "Unrelated", published: "2026-10-08T10:00:00Z", event_location: null },
  ];
  const lk = await mapLink(r2, items, { now: NOW });
  assert.equal(lk.checked, 3);
  assert.equal(lk.correspondence.black, 1, "Rosetta: shared entities + place + within 3 years -> BLACK rule passed");
  assert.equal(lk.correspondence.white, 0);
  assert.equal(lk.reference_place, 1, "Paris -> reference place Paris (Rosetta is not a capital)");
  const again = await mapLink(r2, items, { now: NOW });
  assert.equal(again.checked, 0, "each item is checked once");
  const withLinks = await mapRead(r2, { links: "1" });
  const black = withLinks.links.newest.find((l) => l.level === "black");
  assert.equal(black.map.source_id, "corpus:R1");
  assert.equal(black.news.report_document_hash, "a".repeat(64));
  assert.ok(black.match.shared.length >= 3);
  // Paris 1950 is 76 years from the news item: never a correspondence, only a place link.
  assert.ok(!withLinks.links.newest.some((l) => l.link_type === "correspondence" && l.map.source_id === "corpus:G1"));
  // Not enough shared entities -> no promotion, nothing stored.
  const r3 = memoryRepo();
  evs = [{ event_id: "R1", place_name: "Rosetta", lat: 31.4, lon: 30.417, title: "2026-09-12 — Rosetta", event_date: "2026-09-12" }];
  await mapTick(r3, { fetchImpl: f2, now: NOW, force: true });
  await mapTick(r3, { fetchImpl: f2, now: NOW + 60000, force: true });
  const lk3 = await mapLink(r3, [items[0]], { now: NOW });
  assert.equal(lk3.correspondence.black, 0, "never black without the rule");
  const w = await walkCheck(r2);
  assert.equal(w, true);
}

console.log(JSON.stringify({ ok: true, map_rows: await repo.count(), reference: refs.length, corpus: 2, push_rounds: rounds }));
