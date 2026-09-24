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

Overall **A 3.9/5.0** across 36 tools. A follow-up metadata pass (this note + `tools/list` text) targets the weakest per-tool scores without touching handlers.

| Dimension | Score | What we can move in-repo |
|-----------|-------|--------------------------|
| Disambiguation | 3/5 | Pairwise first sentences + initialize neighbor map |
| Naming Consistency | 4/5 | **Names frozen** — mixed `domain_verb` / `domain_noun` / `runtime_session_*` stays |
| Tool Count | 2/5 | **Not fixable** without thinning `tools/list` (TDQS: 3–15 ideal, 16–25 heavy, 26+ scores 2). Do not remove mesh/chainlock/memory |
| Completeness | 4/5 | State append-only / full lifecycles so “missing delete” is by design |

Per-tool drag after PR #79: weakest tools sat at **4.1–4.3** (see follow-up below). `fraggate_list` remains conciseness-taxed by required azhub/azinterface/azbrowser LIVE_OPS tokens. Description quality uses `0.6×mean + 0.4×min`, so lifting the weakest tools matters.

## Follow-up: weak-tool lift (post PR #79)

PR #79 already applied the template, annotations, and output schemas. Glama then showed every tool letter **A**, but the floor sat at **4.1**. TDQS description quality is `0.6×mean + 0.4×min`, and Parameter Semantics / Behavioral Transparency only credit text **beyond** schema + annotations.

This follow-up keeps the same 36 names and the same handlers. It adds refuse codes, omit-defaults, and aliases the door already accepts:

| Cluster | Weak scores | What the description now discloses (already true in handlers) |
|---------|-------------|---------------------------------------------------------------|
| LOCKSET / ChainLock write+tip | `chainlock_seal` 4.1, `chainlock_append` 4.2, `chainlock_tip` 4.2 | seal ≠ `runtime_session_close`; empty-vault; `ts` never backdates; omit `c`/`chain` defaults to **session** on append/tip; `no-fact` / `unknown-chain` / `card-cap`; empty tip is `tip=null`/`empty=true` |
| Session plumbing | `runtime_session_*` 4.2–4.3 | `session_id`/`id` aliases; 6h TTL; receipt cap 64; `session_closed` / `session_not_found` / `session_expired`; exec does not auto-open and does not treat leftover keys as payload |
| Hub catalog | `runtime_software` 4.1, `runtime_pull` 4.2 | Software-tab JSON ≠ hashed registry; never enables mesh; pull `product` alias; unknown slug is `unknown product` (not `FG-HALLUC-TOOL`) |
| FragGate proof/list | `fraggate_list` 4.3, `fraggate_verify` 4.3 | empty `{}` on verify refuses `FG-HALLUC-TOOL`; digest-only = whole registry hash; **LIVE_OPS token strings kept** on list/call for azhub/azinterface/azbrowser verify scripts |
| Memory / library | `memory_recall` 4.2, `memory_get` 4.3, `library_lookup` 4.3 | recall default depth **5** + `CHAIN_VERIFY_FAIL`; get `AKM-NOT-FOUND`; library `q` is corpus text, extra keys ride as payload |

**Left alone** unless a one-line clarity win: tools already at ~4.8–4.9 (`fraggate_describe`, `memory_calibrate`, `memory_resolve`, `mesh_disable`, `mesh_heartbeat`, `mesh_leave`, `mesh_join`).

**Maintenance-safe choices:** one focused PR; changelog + this note only; no empty commits; no issue theatre; Dockerfile / stdio Install Server path / license untouched. Do not trade Maintenance for TDQS.

Glama **Build** may still need a healthy **Redeploy** / **Make Release** to rescore (their queue was stuck pending earlier). In-repo `POST /mcp` already serves these descriptions.

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
- `FRAGGATE_CATALOG_ALLOWLIST` is generated from `LIVE_OPS` plus compact product-verify tokens (`FRAGGATE_CATALOG_VERIFY_HINTS`). The text is **not** the full FragGate door — empty `fraggate_list` is discovery. Product verify scripts still require the azhub / azinterface / azbrowser op-name tokens.

## Glama release vs Worker package

Live `POST /mcp` initialize returns `serverInfo.version: "2.0.0-rc1"`. GitHub `package.json` and `glama.json` `version` match that Worker truth.

Glama's **Install Server release is 2.0.7** (Deploy Success, Install Server ON, Auto-Release ON). That number is Glama's listing release. It is not the Worker package. `glama.json` `version` stays `2.0.0-rc1`. The description names Glama release 2.0.7 so a re-claim can refresh Schema and keywords.

Glama’s **Tool Schema Changelog** label is written at **inspection / Make Release** time. Nothing in this repo rewrites a past snapshot. Historical note: an earlier inspection cached `1.6.2`. Current operator-confirmed listing release is **2.0.7**. After a `glama.json` change:

1. Re-claim / re-read `glama.json` on the Score tab.
2. **Deploy** the stdio image (CMD remains `node cli/mcp-stdio.mjs`; default still bridges to the Worker).
3. **Make Release** only when a new inspection should record the Worker package `2.0.0-rc1` beside the existing Glama release 2.0.7. Do not set `glama.json` `version` to 2.0.7.

If Glama’s parser skips prerelease strings (`2.0.0-rc1`), the listing release can stay an `X.Y.Z` such as 2.0.7 while the Worker package stays `2.0.0-rc1`. Do not change `RUNTIME_VERSION` to a non-rc string to chase that label.

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
| Local LOCKSET over live tips | `chainlock_seal` | `runtime_session_close` |
| Seal a raw session | `runtime_session_close` | `chainlock_seal` |
| Suite counts | `mesh_status` | `mesh_nodes`, `mesh_enable` |
| One node in/out | `mesh_join` / `mesh_leave` | `mesh_enable` / `mesh_status` |

## Verify

```bash
npm test
```

Includes `scripts/verify-mcp-tdqs.mjs` (name freeze, description template, schema coverage, annotation honesty, version lead).

See also [`docs/GLAMA.md`](GLAMA.md) for the stdio / Install Server path.

Author: Aziel Eliab.
