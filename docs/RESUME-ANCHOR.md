# AZRT-RESUME-ANCHOR-1.0 — anchor-gated resume (RIB-044)

Idea: @Madeactual. Author: Aziel Eliab.

## Freeze
- `POST /v1/session/{id}/pause` appends a `freeze` receipt with `freeze_head {chain:"session:<id>", seq, hash}` pointing at the row before it. The session's freeze head is then the freeze row itself. The session stays paused until it is resumed, and exec returns `SESSION-PAUSED` (409) in the meantime.
- `POST /v1/session/{id}/close`: the close receipt is the freeze row. A receipt can't contain its own hash, so its head is recorded in `session.freeze` and in the queued stamp, not inside the close row.
- The freeze head is queued as a stamp on the ChainLock `session` chain, with fact `AZRT-RESUME-ANCHOR-1.0 freeze session:<id> seq=<n> h=<hash>`. The witness (AzielEliab/aziel-anchors) already anchors ChainLock chain heads, so the next witness statement covers it. aziel-anchors needs no change, and the runtime still has no write path to the witness log.

## Resume
`POST /v1/session/{id}/resume`, and the first exec in a cold isolate for every session (frozen or not):
1. Freeze truth. With CHAINLOCK bound, the freeze head comes from the session-keyed ChainLock index `resume-anchor|session:<id>` (written in the ChainLock store at freeze time, naming the newest freeze stamp) and the stamp row it names, which must recompute and name this session with the same seq and hash. Without CHAINLOCK, it comes from the chain's own last `freeze`/`close` row. `session.freeze` and `session.paused` live in session storage and are only cross-checked against that truth.
   - CHAINLOCK bound and `session.freeze.queue` missing or `queued:false` → `RESUME-ANCHOR-MISMATCH`.
   - A freeze row in the chain, or an index entry in ChainLock, with `session.freeze` missing → `RESUME-ANCHOR-MISMATCH`. Strict resume never accepts `no_freeze`.
   - Sealed resume refusals are the only rows allowed between the freeze and the resume. Each one has a fixed shape: payload is only `{refusal}` with exactly `{spec, code, status, op, executed, resume}`, code `RESUME-ANCHOR-MISMATCH` or `RESUME-ANCHOR-NOT-CHECKED`, `executed:false`, `resume = {spec, freeze_head, reason}` with `freeze_head` equal to this freeze head, canonical size at most 2 KB, and at most 16 such rows. With CHAINLOCK bound, each sealed refusal's hash is also recorded in the ChainLock index entry (`refusals[]`) while paused, and the refusal rows after the freeze must equal that list exactly. Without CHAINLOCK, only the shape and caps apply.
   - The index must name the newest freeze stamp for this session: the ChainLock `session` rows after it are scanned (at most 256) for a newer stamp naming `session:<id>`, which is `RESUME-ANCHOR-MISMATCH`. If more than 256 rows follow, the scan is incomplete and the level is `not_checked` (strict refuses).
   - Paused: the receipt count must equal the freeze seq plus the indexed refusals exactly. Not paused: the rows after the freeze must start with a `resume` receipt naming this freeze head. Closed: no rows after the close row.
2. Recomputes the session chain and requires the row at the freeze seq to still have the freeze hash.
3. A changed row, a missing tail, a broken recompute, or an altered or missing queued stamp refuses with `RESUME-ANCHOR-MISMATCH` (409) and seals a `refused` receipt.
4. Witness coverage: `anchor.level = "witnessed"` only when the newest witness statement covering ChainLock `session` reaches the freeze stamp and every ChainLock row from the freeze stamp up to the witnessed head recomputes and links by `prev` (bounded walk, 256 rows; past that it is `not_checked`). A broken link is `RESUME-ANCHOR-MISMATCH`. Otherwise it is `anchor.level = "not_checked"` with a reason. That is never a pass.
5. Strict mode (policy `resume_strict:true` or body `strict:true`) refuses `RESUME-ANCHOR-NOT-CHECKED` unless the level is `witnessed`.
6. A successful resume appends a `resume` receipt that records the anchor level.

## Trust model: attacks that needed session storage only (AZBot review of #291, now closed)
Three attacks needed write access to session storage only, not the ChainLock store. All three are now closed and each has a regression test in `scripts/verify-resume-anchor.mjs`:
- **A.** Setting `session.freeze.queue.queued=false` (or deleting the queue) and truncating gave a non-strict resume `200 not_checked`. Closed: with CHAINLOCK bound a missing or unqueued freeze queue is `RESUME-ANCHOR-MISMATCH`, and the freeze head comes from the session-keyed ChainLock index.
- **B.** Deleting `session.freeze` and setting `paused=false` gave `200 no_freeze`, even in strict mode; truncating the freeze row too also passed, and a cold exec returned 200. Closed: the freeze is read from the ChainLock index (or the chain's own freeze row), a missing `session.freeze` is `RESUME-ANCHOR-MISMATCH`, cold exec checks every session, and strict never accepts `no_freeze`.
- **C.** A row appended while paused passed, because resume only checked that the frozen rows were still there. Closed: a paused session must have exactly the freeze seq rows, and an unpaused one must have a `resume` receipt right after the freeze.

- **Review 2.** A made-up `refused`/`op:resume` row (even carrying 5 KB) appended while paused passed, using session storage only. Closed: strict shape and caps, and with CHAINLOCK the refusal hashes must equal the index list. Pointing the index at an older stamp and rolling the session back is closed by the newer-stamp scan.

## Honest limits
- Without CHAINLOCK, a forged refusal row with the exact allowed shape (at most 16, 2 KB each, no exec content) is accepted; it cannot carry an action.
- Without a CHAINLOCK binding, the freeze truth is the chain itself, so someone with session storage only can still delete the freeze row together with everything after it and `session.freeze`; that session then looks never frozen. With CHAINLOCK bound that is caught by the session-keyed index.
- Before the next witness run (cron about every 15 minutes), resume is `not_checked`. The local checks (freeze head versus the ChainLock row versus the chain) still apply.
- Someone who controls both the session DO storage and the ChainLock store before the witness runs can rewrite both consistently. Only a `witnessed` level rules that out.
- Offline export/import resume and reopening a closed session are not built: closed sessions stay sealed. Cold-isolate checking is per DO instance and runs once per isolate.
- Receipts are hash-linked and sealed, not signed. Witness statements are signed by the witness, not by the runtime.
