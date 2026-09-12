# Glama TDQS — metadata-only pass

Public identity: **Aziel Eliab** only.

This note records **schema-and-metadata** quality work for Glama [TDQS](https://github.com/glama-ai/tool-definition-quality-score) (Tool Definition Quality Score). It does **not** change runtime behavior, FragGate routing, permissions, refusal semantics, engine execution, or Remain-OFF.

**Fold into 2.0.0-rc1** (same release train as `docs/2.0/`, not a side quest). Names stay the frozen 36 `PUBLIC_MCP_TOOLS`. No wrangler deploy. No tool rename. No tools added for score gaming. No tools removed.

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

## Observed Glama card (2026-09-12)

Overall **A 3.9/5.0** across 36 tools:

| Dimension | Score | What we can move in-repo |
|-----------|-------|--------------------------|
| Disambiguation | 3/5 | Pairwise first sentences + initialize neighbor map |
| Naming Consistency | 4/5 | **Names frozen** — mixed `domain_verb` / `domain_noun` / `runtime_session_*` stays |
| Tool Count | 2/5 | **Not fixable** without thinning `tools/list` (TDQS: 3–15 ideal, 16–25 heavy, 26+ scores 2). Do not remove mesh/chainlock/memory |
| Completeness | 4/5 | State append-only / full lifecycles so “missing delete” is by design |

Per-tool drag from the same inspection: `fraggate_list` **3.7** (allowlist op tokens required by azhub/azinterface/azbrowser verify scripts bloat conciseness). Other tools were mostly 4.1–4.8. Description quality uses `0.6×mean + 0.4×min`, so lifting the weakest tools matters.

## What this pass changes

- Every public tool description follows: **[Distinct verb+resource]. Use this when [condition]. Do not use it for [nearest sibling]; use [other tool] instead. [Behavior annotations cannot carry]. [Parameter intent beyond schema names]. Returns [result].**
- First sentences name the **resource that siblings do not share** (hashed registry vs hub cards vs skill URLs vs one product card; tip vs depth recall vs LOCKSET verify; observe vs resolve vs calibrate vs ranked recall vs one-id explain; suite radios vs one node vs hash receipt; last receipt vs full chain).
- Lifecycle completeness is explicit: ChainLock and memory are **append-only** (no delete). Mesh and raw session list the full cycle. FragGate is list → describe → verify → call.
- Parameter intent lives in the description (`params` on `tdqsDescription`) as well as `inputSchema` so Parameter Semantics can rise above the schema-coverage baseline of 3.
- Descriptions no longer restate `readOnlyHint` / `destructiveHint` / `idempotentHint` (TDQS gives no credit for repeating annotations).
- `initialize` instructions lead with `serverInfo.version` = `2.0.0-rc1` and label `1.6.2` as superseded heritage.
- `serverInfo` may include `title`, `websiteUrl`, and `description` restating `2.0.0-rc1`.
- `glama.json` carries `"version": "2.0.0-rc1"`. Repo-root `CHANGELOG.md` leads with the same version.

## What did not change

- Tool **names** (36).
- FragGate single door + Remain-OFF.
- Handler code paths, allowlists, ledger writes, mesh radios, engine ops.
- `FRAGGATE_CATALOG_ALLOWLIST` tokens on `fraggate_list` / `fraggate_call` (product verify scripts still require those op names in the description).

## Glama Tool Schema Changelog still showing v1.6.2

Live `POST /mcp` initialize already returns `serverInfo.version: "2.0.0-rc1"`. GitHub `package.json` and release tag `v2.0.0-rc1` match.

Glama’s **Tool Schema Changelog** version label is written at **inspection / Make Release** time. Nothing in this repo can rewrite a past Glama snapshot. After merge:

1. Re-claim / re-read `glama.json` on the Score tab.
2. **Deploy** the stdio image (CMD remains `node cli/mcp-stdio.mjs`; default still bridges to the Worker).
3. **Make Release** again so a new inspection can tag `2.0.0-rc1`.

If Glama’s parser skips prerelease strings (`2.0.0-rc1`) and keeps the last `X.Y.Z` it cached (`1.6.2`), that is a Glama labeling issue — we cannot legally change `RUNTIME_VERSION` to a non-rc string in this metadata pass.

## Neighbor map (selection)

| If you want… | Use | Not |
|--------------|-----|-----|
| How to use this software | `runtime_skill` | `runtime_manifest` |
| Discovery first (hashed) | `fraggate_list` | `fraggate_describe`, `runtime_software` |
| Inspect one known name | `fraggate_describe` | `fraggate_call`, `runtime_pull` |
| Prove a digest | `fraggate_verify` | `fraggate_describe` |
| Execute slug+op | `fraggate_call` | `runtime_run`, `runtime_session_exec` |
| Hub Software tab | `runtime_software` (GET `/v1/software`) | `fraggate_list` |
| Skill URL bootstrap | `runtime_bundle` | `runtime_software` |
| Gate a proposal without exec | `decisiongate_check` | `fraggate_call` |
| Public corpus cite | `library_lookup` | `memory_recall`, `chainlock_recall` |
| Grounded stamps | `chainlock_recall` | `memory_recall` |
| Ranked belief (≠ truth) | `memory_recall` | `chainlock_recall` |
| Suite counts | `mesh_status` | `mesh_nodes`, `mesh_enable` |
| One node in/out | `mesh_join` / `mesh_leave` | `mesh_enable` / `mesh_disable` |

## Verify

```bash
npm test
```

Includes `scripts/verify-mcp-tdqs.mjs` (name freeze, description template, schema coverage, annotation honesty, version lead).

See also [`docs/GLAMA.md`](GLAMA.md) for the stdio / Install Server path.

Author: Aziel Eliab.
