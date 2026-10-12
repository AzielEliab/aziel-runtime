# LATTICE-LEARN-1.0: the memory path learns from lattice growth

Author: Aziel Eliab. Status: built, not marked live until it is observed on production rows.

Law docs cited: LEDGER-LATTICE-1.0 (src/dual-lattice.js, PR 256: primary and secondary chains),
REMAIN-OFF-BY-DESIGN-2026-09-10.md (nothing here enables a Remain-OFF item), and the FragGate
single-door rule (this is a `memory` op, so it goes through FragGate; there is no new MCP tool, and
tools/list stays at 36 and Softwares at 42).

## What it does
`memory` op `lattice-learn` with `{chain}`:
1. It reads the forward-only cursor `RUNTIME_KV lattice-learn:cursor:<chain>`.
2. It pages rows after the cursor through `anchor.pageRows`, which recomputes the hashes and checks the links.
3. It takes the last row that has a lattice block and runs `observe` with subject `lattice:<chain>`
   and the fact `seq=<n> p=<primary16> s=<secondary16> n=<new rows>`.
4. The cursor moves only after the observation succeeds, and only forward.

## Fail closed
These refuse with `written:false`: a bad chain, an unbound KV or store, a broken page, a head behind the
cursor, or a cursor that another writer moved past this page. Verified legacy rows without a lattice
block move the cursor forward and are not observed, so a long legacy prefix cannot stall learning. `dry_run` previews and does not write.

## Append-only
It only adds observations. It never supersedes, revokes, rewrites or deletes. The receipt schema is unchanged.

## Scheduled run (additive)
On each existing cron tick (`*/2` and `1-59/2`), `scheduledLatticeLearn` runs `lattice-learn` through the
memory door on three chains, rotating by the minute. It adds no new cron. Errors are logged and swallowed, so they
never block the tether, AZNews or mesh work.

## RECEIPTS-LATTICE-TIP-1.0 (additive)
`GET /v1/receipts` and `/v1/receipts/tip` gain a `lattice_tip` block: the runtime's own ChainLock primary
and secondary tips for each chain. The corpus act-receipt `tip` field is untouched, and an empty corpus tip still
does not count as success. An unbound store or a 2.5s timeout gives `ok:false` with no tips.
