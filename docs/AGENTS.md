# Aziel Runtime for AI agents

## One-line
Aziel Runtime is a free remote MCP for governed Softwares, library lookup, and receipt-backed FragGate calls. Public connect needs **no API key**.

## Connect (canonical)
- **URL:** `https://aziel-runtime.vibelock.workers.dev/mcp`
- **Transport:** Streamable HTTP
- **Auth for public Softwares / FragGate / library:** none
- **Official MCP Registry:** `io.github.AzielEliab/aziel-runtime` → https://registry.modelcontextprotocol.io/?q=io.github.AzielEliab%2Faziel-runtime
- **Glama:** https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- **Repo:** https://github.com/AzielEliab/aziel-runtime
- **Version:** 2.0.0-rc1

## Access rules (clear public vs sticky)
| Surface | Auth | What it does |
|---|---|---|
| Remote MCP `/mcp` | **None** | `tools/list`, Softwares, `fraggate_list` / `describe` / `call`, `library_lookup`, receipts |
| Glama Install Server (hosted) | Glama account | One-click hosted instance; meters live on Glama, separate from Worker `/v1/uses` |
| Local stdio clone | Local env | Dev / offline via [`cli/mcp-stdio.mjs`](../cli/mcp-stdio.mjs); higher friction — keep **after** the remote URL in docs |
| Future account-scoped tools (watchlists, private mesh) | OAuth if/when added | Must stay optional; never gate the public Softwares door |

Keep Worker `/v1/uses` and Glama hosted-tool meters **separate** in all public copy.

## Start here (two steps)
1. Add the remote MCP URL above in your client (Streamable HTTP, no auth).
2. Call in order: Softwares / `fraggate_list` → `fraggate_describe` with a slug → `fraggate_call` with `confirm: true` when mutating.

## Set up your agent

<details>
<summary><strong>Cursor</strong></summary>

Add to MCP config (merge with existing servers):

```json
{
  "mcpServers": {
    "aziel-runtime": {
      "url": "https://aziel-runtime.vibelock.workers.dev/mcp"
    }
  }
}
```

Or open Glama Install: https://glama.ai/mcp/servers/AzielEliab/aziel-runtime

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```sh
claude mcp add --transport http aziel-runtime https://aziel-runtime.vibelock.workers.dev/mcp
```

</details>

<details>
<summary><strong>Claude / Cowork / Desktop</strong></summary>

Customize → Connectors → + → Add custom connector  
Name: **Aziel Runtime**  
URL: `https://aziel-runtime.vibelock.workers.dev/mcp`  
Auth: leave unset for public tools.

</details>

<details>
<summary><strong>Codex</strong></summary>

```sh
codex mcp add aziel-runtime --url https://aziel-runtime.vibelock.workers.dev/mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.aziel-runtime]
url = "https://aziel-runtime.vibelock.workers.dev/mcp"
```

</details>

<details>
<summary><strong>ChatGPT (developer mode)</strong></summary>

1. Enable developer mode if available.
2. Add a custom MCP plugin named **Aziel Runtime** with URL `https://aziel-runtime.vibelock.workers.dev/mcp` and no authentication.
3. Enable it in the conversation and try Softwares / `fraggate_list`.

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Merge into `settings.json`:

```json
{
  "mcpServers": {
    "aziel-runtime": {
      "httpUrl": "https://aziel-runtime.vibelock.workers.dev/mcp"
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP clients</strong></summary>

Any client that supports remote Streamable HTTP:

```text
https://aziel-runtime.vibelock.workers.dev/mcp
```

No API key for the public surface.

</details>

## First calls that should work
- Softwares / `fraggate_list` — see catalog slugs
- `fraggate_describe` with `name: "decisiongate"` (or `forgereceipts`)
- `library_lookup` — search Aziel Digital Library papers / cites
- `fraggate_call` dry paths with `confirm: true` only when you mean it

## What not to lead with (on cards)
Avoid opening with: node-meshed, orchestration suite, gated entry point. Lead with free remote MCP + Softwares through one FragGate door + receipts.

## Badges (README / discovery repo)
```markdown
[![Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime/badge)](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)
<!-- mcp-name: io.github.AzielEliab/aziel-runtime -->
```
