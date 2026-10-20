/** R6: session DO mutations (open/policy/change/close/...) are serialized; concurrent change/policy + close never lose a row. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const handler = (await import("../src/index.js")).default.fetch;
const { memorySessionNamespace } = await import("../src/session-do.js");
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const sha = (t) => createHash("sha256").update(t).digest("hex");
const env = { SESSION: memorySessionNamespace({}) };
const req = async (m, p, body) => { const r = await handler(new Request("https://rt.example" + p, { method: m, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), env); return { status: r.status, body: await r.json() }; };
for (let round = 0; round < 12; round++) {
  const o = await req("POST", "/v1/session/open", { frozen_artifacts: [{ id: "a", sha256: sha("A") }] });
  const id = o.body.session.id;
  const calls = [
    req("POST", `/v1/session/${id}/policy`, { policy: { max_ops: 7 } }),
    req("POST", `/v1/session/${id}/change`, { artifact: "a", new_sha256: sha("B"), reason: "declared" }),
    req("POST", `/v1/session/${id}/close`, { delivered_artifacts: [{ id: "a", content: "B" }] }),
    req("POST", `/v1/session/${id}/policy`, { policy: { max_ops: 9 } }),
  ];
  if (round % 2) calls.reverse();
  const res = await Promise.all(calls);
  const all = (await req("GET", `/v1/session/${id}/receipts`)).body;
  const hashes = new Set(all.receipts.map((r) => r.hash));
  for (const r of res) if (r.status === 200 && r.body.receipt) ok(hashes.has(r.body.receipt.hash), `round ${round}: every acknowledged row is persisted`);
  ok(all.verified.ok || all.verified.errors.every((e) => e.error === "FROZEN-ARTIFACT-SILENT-EDIT"), `round ${round}: chain consistent`);
  ok(all.receipts.filter((r) => r.event === "close").length === 1, `round ${round}: one close`);
  const closeIdx = all.receipts.findIndex((r) => r.event === "close");
  ok(closeIdx === all.receipts.length - 1, `round ${round}: nothing after close`);
}
console.log(`verify-session-serialize: ${n} checks ok (R6)`);
