# Glama listing — aziel-runtime

Aziel Runtime lets AI assistants run 40+ research tools through one door. Install on Glama, then list tools, describe one, and call it. Every call can leave a receipt.

Public identity: **Aziel Eliab** only.

## How to use

1. Click **Install / Add to Glama** on https://glama.ai/mcp/servers/AzielEliab/aziel-runtime (also `https://glama.ai/mcp/servers/@AzielEliab/aziel-runtime`).
2. In any MCP client, call the tool you need. The door runs first, then the tool. `confirm=true` writes. `dry_run=true` previews and writes nothing. `background=true` returns Running until a receipt hash exists. Done only with that hash. `tools/list` stays 36.

Diagnostics, if needed: `fraggate_list` → `fraggate_describe {name}` → `fraggate_call {name, op, payload, confirm:true}`.

Worker remote: `https://aziel-runtime.vibelock.workers.dev/mcp`

Example first call: `decisiongate_check` with a short proposal and `dry_run:true`, or `forgereceipts` receipt for a completed task.

MCP `tools/list` is **36** tools. FragGate is the single door. Deeper admin, Docker, and local stdio stay below. Install order stays Install Server, then the remote Worker, then local stdio last.

**[Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)** is the primary public host / discovery / install listing for aziel-runtime (also `https://glama.ai/mcp/servers/@AzielEliab/aziel-runtime`). Worker origin stays the HTTP / OpenAPI / MCP execution surface.

**Glama release 2.0.7** is Glama's Install Server release (Deploy Success, Install Server ON, Auto-Release ON). **Worker / server package stays 2.0.0-rc1** (`package.json`, `glama.json` `version`, MCP `serverInfo.version`). Those are different numbers.

Glama is one of the compatible AI clients (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants). See the README **Compatible AI clients** section.

## Install order

1. **Install Server (live)** — one-click Install Server / Deploy on [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime).
2. **Remote MCP** — `POST https://aziel-runtime.vibelock.workers.dev/mcp` (`initialize`, `tools/list`, `tools/call`). User-Agent `Mozilla/5.0`. Public, no OAuth.
3. **Local stdio (last)** — `node cli/mcp-stdio.mjs` / `npm run mcp` / Docker. The CLI bridges to the Worker `/mcp`.

**First call:** `@aziel-runtime` → `fraggate_list` → `fraggate_describe` → `fraggate_call`. Example: `{ "slug": "foldlock", "op": "fold-preview", "payload": { "text": "the cat and the dog" } }`, or `decisiongate_check` with `dry_run=true`. Show `display.title` and `display.summary`, then take the next input.

`tools/list` is **36 live MCP tools**. Start on the FragGate door. ChainLock and memory are append-only. `runtime_run`, `runtime_manifest`, and `runtime_session_*` are advanced/internal.

This repo ships:

| File | Role |
|------|------|
| [`glama.json`](../glama.json) | Claim file. Schema requires `maintainers` (GitHub username `AzielEliab`). `version` stays the Worker truth `2.0.0-rc1` (Glama Install Server release 2.0.7 is named in `description`, not as `version`). Description leads with the plain Glama card sentence (40+ research tools, one door, receipt), then FragGate door, receipts, and the 2.0.7 Install Server note. `1.6.2` is superseded heritage. Keywords include mcp, openapi, fraggate, softwares, decisiongate, receipts. |
| [`cli/mcp-stdio.mjs`](../cli/mcp-stdio.mjs) | Stdio MCP server. Default **bridges** to the hosted Worker `/mcp`. |
| [`Dockerfile`](../Dockerfile) | Local / “from Dockerfile” image. Glama admin often **generates** its own image from CMD args — still ship this file. |
| [`src/mcp-stdio.js`](../src/mcp-stdio.js) | Framing + bridge / in-process dispatch. |
| [`docs/GLAMA-TDQS.md`](GLAMA-TDQS.md) | Metadata-only TDQS pass (`tools/list` descriptions, params, annotations, output schemas). Fold into 2.0.0-rc1 Gate 4. |
| [`server.json`](../server.json) | Official MCP Registry metadata. Remotes only. `version` is Worker `2.0.0-rc1`. |

## Discovery

[`server.json`](../server.json) is the official MCP Registry file (schema `2025-12-11`). Registry name `io.github.AzielEliab/aziel-runtime`. `version` is **2.0.0-rc1**, the same string as `package.json` and Worker health. Remote is `streamable-http` at `https://aziel-runtime.vibelock.workers.dev/mcp`. `websiteUrl` is the Glama listing.

There is no `packages` entry. `package.json` is `private`, so this file is remotes-only.

Glama Deploy / Install Server release **2.0.7** is a Glama label only. It is not `server.json` `version`.

