# Named fallback inventory (universal local execution)

**Runtime 1.9.3** · Author: **Aziel Eliab** only.

Universal local execution is **not complete**. Named per-op `proxy_fallback` stays honest. Unknown tools refuse (`FG-HALLUC-TOOL`). Do not invent a silent fallback.

| Slug | Native in-process | Named proxy / refuse |
| --- | --- | --- |
| azos | status, invite, principles, health, skill, doctor, session_open, session_status, session_close (aliases session / close) | `exec` / `shell` / `lattice` refuse on the public mesh. session/close CLOSED in-process (prefab ethics VFS; not a remote host shell) |
| aziel-corpus | search, example, review, score, verify-backfill, verify-geo, document-chain, import_export, jeeves, health, skill, doctor | transcribe / ocr are Workers-AI-gated (native when `env.AI` is bound — wrangler binds `AI`; unbound stays explicit proxy_fallback). media-run is binding-gated in-process (honest refuse when unbound; native Whisper/vision when bound). live D1 search / jeeves query production `records` when `CORPUS_D1` is bound (wrangler binds `aziel-digital-library`) |
| azai | lamb-check, models metadata | blend / complete / chat refuse |
| spectrallock / vibelock | listed LIVE_OPS | no extra proxy list today |
| trajectorylock | analyze / verify / isolate `hash_*` | `store_media` refuse (no CDN) |
| whistlelock | hash/canon preview + isolate `hash_*` | send / mail / release refuse |

Runtime JSON `honesty.named_fallback_inventory` repeats this. Identity Aziel Eliab only.
