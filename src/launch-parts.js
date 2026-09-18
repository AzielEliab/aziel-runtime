/**
 * Worker-launch hashtag parts (AZRT-WORKER-LAUNCH-1.0).
 *
 * Every Softwares / Worker launch surface exposes distinct #hashtag-tagged
 * parts. Copy is product-specific — not identical across slugs.
 * About Aziel is the shared partial (see about-aziel.js). FoldLock corpus
 * tip stays on every launch. Author: Aziel Eliab only.
 */

import { softwareBucket } from "./software-catalog.js";
import {
  PRODUCT_NAME,
  PRODUCT_SLUG,
  RUNTIME_ONE_LINE,
} from "./seo.js";
import {
  LIVE_LIBRARY_ORIGIN,
  PERSON_ID,
  TIP_PACK_SPEC,
} from "./engines/aziel-corpus/tip-pack.js";

export const WORKER_LAUNCH_SPEC = "AZRT-WORKER-LAUNCH-1.0";

const GENERIC_OPS = new Set([
  "health",
  "skill",
  "doctor",
  "cite",
  "limitation",
  "limitations",
]);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tagToken(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function hashtag(slug, part) {
  const s = tagToken(slug);
  const p = tagToken(part);
  if (!s) return `#${p || "part"}`;
  if (!p || p === s) return `#${s}`;
  return `#${s}-${p}`;
}

/** Runtime launch parts — only on aziel-runtime surfaces, not pasted onto every slug. */
export function runtimeLaunchParts() {
  return [
    {
      tag: hashtag(PRODUCT_SLUG, PRODUCT_SLUG),
      title: PRODUCT_NAME,
      body: RUNTIME_ONE_LINE,
    },
    {
      tag: hashtag(PRODUCT_SLUG, "fraggate"),
      title: "FragGate",
      body: "THE single public executable door (list → describe → call). Not 37 separate APIs. Lamb Lens is fabric after FragGate.",
    },
    {
      tag: hashtag(PRODUCT_SLUG, "softwares"),
      title: "Softwares",
      body: "Plain → Gate → Lock catalog products with true in-process engines where live. Sibling software under one door.",
    },
    {
      tag: hashtag(PRODUCT_SLUG, "foldlock-corpus-tip"),
      title: "FoldLock corpus tip",
      body: `${TIP_PACK_SPEC} is a hash-verified in-process tip (label REAL). Full library remains LIVE on ${LIVE_LIBRARY_ORIGIN}/. In-process D1 is SLOT unless CORPUS_D1 is bound.`,
    },
  ];
}

/**
 * Distinct hashtag parts for one Softwares slug.
 * Tags are prefixed with the slug so `verify` on two products never collides.
 */
export function launchHashtagParts(product) {
  if (!product || !product.slug || product.slug === PRODUCT_SLUG) {
    return runtimeLaunchParts();
  }
  const slug = String(product.slug);
  const name = String(product.name || slug);
  const bucket = softwareBucket(name, slug);
  const oneLine = String(product.oneLine || product.one_line || product.banner || name);
  const banner = String(product.banner || oneLine);
  const parts = [
    {
      tag: hashtag(slug, slug),
      title: name,
      body: oneLine,
    },
    {
      tag: hashtag(slug, bucket),
      title: `${name} ${bucket}`,
      body: `${name} is catalog bucket ${bucket} (Clock ≠ Lock). FragGate slug ${slug}.`,
    },
  ];
  const ops = (product.ops || []).filter((o) => o && o.op && !GENERIC_OPS.has(String(o.op)));
  for (const o of ops.slice(0, 4)) {
    parts.push({
      tag: hashtag(slug, o.op),
      title: o.op,
      body: String(o.summary || `${name} ${o.op}`),
    });
  }
  if (banner && banner !== oneLine) {
    parts.push({
      tag: hashtag(slug, "honesty"),
      title: `${name} honesty`,
      body: banner,
    });
  }
  if (slug === "azvpn") {
    const extras = [
      {
        tag: hashtag(slug, "concentrator"),
        title: "AZVPN concentrator",
        body: "Application-layer HTTPS/WS tunnel concentrator. Worker terminates those sessions. WireGuard/OpenVPN/L3 stay SLOT.",
      },
      {
        tag: hashtag(slug, "session"),
        title: "AZVPN session",
        body: "open / status / close / list allocate session-scoped envelopes + receipts. Auto-bind reuses the default auto-backend peer.",
      },
      {
        tag: hashtag(slug, "auto"),
        title: "AZVPN auto-bind",
        body: "default_vpn_backend azvpn; auto_use true. Mesh / AZNet pair / session / AZBrowser paths auto-select AZVPN. Callers do not name software=azvpn.",
      },
    ];
    const have = new Set(parts.map((p) => p.tag));
    for (const extra of extras) {
      if (!have.has(extra.tag)) parts.push(extra);
    }
  }
  return parts;
}

/** Compact slug-specific hashtag chips for cards / catalog rows / launch tiles. */
export function launchHashtagChipsHtml(product) {
  const slug = product && product.slug ? String(product.slug) : PRODUCT_SLUG;
  const parts = launchHashtagParts(product);
  const chips = parts
    .map((p) => `<span class="hashtag" data-part="${escapeHtml(p.tag.slice(1))}">${escapeHtml(p.tag)}</span>`)
    .join(" ");
  return `<p class="launch-chips" data-launch-slug="${escapeHtml(slug)}">${chips}</p>`;
}

export function launchHashtagPartsHtml(product) {
  const slug = product && product.slug ? String(product.slug) : PRODUCT_SLUG;
  const name = product && product.name ? String(product.name) : PRODUCT_NAME;
  const parts = launchHashtagParts(product);
  const items = parts
    .map(
      (p) => `  <article class="launch-part" id="${escapeHtml(p.tag.slice(1))}">
    <h3><span class="hashtag">${escapeHtml(p.tag)}</span> ${escapeHtml(p.title)}</h3>
    <p>${escapeHtml(p.body)}</p>
  </article>`,
    )
    .join("\n");
  return `<section class="cite launch-parts" id="launch-parts" data-slug="${escapeHtml(slug)}">
  <h2>Launch parts</h2>
  <p>Product-specific <code>#hashtag</code> parts for <strong>${escapeHtml(name)}</strong> (<code>${escapeHtml(slug)}</code>). Not identical copy across Softwares. Shared About Aziel + FoldLock corpus tip follow. Person <code>@id</code> <a href="${PERSON_ID}">${PERSON_ID}</a>.</p>
${items}
</section>`;
}

export function workerLaunchCiteField(products) {
  const list = Array.isArray(products) ? products : [];
  const bySlug = {
    [PRODUCT_SLUG]: runtimeLaunchParts().map((p) => p.tag),
  };
  for (const p of list) {
    if (!p || !p.slug) continue;
    bySlug[p.slug] = launchHashtagParts(p).map((row) => row.tag);
  }
  return {
    spec: WORKER_LAUNCH_SPEC,
    every_launch_includes: ["hashtag_parts", "about_aziel", "foldlock_corpus_tip"],
    about_aziel_partial: "src/about-aziel.js#aboutAzielSectionHtml",
    fold_pack_partial: "src/about-aziel.js#corpusFoldPackPanelHtml",
    hashtag_parts_partial: "src/launch-parts.js#launchHashtagPartsHtml",
    person_id: PERSON_ID,
    identity: "Aziel Eliab",
    full_library_in_process: false,
    inherit:
      "Product Workers do not live in this repo. Copy the shared About Aziel + FoldLock corpus-tip partials from aziel-runtime (src/about-aziel.js). Keep hashtag parts product-specific — do not paste another slug's copy. See docs/WORKER-LAUNCH.md.",
    tags_by_slug: bySlug,
  };
}
