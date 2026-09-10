# SG-WP-0.1 — SweepGate

Author: Aziel Eliab only.

Status: LIVE fabric module on aziel-runtime (2026-09-09 / wired). Not a Softwares-tab product. Not a commercial antivirus. Not a fleet-completeness claim.

Runtime: `src/sweepgate.js` · Version: SG-0.1

---

## 0. Sentence

A node mesh cannot treat inbound bytes as memory until they pass an airlock. SweepGate is that airlock. Isolate. Do not merge.

## 1. Claim

Public surfaces attract scrapers, prompt-injection, and drive-by payloads. GodLock already refuses poison on a 777-second class interval and cites instead of reanswering. SweepGate generalizes that refuse onto the AZPIPE hop list so every Worker, library call, and MCP envelope hits the same sieve before ChainLock entry.

The sieve is structural. It looks at the bytes. It does not claim vendor detection names, heuristic completeness, or host protection.

## 2. What it is not

- Not Windows Defender, ClamAV, or a Cloudflare WAF product.
- Not FoldLock. FoldLock suppresses tethers. SweepGate decides whether the envelope is admitted.
- Not FragGate. FragGate is the grounded-claim kernel. SweepGate is the airlock in front of memory.
- Not a public Node Gate panel and not an IP allow/block UI. Hits are server-side.
- Not a promise that malware cannot run on the operator's laptop.

## 3. Classes

**Poison.** Marks such as inject-payload, jailbreak-ignore, exfiltrate, and explicit poison tokens. A hit isolates. The mesh records rel=quarantine. STM does not ingest the body.

**Airlock-block.** Keys named password, private_key, secret, ssn, legal_name, home_address. Closed airlock. Those strings do not belong in cards or Worker logs.

**Off-origin.** http(s) URLs that do not start with the allowlist. FoldLock later marks them `[FLD3:url]`. SweepGate isolates first when the envelope is inbound.

Allowlist origins:

- https://www.azielcorpuslibrary.net
- https://godlock.uk
- https://www.azieleliab.com
- https://aziel-runtime.vibelock.workers.dev

**Malware-class.** Structural marks only:

- script tags
- `eval(`
- PowerShell `-enc`
- `cmd.exe`
- MZ / base64 MZ headers
- `/bin/sh` and `rm -rf /`
- dropper / meterpreter tokens

A hit is `hits: ["malware-class"]`, `airlock: closed`, `refuse: sweep-isolate`. It is not a CVE name.

## 4. Wire

```json
{
  "v": "SG-0.1",
  "ok": true,
  "airlock": "open",
  "hits": [],
  "isolate": false,
  "pull": false,
  "qnm": "sweep-before-ingest",
  "h": "sha256(raw)[:32]"
}
```

Export: `inspect(envelope)` → `{ v:'SG-0.1', airlock, hits, isolate, refuse? }`.

AZPIPE inbound calls SweepGate after first frag. If isolate is true the envelope returns immediately. No fold. No static. No entry. No toolkit.

AZPIPE outbound calls SweepGate after the toolkit result is folded and frozen, so a dirty tool cannot ride a bridge.

## 5. Mesh

Sweep runs before QNM cell ingest. Cite the hash. Drop the tether. Quarantine stays on the mesh chain. Two rotating bridges, when live, only forward envelopes with `airlock: open` and `pull: false`.

`GET /v1/mesh` never enables. Operator bypass, if any, is a server-side token. No Node Gate panel.

## 6. Cap

This is a structural sieve on the pipe. It does not replace host AV, sandboxing, Cloudflare WAF, or EmbryoLock wipe policy. Expanding the mark list is an operator act and must be stamped on learn.

Companion papers: CL-WP-0.4, AP-WP-0.2, LS-WP-0.1.

Public identity: Aziel Eliab only.
