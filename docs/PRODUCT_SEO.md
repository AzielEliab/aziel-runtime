# Product SEO template (GitBaby Workers)

Aziel Eliab Runtime is the crawl hub. Each product Worker should expose the same open-crawl surfaces so Google and AI search can find **Aziel Eliab** software and the **Aziel Digital Library**.

This repo does **not** own VibeLock or other product Workers. Copy this pattern into those repos.

## Identity

- Primary name: **Aziel Eliab**
- `alternateName` / aka only: **Aziel Elroi Eliab**
- Do not invent other identities.
- Do not invent Zenodo DOIs. Cite `/cite.json`.

## Required routes

| Path | MIME | Purpose |
|------|------|---------|
| `GET /` | `text/html; charset=utf-8` | Indexable homepage. Lead with the Aziel Runtime abstract (not a changelog). |
| `GET /about` | `text/html; charset=utf-8` | What / for whom / how agents / how hubs / what it is not |
| `GET /robots.txt` | `text/plain; charset=utf-8` | Open crawl |
| `GET /sitemap.xml` | `application/xml; charset=utf-8` | This host only |
| `GET /llms.txt` | `text/plain; charset=utf-8` | LLM / AI crawlers |
| `GET /ai.txt` | `text/plain; charset=utf-8` | Alias of `/llms.txt` |
| `GET /cite.json` | `application/json; charset=utf-8` | How to cite |
| `GET /download` | counted tarball / zip | Software package |

## robots.txt

