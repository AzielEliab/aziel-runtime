/**
 * Write fixtures/session-receipt-chain.json from a deterministic session
 * plus a minted ACT-RECEIPT. Reviewers re-check with verify-receipt-fixture.mjs.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import {
  applyClose,
  applyOpen,
  applyPolicy,
  canonicalize,
  commitExec,
  digestText,
  openSession,
  recordIntent,
  sha256Hex,
  signReceipt,
  ZERO_HASH,
} from "../src/session-core.js";
import { hashActReceipt, mintActReceipt, RECEIPTS_SPEC } from "../src/library-receipts.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "fixtures", "session-receipt-chain.json");

const now = "2026-09-20T00:00:00.000Z";
const sid = "sess_" + "ab".repeat(16);
const session = openSession({ id: sid, now, version: RUNTIME_VERSION, source: "fixture" });
await applyOpen(session, now);
await applyPolicy(session, { allow_slugs: ["azclce"], max_payload_bytes: 4096 }, "2026-09-20T00:00:01.000Z");
const payload = { r: "login button blue", d: "login form submits", p: "login button submits" };
const payloadText = JSON.stringify(payload);
const { intent } = await recordIntent(
  session,
  { slug: "azclce", op: "score", payload, payloadText, knownSlugs: new Set(["azclce"]) },
  "2026-09-20T00:00:02.000Z",
);
const reqDig = await digestText(payloadText);
const resDig = await digestText('{"ok":true}');
await commitExec(
  session,
  {
    intent,
    status: 200,
    latencyMs: 3,
    requestDigest: reqDig.sha256,
    responseDigest: resDig.sha256,
    error: null,
    upstream: null,
    responseBytes: resDig.bytes,
    contentType: "application/json",
  },
  "2026-09-20T00:00:03.000Z",
);
await applyClose(session, "2026-09-20T00:00:04.000Z");

const act = await mintActReceipt({
  previous_hash: ZERO_HASH,
  request: "FragGate listed the hashed registry.",
  output: "Returned 200 without breaking the engine path.",
  event: {
    surface: "fraggate",
    path: "/v1/fraggate/list",
    method: "GET",
    status: 200,
    tool: "fraggate_list",
    spec: RECEIPTS_SPEC,
    runtime_version: RUNTIME_VERSION,
  },
});

const fixture = {
  spec: "aziel-runtime.receipt + ACT-RECEIPT-1.0",
  algorithm: "SHA-256 of canonicalize(object without hash)",
  source: {
    session: "src/session-core.js signReceipt / verifyChainStrict",
    act: "src/library-receipts.js hashActReceipt",
  },
  command: "node scripts/verify-receipt-fixture.mjs",
  runtime_version: RUNTIME_VERSION,
  session_id: sid,
  receipts: session.receipts,
  act_receipt: act,
  notes: [
    "Deterministic timestamps. Re-hash each session receipt without the hash field.",
    "ACT-RECEIPT hash is SHA-256 of canonicalize({ previous_hash, request, output, event }).",
  ],
};

writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");

const first = session.receipts[0];
const { hash, ...unsigned } = first;
const recomputed = await sha256Hex(canonicalize(unsigned));
if (recomputed !== hash) throw new Error("self-check failed on first receipt");
const actAgain = await hashActReceipt({
  previous_hash: act.previous_hash,
  request: act.request,
  output: act.output,
  event: act.event,
});
if (actAgain !== act.hash) throw new Error("self-check failed on ACT-RECEIPT");
void signReceipt;

console.log(`wrote ${out} (${session.receipts.length} session receipts + 1 ACT-RECEIPT)`);
