# LS-WP-0.1 — LOCKSET

Author: Aziel Eliab only.

Status: local specification (2026-09-09). Not a Softwares-tab product. Not a fleet-completeness claim.

---

Aziel Eliab · local specification · not a fleet-completeness claim




    LOCKSET
    ChainLock × TemporalLock × GodLock

    LS-WP-0.1 9 September 2026 Author: Aziel Eliab / GodLock.AZ Status: local specification. Cite, do not
    impersonate the public ledger. Command: chainlock.py seal · Rule: one member fail fails the set


    0. Sentence
    Public verification of local memory is a three-body lattice, not a single hash. If one member fails, the set is false.

    1. Claim
    ChainLock holds tips. TemporalLock writes a neutral receipt. GodLock is the public cite. Those three must agree on
    one canonical object called LOCKSET. Agreement is mechanical: hashes match, tips have not drifted, both
    companion blocks exist.

    This is the same instinct as GodLock citation-over-reanswer and as TemporalLock's refusal to narrate. LOCKSET
    just binds them so a reader cannot treat a local vault as "verified publicly" when the public cite is missing.

    2. What it is not
•         Not a GodLock write path. seal cites https://godlock.uk. The operator posts the lockset SHA-256.
•         Not a TemporalLock rewrite. The receipt is a new file under vault/receipts/. Old receipts stay.
•         Not encryption. LOCKSET does not seal privileged plaintext. It seals hashes of public-plane cards.
•         Not a live QNM membership proof.

    3. Members
    Each live chain contributes:

•         c chain name

•         id tip stamp id

•         h tip stamp_sha256

•         fh SHA-256 of the clipped tip fact

    Chains with no stamps are omitted. Empty vault cannot seal.

    Temporal block:

•         kind: TemporalLock
•         ts: UTC
•         note: "Neutral receipt. No narrative. No authority."
•         n: member count

    GodLock block:

•         node: godlock



LS-WP-0.1 LOCKSET                                                                                                               1


Aziel Eliab · local specification · not a fleet-completeness claim




•         url: https://godlock.uk
•         cite: public-verify
•         pull: false
•         isolate: true

    lockset_sha256 is SHA-256 of the canonical JSON of those fields with the hash field omitted. The file
    vault/receipts/LOCKSET.json      is the live set. A copy vault/receipts/TL-<prefix>.json is the
    TemporalLock receipt. A mesh stamp records the cite. After that mesh append, members are recomputed so the mesh
    tip is inside the set.

    4. Verify
    chainlock.py verify now returns lattice as well as per-chain ok.

    Fail-closed conditions:

•         any chain prev break, body-hash miss, stamp-hash miss, or SSH-fail
•         LOCKSET file missing after a seal has been made (sealed vaults only; unsealed vaults verify chains alone)
•         LOCKSET file unreadable
•         stored lockset_sha256 ≠ recomputed hash
•         any stored tip h ≠ live tip h (tip drift)
•         missing godlock block
•         missing temporal block

    Any one of those sets ok: false and lattice: false. Breaks are listed. History is not rewritten.

    5. Drift
    Interact, append, library-sync, mesh-cite, and compact all move tips. That is correct. The set is a snapshot. After
    material change, seal again. An old TL receipt remains as history. The live file is always LOCKSET.json.

    6. Public path
    Post the lockset SHA-256 on GodLock. Do not upload stamp bodies. Citation over reanswer. 777s-class anti-poison
    on the public node is unchanged.

    Split the wires (ingest law). The 1s tick is presence + tip hash only. Update is a proof, not a timer. The receiver already holds prev and the lockset.
    A new tip must cite that prev, match this lockset rule, and verify fail-closed. 777s is dwell after a valid cite,
    not “wait then take whatever arrived.” Clock desync is not a yes. Ambiguous tip is isolate, not merge.
    Equivocation (same prev, two different tips from one node) ends that peer, not the chain. Quorum cannot
    outvote a broken hash. Majority is not truth. Payloads are pull-only. The 1s tick never carries a body.

    Cold-copy survival. Multiply cold copies. Refuse live body sync across the network. Tips are
    content-addressed and expensive to erase. A single-server pull does not kill local verify/append.
    Data outlives creators. Payloads stay pull-only cold. Named hosts only. Hash-absolute poison refuse.

    Re-expand-from-archive. Bytes survive, not summaries. Restore from archive after prev-hash
    verify. Not mesh from index. Crawlers are extra shelves only. Training residue is rumor.

    REHEAL. Isolation is the cure. Heal from own last good tip + verified trusted pull, or
    phoenix-WAIT. Never by listening to neighbors. No bodies, diffs, or vote-to-fix.

    CROSS-NETWORK-SURVIVAL-1.0. If network and data die tomorrow, the chain survives on cold shelves
    (hosts / DOI / git / vault). Die-with-the-pull, split-the-wires, cold-copy, re-expand, and REHEAL
    sit under that sentence. The live mesh is not a shelf.

    A reader who has the vault and the public cite can check: recompute the lockset hash, confirm the GodLock entry
    names that hash, confirm live tips still match. If GodLock is dark, the local receipt still exists. That is site-fail
    resilience, not public verification.

    7. Cap
    Seal cites. It does not write the GodLock ledger from this runtime. Do not print legal name or home on the receipt.

    Companion papers: CL-WP-0.4, AP-WP-0.2, SG-WP-0.1.




LS-WP-0.1 LOCKSET                                                                                                           2
