# AZRT-GROUP-D-RECEIPTS-1.0 — build attest, second mint, writer fence, harness seal

Author: Aziel Eliab only. Status: **Not live.** Source: RIB-048, RIB-049, RIB-050, RIB-051. Receipts are hash-linked and sealed, not signed. Cap-7 is not ICANN. Paid satellite stays HELD.

One draft covers the four ideas because they share the session receipt chain and the ChainLock append path. No new MCP tool. Softwares stay 42. `tools/list` stays 36. Version stays 2.0.0-rc1.

## RIB-048 — AZRT-BUILD-ATTEST-1.0

`src/build-attest.js` and `scripts/build-attest.mjs`.

The script binds source revision (`git rev-parse HEAD`), build environment (lockfile sha256 and toolchain versions), builder identity, and an artifact digest. Builder identity is `GITHUB_WORKFLOW` plus `GITHUB_RUN_ID` when both are set, and is otherwise absent. A deploy var is not the builder. The script does not sign the attestation. Running it twice yields the same digest. `--mismatch` changes one manifest byte and the check returns `BUILD-ATTEST-MISMATCH`.

Before exec, the runtime compares its running artifact digest with the newest witnessed attestation. A mismatch refuses `BUILD-ATTEST-MISMATCH` and seals a `refused` receipt. No attestation is `not_checked` (`ok: null`), never a pass. Strict mode (`policy.build_attest_strict`) refuses `BUILD-ATTEST-NOT-CHECKED`. `BUILD_BUNDLE_DIGEST` stays null until a build emits one, so a deploy with no witnessed attestation is not a pass.

## RIB-049 — AZRT-SECOND-MINT-1.0

`src/second-mint.js`, gated from `heldSignerFromEnv`. No key is generated, exported, or rotated.

When a loaded receipt key id differs from the key id on a verified witness statement, signing is refused `KEY-SECOND-MINT`. The refusal row carries path, attempt, deny reason, and tip, and is hash-linked. Verify recomputes the row and fails closed if the deny reason was changed. The refused key id and the refusal hash are the witness fragment on `GET /v1/anchor/heads` (`second_mint`). No witnessed key yet is `not_checked`, not a pass. The first held key still signs.

## RIB-050 — AZRT-WRITER-FENCE-1.0

`src/writer-fence.js`. Stop uses the RIB-015 issuer key. It does not add a second authority.

Open seals `writer_epoch` 1. Revoke bumps the epoch. `POST /v1/session/{id}/stop` bumps it and sets `stopped`. A presented older epoch refuses `STALE-WRITER-FENCED` and seals a refusal receipt. After stop, exec refuses `SESSION-STOPPED`. The check runs in `recordIntent` and in ChainLock append, not in a prompt. In-flight effects are `completed` or `unknown`, with the note that stopping a run does not undo an external effect. A rollback status is not recorded. Verify fails closed on a row whose epoch is older than an earlier revocation stamp. Two ChainLock writers: the runtime bump lands, and the writer still holding the old epoch is fenced.

## RIB-051 — AZRT-HARNESS-SEAL-1.0

`src/harness-seal.js`. `appendReceipt` sets `issuer_kind=harness` and `issuer_path=runtime_session_<event>`. Caller fields of those names are dropped.

`chainlock_append` cannot mint `issuer_kind=harness`. That attempt refuses `SELF-AUDIT-REFUSED` and returns a sealed refusal receipt. An exec-shaped self-log (`I called …`) is stored as `issuer_kind=untrusted` and is not exec evidence. A chainlock row that claims harness fails verify `HARNESS-ISSUER-FORGED`. Rows with no `issuer_kind` stay legacy and still verify.

## Honesty

Not live until the code is deployed and AZBot clears it. The witness repo is not updated by this change. Receipts stay hash-linked and sealed, not signed. Cap-7 is not ICANN. Paid satellite stays HELD.
