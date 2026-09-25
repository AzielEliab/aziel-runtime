/**
 * Sentinel pass4: confirm/dry_run optional on schema required[]; runtime still gates.
 * pass3 claim 2025-11-25 + instruction scrub stays. Extra scrub: retired / this.
 * Does not invent OAuth, SSE, DOI, or a second door.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import {
  MCP_PROTOCOL_PREFERRED,
  MCP_PROTOCOL_SUPPORTED,
  MCP_PROTOCOL_HEADER,
  MCP_SESSION_HEADER,
  negotiateProtocolVersion,
} from "../src/mcp-transport.js";
import { MCP_CONFIRM_REQUIRED, MCP_DRY_RUN, MUTATING_MCP_TOOLS } from "../src/mcp-safeguard.js";
import { MCP_PROTOCOL_VERSION } from "../src/mcp-discovery.js";
import { mcpInitializeInstructions } from "../src/mcp-surface.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {};

assert.equal(MCP_PROTOCOL_VERSION, "2025-11-25");
assert.equal(MCP_PROTOCOL_PREFERRED, "2025-11-25");
assert.ok(MCP_PROTOCOL_SUPPORTED.includes("2025-11-25"));
assert.ok(MCP_PROTOCOL_SUPPORTED.includes("2025-06-18"));
assert.ok(MCP_PROTOCOL_SUPPORTED.includes("2025-03-26"));

async function mcp(method, params = {}, id = 1, extraHeaders = {}) {
  return handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...extraHeaders },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
    env,
  );
}

const init = await mcp("initialize", {});
assert.equal(init.status, 200);
const initBody = await init.json();
assert.equal(initBody.result.protocolVersion, "2025-11-25");
assert.equal(initBody.result.serverInfo.name, "aziel-runtime");
assert.match(init.headers.get(MCP_SESSION_HEADER) || init.headers.get("mcp-session-id") || "", /./);
assert.equal(init.headers.get(MCP_PROTOCOL_HEADER) || init.headers.get("mcp-protocol-version"), "2025-11-25");
assert.match(initBody.result.instructions, /confirm=true/);
assert.doesNotMatch(initBody.result.instructions, /\bflat\b/);
assert.doesNotMatch(initBody.result.instructions, /\btrackers\b/);
assert.doesNotMatch(initBody.result.instructions, /\bFragGate\b/);
assert.doesNotMatch(initBody.result.instructions, /\bAziel\b/);
assert.doesNotMatch(initBody.result.instructions, /\bcounters\b/);
assert.doesNotMatch(initBody.result.instructions, /\bleftover\b/);
assert.doesNotMatch(initBody.result.instructions, /\bretired\b/);
assert.doesNotMatch(initBody.result.instructions, /\bthis\b/);
assert.match(initBody.result.instructions, /aziel eliab only/);

const sid = init.headers.get(MCP_SESSION_HEADER) || init.headers.get("mcp-session-id");
const resumed = await mcp("tools/list", {}, 2, {
  [MCP_SESSION_HEADER]: sid,
  [MCP_PROTOCOL_HEADER]: "2025-11-25",
});
assert.equal(resumed.status, 200);
assert.equal(resumed.headers.get(MCP_SESSION_HEADER) || resumed.headers.get("mcp-session-id"), sid);
const listed = await resumed.json();
const byName = Object.fromEntries(listed.result.tools.map((t) => [t.name, t]));
assert.ok(byName.fraggate_call.inputSchema.properties.confirm);
assert.ok(byName.fraggate_call.inputSchema.properties.dry_run);
assert.match(byName.fraggate_call.description, /confirm=true/);
assert.ok(!(byName.fraggate_call.inputSchema.required || []).includes("confirm"));
assert.ok(!(byName.fraggate_call.inputSchema.required || []).includes("dry_run"));
assert.deepEqual(byName.fraggate_call.inputSchema.required, ["op"]);
assert.ok(byName.mesh_enable.inputSchema.required.includes("bearer"));
assert.ok(!(byName.decisiongate_check.inputSchema.required || []).length);
assert.equal(byName.fraggate_call.annotations.requiresConfirmation, true);

for (const name of MUTATING_MCP_TOOLS) {
  assert.ok(byName[name], `${name} must be listed`);
  assert.ok(byName[name].inputSchema.properties.confirm, `${name} confirm`);
  assert.ok(byName[name].inputSchema.properties.dry_run, `${name} dry_run`);
  assert.ok(
    !(byName[name].inputSchema.required || []).includes("confirm"),
    `${name} must not list confirm in required[]`,
  );
  assert.ok(
    !(byName[name].inputSchema.required || []).includes("dry_run"),
    `${name} must not list dry_run in required[]`,
  );
  assert.equal(byName[name].annotations.requiresConfirmation, true, `${name} requiresConfirmation`);
  assert.match(byName[name].description, /confirm=true/);
}

assert.equal(negotiateProtocolVersion("").version, "2025-11-25");
assert.equal(negotiateProtocolVersion("latest").version, "2025-11-25");
assert.equal(negotiateProtocolVersion("validator_protocol_version").version, "2025-11-25");
assert.equal(negotiateProtocolVersion("2025-03-26").version, "2025-11-25");
assert.equal(negotiateProtocolVersion("2025-06-18").version, "2025-11-25");
assert.equal(negotiateProtocolVersion("2025-03-26", { requireLegacy: true }).version, "2025-03-26");
assert.equal(negotiateProtocolVersion("99.99.99").ok, false);

const negotiated = await mcp("initialize", { protocolVersion: "2025-06-18" });
assert.equal(negotiated.status, 200);
const negotiatedBody = await negotiated.json();
assert.equal(negotiatedBody.result.protocolVersion, "2025-11-25", "claim preferred, do not echo dated floor");
assert.equal(negotiated.headers.get(MCP_PROTOCOL_HEADER) || negotiated.headers.get("mcp-protocol-version"), "2025-11-25");

const legacy = await mcp("initialize", { protocolVersion: "2025-03-26" });
assert.equal(legacy.status, 200);
assert.equal((await legacy.json()).result.protocolVersion, "2025-11-25");

const aliasInit = await mcp("initialize", { protocolVersion: "latest" });
assert.equal(aliasInit.status, 200);
assert.equal((await aliasInit.json()).result.protocolVersion, "2025-11-25");

const validatorInit = await mcp("initialize", { protocolVersion: "validator_protocol_version" });
assert.equal(validatorInit.status, 200);
assert.equal((await validatorInit.json()).result.protocolVersion, "2025-11-25");

const lockedLegacy = await mcp("initialize", { protocolVersion: "2025-03-26", require_legacy_protocol: true });
assert.equal(lockedLegacy.status, 200);
assert.equal((await lockedLegacy.json()).result.protocolVersion, "2025-03-26");

const instructions = mcpInitializeInstructions();
assert.doesNotMatch(instructions, /\bAziel\b/);
assert.doesNotMatch(instructions, /\bcounters\b/);
assert.doesNotMatch(instructions, /\bleftover\b/);
assert.doesNotMatch(instructions, /\bretired\b/);
assert.doesNotMatch(instructions, /\bthis\b/);

const badHeader = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", [MCP_PROTOCOL_HEADER]: "99.99.99" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "initialize", params: {} }),
  }),
  env,
);
assert.equal(badHeader.status, 400, "invalid MCP-Protocol-Version header must be HTTP 400");
const badHeaderBody = await badHeader.json();
assert.match(String(badHeaderBody.error || ""), /unsupported MCP-Protocol-Version/);

const badParam = await mcp("initialize", { protocolVersion: "99.99.99" });
assert.equal(badParam.status, 400, "invalid initialize protocolVersion must be HTTP 400");

const sse = await handler(
  new Request(origin + "/mcp", { method: "GET", headers: { accept: "text/event-stream" } }),
  env,
);
assert.equal(sse.status, 405, "no fake SSE");

const opened = await mcp("initialize", { protocolVersion: "2025-11-25" });
const openSid = opened.headers.get(MCP_SESSION_HEADER) || opened.headers.get("mcp-session-id");
assert.ok(openSid);
const closed = await handler(
  new Request(origin + "/mcp", {
    method: "DELETE",
    headers: { [MCP_SESSION_HEADER]: openSid, [MCP_PROTOCOL_HEADER]: "2025-11-25" },
  }),
  env,
);
assert.equal(closed.status, 204, "DELETE /mcp tears down");

const reuse = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [MCP_SESSION_HEADER]: openSid,
      [MCP_PROTOCOL_HEADER]: "2025-11-25",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 11, method: "tools/list", params: {} }),
  }),
  env,
);
assert.equal(reuse.status, 404, "reuse of torn-down session must 404");

const unknown = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [MCP_SESSION_HEADER]: "00000000-0000-0000-0000-000000000000",
      [MCP_PROTOCOL_HEADER]: "2025-11-25",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 12, method: "ping", params: {} }),
  }),
  env,
);
assert.equal(unknown.status, 404);

const gateRefuse = await mcp("tools/call", {
  name: "decisiongate_check",
  arguments: { statement: "ledger stamp needs confirm" },
});
assert.equal(gateRefuse.status, 200);
const gateRefuseBody = await gateRefuse.json();
assert.equal(gateRefuseBody.result.structuredContent.code, MCP_CONFIRM_REQUIRED);

const refuse = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "foldlock", op: "fold-preview", payload: { text: "confirm gate" } },
});
assert.equal(refuse.status, 200);
const refuseBody = await refuse.json();
assert.equal(refuseBody.result.isError, true);
assert.equal(refuseBody.result.structuredContent.code, MCP_CONFIRM_REQUIRED);
assert.equal(refuseBody.result.structuredContent.mutated, false);

const preview = await mcp("tools/call", {
  name: "chainlock_append",
  arguments: { c: "session", fact: "dry run must not write", dry_run: true },
});
const previewBody = await preview.json();
assert.equal(previewBody.result.isError, false);
assert.equal(previewBody.result.structuredContent.code, MCP_DRY_RUN);
assert.equal(previewBody.result.structuredContent.mutated, false);
assert.equal(previewBody.result.structuredContent.dry_run, true);
assert.equal(previewBody.result.structuredContent.confirm_is_not_auth, true);
assert.equal(previewBody.result.structuredContent.confirm_is_consent, true);
assert.equal(previewBody.result.structuredContent.confirm_upgrades_isolation, false);
assert.equal(previewBody.result.structuredContent.tenant_auth, false);
assert.match(previewBody.result.structuredContent.confirm_note, /not tenant auth/);
assert.match(previewBody.result.structuredContent.confirm_note, /does not upgrade shared public-demo isolation/);

async function dryCall(args) {
  const res = await mcp("tools/call", {
    name: "fraggate_call",
    arguments: { ...args, dry_run: true },
  });
  return res.json();
}
async function confirmCall(args) {
  const res = await mcp("tools/call", {
    name: "fraggate_call",
    arguments: { ...args, confirm: true },
  });
  return res.json();
}

const dryCases = [
  { slug: "not-a-software", op: "health", code: "FG-HALLUC-TOOL" },
  { slug: "4dmap", op: "truth_score", code: "FG-STUB" },
  { slug: "4dmap", op: "area_estimate", code: "FG-UNKNOWN-OP" },
  { slug: "veillock", op: "apps", code: "FG-LOCAL-ONLY" },
];
for (const row of dryCases) {
  const dry = await dryCall(row);
  const live = await confirmCall(row);
  assert.equal(dry.result.isError, true, row.code);
  assert.equal(dry.result.structuredContent.code, row.code);
  assert.equal(dry.result.structuredContent.result.code, row.code);
  assert.equal(dry.result.structuredContent.result.message, live.result.structuredContent.result.message);
  assert.equal(dry.result.structuredContent.result.mutated, false);
  assert.equal(dry.result.structuredContent.result.dry_run, true);
  assert.equal(dry.result.structuredContent.result.ledger_written, false);
  assert.equal(dry.result.structuredContent.ledger_tip, undefined);
  assert.ok(live.result.structuredContent.ledger_tip, `${row.code} confirm still stamps a ledger tip`);
  assert.equal(dry.result.structuredContent.confirm_is_consent, true);
  assert.match(dry.result.structuredContent.confirm_note, /consent to run this call/);
}

const dryAllowed = await dryCall({ slug: "foldlock", op: "fold-preview", payload: { text: "preview only" } });
assert.equal(dryAllowed.result.isError, false);
assert.equal(dryAllowed.result.structuredContent.code, MCP_DRY_RUN);
assert.equal(dryAllowed.result.structuredContent.mutated, false);
assert.equal(dryAllowed.result.structuredContent.ledger_written, false);
assert.match(dryAllowed.result.structuredContent.confirm_note, /not tenant auth/);

const confirmed = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "foldlock", op: "fold-preview", payload: { text: "the cat and the dog" }, confirm: true },
});
const confirmedBody = await confirmed.json();
assert.equal(confirmedBody.result.isError, false);
assert.equal(confirmedBody.result.structuredContent.code, "FG-OK");
assert.equal(confirmedBody.result.structuredContent.confirm_is_not_auth, true);
assert.equal(confirmedBody.result.structuredContent.confirm_upgrades_isolation, false);
assert.equal(confirmedBody.result.structuredContent.tenant_auth, false);
assert.match(confirmedBody.result.structuredContent.confirm_note, /consent to run this call/);
assert.match(refuseBody.result.structuredContent.confirm_note, /not tenant auth/);
assert.match(refuseBody.result.structuredContent.message, /consent to run this call/);

const card = await handler(new Request(origin + "/.well-known/mcp/server-card.json"), env);
const cardBody = await card.json();
assert.equal(cardBody.protocolVersion, "2025-11-25");
assert.equal(cardBody.preferredProtocolVersion, "2025-11-25");
assert.deepEqual(cardBody.remotes[0].supportedProtocolVersions, MCP_PROTOCOL_SUPPORTED.slice());
assert.equal(cardBody.author, "Aziel Eliab");

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.ok(openapi.paths["/mcp"].delete);
assert.ok(openapi.paths["/mcp"].post);

console.log("ok mcp-transport: claim 2025-11-25, instruction scrub, confirm schema-optional, runtime gate, dry_run, protocol 400");
