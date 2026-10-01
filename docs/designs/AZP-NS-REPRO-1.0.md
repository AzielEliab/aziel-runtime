# AZP-NS-REPRO-1.0 — reproduce the fixture gates

**Author:** Aziel Eliab only.  
**Runtime:** 2.0.0-rc1.  
**Not a Softwares card. No new MCP tool.** Softwares stay 42. `tools/list` stays 36.

This document is the reproduction path for the AZP-NS-1.0 fixture gates. It does not deploy a Worker, change DNS, or paint Plane B LIVE. A green run is not a live multi-provider result. `live_multi_provider` stays false. Encryption of the payload is not anonymity. The network is not claimed to be anonymous. The network is not claimed to be unkillable.

## Clone and install

The repository already installs with npm. Node 22 is the CI version. No extra registry. No Cloudflare credential. No `wrangler deploy`.

```bash
git clone https://github.com/AzielEliab/aziel-runtime.git
cd aziel-runtime
npm install
node scripts/verify-azp-ns-repro.mjs
```

`npm run test:azp-ns` is the same command. `npm test` also runs each gate once, later in the full suite.

The wrapper exits non-zero if any fixture gate exits non-zero, if a row is painted `LIVE`, or if a required honesty row is missing or marked pass.

## Gate order

The wrapper runs these scripts in this order:

1. `scripts/verify-keystore.mjs`
2. `scripts/verify-envelope-v2.mjs`
3. `scripts/verify-replay.mjs`
4. `scripts/verify-relay.mjs`
5. `scripts/verify-checkpoint.mjs`
6. `scripts/verify-checkpoint-quorum.mjs`
7. `scripts/verify-replication.mjs`
8. `scripts/verify-provider-loss.mjs`
9. `scripts/verify-disaster-recovery.mjs`
10. `scripts/verify-transport-adversarial.mjs`
11. `scripts/verify-key-compromise.mjs`
12. `scripts/verify-privacy-metadata.mjs`

Fixture rows must pass. The paper that maps them is [`AZP-NS-1.0.md`](AZP-NS-1.0.md).

## Rows that must not pass here

These ids are `SKIP` or `SLOT`. The wrapper checks that each one appears with `ok: false`. Do not mark them pass without the real machines.

| Id | Why |
|---|---|
| `live-vps` | Node B, an independent VPS, is not provisioned. OPERATOR. SKIP until that host exists. |
| `plane-b-framagit` | Plane B Framagit URL is null. SLOT until a real deposit exists. Do not invent a URL. |
| `live-multi-provider` | No second live provider. `live_multi_provider` stays false. Do not paint this PASS. |
| `destroy-live-provider` | Live destruction of Cloudflare, a VPS, or a home node is operator work. SKIP. |

Related rows in `verify-provider-loss.mjs`, also not passes:

| Id | Mode | Why |
|---|---|---|
| `node-c-separate-provider` | SKIP | Node C, a separate provider, is not provisioned |
| `node-d-self-hosted` | SKIP | Node D, a self-hosted machine, is not provisioned. `lose-one-node` is an in-memory fixture |
| `archive-e-cold` | SLOT | Codeberg and archive.org tip-pack hash PASS is an operator record (pack `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`, lockset tip `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`). This script does not fetch those bytes. Plane B stays SLOT until a real Framagit URL. The URL is null |

Node A is the production Cloudflare Worker. It is already deployed. These scripts do not contact it and do not destroy it. `kill-primary-provider` only deletes an in-memory replica.

## What a stranger should see

- Each fixture script prints a closing `ok` line.
- Scripts that carry a report print JSON with `report[]` entries of `FIXTURE`, `SKIP`, or `SLOT`.
- `verify-privacy-metadata.mjs` prints `fields`, `observer`, `reveals`, `necessary`, and `claim_limits`. `anonymous` is false. `encryption_addressed_is_anonymity` is false.
- The wrapper prints `softwares: 42` and `tools: 36`.
- No row uses mode `LIVE`.

## Operator work this file does not do

Provision node B (VPS), node C (separate provider), and node D (self-hosted). Deposit the existing tip-pack on Framagit and return the real URL. Only then can Plane B move from SLOT to LIVE, and only after a hash check of those bytes. Do not invent a Framagit, VPS, or Zenodo URL. Do not change DNS. Do not add a Softwares card.
