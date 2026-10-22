# Security policy: aziel-runtime

## Supported versions

| Version | Supported |
| --- | --- |
| 2.0.0-rc1 (current `main`) | Yes |
| Anything older | No. Please reproduce on `main` first. |

## Reporting a vulnerability

Report it **privately through GitHub**: on this repo, open **Security → Advisories → Report a vulnerability**
(`https://github.com/AzielEliab/aziel-runtime/security/advisories/new`).

- Please don't open a public issue, PR or discussion for a vulnerability.
- No email or other off-platform channel is offered. The GitHub advisory is the only private channel.
- If the "Report a vulnerability" button is missing, open a public issue titled **"Security contact
  request"** with **no details**. A private advisory will be opened for you.
- Include the affected route or tool (for example `/mcp`, `/v1/anchor/verify` or a FragGate door), the
  commit or `GIT_SHA` from `/v1/health`, minimal steps to reproduce, and the impact you expect.
- Never include real secrets, tokens or anyone's personal data. If you hit one by accident, say so and
  don't keep a copy.

## What to expect

- Reports are handled on a best-effort basis by a single maintainer. There is no paid bounty and no
  guaranteed timeline.
- Fixes land as normal reviewed PRs. Schema changes are additive only (`docs/2.0/COMPATIBILITY-POLICY.md`).
  A fix fails closed rather than open. A fix never turns on anything listed as Remain-OFF
  (`docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md`).
- A fix is only called deployed once the live `/v1/health` `GIT_SHA` shows it.

## Scope

In scope: this repository's Worker (`src/`), its MCP and HTTP routes, the stdio CLI (`cli/`), and the
verification scripts (`scripts/`).

Out of scope: third-party services the runtime reads (GitHub, Codeberg, Cloudflare platform behaviour),
volumetric DoS, and reports that only say a Remain-OFF feature is off. That is by design.

## Safe harbour

Good-faith research that respects these rules, does not touch other people's data and does not degrade
the public service will not be pursued. Please rate-limit automated testing.
