/** LATTICE-DOC-UNIQUE-1.0: online, offline and cross-user doubles of one document are refused; fail closed. */
import assert from "node:assert/strict";
import { append, DOCUMENT_CHAINS } from "../src/chainlock/ops.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor, MemoryStore } from "../src/chainlock/store.js";
let n = 0;
for (const [label, mk] of [["durable", () => storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) })], ["memory", () => new MemoryStore()]]) {
  const st = mk();
  const doc = { c: "evidence", subject: "contract", fact: "signed lease page 1" };
  const a = await append(st, { ...doc, caller: "alice" });
  assert.equal(a.ok, true, label + JSON.stringify(a)); n++;
  // Online double, same user.
  const b = await append(st, { ...doc, caller: "alice" });
  assert.equal(b.ok, false); assert.equal(b.code, "LATTICE-DOUBLE"); assert.equal(b.written, false); n++;
  // Same document offline, same user.
  const c = await append(st, { ...doc, caller: "alice", offline: true, username: "alice" });
  assert.equal(c.ok, false); assert.match(c.code, /^LATTICE-DOUBLE/); n++;
  // Cross-user double (online and offline).
  const d = await append(st, { ...doc, caller: "bob" });
  assert.equal(d.ok, false); assert.equal(d.code, "LATTICE-DOUBLE-CROSS"); n++;
  const e = await append(st, { ...doc, caller: "bob", offline: true, username: "bob" });
  assert.equal(e.ok, false); assert.equal(e.code, "LATTICE-DOUBLE-CROSS"); n++;
  // A different document still writes; idempotent replay of the first write is allowed.
  assert.equal((await append(st, { c: "evidence", subject: "contract", fact: "signed lease page 2", caller: "alice" })).ok, true); n++;
  const k1 = await append(st, { c: "library", subject: "paper", fact: "abstract v1", caller: "carol", idempotency_key: "k-1" });
  const k2 = await append(st, { c: "library", subject: "paper", fact: "abstract v1", caller: "carol", idempotency_key: "k-1" });
  assert.equal(k1.ok, true); assert.equal(k2.ok, true); n++;
  // Event chains are not document chains.
  assert.equal(DOCUMENT_CHAINS.includes("session"), false);
  assert.equal((await append(st, { c: "session", fact: "tick" })).ok, true);
  assert.equal((await append(st, { c: "session", fact: "tick" })).ok, true); n++;
}
// Fail closed: index unreadable -> refused, nothing written.
const broken = new MemoryStore();
broken.get = async () => { throw new Error("index down"); };
const f = await append(broken, { c: "evidence", subject: "x", fact: "y" });
assert.equal(f.ok, false); assert.equal(f.code, "LATTICE-DOC-INDEX-UNAVAILABLE"); n++;
console.log(`ok doc unique: ${n} checks`);