The registry `description` keeps the same claims as the longer sentence (governed MCP, agent audit, provenance, deterministic checks, receipt-backed FragGate execution). The 2025-12-11 schema caps `description` at 100 characters, so the filed string is that sentence trimmed to fit.

`mcp-publisher publish` is out of band (GitHub device login). This repo lands the file. It does not run the publisher. `tools/list` stays 36 names.

## Why stdio

Glama wraps the process with `mcp-proxy` and talks MCP on stdin/stdout (newline-delimited JSON-RPC, same as `@modelcontextprotocol/sdk` `StdioServerTransport`). HTTP `POST /mcp` stays the Worker API; this CLI forwards `initialize`, `tools/list`, `tools/call`, `ping`, and notifications so the tool list is not duplicated. `tools/list` is 36 live MCP tools. First call is `fraggate_list` → `fraggate_describe` → `fraggate_call`.

## Run locally

```bash
node cli/mcp-stdio.mjs
npm run mcp
# or, after npm link / install:
aziel-runtime-mcp
```

Optional:

```bash
# point at another Worker
AZIEL_RUNTIME_URL=https://aziel-runtime.vibelock.workers.dev node cli/mcp-stdio.mjs

# in-process Worker /mcp (vendored engines; no hosted hop)
node cli/mcp-stdio.mjs --local
AZIEL_RUNTIME_MCP=local node cli/mcp-stdio.mjs

# when REQUIRE_TOKEN=1 on the Worker (session mutate only; public FragGate call stays open)
RUNTIME_TOKEN=… node cli/mcp-stdio.mjs
```

Stdout is MCP only. Logs go to stderr.

Claude Desktop / Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "aziel-runtime": {
      "command": "node",
      "args": ["cli/mcp-stdio.mjs"],
      "cwd": "/path/to/aziel-runtime",
      "env": {
        "AZIEL_RUNTIME_URL": "https://aziel-runtime.vibelock.workers.dev"
      }
    }
  }
}
```

## Docker

The default CMD **bridges** to `https://aziel-runtime.vibelock.workers.dev/mcp`.
The container needs **outbound DNS + HTTPS** to `*.vibelock.workers.dev` /
Cloudflare. If the host resolver is blocked, pass a public resolver
(`docker run --rm -i --dns 1.1.1.1 aziel-runtime-mcp`). DNS failure is
`FG-DNS` (`remote:false`) — not a FragGate receipt and not a silent
`--local` fallback.

```bash
docker build -t aziel-runtime-mcp .
docker run --rm -i aziel-runtime-mcp
```

Optional token / URL:

```bash
docker run --rm -i \
  -e AZIEL_RUNTIME_URL=https://aziel-runtime.vibelock.workers.dev \
  -e RUNTIME_TOKEN \
  aziel-runtime-mcp
```

## Glama admin — re-claim

Install Server and Auto-Release are already ON (Glama release 2.0.7). After a `glama.json` change lands on `main`:

1. Open [Score / claim](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime/score) and claim again with `glama.json` maintainers (`AzielEliab`) so Schema and keywords refresh. Git cannot click that button.
2. Open [admin Dockerfile](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime/admin/dockerfile). Glama generates a container (it does not have to use this repo’s `Dockerfile`). Fill:
   - **Build steps:** `["npm install --omit=dev"]` (or `npm ci --omit=dev` if a lockfile exists)
   - **CMD arguments:** `["node", "cli/mcp-stdio.mjs"]` — this repo’s Dockerfile uses the same CMD. Glama may wrap the process with `mcp-proxy`; our Build Spec / Dockerfile CMD is `node cli/mcp-stdio.mjs` only (not an mcp-proxy wrapper).
   - **Environment variables JSON schema:**

```json
{
  "type": "object",
  "properties": {
    "AZIEL_RUNTIME_URL": {
      "type": "string",
      "description": "Worker origin. Default https://aziel-runtime.vibelock.workers.dev"
    },
    "RUNTIME_TOKEN": {
      "type": "string",
      "description": "Optional operator token when REQUIRE_TOKEN=1 (secret)"
    },
    "AZIEL_RUNTIME_TOKEN": {
      "type": "string",
      "description": "Alias of RUNTIME_TOKEN (secret)"
    }
  },
  "required": []
}
```

   - Placeholder parameters: `{}` (the public Worker needs no credentials)
3. **Deploy** — already succeeded. A later image rebuild still needs `initialize` / `tools/list` (36 tools) to succeed.
4. **Make Release** — already produced Glama release 2.0.7. A Glama release is the listing release. It is not the Worker package version and not a GitHub release.

No Wrangler deploy is required for the listing. HTTP `/mcp` on the Worker is unchanged. The Connector admin UI (claim, Dockerfile, Deploy, Make Release) stays on Glama. This repo ships the claim file and the stdio bridge.

## Author

Aziel Eliab. Do not invent Zenodo DOIs.
