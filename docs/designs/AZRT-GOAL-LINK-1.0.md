# AZRT-GOAL-LINK-1.0 — the action after a refusal, chained by goal

Author: Aziel Eliab only. Status: LIVE (additive). Sources: @asmirkn (2026-10-09): "log what an agent does right after a refusal; a retry links back to the refusal receipt" and "key retry links on the agent's goal, not the call, so a route through another tool or account still chains".

Goal key: the caller's `goal_id` (1–80 of `[A-Za-z0-9._:-]`) → `goal:<id>`; else derived from the MCP `Mcp-Session-Id` → `mcp:<sha256 prefix>`; else none. `goal_id` is not a call shape: the same id on a different tool, slug, op or account chains.

- A refusal with a goal key leaves a pointer in the `refusals` ChainWriter (`goal:<key>`, DO storage).
- The next call with that goal key, through any tool, within one hour: if it is refused again, the new refusal's `follows` names the previous one; otherwise the runtime seals a `k: "follow"` stamp (`follows {h, seq, k, args_digest}`, outcome) and returns `follows_refusal` on the result. The pointer is then consumed (one follow per refusal).
- FragGate ledger rows written during that call carry the additive `goal_key`.

Honest limits: a derived key only spans one MCP session. Chaining across accounts or sessions needs the agent to send the same `goal_id`; the runtime cannot read an agent's intent it was not given. `goal_id` is a label, not auth, and never skips FragGate.

Law fit: additive fields only, existing `request_id` / `parent_receipt_id` attempt links (RIB-005) unchanged, no new tool, append-only.
