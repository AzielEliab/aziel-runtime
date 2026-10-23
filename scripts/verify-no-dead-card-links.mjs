// The homepage must not link to href="null" (in-runtime products have no counted
// tarball) and every /p/<slug> product card it links to must answer 200 — including
// worker-only Whitestone, which is served from WORKER_ONLY_PRODUCTS, not 404.
import worker, { PRODUCTS } from "../src/index.js";
import { WORKER_ONLY_PRODUCTS, WHITESTONE_APP_ORIGIN } from "../src/software-catalog.js";

globalThis.fetch = async () => new Response("offline", { status: 503 }); // no network in tests
const ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
const ctx = { waitUntil() {}, passThroughOnException() {} };
const get = (path) => worker.fetch(new Request(ORIGIN + path, { headers: { accept: "text/html" } }), {}, ctx);

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error("FAIL " + msg);
  }
};

const home = await (await get("/")).text();
ok(!/href=["']?(null|undefined)["'\s>]/.test(home), `homepage has no href="null"/"undefined"`);
for (const slug of ["zkattest", "mmconsensus", "toolbench", "azvpn"]) {
  ok(PRODUCTS.some((p) => p.slug === slug && !p.worker), `${slug} is in-runtime (no Worker)`);
  ok(home.includes(`/p/${slug}">in-runtime</a> (no counted Worker tarball)`), `${slug}: cite list says in-runtime and links its card`);
}

const llms = await (await get("/llms.txt")).text();
ok(!/counted tarball null/.test(llms), "llms.txt never prints 'counted tarball null'");

const cards = new Set([...home.matchAll(/href="(?:https:\/\/aziel-runtime\.vibelock\.workers\.dev)?\/p\/([a-z0-9-]+)\/?"/gi)].map((m) => m[1].toLowerCase()));
ok(cards.has("whitestone"), "homepage links /p/whitestone");
for (const slug of cards) {
  const res = await get(`/p/${slug}`);
  ok(res.status === 200, `/p/${slug} card 200 (got ${res.status})`);
}

const ws = WORKER_ONLY_PRODUCTS.find((s) => s.slug === "whitestone");
const res = await get("/p/whitestone");
const page = await res.text();
ok(res.status === 200 && /text\/html/.test(res.headers.get("content-type") || ""), "/p/whitestone is a 200 HTML page");
ok(page.includes(`href="${WHITESTONE_APP_ORIGIN}/"`), "/p/whitestone links the live Whitestone app");
ok(page.includes(`href="${ws.github}"`), "/p/whitestone links its GitHub repo");
ok(!/href=["']?(null|undefined)["'\s>]/.test(page), `/p/whitestone has no href="null"`);
const unknown = await get("/p/not-a-product");
ok(unknown.status === 404, "unknown slugs still 404");

if (failed) {
  console.error(`verify-no-dead-card-links: ${failed} failed`);
  process.exit(1);
}
console.log(`verify-no-dead-card-links: ${cards.size} homepage /p cards 200, whitestone card served, no href="null"`);
