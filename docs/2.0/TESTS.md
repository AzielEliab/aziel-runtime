# Tests — how to run, what they cover

**Author / identity:** **Aziel Eliab** only  
**Not a third-party lab.** `npm test` is the in-repo self-check. CI: [`.github/workflows/test.yml`](../../.github/workflows/test.yml) (Node 22).

## Command

```bash
git clone https://github.com/AzielEliab/aziel-runtime.git
cd aziel-runtime
npm install
npm test
```

`package.json` `test` runs engine digest hashing, then the `scripts/verify-*.mjs` probes in order. No Cloudflare credentials. No `wrangler deploy`. Optional live probe: `npm run probe:live` (hits production; not required for CI).

Clean-room wrapper (clone → test → MCP → receipt): `bash scripts/clean-room-2.0.sh` — see [CLEAN-ROOM.md](CLEAN-ROOM.md).

## Suites that cover FragGate / MCP / receipts / catalog

| Script | Behavior asserted |
|--------|-------------------|
| [`scripts/verify-fraggate.mjs`](../../scripts/verify-fraggate.mjs) | Registry counts; HTTP list/describe/call; live `FG-OK` + `engine_digest`; stub `FG-STUB`; unknown `FG-HALLUC-TOOL`; MCP `tools/list` names; MCP `fraggate_call` happy-path and refuse |
| [`scripts/verify-mcp-tdqs.mjs`](../../scripts/verify-mcp-tdqs.mjs) | Every public tool has `inputSchema` object, descriptions, annotations; names frozen to `PUBLIC_MCP_TOOLS` |
| [`scripts/verify-mcp-discovery.mjs`](../../scripts/verify-mcp-discovery.mjs) | Well-known MCP server card + OAuth-protected-resource honesty |
| [`scripts/verify-mcp-stdio.mjs`](../../scripts/verify-mcp-stdio.mjs) | Stdio CLI + `glama.json` listing fields; mocked DNS miss is `FG-DNS` / no local fallback |
| [`scripts/verify-remote-transport.mjs`](../../scripts/verify-remote-transport.mjs) | Mocked DNS/network refuse (`remote:false`); SpectralLock describe/call in-process; no fake FragGate receipt |
| [`scripts/verify-mcp-transport.mjs`](../../scripts/verify-mcp-transport.mjs) | HTTP JSON-RPC transport |
| [`scripts/verify-session.mjs`](../../scripts/verify-session.mjs) | `open → policy → exec → receipt → close`; chain verify; tamper `hash_mismatch`; HTTP 409 after close |
| [`scripts/verify-receipt-fixture.mjs`](../../scripts/verify-receipt-fixture.mjs) | Offline SHA-256 recompute of a committed fixture (session chain + ACT-RECEIPT) |
| [`scripts/verify-act-receipt.mjs`](../../scripts/verify-act-receipt.mjs) | Four-field mint, hash round-trip, fail-open skip, no token leak |
| [`scripts/verify-software.mjs`](../../scripts/verify-software.mjs) | Catalog shape, Plain→Gate→Lock sort, purpose copy, Glama `primary_host` |
| [`scripts/verify-spore.mjs`](../../scripts/verify-spore.mjs) | SPORE-1.0 dormant vs live honesty; no invented heartbeats; Plane B/C SLOT |

Hash / fork / export neighbors (extend these rather than adding marketing-string tests): `verify-act-receipt.mjs`, `verify-session.mjs`, `verify-4dmap.mjs` (`card_export` / `card_import`), `verify-no-lie.mjs` (hash break), `verify-cite.mjs`.

## Offline receipt hash

Re-check the committed fixture without the Worker:

```bash
node scripts/verify-receipt-fixture.mjs
```

Fixture: [`fixtures/session-receipt-chain.json`](../../fixtures/session-receipt-chain.json). Algorithm: SHA-256 of `canonicalize(receipt without hash)` — same as `signReceipt` in [`src/session-core.js`](../../src/session-core.js). ACT-RECEIPT rows use `hashActReceipt` in [`src/library-receipts.js`](../../src/library-receipts.js).

## Inspectability of source

[`scripts/verify-inspect.mjs`](../../scripts/verify-inspect.mjs) asserts:

- `LICENSE` is Apache-2.0
- `src/index.js`, `src/fraggate/door.js`, `src/mcp-surface.js`, `src/session-core.js`, `src/software-catalog.js` are multi-line unminified JS
- `wrangler.toml` points `main` at `src/index.js` (no minify flag)
- INSPECT.md links those paths
- advertised `install_sh` is not `curl … | bash`

## Other suites

The rest of `scripts/verify-*.mjs` cover mesh laws, Remain-OFF, engines, SEO MIME, and 2.0 pack gates. They are listed in `package.json` `scripts.test`. Do not treat a green run as an external lab letter.
