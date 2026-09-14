# QNM-WP-1.0

Author: Aziel Eliab only.

**NO-LIE / NO-REWRITE** (companion [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md), [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md)): receipts that still hash; copies not all on one tunnel; no rewrite key. The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. This paper is not rewritten by that law.

---

QNM-WP-1.0                                                                                                Aziel Eliab · public work identity only




 Quantum Node Mesh
 QNM-WP-1.0 · fabric concept at 100% · 2026-09-06 · Aziel Eliab · absorbs BUILD-1.0 + TOPO-1.0

    A local process that stays on, hashes through radio failure, airlocks inbound, isolates poison, rotates
    ephemeral IDs in cells of 25 with two bridging members, and never pretends the public Worker is that cell.
    Sites pulled → public rollup on that hostname down. Phoenix is wait / re-seal, not “bring the .uk node back.”

 1. What QNM is not
   • Not qubit hardware. Not a login mesh or account system.
   • Not a VPN, mixnet, or anonymity network.
   • Not AZMail’s ring, not AZNet, not anon-broadcast.
   • Not a Softwares-tab engine. Not enabled by GET /v1/mesh.

 2. Two planes
  Plane                                Default                                Law

  A — local qnm-node                   Process ON. Bearers attempt.           Zero radios: process still ON, ledger appends, bearers empty.

  B — public rollup                    enabled=false. GET never enables.      Counts only. No Node Gate. No fake 25 peers. Views/MCP out
                                                                              of QNM-S. Pulled site → this plane down on that hostname.



 3. Bearers
  Bearer                                                       Required       Local default

  Local disk / loopback                                        yes            on — node exists with this alone

  Ethernet / Wi-Fi / internet / Bluetooth / sneakernet         no             attempt — sneakernet is outbox file + hash; operator moves it

 No bearer carries a password. No bearer is a browser login.

 4. Cell
 Full cell = 25 members: 23 leaf + 2 bridges. Bridges are the only inter-cell tethers. Underfill is allowed (1..24) and does not
 invent ghost peers. Overfill refuses join with receipt cell_full. This operator node is one member. Other members are real
 when present — never painted onto a Worker page.

 5. Mesh ID
 assign: mesh_id = SHA-256(prev_id || utc || nonce || cell_id). Session token, not a person. Spend on rotate, poison, or
 phoenix rejoin. Spent IDs never reuse in the same cell. Catalog form: miragegrid/assign (live). miragegrid/mesh, vpn-hop,
 hop, tunnel stay stub.

 6. States
  Kind                    Values                                           Meaning

  Member                  live | isolated | phoenix | spent                spent ID must assign before rejoin

  Cell                    forming | full | degraded | locked               locked after bridge-pair loss until two live bridges sit



 7. Heartbeat, airlock, poison
 Heartbeat payload: cell_id, mesh_id, tip_hash, utc. Fixed-size. Presence + tip hash only. No body, no diff,
 no “also here’s the file.” Three missed intervals → suspect. Suspect plus APG hit → isolate.
 Heartbeat loss ≠ poison. Heartbeat loss ≠ apply last packet. Heartbeat is an act receipt.
 Payload lives on a second plane the receiver pulls. Never a push the sender fans out.
 The 0.5–1s tick and the 777s gate never share a socket.



Fabric concept 100% · local ON / public rollup · 2026-09-06                                                                               page 1


QNM-WP-1.0                                                                                          Aziel Eliab · public work identity only




 APG classes: clean pass; reanswer-without-cite refuse; flood refuse; unknown slug or stub-as-live refuse;
 credential/login/cookie refuse; poison/tamper isolate + spend ID + drop tethers.
 If the isolated member was a bridge: rotate both bridges before any inter-cell traffic. Cell → locked until two live bridges
 exist. A single leaf isolate does not halt the cell. Memorial appends spent id, reason, utc, prev tip.

 8. Bridge rotation and phoenix
 Rotate both bridges as a pair on interval, on poison of either, or on operator act. Spent pair cannot carry traffic (refuse
 bridge_spent). A cell with fewer than two live members stays local-only.
 Phoenix: wait / re-seal. No controller hunt. No public callback. No public hostname resurrection.
 Declare comms clean. assign new mesh_id. Rejoin as leaf of the local cell unless seating a new bridge pair.
 Rejoin is local fabric only. It does not restore godlock.uk or climb the public rollup hostname.
 Phoenix wait is an act. Sites pulled → plane B (public rollup) down on that host. Plane A (local qnm-node)
 may keep verifying and appending. Mesh does not climb back onto the public hostname by itself.
 A process supervisor restarting cloudflared is operator kit, not this paper; it fails if credential or hostname is gone.

 9. Tethers and siblings
 Leaf tethers only inside its cell. Bridge tethers only to the other cell’s current bridge pair. Poison cuts first.
 MirageGrid = ID assign. AzielTether = downloaded-copy survival. AZNet and AZMail are other slugs. TemporalLock /
 AZL-LEDGER record every mesh act. FragGate slug=mesh is Worker rollup, not the full node.

 10. Never / close tests
   • Do not draw 25 peers on a public page that does not host them.
   • Do not enable mesh with a GET. Do not reuse a spent mesh_id.
   • Do not route inter-cell traffic through a leaf. Do not call MirageGrid a VPN.
   • Do not store passwords in node state. Do not claim qubits.
   • Do not read Phoenix as restoring godlock.uk or auto-reattaching a public hostname.
   • Sites pulled (token revoked, Worker dropped, DNS killed) die with the pull. cloudflared has nowhere legal to land.
   • Do not put a body, diff, or file on the 1s tick. Do not treat 777s as wait-then-take.
   • Do not vote-to-reconcile equivocation. Same prev + two tips from one node isolates that peer.
   • Do not auto-splice islands on reconnect. Rejoin is cite + operator or lockset gate.
   • Neighbors do not phoenix because a neighbor phoenix’d. Clock desync is not a yes.
   • Multiply cold copies. Refuse live body sync. Tip expensive to erase. Unkillable by single-server pull.
   • Data outlives creators via content-addressed tips + local verify/append. Payloads pull-only cold. Named hosts only.
   • Bytes survive, not summaries. Re-expand restores from archive after prev-hash verify. Not mesh from index.
   • Crawlers are extra shelves only. Training residue is rumor.
   • REHEAL: isolation is the cure. Own last good tip + verified trusted pull, or phoenix-WAIT. Never listen to neighbors.
   • Allowed on the wire: live / locked / isolated / tip-hash. Forbidden: bodies / diffs / vote-to-fix.
   • If network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault).
   • CROSS-NETWORK-SURVIVAL-1.0 cites die-with-the-pull, split-the-wires, cold-copy, re-expand, and REHEAL under that sentence.
   • The live mesh is not a shelf.
   • Concept is closed when both planes, cell math, ID spend, leaf-vs-bridge poison, phoenix-without-hunt, and stub names
   are specified — they are.
 Specified 2026-09-06. Building qnm-node is implementation. This paper is the concept at 100%. Public identity: Aziel
 Eliab only.

    If the files hold, the name was never the point.




Fabric concept 100% · local ON / public rollup · 2026-09-06                                                                         page 2
