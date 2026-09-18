# FoldLock Aziel Corpus Library tip (AZCL-FOLD-TIP-1.0)

**Author / identity:** **Aziel Eliab** only  
**Person `@id`:** https://www.azieleliab.com/#aziel  
**GodLock** is a product name, not identity.  
**Door:** FragGate only. No MCP tool added or removed.

This runtime ships a **fold-packed library tip**, not the entire live Aziel Digital Library.

The live packed index on the library host is large (hundreds of KB of record metadata). Embedding that as Worker bytes would be a size lie and a completeness lie. FoldLock preview honesty stays: user `fold-preview` / `unfold-preview` remain ~8KB. `hosted_store` stays stub. This tip is a **shipped isolate asset**.

## Labels

| Surface | Label | What it is |
|---------|-------|------------|
| In-process tip (`AZCL-FOLD-TIP-1.0`) | **REAL** | Hash-verified archive of the library **index cite**, bundled **sample MASTER** key artifacts, and published **About Aziel**. |
| https://www.azielcorpuslibrary.net | **LIVE** | Full Aziel Digital Library: `/v1/library-index`, azcorpus, azlibrary, `/llms.txt`, `/cite.json`, counted downloads. |
| In-process D1 `records` | **SLOT** | Live D1 search only when `CORPUS_D1` is bound. Unbound search uses sample MASTER. |

`full_library_in_process` is always `false`. Never claim the full library is in-process because a tip pack is shipped.

## What is packed

- Library index **cite** (URL + honesty). Not the live index bytes.
- Sample MASTER key artifacts already bundled for portable search (`AZDOC-FLORENCE-SAMPLE`, `AZDOC-LAMB-SAMPLE`, `AZDOC-CLCE-SAMPLE`).
- About Aziel from published Person / llms / FAQ machine surfaces (goals / philosophy / mission / status). Not a biography. Not legal name / home. No visible 15:20 HTML chrome.

SHA-256 is over the canonical tip JSON (`canonicalize` + SHA-256). FoldLock `foldBytes` is the packing/encoding layer (fld3-wire / UNI1 / honest passthrough). Ratios are receipts. Not zip.

## What remains on azielcorpuslibrary.net

- Live packed index: https://www.azielcorpuslibrary.net/v1/library-index
- azcorpus browse / download: https://www.azielcorpuslibrary.net/corpus
- azlibrary browse / download: https://www.azielcorpuslibrary.net/aziel-library
- Library llms / cite / shelves (cite-only from this runtime; Cap-7 / shelves files untouched)

## Verify / open (FragGate)

```text
fraggate_list → fraggate_describe { slug: foldlock | aziel-corpus } → fraggate_call
```

- Verify: `POST /v1/fraggate/call` `{ "slug": "foldlock", "op": "pack-verify" }`
- Open: `POST /v1/fraggate/call` `{ "slug": "aziel-corpus", "op": "tip-pack" }`

Posted `{ sha256 }` or `{ b64 }` that does not match the shipped tip refuses `AZCL-PACK-HASH-MISMATCH` or `AZCL-PACK-UNFOLD-REFUSE`.

Human UI: every Worker launch (homepage, `/about`, every `/p/{slug}`, HTML Softwares/describe shells) includes the FoldLock corpus-tip panel plus the shared About Aziel block. Product-specific `#hashtag` parts are separate — see [`docs/WORKER-LAUNCH.md`](WORKER-LAUNCH.md). Control panel buttons call the same FragGate ops.

## Not this change

- No MCP tool add/remove. No invented DOI / Framagit / Glama UUID / fielded-100.
- Cap-7 / `GET /shelves` untouched except cite of the live library host.
- FoldLock `zip` / `hosted_store` stay stub.
