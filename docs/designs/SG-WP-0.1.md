# SG-WP-0.1 — SweepGate

Author: Aziel Eliab only.

Status: local specification (2026-09-09). Not a Softwares-tab product. Not a fleet-completeness claim.

---

SweepGate, or AZPIPE. Those are the wire. This is the memory.
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



Aziel lattice whitepapers 2026-09-09                                                                                            1


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
 chainlock___compact                   chainlock___door             chainlock___mesh_cite   chainlock___library_sync
 chainlock___tether chainlock___interact chainlock___seal chainlock___pipe

 Local process. No public panel. No IP allow/block UI. No Node Gate.

 7. LOCKSET
 seal writes three things that must agree:




Aziel lattice whitepapers 2026-09-09                                                                                      2


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




Aziel lattice whitepapers 2026-09-09                                                                                      3


Aziel Eliab · local specification · not a fleet-completeness claim




    AZPIPE
    Fold-locked API path for aziel-runtime

    AP-WP-0.2 9 September 2026 Author: Aziel Eliab / GodLock.AZ Status: local specification. Not a
    fleet-completeness claim. Runtime: azpipe.py · Magic: FLD3 · Version: AZPIPE-0.2


    0. Sentence
    All data on the API, in and out, travels a fixed hop list. Architecture is visible on the envelope. Memory and tools
    never see raw inbound bytes.

    1. Claim
    A Worker, a library call, a mesh cite, and an MCP tool response are the same class of object once they enter
    aziel-runtime: a payload that must be refused or admitted. AZPIPE is the admission path.

    FoldLock is the suppression hop. StaticClock-style freeze is the hash hop. FragGate is the refuse/door hop.
    SweepGate is the airlock. ChainLock is entry. Toolkits run last.

    The hop list is the architecture. Changing product names does not change the list.

    2. What it is not
•         Not zip and not encryption. FoldLock is tether-word suppression on UTF-8.
•         Not a TETH-1 completeness claim while foldlock.py is absent. Current hop is fld3-wire: allowlisted
          origins plus block-keys.
•         Not a public Node Gate panel.
•         Not QNM launch. The envelope reserves two bridges, isolate, and no body pull. Cells of 25 are specified
          elsewhere. This pipe does not join a cell.
•         Not a substitute for host AV, sandboxing, or EmbryoLock wipe.

    3. Hops
    Inbound:
     frag → sweep → fold → static → fold → entry → frag → toolkits

    Outbound:
     toolkits → frag → fold → static → fold → sweep → frag

    frag (first). DecisionGATE flags D/E/I/G/R. Empty or ungrounded inbound refuses before SweepGate spends work.
    FragGate remains the kernel. This hop does not replace FragGate.

    sweep. SweepGate airlock. Poison marks, malware-class structural marks, block-keys, off-origin URLs. Isolate and
    refuse. Do not merge. See SG-WP-0.1.

    fold (first). FoldLock FLD3. If foldlock.py sits beside azpipe.py, load suppress / fold / tether_suppress.
    Otherwise fld3-wire: non-allowlisted http(s) becomes [FLD3:url]; keys named password, private_key, secret,



Aziel lattice whitepapers 2026-09-09                                                                                       4


Aziel Eliab · local specification · not a fleet-completeness claim




 ssn, legal_name, home_address become [FLD3:block].

 Allowlist: https://www.azielcorpuslibrary.net, https://godlock.uk, https://www.azieleliab.com,
 https://aziel-runtime.vibelock.workers.dev.

 static. Canonical JSON (sorted keys, tight separators). Body SHA-256. Fact SHA-256. Pinned UTC timestamp. The
 freeze is what later hops hash. Volatile paths do not belong in the frozen body.

 fold (second). Defense in depth. Tethers that appear only after canonicalization get the same suppression.

 entry. ChainLock. Stamp, interact, recall, seal. The payload is now a fact-bearing card.

 frag (second). Door before toolkits. Grounded claim or refuse. Toolkits do not run on an ungrounded envelope.

 toolkits. Named MCP tools only.

 Outbound is the reverse so a dirty toolkit result is swept before it rides a QNM bridge.

 4. Envelope
   {
       magic: "FLD3",
       v: "AZPIPE-0.2",
       dir: "in" | "out",
       path: [...hops],
       ok: true | false,
       h: sha256(inner),
       fh: sha256(clipped fact),
       isolate: {in, out},
       gates: {D,E,I,G,R,refuse},
       sweep: {airlock, hits, isolate, pull},
       foldlock: bool,
       teth: "foldlock.py" | "fld3-wire",
       qnm: {ready, pull:false, bridges:2, isolate:true},
       inner: {entry, toolkit, static}
   }

 Refuse envelopes stop at the hop that closed. They do not carry inner into memory.

 Every ChainLock emit card also carries a thin pipe:{v,magic,path,h,fh,iso,qnm} so MCP output stays under
 4096 bytes without dumping the full envelope. Full envelope: chainlock.py pipe --dir in|out --json
 '{…}'. Architecture: pipe --arch.


 5. Isolate
 Both directions isolate on the fact hash fh, not the whole stamp dump. Body hash remains on the freeze for byte
 integrity. QNM cites fh. Remote body does not enter STM.

 Two payloads with the same fact text share fh. Two payloads with the same fact text and different wrapping URLs
 do not share body hash after fold, because off-origin URLs fold to a mark. That is intended.

 6. Why this order
 Frag first so SweepGate does not chew empty noise.

 Sweep before fold so poison never becomes a folded "clean" string.



