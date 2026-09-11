# Glama TDQS — metadata-only pass

Public identity: **Aziel Eliab** only.

This note records a **schema-and-metadata quality pass** for Glama [TDQS](https://github.com/glama-ai/tool-definition-quality-score) (Tool Definition Quality Score). It does **not** change runtime behavior, FragGate routing, permissions, refusal semantics, engine execution, or Remain-OFF.

**Fold into 2.0.0-rc1** (same release train as `docs/2.0/`, not a side quest). This pass stacks on the certification-point freeze. It is metadata-only and does not change behavior. Names stay the frozen 36 `PUBLIC_MCP_TOOLS`. No wrangler deploy. No tool rename. No tools added for score gaming. No tools removed. Included in Gate 4 of `docs/2.0/` (TDQS metadata + existing `glama.json` / GitHub topics).

## Source of truth

MCP `tools/list` is built by `buildMcpToolList` in [`src/mcp-surface.js`](../src/mcp-surface.js):

| Surface | Module |
|---------|--------|
| Door + mesh + catalog helpers | `runtimeHelperTools()` in `src/mcp-surface.js` |
| ChainLock fabric | `chainlockMcpTools()` in `src/chainlock.js` |
| AKM-TRIAD memory | `memoryMcpTools()` in `src/memory.js` |
| Advanced session | `sessionMcpTools()` in `src/session-http.js` (titles/annotations via `annotateSessionTool`) |
| Shared annotations / output schema / description template | `src/mcp-schema.js` |

Live name inventory is `PUBLIC_MCP_TOOLS` in `src/fraggate/codes.js` (36 names). `scripts/verify-mcp-tdqs.mjs` asserts that list is unchanged.

## What changed

- Every public tool description follows: **[Action]. Use this when [condition]. Do not use it for [nearest competing use]; use [other tool] instead. [Read/write/side-effect/refusal]. Returns [result].**
- Pairwise disambiguation across neighbors (list vs describe vs call; software vs bundle vs pull; mesh status vs nodes vs enable; ChainLock recall vs memory recall; session receipt vs receipts).
- Every input property has a description (meaning, required/optional, constraints, malformed refuse).
- Truthful MCP annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` only where semantically true.
- `fraggate_call` (and `runtime_run` / `runtime_session_exec`) are **not** globally `readOnlyHint` or `idempotentHint`.
- `outputSchema` documents the display envelope plus FragGate fields (`status`, `result`, `receipt`, `engine_slug`, `engine_op`, `engine_digest`, `ran_in`, `provenance`, `refusal`, `limitations`) without claiming a closed engine payload.

## What did not change

- Tool **names** (36).
- FragGate single door + Remain-OFF.
- Handler code paths, allowlists, ledger writes, mesh radios, engine ops.
- `mcpInitializeInstructions` (initialize text is not `tools/list`).

## Neighbor map (selection)

| If you want… | Use | Not |
|--------------|-----|-----|
| How to use this software | `runtime_skill` | `runtime_manifest` |
| Discovery first | `fraggate_list` | `fraggate_describe`, `fraggate_call` |
| Inspect one known name | `fraggate_describe` | `fraggate_call`, `runtime_pull` |
| Prove a digest | `fraggate_verify` | `fraggate_describe` |
| Execute slug+op | `fraggate_call` | `runtime_run`, `runtime_session_exec` |
| Hub Software tab | `runtime_software` (GET `/v1/software`) | `fraggate_list` |
| Gate a proposal without exec | `decisiongate_check` | `fraggate_call` |
| Public corpus cite | `library_lookup` | `memory_recall`, `chainlock_recall` |
| Grounded stamps | `chainlock_recall` | `memory_recall` |
| Ranked belief (≠ truth) | `memory_recall` | `chainlock_recall` |
| Suite counts | `mesh_status` | `mesh_nodes`, `mesh_enable` |

## Verify

```bash
npm test
```

Includes `scripts/verify-mcp-tdqs.mjs` (name freeze, description template, schema coverage, annotation honesty).

See also [`docs/GLAMA.md`](GLAMA.md) for the stdio / Install Server path.

Author: Aziel Eliab.
