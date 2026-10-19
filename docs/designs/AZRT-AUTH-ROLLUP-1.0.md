# AZRT-AUTH-ROLLUP-1.0: login and token refusals as one count-only rollup receipt per minute

Author: Aziel Eliab only. Status: **BUILT, not deployed** (additive). Addendum to AZRT-REFUSAL-RECEIPT-1.0.
Code: `src/auth-rollup.js`, the additive `incr` op in `src/durable-kv.js`, two hooks in `src/index.js`
(fetch wrapper and cron). Tests: `scripts/verify-auth-rollup.mjs`.

## Why

RIB-018 left auth-gate refusals unrecorded on purpose and left the call to the user. A row per failed
login would be a flood door, and it would become a log of who tried which token. The user's decision is
to record them as **one rollup receipt per minute per door + code, a count only**.

## Laws

| Law | How this fits |
|---|---|
| docs/2.0/PUBLIC-CONTRACT.md | No route, tool or field is removed. tools/list stays 36, Softwares 42, version 2.0.0-rc1. |
| docs/2.0/COMPATIBILITY-POLICY.md, BREAKING-CHANGE-POLICY.md | Additive only: one response header, one new row kind on an existing internal chain, one new KV op. |
| docs/2.0/REFUSAL-CONTRACT.md | Auth refuse codes, statuses and bodies are unchanged. §5d lists the header and the one new row code. |
| docs/2.0/RECEIPT-SCHEMA.md | Rows use the existing refusal receipt shape. The new fields (`kind`, `rollup_spec`, `count`, `count_capped`, `minute`, `window_s`, `combos`) are additive. |
| AZRT-REFUSAL-RECEIPT-1.0 (+ #301 follow-up) | Rows are written through the same `sealRefusal` (internal writer, `refusals` chain). `reason: null` plus `reason_sha256` of a fixed reason from code. No caller text. |
| AZRT-DUAL-LATTICE-1.0 | Every row is a ChainLock stamp, so it carries both lattice hashes. The test checks them and `verify {c:"refusals"}`. |
| AZRT-AZOS-TETHER-1.0 / TETHER-REFUSALS | The refusals chain already goes to AZ-OS, so rollup rows travel with it. Nothing new here. |
| FragGate single door | Nothing executes. The counter is a side effect of a refusal that already happened. |
| NO-LIE-NO-REWRITE | Append-only. If a seal fails, the minute is retried with the same idempotency key, so it never produces a duplicate or invented row. |
| REMAIN-OFF | Nothing is enabled. The rollup only runs where RUNTIME_KV and CHAINLOCK are already bound. |

## Design

1. **Count.** The fetch wrapper runs after the door refusal wrapper, for any response with status >= 400
   that is not 429. If the body code (or a bare 401) maps to a fixed rollup code, it adds 1 to
   `authroll|c|<minute>|<door>|<code>`. That counter lives in the RUNTIME_KV Durable Object, where the new
   additive `incr` op is atomic (input gate). It is capped at 100,000 and expires after 6 h. When a
   counter is first created, it sets the marker `authroll|m|<minute>`.
   - Door and code always come from fixed lists. The session doors are split by action (open, exec,
     stale, revoke, pause, resume, close), so stale-token, revoked-token and paused refusals are visible.
   - Codes not on the list fold into `TOKEN-OTHER` or `HTTP-401-AUTH`.
2. **Coalesce.** Each isolate keeps at most one counter call in flight per key. Hits that arrive
   meanwhile are summed into the next call. At most 256 keys can be pending per isolate; beyond that the
   header says `rate_limited`.
3. **Seal.** Every cron tick (every minute) looks at closed minutes: the current minute minus 2, up to
   10 minutes per tick. For each minute it seals one row per (door, code) with count > 0:
   `refusal { kind:"auth_rollup", rollup_spec, code, door, count, count_capped, minute, window_s:60,
   reason:null, reason_sha256 }`.
   - **Own cap:** at most 8 rows per minute. Everything past that is summed into one
     `AUTH-ROLLUP-OVERFLOW` row with `combos`. That is at most 9 rows a minute, whatever the attack rate.
   - The minute is marked done (and its counters deleted) only when every row sealed. Otherwise the
     next tick retries.
   - **Own share in the writer cap (AZBot B307-1).** Rollup rows spend a reserved `rollup` share of
     **9 rows/min** in the ChainLock writer's refusal cap (`REFUSAL_CAP.classes.rollup`), outside the REST
     240, so a flood that fills the REST share can't starve the flush. The writer total becomes 609
     (240 + 240 + 120 + 9). Only rows the runtime itself builds (`surface:"runtime"`, `kind:"auth_rollup"`,
     `tool:"auth-rollup"`) use this share; a REST door row or a peer report can't claim it.
   - When the share is spent in a wall-clock minute (backlog after an outage), the tick stops; the
     oldest pending minute goes first on the next tick. Replays of rows already sealed are free.
4. **Response.** The status and body are unchanged. One header is added:
   `X-Azrt-Auth-Rollup: counted|pending|unavailable|rate_limited; ...`. Counting waits at most 300 ms;
   after that it finishes in `waitUntil` and the header says `pending`.

## Privacy

Rows hold no IP, no caller id, no token or token hash, no route text and no body text. The test sends a
real token, a wrong token and a `CF-Connecting-IP`, then checks that none of them appear anywhere in the
chain.

## Honest limits

- The count covers what reached this Worker's fetch handler. Requests that Cloudflare rejected earlier,
  and 429s from the auth rate limiter, are not counted. (A 429 is its own refusal and stays plain, as before.)
- If RUNTIME_KV is unbound, nothing is counted and the header says `unavailable`. If counters expire
  (6 h) before a seal succeeds, that count is lost. The cron log shows it. Ways that can happen:
  - a store or writer outage of more than 6 h;
  - a backlog: the 9/min rollup share seals at most one full minute (9 rows) per wall-clock minute, so
    after an outage it catches up only in minutes that need fewer than 9 rows. Under a sustained flood
    that fills 9 rows every minute, a backlog does not shrink, and minutes older than 6 h are lost.
  The REST share being full is no longer a way to lose counts (own share, test group 11).
- `pending` counts are added after the response. If the isolate dies before the counter call, that count
  is lost. A `pending` increment that lands after its minute was already sealed (later than the 2 min
  grace) is not sealed either. The row is a lower bound and never an overcount.
- The body code is read from at most 64 KB, also while streaming a body with no content-length; past
  that the code comes from the status alone (`HTTP-401-AUTH`). The client still gets the whole body.
- OpenAPI: `#/components/headers/X-Azrt-Auth-Rollup`.
- `SESSION-PAUSED` on `/exec` still also writes its own `refused` receipt on the session chain (RIB-018).
  The rollup is a separate count.
- `/v1/receipts/refusals` lists rollup rows like other refusal rows. Its `not_recorded` text, which says
  auth refusals are not recorded one by one, stays true.
- This is a PR, not a live claim. It is not deployed.
