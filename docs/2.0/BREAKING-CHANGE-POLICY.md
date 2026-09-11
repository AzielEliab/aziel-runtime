# Breaking-change policy — Aziel Runtime 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only

2.0.0-rc1 **freezes** the public contract documented in this directory. After this freeze, a **breaking change requires a future major** (`3.0.0` or later). Patch and minor releases (`2.0.x`, `2.1.x`) must not break the frozen surface.

This rc itself is **not** `2.0.0` final. Cutting the final tag is a coordinator step after gates 1–4 artifacts land and gate 5 (outside use) is proven operationally.

---

## What is a breaking change

Any of the following, once 2.0.0 is cut (and already treated as frozen for this rc):

1. **Removing or renaming** a name in `PUBLIC_MCP_TOOLS`.
2. **Adding** a public MCP tool without a minor that is explicitly documented as additive **and** still ≤ `PUBLIC_MCP_TOOL_MAX` (40). Adding a tool that changes the required list → describe → call flow, or re-introducing flat `{slug}_{op}` names, is breaking.
3. Changing MCP `initialize` `protocolVersion`, `serverInfo.name`, or `capabilities.tools.listChanged`.
4. Changing FragGate HTTP paths (`/v1/fraggate`, `/v1/fraggate/list`, `/v1/fraggate/describe`, `/v1/fraggate/verify`, `/v1/fraggate/call`, `/v1/fraggate/software`) or making public `fraggate_call` token-gated.
5. Changing authority snapshot identity fields (`product`, `name`, `author`, `identity`, `role`, `door`) or making `version` / `engine_slugs` diverge across `/v1/health`, `/v1/ready`, `/v1/runtime.json`.
6. Changing session receipt `kind` (`aziel-runtime.receipt`), hash algorithm, or signed-field set such that `verifyChainStrict` on an old chain fails.
7. Changing FragGate accept/refuse envelope required fields (`ok`, `code`, `door`) or recycling a refuse code to mean success.
8. **Enabling** any Remain-OFF item, or turning a frozen refuse code (`FG-STUB`, `FG-HALLUC-TOOL`, `MESH-NEED-BEARER`, `QNS-NO-PROXY`, `4DM-TRUTH-REFUSE`, `AIH-AUTO-UNLOCK-REFUSE`, `AKM-OPERATOR`, `RC-NO-ROLLBACK`, …) into `FG-OK`.
9. Treating `/p/{slug}/{op}` as exec, or `/v1/mesh` GET as an enable.
10. Replacing `RUNTIME_ABSTRACT` / `RUNTIME_ONE_LINE` crawler lead copy with a changelog mash.
11. Changing public identity away from **Aziel Eliab** only.

---

## What is **not** breaking (2.x additive / honesty)

- New **engine ops** on an existing slug that stay off `PUBLIC_MCP_TOOLS` and are reached only via `fraggate_call` (still a 2.1+ product decision; this rc adds none).
- New Softwares engines — deferred to **2.1+** by this freeze; adding one is a **minor** if MCP tool names and FragGate flow stay intact, and a **major** if it requires a new public door.
- Honest binding-gated refuse when `BROWSER` / `CORPUS_D1` / `AI` is unbound.
- Additional `version_history` rows **below** the abstract.
- Enriched listing metadata that does not change MCP/OpenAPI semantics (`glama.json` keywords already landed on 1.9.3).
- Tightening a refuse (more specific code, same `ok: false`) as long as previously-refused verbs stay refused.

---

## How to break (when a major is actually required)

1. Write the new contract under `docs/<major>/` **before** shipping behavior.
2. Bump `RUNTIME_VERSION` / `package.json` to that major.
3. Keep 2.x refuse codes in a compatibility appendix for at least one major.
4. Do not silently remap old MCP names.

Until then: **do not break 2.0.0-rc1.**
