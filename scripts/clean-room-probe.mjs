/**
 * In-process MCP + session probe for 2.0 clean-room.
 * No hosted Worker, no secrets. Author: Aziel Eliab only.
 */
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { verifyChainStrict } from "../src/session-core.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function mcp(method, params = {}, id = 1) {
  const res = await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
    env,
  );
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error.message || "mcp error");
    err.rpc = data.error;
    throw err;
  }
  return data.result;
}

async function json(path, method = "GET", body) {
  const init = { method, headers: { "user-agent": "Mozilla/5.0" } };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await handler(new Request(origin + path, init), env);
  const data = await res.json();
  return { status: res.status, data };
}

export async function runCleanRoomProbe() {
  const init = await mcp("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "aziel-runtime-clean-room", version: "2.0.0-rc1" },
  });
  const protocol_version = init.protocolVersion || "2025-03-26";
  const server_name = init.serverInfo && init.serverInfo.name;
  const server_version = init.serverInfo && init.serverInfo.version;
  if (server_name !== "aziel-runtime") throw new Error(`unexpected serverInfo.name ${server_name}`);
  if (server_version !== RUNTIME_VERSION) {
    throw new Error(`serverInfo.version ${server_version} !== RUNTIME_VERSION ${RUNTIME_VERSION}`);
  }

  const listed = await mcp("tools/list", {}, 2);
  const names = (listed.tools || []).map((t) => t.name);
  const expected = PUBLIC_MCP_TOOLS.slice().sort();
  const got = names.slice().sort();
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    throw new Error(`tools/list mismatch count=${names.length} expected=${PUBLIC_MCP_TOOLS.length}`);
  }

  const call = await mcp(
    "tools/call",
    { name: "fraggate_call", arguments: { slug: "decisiongate", op: "health", payload: {} } },
    3,
  );
  if (call.isError) throw new Error("harmless call isError");
  const envelope = call.structuredContent || {};
  if (envelope.code !== "FG-OK") {
    throw new Error(`harmless call refused: ${JSON.stringify(envelope.code || envelope)}`);
  }

  const mesh = await json("/v1/mesh");
  if (mesh.data.enabled !== true) throw new Error("GET /v1/mesh suite-presence should be ON by default");
  if (mesh.data.mesh_default !== "on") throw new Error("GET /v1/mesh mesh_default should be on");
  if (mesh.data.get_never_enables !== true) throw new Error("GET /v1/mesh must keep get_never_enables");
  const disable = await json("/v1/mesh/disable", "POST", {});
  if (disable.data.ok !== false || disable.data.code !== "MESH-DISABLE-REFUSED") {
    throw new Error(`suite mesh-off must refuse: ${JSON.stringify(disable.data)}`);
  }

  const opened = await json("/v1/session/open", "POST", {});
  const sid = opened.data.session && opened.data.session.id;
  if (!sid) throw new Error("session open missing id");
  const exec = await json(`/v1/session/${sid}/exec`, "POST", {
    slug: "godlock",
    op: "score",
    payload: { text: "ABAD does not layer on phi." },
  });
  if (exec.status !== 200) throw new Error(`session exec status ${exec.status}`);
  const receiptsRes = await json(`/v1/session/${sid}/receipts`);
  const receipts = receiptsRes.data.receipts;
  const chain = await verifyChainStrict(Array.isArray(receipts) ? receipts : []);
  if (!chain.ok) throw new Error(`receipt chain failed: ${JSON.stringify(chain.errors)}`);
  await json(`/v1/session/${sid}/close`, "POST", {});

  return {
    mcp: {
      protocol_version,
      server_name,
      server_version,
      tools_list_count: names.length,
      tools_list_names: names,
      harmless_call: {
        slug: "decisiongate",
        op: "health",
        ok: true,
        code: envelope.code,
      },
    },
    receipt: {
      kind: "aziel-runtime.receipt",
      session_id: sid,
      chain_ok: true,
      count: chain.count,
    },
  };
}

const isMain = process.argv[1] && process.argv[1].endsWith("clean-room-probe.mjs");
if (isMain) {
  const out = await runCleanRoomProbe();
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}
