/**
 * TDQS metadata-only checks: tool NAMES frozen, descriptions + params + annotations.
 * Does not execute engines. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { buildMcpToolList, mcpInitializeInstructions } from "../src/mcp-surface.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { sessionMcpTools } from "../src/session-http.js";

/** Pre-change inventory from main (1.9.3). Do not add or rename tools in a metadata pass. */
const PRE_CHANGE_TOOL_NAMES = Object.freeze([
  "runtime_skill",
  "fraggate_list",
  "fraggate_describe",
  "fraggate_verify",
  "fraggate_call",
  "decisiongate_check",
  "library_lookup",
  "mesh_status",
  "mesh_enable",
  "mesh_disable",
  "mesh_join",
  "mesh_heartbeat",
  "mesh_leave",
  "mesh_nodes",
  "mesh_broadcast",
  "chainlock_append",
  "chainlock_tip",
  "chainlock_recall",
  "chainlock_verify",
  "chainlock_seal",
  "memory_observe",
  "memory_resolve",
  "memory_calibrate",
  "memory_recall",
  "memory_get",
  "runtime_software",
  "runtime_bundle",
  "runtime_pull",
  "runtime_run",
  "runtime_manifest",
  "runtime_session_open",
  "runtime_session_policy",
  "runtime_session_exec",
  "runtime_session_receipt",
  "runtime_session_receipts",
  "runtime_session_close",
]);

const tools = buildMcpToolList({ sessionTools: sessionMcpTools() });
const names = tools.map((t) => t.name);

assert.deepEqual(names.slice().sort(), PRE_CHANGE_TOOL_NAMES.slice().sort(), "tools/list names must match pre-change inventory");
assert.deepEqual(names.slice().sort(), PUBLIC_MCP_TOOLS.slice().sort(), "PUBLIC_MCP_TOOLS must track tools/list");
assert.equal(names.length, PRE_CHANGE_TOOL_NAMES.length);
assert.ok(!names.some((n) => n.includes("_health") && n !== "runtime_health"));
assert.ok(!names.includes("godlock_submit"));
assert.ok(!names.includes("foldlock_fold-preview"));

const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

function walkDescribed(schema, path) {
  if (!schema || typeof schema !== "object") return;
  const props = schema.properties;
  if (!props || typeof props !== "object") return;
  for (const [key, prop] of Object.entries(props)) {
    const here = `${path}.${key}`;
    assert.equal(typeof prop.description, "string", `${here} needs a description`);
    assert.ok(prop.description.trim().length > 8, `${here} description too thin`);
    if (prop.properties) walkDescribed(prop, here);
    if (prop.items && prop.items.properties) walkDescribed(prop.items, `${here}[]`);
  }
}

for (const tool of tools) {
  assert.equal(typeof tool.description, "string", `${tool.name} description`);
  assert.match(tool.description, /Use this when/, `${tool.name} usage guideline`);
  assert.match(tool.description, /Do not use it for/, `${tool.name} exclusion`);
  assert.match(tool.description, / instead/, `${tool.name} named alternative`);
  assert.match(tool.description, /Returns /, `${tool.name} returns`);
  assert.ok(tool.annotations, `${tool.name} annotations`);
  assert.equal(typeof tool.annotations.readOnlyHint, "boolean", `${tool.name} readOnlyHint`);
  assert.equal(typeof tool.annotations.destructiveHint, "boolean", `${tool.name} destructiveHint`);
  assert.equal(typeof tool.annotations.idempotentHint, "boolean", `${tool.name} idempotentHint`);
  assert.equal(typeof tool.annotations.openWorldHint, "boolean", `${tool.name} openWorldHint`);
  assert.ok(tool.outputSchema && tool.outputSchema.properties, `${tool.name} outputSchema`);
  for (const field of ["result", "receipt", "engine_digest", "ran_in", "provenance", "refusal", "limitations"]) {
    assert.ok(tool.outputSchema.properties[field], `${tool.name} outputSchema.${field}`);
  }
  assert.ok(tool.inputSchema && tool.inputSchema.type === "object", `${tool.name} inputSchema`);
  walkDescribed(tool.inputSchema, `${tool.name}.input`);
  if (tool.annotations.readOnlyHint) {
    assert.equal(tool.annotations.destructiveHint, false, `${tool.name} read-only cannot be destructive`);
    assert.match(
      tool.description,
      /Read-only|read-only|Inspect |List |Read |Confirm |Search |Grounded |Ranked |Open one |compact bootstrap/i,
      `${tool.name} readOnly description`,
    );
  }
  if (tool.annotations.idempotentHint && !tool.annotations.readOnlyHint) {
    assert.equal(tool.annotations.readOnlyHint, false);
  }
}

const execDoors = ["fraggate_call", "runtime_run", "runtime_session_exec"];
for (const name of execDoors) {
  assert.equal(byName[name].annotations.readOnlyHint, false, `${name} must not be globally read-only`);
  assert.equal(byName[name].annotations.idempotentHint, false, `${name} must not be globally idempotent`);
}

assert.match(byName.fraggate_list.description, /discovery first|Discover names/i);
assert.match(byName.fraggate_list.description, /fraggate_describe/);
assert.match(byName.fraggate_describe.description, /Not execute|not execute/i);
assert.match(byName.fraggate_call.description, /CallEnvelope/);
assert.match(byName.fraggate_call.description, /operation-dependent/);
assert.match(byName.runtime_skill.description, /one door/);
assert.match(byName.mesh_status.description, /QNS-CD-1\.0/);
assert.match(byName.fraggate_list.title, /Step 1/);
assert.match(byName.fraggate_describe.title, /Step 2/);
assert.match(byName.fraggate_call.title, /Step 3/);

const instructions = mcpInitializeInstructions();
assert.match(instructions, new RegExp(`Current MCP serverInfo\\.version: ${RUNTIME_VERSION.replaceAll(".", "\\.")}`));
assert.match(instructions, /1\.6\.2 is superseded heritage/);
assert.match(instructions, /Neighbor map/);
assert.match(instructions, /append-only/);
assert.match(instructions, /no chainlock_delete/);
assert.match(instructions, /no memory_delete/);
assert.match(instructions, new RegExp(`Current version remains ${RUNTIME_VERSION.replaceAll(".", "\\.")}`));

const firstSentence = (text) => String(text || "").split(/(?<=\.)\s+/)[0];
const pairs = [
  ["fraggate_list", "runtime_software"],
  ["fraggate_describe", "runtime_pull"],
  ["fraggate_call", "runtime_run"],
  ["chainlock_recall", "memory_recall"],
  ["chainlock_tip", "chainlock_recall"],
  ["mesh_status", "mesh_nodes"],
  ["mesh_enable", "mesh_join"],
  ["mesh_disable", "mesh_leave"],
  ["memory_observe", "memory_resolve"],
  ["memory_recall", "memory_get"],
  ["runtime_session_receipt", "runtime_session_receipts"],
  ["runtime_skill", "runtime_manifest"],
  ["library_lookup", "memory_recall"],
];
for (const [a, b] of pairs) {
  const sa = firstSentence(byName[a].description);
  const sb = firstSentence(byName[b].description);
  assert.notEqual(sa, sb, `${a} vs ${b} first sentences must differ`);
}

assert.match(byName.chainlock_append.description, /no chainlock_delete|append-only/);
assert.match(byName.memory_observe.description, /no memory_delete|Append-only/);
assert.match(byName.runtime_software.description, /Not the hashed/);
assert.match(byName.runtime_bundle.description, /not Software-tab/);

console.log(`ok mcp-tdqs ${names.length} tools, names frozen, schema coverage complete`);
