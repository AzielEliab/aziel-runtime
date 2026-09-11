# Clean-room reproducibility — Aziel Runtime 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Script:** `scripts/clean-room-2.0.sh`  
**Evidence schema:** [clean-room-result.schema.json](clean-room-result.schema.json)  
**Sample:** [clean-room-result.sample.json](clean-room-result.sample.json)

An outsider clones this repository on a machine with **Node 22+** and reproduces the frozen contract **without the author, without Cloudflare credentials, and without `wrangler deploy`.**

This is a **reproducible self-check**, not a third-party lab and not a court audit.

Remain-OFF stays off. `GET /v1/mesh` never enables. No undocumented secrets. Optional `RUNTIME_TOKEN` is **not required** for public FragGate call or this probe.

---

## One command (existing checkout)

```bash
bash scripts/clean-room-2.0.sh
```

Writes `clean-room-result.json` (override with `--out PATH`). Exit `0` only on `verdict: PASS`.

## Clone path (independent machine)

```bash
git clone https://github.com/AzielEliab/aziel-runtime.git
cd aziel-runtime
git checkout <this-commit>
bash scripts/clean-room-2.0.sh
```

The script:

1. Records `git_sha` + `RUNTIME_VERSION`
2. `npm install` (no extra registries; uses `package.json` only)
3. `npm test` (engine digests, FragGate, Remain-OFF, adversarial, SEO abstract guard)
4. **Docker** `docker build -t aziel-runtime-mcp:clean-room-2.0 .` then `docker run --rm -i -e AZIEL_RUNTIME_MCP=local …` **if** `docker` is available; otherwise **documented local** (`AZIEL_RUNTIME_MCP=local`)
5. MCP `initialize` → `tools/list` → harmless `fraggate_call` (`decisiongate` / `health`)
6. Session `open` → `exec` (harmless `godlock` / `score`) → `verifyChainStrict` → `close`
7. Shutdown (no leftover session process)
8. Writes evidence JSON matching the schema

### Flags

| Flag | Meaning |
|------|---------|
| `--out FILE` | Evidence path (default `clean-room-result.json`) |
| `--skip-npm-test` | Probe + Docker/local only (author inner loop; reviewers should not skip) |
| `--skip-docker` | Force documented local MCP even if Docker exists |
| `--skip-install` | Skip `npm install` when `node_modules` is already present |

---

## Documented local MCP (no Docker)

```bash
AZIEL_RUNTIME_MCP=local node cli/mcp-stdio.mjs
```

Stdio is MCP JSON-RPC (newline-delimited). Logs go to stderr. The clean-room probe uses the same Worker `/mcp` handler **in-process** (`scripts/clean-room-probe.mjs`) so a reviewer does not need a hosted Worker URL.

Default `cli/mcp-stdio.mjs` **bridges** to `https://aziel-runtime.vibelock.workers.dev/mcp`. Clean-room **must** use `--local` / `AZIEL_RUNTIME_MCP=local` so it does not depend on production.

---

## What is not required

- Cloudflare account, Wrangler login, or `wrangler deploy`
- `RUNTIME_TOKEN` / `AZIEL_RUNTIME_TOKEN`
- Live `BROWSER` / `CORPUS_D1` / `AI` bindings (unbound → honest refuse)
- Network to the production Worker
- Any secret file

`.env` is gitignored and unused by this script.

---

## Relation to 1.9.3 independent validation

`docs/audit/INDEPENDENT-VALIDATION.md` + `scripts/independent-validate.sh` remain the **npm test + attestation.json** path.

Clean-room **adds** MCP initialize / `tools/list` / harmless call / receipt verify / optional Docker, and writes a **schema-checked** evidence object for 2.0 reviewers.

Both paths set `third_party_lab: false`.
