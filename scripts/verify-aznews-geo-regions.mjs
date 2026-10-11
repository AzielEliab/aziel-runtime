// AZNEWS-GEO-1.1 region gazetteer + AZNEWS-FEED-RETRY-1.0 checks. Author: Aziel Eliab.
import assert from "node:assert/strict";
import { eventLocation, GEO_SPEC } from "../src/engines/4dmap/aznews-geo.js";
import { OUTLETS, wiredOutlets } from "../src/engines/4dmap/aznews-outlets.js";
import { FEED_ATTEMPTS, OUTLETS_PER_TICK } from "../src/engines/4dmap/aznews-live.js";
assert.equal(GEO_SPEC, "AZNEWS-GEO-1.1");
const ev = (title, outletCountry = "US", text = "") => eventLocation({ title, text, outletName: "X", outletCountry }).event_location;
assert.equal(ev("Floods hit West Bengal", "IN").name, "West Bengal");
assert.equal(ev("Floods hit West Bengal", "IN").kind, "admin1");
assert.equal(ev("Hurricane hits the Gulf Coast").name, "Gulf Coast");
assert.equal(ev("Storm moves into Gulf of Mexico").kind, "named-region");
assert.equal(ev("Wildfire in Texas").iso, "US");
// Florida is shared by US and Uruguay: home-country tie-break, labeled.
const fl = ev("Storm surge in Florida", "US");
assert.equal(fl.iso, "US"); assert.equal(fl.resolved_by, "outlet-country");
assert.equal(ev("Storm surge in Florida", "GB"), null, "ambiguous admin-1 with no named or home country must stay null");
// Finer point wins: city beats its own state.
assert.equal(ev("Shooting in Houston, Texas").kind, "city");
// Stoplisted words never place a story.
assert.equal(ev("Meta unveils glasses"), null);
assert.equal(ev("Batman returns to theaters"), null);
const r = eventLocation({ title: "Celebrity gossip roundup", text: "", outletName: "X" });
assert.equal(r.event_location, null); assert.match(r.reason, /Nothing was guessed/);
// Feed retry stays within the 50-subrequest cap: feeds x attempts + 30 images + 1 weather.
assert.ok(OUTLETS_PER_TICK * FEED_ATTEMPTS + 30 + 1 <= 50);
assert.equal(OUTLETS.length, 50);
assert.ok(wiredOutlets().some((o) => o.id === "india-com"));
assert.equal(OUTLETS.find((o) => o.id === "washingtonpost").timeout_ms, 20000);
console.log("verify-aznews-geo-regions: ok", { wired: wiredOutlets().length });
