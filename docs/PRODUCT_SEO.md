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
| `GET /` | `text/html; charset=utf-8` | Indexable homepage |
| `GET /robots.txt` | `text/plain; charset=utf-8` | Open crawl |
| `GET /sitemap.xml` | `application/xml; charset=utf-8` | This host only |
| `GET /llms.txt` | `text/plain; charset=utf-8` | LLM / AI crawlers |
| `GET /ai.txt` | `text/plain; charset=utf-8` | Alias of `/llms.txt` |
| `GET /cite.json` | `application/json; charset=utf-8` | How to cite |
| `GET /download` | counted tarball / zip | Software package |

## robots.txt

Open crawl. **Allow: /** for `*` and every major AI bot. **Never** add `Disallow: /` for `GPTBot` (or any other listed bot). Do not ship Cloudflare managed content-signal blocks.

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
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: CCBot
Allow: /

Sitemap: https://{this-host}/sitemap.xml
```

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

## Hub

Runtime advertises live product sitemaps from the catalog (probe 2026-09-05). VibeLock’s download-tracker `/sitemap.xml` was 404 — add one. Several Workers were missing `/llms.txt` (`godlock`, `miragegrid`, `staticclock`, `azclce`, `azai`, `azbot`) — add those so the hub can link them.

See also: https://aziel-runtime.vibelock.workers.dev/sitemap-index.xml
