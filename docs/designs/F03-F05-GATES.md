# F03–F05 gates (audit 2026-09-17)

Author: **Aziel Eliab** only. Lamb Lens is fabric after FragGate. NO-LIE.

Not an OAuth IdP. Not a DOI. Not a Framagit claim. Not a Glama UUID. Not . No MCP tool added, removed, or renamed. FragGate remains THE single door.

## F03 — Rate limits / body limits / deadlines

Session mutate already had isolate windows (`session_open` / `session_exec` / `anon_mutate`). That did **not** cover the public door.

Covered now:

| Path | Scope | Default / minute |
|------|-------|------------------|
| `POST /v1/fraggate/call` | `fraggate_call` | 240 |
| other `/v1/fraggate*` | `fraggate_read` | 360 |
| `POST` / `DELETE /mcp` | `mcp` | 240 |
| `POST /v1/mesh/join\|heartbeat\|leave\|broadcast` | `mesh_mutate` | 30 |
| `POST /v1/memory/*` | `memory_mutate` | 60 |
| session open / exec (unchanged isolate) | `session_open` / `session_exec` | 20 / 60 |

Honest refuse: `RATE_LIMIT` (HTTP 429) with `Retry-After`. `enforcement` is `durable-object` when `RATE` (RateQuota Durable Object, one object per `bucket:ip`) is bound, else `isolate`. Isolate is not a global quota.

Body: `BODY_TOO_LARGE` (413) before parse at 256 KiB. JSON structure: `BODY_TOO_DEEP` (400) when depth > 12 or nodes > 4096.

Deadline: `REQUEST_DEADLINE` (408). Default 25s (`REQUEST_DEADLINE_MS` may lower it). Not a second door.

## F04 — Security headers

Every Worker response (HTML, JSON, text, XML, product homepage `/p/{slug}`, OPTIONS, MCP 204) carries:

- `Content-Security-Policy` — HTML allows the existing inline style + FragGate door script (`unsafe-inline`). API is `default-src 'none'; frame-ancestors 'none'`.
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

Honest: HTML CSP is not a nonce lock. The door script stays inline.

## F05 — Ledger durability labels

`GET /v1/ready`, `GET /v1/fraggate` (+ list), and `GET /v1/mesh` publish `durability`:

| Store | Durable commit |
|-------|----------------|
| FragGate ledger public window | **Ephemeral window, cap 64.** Worker commit is CHAINLOCK when bound. Not a public Q×act ledger. |
| ChainLock stamps | CHAINLOCK Durable Object when bound. |
| Runtime sessions | SESSION Durable Object when bound (TTL 6h, receipt cap 64). |
| MemoryStore | **Never durable.** In-process isolate memory only. |
| AKM memory | Derived belief. Not a durable commit. Posterior ≠ truth. |

`ledger_tip` carries `window_cap: 64`, `ephemeral_window: true`, `memory_store_is_durable: false`.

## Tests

`scripts/verify-f03-f05.mjs`

Identity: Aziel Eliab only.
