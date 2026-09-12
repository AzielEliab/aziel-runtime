/**
 * MCP tools/list metadata helpers (Glama TDQS schema-and-metadata pass).
 *
 * Descriptions, parameter text, truthful annotations, and output schemas only.
 * Does not change FragGate routing, permissions, refusal semantics, or execution.
 * Author: Aziel Eliab only.
 */

export const HINT_READ = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

export const HINT_ADDITIVE = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
});

export const HINT_ADDITIVE_IDEMPOTENT = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

export const HINT_DESTRUCTIVE = Object.freeze({
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
});

export const HINT_DESTRUCTIVE_IDEMPOTENT = Object.freeze({
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
});

/** Exec doors whose target op may reach outside the isolate (for example AZBrowser). */
export const HINT_EXEC = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
});

export const CHAIN_ROSTER = Object.freeze([
  "genesis",
  "identity",
  "ssh",
  "session",
  "acts",
  "evidence",
  "recall",
  "mesh",
  "library",
  "learn",
]);

/**
 * Compact allowlist copy required by product verify scripts (azhub / azinterface / azbrowser).
 * Discovery still happens via fraggate_list result.allowlist — this text is metadata only.
 */
export const FRAGGATE_CATALOG_ALLOWLIST =
  "allowlist.azhub LIVE_OPS: health, skill, region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status, list_modules, place. " +
  "allowlist.azinterface LIVE_OPS: health, skill, genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status, genesis_boot, hold. " +
  "allowlist.azbrowser LIVE_OPS: ethical_search, lamb_lens_search, navigate, airlock_ingest, airlock, home, tab_open, tab_list, receipt_list, verify, receipt_verify, sandbox_status, sandbox_render, health, skill. " +
  "allowlist.aznet LIVE_OPS: health, doctor, pair_status, pair, garden_list, stamp, verify_hash, memorial_list, memorial_append, receipt_verify, skill. " +
  "UI aliases forward to catalog ops. EmbryoLock LIVE_OPS health/skill/doctor/verify-hash/policy/limitation; wipe/scorch/unlock stay FG-STUB on the public mesh.";

export function mcpAnnotations(title, hints) {
  return { title, ...hints };
}

export function tdqsDescription({ action, when, notFor, instead, effects, returns, params }) {
  const act = endSentence(action);
  const cond = endSentence(when);
  const fx = endSentence(effects);
  const ret = String(returns || "").trim();
  const retLine = /^returns\b/i.test(ret) ? ret : `Returns ${ret}`;
  const extra = params ? ` ${endSentence(params)}` : "";
  return `${act} Use this when ${cond} Do not use it for ${notFor}; use ${instead} instead. ${fx}${extra} ${endSentence(retLine)}`;
}

function endSentence(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

export function emptyArgsSchema(description) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {},
    description: description || "No arguments. Send an empty object {}.",
  };
}

/**
 * StructuredContent envelope from wrapToolOutput / wrapFraggateEnvelope.
 * additionalProperties stays true — engines add fields; this documents the stable ones.
 */
export function toolEnvelopeOutputSchema(resultDescription) {
  return {
    type: "object",
    additionalProperties: true,
    description:
      "Display envelope shown to the user (display.title / display.summary) plus the machine result. Extra engine fields may appear.",
    properties: {
      display: {
        type: "object",
        additionalProperties: true,
        description: "Human-facing envelope. Show title and summary, then take the next input.",
        properties: {
          title: { type: "string", description: "Short result title for the AI client." },
          summary: { type: "string", description: "One-line outcome or refuse reason." },
          fields: {
            type: "array",
            description: "Optional labeled scalars copied from the result for display.",
            items: {
              type: "object",
              additionalProperties: true,
              properties: {
                label: { type: "string", description: "Field label." },
                value: { type: "string", description: "Field value as text." },
              },
            },
          },
          next: { type: "string", description: "What the agent should do after showing this output." },
        },
      },
      result: {
        description:
          resultDescription ||
          "Machine payload. FragGate-style results commonly include ok, code, slug, op, status, engine_slug, engine_op, engine_digest, ran_in, provenance, refusal, limitations, and ledger_tip.",
      },
      receipt: {
        description: "Optional receipt, ledger tip, or TemporalLock/ForgeReceipts exit when the door stamped one.",
      },
      session_id: {
        type: "string",
        description: "Raw session id when session plumbing was used. Hidden unless the user asked for the chain.",
      },
      status: {
        type: "integer",
        description: "HTTP-like status when present on wrappers (200 ok; 400+ error / refuse).",
      },
      code: {
        type: "string",
        description:
          "FragGate or fabric code when present: FG-OK, FG-HALLUC-TOOL, FG-STUB, FG-LOCAL-ONLY, FG-UNKNOWN-OP, FG-GATE-REFUSE, FG-LAMB-REFUSE, or a module refuse such as MESH-* / AKM-*.",
      },
      door: { type: "string", description: "Door name. The public door is fraggate." },
      ledger_tip: { description: "Ask/refuse ledger tip when the door stamped one." },
      engine_slug: { type: "string", description: "Resolved engine slug when present (often inside result)." },
      engine_op: { type: "string", description: "Resolved engine op when present (often inside result)." },
      engine_digest: {
        type: "string",
        description: "64-hex engine_digest when a true in-process engine ran (often inside result).",
      },
      ran_in: { type: "string", description: "Execution locale (for example aziel-runtime) when present." },
      provenance: { description: "Provenance / input packet when the pipeline attached one." },
      refusal: { description: "Explicit refuse object, code, or message when the door or engine refused." },
      limitations: { description: "Capability limitations or Remain-OFF notes when present." },
    },
  };
}

export const MCP_OUTPUT_SCHEMA = toolEnvelopeOutputSchema();

export const FRAGGATE_OUTPUT_SCHEMA = toolEnvelopeOutputSchema(
  "FragGate body: ok, code, door, slug, op, engine_digest, ran_in, provenance, refusal, limitations, receipt, plus the engine result. Unknown names refuse FG-HALLUC-TOOL; stubs refuse FG-STUB.",
);

export function nameOrSlugProps() {
  return {
    name: {
      type: "string",
      description:
        "Optional registry display name (for example FoldLock, EmbryoLock, AZHub). Use name or slug — one is enough. Combined name/op forms such as foldlock/fold-preview are accepted by the door parser. Unknown names refuse FG-HALLUC-TOOL.",
    },
    slug: {
      type: "string",
      description:
        "Optional catalog slug (lowercase a-z0-9-, for example foldlock, embryolock, azhub). Alternative to name. Prefer the slug returned by fraggate_list or GET /v1/software.",
    },
  };
}
