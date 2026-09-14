# NODE-OPS-1.0

Author: Aziel Eliab only.

---

NODE-OPS-1.0                                                                                               Aziel Eliab · public work identity only




Node operations and security framework
NODE-OPS-1.0 · review of github.com/AzielEliab · 2026-09-06 · Aziel Eliab

   Bulletproof here means smallest public surface, named refuses, isolate-then-phoenix, no auto-heal onto a
   poisoned ID. It does not mean an unbreakable host. Phoenix is wait / re-seal after poison or isolation, not
   public hostname resurrection. Sites pulled die with the pull.

1. Fleet review (2026-09-06)
Public repos already point the right way: FragGate hashed registry and refuse ledger; corpus security headers; runtime thin
MCP; qnm-node on 127.0.0.1 with APG, PHOENIX-LOCK wait, no account resurrection, no auto-heal; ARK
hosted-never-unlocks; azos/exec stub; MirageGrid hop stubs; AZMail smtp/login stubs. Gaps: BUILD-1.0 docs still say
bearers default-off (amend per QNM-WP-1.0: process ON, public rollup); cell-of-25 dual-bridge rotation not fleet-wired;
Q×act seal not yet the only legal success path on every fraggate_call.

2. Node classes
  Class                Fleet                                   Public surface allowed

  Face                 azieleliab, corpus, godlock             Pages, cite, llms, software mirror. No Node Gate. No vault unlock.

  Door                 fraggate, aziel-runtime                 Thin MCP + fraggate_call. GET /v1/mesh never enables.

  Fabric               qnm-node                                Loopback API only. Not on public faces.

  Survival             azieltether                             Counted download. Prefer-central. Not a VPN.

  Overlay              azos, azhub, azinterface                Status / place / cycles. No remote shell.

  Harness              azbot                                   Skill markdown. Queue publish. No browser login.

  Vault                ark, EmbryoLock                         Local only. Hosted unlock/scorch stub.

  Assign               miragegrid                              assign live. mesh/vpn-hop stub.

  Side-net             aznet, azbrowser, azmail                Verify / cite-search / classify. Harvest/login/smtp stub.

  Engine               Locks, CLCE, Z-Solver, receipts, GATE   Listed live ops only.



3. Attack surface law
  • One inbound door. FragGate or loopback. /p/{slug}/{op} is proxy, not exec.
  • Allowlist ops only. Unknown slug = FG-HALLUC-TOOL. Stubs stay refuse.
  • No credentials in process state. token_present only. No browser login.
  • No public enable switch. GET does not change mesh state.
  • qnm-node binds 127.0.0.1. Faces do not proxy that port.
  • No vault on the Worker. No auto-heal to a spent mesh_id.
  • No account resurrection. Memorial keeps the spend.
  • Identity lock on export. Publish only via official API + AZBOT_PUBLISH=1.
  • Local HTTP keeps nosniff, DENY frames, no-referrer, camera/mic/geo off, tight CSP.

4. Phoenix loop (failsafe)
   live → APG miss or tamper → isolate (cut tethers, spend mesh_id) → memorial → PHOENIX-LOCK wait
   (local, no controller hunt) → declare comms clean → assign new mesh_id → rejoin as leaf of the
   local cell → seat a new bridge pair if needed.

  • This is not auto-heal. The old ID stays spent.
  • Phoenix is wait / re-seal after poison or isolation. It is not “bring the .uk node back.”
  • Rejoin is local fabric only. Phoenix does not restore godlock.uk, azielcorpuslibrary.net, or any
    public rollup hostname.
  • Sites pulled (token revoked, Worker dropped, DNS killed) → public rollup on that hostname is down.
    A local node may keep verifying and appending. Mesh does not climb back onto the public hostname
    by itself.
  • A process supervisor restarting cloudflared is operator kit, not this paper. It fails if the
    credential or hostname is gone.



Node operations + surface law · phoenix loop · 2026-09-06                                                                                  page 1


