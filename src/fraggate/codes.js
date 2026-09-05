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

export const PUBLIC_MCP_TOOL_MAX = 20;

export const PUBLIC_DOOR_TOOLS = [
  "runtime_skill",
  "fraggate_list",
  "fraggate_describe",
  "fraggate_verify",
  "fraggate_call",
  "decisiongate_check",
  "library_lookup",
];
