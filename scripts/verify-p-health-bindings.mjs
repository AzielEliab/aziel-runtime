// Every catalog product with its own Worker must have a [[services]] binding in
// wrangler.toml, named by bindingName(). Without one, /p/<slug>/* falls back to the
// public workers.dev URL, which Cloudflare refuses same-account (error 1042).
import { readFileSync } from "node:fs";
import worker, { PRODUCTS, bindingName } from "../src/index.js";

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error("FAIL " + msg);
  }
};
const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const services = new Map([...toml.matchAll(/\[\[services\]\]\nbinding = "([^"]+)"\nservice = "([^"]+)"/g)].map((m) => [m[1], m[2]]));
const withWorker = PRODUCTS.filter((p) => p.worker);
for (const p of withWorker) {
  const name = bindingName(p);
  ok(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name), `${p.slug}: binding name ${name} is a JS identifier`);
  ok(services.get(name) === p.worker, `${p.slug}: wrangler.toml binds ${name} -> ${p.worker} (got ${services.get(name)})`);
}
for (const slug of ["4dmap", "azcoherence", "embryolock"]) {
  ok(withWorker.some((p) => p.slug === slug), `${slug} is a catalog product with a Worker`);
}
ok(bindingName({ slug: "4dmap" }) === "FOURDMAP", "4dmap binding is FOURDMAP");
ok(bindingName({ slug: "aziel-corpus" }) === "AZIEL_CORPUS", "default binding names unchanged");

// /p/<slug>/health goes through the service binding when it is bound.
for (const slug of ["4dmap", "azcoherence", "embryolock"]) {
  const product = PRODUCTS.find((p) => p.slug === slug);
  const seen = [];
  const env = {
    [bindingName(product)]: {
      fetch: async (req) => {
        seen.push(new URL(req.url).pathname);
        return new Response(JSON.stringify({ ok: true, slug }), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  };
  const res = await worker.fetch(new Request(`https://aziel-runtime.vibelock.workers.dev/p/${slug}/health`), env, { waitUntil() {}, passThroughOnException() {} });
  ok(res.status === 200, `/p/${slug}/health 200 via binding (got ${res.status})`);
  ok(seen.includes("/v1/health"), `/p/${slug}/health called ${bindingName(product)} /v1/health (saw ${seen.join(",")})`);
}
if (failed) {
  console.error(`verify-p-health-bindings: ${failed} failed`);
  process.exit(1);
}
console.log(`verify-p-health-bindings: ${withWorker.length} product Workers bound; 3 /p/*/health via binding ok`);
