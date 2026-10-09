/**
 * AZNEWS-LIVE-1.0 checks: ingest -> dual lattice, two pins per report, pull + view
 * receipts linked, pins survive a cache retention trim, null event location with a
 * reason, pin colors, the 3-year matching window, the last-10 list, and the sky math.
 * Uses fixture feeds through an injected fetch. No network.
 */
import assert from "node:assert/strict";
import { memoryRepo, tick, read, mintViews, CACHE_KEEP } from "../src/engines/4dmap/aznews-live.js";
import { colorFor, corpusPinType, inEra, matchPins, withinYears, PIN_COLORS } from "../src/engines/4dmap/aznews-pins.js";
import { skySnapshot } from "../src/engines/4dmap/aznews-sky.js";
import { eventLocation, reportedLocation } from "../src/engines/4dmap/aznews-geo.js";
import { parseFeed, parseDate } from "../src/engines/4dmap/aznews-feed.js";
import { WEATHER_ANCHORS } from "../src/engines/4dmap/aznews-weather.js";
import { latticeOfflineSecondary } from "../src/dual-lattice.js";
import { wiredOutlets } from "../src/engines/4dmap/aznews-outlets.js";

const NOW = Date.parse("2026-10-09T06:00:00Z");

function rss(prefix, n) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const unresolved = i % 2 === 1;
    const title = unresolved ? `${prefix} markets steady as investors wait ${i}` : `Earthquake strikes Tokyo as Japan issues warning ${prefix} ${i}`;
    items.push(`<item><title>${title}</title><link>https://example.org/${prefix}/${i}?utm_source=x</link><pubDate>Fri, 09 Oct 2026 0${i % 6}:00:00 GMT</pubDate><description>TOKYO (AP) — ${title}. Officials said more details would follow later in the day.</description><media:content url="https://img.example.org/${prefix}/${i}.jpg" medium="image"/></item>`);
  }
  return `<?xml version="1.0"?><rss><channel>${items.join("")}</channel></rss>`;
}

function weatherBody() {
  return WEATHER_ANCHORS.map((a) => ({ latitude: a.lat + 0.01, longitude: a.lon - 0.01, elevation: 10, current: { time: "2026-10-09T06:00", temperature_2m: 20, relative_humidity_2m: 50, precipitation: 0, weather_code: a.id === "caribbean" ? 95 : 1, wind_speed_10m: 10, wind_gusts_10m: a.id === "caribbean" ? 120 : 20 } }));
}

function fakeFetch(feedItems = 4) {
  let calls = 0;
  const fn = async (url) => {
    calls += 1;
    const u = String(url);
    if (u.startsWith("https://api.open-meteo.com/")) return new Response(JSON.stringify(weatherBody()), { headers: { "content-type": "application/json" } });
    if (u.startsWith("https://img.example.org/")) return new Response(new TextEncoder().encode("img:" + u), { headers: { "content-type": "image/jpeg" } });
    const outlet = wiredOutlets().find((o) => o.feed_url === u);
    if (outlet) return new Response(rss(outlet.id, feedItems), { headers: { "content-type": "application/rss+xml" } });
    return new Response("no", { status: 404 });
  };
  fn.count = () => calls;
  return fn;
}

// --- flags stay false before any stored data
{
  const repo = memoryRepo();
  const st = await read(repo, "status", {}, { now: NOW });
  assert.equal(st.live, false);
  assert.equal(st.outlets_live, 0);
  assert.equal(st.weather_live, false);
  assert.equal(st.sky_live, false);
  assert.equal(st.merged, false);
  console.log("ok flags false before ingest");
}

const repo = memoryRepo();
const f = fakeFetch(4);
const t1 = await tick(repo, { fetchImpl: f, now: NOW });
assert.ok(t1.subrequests <= 50, "subrequest budget");
assert.equal(t1.outlets.length, 5);
assert.ok(t1.weather && t1.weather.stored === WEATHER_ANCHORS.length);
assert.equal(t1.sky.sun, "Libra");
console.log("ok tick stores news, weather, sky within the subrequest budget", t1.subrequests);

