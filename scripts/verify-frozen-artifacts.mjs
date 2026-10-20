/**
 * RIB-052 / AZRT-FROZEN-ARTIFACT-1.0: frozen-artifact delivery check (silent-edit detector).
 * Undeclared edit -> 409 FROZEN-ARTIFACT-SILENT-EDIT, refusal sealed, verify fails closed.
 * Declared edit with a reason -> passes, shows in the delivery_check receipt. No frozen_artifacts -> as today.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { memorySessionNamespace } from "../src/session-do.js";
import { isSessionMutatePath } from "../src/production.js";
import { canonicalize, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { verifyFrozenArtifacts, frozenArtifactsOf } from "../src/frozen-artifacts.js";

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const handler = (await import("../src/index.js")).default.fetch;
const sha = (t) => createHash("sha256").update(t).digest("hex");
const doEnv = {};
const env = { SESSION: memorySessionNamespace(doEnv) };
const req = async (m, p, body) => {
  const r = await handler(new Request("https://rt.example" + p, { method: m, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  return { status: r.status, body: await r.json() };
};
const receipts = async (id) => (await req("GET", `/v1/session/${id}/receipts`)).body;
const A = "spec v1\n", B = "logo-bytes";
const FROZEN = [{ path: "docs/spec.md", sha256: sha(A) }, { id: "logo", sha256: sha(B) }];
const EXPECT = { spec: "deliver spec + logo", verdict_criteria: "unchanged unless declared" };

ok(isSessionMutatePath("/v1/session/sess_" + "a".repeat(32) + "/change", "POST"), "change is token-gated");
ok(!isSessionMutatePath("/v1/session/sess_" + "a".repeat(32) + "/change", "GET"), "GET change not a mutate path");

// Bad frozen input refuses before anything opens.
for (const bad of [[], [{ path: "a" }], [{ id: "a", path: "b", sha256: sha("x") }], [{ id: "a", sha256: sha("x") }, { id: "a", sha256: sha("y") }], "x"]) {
  const r = await req("POST", "/v1/session/open", { frozen_artifacts: bad });
  ok(r.status === 400 && r.body.code === "FROZEN-ARTIFACT-INVALID", "bad frozen refused: " + JSON.stringify(bad));
}

// 1) Undeclared edit: FROZEN-ARTIFACT-SILENT-EDIT, sealed, verdict dropped, verify fails closed.
{
  const o = await req("POST", "/v1/session/open", { expect: EXPECT, frozen_artifacts: FROZEN });
  ok(o.status === 200, "open with frozen");
  const r1 = o.body.receipt;
  ok(Array.isArray(r1.frozen_artifacts) && r1.frozen_artifacts.length === 2 && /^[a-f0-9]{64}$/.test(r1.frozen_hash) && r1.expect_hash, "frozen sealed on stamp #1 with the spec");
  const id = o.body.session.id;
  const c = await req("POST", `/v1/session/${id}/close`, { verdict: { pass: true }, delivered_artifacts: [{ path: "docs/spec.md", content: "spec v2 (silently edited)\n" }, { id: "logo", content: B }] });
  ok(c.status === 409 && c.body.code === "FROZEN-ARTIFACT-SILENT-EDIT", "undeclared edit refused with code");
  const dc = c.body.delivery_check.delivery_check;
  ok(dc.written_by === "harness" && dc.refused.sealed === true && dc.verdict_allowed === false, "refusal sealed by harness");
  ok(dc.artifacts[0].status === "changed" && dc.artifacts[0].declared === false && dc.artifacts[1].status === "unchanged", "per-artifact status");
  ok(c.body.receipt.event === "close" && c.body.receipt.verdict == null, "verdict refused (not sealed on close)");
  ok(c.body.session.closed === true, "session closed");
  // RIB-018: the refusal is also sealed on the internal refusals chain (no caller text).
  ok(c.body.refusal_receipt && c.body.refusal_receipt.sealed === true && c.body.refusal_receipt.chain === "refusals" && /^[a-f0-9]{64}$/.test(c.body.refusal_receipt.h), "SILENT-EDIT sealed on refusals chain");
  {
    const { loadChain } = await import("../src/chainlock/ops.js");
    const { storeFor } = await import("../src/chainlock/store.js");
    const rows = await loadChain(storeFor(doEnv), "refusals", "");
    const row = rows.find((r) => r.stamp_sha256 === c.body.refusal_receipt.h);
    ok(row && row.refusal.code === "FROZEN-ARTIFACT-SILENT-EDIT" && row.refusal.door === "session-close" && !JSON.stringify(row).includes("silently edited"), "refusals row: code + door, no delivered content");
  }
  const all = await receipts(id);
  ok(all.verified.ok === false && all.verified.errors.some((e) => e.error === "FROZEN-ARTIFACT-SILENT-EDIT"), "verify fails closed on undeclared change");
  ok(all.verified.frozen_artifacts.status === "failed", "frozen status failed");
  // Agent cannot rewrite the check: forging statuses to 'unchanged' breaks the hash and the recompute.
  const forged = structuredClone(all.receipts);
  const fdc = forged[forged.length - 2];
  fdc.delivery_check.artifacts[0].observed_sha256 = sha(A);
  const v = await verifyFrozenArtifacts(forged);
  ok(!v.ok && v.errors.some((e) => e.code === "FROZEN-CHECK-FORGED"), "forged check rows fail recompute");
  ok(!(await verifyChainStrict(forged)).ok, "forged chain fails strict verify");
}

// 2) Declared edit with a reason: passes and shows in the receipt.
{
  const o = await req("POST", "/v1/session/open", { expect: EXPECT, frozen_artifacts: FROZEN });
  const id = o.body.session.id;
  const NEW = "spec v2 (declared)\n";
  let ch = await req("POST", `/v1/session/${id}/change`, { artifact: "nope", new_sha256: sha(NEW), reason: "x" });
  ok(ch.status === 400 && ch.body.code === "FROZEN-CHANGE-UNKNOWN", "unknown artifact refused");
  ch = await req("POST", `/v1/session/${id}/change`, { artifact: "docs/spec.md", new_sha256: sha(NEW) });
  ok(ch.status === 400 && ch.body.code === "FROZEN-CHANGE-INVALID", "reason required");
  ch = await req("POST", `/v1/session/${id}/change`, { artifact: "docs/spec.md", new_sha256: sha(NEW), reason: "fix typo per issuer" });
  ok(ch.status === 200 && ch.body.receipt.event === "artifact_change" && ch.body.receipt.artifact_change.reason === "fix typo per issuer", "declared change appended");
  const c = await req("POST", `/v1/session/${id}/close`, { verdict: { pass: true }, delivered_artifacts: [{ path: "docs/spec.md", content: NEW }, { id: "logo", content_b64: Buffer.from(B).toString("base64") }] });
  ok(c.status === 200 && c.body.ok === true, "declared edit passes");
  const row = c.body.delivery_check.delivery_check.artifacts[0];
  ok(row.status === "changed" && row.declared === true && row.change.reason === "fix typo per issuer" && row.change.receipt_hash === ch.body.receipt.hash, "declared change shows in receipt");
  ok(c.body.receipt.verdict && c.body.receipt.verdict.pass === true, "verdict sealed");
  ok(c.body.verified.ok === true && c.body.verified.frozen_artifacts.status === "delivered", "verify ok, delivered");
  // A declared digest that does not match what was delivered is still a silent edit.
  const o2 = await req("POST", "/v1/session/open", { frozen_artifacts: FROZEN });
  const id2 = o2.body.session.id;
  await req("POST", `/v1/session/${id2}/change`, { artifact: "logo", new_sha256: sha("other"), reason: "r" });
  const c2 = await req("POST", `/v1/session/${id2}/close`, { delivered_artifacts: [{ path: "docs/spec.md", content: A }, { id: "logo", content: "something else" }] });
  ok(c2.status === 409 && c2.body.code === "FROZEN-ARTIFACT-SILENT-EDIT", "digest mismatch vs declaration is silent edit");
}

// 3) Missing artifact: the check cannot be skipped; nothing delivered = missing, verdict refused.
{
  const o = await req("POST", "/v1/session/open", { frozen_artifacts: FROZEN });
  const id = o.body.session.id;
  const c = await req("POST", `/v1/session/${id}/close`, { verdict: { pass: true } });
  ok(c.status === 409 && c.body.code === "FROZEN-ARTIFACT-MISSING", "missing refuses verdict");
  ok(c.body.delivery_check.delivery_check.counts.missing === 2, "both missing");
  ok(c.body.refusal_receipt && c.body.refusal_receipt.code === "FROZEN-ARTIFACT-MISSING" && c.body.refusal_receipt.sealed === true, "MISSING sealed on refusals chain");
  ok(c.body.receipt.verdict == null && c.body.verified.ok === true && c.body.verified.frozen_artifacts.status === "refused", "refusal sealed, chain consistent");
  // Dropping the delivery_check receipt from a closed chain fails closed.
  const all = (await receipts(id)).receipts;
  const v = await verifyFrozenArtifacts(all.filter((r) => r.event !== "delivery_check"));
  ok(!v.ok && v.errors.some((e) => e.code === "FROZEN-CHECK-MISSING"), "skipped check fails closed");
  // Bad delivery input refuses with nothing written; session stays open.
  const o3 = await req("POST", "/v1/session/open", { frozen_artifacts: FROZEN });
  const bad = await req("POST", `/v1/session/${o3.body.session.id}/close`, { delivered_artifacts: [{ id: "logo", sha256: sha(B) }] });
  ok(bad.status === 400 && bad.body.code === "FROZEN-DELIVERY-INVALID", "digest-only delivery refused (bytes only)");
  ok((await receipts(o3.body.session.id)).receipts.length === 1, "nothing written on bad delivery");
}

// 4) Caller cannot inject frozen fields or a delivery_check later (no additive path), and LATE is caught.
{
  const f = await frozenArtifactsOf(FROZEN);
  const fake = [{ seq: 1, event: "open" }, { seq: 2, event: "exec", frozen_artifacts: f.frozen_artifacts, frozen_hash: f.frozen_hash }];
  const v = await verifyFrozenArtifacts(fake);
  ok(!v.ok && v.errors.some((e) => e.code === "FROZEN-ARTIFACT-LATE"), "frozen after stamp #1 fails");
  const t = [{ seq: 1, event: "open", frozen_artifacts: f.frozen_artifacts, frozen_hash: "0".repeat(64) }];
  ok((await verifyFrozenArtifacts(t)).errors.some((e) => e.code === "FROZEN-ARTIFACT-TAMPERED"), "tampered frozen hash fails");
  ok(f.frozen_hash === (await sha256Hex(canonicalize({ spec: "AZRT-FROZEN-ARTIFACT-1.0", frozen_artifacts: f.frozen_artifacts }))), "frozen_hash canonical");
}

// 5) Additive: no frozen_artifacts behaves as today (no delivery_check, /change refuses with nothing written).
{
  const o = await req("POST", "/v1/session/open", { expect: EXPECT });
  const id = o.body.session.id;
  ok(o.body.receipt.frozen_artifacts === undefined && o.body.receipt.frozen_hash === undefined, "no frozen fields on old opens");
  const ch = await req("POST", `/v1/session/${id}/change`, { artifact: "x", new_sha256: sha("x"), reason: "r" });
  ok(ch.status === 409 && ch.body.code === "FROZEN-ARTIFACT-NONE", "change without frozen refused");
  const c = await req("POST", `/v1/session/${id}/close`, { verdict: { pass: true } });
  ok(c.status === 200 && c.body.delivery_check === undefined && c.body.receipt.verdict.pass === true, "close as today");
  ok(c.body.verified.ok === true && c.body.verified.frozen_artifacts.status === "no_frozen", "verify unchanged");
  const all = (await receipts(id)).receipts;
  ok(all.length === 2 && all.every((r) => r.event !== "delivery_check"), "no extra rows");
}

console.log(`verify-frozen-artifacts: ${n} checks ok (RIB-052 / AZRT-FROZEN-ARTIFACT-1.0; hash-linked and sealed, not signed)`);
