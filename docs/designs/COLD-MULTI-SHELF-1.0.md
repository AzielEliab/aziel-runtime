# COLD-MULTI-SHELF-1.0 — Planes A / B / C (NO-FAN)

Author: Aziel Eliab only.

Status: LIVE law cite (2026-09-14). Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.

Companion under the umbrella: [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) (does not replace the machine tip). Neighbor: [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md). Mesh rollup: [NODE_MESH](../NODE_MESH.md). Executable: `src/cold-multi-shelf.js`.

Source of truth: live corpus [GET /shelves](https://www.azielcorpuslibrary.net/shelves) (corpus#96). This runtime cites that registry. It does not invent a second tip.

Live lockset: `AZLOCK-INGEST-REEXPAND-1.0` tip `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`. This paper cites that tip; it does not replace it.

---

Aziel Eliab · law · bytes↔hash · no rewrite key


    COLD-MULTI-SHELF-1.0
    Planes A/B/C: A=one CF/GitHub tunnel (5 surfaces / 2 family radii,
    not 5 shelves); B=alt independent forge/archive tip-pack SLOT;
    C=USB airgap SLOT. Survival = bytes↔hash. LIVE only after hash verify.

    Identity: Aziel Eliab only
    Person @id: https://www.azieleliab.com/#aziel
    Close tests: scripts/verify-cold-multi-shelf.mjs


0. Sentence
CROSS-NETWORK-SURVIVAL is not an essay. Survival planes are **A / B / C**.
Plane A is one CF/GitHub tunnel: four host mirrors + git = **5 published
surfaces** and **2 family radii** (cloudflare + github), counted as **one**
independent live (`cf-github`). Plane B is an alternate independent
forge/archive tip-pack **SLOT**. Codeberg hash-verify PASS; archive.org +
GitFlic URL null until verified. LIVE only after all three
(`CNS-PLANE-B-ALL-TARGETS`). Zenodo refused (`CNS-ZENODO-IP-BAN`). `doi` null.
Plane C is the USB airgap pack, SLOT until `CNS-OPERATOR-ATTEST`. Survival
is bytes↔hash. LIVE only after hash verify. Never invent a DOI.

1. Mandate (NO-FAN / NO-LIE)
If the Cloudflare tunnel and the AzielEliab GitHub org die together, Plane A
is gone. That is **one** independent live blast radius in a two-radius family.
Counting azieleliab.com + azielcorpuslibrary.net + godlock.uk +
hedidntjump.com + GitHub as five independent shelves is a lie
(`CNS-SURFACES-NOT-INDEPENDENT`).

aziel-runtime (this Worker + `github.com/AzielEliab/aziel-runtime`) is the
**same** Plane A tunnel. It is **not** a sixth published surface and **not**
an independent shelf (`CNS-RUNTIME-NOT-SHELF`).

Paper archive records are not Plane B. cite.json / lockset `doi` stay `null`.
Do not invent a DOI. Operator IP is banned at Zenodo — do not keep Zenodo as
the Plane B working shelf.

2. Planes

  Plane   Job                                              Status today

  A       LIVE multi-host, same tunnel. Four mirrors +     LIVE as one
          git. 5 published surfaces / 2 family radii.      independent plane
  B       Public off-CF alternate independent              SLOT — Codeberg
          forge/archive tip-pack (Codeberg / archive.org   PASS; archive.org
          / GitFlic RU).                                   + GitFlic unverified
  C       Offline USB airgap + optional extra forge.       SLOT until
                                                           CNS-OPERATOR-ATTEST

≥3 independent shelves means A + B + C all LIVE after hash verify. Today only
A is LIVE. `independent_live_count` is 1. `independent_requirement_met` is
false until B and C verify.

2.1 Plane A — one tunnel, five published surfaces, two family radii

Hosts (same tip, same plane):

1. https://www.azieleliab.com/ — lockset / receipts / shelves
2. https://www.azielcorpuslibrary.net/ — lockset / receipts / shelves (corpus Worker origin)
3. https://godlock.uk/ — lockset / receipts / shelves
4. https://www.hedidntjump.com/ — lockset / receipts / shelves

Git on the same plane: https://github.com/AzielEliab/aziel-corpus (tags
`v2.6.2` `8ba6d9331da4854858e8e4c94319d402c36508e5`, `v0.1.0`
`176172847f828ec4f20bfbb388c1edfcace64b8b`).

`published_surfaces: 5`. `family_blast_radii: cloudflare, github`.
`independent_live_blast_radii` stays `cf-github`. This is **not** five
independent shelves. Refuse `CNS-PLANE-A-ONE-TUNNEL` /
`CNS-SURFACES-NOT-INDEPENDENT` if a later paper counts the five surfaces
as five.