// --- two pins per report, colors
const ledger = repo._ledger;
for (const kind of ["news", "weather", "sky"]) {
  const reports = ledger.filter((r) => r.kind === kind);
  assert.ok(reports.length > 0, kind);
  for (const rep of reports) {
    const pins = ledger.filter((r) => r.kind === "pin" && r.doc.report_seq === rep.seq && r.doc.role !== "correspondence");
    assert.equal(pins.length, 2, `${kind} report ${rep.seq} has two pins`);
    const roles = pins.map((p) => p.doc.role).sort();
    assert.deepEqual(roles, ["event", "report"]);
    for (const p of pins) assert.equal(p.doc.color, colorFor(p.doc.pin_type).color);
    if (kind === "news") {
      assert.equal(pins.find((p) => p.doc.role === "event").doc.color, "red");
      assert.equal(pins.find((p) => p.doc.role === "report").doc.color, "blue");
    }
  }
}
console.log("ok two pins per report with type and color");

// --- report location from the document's own dateline
{
  const n = ledger.find((r) => r.kind === "news" && /Earthquake/.test(r.doc.title));
  assert.equal(n.doc.reported_location.source, "dateline");
  assert.equal(n.doc.reported_location.name, "Tokyo");
  const noLine = reportedLocation({ text: "Markets were calm.", outlet: { hq_city: "London", hq_lat: 51.5, hq_lon: -0.12, country: "GB" } });
  assert.equal(noLine.reported_location.precision, "outlet-hq");
  console.log("ok reported location comes from the dateline, outlet HQ only as fallback");
}

// --- null event location when it cannot be resolved
{
  const n = ledger.find((r) => r.kind === "news" && /markets steady/.test(r.doc.title));
  assert.equal(n.doc.event_location, null);
  assert.match(n.doc.event_location_reason, /Nothing was guessed/);
  const pin = ledger.find((r) => r.kind === "pin" && r.doc.report_seq === n.seq && r.doc.role === "event");
  assert.equal(pin.doc.geo, null);
  assert.equal(pin.doc.event_location, null);
  assert.ok(pin.doc.geo_reason);
  const direct = eventLocation({ title: "Shares slide on rate fears", text: "Investors sold." });
  assert.equal(direct.event_location, null);
  console.log("ok unresolved event location is null with a reason");
}

// --- pull receipt and view receipt exist and are linked; both on the lattice
{
  const n = ledger.find((r) => r.kind === "news");
  const pull = ledger.find((r) => r.kind === "pull_receipt" && r.doc.report_seq === n.seq);
  assert.ok(pull, "pull receipt");
  assert.equal(pull.doc.content_hash, n.doc.content_hash);
  assert.ok(pull.doc.source.feed_url);
  assert.ok(pull.doc.fetched_at);
  const out = await read(repo, "item", { item_id: n.doc.item_id, via: "test" }, { now: NOW });
  assert.equal(out.ok, true);
  assert.equal(out.view_receipts[0].minted, true);
  const view = ledger.find((r) => r.seq === out.view_receipts[0].view_receipt_seq);
  assert.equal(view.kind, "view_receipt");
  assert.equal(view.doc.pull_receipt_seq, pull.seq);
  assert.equal(view.doc.pull_receipt_primary, pull.lattice.primary);
  for (const r of [pull, view]) assert.deepEqual(r.lattice.lattices, ["primary", "secondary"]);
  const again = await read(repo, "item", { item_id: n.doc.item_id }, { now: NOW });
  assert.equal(again.view_receipts[0].minted, false, "one view receipt per item per hour");
  // offline view: secondary = H(document hash + username); a second offline write refuses.
  const off = await mintViews(repo, [n.seq], { offline: true, username: "azbot", now: NOW + 3600000 });
  const offRow = ledger.find((r) => r.seq === off[0].view_receipt_seq);
  assert.equal(offRow.lattice.secondary, await latticeOfflineSecondary(offRow.lattice.document_hash, "azbot"));
  const v = await read(repo, "verify", { limit: 300 }, { now: NOW });
  assert.equal(v.ok, true, JSON.stringify(v.breaks));
  assert.equal(v.document_hash_misses, 0);
  console.log("ok pull and view receipts minted, linked, and on both lattices");
}

