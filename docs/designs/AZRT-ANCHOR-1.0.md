# AZRT-ANCHOR-1.0 — outside anchoring of runtime chain heads

Author: Aziel Eliab only. Status: LIVE (2.0.0-rc1, additive). Not a Softwares card. Not a new MCP tool. Not a Remain-OFF flip.

Sources: RIB-001 (@TheNabeelKhan: publish the head somewhere the runtime cannot reach, record the anchor in each receipt, verify fails closed), RIB-002 (@TheNabeelKhan: the key must sit outside the audited runtime), RIB-003 (@DTXNaidu: witness the sealed head outside the stamper's process), RIB-004 (@HederaIntern: independent ordering and timestamps).

Companion: [AZRT-INTEGRITY-LEVEL-1.0](AZRT-INTEGRITY-LEVEL-1.0.md), [AZRT-AUDITOR-1.0](AZRT-AUDITOR-1.0.md). Code: `src/anchor.js`. Tests: `scripts/verify-anchor.mjs`.

## 1. Shape

| Part | Where | Who can write |
|------|-------|---------------|
| Heads feed `GET /v1/anchor/heads` | runtime (read-only, mints nothing) | runtime |
| Witness log `anchors/log.jsonl` | <https://github.com/AzielEliab/aziel-anchors> | only the `witness` Actions job |
| Witness key (Ed25519) | `WITNESS_ED25519_PKCS8` Actions secret of the witness repo | nobody else; the Worker never has it |
| RFC 3161 token | freetsa.org, stored as `anchors/tsr/<n>.tsr` | freetsa.org signs |
| Rekor entry | rekor.sigstore.dev (`rekord`, Ed25519) | Sigstore's public append-only log |
| Pinned public keys | `WITNESS_PUBLIC_KEY`, `AUDITOR_PUBLIC_KEY` in `src/anchor.js` | source review |

Heads cover the ChainLock roster chains, the internal `refusals` chain, the root FragGate ask/refuse ledger (DO row `seq`, 1-based, and `hash`/`stamp_sha256`), and the AZNews / 4DMap signed checkpoint tips (AZRT-STORE-CHECKPOINT-1.0). The witness also re-reads the two checkpoint tips from their own public ledgers (`independent`).

A witness statement: `{spec, n, prev_statement_hash, observed_at, source, heads, independent, witness}`. `statement_hash = sha256(canonicalize(statement))` (the same canonicalizer as session receipts). `sig` is Ed25519 over the canonical bytes. Statements chain by `prev_statement_hash` (genesis 64 zeros). A statement is written only when heads moved.

## 2. Receipts record the anchor (additive)

New ChainLock stamps, FragGate ledger rows and session receipts (open and exec) carry an optional `anchor` field: `{spec, log, n, statement_hash}` of the newest witness statement this isolate has **verified** against the pinned key. It is inside the row hash. It is never caller-supplied on session receipts. It is absent when no verified view is loaded (cold isolate, GitHub unreachable); that row simply shows a lower integrity level. The view refreshes in `ctx.waitUntil`, never on the mint path.

What `anchor` proves: the row was minted after statement `n`. What makes a row **externally anchored** is the next statement that covers its chain at a seq at or after the row (see AZRT-INTEGRITY-LEVEL-1.0).

## 3. Verify fails closed

`GET /v1/anchor` (alias `/v1/anchor/verify`): verifies the whole witness log (hash, order, pinned key, signature) and then checks that every head in the newest statement is still the same row at the same seq in the runtime. HTTP 409 and `ok:false` unless all hold. `GET /v1/anchor/row?c=&seq=` gives one row's level with a bounded prev walk (256) to the anchored head. `chainlock_verify` adds `integrity` per chain, and a witnessed head that no longer matches is a hard break (`anchor-mismatch`).

New refuse codes (REFUSAL-CONTRACT §5): `ANCHOR-MISSING`, `ANCHOR-UNREACHABLE`, `ANCHOR-SIG-BAD`, `ANCHOR-KEY-MISMATCH`, `ANCHOR-ORDER-BREAK`, `ANCHOR-MISMATCH`, `ANCHOR-STORE-UNBOUND`, `ANCHOR-NO-ROW`, `ANCHOR-WALK-TOO-LONG`, `ANCHOR-BAD-QUERY`.

## 4. Independent order and time (RIB-004)

Each statement gets an RFC 3161 token from freetsa.org over the canonical statement bytes and a Sigstore Rekor `rekord` entry (`integratedTime`, `logIndex`). Either may be skipped when its service is down; the row then says `tsa: null` / `rekor: null` (never a fake). The Worker does not parse CMS tokens; the auditor job verifies them with `openssl ts -verify` against freetsa's published CA.

## 5. Honesty

- `key_outside_runtime: true` is literal: the Worker bundle and its secrets have no witness key and no write token for the witness repo. The keys were generated on the operator's build box, written straight to the Actions secrets and shredded locally (`/dev/shm`). The repo owner can still rotate secrets and rewrite git history; Rekor and the TSA tokens are the parts the owner cannot rewrite.
- GitHub cron is best-effort; gaps longer than 15 minutes happen. Rows newer than the last statement are `chain_consistent`, not anchored.
- Per-caller FragGate ledgers (`<caller>:fraggate`) and per-session receipt chains are not in the heads feed; their ceiling is `chain_consistent`.

## 6. Law fit

FragGate stays the single exec door (no new tool, no new slug; GET read paths only). Additive only (BREAKING-CHANGE-POLICY "not breaking": new optional fields; old hashes unchanged, enforced by `fixtures/pre-anchor-receipts.json` in `scripts/verify-anchor.mjs`). NO-LIE / NO-REWRITE: the runtime cannot rewrite the witness log; a rewrite of its own rows is caught by the witness. RoseClock forward-only: append-only logs, no rollback API. Dual lattice and checkpoints unchanged; their tips are what gets anchored. Remain-OFF untouched.
