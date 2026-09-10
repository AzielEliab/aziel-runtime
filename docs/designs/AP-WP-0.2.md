# AP-WP-0.2 — AZPIPE

Author: Aziel Eliab only.

Status: local specification (2026-09-09). Not a Softwares-tab product. Not a fleet-completeness claim.

---

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
    Public hop list is LOCKED as of runtime 1.7.0 (MASTER-33). SUITE-PIPE-1.6.15 is
    historical. The fold-centric list below is INTERNAL fld3-wire only — not the
    public arch() / UI strip / skill cite.

    Locked inbound (public, FragGate-first):
     Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate
     → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE
     → Internal Domain Layer → optional ASE → RoseClock → TemporalLock
     → ChainLock-OUT → ForgeReceipts → Return

    Locked outbound (sensible reverse):
     Return → ForgeReceipts → ChainLock-OUT → TemporalLock → StaticClock → RoseClock
     → optional ASE → Internal Domain Layer → AZPIPE → DecisionGATE → Provenance
     → Sentinel → SweepGate → Lamb Lens → FragGate → PUBLIC/UI/AGENT/API
     → AZInterface → Human

    Internal fld3-wire (not the public hop list):
     fold → static → fold

    Historical fold-centric list (superseded on the public surface):
     frag → sweep → fold → static → fold → entry → frag → toolkits

    Historical outbound (superseded on the public surface):
     toolkits → frag → fold → static → fold → sweep → frag

    frag (first). DecisionGATE flags D/E/I/G/R. Empty or ungrounded inbound refuses before SweepGate spends work.
    FragGate remains the kernel. This hop does not replace FragGate.

    sweep. SweepGate airlock. Poison marks, malware-class structural marks, block-keys, off-origin URLs. Isolate and
    refuse. Do not merge. See SG-WP-0.1.

    fold (first). FoldLock FLD3. If foldlock.py sits beside azpipe.py, load suppress / fold / tether_suppress.
    Otherwise fld3-wire: non-allowlisted http(s) becomes [FLD3:url]; keys named password, private_key, secret,



AP-WP-0.2 AZPIPE                                                                                                           1


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



AP-WP-0.2 AZPIPE                                                                                                       2


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

 Companion papers: CL-WP-0.4, SG-WP-0.1, LS-WP-0.1, SUITE-PIPE-1.6.15, 4DM-WP-1.0.

 9. Runtime 1.6.15 — locked public list
 The Worker public arch() / UI strip / skill / OpenAPI / llms / cite show the locked
 suite order. Illegal reorder is refused. LambGate is not a hop. 4DMap (`4dmap`) is
 cited at Domain Doors as a read-side inspection frame, not a sequential gate.
 SweepGate / ChainLock / AZPIPE remain fabric (not Softwares-tab). Identity Aziel Eliab only.




AP-WP-0.2 AZPIPE                                                                                                   3
