/**
 * Probe the live aziel-runtime Worker. Fails if health / runtime / catalog
 * versions diverge, or GET /v1/ready is not 200 when expected.
 *
 *   node scripts/probe-live.mjs
 *   AZIEL_RUNTIME_URL=https://aziel-runtime.vibelock.workers.dev node scripts/probe-live.mjs
 *
 * Author: Aziel Eliab.
 */
import { RUNTIME_ROLE, RUNTIME_VERSION } from "../src/runtime-api.js";
import { ROLE_HEADER, VERSION_HEADER } from "../src/production.js";

const BASE = (process.env.AZIEL_RUNTIME_URL || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
const UA = "Mozilla/5.0";
const expectReady = process.env.AZIEL_RUNTIME_ALLOW_NOT_READY === "1" ? null : 200;
const expectVersion = process.env.AZIEL_RUNTIME_EXPECT_VERSION || RUNTIME_VERSION;

const errors = [];

async function fetchJson(path) {
  const url = BASE + path;
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { url, res, body };
}

async function fetchHead(path) {
  const url = BASE + path;
  const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
  return { url, res };
}

function fail(msg) {
  errors.push(msg);
  console.error("FAIL", msg);
}

const health = await fetchJson("/v1/health");
const runtime = await fetchJson("/v1/runtime.json");
const catalog = await fetchJson("/v1/catalog.json");
const ready = await fetchJson("/v1/ready");

if (health.res.status !== 200) fail(`/v1/health HTTP ${health.res.status}`);
if (runtime.res.status !== 200) fail(`/v1/runtime.json HTTP ${runtime.res.status}`);
if (catalog.res.status !== 200) fail(`/v1/catalog.json HTTP ${catalog.res.status}`);

const hv = health.body && health.body.version;
const rv = runtime.body && runtime.body.version;
const cv = catalog.body && catalog.body.version;
const rdv = ready.body && ready.body.version;

if (!hv || !rv || !cv) fail("missing version on health/runtime/catalog");
if (hv !== rv || hv !== cv) fail(`live versions diverge: health=${hv} runtime=${rv} catalog=${cv}`);
if (rdv && rdv !== hv) fail(`ready version ${rdv} != health ${hv}`);
if (expectVersion && hv !== expectVersion) fail(`live version ${hv} != expected ${expectVersion}`);

const hr = health.body && health.body.role;
const rr = runtime.body && runtime.body.role;
if (hr !== RUNTIME_ROLE || rr !== RUNTIME_ROLE) fail(`role mismatch health=${hr} runtime=${rr} expected=${RUNTIME_ROLE}`);

if (runtime.body && runtime.body.honest) fail("runtime.json still has honest{version:…} keys — use authoritySnapshot / version_history");
if (health.body && health.body.honest) fail("health still has honest{version:…} keys");
if (catalog.body && catalog.body.honest) fail("catalog still has honest{version:…} keys");

if (expectReady != null) {
  if (ready.res.status !== expectReady) {
    fail(`/v1/ready HTTP ${ready.res.status} (expected ${expectReady})${ready.body && ready.body.error ? ": " + ready.body.error : ""}`);
  }
  if (expectReady === 200 && ready.body && ready.body.ok !== true) fail("/v1/ready 200 but ok !== true");
}

for (const path of ["/v1/health", "/v1/ready", "/v1/runtime.json", "/v1/runtime", "/v1/skill"]) {
  const { res } = await fetchHead(path);
  if (path === "/v1/ready" && expectReady != null && res.status !== expectReady) {
    fail(`HEAD ${path} HTTP ${res.status} (expected ${expectReady})`);
    continue;
  }
  if (path !== "/v1/ready" && res.status !== 200) fail(`HEAD ${path} HTTP ${res.status}`);
  if (res.status === 200) {
    if (res.headers.get(VERSION_HEADER) !== hv) {
      fail(`HEAD ${path} ${VERSION_HEADER}=${res.headers.get(VERSION_HEADER)} != ${hv}`);
    }
    if (res.headers.get(ROLE_HEADER) !== RUNTIME_ROLE) {
      fail(`HEAD ${path} ${ROLE_HEADER}=${res.headers.get(ROLE_HEADER)}`);
    }
  }
}

for (const [name, pack] of [
  ["health", health],
  ["runtime", runtime],
  ["catalog", catalog],
  ["ready", ready],
]) {
  const cc = pack.res.headers.get("Cache-Control") || "";
  if (pack.res.status === 200 && !/no-store/.test(cc)) fail(`${name} missing Cache-Control: no-store (${cc || "none"})`);
}

if (errors.length) {
  console.error(`probe-live ${BASE} failed (${errors.length})`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      host: BASE,
      version: hv,
      role: hr,
      ready: ready.res.status,
      authority: "health=runtime=catalog",
    },
    null,
    2,
  ),
);
