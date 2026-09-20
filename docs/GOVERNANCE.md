# Governance and review

**Author / identity:** **Aziel Eliab** only. GodLock is a product name.

This repository is a single-author project. Do not invent outside contributors, multi-author history, or fake issues to look healthier.

## Who can change what

- Public contract (FragGate door, MCP tool names, Remain-OFF, receipt hash algorithm) is frozen at 2.0.0-rc1 — see [`docs/2.0/`](2.0/).
- Softwares purpose copy (`one_line` / `description`) is designed-to-do only — [`src/software-copy.js`](../src/software-copy.js).
- License: [Apache-2.0](../LICENSE). SPDX on the mapped entry files; the root LICENSE covers the tree.

## Agent-assisted commits (honest)

Some commits and pull requests are written with Cursor Cloud Agents (and similar). That is **assistance**, not a second author and not a hidden contributor list. Review the **diff and the tests**, not the committer display name.

How to review a PR:

1. Read [`docs/2.0/INSPECT.md`](2.0/INSPECT.md) and open the listed source files.
2. Run `npm test` (see [`docs/2.0/TESTS.md`](2.0/TESTS.md)).
3. Re-check the receipt fixture: `node scripts/verify-receipt-fixture.mjs`.
4. Treat `/llms.txt` / `/cite.json` / `/who-is` as crawler identity, not as proof of behavior.

## Trust note

There is no CLA farm, no invented foundation, and no claim of independent lab certification. `npm test` and the 2.0 clean-room script are **self-checks**. Forks are welcome under Apache-2.0.
