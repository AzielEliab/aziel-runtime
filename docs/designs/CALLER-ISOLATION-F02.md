# Caller isolation (audit F02)

Author: **Aziel Eliab** only. Lamb Lens. NO-LIE.

This is the public-demo vs private-workspace contract for AZHub and AZInterface. It is not an OAuth IdP, not a DOI, not a Framagit claim, and not a Glama UUID. `confirm:true` is **not** authentication. A client-supplied `owner` / `workspace_id` / `caller` string is **not** authorization.

## Contracts

| Contract | Who | State | Isolation |
|----------|-----|-------|-----------|
| **public-demo** | Unauthenticated HTTP, MCP, UI FragGate call | Shared isolate singleton `public-demo` | Shared and **labeled**. Not a private workspace. |
| **private-workspace (operator)** | Valid `Authorization: Bearer` / `X-Aziel-Runtime-Token` matching `RUNTIME_TOKEN` | `ws_operator_<hash>` | Isolated from public-demo. Shared among holders of that same operator token. |
| **private-workspace (session)** | Authenticated `runtime_session` or FragGate `session_id` that already exists | `ws_sess_<session_id>` | Isolated from public-demo, the operator singleton, and every other session. |

Public FragGate call **stays open**. It does not mutate a private workspace. Session mutate remains token-gated when `REQUIRE_TOKEN=1` and `RUNTIME_TOKEN` is set. The same resolver runs on HTTP `POST /v1/fraggate/call`, MCP `fraggate_call`, Worker UI (same HTTP door), and `runtime_session` exec.

## Lifetime

- **public-demo**: ephemeral isolate memory. Restart / new isolate resets it. Shared by every unauthenticated caller on that isolate.
- **private workspaces**: isolate-local and workspace-scoped. This path does **not** claim Durable Object durability for hub modules or interface cycles. Do not describe them as the session receipt chain or the FragGate ledger.

## Same rules

1. Resolve workspace at the common execution boundary (`fraggateCall`, session exec).
2. Never trust `confirm`, `owner`, `workspace_id`, or `caller`.
3. A presented token that does not match `RUNTIME_TOKEN` is `token_mismatch` — it does not fall through into public-demo or another private workspace.
4. A claimed `session_id` without the same auth as session mutate is refused when the token gate requires it.
5. Two private workspaces cannot read or overwrite each other.

## Tests

`scripts/verify-workspace-isolation.mjs` exercises HTTP and MCP entrypoints.

Identity: Aziel Eliab only.