Open crawl. **Allow: /** for `*` and every major AI bot. **Never** add `Disallow: /` for `GPTBot` (or any other listed bot). Do not ship Cloudflare managed content-signal blocks.

Name the Allow set in llms / cite / homepage SEO copy (not only GPT/Venice/Grok): GPTBot/ChatGPT, Venice, Grok, Google-Extended, GoogleOther, Google-CloudVertexBot, Claude(+Search/User), anthropic-ai, Perplexity(+User), bingbot, Meta-External*, Applebot(+Extended), Amazonbot, DuckDuck/DuckAssist, MistralAI-User, YouBot, CCBot, cohere-ai, cohere-training-data-crawler, Diffbot, AI2Bot(+Dolma), Timpibot, Petalbot, Bytespider, Omgili(+bot), FirecrawlAgent, ImagesiftBot, FacebookBot, TikTokSpider, Baiduspider*, Yandex.

```txt
User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=yes

User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Googlebot
Allow: /
User-agent: GoogleOther
Allow: /
User-agent: Google-CloudVertexBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: bingbot
Allow: /
User-agent: Meta-ExternalAgent
Allow: /
User-agent: Meta-ExternalFetcher
Allow: /
User-agent: Meta-WebIndexer
Allow: /
User-agent: FacebookBot
Allow: /
User-agent: facebookexternalhit
Allow: /
User-agent: Meta-ExternalAds
Allow: /
User-agent: Applebot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: DuckDuckBot
Allow: /
User-agent: DuckAssistBot
Allow: /
User-agent: MistralAI-User
Allow: /
User-agent: YouBot
Allow: /
User-agent: CCBot
Allow: /
User-agent: cohere-ai
Allow: /
User-agent: cohere-training-data-crawler
Allow: /
User-agent: Diffbot
Allow: /
User-agent: AI2Bot
Allow: /
User-agent: AI2Bot-Dolma
Allow: /
User-agent: Timpibot
Allow: /
User-agent: Petalbot
Allow: /
User-agent: Bytespider
Allow: /
User-agent: Omgili
Allow: /
User-agent: Omgilibot
Allow: /
User-agent: FirecrawlAgent
Allow: /
User-agent: ImagesiftBot
Allow: /
User-agent: TikTokSpider
Allow: /
User-agent: Baiduspider
Allow: /
User-agent: Baiduspider-render
Allow: /
User-agent: Baiduspider-ai
Allow: /
User-agent: YandexBot
Allow: /
User-agent: PanguBot
Allow: /
User-agent: Kangaroo Bot
Allow: /
User-agent: Cotoyogi
Allow: /
User-agent: aiHitBot
Allow: /
User-agent: webzio-extended
Allow: /
User-agent: ICC-Crawler
Allow: /
User-agent: DataForSeoBot
Allow: /
User-agent: AwarioBot
Allow: /
User-agent: AwarioSmartBot
Allow: /
User-agent: AwarioRssBot
Allow: /
User-agent: Sentibot
Allow: /
User-agent: peer39_crawler
Allow: /
User-agent: Seekr
Allow: /
User-agent: Meltwater
Allow: /
User-agent: TurnitinBot
Allow: /
User-agent: Factset_spyderbot
Allow: /
User-agent: NeevaBot
Allow: /

Sitemap: https://{this-host}/sitemap.xml
```

Use the canonical User-agent names above (for example `Meta-ExternalAgent`, not `meta-externalagent`). Do not list case-only duplicates. Do not `Disallow: /v1` or `/openapi` — catalog and OpenAPI stay public. Only `Disallow: /api/` or `/admin/` if those paths exist as private on that Worker.

`vibelock.vibelock.workers.dev` previously served Cloudflare content-signal legal text (no `Allow: /`). That host is **not** the counted download Worker. The live catalog Worker is `vibelock-download-tracker.vibelock.workers.dev`, which already Allows `/`. Replace any leftover content-signal-only robots on product hosts with the template above.

## cite.json (minimum)

```json
{
  "author": "Aziel Eliab",
  "aka": "Aziel Elroi Eliab",
  "identity": "Aziel Eliab",
  "license": "Apache-2.0",
  "how_to_cite": "Eliab, Aziel. (2026). {Product} {version} [Software]. Apache-2.0. {url}",
  "catalog": "https://aziel-runtime.vibelock.workers.dev/",
  "library": "https://www.azielcorpuslibrary.net/"
}
```

No invented DOIs. Historical tombstones may be listed with `zenodo_status`.

## llms.txt

Plain text. Lead with Aziel Eliab, the product one-liner, Worker `/`, `/cite.json`, counted `/download`, and a pointer to the Digital Library + runtime catalog.

Name the full compatible AI client list (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants) and the robots.txt Allow set above. Do not claim support is only Grok / ChatGPT / Venice.

## Quantum Node Mesh proxy (Live Nodes)

Suite mesh is **QNM-BUILD-1.0** on `aziel-runtime`. **suite-presence is operator-enabled.** `GET /v1/mesh` never enables. Product Workers must not invent a second mesh.

If the product homepage or hub shows **Live Nodes**, proxy the runtime kernel:

```js
if (url.pathname === "/v1/mesh" || url.pathname.startsWith("/v1/mesh/")) {
  if (!env.AZIEL_RUNTIME) {
    return Response.json({ ok: false, error: "AZIEL_RUNTIME unbound" }, { status: 503 });
  }
  const headers = new Headers(request.headers);
  headers.set("User-Agent", "Mozilla/5.0");
  return env.AZIEL_RUNTIME.fetch(new Request(request, { headers }));
}
```

Required aliases: `GET /v1/mesh`, `GET /v1/mesh/status`, `GET /v1/mesh/nodes`. GodLock download-tracker previously 404'd `/v1/mesh/status` — add that proxy. Prefer the `AZIEL_RUNTIME` service binding. Avoid `|` in `node_id` (use `{slug}-worker`).

While suite-presence is LIVE, aziel-runtime fans out join/heartbeat for live Softwares product Workers (TTL 5 min) on cron or request-path. GET still never enables.

## Hub

Runtime advertises live product sitemaps from the catalog (probe 2026-09-05). VibeLock’s download-tracker `/sitemap.xml` was 404 — add one. Several Workers were missing `/llms.txt` (`godlock`, `miragegrid`, `staticclock`, `azclce`, `azai`, `azbot`) — add those so the hub can link them.

Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) should fetch
`GET https://aziel-runtime.vibelock.workers.dev/v1/software` on each Software-tab
request instead of hand-editing product copy. Client installers use
`GET /v1/update/check?slug=&version=`. See [CLIENT_UPDATE.md](CLIENT_UPDATE.md).

Runtime hub sitemaps in `robots.txt` / `sitemap-index.xml`: this host, `https://www.azieleliab.com/sitemap.xml`, Digital Library, godlock.uk, and live product Worker sitemaps. Do not invent mesh-enable URLs.

Runtime HTML shells (content negotiation — hubs still get JSON by default):

| Path | Unique title |
|------|----------------|
| `GET /` | Aziel Runtime — node-meshed MCP Softwares suite (not an API aggregator) |
| `GET /about` | About — Aziel Runtime |
| `GET /v1/software` (`Accept: text/html`) | Softwares — Aziel Runtime |
| `GET /v1/fraggate/describe` (`Accept: text/html`) | FragGate describe — Aziel Runtime |
| `GET /v1/fraggate/describe?slug=` (`Accept: text/html`) | `{Name} — FragGate describe — Aziel Runtime` |

JSON-LD Person + SoftwareApplication / ItemList on those shells. Homepage Worker UI CSS is unchanged.

`/cite.json` and `/llms.txt` cross-link Softwares hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) plus AZCoherence. Identity Aziel Eliab only.

See also: https://aziel-runtime.vibelock.workers.dev/sitemap-index.xml

## Footer (donate — download-tracker pattern)

Canonical rails live on hubs. Hub Donate pages include five QRs that encode payment URIs (BTC / ETH / LTC / XRP / DOGE). Product Workers only link. Do not invent wallets. Do not copy those QRs onto the download-tracker.

One footer line on every product Worker homepage:

**Support the work** → https://www.azieleliab.com/donate

Runtime Worker uses the same URL with the label `Donate`. Plan: [AZL-DONATE-1.0](designs/AZL-DONATE-1.0.md). Not a Softwares-tab product.
