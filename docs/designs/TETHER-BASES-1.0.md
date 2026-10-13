# TETHER-BASES-1.0: internet, mail-send and kernel bases on the AZOS tether

Author: Aziel Eliab. Status: built as flags. Every base stays live:false.

Laws cited: AZRT-AZOS-TETHER-1.0 (src/azos-tether.js header: the runtime never runs code inside AZOS),
REMAIN-OFF-BY-DESIGN-2026-09-10.md (item 8 `azos lattice` stays refused; nothing is enabled),
D2D-CARRIERS-1.0.md (alt_internet_live false until second_device), and the FragGate single-door rule.

## Change (additive)
`GET /v1/tether` gains `bases` (three rows) and `bases_live:false`. Each row names the existing door it
expands (`azos internet_base`, `azmail mail_send_base`, `azos boot_path`), the flag it maps to, and the proof
that would flip it. The signed tether packets are unchanged, so the AZOS verifier is unaffected.

## Not done, by design
No base turns live from this change. Flipping a base needs its proof, recorded with a receipt, and a separate PR.

## BASES-SELFTEST-1.0 (pass 3, additive)
`node scripts/selftest-bases.mjs --record` runs the real code paths on one machine and appends a line to
`docs/proofs/BASES-SELFTEST.jsonl`. That log is append-only, and its first line is an honest failure
(`AZM-SCAN-ABSENT`, recorded before ClamAV was installed).
- Mail: `mail_send_base` with `confirm` runs the ClamAV scan, then the real SMTP client sends to a loopback sink on 127.0.0.1.
  It does not prove live: no external receiver accepted the mail.
- Kernel: `bootHandoff` assembles `src/boot/azos-boot.S` and the cpio userspace, then boots the image in QEMU. The guest
  log reads `AZOS-INSTALLED`, then `AZOS-BOOTED`. It does not prove live: an emulator is not real hardware.
The mail and kernel rows in the tether `bases` block point to this log. `public_mail_send_live` and `kernel_live` stay false.

## MESH-HINTS-UI-1.0 (pass 3)
`/workspace` renders the five new-user hints as a dismissible popup (Next, Got it, or Esc). Dismissal is remembered only in
localStorage `azrt.hints.v1`, and nothing is sent to the server.
