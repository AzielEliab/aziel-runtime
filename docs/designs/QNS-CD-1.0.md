# QNS-CD-1.0 — Quantum Node Signal coding design

Author: Aziel Eliab only.

Status: LIVE fabric coding design (2026-09-10). Not a Softwares-tab product. Not a FragGate slug. Not a fleet-completeness claim.

---

Aziel Eliab · coding design · photon QNS1 1.3 · local qnsd only



    Quantum Node Signal
    Packet-transfer coding design for photon vias

    QNS-CD-1.0  10 September 2026  Author: Aziel Eliab
    Companion: QNM-BUILD-1.0 / AIH-WP-1.3 (qnm-node)
    Hub / Interface law (unchanged): AIH-WP-1.1
    Implementation: local process qnsd in https://github.com/AzielEliab/qnm-node
    Public Worker: cites only. Never a remote wipe or control plane.


0. Sentence
A Quantum Node Signal is a folded, airlocked, fact-hashed frame that may travel a
photon via on local qnsd. The public Worker names the law. It does not carry the
via.

1. Claim
QNM-BUILD-1.0 already said: local process ON, public rollup OFF, GET /v1/mesh never
enables. AIH-WP-1.3 already said: pair_id is medium-independent; bearer is hop-only;
forward only along existing spiderweb edges after APG.

This paper is the **coding design** for the packet that rides those edges: photon
**QNS1 1.3**. The daemon is **qnsd**, a local module of qnm-node. It binds
**127.0.0.1** only.

aziel-runtime already admits Worker traffic through AZPIPE (AP-WP-0.2), SweepGate
(SG-WP-0.1), APG on the local node, and ChainLock (CL-WP-0.4). qnsd uses **the same
laws** on the loopback hop. Changing product names does not change the list.

2. What it is not
•         Not a Softwares-tab product. Do not add slug qns, qnsd, or photon.
•         Not a FragGate engine. No fraggate_call { slug: "qns" }.
•         Not qubit hardware, Bell-pair physics, or a quantum computer claim.
•         Not a public proxy of 127.0.0.1. The Worker must not emit, via, wipe,
          scorch, arm, or forward on behalf of a remote caller.
•         Not a remote wipe or control plane. EmbryoLock stays stub.
•         Not Node Gate / IP panel / login mesh / publish path.
•         Not AZMail's product-local ring. Not AnonBroadcast as a catalog product.
•         Not a substitute for AZPIPE, SweepGate, APG, or ChainLock — it cites them.

3. Two planes (unchanged)

  Plane                         Default                         Law

  A — local qnsd / qnm-node     Process ON. Via attempt.        Bind 127.0.0.1. APG on every
                                                                ingress. Photon via is hop-only.

  B — public Worker             Cite only. GET /v1/qns.         No emit. No proxy. GET /v1/mesh
                                                                never enables.


4. Photon QNS1 1.3
Magic QNS1. Version 1.3. Canonical JSON (sorted keys, tight separators). Body hash
h is SHA-256 of the frame with h omitted. Fact hash fh is SHA-256 of the clipped
fact (≤160). QNM and AZPIPE already cite fh. Remote body does not enter STM.

    {
        magic: "QNS1",
        v: "1.3",
        via: "photon",
        pair_id: "<AIH-WP-1.3 pair_id>",
        hop: { n: 0, max: 8, seen: [] },
        fh: "<sha256 fact>",
        h: "<sha256 frame minus h>",
        isolate: false,
        pull: false,
        bridges: 2,
        inner: null
    }

via is hop-only (AIH-WP-1.3). Any currently enabled declared bearer may carry the
next hop. The pair does not store a required medium. Wi-Fi dying is path gone,
bind remains.

hop.max default 8. seen is a hash list. Loops drop. Over-length paths drop.
pull stays false. bridges=2. isolate=true on poison / tamper.

inner is the AZPIPE-admitted folded body, or null on a refuse envelope. Refuse
envelopes stop at the hop that closed. They do not carry inner into memory.

5. Same laws locally
Inbound hop list (AP-WP-0.2), on qnsd:

    frag → sweep → fold → static → fold → entry → frag → via

frag. DecisionGATE flags. Empty or ungrounded inbound refuses before SweepGate
spends work.

