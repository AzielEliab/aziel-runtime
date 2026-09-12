# Glama listing — aziel-runtime

Public identity: **Aziel Eliab** only.

Glama is one of the compatible AI clients (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants). See the README **Compatible AI clients** section. This page is the practical Install Server / stdio path.

[glama.ai/mcp/servers/AzielEliab/aziel-runtime](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime) indexes this repo. Glama hosting runs a **stdio** MCP process (stdin/stdout JSON-RPC). The Worker already speaks MCP over HTTP at `POST https://aziel-runtime.vibelock.workers.dev/mcp`. Without a stdio entrypoint, `glama.json`, and a Dockerfile, the listing shows **This server cannot be installed**.

This repo ships:

| File | Role |
|------|------|
| [`glama.json`](../glama.json) | Claim file. Schema requires `maintainers` (GitHub username `AzielEliab`). Listing `name`, `version` (`2.0.0-rc1`), `description` (NodeMesh'd MCP Softwares suite for digital forensics/auditing — not an API aggregator; `1.6.2` is superseded heritage), `keywords` (includes mcp / openapi / fraggate / digital-forensics), and `categories` are additional properties. |
| [`cli/mcp-stdio.mjs`](../cli/mcp-stdio.mjs) | Stdio MCP server. Default **bridges** to the hosted Worker `/mcp`. |
| [`Dockerfile`](../Dockerfile) | Local / “from Dockerfile” image. Glama admin often **generates** its own image from CMD args — still ship this file. |
| [`src/mcp-stdio.js`](../src/mcp-stdio.js) | Framing + bridge / in-process dispatch. |
| [`docs/GLAMA-TDQS.md`](GLAMA-TDQS.md) | Metadata-only TDQS pass (`tools/list` descriptions, params, annotations, output schemas). Fold into 2.0.0-rc1 Gate 4. |

## Why stdio

Glama wraps the process with `mcp-proxy` and talks MCP on stdin/stdout (newline-delimited JSON-RPC, same as `@modelcontextprotocol/sdk` `StdioServerTransport`). HTTP `POST /mcp` stays the Worker API; this CLI forwards `initialize`, `tools/list`, `tools/call`, `ping`, and notifications so the tool list is not duplicated. `tools/list` is the thin FragGate door (pipeline list → describe → call, plus named live modules including suite `mesh_*`) — not the flat `{slug}_{op}` pile.

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

## Glama admin — claim, Deploy, Make Release

After this lands on `main`:

1. Open [Score / claim](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime/score) and claim with `glama.json` maintainers (`AzielEliab`). Re-run claim after any `glama.json` change so Glama re-reads the file.
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
3. **Deploy** — Glama builds the image and starts the stdio server (`initialize` / `tools/list` must succeed).
4. **Make Release** from the passing test (version + changelog). A Glama release is what turns **Install Server** on. It is not a GitHub release.

No Wrangler deploy is required for the listing. HTTP `/mcp` on the Worker is unchanged.

## Author

Aziel Eliab. Do not invent Zenodo DOIs.
