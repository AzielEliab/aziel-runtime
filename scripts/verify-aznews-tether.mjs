/**
 * AZRT-AZOS-NEWS-1.0: the AzNewsStore sends its ledger rows to AZ-OS in signed,
 * contiguous packets from genesis; a fork or a refused packet stops the push.
 * Uses fixture feeds and an in-memory AZ-OS receiver. No network.
 */
import assert from "node:assert/strict";
import { memoryRepo, tick, mintViews, viewerHash } from "../src/engines/4dmap/aznews-live.js";
import { wiredOutlets } from "../src/engines/4dmap/aznews-outlets.js";
import { WEATHER_ANCHORS } from "../src/engines/4dmap/aznews-weather.js";
import { pushNewsCopy, buildNewsPacket, NEWS_TETHER_SPEC, NEWS_TETHER_ROUTE } from "../src/aznews-tether.js";
import { tetherKey, tetherStatement } from "../src/azos-tether.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { verifyLattice, LATTICE_GENESIS } from "../src/dual-lattice.js";

const NOW = Date.parse("2026-10-09T06:00:00Z");
const env = { TETHER_SIGNING_SEED: "11".repeat(32), GIT_SHA: "f".repeat(40) };
const key = await tetherKey(env);

function rss(prefix, n) {
  let x = "";
  for (let i = 0; i < n; i++) x += `<item><title>Quake hits Tokyo ${prefix} ${i}</title><link>https://example.org/${prefix}/${i}</link><pubDate>Fri, 09 Oct 2026 0${i}:00:00 GMT</pubDate><description>TOKYO (AP) — Quake hits Tokyo ${i}. More later.</description></item>`;
  return `<?xml version="1.0"?><rss><channel>${x}</channel></rss>`;
}
const fetchImpl = async (url) => {
  const u = String(url);
  if (u.startsWith("https://api.open-meteo.com/")) return new Response(JSON.stringify(WEATHER_ANCHORS.map((a) => ({ latitude: a.lat, longitude: a.lon, current: { time: "2026-10-09T06:00", temperature_2m: 20, weather_code: 1, wind_speed_10m: 5 } }))));
  const o = wiredOutlets().find((w) => w.feed_url === u);
  return o ? new Response(rss(o.id, 3)) : new Response("no", { status: 404 });
};

const repo = memoryRepo();
await tick(repo, { fetchImpl, now: NOW });
await mintViews(repo, [1], { now: NOW, offline: true, username: await viewerHash("someone") });
const total = await repo.count();
assert.ok(total > 50, "fixture ledger has rows");

// Receiver: what AZ-OS checks (signature over the canonical packet minus sig, links, doc hashes, tips).
function receiver({ refuseAt = null } = {}) {
  const st = { tip_seq: 0, tips: null, rows: [] };
  const fetcher = async (url, init = {}) => {
    assert.ok(String(url).endsWith(NEWS_TETHER_ROUTE));
    if (!init.method) return new Response(JSON.stringify({ ok: true, tip_seq: st.tip_seq, tips: st.tips }));
    const p = JSON.parse(init.body);
    assert.equal(p.spec, NEWS_TETHER_SPEC);
    const pub = await crypto.subtle.importKey("raw", Buffer.from(p.public_key, "base64url"), { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("Ed25519", pub, Buffer.from(p.sig, "base64url"), new TextEncoder().encode(tetherStatement(p)));
    assert.ok(ok, "signature verifies");
    assert.equal(p.after_seq, st.tip_seq);
    const anchor = st.tips || { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS };
    const v = await verifyLattice(p.rows, { pick: (r) => r.lattice, anchor, legacyAllowed: false });
    assert.ok(v.ok, "rows link from the stored tip");
    for (const r of p.rows) assert.equal(await sha256Hex(canonicalize(r.doc)), r.lattice.document_hash);
    const last = p.rows[p.rows.length - 1];
    assert.equal(p.tips.primary, last.lattice.primary);
    if (refuseAt !== null && st.tip_seq >= refuseAt) return new Response(JSON.stringify({ ok: false, code: "NEWS-COPY-HASH" }), { status: 409 });
    st.rows.push(...p.rows);
    st.tip_seq = last.seq;
    st.tips = { primary: last.lattice.primary, secondary: last.lattice.secondary };
    return new Response(JSON.stringify({ ok: true, stored: true, verified: true, tip_seq: st.tip_seq }));
  };
  return { st, fetcher };
}

{
  const r = receiver();
  let out;
  let rounds = 0;
  do {
    out = await pushNewsCopy(env, repo, { key, fetcher: r.fetcher, maxRows: 40, packets: 2 });
    assert.equal(out.ok, true, out.code);
    rounds += 1;
  } while (out.lag_rows > 0 && rounds < 50);
  assert.equal(r.st.tip_seq, total);
  assert.equal(r.st.rows.length, total);
  assert.ok(r.st.rows.some((x) => x.lattice.offline === true), "offline view row carried (hashed viewer only)");
  assert.ok(r.st.rows.filter((x) => x.lattice.offline).every((x) => /^vh-/.test(x.lattice.username)));
  const again = await pushNewsCopy(env, repo, { key, fetcher: r.fetcher });
  assert.equal(again.code, "NEWS-TETHER-CURRENT");
  console.log("ok news tether: signed contiguous packets from genesis", total, "rows in", rounds, "pushes");
}

// Byte cap splits packets; refusal stops; absent key sends nothing; fork is detected.
{
  const r = receiver({ refuseAt: 1 });
  const out = await pushNewsCopy(env, repo, { key, fetcher: r.fetcher, maxRows: 5 });
  assert.equal(out.ok, false);
  assert.equal(out.code, "NEWS-COPY-HASH");
  const none = await pushNewsCopy({}, repo, { fetcher: r.fetcher });
  assert.equal(none.code, "NEWS-TETHER-KEY-ABSENT");
  const small = await buildNewsPacket({ key, repo, afterSeq: 0, expect: null, maxRows: 100, maxBytes: 1 });
  assert.equal(small.packet.rows.length, 1, "byte cap still sends at least one row");
  const forkFetch = async (url, init = {}) => new Response(JSON.stringify({ ok: true, tip_seq: 3, tips: { primary: "a".repeat(64), secondary: "b".repeat(64) } }));
  const fork = await pushNewsCopy(env, repo, { key, fetcher: forkFetch });
  assert.equal(fork.code, "NEWS-TETHER-FORK");
  console.log("ok news tether: refusal, key absent, byte cap, fork");
}
console.log("ok aznews-tether");
