/**
 * AZ-OS isolate-native ethics session VFS. exec/shell stay refuse.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { executeLocal } from "../src/engines/runner.js";
import { LIVE_OPS, STUB_OPS, classifyCall, buildRegistry } from "../src/fraggate/registry.js";
import { PRODUCTS } from "../src/index.js";
import { resetAzosSessions } from "../src/engines/azos/session.js";

resetAzosSessions();

const registry = buildRegistry(PRODUCTS);
assert.equal(classifyCall(registry.bySlug.azos, "exec").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azos, "shell").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azos, "lattice").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azos, "session_open").kind, "live");
assert.equal(classifyCall(registry.bySlug.azos, "session").kind, "live");
assert.equal(classifyCall(registry.bySlug.azos, "close").kind, "live");
assert.ok(LIVE_OPS.azos.includes("session_open"));
assert.ok(LIVE_OPS.azos.includes("session"));
assert.ok(STUB_OPS.azos.includes("exec"));
assert.ok(STUB_OPS.azos.includes("shell"));

const opened = JSON.parse(
  (await executeLocal({ slug: "azos", op: "session_open", payload: {}, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(opened.ok, true);
assert.equal(opened.remote_shell, false);
assert.equal(opened.ssh, false);
assert.match(opened.session_id, /^azos_[a-f0-9]{32}$/);
assert.ok(opened.listing.includes("README.txt"));
assert.equal(opened.prefab, true);

const aliased = JSON.parse(
  (await executeLocal({ slug: "azos", op: "session", payload: {}, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(aliased.ok, true);
assert.match(aliased.session_id, /^azos_[a-f0-9]{32}$/);

const status = JSON.parse(
  (
    await executeLocal({
      slug: "azos",
      op: "session_status",
      payload: { session_id: opened.session_id, path: "/principles.txt" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(status.ok, true);
assert.equal(status.node.type, "file");
assert.match(status.node.body, /Integrity precedes execution/);
assert.equal(status.remote_shell, false);
assert.equal(status.ssh, false);
assert.equal(status.unrestricted_host_shell, false);
assert.match(status.limitation, /THIS IS NOT: a remote host shell/);

const closed = JSON.parse(
  (
    await executeLocal({
      slug: "azos",
      op: "close",
      payload: { session_id: opened.session_id },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(closed.closed, true);
assert.equal(closed.sealed, true);

const execStub = await executeLocal({ slug: "azos", op: "exec", payload: { cmd: "bash" }, ranIn: "aziel-runtime" });
assert.equal(execStub.unsupported, true);

resetAzosSessions();
console.log("ok azos isolate ethics session VFS; exec/shell refuse");
