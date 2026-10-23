# MESH-ONBOARD-1.0 and MESH-BOOTSTRAP-1.0

Author: Aziel Eliab. Status: built. Not live as an alternate internet.

Laws cited: MESH-MEMBERSHIP-1.0 (POST /v1/mesh/join: presence only, sealed session, heartbeat classes),
the mesh security model (single-node isolation plus the phoenix reboot loop: no shared state between nodes,
and a wiped node rejoins with a new id), D2D-CARRIERS-1.0.md, TRACK2-MOBILE-JOIN-1.0.md,
REMAIN-OFF-BY-DESIGN-2026-09-10.md (nothing is enabled), and the FragGate single-door rule (these are read-only
mesh plans; the join itself uses the existing join route). No new MCP tool is added, and tools/list stays at 36.

## One-click install (item 5)
- `GET /v1/mesh/install?slug=&version=` returns a plan: download, then install, then join, then heartbeat.
- `GET /v1/mesh/install.sh?slug=&version=` serves the same plan as a POSIX script.
- Each install joins as `<slug>-<version>-<random>`, so every app version is its own mesh node.
- Unknown or bad slugs refuse with `ONBOARD-*`; the script then exits 1.
- `hints` holds five new-user popup hints (welcome, isolated, battery, honest status, leave). App clients render them.

## Phase E bootstrap (item 1)
- `GET /v1/mesh/bootstrap` returns one starting address (this origin, on one provider) plus the handles of live roster
  nodes (node_id, product, plane), with `needs_starting_address:true`, `only_source:true`, `signed:false`,
  `live_multi_provider:false`, `live:false`.
- More starting addresses, on other providers, need nodes B-D, which are blocked on VPS details.

## Honest flags
`live`, `alt_internet_live`, `packet_path_live`, `second_device` and `live_multi_provider` stay false.

## Login keep-alive (opt-in)
The install does not install a login service unless the operator asks. With the variable unset, the node runs until it is stopped or the machine reboots.

Set `AZIEL_MESH_KEEPALIVE=1` before `install.sh` to opt in. The plan field `keepalive.default` is `off`. The server does not turn it on.

- Linux writes a systemd user unit at `$XDG_CONFIG_HOME/systemd/user/aziel-mesh-<node>.service` and runs `systemctl --user enable` so the next login starts it. It does not pass `--now`, so the nohup process from this run is not started twice. It does not run `loginctl enable-linger`.
- macOS writes `~/Library/LaunchAgents/net.aziel.mesh.<node>.plist` and does not `launchctl bootstrap`, so launchd does not start a second node. The next login loads the plist.
- If `systemctl` or `launchctl` is missing, or enable fails, the unit file is removed and the script says keep-alive was not installed. The node from this run still stays up until it is stopped.
