# Worker launch hard rule (AZRT-WORKER-LAUNCH-1.0)

**Author / identity:** **Aziel Eliab** only  
**Person `@id`:** https://www.azieleliab.com/#aziel  
**GodLock** is a product name, not identity.  
**Door:** FragGate only. No MCP tool added or removed.

Every Worker launch surface must contain both of the following.

## 1. Different parts with hashtags

Each Softwares / Worker launch exposes **distinct** `#hashtag`-tagged sections. Copy is **product-specific**. Do not paste the same hashtag bodies onto every slug.

Tags are slug-prefixed (`#foldlock-fold-preview`, `#godlock-score`) so shared op names never collide.

Runtime-only tags (`#aziel-runtime`, `#aziel-runtime-fraggate`, `#aziel-runtime-softwares`, `#aziel-runtime-foldlock-corpus-tip`) stay on aziel-runtime surfaces. They are not copied onto product pages.

## 2. Always About Aziel

The same integrated About Aziel block (goals / philosophy / mission / status / not-this from published Person / llms / FAQ surfaces). Not a biography. Not legal name / home. No visible 15:20 HTML chrome.

## 3. FoldLock corpus tip (still required)

Every launch also includes the FoldLock corpus-tip panel (`AZCL-FOLD-TIP-1.0`). The tip is **REAL**. The live library on azielcorpuslibrary.net is **LIVE**. In-process D1 is **SLOT** unless `CORPUS_D1` is bound. `full_library_in_process` is always false.

## Shared partial (this repo)

Wire once:

```text
src/about-aziel.js  aboutAzielSectionHtml()     → #about-aziel
src/about-aziel.js  corpusFoldPackPanelHtml()   → #foldlock-corpus-tip
src/launch-parts.js launchHashtagPartsHtml(p)   → #launch-parts (slug-specific)
src/about-aziel.js  workerLaunchHtml(origin, p) → all three, in that order
```

Included on:

- Runtime homepage `/` and `/about`
- Human workspace `/workspace` (`#op-panel` / `#dashboard` / `#fg-console` stay; About Aziel + hashtag parts follow the pane)
- Every catalog card `/p/{slug}`
- HTML shells that use `documentShell` (`/v1/software` Accept: text/html, FragGate describe docs)

Machine cite: `/cite.json` `worker_launch`.

## How product Workers inherit

This repo does **not** own VibeLock or other product Worker source trees.

Product Workers inherit the **shared** blocks by copying `aboutAzielSectionHtml` + `corpusFoldPackPanelHtml` (or fetching the runtime `/about` / `/cite.json` `about_aziel` + `corpus_fold_pack` fields and rendering them). Keep `#about-aziel` and `#foldlock-corpus-tip` labels.

Hashtag parts **must stay local to that product**. Generate them from that Worker’s own ops / honesty banner with slug-prefixed tags. Do not copy another slug’s `#hashtag` section. Template: [`docs/PRODUCT_SEO.md`](PRODUCT_SEO.md).
