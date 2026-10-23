/**
 * AZBOT-NODE-COLLAB-FORENSIC-1.0: tip-only multi-party sessions, FragGate handoff
 * stamps, AzielTether under a bearer, MESH-NEED-BEARER, GET /v1/mesh never enables.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STUB_OPS } from "../src/fraggate/registry.js";
import { meshStatus } from "../src/mesh.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { isSessionMutatePath } from "../src/production.js";
import { inferProductOp } from "../src/uses.js";
import {
  FORENSIC_SPEC,
  LOCAL_QNM_NODE,
  REMAIN_OFF,
  azielTetherUnderBearer,
  operatorMeshPresence,
  packageHandoff,
  remainOffHolds,
  rewriteRefusal,
} from "../src/forensic-collab.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function jsonReq(path, method, body) {
  const res = await handler(
    new Request(origin + path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  const data = await res.json();
  return { status: res.status, data };
}

const holds = remainOffHolds(STUB_OPS);
assert.equal(holds.ok, true, holds.missing.join(","));
assert.equal(holds.get_never_enables, true);
assert.equal(REMAIN_OFF.get_v1_mesh_never_enables, true);
assert.equal(REMAIN_OFF.fraggate_single_door, true);
assert.equal(REMAIN_OFF.local_first_sessions, true);
assert.equal(REMAIN_OFF.azos_public_exec_shell_lattice, "refused");
assert.equal(REMAIN_OFF.vault_wipe_scorch_unlock, "local-only / FG-STUB");
assert.equal(REMAIN_OFF.deanonymize, "refused");
assert.equal(REMAIN_OFF.invent_mark, "refused");
assert.equal(REMAIN_OFF.backdate, "refused");
assert.equal(REMAIN_OFF.public_rollback, "refused");

const paper = await readFile(join(root, "docs/designs/AZBOT-NODE-COLLAB-FORENSIC-1.0.md"), "utf8");
assert.match(paper, /AZBot Node Collaborative Forensic Design 1\.0/);
assert.match(paper, /Author: Aziel Eliab/);
assert.match(paper, /Apache-2\.0/);
assert.match(paper, /Still never enables/);
assert.match(paper, /cannot rewrite it/);
assert.match(paper, /MESH-NEED-BEARER/);
const qnm = await readFile(join(root, "qnm-node/fed-instance.mjs"), "utf8");
assert.match(qnm, /get_never_enables/);
assert.equal(LOCAL_QNM_NODE, "qnm-node");

const before = await meshStatus({}, env);
const meshGet = await jsonReq("/v1/mesh", "GET");
assert.equal(meshGet.status, 200);
const afterGet = await meshStatus({}, env);
assert.equal(afterGet.enabled, before.enabled);
assert.equal(meshGet.data.get_never_enables, true);

const emptyPresence = await operatorMeshPresence({}, env);
assert.equal(emptyPresence.get_never_enables, true);
assert.equal(emptyPresence.radios_enabled_by_get, false);
assert.equal(emptyPresence.radios_enabled_by_this_call, false);
assert.equal(emptyPresence.code, "MESH-NEED-BEARER");
assert.equal(emptyPresence.local_node, "qnm-node");
assert.equal(emptyPresence.cap7_names_only, true);
assert.equal(emptyPresence.public_icann, false);
assert.equal(emptyPresence.earned_by, "QNM");
assert.equal(typeof emptyPresence.mesh_node_live, "boolean");
assert.equal(typeof emptyPresence.alt_internet_live, "boolean");
assert.equal(typeof emptyPresence.packet_path_live, "boolean");
assert.equal(
  emptyPresence.mesh_node_live,
  emptyPresence.alt_internet_live === true && emptyPresence.packet_path_live === true && emptyPresence.second_device === true,
);
const afterEmpty = await meshStatus({}, env);
assert.equal(afterEmpty.enabled, before.enabled);

const packed = packageHandoff("azbot", "route", { q: "tether" });
assert.equal(packed.door, "fraggate");
assert.equal(packed.executed, false);
assert.equal(packed.second_door, false);
assert.deepEqual(packed.call, { slug: "azbot", op: "route", payload: { q: "tether" } });
assert.equal(packageHandoff("", "route").ok, false);

const bareTether = await azielTetherUnderBearer({ tether: "azieltether", items: [] });
assert.equal(bareTether.code, "MESH-NEED-BEARER");
assert.equal(bareTether.radios_enabled_by_this_call, false);
assert.equal(bareTether.vpn, false);
assert.equal(bareTether.mesh_join, false);
const stubTether = await azielTetherUnderBearer({ bearer: "suite-presence", op: "mesh-join" });
assert.equal(stubTether.code, "FG-STUB");
assert.equal(stubTether.remain_off_item, 6);
const afterTether = await meshStatus({}, env);
assert.equal(afterTether.enabled, before.enabled);

const refusal = rewriteRefusal();
assert.equal(refusal.code, "FORENSIC-NO-REWRITE");
assert.equal(refusal.written, false);
assert.equal(refusal.rewrite, false);

assert.equal(isSessionMutatePath("/v1/session/sess_" + "ab".repeat(16) + "/party", "POST"), true);
assert.equal(isSessionMutatePath("/v1/session/sess_" + "ab".repeat(16) + "/tip", "GET"), false);
assert.equal(isSessionMutatePath("/v1/session/sess_" + "ab".repeat(16) + "/tip", "POST"), false);
assert.equal(inferProductOp("/v1/session/sess_" + "ab".repeat(16) + "/tip").op, "session.tip");
assert.equal(inferProductOp("/v1/session/sess_" + "cd".repeat(16) + "/party").op, "session.party");

const opened = await jsonReq("/v1/session/open", "POST", {});
assert.equal(opened.status, 200);
const sid = opened.data.session.id;
const openCount = opened.data.session.receipt_count;
const openHead = opened.data.session.head_hash;

const joined = await jsonReq(`/v1/session/${sid}/party`, "POST", { party_id: "human-a" });
assert.equal(joined.status, 200, JSON.stringify(joined.data));
assert.equal(joined.data.ok, true);
assert.equal(joined.data.spec, FORENSIC_SPEC);
assert.equal(joined.data.rewrite, false);
assert.equal(joined.data.receipts_rewritten, false);
assert.equal(joined.data.tip, openHead);
assert.match(joined.data.party_id, /^[a-f0-9]{64}$/);
assert.equal(joined.data.mesh.get_never_enables, true);
assert.equal(joined.data.mesh.public_icann, false);
assert.equal(joined.data.remain_off.get_v1_mesh_never_enables, true);

const again = await jsonReq(`/v1/session/${sid}/party`, "POST", { party_id: "human-a" });
assert.equal(again.status, 200);
assert.equal(again.data.already, true);
assert.equal(again.data.party_id, joined.data.party_id);

const other = await jsonReq(`/v1/session/${sid}/party`, "POST", { party_id: "human-b" });
assert.equal(other.status, 200);
assert.notEqual(other.data.party_id, joined.data.party_id);

const rewrite = await jsonReq(`/v1/session/${sid}/party`, "POST", { party_id: "human-c", tip: "f".repeat(64) });
assert.equal(rewrite.status, 409);
assert.equal(rewrite.data.code, "FORENSIC-NO-REWRITE");
assert.equal(rewrite.data.written, false);

const postTip = await jsonReq(`/v1/session/${sid}/tip`, "POST", { tip: "a".repeat(64) });
assert.equal(postTip.status, 409);
assert.equal(postTip.data.code, "FORENSIC-NO-REWRITE");

const needBearer = await jsonReq(`/v1/session/${sid}/party`, "POST", { party_id: "node-2", tether: "azieltether" });
assert.equal(needBearer.status, 400);
assert.equal(needBearer.data.code, "MESH-NEED-BEARER");
assert.equal(needBearer.data.get_never_enables, true);

const tetherRead = await jsonReq(`/v1/session/${sid}/party`, "POST", {
  party_id: "node-2",
  tether: "azieltether",
  bearer: "suite-presence",
  items: [],
});
assert.equal(tetherRead.status, 200, JSON.stringify(tetherRead.data));
assert.equal(tetherRead.data.tether.under_bearer, true);
assert.equal(tetherRead.data.tether.vpn, false);
assert.equal(tetherRead.data.tether.arm, false);
assert.equal(tetherRead.data.tether.mesh_join, false);
assert.equal(tetherRead.data.tether.radios_enabled_by_this_call, false);
const afterPartyTether = await meshStatus({}, env);
assert.equal(afterPartyTether.enabled, before.enabled);

const exec = await jsonReq(`/v1/session/${sid}/exec`, "POST", { slug: "azbot", op: "route", payload: { q: "tether" } });
assert.equal(exec.status, 200, JSON.stringify(exec.data).slice(0, 500));
const sealedIntent = exec.data.receipt.intent || (exec.data.receipt.payload && exec.data.receipt.payload.intent);
assert.equal(sealedIntent.slug, "azbot");
assert.equal(sealedIntent.op, "route");
assert.equal(exec.data.session.receipt_count, openCount + 1);

const tip = await jsonReq(`/v1/session/${sid}/tip`, "GET");
assert.equal(tip.status, 200);
assert.equal(tip.data.spec, FORENSIC_SPEC);
assert.equal(tip.data.share, "receipt_tip_only");
assert.equal(tip.data.rewrite, false);
assert.equal(tip.data.tip, exec.data.receipt.hash);
assert.equal(tip.data.tip, exec.data.session.head_hash);
assert.equal(tip.data.seq, exec.data.session.receipt_count);
assert.match(tip.data.lattice.primary, /^[a-f0-9]{64}$/);
assert.match(tip.data.lattice.secondary, /^[a-f0-9]{64}$/);
assert.match(tip.data.chainlock_tip, /^[a-f0-9]{64}$/);
assert.match(tip.data.temporallock_tip, /^[a-f0-9]{64}$/);
assert.equal(tip.data.handoff.door, "fraggate");
assert.equal(tip.data.handoff.slug, "azbot");
assert.equal(tip.data.handoff.op, "route");
assert.equal(tip.data.tethers.azrt_azos.spec, "AZRT-AZOS-TETHER-1.0");
assert.equal(tip.data.tethers.azrt_azos.uses_fraggate_azos_lattice, false);
assert.equal(tip.data.tethers.azrt_azos.azos_lattice_refusal_stays, true);
assert.equal(tip.data.tethers.azieltether.under_bearer, true);
assert.equal(tip.data.tethers.azieltether.mesh_join, false);
assert.equal(tip.data.tethers.external_anchor.path, "/v1/anchor/heads");
assert.equal(tip.data.tethers.external_anchor.rewrite, false);
assert.equal(tip.data.mesh.get_never_enables, true);
assert.equal(tip.data.mesh.cap7_names_only, true);
assert.equal(tip.data.mesh.public_icann, false);
assert.equal(tip.data.mesh.local_node, "qnm-node");
assert.equal(tip.data.remain_off.get_v1_mesh_never_enables, true);
assert.equal(tip.data.local_first, true);
assert.equal(Object.hasOwn(tip.data, "receipts"), false);
assert.ok(tip.data.parties.length >= 2);
assert.ok(tip.data.parties.every((p) => /^[a-f0-9]{64}$/.test(p.id)));

const status = await jsonReq(`/v1/session/${sid}/status`, "GET");
assert.equal(status.status, 200);
assert.equal(Object.hasOwn(status.data.session, "collab"), false);
assert.equal(status.data.session.receipt_count, tip.data.seq);
assert.equal(status.data.session.head_hash, tip.data.tip);

const still = await meshStatus({}, env);
assert.equal(still.enabled, before.enabled);

console.log("verify-forensic-collab: ok");