Aziel lattice whitepapers 2026-09-09                                                                                   5


Aziel Eliab · local specification · not a fleet-completeness claim




 Fold before static so the freeze hashes the folded bytes.

 Second fold after static so canonicalization cannot reintroduce a tether.

 Entry only after the airlock is open.

 Second frag so toolkits cannot run on an ungrounded card.

 Outbound sweep so the mesh never ingests a toolkit leak.

 A shorter list (frag–sweep–entry–frag) drops FoldLock and the freeze. That is cheaper and weaker. Long-term QNM
 needs both.

 7. QNM slot
 bridges=2, pull=false, isolate=true, sweep-before-ingest. Poison drops the tether. Tamper isolates from
 chain. This paper does not claim a live fleet or a qubit.

 8. Cap
 fld3-wire is not TETH-1. Drop foldlock.py next to azpipe.py to switch lexicons without changing hops.

 Companion papers: CL-WP-0.4, SG-WP-0.1, LS-WP-0.1.




Aziel lattice whitepapers 2026-09-09                                                                               6


Aziel Eliab · local specification · not a fleet-completeness claim




    SweepGate
    Airlock, anti-poison, structural malware-class sweep

    SG-WP-0.1 9 September 2026 Author: Aziel Eliab / GodLock.AZ Status: local specification. Not a commercial
    antivirus product. Runtime: sweepgate.py · Version: SG-0.1


    0. Sentence
    A node mesh cannot treat inbound bytes as memory until they pass an airlock. SweepGate is that airlock. Isolate. Do
    not merge.

    1. Claim
    Public surfaces attract scrapers, prompt-injection, and drive-by payloads. GodLock already refuses poison on a
    777-second class interval and cites instead of reanswering. SweepGate generalizes that refuse onto the AZPIPE hop
    list so every Worker, library call, and MCP envelope hits the same sieve before ChainLock entry.

    The sieve is structural. It looks at the bytes. It does not claim vendor detection names, heuristic completeness, or host
    protection.

    2. What it is not
•         Not Windows Defender, ClamAV, or a Cloudflare WAF product.
•         Not FoldLock. FoldLock suppresses tethers. SweepGate decides whether the envelope is admitted.
•         Not FragGate. FragGate is the grounded-claim kernel. SweepGate is the airlock in front of it.
•         Not a public Node Gate panel and not an IP allow/block UI. Hits are server-side. Gate config stays in
          gate_config.json.

•         Not a promise that malware cannot run on the operator's laptop.

    3. Classes
    Poison. Marks such as inject-payload, jailbreak-ignore, exfiltrate, and explicit poison tokens. These are APG
    cousins. A hit isolates. The mesh records rel=quarantine. STM does not ingest the body.

    Airlock-block. Keys and leftovers named password, private_key, secret, legal_name, home_address. Closed airlock.
    The runtime does not want those strings in cards or in a Worker log.

    Off-origin. http(s) URLs that do not start with the allowlist (azielcorpuslibrary.net, godlock.uk, azieleliab.com,
    aziel-runtime). FoldLock will later mark them [FLD3:url]. SweepGate can isolate first when the envelope is
    inbound and untrusted.

    Malware-class. Structural marks only:

•         script tags
•         eval(

•         PowerShell -enc
•         cmd.exe



Aziel lattice whitepapers 2026-09-09                                                                                            7


Aziel Eliab · local specification · not a fleet-completeness claim




•          MZ / base64 MZ headers
•          /bin/sh and rm -rf /

•          dropper / meterpreter tokens

    A hit is hits: ["malware-class"], airlock: closed, refuse: sweep-isolate. It is not a CVE name.

    4. Wire
     {
         v: "SG-0.1",
         ok: true | false,
         airlock: "open" | "closed",
         hits: [...],
         isolate: bool,
         pull: false,
         qnm: "sweep-before-ingest",
         h: sha256(raw)[:32]
     }

    AZPIPE inbound calls SweepGate after first frag. If isolate is true the envelope returns immediately. No fold. No
    static. No entry. No toolkit.

    AZPIPE outbound calls SweepGate after the toolkit result is folded and frozen, so a dirty tool cannot ride a bridge.

    5. Mesh
    Sweep runs before QNM cell ingest. Cite the hash. Drop the tether. Quarantine stays on the mesh chain. Two rotating
    bridges, when live, only forward envelopes with airlock: open and pull: false.

    Operator traffic is not a special public button. Operator bypass, if any, is a server-side token in gate config. Same rule
    as cost control on the Worker: no Node Gate panel.

    6. Relation to cost and poison
    The Cloudflare bill that motivated rate limits is a cousin problem. Scrapers that walk every software tab also walk
    KV. SweepGate does not replace per-visitor request caps. It stops the class of payload that should never become a
    card even if the visitor is under quota.

    7. Cap
    This is a structural sieve on the pipe. It does not replace host AV, sandboxing, Cloudflare WAF, or EmbryoLock
    wipe policy. Expanding the mark list is an operator act and must be stamped on learn.

    Companion papers: CL-WP-0.4, AP-WP-0.2, LS-WP-0.1.




Aziel lattice whitepapers 2026-09-09                                                                                             8


Aziel Eliab · local specification · not a fleet-completeness claim
