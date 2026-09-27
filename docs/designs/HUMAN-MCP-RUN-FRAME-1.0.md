# HUMAN-MCP-RUN-FRAME-1.0 — human framing on MCP display envelopes

Author: **Aziel Eliab** only.

Status: first slice (MCP / display envelope only). Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool. Not a Remain-OFF flip.

Companion: [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md). Softwares desk stays frozen.

---

0. Sentence
Humans see "Run aziel runtime" and the product verb title. They do not see "call fraggate" or "call spectrallock". An image card exists only when a production actually returned one.

1. What this slice does
`display.action` is `Run aziel runtime` on every display envelope built for MCP.
`display.title` stays the product verb title already mapped in `src/display.js`.
Initialize instructions tell the client to show `display.action`, `display.title`, and `display.summary`, and not to echo raw tool names.

When a production includes real image bytes (`png_b64`, `jpeg_b64`, `jpg_b64`, `webp_b64`, `gif_b64`, or `residual_png_b64`) and those bytes sniff as that image, the envelope sets `display.image` with `mimeType`, `data`, `source`, and `reviewed: true`. The MCP `tools/call` content array adds `{ type: "image", mimeType, data }` beside the text part.

A cited `http` or `https` URL on `image_url`, `png_url`, `jpeg_url`, `jpg_url`, `cited_image_url`, or `image_href` sets `display.image.url` with `reviewed: false`. No bytes are invented, so no MCP image part is added.

2. NO-LIE
- No fake thumbnails. Missing, null, short, or non-image `*_b64` values do not become an image card.
- Request echoes are not productions. `payload`, `would`, `args`, `arguments`, and `input` are not walked.
- `dry_run` does not mint `reviewed`. A preview attaches no `display.image` and no MCP image part, even if the preview body still carries bytes.
- `reviewed: true` means the bytes came from an executed production. It does not mean a second human seal, and it is never set on `dry_run`.
- Raw base64 stays out of `display.fields`. The machine `result` is unchanged.

3. What this slice does not do
- Does not change the Softwares desk, cards, grid, domain tabs, or `#dash-out`.
- Does not add a Softwares row. Softwares stay 42. Ask Jeeves stays suite help (`software_tab` false).
- Does not paint `<img>` in the human UI. That paint is deferred.
- Does not build an "all reviewed copies" gallery.
- Does not add, remove, or rename an MCP tool. `tools/list` stays 36.
- Does not change the door. Exec is still `fraggate_call`, the Softwares catalog, or `runtime_run` under the hood.
- Does not deploy.

4. Where it lives
- `src/display.js` — `display.action`, `display.image`, field skip for `*_b64`.
- `src/mcp-surface.js` — MCP image content part; initialize framing sentence.
- `src/mcp-schema.js` — envelope schema for `display.action` and `display.image`.
