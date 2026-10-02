# Independent consumer — install and integrate

Author: **Aziel Eliab** only.

This folder is a **public integration path**, not an adoption claim and not an independently validated client. `npm test` in the repo root is a **repo self-check**, not a third-party lab.

Aziel Runtime exposes FragGate list → describe → call, a hashed `GET /v1/software` catalog, in-process engines with SHA-256 `engine_digest`, and hash-chained session receipts. FragGate is THE single door. `GET /v1/mesh` never enables. Public SMTP stays NOT IMPLEMENTED. Flutter `mobile/` is not vendored. Source maps: [`docs/2.0/INSPECT.md`](../../docs/2.0/INSPECT.md).

## Origin

Default public Worker: `https://aziel-runtime.vibelock.workers.dev`

Containers need **outbound DNS + HTTPS** to `*.vibelock.workers.dev` / Cloudflare (`/mcp`, `/v1/fraggate/*`). If DNS fails the client must refuse `FG-DNS` (`remote:false`) — do not substitute a local-validation receipt. You can also run the repo locally (`npx wrangler dev` on your machine — this paper does not deploy).

## Catalog honesty

`GET /v1/software` `git_sha_tracks_deployed_tip` is true only when the Worker was deployed with `GIT_SHA`. Otherwise the page says `deploy lag` and does not claim git HEAD. AZVPN is on at boot. The human desk has no off switch. `worker_home` for that card stays null. Mesh is single-node security-awareness plus a local phoenix wait / re-seal. It is not a loopback fence. Cap-7 is not ICANN and not a public egress IP. Mesh-internet WARNs stay WARN.

## 1. Catalog (human or script)

Open `index.html` and load `GET /v1/software`, or:

```bash
curl -sS -H 'User-Agent: Mozilla/5.0' \
  https://aziel-runtime.vibelock.workers.dev/v1/software | head
```

## 2. MCP

Install order:

1. One-click Install Server on [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime) (Glama release 2.0.7; Worker package 2.0.0-rc1).
2. Remote `POST https://aziel-runtime.vibelock.workers.dev/mcp` (`tools/list` / `tools/call`).
3. Local stdio last, from a clone:

```bash
npm run mcp
```

That starts `cli/mcp-stdio.mjs`. `tools/list` is 36 live tools. Call Softwares (tools/list name Softwares), pick a slug, then `fraggate_call`. `library_lookup` searches library papers and cites. The door runs first. ChainLock, TemporalLock, and ForgeReceipts stamp when the call needs a ledger.

Example: `fraggate_call` with `{ "slug": "foldlock", "op": "fold-preview" }`, or `library_lookup` with `{ "q": "Florence", "op": "search" }`. Also `decisiongate_check` with `dry_run=true`. A long job passes `background:true` and stays Running until a receipt hash exists. Diagnostics: `fraggate_list`, `fraggate_describe`, `fraggate_call`. Unknown tools refuse. HTTP `POST /p/{slug}/{op}` is a proxy. `tools/list` stays 36.

See `mcp-client.mjs` for a copy-paste caller.

## 3. OpenAPI

Import `{origin}/openapi.json` into any OpenAPI client. Prefer:

`POST /v1/fraggate/call` with `{ "slug", "op", "payload" }`

Catalog `/p/{slug}/{op}` paths are documented as **proxy only**.

See `openapi-client.mjs`.

## 4. Hard laws for integrators

- `GET /v1/mesh` never enables radios beyond read-only suite-presence (ON by default).
- Do not call `smtp_send`, `deanonymize`, `chromium`, `tor_exit`, `exec`, `blend`.
- Identity on receipts stays **Aziel Eliab** only.

Gaps 21–22 (deanonymize / mesh default) stay assessed, not implemented.
