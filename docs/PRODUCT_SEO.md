# Product SEO template (GitBaby Workers)

Aziel Eliab Runtime is the crawl hub. Each product Worker should expose the same open-crawl surfaces so Google and AI search can find **Aziel Eliab** software and the **Aziel Digital Library**.

This repo does **not** own VibeLock or other product Workers. Copy this pattern into those repos.

## Identity

- Public product name: **Aziel Runtime** (`aziel-runtime`)
- Primary author: **Aziel Eliab**
- Shared Person `@id`: `https://www.azieleliab.com/#aziel` (official hub). Do **not** use `https://github.com/AzielEliab#person`.
- `alternateName` / aka only: **Aziel Elroi Eliab**
- Runtime parent SoftwareApplication `@id`: `https://www.azieleliab.com/runtime#runtime` (hub identity for the suite). Worker origin is the execution endpoint / `relatedLink` and stays self-canonical for Worker pages. `author` is `{ "@id": "https://www.azieleliab.com/#aziel" }`. `sameAs` is the GitHub repo and the Glama listing.
- `hasPart` lists **named tools only** (FragGate, ForgeReceipts, DecisionGATE, TemporalLock, TrajectoryLock, PeaceLock, GodLock, AZ-OS, AZCoherence, 4DMap, Aziel Corpus, Ask Jeeves, AZBrowser, AZMail, AZHub, AZInterface, SpectralLock, ShadowLock, FoldLock, CodeLock, VibeLock). Each child is `@id` `https://www.azieleliab.com/runtime#<slug>`, exact public name, `author` → Person, `isPartOf` → Runtime `@id`.
- Do **not** publish MCP operation names (`fraggate_call`, `runtime_run`, …) as schema entities.
- Do not invent other identities.
- Do not invent Zenodo DOIs. Cite `/cite.json`.
- Crawler lead is the canonical abstract. Version notes (1.7.x, **1.9 / AZRT-1.9-CLOSE-1.0**, **2.0.0-rc1**, later) stay **below** the abstract.

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

Name the Allow set in llms / cite / homepage SEO copy (not only GPT/Venice/Grok): GPTBot/ChatGPT, Venice, Grok, Google-Extended, GoogleOther, Google-CloudVertexBot, Claude(+Search/User), anthropic-ai, Perplexity(+User), bingbot, Meta-External*, Applebot(+Extended), Amazonbot, DuckDuck/DuckAssist, MistralAI-User, YouBot, CCBot, cohere-ai, cohere-training-data-crawler, Diffbot, AI2Bot(+Dolma), Timpibot, Petalbot, Bytespider, Omgili(+bot), FirecrawlAgent, ImagesiftBot, Cloudflare-AI-Search, FacebookBot, TikTokSpider, Baiduspider*, Yandex.

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
User-agent: Cloudflare-AI-Search
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

Runtime `/cite.json` also publishes `survival.tip` — the CROSS-NETWORK-SURVIVAL-1.0 one-string rule (matching bytes on an independent shelf). Same string on `/llms.txt`. Not a Softwares-tab product.

## llms.txt

Plain text. Lead with **What this is** — the canonical Aziel Runtime abstract (not a version mash). Then How to use (FragGate list→describe→call; `/v1/software`; `/mcp`). Version history (including **1.9 / AZRT-1.9-CLOSE-1.0**) goes **below** that abstract. Never replace the abstract with a changelog.

Name the full compatible AI client list (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants) and the robots.txt Allow set above. Do not claim support is only Grok / ChatGPT / Venice.

COLD-MULTI-SHELF-1.0 (below the abstract): `GET /shelves` cites corpus#96 honesty. Plane A = 5 published surfaces / 2 family radii / 1 independent live. Plane B SLOT (Codeberg + archive.org PASS still SLOT at https://archive.org/details/aziel-lockset-tip; Framagit URL null; GitFlic `CNS-GITFLIC-EMAIL`; GitLab `CNS-GITLAB-CF-LOOP`; Zenodo refused; `doi` null). Plane C USB SLOT. Runtime is not a sixth surface. Growth-ON crawlers Allow. No visible 15:20. Person `@id` https://www.azieleliab.com/#aziel.

Cap-7 semantic bridge (below the abstract): MirageGrid-only mesh-name factory. Inherit hub designs only (azcorpus + azlibrary on the library hub). `resolves_to_hub: false`. `name_may_change: true`. Canonical hubs immutable. Not aliases of the four ICANN hostnames. Not a fifth product. Cite `GET /v1/mesh/az-generator` and MirageGrid Worker `/bridge`. Catalog + skill name mesh-resident website designs **azcorpus** + **azlibrary** (downloadable to nodes; azlibrary upload is API token only). Growth-ON crawlers Allow. No fake ICANN `.az`. No AZ-GEN live registrar. No visible 15:20. `GET /v1/mesh` never enables radios.

