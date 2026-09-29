# Sidenet P3 — home-origin / mini-PC (SLOT)

Author: Aziel Eliab only.
Spec: ORIGIN-CUTOVER-1.0 · COLD-MULTI-SHELF-1.0 · CROSS-NETWORK-SURVIVAL-1.0 · REHEAL-1.0
Status: **SLOT**. Not deposited. No operator facts on file.

This checklist scaffolds a later mini-PC copy. It does not rent DNS, does not
change live Cloudflare DNS, and does not mark the shelf LIVE.

## Facts this repo does not have

- No home hostname
- No home IP
- No tunnel token
- No rented domain
- No deposited home-origin tip pack
- No operator attest (`OC-NO-OPERATOR-FACTS`)

Leave these null. Do not invent them.

## Leave the live hubs alone

These names stay where they are. Do not swap A records. Do not point an apex
at a house or a VPS. Do not publish a residential address.

1. https://www.azieleliab.com/
2. https://www.azielcorpuslibrary.net/
3. https://godlock.uk/
4. https://www.hedidntjump.com/

Plane A remains 5 published surfaces / 2 family radii (`cloudflare`, `github`) /
1 independent live. This path is not a sixth surface.

## What a mini-PC may do later

1. Copy an already-published tip pack onto the machine (USB or an existing
   SLOT mirror such as Codeberg). That copy is still not a new LIVE shelf.
2. Off the public DNS path, check the bytes:

   ```bash
   sha256sum -c SHA256SUMS
   ```

   or `verify-airgap.sh` from the pack. Expect pack SHA-256
   `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`
   and lockset tip
   `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`
   only when those files are the published pack.
3. A local match does **not** set `home-origin-mini-pc` to `live`.
4. LIVE needs a real deposit whose hash verifies, then an operator attest of
   facts that are not in this repo. Until then the row stays SLOT
   (`OC-HOME-ORIGIN-SLOT`, `OC-NOT-DEPOSITED`).

## Phoenix / REHEAL

If a public name is pulled, phoenix-WAIT on the failed node. Neighbors do
not phoenix because a neighbor phoenix’d. Do not aim DNS at the mini-PC to
bring the name back (`MESH-STUB`). Do not heal from neighbor votes
(`MESH-NO-NEIGHBOR-HEAL`). REHEAL-1.0 is own last good tip plus a verified
trusted pull, or phoenix-WAIT.

## Do not

- Rent or register a domain (`OC-NO-DNS-RENT`).
- Change live hub DNS (`OC-NO-LIVE-DNS-CHANGE`).
- Write a hostname or IP into the registry (`OC-NO-INVENTED-HOST`).
- Paint this SLOT row as LIVE.
- Invent a Zenodo DOI (`CNS-ZENODO-NOT-LIVE`, `doi` null).
- Count the four hubs plus GitHub as five independent shelves.
- Add a Softwares card or a FragGate slug.

Machine cite: `GET /shelves` field `origin_cutover`. Paper:
`docs/designs/ORIGIN-CUTOVER-1.0.md`.
