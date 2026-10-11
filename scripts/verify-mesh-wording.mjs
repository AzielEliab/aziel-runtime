/** MESH-WORDING-1.0: mesh_status does not claim "QNM suite rollup is LIVE" (not backed end to end). */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { meshStatus } from "../src/mesh.js";
let n = 0;
const out = await meshStatus({}, {});
const text = JSON.stringify(out);
assert.ok(!/rollup is LIVE/i.test(text), "mesh_status claims rollup LIVE");
const note = (out && (out.note || (out.result && out.result.note))) || "";
if (/QNM suite rollup/.test(note)) assert.match(note, /read-only presence counts served by this Worker\. Not a live end-to-end QNM mesh\./);
n++;
const { default: worker } = await import("../src/index.js");
const res = await worker.fetch(new Request("https://x.example/v1/mesh"), {}, { waitUntil() {} });
assert.ok(!/rollup is LIVE/i.test(await res.text())); n++;
const hits = [];
const walk = (d) => { for (const e of readdirSync(d)) { const f = join(d, e); if (statSync(f).isDirectory()) walk(f); else if (f.endsWith(".js") && /rollup is LIVE/i.test(readFileSync(f, "utf8"))) hits.push(f); } };
walk(new URL("../src", import.meta.url).pathname);
assert.deepEqual(hits, []); n++;
console.log(`ok mesh wording: ${n} checks`);
// Phoenix, L4 offline read and Cap-7 egress-rotate wording.
{
  const { survivalMethods } = await import("../src/fed-mesh/bearers.js");
  const { l4AzosLayers } = await import("../src/fed-mesh/aznet-layers.js");
  const sm = survivalMethods();
  const list = Array.isArray(sm) ? sm : sm.methods || sm.list || Object.values(sm).find(Array.isArray);
  const ph = list.find((m) => m.id === "phoenix");
  assert.equal(ph.live, false); assert.equal(ph.status, "local_only"); assert.equal(ph.worker_live, false);
  const cap7 = list.find((m) => (m.ops || []).includes("egress-rotate"));
  assert.match(cap7.egress_rotate_note, /Cap-7 name plane only, not public egress or a packet path/);
  assert.equal(cap7.live === true || cap7.status === "live", true, "names-plane live claim kept");
  const l4 = l4AzosLayers();
  const rd = l4.by_need.find((x) => x.need === "read");
  assert.equal(rd.live, false); assert.equal(rd.worker_served, false);
  const res = await worker.fetch(new Request("https://x.example/v1/mesh"), {}, { waitUntil() {} });
  const body = await res.text();
  assert.ok(!/"id":"phoenix"[^}]*"live":true/.test(body));
  console.log("ok mesh wording: phoenix local_only, L4 read not served, egress-rotate qualified");
}
