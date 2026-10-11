/** KERNEL-FIELD-1.0 (all runtime output): every `kernel` key is a boolean; mesh spec names live in kernel_profile. */
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { HONESTY_SENTENCES } from "../src/surface-honesty.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
let n = 0;
function bad(o, p = "$", out = []) {
  if (!o || typeof o !== "object") return out;
  if (Object.prototype.hasOwnProperty.call(o, "kernel") && typeof o.kernel !== "boolean") out.push(p + ".kernel=" + JSON.stringify(o.kernel).slice(0, 60));
  for (const [k, v] of Object.entries(o)) bad(v, p + "." + k, out);
  return out;
}
assert.equal(HONESTY_SENTENCES.kernel, undefined);
assert.match(HONESTY_SENTENCES.kernel_note, /kernel/i); n++;
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
const paths = ["/v1/mesh", "/v1/mesh/status", "/v1/mesh/nodes", "/v1/mesh/nat", "/v1/mesh/nope", "/v1/health", "/v1/fraggate", "/v1/softwares", "/runtime.json", "/v1/clients.json", "/v1/operator", "/v1/surfaces"];
let mesh = null;
for (const p of paths) {
  let res;
  try { res = await worker.fetch(new Request("https://x.example" + p), env, { waitUntil() {} }); } catch { continue; }
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { continue; }
  assert.deepEqual(bad(body), [], p);
  if (p === "/v1/mesh") mesh = body;
  n++;
}
assert.ok(mesh, "/v1/mesh answered JSON");
const prof = JSON.stringify(mesh).includes('"kernel_profile":"mesh"');
assert.ok(prof || !JSON.stringify(mesh).includes('"kernel"'), "mesh kernel string moved to kernel_profile"); n++;
// Every src literal: no `kernel: <string or identifier>` other than false/true/boolean expressions.
const { readFileSync, readdirSync, statSync } = await import("node:fs");
const { join } = await import("node:path");
const lits = [];
const walk = (d) => { for (const e of readdirSync(d)) { const f = join(d, e); if (statSync(f).isDirectory()) walk(f); else if (f.endsWith(".js")) readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/^\s*"?kernel"?\s*:\s*("|'|`|[A-Z_]{3,}\b)/.test(l)) lits.push(f + ":" + (i + 1)); }); } };
walk(new URL("../src", import.meta.url).pathname);
assert.deepEqual(lits, [], "string-valued kernel in src"); n++;
console.log(`ok kernel boolean: ${n} checks`);
