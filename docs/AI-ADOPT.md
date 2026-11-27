# AI adopt

Compact discovery for assistants that install Aziel Runtime. FragGate stays the single exec door. Softwares stays **42**. MCP `tools/list` is **37**. The extra name is `fraggate_preview` (dry_run only, `readOnlyHint: true`). `fraggate_call` is unchanged. This file does not add a Softwares card.

Person `@id` is `https://www.azieleliab.com/#aziel`.

## Paste this URL

```text
https://aziel-runtime.vibelock.workers.dev/mcp
```

Transport: Streamable HTTP. Pick **No authentication**. There is no OAuth server.

Human steps for ChatGPT, Claude, Grok, Gemini, Cursor, VS Code, and LM Studio: `GET /connect`.

`confirm` is consent to run a call. It is not a login. Session tools and lattice writes that need an operator bearer header are not available from ChatGPT custom MCP. Read-only clients can call `fraggate_preview`. It does not execute.

Slim OpenAPI for GPT Actions (second option, not the custom MCP path): `GET /openapi/adopt-actions.json`.

`/.well-known/mcp` is not an HTML alias. `GET /.well-known/mcp.json` and `GET /.well-known/mcp/server-card.json` are the JSON server card. An HTML page on the bare well-known path would be parsed as that card.

`GET /server.json` is the official MCP registry file. It is served only when version, title, streamable-http URL, and auth none match that origin's server card. A mismatched origin is 404 (`SERVER-CARD-MISMATCH`).

## Doors

| URL | What it is |
|---|---|
| `GET /connect` | Paste-this-URL page. Copy buttons for the MCP URL and the slim OpenAPI URL. Per-client steps. |
| `GET /adopt.json` | Compact card (≤8 KB). Suite tip, first call, client class ids. |
| `GET /openapi/adopt-actions.json` | Slim OpenAPI: Softwares, `POST /v1/fraggate/call`, skill, health. Second option for GPT Actions. |
| `GET /openapi.json` | Full catalog spec. Unchanged. |
| `GET /install/cursor.json` | Cursor `.cursor/mcp.json` paste. `MCP-Protocol-Version: 2025-11-25`. |
| `GET /install/claude-desktop.json` | Claude Desktop remote HTTP MCP. Same protocol header. |
| `GET /install/vscode.json` | VS Code `.vscode/mcp.json`. `type` is `http`. |
| `GET /install/lmstudio.json` | LM Studio `mcp.json`. |
| `GET /install/chatgpt.md` | ChatGPT custom MCP steps, plus GPT Actions as the second option. |
| `GET /server.json` | Registry `server.json` when it matches the live server card. |
| `GET /v1/clients.json` | Client class → transport → snippet URL. Per client `status` is `verified` (with an `evidence` file in this repo) or `unverified`; `transport_status: SERVED` only means this Worker serves the transport (CLIENT-EVIDENCE-1.0). `slot` lists what is not live. `verified_count` stays 0 until real evidence exists. |
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
