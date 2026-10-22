# Contributing to aziel-runtime

Thanks for helping. This is a small project with one maintainer. Clear, small changes get reviewed fastest.

## Before you start

- **Bugs and ideas:** open an issue using one of the templates.
- **Security problems:** don't open an issue. Follow [SECURITY.md](SECURITY.md) and use a private GitHub advisory.
- Please don't put real names, emails, tokens or other personal data in issues, PRs, commits or test fixtures.

## Ground rules (these are checked in review)

- **Additive only.** Public schemas, codes and MCP tools are not removed or renamed. See
  [`docs/2.0/COMPATIBILITY-POLICY.md`](docs/2.0/COMPATIBILITY-POLICY.md).
- **Frozen counts.** The version stays `2.0.0-rc1`. MCP `tools/list` stays at 36 tools, and Softwares stays at 42,
  unless a release explicitly changes them.
- **One door.** Tool calls go through FragGate. Don't add a side entrance.
- **Fail closed.** Missing config or a failed check produces an explicit refusal code, never a silent pass.
- **Remain-OFF stays off.** Don't enable anything listed in
  [`docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md`](docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md).
- **Honest wording.** Don't call a feature live, verified or deployed unless code or a live check shows it.
  "Configured" is not "live".
- **No secrets in the repo.** Tokens go in Worker secrets, never in `wrangler.toml [vars]` or in code.

## Development

Requirements: Node.js 20 or newer (CI uses Node 22).

```sh
npm ci
npm test         # full self-check, the same as CI (.github/workflows/test.yml)
npm run mcp      # stdio MCP server
```

Add or update a `scripts/verify-*.mjs` check for any behavior change, and wire it into `npm test` in
`package.json`. A PR is ready when `npm test` passes locally.

## Pull requests

- Branch from `main`, keep one topic per PR, and fill in the PR template.
- Describe what changes, what doesn't, and how you tested it.
- Merges and deploys are done by the maintainer after review. Opening a PR never deploys anything.

## License

Contributions are accepted under the repository's [Apache-2.0 license](LICENSE).
