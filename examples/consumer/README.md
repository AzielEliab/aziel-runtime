# Independent consumer — install and integrate

Author: **Aziel Eliab** only.

This folder is a **public integration path**, not an adoption claim and not an independently validated client. `npm test` in the repo root is a **repo self-check**, not a third-party lab.

Aziel Runtime is not merely an API orchestrator or software aggregator; it is a node-meshed orchestration suite of MCP-connected software for digital forensics and auditing. FragGate is THE single door. `GET /v1/mesh` never enables. Public SMTP stays NOT IMPLEMENTED. Flutter `mobile/` is not vendored.

## Origin

Default public Worker: `https://aziel-runtime.vibelock.workers.dev`

You can also run the repo locally (`npx wrangler dev` on your machine — this paper does not deploy).

## 1. Catalog (human or script)

Open `index.html` and load `GET /v1/software`, or:

```bash
curl -sS -H 'User-Agent: Mozilla/5.0' \
  https://aziel-runtime.vibelock.workers.dev/v1/software | head
```

## 2. MCP (stdio, no author account)

From a clone of this repository:

```bash
npm run mcp
```

That starts `cli/mcp-stdio.mjs`. Point any MCP client (Cursor, Claude, ChatGPT MCP, Copilot, …) at that command. Tools stay the thin FragGate door:

1. `fraggate_list`
2. `fraggate_describe` one slug
3. `fraggate_call` `{ "slug": "…", "op": "…", "payload": { } }`

Do not call flat `{slug}_{op}` names. Unknown tools refuse. HTTP `POST /p/{slug}/{op}` is a **proxy**, not exec.

Remote MCP over HTTP: `POST {origin}/mcp` with JSON-RPC `tools/list` / `tools/call`.

See `mcp-client.mjs` for a copy-paste caller.

## 3. OpenAPI

Import `{origin}/openapi.json` into any OpenAPI client. Prefer:

`POST /v1/fraggate/call` with `{ "slug", "op", "payload" }`

Catalog `/p/{slug}/{op}` paths are documented as **proxy only**.

See `openapi-client.mjs`.

## 4. Hard laws for integrators

- Do not enable mesh from `GET /v1/mesh`.
- Do not call `smtp_send`, `deanonymize`, `chromium`, `tor_exit`, `exec`, `blend`.
- Identity on receipts stays **Aziel Eliab** only.

Gaps 21–22 (deanonymize / mesh default) stay assessed, not implemented.
