/**
 * AZNEWS-LIVE-1.0 checks: ingest -> dual lattice, two pins per report, pull + view
 * receipts linked, pins survive a cache retention trim, null event location with a
 * reason, pin colors, the 3-year matching window, the last-10 list, and the sky math.
 * Uses fixture feeds through an injected fetch. No network.
 */
import assert from "node:assert/strict";
import { memoryRepo, tick, read, mintViews, walkStep, joinCheck, viewerHash, CACHE_KEEP, OUTLETS_LIVE_WINDOW_MS } from "../src/engines/4dmap/aznews-live.js";
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
  assert.equal(again.view_receipts[0].pull_receipt_seq, pull.seq, "a repeat view still names its pull receipt");
  // offline view: secondary = H(document hash + username); a second offline write refuses.
  const off = await mintViews(repo, [n.seq], { offline: true, username: "azbot", now: NOW + 3600000 });
  const offRow = ledger.find((r) => r.seq === off[0].view_receipt_seq);
  assert.equal(offRow.lattice.secondary, await latticeOfflineSecondary(offRow.lattice.document_hash, "azbot"));
  const v = await read(repo, "verify", { limit: 300 }, { now: NOW });
  assert.equal(v.ok, true, JSON.stringify(v.full_walk.breaks));
  assert.equal(v.full_walk.document_hash_misses, 0);
  assert.equal(v.full_walk.from_genesis, true);
  assert.equal(v.full_walk.verified_through, await repo.count(), "verify walks to the tip");
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
  for (const x of p.last10) assert.ok(Number.isFinite(Date.parse(x.added_at)), "last10 carries added_at");
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

// --- AZBot 2026-10-09 fixes ---------------------------------------------------

// 1. joined/merged from real pin <-> item links; news_pin / news_open use the store
{
  const st = await read(repo, "status", {}, { now: NOW });
  assert.equal(st.join_check.sample > 0, true);
  assert.equal(st.join_check.linked, st.join_check.sample);
  assert.equal(st.joined, true);
  assert.equal(st.merged, true);
  const n = ledger.filter((r) => r.kind === "news").at(-1);
  const viaPin = await read(repo, "news_pin", { item_id: n.doc.item_id }, { now: NOW });
  assert.equal(viaPin.ok, true);
  assert.deepEqual(viaPin.pins.map((p) => p.role).sort(), ["event", "report"]);
  for (const p of viaPin.pins) {
    const back = await read(repo, "news_open", { pin_id: p.pin_id }, { now: NOW });
    assert.equal(back.ok, true);
    assert.equal(back.linked, true);
    assert.equal(back.item.item_id, n.doc.item_id, "pin -> item round trip");
  }
  const byUrl = await read(repo, "news_pin", { url: n.doc.canonical_url + "?utm_source=y" }, { now: NOW });
  assert.equal(byUrl.item.item_id, n.doc.item_id, "item found by canonical url");
  const none = await read(repo, "news_pin", { item_id: "n-doesnotexist" }, { now: NOW });
  assert.equal(none.code, "AZNEWS-NO-MATCH");
  assert.notEqual(none.code, "AZNEWS-SOURCE-ABSENT");
  // A broken link fails the join: tamper a pin in a copy of the store.
  const r2 = memoryRepo();
  await tick(r2, { fetchImpl: fakeFetch(2), now: NOW });
  assert.equal((await read(r2, "status", {}, { now: NOW })).joined, true);
  const victim = r2._ledger.filter((r) => r.kind === "pin" && r.doc.report_kind === "news").at(-1);
  victim.doc.report_seq = 1;
  const j = await joinCheck(r2, { now: NOW, verifiedThrough: await r2.count() });
  assert.equal(j.joined, false);
  assert.equal(j.merged, false);
  const st2 = await read(r2, "status", {}, { now: NOW });
  assert.equal(st2.joined, false);
  assert.equal(st2.merged, false);
  assert.match(st2.joined_reason, /Join check failed/);
  console.log("ok joined/merged come from real pin<->item links; news_pin/news_open read the store");
}