NODE-OPS-1.0                                                                                          Aziel Eliab · public work identity only




  • Phoenix does not un-scorch a vault.
  • Phoenix does not resurrect a public hostname.
  • Poison does not forward across cell edges.
  • Three missed heartbeats = suspect. Suspect + APG hit = isolate.
  • Heartbeat loss ≠ poison. Heartbeat loss ≠ “apply last packet.”
  • Phoenix is local reboot/WAIT for the failed node. Neighbors do not phoenix because a neighbor phoenix’d.
  • Bridge poison rotates both bridges before inter-cell traffic.
  • Held publish queue does not flush across phoenix without a new operator act.

4b. Split the wires
  Fast 0.5–1s tick: presence + tip hash only. Fixed-size. No body, no diff, no “also here’s the file.”
  Payload on a second plane the receiver pulls, never a push the sender fans out.
  Update is a proof, not a timer. Receiver already holds prev and the lockset. New tip must cite that
  prev, match the lockset rule, and verify fail-closed. 777s is dwell after a valid cite, not “wait then
  take whatever arrived.” Clock desync is not a yes. Ambiguous tip is isolate, not merge.
  Equivocation ends the peer, not the chain. Same prev, two different tips from one node → that node
  is locked/isolated. No vote-to-reconcile. Quorum cannot outvote a broken hash. Majority is not truth.
  Emit last, locally. A node may announce a tip only after its own verify passes. No unsend, so nothing
  leaving the box is an unverified body.
  Partition: each island keeps its own chain; they do not auto-splice on reconnect. Rejoin is cite +
  human/operator or lockset gate, same as first ingest.
  The 1s loop and the 777s gate stay strangers. Anything less is a delayed epidemic.
  Public tunnels/sites still die with the pull. Phoenix is not public hostname resurrection.

4c. Cold-copy survival
  Multiply cold copies. Refuse live body sync across the network. A tip is content-addressed and
  expensive to erase. Unkillable by single-server pull: that named hostname dies with the pull;
  vaults that already hold the hashes keep verifying and appending. Hash-absolute poison refuse —
  equivocation isolates that peer, not the chain. Data outlives creators via content-addressed
  tips + local verify/append. Payloads are pull-only and cold. Named hosts only.

5. Per-class refuse (minimum)
  Class                  Must refuse

  Face                   Node Gate, IP panel, vault unlock, mesh enable

  Door                   Invented slugs, stub ops, runtime_run as agent default

  Fabric                 cell_full join, leaf as inter-cell path, spent ID reuse, public bind

  Survival               vpn / arm / mesh-join stubs; opening a public mesh because central is down

  Overlay                azos/exec; exec of catalog engines from Interface

  Harness                live post without PUBLISH=1; browser login

  Vault                  hosted unlock / encrypt / scorch / wipe

  Assign                 mesh, vpn-hop, hop, tunnel

  Side-net               harvest, login, smtp send, invented visits, deanonymize

  Engine                 any op not on the 1.6.13 allowlist



6. Receipts
Every node writes AZL-LEDGER kinds: boot, heartbeat, refuse, isolate, phoenix, assign, rotate, tether_cut, hold. No model
sentence. No token body.

7. Close tests
  • Public faces have no enable switch and no vault unlock.
  • Door stubs refuse and the refuse is a receipt.
  • qnm-node is not reachable off loopback in default config.
  • Spent mesh_id rejected on rejoin. Phoenix wait has no outbound hunt packet.
  • Phoenix wait / re-seal does not restore godlock.uk or reattach a public hostname.
  • Tick plane refuses body / diff / file. Payload is pull-only. Equivocation isolates that peer.
  • 777s dwell is after a valid cite. Clock desync is not a yes. No auto-splice on reconnect.
  • Cold copies multiply. Live body sync refused. Single-server pull does not erase local tips.
  • Held queue does not flush across phoenix without a new act.
  • ARK hosted unlock remains stub. Cell does not halt when one leaf isolates.
Does not add a Node Gate to “see security.” Does not turn MirageGrid into a VPN. Does not publish exploit recipes. Public
identity: Aziel Eliab only.

   If the files hold, the name was never the point.




Node operations + surface law · phoenix loop · 2026-09-06                                                                             page 2
