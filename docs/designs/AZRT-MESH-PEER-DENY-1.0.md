# AZRT-MESH-PEER-DENY-1.0 — mesh peer sessions are deny-by-default

Author: Aziel Eliab only. Status: LIVE in the local FED-MESH / Track 2 node (additive tightening). Source: RIB-024 (@Hectaman).

Before: any verified, mutual, discovered peer could open (`offer`) or have accepted (`accept`) a Track 2 peer session. Discovery was treated as consent.

Now: a node keeps a `session_allow` set, empty by default. `offer(handle)` and `accept(offer)` refuse `MESH-PEER-NOT-ALLOWED` (`deny_by_default: true`, nothing opened) unless the local operator has allowed that handle (`allowSession(handle)`, `revokeSession(handle)`, `createTrack2({ sessionAllow })`, or `FED_MESH_SESSION_ALLOW=<handle,handle>` for `startInstance`). Both sides must allow each other. Existing checks (verified roster, mutual, not isolated, signatures, NAT refuse) still run after the allowlist.

Not changed: the public Worker door. `peer_session_open` and the other Track 2 ops on FragGate stay `FG-STUB` (Remain-OFF). `mesh_node` and every forbidden live flag stay off; `alt_internet_live` stays false. There is no HTTP route to edit the allowlist (local operator only).

Law fit: tightening a refuse (BREAKING-CHANGE-POLICY "not breaking"); new code `MESH-PEER-NOT-ALLOWED` added to REFUSAL-CONTRACT §5; no Remain-OFF item enabled; no new tool.
