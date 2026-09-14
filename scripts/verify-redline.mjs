/**
 * REDLINE-2026-09-14 attack sims. Success = redline + sims green.
 * Attempts to call AZ Generator, enable mesh via GET, inject
 * resolves_to_hub true, present a fake Zenodo DOI, or leak the
 * operator token must REFUSE. Growth-ON Allow stays.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOI_BY_SLUG } from "../src/catalog-meta.js";
import { executeLocal } from "../src/engines/runner.js";
import {
  AZ_GENERATOR_HALLUC_SLUGS,
  PUBLIC_DOORS,
  REDLINE_DOCS,
  REDLINE_GPTBOT_DISALLOW,
  REDLINE_GROWTH_ON,
  REDLINE_PERSON_ID,
  REDLINE_SOFTWARE_TAB,
  REDLINE_SPEC,
  TLS_CITE,
  azGeneratorCallRefuse,
  bodyHasTokenKey,
  doiInjectionRefuse,
  fakeDoiRefuse,
  foldlockRealCite,
  isAzGeneratorHallucSlug,
  isKnownZenodoDoi,
  meshGetLooksLikeEnable,
  redlineCiteField,
  responseLeaksToken,
} from "../src/redline.js";
import { AUTHOR_ID, SUITE_DESIGNS } from "../src/seo.js";
import { CAP7_DESIGN_OF, CAP7_RESOLVES_TO_HUB, cap7InjectionAttempt } from "../src/semantic-bridge.js";
import { memorySessionNamespace } from "../src/session-do.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const SECRET = "redline-operator-secret-value";
const env = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: SECRET };

async function req(path, init = {}) {
  return handler(
    new Request(origin + path, {
      headers: { "user-agent": "Mozilla/5.0", ...(init.headers || {}) },
      ...init,
    }),
    env,
  );
}

async function jsonReq(path, init = {}) {
  const res = await req(path, init);
  const data = await res.json();
  return { status: res.status, data };
}

assert.equal(REDLINE_SPEC, "REDLINE-2026-09-14");
assert.equal(REDLINE_GROWTH_ON, true);
assert.equal(REDLINE_GPTBOT_DISALLOW, false);
assert.equal(REDLINE_SOFTWARE_TAB, false);
assert.equal(REDLINE_PERSON_ID, AUTHOR_ID);
assert.equal(AUTHOR_ID, "https://www.azieleliab.com/#aziel");
assert.equal(TLS_CITE.via, "cloudflare");
assert.equal(TLS_CITE.client_side_crypto_claim, false);
assert.equal(CAP7_DESIGN_OF, "hub_designs");
assert.equal(CAP7_RESOLVES_TO_HUB, false);
assert.ok(PUBLIC_DOORS.some((d) => d.path === "/v1/session/open" && d.auth === "operator_header"));
assert.ok(SUITE_DESIGNS.some((d) => d.id === REDLINE_SPEC && d.file === "REDLINE-2026-09-14.md"));

const paper = readFileSync(new URL("../docs/designs/REDLINE-2026-09-14.md", import.meta.url), "utf8");
assert.match(paper, /REDLINE-2026-09-14/);
assert.match(paper, /Growth-ON/);
assert.match(paper, /No `Disallow` for GPTBot/);
assert.match(paper, /header-only/);
assert.match(paper, /Cloudflare/);
assert.match(paper, /design_of: hub_designs/);
assert.doesNotMatch(paper, /Disallow GPTBot for budget/);

// --- sim 1: call AZ Generator ---
assert.ok(isAzGeneratorHallucSlug("az-generator"));
assert.equal(azGeneratorCallRefuse().code, "AZ-GEN-CALL-REFUSED");
for (const slug of AZ_GENERATOR_HALLUC_SLUGS) {
  const call = await jsonReq("/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, op: "register", payload: { name: "fake.az" } }),
  });
  assert.equal(call.data.ok, false, `az-gen ${slug}`);
  assert.equal(call.data.code, "AZ-GEN-CALL-REFUSED");
  assert.equal(call.data.live_registrar, false);
}
const azPost = await jsonReq("/v1/mesh/az-generator", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ register: true, name: "evil.az" }),
});
assert.equal(azPost.status, 400);
assert.equal(azPost.data.ok, false);
assert.match(String(azPost.data.code), /AZ-GEN-CALL-REFUSED|CAP7-RESOLVE-INJECT|CAP7-CITE-ONLY/);

// --- sim 2: enable mesh via GET /v1/mesh ---
assert.equal(meshGetLooksLikeEnable(new URLSearchParams("enable=true"), {}), true);
const meshGet = await jsonReq("/v1/mesh?enable=true");
assert.equal(meshGet.data.ok, false);
assert.equal(meshGet.data.code, "MESH-GET-NEVER-ENABLES");
assert.equal(meshGet.data.get_never_enables, true);
assert.equal(meshGet.data.enabled_by_get, false);
const meshPlain = await jsonReq("/v1/mesh");
assert.equal(meshPlain.status, 200);
assert.equal(meshPlain.data.get_never_enables, true);

// --- sim 3: Cap-7 resolves_to_hub true injection ---
assert.equal(cap7InjectionAttempt({ resolves_to_hub: true }), "resolves_to_hub");
const injectGet = await jsonReq("/v1/mesh/az-generator?resolves_to_hub=true");
assert.equal(injectGet.status, 400);
assert.equal(injectGet.data.ok, false);
assert.equal(injectGet.data.code, "CAP7-RESOLVE-INJECT");
assert.equal(injectGet.data.resolves_to_hub, false);
assert.equal(injectGet.data.design_of, "hub_designs");
const injectBridge = await jsonReq("/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    slug: "miragegrid",
    op: "bridge",
    payload: { origin, resolves_to_hub: true, design_of: "hostname" },
  }),
});
const injectBody = injectBridge.data.result || injectBridge.data;
assert.equal(injectBody.ok, false);
assert.equal(injectBody.code, "CAP7-RESOLVE-INJECT");
assert.equal(injectBody.resolves_to_hub, false);
assert.equal(injectBody.design_of, "hub_designs");

const localInject = JSON.parse(
  (
    await executeLocal({
      slug: "miragegrid",
      op: "bridge",
      payload: { origin, resolves_to_hub: true },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(localInject.ok, false);
assert.equal(localInject.code, "CAP7-RESOLVE-INJECT");
assert.equal(localInject.design_of, "hub_designs");

const citeOk = await jsonReq("/cite.json");
assert.equal(citeOk.status, 200);
assert.equal(citeOk.data.semantic_bridge.design_of, "hub_designs");
assert.equal(citeOk.data.semantic_bridge.resolves_to_hub, false);
assert.equal(citeOk.data.redline.spec, REDLINE_SPEC);
assert.equal(citeOk.data.redline.person_id, AUTHOR_ID);
assert.equal(citeOk.data.redline.lamb_lens.door, false);
assert.equal(citeOk.data.redline.attack_sims.pointer, "scripts/verify-redline.mjs");
assert.equal(citeOk.data.redline.cap7.design_of, CAP7_DESIGN_OF);
assert.equal(citeOk.data.redline.cap7.resolves_to_hub, CAP7_RESOLVES_TO_HUB);

const shelvesOk = await jsonReq("/shelves");
assert.equal(shelvesOk.status, 200);
assert.equal(shelvesOk.data.redline.spec, REDLINE_SPEC);
assert.equal(shelvesOk.data.cap7.design_of, CAP7_DESIGN_OF);
assert.equal(shelvesOk.data.cap7.resolves_to_hub, false);
assert.equal(shelvesOk.data.attack_sims.refuse, true);
assert.equal(shelvesOk.data.attack_sims.pointer, "scripts/verify-redline.mjs");
assert.ok(PUBLIC_DOORS.some((d) => d.path === "/shelves" && d.role === "cite"));
assert.ok(PUBLIC_DOORS.some((d) => d.path === "/v1/shelves" && d.role === "cite"));
assert.equal(citeOk.data.tls.via, "cloudflare");
assert.equal(citeOk.data.tls.client_side_crypto_claim, false);

// --- sim 4: fake Zenodo DOI ---
const fake = "10.5281/zenodo.99999999";
assert.equal(isKnownZenodoDoi(fake), false);
assert.equal(fakeDoiRefuse(fake).code, "DOI-FAKE-REFUSED");
assert.equal(doiInjectionRefuse(fake).code, "DOI-FAKE-REFUSED");
assert.equal(doiInjectionRefuse(DOI_BY_SLUG.foldlock), null);
const doiGet = await jsonReq(`/cite.json?doi=${encodeURIComponent(fake)}`);
assert.equal(doiGet.status, 400);
assert.equal(doiGet.data.code, "DOI-FAKE-REFUSED");
assert.equal(doiGet.data.doi, null);
assert.doesNotMatch(JSON.stringify(citeOk.data.products.map((p) => p.doi)), /zenodo\.XXXX|99999999/);

// --- sim 5: token leak in query / body / response ---
assert.equal(bodyHasTokenKey({ runtime_token: SECRET }), true);
const qTok = await jsonReq(`/v1/session/open?token=${encodeURIComponent(SECRET)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
assert.equal(qTok.status, 400);
assert.equal(qTok.data.code, "TOKEN-QUERY-REFUSED");
assert.equal(responseLeaksToken(qTok.data, [SECRET]), false);
assert.doesNotMatch(JSON.stringify(qTok.data), new RegExp(SECRET));

const bodyTok = await jsonReq("/v1/session/open", {
  method: "POST",
  headers: { "content-type": "application/json", "X-Aziel-Runtime-Token": SECRET },
  body: JSON.stringify({ runtime_token: SECRET }),
});
assert.equal(bodyTok.status, 400);
assert.equal(bodyTok.data.code, "TOKEN-BODY-REFUSED");
assert.doesNotMatch(JSON.stringify(bodyTok.data), new RegExp(SECRET));

const anon = await jsonReq("/v1/session/open", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
assert.equal(anon.status, 401);
assert.equal(anon.data.code, "token_required");
assert.doesNotMatch(JSON.stringify(anon.data), /redline-operator|RUNTIME_TOKEN=/);
assert.doesNotMatch(JSON.stringify(anon.data), /Bearer\s+\S{8,}/);

const opened = await jsonReq("/v1/session/open", {
  method: "POST",
  headers: { "content-type": "application/json", Authorization: `Bearer ${SECRET}` },
  body: "{}",
});
assert.equal(opened.status, 200);
assert.doesNotMatch(JSON.stringify(opened.data), new RegExp(SECRET));
assert.equal(responseLeaksToken(opened.data, [SECRET]), false);

// FoldLock: cite real product only; zip / invented card refuse
const fold = foldlockRealCite();
assert.equal(fold.slug, "foldlock");
assert.equal(fold.invented, false);
assert.equal(fold.zip, false);
const zip = await jsonReq("/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ slug: "foldlock", op: "zip" }),
});
assert.equal(zip.data.ok, false);
assert.match(String(zip.data.code), /FG-STUB|FG-UNKNOWN/);
const invent = await jsonReq("/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ slug: "foldlock-pro", op: "health" }),
});
assert.equal(invent.data.ok, false);
assert.match(String(invent.data.code), /FG-HALLUC|FG-UNKNOWN/);

const robots = await (await req("/robots.txt")).text();
assert.match(robots, /User-agent: GPTBot\nAllow: \//);
assert.doesNotMatch(robots, /User-agent: GPTBot\nDisallow:/);
assert.doesNotMatch(robots, /Disallow: \//);

const field = redlineCiteField();
assert.equal(field.growth_on, true);
assert.equal(field.gptbot_disallow, false);
assert.equal(field.path, REDLINE_DOCS);
assert.equal(field.azindex_hub_crawl_unchanged, true);

console.log("ok REDLINE-2026-09-14: doors mapped, Growth-ON, attack sims refuse");
