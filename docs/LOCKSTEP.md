# AZ-LOCKSTEP-1.0: runtime, AZInterface, and AZ-OS stay in step

Three independent, optional legs of one system. Each runs standalone. None hard-depends on another being up.

## One source for each shared thing

| Thing | Source (this repo) | Served at |
|---|---|---|
| Design tokens | `design/tokens.json` → `src/lockstep/design-tokens.js`, `design/tokens.css` | `/design/tokens.json`, `/design/tokens.css` |
| Contract (locks, flags, doors, refusal codes, chains, mesh, feature union) | `src/lockstep/contract.js` + `src/lockstep/features.js`, built from code | `/v1/lockstep` (with `contract_sha256`, `tokens_sha256`, `css_sha256`, `hints_sha256`) |
| Consumer check (same file on all three legs) | `src/lockstep/consumer.js` | n/a |

Hashes are SHA-256 over canonical JSON (sorted keys), the same rule as ChainLock.

## Rules

- `npm test` runs `scripts/verify-lockstep.mjs`. It fails if `contract/lockstep.json` no longer equals what the code builds, or if a lock moves (Softwares 42, tools 36, stub ops 363, software_count 33, 2.0.0-rc1). `mesh_node_live`, `alt_internet_live`, and `packet_path_live` are true in the contract. Cap-7 active use is true: `cap7_live`, `cap7_factory_live`, `cap7_active_use`, `cap7_name_plane_live`, and `cap7_is_name_plane`. ICANN and egress locks stay false (`cap7_public_icann`, `cap7_public_egress`, `cap7_registrar_live`, `paid_registrar`, `public_icann`, `public_icann_registrar`, `dns_publish`, `icann_dns_publish`, `public_egress_ip`, `packet_forwarding`, `ip_exit`, `hosted_vpn`, `registrar_live`). Cap-7 is not public ICANN. The other contract flags stay false. A displayed flag is still true only when the leg agrees and proves it.
- After an intended change: `npm run lockstep:build`, then `node scripts/lockstep-vendor.mjs ../azinterface` and `../azos`. Each leg's `npm test` re-hashes its vendored copy against `LOCKSTEP.pin.json` and, with `LOCKSTEP_REMOTE=1`, against runtime `main`.
- A leg's `GET /v1/lockstep` compares its pin with the runtime over the `AZIEL_RUNTIME` binding: `agree`, `drift`, or `absent` (the runtime is unreachable; the leg keeps running standalone). A displayed flag is true only on `agree` and when the contract says true and the leg itself proves it. Otherwise it shows false.
- The feature union (`src/lockstep/features.js`) lists every feature any leg has: `native`, `proxied`, `source`, or `gap`. A gap is listed so it can't be forgotten, and it is never painted as present. Each leg's test checks that every route it doesn't mark as a gap answers.
- All three tether to the same chains (`chains.*`: ChainLock primary and secondary lattice, genesis, hash rules, tether spec and public key) and the same mesh (`mesh.*`).

CI note: AZInterface and AZ-OS have no GitHub workflow. The token used to open these PRs lacks `workflow` scope, so the check lives in each leg's `npm test`. Adding a workflow that runs `npm test` needs a token with `workflow` scope.
