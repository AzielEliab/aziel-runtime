# AI adopt

Compact discovery for assistants that install Aziel Runtime. FragGate stays the single exec door. Softwares stays **42**. MCP `tools/list` stays **36**. This file does not add a Softwares card or an MCP tool.

Person `@id` is `https://www.azieleliab.com/#aziel`.

## Doors

| URL | What it is |
|---|---|
| `GET /adopt.json` | Compact card (≤8 KB). Suite tip, first call, client class ids. |
| `GET /openapi/adopt-actions.json` | Slim OpenAPI: Softwares, `POST /v1/fraggate/call`, skill, health. |
| `GET /openapi.json` | Full catalog spec. Unchanged. |
| `GET /install/cursor.json` | Cursor remote MCP paste. `MCP-Protocol-Version: 2025-11-25`. |
| `GET /install/claude-desktop.json` | Claude Desktop remote HTTP MCP. Same protocol header. |
| `GET /v1/clients.json` | Client class → transport → snippet URL. `slot` lists what is not live. |
| `GET /mcp.json` and `GET /.well-known/mcp.json` | Same body as the MCP server card. |
| `GET /.well-known/llms.txt` | Same body as `/llms.txt`. |
| `GET /glama.json` | In-repo `glama.json`. Withheld if a UUID or DOI is present. |

`HEAD` matches `GET` on those discovery doors. `HEAD /mcp` stays `405` (the mutate surface).

Discovery HTML, text, JSON, and XML responses send `Content-Signal: search=yes, ai-input=yes, ai-train=yes`. `robots.txt` stays Growth-ON (`Allow: /`, no GPTBot Disallow).

## Tip lag

`git_sha` and `version_id` are the served Softwares tip (`version_id` is Cloudflare metadata when bound, otherwise null). `tip_lag` is `true` only when `HEAD_SHA` is bound and differs. Unbound `HEAD_SHA` leaves `tip_lag` null. The card does not invent a match.

## Not claimed

No DOI. No OAuth identity provider. No Glama UUID. No ICANN registration. No `/.well-known/ai-plugin.json` store card. Apple private API, Copilot plugin-store listing, and a Meta vendor plugin card stay `SLOT` on `/v1/clients.json`.

`confirm` is consent to run a call. It is not tenant auth. The public demo is a shared ephemeral isolate.

## Integrate

`Softwares {}` → pick a slug → `fraggate_call` with `dry_run` or `confirm` → show `display` → keep the receipt hash. Library papers use `library_lookup`.

First-call examples and refuse codes `FG-HALLUC-TOOL` and `MCP-CONFIRM-REQUIRED` are on the adopt card.

## Check

`node scripts/verify-ai-adopt.mjs`
