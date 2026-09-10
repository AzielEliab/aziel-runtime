# CL-WP-0.4 — ChainLock

Author: Aziel Eliab only.

Status: local specification (2026-09-09). Not a Softwares-tab product. Not a fleet-completeness claim.

---

Aziel Eliab · local specification · not a fleet-completeness claim




    ChainLock
    Hash-chain lattice memory for aziel-runtime

    CL-WP-0.4 9 September 2026 Author: Aziel Eliab / GodLock.AZ Status: local specification. Not a public GitHub
    release. Not a fleet-completeness claim. Runtime: chainlock.py · Schema: chainlock_schema.json ·
    Namespace: chainlock@aziel


    0. Sentence
    An AI on this runtime forgets at the session boundary. The lattice does not. ChainLock is the walkable memory
    between those two facts.

    1. Claim
    A local set of append-only chains, cross-linked as a lattice and optionally signed with an SSH key, is enough for an
    MCP-facing model to reconstruct short-term and long-term recollection without an embedding store and without
    rewriting history.

    GodLock already hash-chains a public node. TemporalLock already timestamps receipts. FragGate already appends
    an act ledger. AZL-WP-1.1 already set UI = MCP. None of those give a reader a depth knob. ChainLock does.

    This paper is the doctrine. The spec is ChainLock_v0_spec.md. The kit is the runtime. Recognition is not a third kit.

    2. What it is not
•         Not a public ledger. GodLock remains the public mesh stress-test node at godlock.uk.
•         Not a substitute for TemporalLock receipts or EmbryoLock vaults. Those stay the evidence and sealed-file
          tools. ChainLock indexes and walks them.
•         Not an embedding store. Match is deterministic: tags, subject, chain, time, hash, fact text.
•         Not an untraceable path. SSH stamps identify a local key. Hashes identify bytes.
•         Not FoldLock, SweepGate, or AZPIPE. Those are the wire. This is the memory.
•         Not Unowned Lattice. UL papers stay UL.
•         Not a court filing and not a prophetic document.

    3. Units
    Stamp. One JSON object. Canonical bytes are UTF-8 JSON with sorted keys and separators (',', ':').
    stamp_sha256 is SHA-256 of that encoding with the hash field omitted. prev is the previous stamp's hash on the
    same chain, or GENESIS for sequence zero.

    Card. The wire unit. Slim keys: id, c, k, t, h, fh, s, f, g, r?. Extra facts[] only on capsules. Subject ≤
    80 characters. Fact ≤ 160. Cap 4096 bytes. Hash-only cards are non-compliant. Recollection is the fact text.
    Grounding is h (stamp bytes) plus fh (SHA-256 of the clipped fact).

    Chain. A single hash list stored as jsonl. Default roster: genesis, identity, ssh, session, acts, evidence, recall, mesh,
    library, learn.



CL-WP-0.4 ChainLock                                                                                                             1


Aziel Eliab · local specification · not a fleet-completeness claim




 Lattice. Typed links between stamps (cites, window-start, born-from, from-interact, quarantine). Links do
 not mutate the target.

 SSH stamp. Detached ssh-keygen -Y sign over the canonical stamp bytes in namespace chainlock@aziel.
 Fingerprint lives on the identity chain. Unsigned stamps are chain-valid and not identity-grade.

 Horizon. stm is the hot window. ltm is retained. both is counted in both. Compaction writes a recall capsule.
 Capsules hash the ordered member hashes and store the member facts. Source stamps stay.

 Depth. Six classes. 0 tip. 1 STM. 2 capsules. 3 expand sources. 4 one lattice hop. 5 genesis or budget. auto starts at
 STM and deepens until a query hits or the budget dies.

 4. Recollection
 Short-term: last 16–32 session and acts stamps, plus the live tips.

 Long-term: recall capsules first. Expand a capsule only when the question needs a source stamp. Follow one lattice
 hop only when depth ≥ 4.

 This is the same progressive-disclosure rule the skill loader already uses. Metadata, then body, then the bound file.
 ChainLock applies it to time.

 Every returned fact carries id + h + fh. No claim without a stamp. FragGate door chainlock___door returns a
 grounded FG-CL envelope or refuse=no-stamp. Do not invent a fact to fill the door.

 5. Library tether and adapt
 Origin: https://www.azielcorpuslibrary.net.

 The library chain holds catalog cards only — AZDOC id, title, content_sha256, document chain_tip, receipt
 URL. PDF bodies stay on the site. vault/library.jsonl is the offline shelf. If the Worker dies or a record is
 deleted from the public catalog, recall still has the card.

 tether binds the current SSH identity to the library window hash. One stamp covers the set. New syncs require a
 new tether. Do not invent AZDOC ids or file hashes. Sync from /v1/search. Quarantined rows stay off the shelf.

 Every operator action or choice gets an interact stamp on session. choose / refuse / --learn also write learn.
 Adaptive recall is that chain plus its capsules. This is not a weight file and not a fine-tune.

 6. MCP
 The operator surface is tools, not a page.

 chainlock___status chainlock___append chainlock___walk chainlock___recall chainlock___verify
 chainlock___compact                  chainlock___door              chainlock___mesh_cite   chainlock___library_sync
 chainlock___tether chainlock___interact chainlock___seal chainlock___pipe

 Local process. No public panel. No IP allow/block UI. No Node Gate.

 7. LOCKSET
 seal writes three things that must agree:




CL-WP-0.4 ChainLock                                                                                                       2


Aziel Eliab · local specification · not a fleet-completeness claim




 1. Every live chain tip (id, h, fh). 2. A TemporalLock receipt: neutral timestamp, no narrative, no authority. 3. A
 GodLock cite: https://godlock.uk, pull=false, isolate=true.

 verify is fail-closed. One broken prev, one receipt hash miss, one missing GodLock cite, or one tip drift after seal
 returns lattice:false. Append, interact, or library-sync after seal drifts tips. Reseal.

 This runtime cites GodLock. It does not write the public ledger. The operator posts the lockset SHA-256.

 8. Failure and poison
 Broken prev or mismatched stamp_sha256 isolates that chain. Do not rewrite. Append a verify stamp recording the
 break hash.

 Failed SSH verify flags SSH_FAIL. The stamp stays.

 Poison or unexpected remote citation records on mesh as rel=quarantine. SweepGate airlocks the inbound
 envelope before entry. Remote body does not enter STM.

 Phoenix / ARK re-seal of a bound file does not edit the old stamp. Append a new pointer.

 Court-sealed is a plane tag. It does not encrypt. Use ARK / EmbryoLock for ciphertext. Do not put legal name, home,
 passwords, or privileged plaintext in a stamp body.

 9. Files
   vault/
     chains/<name>.jsonl
     cards.jsonl
     library.jsonl
     receipts/LOCKSET.json
     receipts/TL-<prefix>.json
     keys/allowed_signers
     sigs/<stamp-id>.sig
     index.json

 index.json and cards.jsonl are derived. Source of truth is the jsonl chains. Private SSH keys do not live on the
 artifacts FUSE mount.

 10. Cap
 This does not make the model omniscient. It makes forgetting an explicit depth choice instead of an accident.

 Compat reads CL-0.1 through CL-0.4. New stamps are CL-0.4.

 Companion papers: AP-WP-0.2 (wire), SG-WP-0.1 (airlock), LS-WP-0.1 (fail-closed seal).




CL-WP-0.4 ChainLock                                                                                                       3