// 3. lattice_live = full checkpointed walk from genesis, bounded per step; a break is caught
{
  const r3 = memoryRepo();
  await tick(r3, { fetchImpl: fakeFetch(4), now: NOW });
  const total = await r3.count();
  assert.ok(total > 60);
  await r3.commit({ meta: { walk: null } });
  let w = await walkStep(r3, { now: NOW, maxRows: 25 });
  assert.equal(w.verified_through, 25, "one bounded step");
  assert.equal(w.walked_this_step, 25);
  let st = await read(r3, "status", {}, { now: NOW });
  assert.equal(st.lattice_live, false, "not live before the walk reaches the tip");
  assert.equal(st.live, false);
  while (w.lag_rows > 0) w = await walkStep(r3, { now: NOW, maxRows: 25 });
  assert.equal(w.verified_through, total);
  assert.equal(w.breaks.length, 0);
  st = await read(r3, "status", {}, { now: NOW });
  assert.equal(st.lattice_live, true);
  assert.equal(st.lattice_walk.from_genesis, true);
  // tamper a row the walk has not reached yet
  await r3.commit({ meta: { walk: null } });
  r3._ledger[40].doc.title = "tampered";
  w = await walkStep(r3, { now: NOW, maxRows: 1000 });
  assert.equal(w.breaks.length, 1);
  assert.equal(w.breaks[0].reason, "document-hash-mismatch");
  st = await read(r3, "status", {}, { now: NOW });
  assert.equal(st.lattice_live, false);
  assert.equal(st.live, false);
  assert.equal(st.merged, false);
  const later = await walkStep(r3, { now: NOW + 60000 });
  assert.equal(later.verified_through, w.verified_through, "a break is permanent; the walk stops");
  console.log("ok lattice_live is a full checkpointed walk from genesis; tamper breaks it");
}

// 4. outlets_live is rolling with a window and timestamp
{
  const st = await read(repo, "status", {}, { now: NOW });
  assert.equal(st.outlets_live_window.kind, "rolling");
  assert.equal(st.outlets_live_window.minutes, 60);
  assert.equal(st.outlets_live_window.as_of, new Date(NOW).toISOString());
  const stale = await read(repo, "status", {}, { now: NOW + OUTLETS_LIVE_WINDOW_MS + 5 * 60000 });
  assert.equal(stale.outlets_live, 0, "outlets drop out of the rolling window");
  console.log("ok outlets_live is a rolling 60-minute count with as_of");
}

// 5. dry_run mints no receipts
{
  const before = ledger.filter((r) => r.kind === "view_receipt").length;
  const later = NOW + 5 * 3600000;
  for (const op of ["feed", "weather", "sky", "globe", "news_pin"]) {
    const out = await read(repo, op, { dry_run: true }, { now: later });
    assert.equal(out.ok, true, op);
  }
  const it = await read(repo, "feed", { dry_run: "1", limit: 3 }, { now: later });
  assert.equal(it.view_receipts.every((v) => v.dry_run === true && v.minted === false), true);
  const walkBefore = await repo.metaGet("walk");
  await read(repo, "verify", { dry_run: true }, { now: later });
  assert.deepEqual(await repo.metaGet("walk"), walkBefore, "dry_run verify persists nothing");
  assert.equal(ledger.filter((r) => r.kind === "view_receipt").length, before);
  console.log("ok dry_run on news reads mints no receipts");
}

