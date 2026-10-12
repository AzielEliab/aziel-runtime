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
