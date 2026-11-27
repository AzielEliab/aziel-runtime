# AZRT-X-REPLY-POLICY-1.0

Author: Aziel Eliab only.

Status: DRAFT. Not a certification claim. Not a new MCP tool. Softwares stay 42. `tools/list` stays 36.

Cap-7 is not ICANN. Paid satellite stays HELD. Remain-OFF stays refused. This plane does not mint a signing key.

Receipts are hash-linked and sealed, not signed.

---

The Nov 6–19 reply ideas sit on the doors that already exist: session `recordIntent` / `commitExec`, MCP `guardToolCall`, FragGate `fraggateCall`, and ChainLock `append`.

1. **Agent attribution** (`@SiuHarry202601`, `@TheEdgeMasterAI`). A tool-call receipt and a refused-call receipt hash `agent_id`, `caller_identity`, and `issuer_kind`. The canonical identity is `issuer_kind:agent_id`. `issuer_kind` is `agent`, `peer`, or `runtime`. A caller-minted `harness` label is forged. A missing field, a mismatch with the bound agent, or a bad canonical string refuses the call. The session sealer's own `issuer_kind` stays `harness` (RIB-051). The caller class is the attribution block.

2. **Pre-action hooks** (`@iveyzen`). Hooks run in `(order, id)` order before the action. A refusal or a thrown hook stops the action. Each decision is an append-only hash-chained row. Rewrite and clear return `HOOK-LOG-IMMUTABLE` or `GUARDIAN-AUDIT-REFUSED` and leave the rows in place. The action receipt stores `hook_tip`.

3. **Write-ahead limits** (`@0xAlphana`). The increment, and the cooldown when one is set, are journaled before the gate returns allow. A wiped `memoryCount` still replays the journal, so a crash or a retry cannot reopen the window. A failed journal write refuses the action and leaves the journal unchanged.

4. **MCP policy refresh** (`@RusticStack`). A refresh that throws, returns invalid data, or is past its TTL refuses gated calls. The previous policy is dropped on failure. `allow_all` is invalid. A stale allowlist is not reused.

5. **Runtime MCP / peer trust** (`@Cipher0ps_tech`). A dynamically loaded manifest is untrusted until its digest matches a pin and every capability is on the allowlist. A missing pin, a drifted digest, or an extra capability refuses the load. The public static `tools/list` is unchanged.

6. **Guardian** (`@dipenvaja`). A write or op that truncates, overwrites, clears, disables, or resets the audit log, the receipt log, or guardian policy is refused before the write. A refusal receipt is sealed. The earlier rows stay. ChainLock `append` returns `GUARDIAN-AUDIT-REFUSED` and does not grow the chain.

Public calls that present none of these fields keep the existing door. A presented identity, a bound agent, a runtime manifest, an installed policy cache, a write-ahead limit, or an audit-clearing op turns the plane on, and then it fails closed.

Verify: `node scripts/verify-x-reply-policy.mjs`.