// --- dedupe: same feed again adds no news rows for those outlets
{
  const before = ledger.filter((r) => r.kind === "news").length;
  // force the cursor back to the same five outlets
  const state = await repo.metaGet("state");
  await repo.commit({ meta: { state: { ...state, cursor: 0 } } });
  await tick(repo, { fetchImpl: f, now: NOW + 120000 });
  const after = ledger.filter((r) => r.kind === "news").length;
  assert.equal(after, before, "canonical URL + content hash dedupe");
  console.log("ok dedupe by canonical URL and content hash");
}

// --- pins survive a retention trim (only the raw feed cache is trimmed)
{
  const pinSeqs = ledger.filter((r) => r.kind === "pin").map((r) => r.seq);
  const rowsBefore = ledger.length;
  for (let i = 0; i < CACHE_KEEP + 5; i++) repo._cache.set(100000 + i, "raw");
  const trimmed = await repo.cacheTrim(10);
  assert.ok(trimmed > 0);
  assert.equal(repo._cache.size, 10);
  assert.equal(ledger.length, rowsBefore);
  for (const s of pinSeqs) assert.equal((await repo.rowGet(s)).kind, "pin");
  const p = await read(repo, "pin", { pin_id: `pin-${pinSeqs[0]}` }, { now: NOW });
  assert.equal(p.ok, true);
  console.log("ok pins and receipts survive a retention trim", pinSeqs.length);
}

// --- last 10 list: newest first, at most 10, with permalinks
{
  const p = await read(repo, "pins", {}, { now: NOW });
  assert.equal(p.last10.length, 10);
  const seqs = p.last10.map((x) => Number(x.pin_id.slice(4)));
  assert.deepEqual(seqs, seqs.slice().sort((a, b) => b - a));
  assert.equal(seqs[0], Math.max(...ledger.filter((r) => r.kind === "pin").map((r) => r.seq)));
  for (const x of p.last10) assert.match(x.permalink, /^\/aznews\?pin=pin-\d+$/);
  console.log("ok last 10 pins added list");
}

// --- correspondence pins: black/white rule, never on a single source
{
  const corr = ledger.filter((r) => r.kind === "pin" && r.doc.role === "correspondence");
  assert.ok(corr.length > 0, "fixture outlets share the Tokyo earthquake story");
  for (const c of corr) {
    assert.ok(["black", "white"].includes(c.doc.color));
    if (c.doc.color === "black") assert.equal(c.doc.match.level, "black");
    assert.equal(c.doc.links.pins.length, 2);
  }
  console.log("ok correspondence pins carry the rule evidence");
}

// --- colors
{
  assert.equal(colorFor("news-event").color, "red");
  assert.equal(colorFor("news-report").color, "blue");
  assert.equal(colorFor(corpusPinType({ author: "Aziel Eliab", role: "event" })).color, "purple");
  assert.equal(colorFor(corpusPinType({ author: "Aziel Eliab", role: "report" })).color, "pink");
  assert.equal(colorFor(corpusPinType({ author: "Someone Else", role: "event" })).color, "lightgreen");
  assert.equal(colorFor(corpusPinType({ author: "", role: "report" })).color, "darkgreen");
  assert.equal(colorFor("correspondence").color, "black");
  assert.equal(colorFor("correspondence-candidate").color, "white");
  assert.ok(Object.keys(PIN_COLORS).length >= 8);
  console.log("ok pin color assignment");
}

