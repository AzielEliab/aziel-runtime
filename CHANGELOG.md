# Changelog

Public identity: **Aziel Eliab** only.

This file exists so Glama / crawlers that look for a repo-root changelog see the **current** MCP server version first.

## 2.0.0-rc1 (current)

- MCP `initialize` `serverInfo.version` is `2.0.0-rc1` (same as `package.json` and `RUNTIME_VERSION`).
- `1.6.2` is **superseded heritage** (FragGate public-door widen). It is not the current server.
- Certification-point freeze. Read-only QNM suite-presence is ON by default; `POST /v1/mesh/disable` refuses `MESH-DISABLE-REFUSED`. Remain-OFF untouched.
- Follow-up TDQS metadata pass: weak-tool descriptions disclose refuse codes, omit-defaults, and door aliases already accepted by handlers. No tool rename. No behavior change. See [`docs/GLAMA-TDQS.md`](docs/GLAMA-TDQS.md).
- GitHub-side SEO / indexing lock: README ecosystem cross-links, [`docs/GITHUB.md`](docs/GITHUB.md), [`docs/CITE.md`](docs/CITE.md). Try on Glama primary. Entity `@id`s unchanged. No Worker / MCP handler change.
- Sister-archive chrome: Worker homepage / `/cite.json` / `/llms.txt` ecosystem lists [He Didn't Jump](https://www.hedidntjump.com/). Not a Softwares hub. **No MCP behavior change.**
- AZindex: `/sitemap-index.xml` and `robots.txt` Sitemap lines now include `https://www.hedidntjump.com/sitemap.xml` with the Softwares hubs. `/cite.json` + `/v1/catalog.json` add `sister_archives` / `hedidntjump_*` fields (`software_tab: false`). **No MCP behavior change.**
- AZindex identity lock: `/cite.json` and `/llms.txt` add `person_id` (`https://www.azieleliab.com/#aziel` — same as `author_id`, not a second `@id`) and cite hub-owned `person.jsonld` / `who-is` / `.well-known/person.jsonld` on azieleliab.com. Runtime does not serve or proxy those files. Sister-archive mission: receipt-first public work; He Didn't Jump challenges the official 1936 Zioncheck suicide narrative via published archive — not a Softwares engine. **No MCP behavior change.**
- Worker homepage/UI: rose-star brand mark top-left. Public Worker HTML no longer says “Everblooming sigil”. Visible identity **Aziel Eliab** only. Remain-OFF untouched. **No MCP behavior change.**
- README public copy labels `/sigil.png` as the rose-star brand mark (not “Everblooming sigil”). Skill markdown + `X-Aziel-Sigil` stay unchanged. **No MCP behavior change.**
- Full notes: [`docs/2.0/CHANGELOG.md`](docs/2.0/CHANGELOG.md).

## Heritage

Older rows live in `VERSION_HISTORY` / `docs/2.0/CHANGELOG.md`. Do not read a superseded row as `serverInfo.version`.