## Quantum Node Mesh proxy (Live Nodes)

Suite mesh is **QNM-BUILD-1.0** on `aziel-runtime`. **Read-only suite-presence is ON by default.** `GET /v1/mesh` never enables radios beyond that. Product Workers must not invent a second mesh.

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

Runtime hub sitemaps in `robots.txt` / `sitemap-index.xml`: this host, `https://www.azieleliab.com/sitemap.xml`, Digital Library, godlock.uk, He Didn't Jump sister archive (`https://www.hedidntjump.com/sitemap.xml`), and live product Worker sitemaps. Do not invent mesh-enable URLs. He Didn't Jump is not a Softwares hub.

Runtime HTML shells (content negotiation — hubs still get JSON by default):

| Path | Unique title |
|------|----------------|
| `GET /` | Aziel Runtime — node-meshed MCP Softwares suite (not an API aggregator) |
| `GET /about` | About — Aziel Runtime |
| `GET /v1/software` (`Accept: text/html`) | Softwares — Aziel Runtime |
| `GET /v1/fraggate/describe` (`Accept: text/html`) | FragGate describe — Aziel Runtime |
| `GET /v1/fraggate/describe?slug=` (`Accept: text/html`) | `{Name} — FragGate describe — Aziel Runtime` |

JSON-LD Person (`https://www.azieleliab.com/#aziel`) + SoftwareApplication / ItemList on those shells. Runtime SoftwareApplication `sameAs` is GitHub + Glama only. Homepage Worker UI CSS stays the existing chrome plus a concise ecosystem nav (not the Softwares catalog).

`/cite.json` and `/llms.txt` cross-link Softwares hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) plus AZCoherence and the He Didn't Jump sister archive. Identity Aziel Eliab only.

`/cite.json` and `/v1/catalog.json` also publish `stats` / `social_status` (person_id `https://www.azieleliab.com/#aziel`) for AZindex awareness. Live stats: `https://www.azieleliab.com/v1/stats`, `https://www.azielcorpuslibrary.net/stats` (not `/v1/stats`; version is `GET /v1/health`), `https://www.hedidntjump.com/api/stats`. GodLock public snapshot is `https://godlock.uk/stats` (not `/v1/stats`). Runtime agent/MCP usage is `GET /v1/uses`. Optional hub rollup: `GET /v1/stats-rollups` (read-only; never invent numbers).

See also: https://aziel-runtime.vibelock.workers.dev/sitemap-index.xml

## Footer (donate — download-tracker pattern)

Canonical rails live on hubs. Hub Donate pages include five QRs that encode payment URIs (BTC / ETH / LTC / XRP / DOGE). Product Workers only link. Do not invent wallets. Do not copy those QRs onto the download-tracker.

One footer line on every product Worker homepage:

**Support the work** → https://www.azieleliab.com/donate

Runtime Worker uses the same URL with the label `Donate`. Plan: [AZL-DONATE-1.0](designs/AZL-DONATE-1.0.md). Not a Softwares-tab product.

## Ecosystem (visible chrome)

Concise **Part of the Aziel Eliab ecosystem** block on homepage Softwares / client chrome and crawl-shell footers. Do not bury the Softwares catalog.

- Official site → https://www.azieleliab.com/
- Aziel Corpus Library → https://www.azielcorpuslibrary.net/
- Aziel Runtime on GitHub → https://github.com/AzielEliab/aziel-runtime
- Try on Glama → https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- GodLock → https://godlock.uk/
- He Didn't Jump → https://www.hedidntjump.com/

A short **Includes named components such as FragGate…** line may sit with that chrome. It does not replace the Softwares catalog.

## GitHub About (this repo)

GitHub description / homepage / topics are **not** in git. Lock + apply command: [GITHUB.md](GITHUB.md).

- **Description** leads with NodeMesh'd MCP Softwares suite for digital forensics/auditing — not an API aggregator. Names FragGate, OpenAPI + MCP, 2.0.0-rc1, Aziel Eliab.
- **Homepage** is **Try on Glama** (`https://glama.ai/mcp/servers/AzielEliab/aziel-runtime`). Worker origin stays the execution surface.
- **Topics** must include `mcp`, `openapi`, `fraggate`, `digital-forensics` (plus `glama`, `mcp-server`, `nodemesh`).

README websites table lists official site, Runtime hub `@id` parent, FragGate kernel, and Try on Glama **above** the Worker origin. Do not drop azieleliab.com / azielcorpuslibrary.net / godlock.uk / hedidntjump.com.

## llms.txt / cite.json (docs, not handlers)

Worker `/llms.txt` and `/cite.json` are generated in `src/seo.js`. This repo's GitHub-side docs must **restate** the same abstract, entity `@id`s, full AI client set, and crawler Allow list — they must not invent a second identity or a weaker aggregator lead. See [CITE.md](CITE.md).
