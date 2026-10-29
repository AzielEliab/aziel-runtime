/**
 * Primary lattice wrap/pull (godlock #111). Flag default off. Miss is not ok.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planLattice } from "../src/dual-lattice.js";
import { memoryRuntimeKvNamespace } from "../src/durable-kv.js";
import { AGGREGATE_PLANES, PRIMARY_TARGET, SECONDARY_TARGET } from "../src/lattice-remote.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const A = "ab".repeat(32);
const B = "cd".repeat(32);
const C = "ef".repeat(32);
let n = 0;

function check(cond, label) {
  assert.equal(cond, true, label);
  n += 1;
}

async function call(path, env, init) {
  const res = await handler(new Request(origin + path, init), env);
  const body = await res.json();
  return { status: res.status, body };
}

async function blockFor(hash, rows) {
  return planLattice({ document_hash: hash, offline: false, rows: rows || [] });
}

const source = readFileSync(new URL("../src/lattice-remote.js", import.meta.url), "utf8");
check(!/\bfetch\s*\(/.test(source), "no fetch");
check(!/meshEnable|meshDisable|meshJoin|meshLeave/.test(source), "no mesh membership write");
check(!/AUTO_UPDATE\s*=/.test(source), "no auto-update assign");

const off = await call("/v1/lattice/wrap", {}, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
check(off.status === 403 && off.body.ok === false && off.body.live === false && off.body.code === "LATTICE-REMOTE-OFF", "wrap flag off");
const offPull = await call("/v1/lattice/pull?entry_hash=" + A, {});
check(offPull.status === 403 && offPull.body.ok === false && offPull.body.code === "LATTICE-REMOTE-OFF", "pull flag off");

const flagged = { LATTICE_REMOTE: "1" };
const noToken = await call("/v1/lattice/wrap", { ...flagged, REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "operator-secret" }, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: A }),
});
check(noToken.status === 401 && noToken.body.ok === false && noToken.body.live === false, "wrap requires header token");

const queryToken = await call("/v1/lattice/wrap?token=operator-secret", flagged, { method: "POST", body: "{}" });
check(queryToken.status === 400 && queryToken.body.code === "TOKEN-QUERY-REFUSED", "token query refused");

const bodyToken = await call("/v1/lattice/wrap", flagged, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: A, runtime_token: "operator-secret" }),
});
check(bodyToken.status === 400 && bodyToken.body.code === "TOKEN-BODY-REFUSED" && bodyToken.body.written === false, "token body refused");

const env = { LATTICE_REMOTE: "1", REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "operator-secret" };
const headers = { "content-type": "application/json", Authorization: "Bearer operator-secret" };
const first = await blockFor(A, []);
const wrapped = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: A, lattice: first, position: 1, target: PRIMARY_TARGET, spec: "AZRT-DUAL-LATTICE-1.0" }),
});
check(wrapped.status === 201 && wrapped.body.ok === true && wrapped.body.live === false, "wrap created");
check(wrapped.body.entry_hash === A && wrapped.body.position === 1 && wrapped.body.lattice.position === undefined, "wrap shape");
check(wrapped.body.role === "primary" && wrapped.body.primary_target === PRIMARY_TARGET && wrapped.body.secondary_target === SECONDARY_TARGET, "primary role");
check(wrapped.body.secondary_on_this_worker === false && wrapped.body.rebuilt_from_zero === false, "not secondary and not rebuilt");
check(wrapped.body.policy.auto_update === false && wrapped.body.policy.rf === false && wrapped.body.policy.sat === false, "policy stays off");
check(wrapped.body.policy.cap7_is_icann === false && wrapped.body.policy.spend === false && wrapped.body.policy.live === false, "cap7 spend live");
check(wrapped.body.policy.membership_changed === false && wrapped.body.policy.software_card === false && wrapped.body.policy.mcp_tool === false, "no card no mesh write");

const pulled = await call("/v1/lattice/pull?entry_hash=" + A, env);
check(pulled.status === 200 && pulled.body.ok === true && pulled.body.entry_hash === A && pulled.body.code === "LATTICE-PULL-OK", "pull hit");
check(pulled.body.rebuilt_from_zero === false && pulled.body.lattice.primary === first.primary && pulled.body.live === false, "pull returns the block");
check(Array.isArray(pulled.body.aggregate.planes) && pulled.body.aggregate.planes.length === AGGREGATE_PLANES.length, "aggregate planes");
for (const name of AGGREGATE_PLANES) check(pulled.body.aggregate[name] && pulled.body.aggregate[name].live === false, "plane " + name);
check(pulled.body.aggregate.host_sites.cap7_is_icann === false, "cap7 is not icann");
check(pulled.body.aggregate.host_sites.hosts.every((host) => !String(host).includes("azbooth")), "cap7 name is not a host site");
check(pulled.body.aggregate.host_sites.cap7_names_excluded.includes("azbooth"), "cap7 names excluded");
check(pulled.body.aggregate.access_points.rf === false && pulled.body.aggregate.access_points.sat === false && pulled.body.aggregate.access_points.spend === false, "rf sat spend off");
check(pulled.body.aggregate.access_points.points.every((point) => point.enabled === false && point.live === false), "access points off");
check(pulled.body.aggregate.node_mesh.membership_changed === false && pulled.body.aggregate.node_mesh.mesh_enable_called === false && pulled.body.aggregate.node_mesh.mesh_join_called === false, "mesh flags unchanged");
check(pulled.body.aggregate.users.ark_vaults_opened === false && pulled.body.aggregate.users.legal_names === false, "users stay sealed");
check(pulled.body.aggregate.auto_update === false, "aggregate auto_update off");

const miss = await call("/v1/lattice/pull?entry_hash=" + C, env);
check(miss.status === 404 && miss.body.ok === false && miss.body.code === "LATTICE-PULL-MISS" && miss.body.live === false, "miss is not ok");

const posted = await call("/v1/lattice/pull", env, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: A, planes: ["host_sites", "access_points"] }),
});
check(posted.status === 200 && posted.body.entry_hash === A && posted.body.aggregate.planes.length === 2, "post pull");

const second = await blockFor(B, [{ lattice: first }]);
const again = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: B, lattice: second, position: 2, target: PRIMARY_TARGET }),
});
check(again.status === 201 && again.body.position === 2 && again.body.lattice.primary_prev === first.primary, "second link");

const replay = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: A, lattice: first, position: 1, target: PRIMARY_TARGET }),
});
check(replay.status === 200 && replay.body.code === "LATTICE-ALREADY" && replay.body.written === false, "replay does not append");

const clashBlock = await blockFor(A, [{ lattice: first }]);
const clash = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: A, lattice: clashBlock, target: PRIMARY_TARGET }),
});
check(clash.status === 409 && clash.body.ok === false && clash.body.code === "LATTICE-DOUBLE" && clash.body.written === false, "double refused");

const offline = await planLattice({ document_hash: C, offline: true, username: "godlock", rows: [] });
const offWrap = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: C, lattice: offline, position: 3, target: PRIMARY_TARGET }),
});
check(offWrap.status === 409 && offWrap.body.code === "LATTICE-PRIMARY-ONLINE" && offWrap.body.ok === false, "offline stays off primary");
const stillMiss = await call("/v1/lattice/pull?entry_hash=" + C, env);
check(stillMiss.status === 404 && stillMiss.body.ok === false, "refused wrap is a miss");

const tie = { ...second, document_hash: C, tiebreak: { status: "synced" } };
const tieWrap = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: C, lattice: tie, target: PRIMARY_TARGET }),
});
check(tieWrap.status === 409 && tieWrap.body.code === "LATTICE-TIEBREAK-CORPUS", "tie-break stays on corpus");

const elsewhere = await call("/v1/lattice/wrap", env, {
  method: "POST",
  headers,
  body: JSON.stringify({ entry_hash: C, lattice: { ...first, document_hash: C }, target: SECONDARY_TARGET }),
});
check(elsewhere.status === 409 && elsewhere.body.code === "LATTICE-SECONDARY-ELSEWHERE", "secondary is not this worker");

const inside = { ...first, position: 1 };
const insideWrap = await call("/v1/lattice/wrap", { LATTICE_REMOTE: "1" }, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: A, lattice: inside, position: 1 }),
});
check(insideWrap.status === 400 && insideWrap.body.code === "LATTICE-POSITION-INSIDE" && insideWrap.body.ok === false, "position stays outside");

const bad = await call("/v1/lattice/pull?entry_hash=nope", env);
check(bad.status === 400 && bad.body.ok === false && bad.body.code === "LATTICE-DOCUMENT", "bad hash fails closed");

const uses = new Map();
const kvEnv = {
  LATTICE_REMOTE: "on",
  USES: {
    async get(key) { return uses.has(key) ? uses.get(key) : null; },
    async put(key, value) { uses.set(key, String(value)); },
  },
};
uses.set("total", "4");
const agg = await call("/v1/lattice/pull", kvEnv, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ planes: AGGREGATE_PLANES.slice() }),
});
check(agg.body.aggregate && agg.body.aggregate.uses && agg.body.aggregate.uses.uses === 4 && agg.body.aggregate.uses.complete === true, "uses aggregate reads the counter");
check(agg.body.aggregate.uses.ok === true && agg.body.live === false && agg.body.policy.cap7_is_icann === false, "complete uses are ok and still not live");
check(agg.status === 200 && agg.body.ok === true && agg.body.code === "LATTICE-AGGREGATE", "aggregate read");
check(agg.body.aggregate.nodes.human_uses === 4 && agg.body.aggregate.nodes.membership_changed === false, "nodes count uses without a join");

const bare = await call("/v1/lattice/pull", { LATTICE_REMOTE: "1" });
check(bare.status === 503 && bare.body.ok === false && bare.body.code === "LATTICE-AGGREGATE-INCOMPLETE", "incomplete aggregate is not ok");

const map = new Map();
const durableEnv = {
  LATTICE_REMOTE: "1",
  LATTICE: {
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async put(key, value) { map.set(key, String(value)); },
  },
};
const durableBlock = await blockFor(A, []);
const durableWrap = await call("/v1/lattice/wrap", durableEnv, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: A, lattice: durableBlock, position: 1, target: PRIMARY_TARGET }),
});
check(durableWrap.status === 201 && durableWrap.body.durable === true, "durable append");
const other = {
  LATTICE_REMOTE: "1",
  LATTICE: {
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async put(key, value) { map.set(key, String(value)); },
  },
};
const durablePull = await call("/v1/lattice/pull?entry_hash=" + A + "&planes=host_sites", other);
check(durablePull.status === 200 && durablePull.body.entry_hash === A && durablePull.body.durable === true, "durable pull");

let raced = "";
const raceEnv = {
  LATTICE_REMOTE: "1",
  LATTICE: {
    async get() { return raced; },
    async put() { throw new Error("put is not the writer"); },
    async cas(_key, prev) {
      if (String(prev) !== raced) return { ok: false, conflict: true };
      raced = "{\"spec\":\"AZRT-LATTICE-REMOTE-1.0\",\"rows\":[]}";
      return { ok: false, conflict: true };
    },
  },
};
const raceBlock = await blockFor(A, []);
const race = await call("/v1/lattice/wrap", raceEnv, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: A, lattice: raceBlock, position: 1, target: PRIMARY_TARGET }),
});
check(race.status === 503 && race.body.ok === false && race.body.code === "LATTICE-CONFLICT" && race.body.written === false, "cas conflict writes nothing");
const racePull = await call("/v1/lattice/pull?entry_hash=" + A + "&planes=host_sites", raceEnv);
check(racePull.status === 404 && racePull.body.ok === false, "conflict is not a silent hit");

const ns = memoryRuntimeKvNamespace();
const doEnv = { LATTICE_REMOTE: "1", RUNTIME_KV: ns };
const doBlock = await blockFor(B, []);
const doWrap = await call("/v1/lattice/wrap", doEnv, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ entry_hash: B, lattice: doBlock, position: 1, target: PRIMARY_TARGET }),
});
check(doWrap.status === 201 && doWrap.body.durable === true && doWrap.body.live === false, "runtime kv append");
const doPull = await call("/v1/lattice/pull?entry_hash=" + B + "&planes=access_points", { LATTICE_REMOTE: "1", RUNTIME_KV: ns });
check(doPull.status === 200 && doPull.body.entry_hash === B && doPull.body.aggregate.access_points.rf === false, "runtime kv pull");

const openapi = await call("/openapi.json", {});
check(Boolean(openapi.body.paths["/v1/lattice/wrap"] && openapi.body.paths["/v1/lattice/wrap"].post), "openapi wrap");
check(Boolean(openapi.body.paths["/v1/lattice/pull"] && openapi.body.paths["/v1/lattice/pull"].get && openapi.body.paths["/v1/lattice/pull"].post), "openapi pull");
check(Array.isArray(openapi.body.paths["/v1/lattice/wrap"].post.security) && Object.prototype.hasOwnProperty.call(openapi.body.paths["/v1/lattice/wrap"].post.security[0], "RuntimeToken"), "wrap keeps operator auth");

const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
check(!/^LATTICE_REMOTE\s*=/m.test(toml), "flag stays unset in wrangler");

console.log("ok lattice remote: " + n + " checks");