// 6. offline/username gate
{
  const rows = ledger.length;
  const refused = await read(repo, "feed", { offline: true, username: "Mallory Chosen Name" }, { now: NOW });
  assert.equal(refused.code, "AZNEWS-OFFLINE-AUTH-REQUIRED");
  const refused2 = await read(repo, "feed", { username: "Mallory Chosen Name" }, { now: NOW });
  assert.equal(refused2.code, "AZNEWS-OFFLINE-AUTH-REQUIRED");
  assert.equal(ledger.length, rows, "nothing written");
  const later = NOW + 7 * 3600000;
  const ok = await read(repo, "item", { item_id: ledger.find((r) => r.kind === "news").doc.item_id, offline: true, username: "Operator Name" }, { now: later, auth: true });
  assert.equal(ok.view_receipts[0].minted, true);
  const row = ledger.find((r) => r.seq === ok.view_receipts[0].view_receipt_seq);
  const vh = await viewerHash("Operator Name");
  assert.equal(row.doc.viewer, vh);
  assert.match(vh, /^vh-[0-9a-f]{32}$/);
  assert.equal(row.lattice.secondary, await latticeOfflineSecondary(row.lattice.document_hash, vh));
  assert.equal(JSON.stringify(ledger).includes("Operator Name"), false, "the chosen name never reaches the ledger");
  assert.equal(JSON.stringify(ledger).includes("Mallory"), false);
  console.log("ok offline views need auth; names are hashed and namespaced");
}

// 7. blue pins: dateline from the text, outlet HQ labeled outlet_hq
{
  const hq = { hq_city: "London", hq_lat: 51.5, hq_lon: -0.12, country: "GB" };
  for (const [text, name] of [["LONDON, Oct 9 (Reuters) - Shares fell.", "London"], ["NEW DELHI: The ministry said.", "New Delhi"], ["Mumbai, October 9: Markets rose.", "Mumbai"], ["WASHINGTON — The Senate voted.", "Washington"]]) {
    const r = reportedLocation({ text, outlet: { ...hq, hq_city: "Nowhere", hq_lat: 0, hq_lon: 0 } });
    assert.equal(r.reported_location.report_location_source, "dateline", text);
    assert.equal(r.reported_location.name, name);
  }
  for (const text of ["Video: Congress leaders clash.", "Watch: crowds gather.", "Markets were calm."]) {
    const r = reportedLocation({ text, outlet: hq });
    assert.equal(r.reported_location.report_location_source, "outlet_hq", text);
  }
  const reportPins = ledger.filter((r) => r.kind === "pin" && r.doc.role === "report" && r.doc.report_kind === "news");
  assert.ok(reportPins.every((p) => ["dateline", "outlet_hq"].includes(p.doc.report_location_source)));
  const p = await read(repo, "pin", { pin_id: `pin-${reportPins[0].seq}` }, { now: NOW });
  assert.equal(p.pin.report_location_source, "dateline");
  assert.match(colorFor("news-report").label, /dateline/);
  assert.match(colorFor("news-report").label, /outlet_hq/);
  console.log("ok blue pins: dateline from the item text; outlet HQ only as labeled outlet_hq");
}

// 8. moon phase by illumination and waxing/waning, against known dates
{
  const cases = [
    ["2026-10-09T06:00:00Z", "Waning Crescent"],
    ["2026-10-10T15:00:00Z", "New Moon"],
    ["2024-04-08T18:21:00Z", "New Moon"],
    ["2024-09-18T02:35:00Z", "Full Moon"],
    ["2024-01-18T04:00:00Z", "First Quarter"],
    ["2024-02-02T23:00:00Z", "Last Quarter"],
    ["2024-04-12T00:00:00Z", "Waxing Crescent"],
    ["2024-09-22T00:00:00Z", "Waning Gibbous"],
  ];
  for (const [d, name] of cases) assert.equal(skySnapshot(new Date(d)).moon.phase_name, name, d);
  const m = skySnapshot(new Date("2026-10-09T06:00:00Z")).moon;
  assert.equal(m.trend, "waning");
  assert.ok(m.illuminated_percent > 2 && m.illuminated_percent < 2.5, String(m.illuminated_percent));
  assert.equal(m.next_new_moon.slice(0, 10), "2026-10-10");
  console.log("ok moon phase named by illumination and trend; principal phases within 12 h");
}
console.log("ok aznews-live");
