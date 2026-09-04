# Aziel Digital Library `/runtime` front door

https://www.azielcorpuslibrary.net/runtime already exists (AzielEliab/aziel-corpus `main`, 2026-09-04). It proxies `/runtime/*` to aziel-runtime and falls back locally when the origin Worker is down.

This runtime adds two routes the library proxy should advertise and fall back:

| Library URL | Origin |
|-------------|--------|
| `GET /runtime/v1/bundle` | `GET https://aziel-runtime.vibelock.workers.dev/v1/bundle` |
| `GET /runtime/v1/pull/{slug}/skill` | `GET https://aziel-runtime.vibelock.workers.dev/v1/pull/{slug}/skill` |

`destFromRuntimePath` already strips `/runtime`, so those paths proxy once origin is live. Add `fallbackKind` entries so a 404/5xx origin still returns a library-built bundle / skill:

```js
if (path === "/v1/bundle") return "bundle-all";
const pullSkill = path.match(/^\/v1\/pull\/([^/]+)\/skill$/);
if (pullSkill) return { kind: "pull-skill", slug: decodeURIComponent(pullSkill[1]) };
```

A local commit with this alignment lives on `cursor/runtime-front-door-cbc5` in a clone of AzielEliab/aziel-corpus (this agent could not push — `Permission denied to cursor[bot]`). Apply that commit, or the same edits in:

- `workers/download-tracker/src/runtime-root.js`
- `workers/download-tracker/src/runtime-root.test.js`
- `workers/download-tracker/src/ui.js`
- `workers/download-tracker/src/crawl.js`

Then:

```bash
cd workers/download-tracker
npx wrangler deploy
```

Until that ships, AIs should pull from the origin Worker:

- https://aziel-runtime.vibelock.workers.dev/v1/skill
- https://aziel-runtime.vibelock.workers.dev/v1/runtime.json
- https://aziel-runtime.vibelock.workers.dev/v1/bundle
