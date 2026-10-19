/** KERNEL-FIELD-1.0: `kernel` is a boolean (false: no OS kernel); the FragGate repo URL is `kernel_repo_url`. */
import assert from "node:assert/strict";
const { default: worker } = await import("../src/index.js");
const origin = "https://aziel-runtime.example";
const get = async (p) => (await worker.fetch(new Request(origin + p), {})).json();
let n = 0;
function walk(o, path, seen) {
  if (!o || typeof o !== "object") return;
  if (Object.prototype.hasOwnProperty.call(o, "kernel") && typeof o.kernel === "string" && /^https?:/.test(o.kernel)) seen.push(path + ".kernel");
  for (const [k, v] of Object.entries(o)) walk(v, path + "." + k, seen);
}
for (const p of ["/v1/fraggate/list", "/v1/fraggate", "/v1/software", "/v1/health", "/v1/runtime.json"]) {
  const body = await get(p);
  const urlKernels = [];
  walk(body, p, urlKernels);
  assert.deepEqual(urlKernels, [], "URL-valued kernel left at " + urlKernels.join(", "));
  n++;
}
const list = await get("/v1/fraggate/list");
assert.equal(list.kernel, false);
assert.equal(list.kernel_repo_url, "https://github.com/AzielEliab/fraggate");
// registry_digest moves with ENGINE_DIGESTS (engine wording changed in DOCS-WORDING-1.0)
// and with the memory op list (LATTICE-LEARN-1.0 added lattice-learn, additive)
// and with the mesh op list (AGENT-SUBNET-1.0 added agent-* mesh ops incl. agent-retire, additive; live_count stays 42).
assert.equal(list.registry_digest, "89e1bb2d8fca3e732863079348ee23ebc633df73ff5bf0e1e72d9a8cb50de9c8");
assert.equal(list.stub_op_count, 363);
assert.equal(list.live_count, 42);
n += 5;
console.log(`ok kernel field: ${n} checks`);
