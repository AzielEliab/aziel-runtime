# AZRT-ANCHOR-COVERAGE-1.0 — per-refusal anchor, verifier, watchdog, out-of-band dead-man

Author: Aziel Eliab only. Status: **not LIVE**. Additive. Not a Softwares card. Not a new MCP tool. Not a Remain-OFF flip. Not a witness-key change.

Sources: RIB-057, RIB-058, RIB-059, RIB-061, RIB-062, RIB-063. RIB-060 (heartbeat on the same chain) is superseded and is not implemented.

Companion: [AZRT-ANCHOR-1.0](AZRT-ANCHOR-1.0.md). Code: `src/anchor-coverage.js`, `src/receipt-guard.js` (publish after a refusal seal), `scripts/anchor-coverage-outside.mjs`. Tests: `scripts/verify-anchor-coverage.mjs`.

## What this does not change

The runtime still only publishes batch heads at `GET /v1/anchor/heads` and still only reads `AzielEliab/aziel-anchors`. It still has no witness signing key and no write token for that repo. Witness statements stay Ed25519, signed outside. New coverage receipts are hash-linked and sealed, not signed. Old receipts verify unchanged.

Cap-7 and `.aziel` stay names only. Cap-7 is not ICANN and is not the public Internet. Paid satellite stays HELD. Nothing here turns a radio on.

## RIB-057 — per refusal, not per batch

After a `k: "refusal"` row is sealed (not an auth-rollup count), the refusal does not return until `publishRefusalHead` finishes:

- the outside anchor log accepts `(chain: refusals, seq, h)`, first hash wins, or
- the already-verified witness log's refusals head is exactly that seq and hash, or
- the result is `ANCHOR-PENDING` and a `coverage` row `k: "anchor_pending"` is sealed.

`verifyRefusalsSinceBatch` flags a refusal newer than the last batch head that has no outside-log entry (`ANCHOR-PENDING`). A different hash than the log is `ANCHOR-MISMATCH`. Follow rows and auth-rollup rows stay on the batch witness.

The outside log is not the ChainLock writer and is not a signed witness statement. Production leaves the log unset until an outside acceptor is bound, so a refusal seals `ANCHOR-PENDING` rather than inventing a witness line.

## RIB-058 — scheduled verifier

`runCoverageTick` runs from the Worker cron. Each slot of `anchor-verify` (15 minutes) seals one `k: "verifier"` row on the internal `coverage` chain, `result: pass` or `result: fail`. The same slot replays. A slot that never ran stays missing. A miss row does not fill that hole.

## RIB-059 — deadline watchdog

Each check carries its own `every_ms` and `deadline_ms`. After the first verifier row for that check, a slot whose deadline has passed with no verifier row raises `COVERAGE-PAGE` and seals `k: "miss"`. The open slot is not late yet.

## RIB-061 — out-of-band dead-man

`createOutsideShelf` accepts beats only from `outside-watchdog`. `chain-writer` and `runtime` get `DEADMAN-WRITER-REFUSED` and write nothing. `workerHeartbeatAttempt` uses the runtime role. `scripts/anchor-coverage-outside.mjs` reads a heartbeat file and pages on absence. It does not import the ChainLock writer.

## RIB-062 and RIB-063 — kill-to-page

`createWriter().kill` seals a `writer_death` receipt, then the writer is dead (a later verifier slot does not seal). The outside checker pages when the shelf beat is past its deadline. `killToPage` measures the writer-death receipt time to the first named human-ack receipt. `KILL-TO-PAGE-OVER-BUDGET` fails when that gap exceeds the budget even if the page already fired. A human ack is a named seal, not a read receipt.

## Honesty

`live: false` on the status, the rows, and this paper. `GET /v1/anchor/coverage` mints nothing. Calling this LIVE waits on end-to-end outside acceptor plus AZBot CLEAR.
