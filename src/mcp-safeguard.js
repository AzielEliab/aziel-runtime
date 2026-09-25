/**
 * Confirm / dry_run gate for mutating MCP tools.
 * Does not replace Lamb Lens or DecisionGATE. FragGate stays the exec door.
 * Author: Aziel Eliab only.
 */

export const MCP_CONFIRM_REQUIRED = "MCP-CONFIRM-REQUIRED";
export const MCP_DRY_RUN = "MCP-DRY-RUN";

/** confirm is consent to run the call. It is not tenant auth and it does not upgrade isolation. */
export const CONFIRM_CONSENT_NOTE =
  "confirm is consent to run this call. It is not tenant auth and it does not upgrade shared public-demo isolation.";

export function confirmConsentHonesty() {
  return {
    confirm_is_not_auth: true,
    confirm_is_consent: true,
    confirm_upgrades_isolation: false,
    tenant_auth: false,
    confirm_note: CONFIRM_CONSENT_NOTE,
  };
}

export const MUTATING_MCP_TOOLS = Object.freeze([
  "fraggate_call",
  "runtime_run",
  "runtime_session_open",
  "runtime_session_policy",
  "runtime_session_exec",
  "runtime_session_close",
  "decisiongate_check",
  "mesh_leave",
  "mesh_join",
  "mesh_enable",
  "mesh_heartbeat",
  "mesh_broadcast",
  "chainlock_append",
  "chainlock_seal",
  "memory_observe",
  "memory_resolve",
  "memory_calibrate",
]);

const MUTATING = new Set(MUTATING_MCP_TOOLS);

export function isMutatingMcpTool(name) {
  return MUTATING.has(String(name || ""));
}

export function isTruthyFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
}

function previewArgs(args) {
  const src = args && typeof args === "object" ? args : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (key === "confirm" || key === "dry_run") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const keys = Object.keys(value).slice(0, 12);
      out[key] = { keys };
    } else if (Array.isArray(value)) {
      out[key] = { length: value.length };
    }
  }
  return out;
}

export function dryRunAllowedEnvelope(name, args) {
  return {
    ok: true,
    dry_run: true,
    mutated: false,
    ledger_written: false,
    code: MCP_DRY_RUN,
    door: "fraggate",
    tool: name,
    would: previewArgs(args),
    ...confirmConsentHonesty(),
    note:
      "Preview only. Catalog allowlist would admit this call. No mutation and no ledger tip. " +
      CONFIRM_CONSENT_NOTE +
      " Set confirm=true to execute through the same door.",
  };
}

export function evaluateMutateSafeguard(name, args) {
  if (!isMutatingMcpTool(name)) return { gated: false };
  const dryRun = isTruthyFlag(args && args.dry_run);
  if (dryRun) {
    return { gated: false, dry_run: true };
  }
  if (isTruthyFlag(args && args.confirm)) {
    return { gated: false, confirmed: true };
  }
  return {
    gated: true,
    refuse: true,
    envelope: {
      ok: false,
      code: MCP_CONFIRM_REQUIRED,
      door: "fraggate",
      tool: name,
      mutated: false,
      message: `${name} is mutating. Set confirm=true to execute, or dry_run=true for a preview that does not write. ${CONFIRM_CONSENT_NOTE}`,
      hint: "confirm=true | dry_run=true",
      ...confirmConsentHonesty(),
    },
  };
}