2.2 Plane B — alternate independent forge/archive tip-pack (SLOT)

Working targets for LIVE promotion: Codeberg, archive.org, GitFlic (RU).
Plane B stays `slot` until **all three** hash-verify (`CNS-PLANE-B-ALL-TARGETS`).

- Codeberg tip-pack: https://codeberg.org/AzielEliab/aziel-lockset-tip (`main`).
  Pack SHA-256 `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`.
  Hash-verify PASS against the published lockset tip. Status remains **slot**.
- archive.org + GitFlic RU stay `url: null` until verified. Do not invent a URL.
- Zenodo tip-pack is `refused` (`CNS-ZENODO-IP-BAN` + `CNS-NO-TIP-DOI`).
- Lockset / cite `doi` stays `null`.
- Existing Aziel Eliab paper deposits are companion paper cites.
  `reuse_as_plane_b: false`. They are not LIVE tip shelves.

2.3 Plane C — USB airgap (primary) + optional extra forge

USB airgap export is the Plane C primary pack (tarball + SHA256SUMS + verify
script). Copy those bytes off-network. USB offline-verify (`verify-airgap.sh`
/ `sha256sum -c SHA256SUMS` against the published tip), then operator attest.
The shelf is LIVE only after `CNS-OPERATOR-ATTEST`.

Optional extra forge slot remains empty. Codeberg / GitFlic are Plane B
working targets, not a substitute for USB attest. Do not invent a URL
(`CNS-NO-FORGE-MIRROR`).

3. Runtime surfaces (AZindex)

This Worker cites the same honesty on:

- `GET /shelves` · `GET /cold-copy` · `GET /v1/shelves` · `GET /v1/cold-copy`
- `/cite.json` `shelves` / `cold_multi_shelf`
- `/llms.txt` · `/ai.txt`
- `/openapi.json`
- `GET /v1/software` catalog
- MCP `runtime_skill` (no new tool)

Corpus SoT remains https://www.azielcorpuslibrary.net/shelves.
Verify (paste hash, yes/no) lives on corpus `/receipts/verify`.

Cap-7 semantic bridge stays **designs only**: `resolves_to_hub: false`.
`public_icann: false`. No fifth product. Dual-surface MCP/OpenAPI. Growth-ON
crawlers Allow. Full AI client set. No visible 15:20 chrome. Person `@id`
https://www.azieleliab.com/#aziel.

4. What this is not
- Not a Softwares-tab product. Do not add slug `shelves` or `cold-multi-shelf`.
- Not a FragGate engine. No `fraggate_call { slug: "shelves" }`.
- Not a new MCP tool. `PUBLIC_MCP_TOOLS` stays frozen.
- Not a sixth published surface. Runtime is Plane A tunnel.
- Not five independent shelves. Not four independent CF hosts.
- Not a live AZ-GEN / Cap-7 ICANN publish.
- Not an invented DOI, CID, archive.org item, or GitFlic URL.
- Not a Remain-OFF flip. Do not enable remain-off items.
- Not visible 15:20 chrome. Survival is a hash tip, not a clock face.
- Not a rewrite of the machine tip. CROSS-NETWORK-SURVIVAL-1.0 stays the tip.

5. Close tests
- `/cite.json` `shelves.spec` equals `COLD-MULTI-SHELF-1.0`.
- `/cite.json` `shelves.lockset_doi` is null. `shelves.plane_b.doi` is null.
- `/cite.json` `shelves.independent_live_count` is 1.
- `/cite.json` `shelves.published_surfaces` is 5.
- `/cite.json` `shelves.runtime_is_shelf` is false.
- `/shelves` registry matches corpus#96 honesty (Codeberg PASS still SLOT;
  archive.org + GitFlic URL null; Zenodo refused; Plane C SLOT).
- `/llms.txt` and `/ai.txt` carry the same plane rule.
- OpenAPI documents `GET /shelves` and `GET /v1/shelves`.
- No Softwares-tab card. No FragGate slug. No new MCP tool.
- Cap-7 `resolves_to_hub: false`. `public_icann: false`. No fifth product.
- Person `@id` https://www.azieleliab.com/#aziel. No visible 15:20.
- Remain-OFF untouched.

6. Cap
Plane A is one LIVE CF/GitHub tunnel (5 published surfaces / 2 family radii /
1 independent live). Plane B is an alt independent forge/archive SLOT until
all three working targets hash-verify. Zenodo is refused (`CNS-ZENODO-IP-BAN`).
`doi` null. Plane C is the USB airgap pack (SLOT until attested). Survival is
bytes↔hash. Identity: Aziel Eliab only.
