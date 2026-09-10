/**
 * FragGate FG-0.1 refuse / result codes.
 * Kernel: https://github.com/AzielEliab/fraggate
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const FG_OK = "FG-OK";
export const FG_HALLUC_TOOL = "FG-HALLUC-TOOL";
export const FG_STUB = "FG-STUB";
export const FG_LOCAL_ONLY = "FG-LOCAL-ONLY";
export const FG_GATE_REFUSE = "FG-GATE-REFUSE";
export const FG_UNKNOWN_OP = "FG-UNKNOWN-OP";

export const FRAGGATE_KERNEL = "https://github.com/AzielEliab/fraggate";
export const FRAGGATE_KERNEL_VERSION = "FG-0.1";
export const FRAGGATE_DOOR = "fraggate";

export const PUBLIC_MCP_TOOL_MAX = 40;
export const PUBLIC_MCP_SEE = "tools/list";
export const PUBLIC_MCP_POINTER = "POST /mcp tools/list";

/** Thin FragGate pipeline (list → describe → call). Not the full live tool set. */
export const PUBLIC_DOOR_TOOLS = [
  "runtime_skill",
  "fraggate_list",
  "fraggate_describe",
  "fraggate_verify",
  "fraggate_call",
  "decisiongate_check",
  "library_lookup",
];

/** Named fabric + catalog helpers + advanced session — same names as live tools/list. */
export const PUBLIC_FABRIC_TOOLS = [
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
];

export const PUBLIC_HELPER_TOOLS = [
  "runtime_software",
  "runtime_bundle",
  "runtime_pull",
  "runtime_run",
  "runtime_manifest",
];

export const PUBLIC_SESSION_TOOLS = [
  "runtime_session_open",
  "runtime_session_policy",
  "runtime_session_exec",
  "runtime_session_receipt",
  "runtime_session_receipts",
  "runtime_session_close",
];

/** Live MCP tools/list names. Refuse exist.mcp must track this, not the thin door alone. */
export const PUBLIC_MCP_TOOLS = Object.freeze([
  ...PUBLIC_DOOR_TOOLS,
  ...PUBLIC_FABRIC_TOOLS,
  ...PUBLIC_HELPER_TOOLS,
  ...PUBLIC_SESSION_TOOLS,
]);

/**
 * Refuse-envelope hint. Not an exec allowlist.
 * Unknown names still FG-HALLUC-TOOL. Stubs still FG-STUB.
 * Flat {slug}_{op} is not listed. FragGate remains THE single door.
 */
export function existMcpHint() {
  return {
    mcp: PUBLIC_MCP_TOOLS.slice(),
    see: PUBLIC_MCP_SEE,
    pointer: PUBLIC_MCP_POINTER,
    note:
      "Refuse hint only — not an exec allowlist. Live MCP tool set is POST /mcp tools/list. Unknown names still FG-HALLUC-TOOL. Flat {slug}_{op} is not listed. FragGate remains THE single door.",
  };
}