// --- 3-year window
{
  const base = { geo: { lat: 35.68, lon: 139.69 }, tokens: ["earthquake", "tokyo", "japan"] };
  const a = { ...base, source: "a", date: "2026-10-09T00:00:00Z" };
  assert.equal(matchPins(a, { ...base, source: "b", date: "2023-11-01T00:00:00Z" }).level, "black");
  assert.equal(matchPins(a, { ...base, source: "b", date: "2023-01-01T00:00:00Z" }).level, null, "more than 3 years apart");
  assert.equal(matchPins(a, { ...base, source: "a", date: "2026-10-09T00:00:00Z" }).level, null, "same source");
  assert.equal(matchPins(a, { ...base, source: "b", date: null }).level, null, "undated never corresponds");
  assert.equal(matchPins(a, { source: "b", date: "2026-10-01T00:00:00Z", geo: { lat: 35.0, lon: 139.0 }, tokens: ["earthquake", "japan", "storm"] }).level, "white");
  assert.equal(withinYears("2020-01-01T00:00:00Z", "2022-12-31T00:00:00Z"), true);
  assert.equal(inEra({ era: { year: 2026 } }, 2023), true);
  assert.equal(inEra({ era: { year: 2026 } }, 2022), false);
  assert.equal(inEra({ era: null }, 2026), false, "undated pins sit outside every era");
  console.log("ok 3-year matching window and era slider");
}

// --- sky math against the date
{
  const s = skySnapshot(new Date("2026-10-09T06:00:00Z"), [{ id: "x", name: "Washington", lat: 38.9, lon: -77 }]);
  assert.equal(s.sun.tropical_sign, "Libra");
  assert.equal(s.sun.constellation, "Virgo");
  assert.equal(s.seasons.northern_hemisphere, "Autumn");
  assert.equal(s.seasons.southern_hemisphere, "Spring");
  assert.equal(s.seasons.september_equinox.slice(0, 10), "2026-09-23");
  const summer = skySnapshot(new Date("2026-07-01T00:00:00Z"));
  assert.equal(summer.sun.tropical_sign, "Cancer");
  assert.equal(summer.sun.constellation, "Gemini");
  assert.ok(s.visible_tonight[0].visible.length > 3);
  console.log("ok sky: tropical sign, IAU constellation, seasons, visible tonight");
}

// --- feed parsing
{
  const items = parseFeed(rss("x", 2));
  assert.equal(items.length, 2);
  assert.equal(items[0].canonical_url, "https://example.org/x/0");
  assert.equal(items[0].full_text, false);
  assert.equal(parseDate("Fri, 09 Oct 2026 05:22:24 +0530"), "2026-10-08T23:52:24.000Z");
  const atom = parseFeed(`<feed><entry><title>A</title><link rel="alternate" href="https://e.org/a"/><updated>2026-10-09T01:00:00Z</updated><content type="html">${"&lt;p&gt;word &lt;/p&gt;".repeat(200)}</content></entry></feed>`);
  assert.equal(atom[0].full_text, true);
  console.log("ok feed parsing (RSS, Atom, dates, full_text rule)");
}

// --- weather severe flags
{
  const w = ledger.find((r) => r.kind === "weather" && r.doc.anchor.id === "caribbean");
  assert.ok(w.doc.severe.includes("thunderstorm"));
  assert.ok(w.doc.severe.includes("hurricane_gusts"));
  const st = await read(repo, "status", {}, { now: NOW });
  assert.equal(st.weather_live, true);
  assert.equal(st.sky_live, true);
  assert.equal(st.live, true);
  assert.ok(st.outlets_live >= 5);
  assert.equal(st.merged, true);
  assert.equal(st.kv_writes, false);
  console.log("ok flags true only after stored data; weather severe flags");
}
console.log("ok aznews-live");
