# SG-WP-0.1 — SweepGate

Author: Aziel Eliab only.

Status: local specification (2026-09-09). Not a Softwares-tab product.

---

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



SG-WP-0.1 SweepGate                                                                                                             1


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




SG-WP-0.1 SweepGate                                                                                                              2
