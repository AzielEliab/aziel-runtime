# Named fallback inventory (universal local execution)

**Runtime 1.9.1** · Author: **Aziel Eliab** only.

Universal local execution is **not complete**. Named per-op `proxy_fallback` stays honest. Unknown tools refuse (`FG-HALLUC-TOOL`). Do not invent a silent fallback.

| Slug | Native in-process | Named proxy / refuse |
| --- | --- | --- |
| azos | status, invite, principles, health, skill, doctor | `exec` / `shell` / `lattice` refuse on the public mesh; session/exec/close stay proxy |
| aziel-corpus | search, example, review, score, verify-backfill, verify-geo, document-chain, import_export, health, skill, doctor | jeeves, media-run (proxy); transcribe / ocr are Workers-AI-gated (proxy until `env.AI` is bound); live D1 search only when `CORPUS_D1` is bound |
| azai | lamb-check, models metadata | blend / complete / chat refuse |
| spectrallock / vibelock | listed LIVE_OPS | no extra proxy list today |
| trajectorylock | analyze / verify / isolate `hash_*` | `store_media` refuse (no CDN) |
| whistlelock | hash/canon preview + isolate `hash_*` | send / mail / release refuse |

Runtime JSON `honesty.named_fallback_inventory` repeats this. Identity Aziel Eliab only.