sweep. SweepGate airlock (SG-WP-0.1). Poison, malware-class marks, block-keys,
off-origin when inbound and untrusted. Isolate and refuse. Do not merge.

fold / static. fld3-wire until foldlock.py sits beside the hop. Freeze hashes the
folded bytes. Second fold after canonicalization.

entry. ChainLock stamp (CL-WP-0.4). Fact-bearing card. Hash-only cards refuse.

via. Emit only along an existing pair edge, APG pass, hop bearer enabled, hop_max
respected, node not isolated / PHOENIX-LOCK / scorched.

APG (qnm-node): clean pass; reanswer-without-cite refuse; flood refuse; unknown
slug or stub-as-live refuse; credential/login/cookie refuse; poison/tamper isolate
+ spend ID + drop tethers. Poison is refused, not interpreted.

Outbound is the reverse so a dirty toolkit result is swept before it rides a via.


QNS-CD-1.0 Quantum Node Signal                                                                                         1


Aziel Eliab · coding design · photon QNS1 1.3 · local qnsd only



6. Local API (qnsd — 127.0.0.1 only)

  Method   Path                  Act

  GET      /local/qns/status     Photon via posture. Not completeness. Not QNM-S.
  GET      /local/qns/cite       QNS-CD-1.0 + QNS1 1.3.
  GET      /local/qns/outbox     Visible queue. Operator keeps the file.
  POST     /local/qns/admit      APG then admit inbound QNS1 frame.
  POST     /local/qns/via        Emit along an existing pair edge.
  POST     /local/qns/cut        Drop one outbox item.

These paths live on local qnsd in AzielEliab/qnm-node. They are **cited** by
GET /v1/qns on aziel-runtime. The public Worker never fetches them, never proxies
them, and never accepts emit / via / wipe / control bodies.

7. Public Worker (this package)
GET /v1/qns — cite JSON (author, spec, photon, local API table, laws).
HEAD /v1/qns — headers only.
POST /v1/qns — refuse QNS-CITE-ONLY.
POST /v1/qns/via | /emit | /wipe | /arm — refuse QNS-NO-PROXY.

Every GET /v1/software card and the mesh kernel extra carry a stable pointer:

    qns_cd: {
      spec: "QNS-CD-1.0",
      local: "https://github.com/AzielEliab/qnm-node",
      note: "Photon vias on local qnsd; Worker cites only"
    }

Do not add QNS as a Softwares-tab product. extras[] may show the pointer on the
mesh kernel card. FragGate remains the door. Mesh remains the rollup.

Mesh status / skill notes cite QNS-CD-1.0 as the packet-transfer coding design
(companion to QNM-BUILD-1.0 / AIH-WP-1.3). Hub / Interface stays AIH-WP-1.1.

8. Cross-map
The pointer is the same object on every live product, EmbryoLock stub, and the
mesh kernel extra. Catalog GET stays full (RL-WP-0.1-runtime). Soft caps apply
only to expensive fan-out. Packed catalog cost path is unchanged.

9. Never
•         Do not enable mesh with a GET.
•         Do not bind qnsd off loopback in default config.
•         Do not proxy local via emit from the public Worker.
•         Do not add a Node Gate to “see the photon.”
•         Do not invent qubit claims or Bell-pair physics.
•         Do not host EmbryoLock wipe on this door.
•         Do not list QNS on the Softwares tab.
•         Do not treat a site ping of /v1/qns as a via.

10. Close tests
•         SUITE_DESIGNS includes QNS-CD-1.0; skill / llms / cite / sitemap name it.
•         Every /v1/software card has qns_cd.spec === "QNS-CD-1.0".
•         Mesh extra and GET /v1/mesh cite QNS-CD-1.0.
•         GET /v1/qns is 200, cite-only, public_proxy false, emit false.
•         POST /v1/qns and /v1/qns/via refuse. No 127.0.0.1 fetch in the Worker.
•         No software[] slug qns / qnsd / photon.
•         GET /v1/mesh remains enabled:false on a fresh isolate.

Specified 2026-09-10. Building qnsd is implementation in qnm-node. This paper is
the coding design at 100% for the Worker cite + catalog cross-map. Public
identity: Aziel Eliab only.

    If the files hold, the name was never the point.




Packet-transfer coding design · local qnsd · Worker cites only · 2026-09-10                                          2
