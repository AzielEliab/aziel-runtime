/**
 * Crawl HTML shells for public JSON surfaces.
 * Unique titles / descriptions / JSON-LD only. Does not change homepage CSS.
 * Hubs still receive application/json by default (no Accept: text/html).
 * Author: Aziel Eliab only.
 */

import {
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_GITHUB,
  AUTHOR_NAME,
  AZCOHERENCE_GITHUB,
  AZCOHERENCE_WORKER,
  DONATE_CANONICAL,
  DONATE_FOOTER_RUNTIME,
  LIBRARY_NAME,
  LIBRARY_ORIGIN,
  PRODUCT_ALTERNATE_NAME,
  PRODUCT_NAME,
  RUNTIME_ABSTRACT,
  RUNTIME_NOT,
  RUNTIME_ONE_LINE,
  RUNTIME_PAGE_TITLE,
  personJsonLd,
  runtimeAboutField,
  softwareHubCrawl,
} from "./seo.js";

export const SOFTWARE_PAGE_TITLE = `Softwares — ${PRODUCT_NAME}`;
export const SOFTWARE_PAGE_DESCRIPTION =
  "Authoritative Aziel Eliab Softwares catalog (Plain A–Z → Gate A–Z → Lock A–Z). Hubs azieleliab.com, azielcorpuslibrary.net, and godlock.uk refresh from GET /v1/software. Includes AZCoherence (AZC-0.1). Apache-2.0. Identity Aziel Eliab only.";

export const DESCRIBE_INDEX_TITLE = `FragGate describe — ${PRODUCT_NAME}`;
export const DESCRIBE_INDEX_DESCRIPTION =
  "FragGate describe docs for Aziel Eliab software. One door: list → describe → call. Unique per-slug HTML when Accept prefers text/html. GET /v1/mesh never enables.";

export const ABOUT_PAGE_TITLE = `About — ${PRODUCT_NAME}`;
export const ABOUT_PAGE_DESCRIPTION = RUNTIME_ONE_LINE;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mediaQ(accept, type) {
  const parts = String(accept || "").split(",");
  for (const part of parts) {
    const [raw, ...params] = part.trim().split(";");
    const name = (raw || "").trim().toLowerCase();
    if (name !== type) continue;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split("=");
      if ((k || "").trim() === "q") {
        const n = Number(v);
        if (Number.isFinite(n)) q = n;
      }
    }
    return q;
  }
  return null;
}

/** True when the client prefers HTML over JSON. Default (no Accept / * / *) stays JSON for hubs. */
export function prefersHtml(request) {
  if (!request || !request.url) return false;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  const format = String(url.searchParams.get("format") || url.searchParams.get("view") || "").toLowerCase();
  if (format === "html") return true;
  if (format === "json") return false;
  const accept = String((request.headers && request.headers.get("accept")) || "").toLowerCase();
  if (!accept) return false;
  const html = mediaQ(accept, "text/html") ?? mediaQ(accept, "application/xhtml+xml");
  const json = mediaQ(accept, "application/json");
  if (html == null) return false;
  if (json == null) return html > 0;
  return html > json;
}

export function headMeta(origin, title, description, canonicalPath) {
  const base = String(origin || "").replace(/\/$/, "");
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const canonical = base + path;
  const image = `${base}/sigil.png`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="author" content="${escapeHtml(AUTHOR_NAME)}">
<meta name="citation_author" content="${escapeHtml(AUTHOR_NAME)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="sitemap" type="application/xml" href="${base}/sitemap.xml">
<link rel="sitemap" type="application/xml" href="${base}/sitemap-index.xml">
<link rel="alternate" type="text/plain" href="${base}/llms.txt" title="llms.txt">
<link rel="alternate" type="application/json" href="${base}/cite.json" title="cite.json">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="${escapeHtml(AUTHOR_NAME)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="Everblooming sigil — Aziel Eliab">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">`;
}

function donateFooter() {
  return `<footer class="donate"><p><a href="${DONATE_CANONICAL}">${escapeHtml(DONATE_FOOTER_RUNTIME)}</a></p></footer>`;
}

function brandRow() {
  return `  <div class="brandrow">
    <img class="brandmark" src="/sigil.png" width="40" height="40" alt="Everblooming sigil — Aziel Eliab" decoding="async">
    <p class="stamp">Everblooming sigil · Aziel Eliab</p>
  </div>`;
}

function hubListHtml() {
  const items = softwareHubCrawl()
    .map(
      (h) =>
        `    <li><a href="${escapeHtml(h.software_tab)}">${escapeHtml(h.name)} Software tab</a> · <a href="${escapeHtml(h.cite)}">cite.json</a> · <a href="${escapeHtml(h.llms)}">llms.txt</a> · <a href="${escapeHtml(h.sitemap)}">sitemap.xml</a></li>`,
    )
    .join("\n");
  return `<ul>\n${items}\n  </ul>`;
}

export function softwareJsonLd(origin, catalog) {
  const base = String(origin || "").replace(/\/$/, "");
  const person = personJsonLd();
  const entries = (catalog && catalog.software) || [];
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebPage",
        "@id": `${base}/v1/software#page`,
        name: SOFTWARE_PAGE_TITLE,
        url: `${base}/v1/software`,
        description: SOFTWARE_PAGE_DESCRIPTION,
        isPartOf: { "@id": `${base}/#website` },
        author: { "@id": person["@id"] },
        about: { "@id": `${base}/#runtime` },
      },
      {
        "@type": "ItemList",
        "@id": `${base}/v1/software#list`,
        name: "Aziel Eliab software (Plain → Gate → Lock)",
        url: `${base}/v1/software`,
        numberOfItems: entries.length,
        itemListElement: entries.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.name,
          url: s.agent && s.agent.fraggate_describe ? s.agent.fraggate_describe : `${base}/v1/fraggate/describe?slug=${encodeURIComponent(s.slug)}`,
          item: {
            "@type": "SoftwareApplication",
            name: s.name,
            description: s.one_line,
            softwareVersion: s.version || undefined,
            url: s.worker_home || `${base}/v1/software`,
            downloadUrl: s.download_url || undefined,
            codeRepository: s.github || undefined,
            author: { "@id": person["@id"] },
            license: "https://www.apache.org/licenses/LICENSE-2.0",
          },
        })),
      },
    ],
  };
}

export function describeJsonLd(origin, body) {
  const base = String(origin || "").replace(/\/$/, "");
  const person = personJsonLd();
  const slug = body && body.slug ? String(body.slug) : "";
  const name = (body && body.name) || slug || "FragGate";
  const url = slug ? `${base}/v1/fraggate/describe?slug=${encodeURIComponent(slug)}` : `${base}/v1/fraggate/describe`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        name: `${name} — FragGate describe — ${PRODUCT_NAME}`,
        url,
        description: (body && (body.description || body.note)) || DESCRIBE_INDEX_DESCRIPTION,
        author: { "@id": person["@id"] },
      },
      {
        "@type": "SoftwareApplication",
        name,
        description: (body && (body.description || body.note)) || name,
        url,
        codeRepository: body && body.cross_map && body.cross_map.github,
        author: { "@id": person["@id"] },
        license: "https://www.apache.org/licenses/LICENSE-2.0",
      },
    ],
  };
}

function documentShell(origin, title, description, canonicalPath, jsonLd, css, inner) {
  const ld = JSON.stringify(jsonLd);
  return `<!doctype html>
<html lang="en">
<head>
${headMeta(origin, title, description, canonicalPath)}
<script type="application/ld+json">${ld}</script>
<style>${css}</style>
</head>
<body>
${brandRow()}
${inner}
${donateFooter()}
</body>
</html>`;
}

/** Homepage definition block — crawlers see this before version history. No CSS changes. */
export function homepageLeadHtml() {
  const notItems = RUNTIME_NOT.map((line) => `      <li>${escapeHtml(line)}</li>`).join("\n");
  return `  <h1>${escapeHtml(PRODUCT_NAME)}</h1>
  <p class="lead">${escapeHtml(RUNTIME_ABSTRACT)}</p>
  <p><strong>FragGate</strong> is THE single public executable door (list → describe → call) — not 37 separate APIs. Softwares are Plain → Gate → Lock catalog products with true in-process engines where live. Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) refresh Softwares tabs from <code>GET /v1/software</code>. Dual-surface: agents use OpenAPI/MCP; humans use Worker UI + counted <code>/download</code>.</p>
  <p>NodeMesh / QNM suite-presence is operator-enabled. <code>GET /v1/mesh</code> never enables. Full node process is local <code>qnm-node/</code>. MASTER-33: domains are isolation labels, not extra doors. Lamb Lens is the ethics hop after FragGate.</p>
  <p>Author / public identity: <strong>${escapeHtml(AUTHOR_NAME)}</strong> (also known as ${escapeHtml(AUTHOR_ALTERNATE_NAME)} — alternateName only). Product: ${escapeHtml(PRODUCT_NAME)} (<code>aziel-runtime</code>). Also published as ${escapeHtml(PRODUCT_ALTERNATE_NAME)} (alternateName).</p>
  <ul>
${notItems}
  </ul>`;
}

export function aboutJsonLd(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const person = personJsonLd();
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "AboutPage",
        "@id": `${base}/about#page`,
        name: ABOUT_PAGE_TITLE,
        url: `${base}/about`,
        description: RUNTIME_ABSTRACT,
        isPartOf: { "@id": `${base}/#website` },
        author: { "@id": person["@id"] },
        about: { "@id": `${base}/#runtime` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${base}/#runtime`,
        name: PRODUCT_NAME,
        alternateName: [PRODUCT_ALTERNATE_NAME],
        description: RUNTIME_ABSTRACT,
        url: `${base}/`,
        author: { "@id": person["@id"] },
        license: "https://www.apache.org/licenses/LICENSE-2.0",
      },
    ],
  };
}

export function aboutPageHtml(origin, css) {
  const base = String(origin || "").replace(/\/$/, "");
  const about = runtimeAboutField(origin);
  const notItems = about.not.map((line) => `    <li>${escapeHtml(line)}</li>`).join("\n");
  const inner = `  <p><a href="${base}/">← ${escapeHtml(PRODUCT_NAME)}</a> · <a href="${base}/v1/software">Softwares</a></p>
  <h1>About ${escapeHtml(PRODUCT_NAME)}</h1>
  <p class="lead">${escapeHtml(RUNTIME_ABSTRACT)}</p>
  <h2>What</h2>
  <p>${escapeHtml(RUNTIME_ONE_LINE)}</p>
  <h2>For whom</h2>
  <p>${escapeHtml(about.for_whom)}</p>
  <h2>How agents call it</h2>
  <p>${escapeHtml(about.how_agents)}</p>
  <h2>How hubs use it</h2>
  <p>${escapeHtml(about.how_hubs)}</p>
  <h2>Architecture (secondary)</h2>
  <ul>
    <li>${escapeHtml(about.architecture.fraggate)}</li>
    <li>${escapeHtml(about.architecture.softwares)}</li>
    <li>${escapeHtml(about.architecture.dual_surface)}</li>
    <li>${escapeHtml(about.architecture.nodemesh)}</li>
    <li>${escapeHtml(about.architecture.master33)}</li>
  </ul>
  <h2>What it is not</h2>
  <ul>
${notItems}
  </ul>
  <p>Author: <strong>${escapeHtml(AUTHOR_NAME)}</strong> (also known as ${escapeHtml(AUTHOR_ALTERNATE_NAME)}). Machine record: <a href="${base}/cite.json">/cite.json</a> · <a href="${base}/llms.txt">/llms.txt</a>. GET /v1/mesh never enables.</p>
  <h2>Softwares hubs</h2>
  ${hubListHtml()}`;
  return documentShell(origin, ABOUT_PAGE_TITLE, ABOUT_PAGE_DESCRIPTION, "/about", aboutJsonLd(origin), css, inner);
}

export function softwareCatalogHtml(origin, catalog, css) {
  const base = String(origin || "").replace(/\/$/, "");
  const entries = (catalog && catalog.software) || [];
  const rows = entries
    .map((s) => {
      const describe = `${base}/v1/fraggate/describe?slug=${encodeURIComponent(s.slug)}`;
      const card = s.status === "stub" ? describe : `${base}/p/${s.slug}`;
      const home = s.worker_home
        ? ` · <a href="${escapeHtml(s.worker_home)}">Worker</a>`
        : "";
      const gh = s.github ? ` · <a href="${escapeHtml(s.github)}">GitHub</a>` : "";
      return `    <li data-slug="${escapeHtml(s.slug)}"><a href="${escapeHtml(card)}">${escapeHtml(s.name)}</a> <span class="slug">${escapeHtml(s.bucket)} · ${escapeHtml(s.status)}</span> — ${escapeHtml(s.one_line || "")} · <a href="${escapeHtml(describe)}">describe</a>${home}${gh}</li>`;
    })
    .join("\n");
  const inner = `  <p><a href="${base}/">← ${escapeHtml(PRODUCT_NAME)}</a></p>
  <h1>Softwares</h1>
  <p class="lead">${escapeHtml(SOFTWARE_PAGE_DESCRIPTION)}</p>
  <p>Author: <strong>${escapeHtml(AUTHOR_NAME)}</strong> (also known as ${escapeHtml(AUTHOR_ALTERNATE_NAME)}). Machine JSON: <a href="${base}/v1/software">GET /v1/software</a> (default). FragGate mirror: <a href="${base}/v1/fraggate/software">/v1/fraggate/software</a>. Cite: <a href="${base}/cite.json">/cite.json</a> · <a href="${base}/llms.txt">/llms.txt</a>. ${escapeHtml(LIBRARY_NAME)}: <a href="${LIBRARY_ORIGIN}/">${LIBRARY_ORIGIN}/</a>. GET /v1/mesh never enables.</p>
  <h2>Softwares hubs</h2>
  ${hubListHtml()}
  <p>AZCoherence (AZC-0.1): <a href="${base}/v1/fraggate/describe?slug=azcoherence">describe</a> · <a href="${AZCOHERENCE_GITHUB}">GitHub</a> · <a href="${AZCOHERENCE_WORKER}/">Worker</a>. Not AKM-TRIAD.</p>
  <h2>Catalog</h2>
  <ol>
${rows}
  </ol>`;
  return documentShell(
    origin,
    SOFTWARE_PAGE_TITLE,
    SOFTWARE_PAGE_DESCRIPTION,
    "/v1/software",
    softwareJsonLd(origin, catalog),
    css,
    inner,
  );
}

export function describeIndexHtml(origin, entries, css) {
  const base = String(origin || "").replace(/\/$/, "");
  const items = (entries || [])
    .map((e) => {
      const href = `${base}/v1/fraggate/describe?slug=${encodeURIComponent(e.slug)}`;
      return `    <li data-slug="${escapeHtml(e.slug)}"><a href="${escapeHtml(href)}">${escapeHtml(e.name || e.slug)}</a> <span class="slug">${escapeHtml(e.slug)}</span></li>`;
    })
    .join("\n");
  const inner = `  <p><a href="${base}/">← ${escapeHtml(PRODUCT_NAME)}</a> · <a href="${base}/v1/software">Softwares</a></p>
  <h1>FragGate describe</h1>
  <p class="lead">${escapeHtml(DESCRIBE_INDEX_DESCRIPTION)}</p>
  <p>Author: <strong>${escapeHtml(AUTHOR_NAME)}</strong>. Kernel: <a href="${AUTHOR_GITHUB}/fraggate">fraggate</a>. Pipeline: fraggate_list → fraggate_describe → fraggate_call. JSON: <code>GET /v1/fraggate/describe?slug=</code>.</p>
  <h2>Softwares hubs</h2>
  ${hubListHtml()}
  <h2>Names</h2>
  <ul>
${items}
  </ul>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      personJsonLd(),
      {
        "@type": "WebPage",
        "@id": `${base}/v1/fraggate/describe#page`,
        name: DESCRIBE_INDEX_TITLE,
        url: `${base}/v1/fraggate/describe`,
        description: DESCRIBE_INDEX_DESCRIPTION,
        author: { "@id": `${AUTHOR_GITHUB}#person` },
      },
    ],
  };
  return documentShell(origin, DESCRIBE_INDEX_TITLE, DESCRIBE_INDEX_DESCRIPTION, "/v1/fraggate/describe", ld, css, inner);
}

export function describeDocsHtml(origin, body, css) {
  const base = String(origin || "").replace(/\/$/, "");
  const slug = body && body.slug ? String(body.slug) : "";
  const name = (body && body.name) || slug || "FragGate";
  const title = `${name} — FragGate describe — ${PRODUCT_NAME}`;
  const description = `${name}: ${(body && (body.description || body.note)) || "FragGate describe."} Author Aziel Eliab. Apache-2.0.`;
  const canonical = `/v1/fraggate/describe?slug=${encodeURIComponent(slug)}`;
  const ops = Array.isArray(body.ops) && body.ops.length ? body.ops.map((o) => `<code>${escapeHtml(o)}</code>`).join(" ") : "<em>none</em>";
  const stubs =
    Array.isArray(body.stub_ops) && body.stub_ops.length
      ? body.stub_ops.map((o) => `<code>${escapeHtml(o)}</code>`).join(" ")
      : "<em>none listed</em>";
  const peers = Array.isArray(body.peers)
    ? body.peers
        .map((p) => `<li>${escapeHtml(p.name || p.slug)} (${escapeHtml(p.role || p.kind || "peer")})</li>`)
        .join("")
    : "";
  const worker = body.worker_url
    ? `<p>Worker: <a href="${escapeHtml(body.worker_url)}">${escapeHtml(body.worker_url)}</a></p>`
    : "";
  const gh =
    body.cross_map && body.cross_map.github
      ? `<p>GitHub: <a href="${escapeHtml(body.cross_map.github)}">${escapeHtml(body.cross_map.github)}</a></p>`
      : "";
  const inner = `  <p><a href="${base}/">← ${escapeHtml(PRODUCT_NAME)}</a> · <a href="${base}/v1/software">Softwares</a> · <a href="${base}/v1/fraggate/describe">describe index</a></p>
  <h1>${escapeHtml(name)}</h1>
  <p class="slug">${escapeHtml(slug)} · ${escapeHtml(body.status || "")} · door=fraggate</p>
  <p class="lead">${escapeHtml(body.description || body.note || "")}</p>
  <p>Author: <strong>${escapeHtml(AUTHOR_NAME)}</strong> (also known as ${escapeHtml(AUTHOR_ALTERNATE_NAME)}). JSON: <a href="${base}${canonical}">${canonical}</a>. Catalog card: ${
    body.stub ? `<a href="${base}${canonical}">stub — describe only</a>` : `<a href="${base}/p/${escapeHtml(slug)}">/p/${escapeHtml(slug)}</a>`
  }. Call: <code>POST ${base}/v1/fraggate/call { slug: "${escapeHtml(slug)}", op }</code>. GET /v1/mesh never enables.</p>
  ${worker}
  ${gh}
  <h2>LIVE_OPS</h2>
  <p>${ops}</p>
  <h2>Stub ops (refuse)</h2>
  <p>${stubs}</p>
  ${peers ? `<h2>Peers</h2><ul>${peers}</ul>` : ""}
  <h2>Softwares hubs</h2>
  ${hubListHtml()}
  <p>Pipeline: <code>${escapeHtml(body.pipeline_strip || "")}</code></p>`;
  return documentShell(origin, title, description, canonical, describeJsonLd(origin, body), css, inner);
}

export function describeUnknownHtml(origin, body, css) {
  const title = `Unknown FragGate name — ${PRODUCT_NAME}`;
  const description = "Unknown FragGate name. Not in the registry. Identity Aziel Eliab only. Do not invent tools.";
  const inner = `  <p><a href="${origin}/v1/fraggate/describe">← FragGate describe</a></p>
  <h1>Unknown name</h1>
  <p class="lead">${escapeHtml((body && body.message) || "Not in the FragGate registry.")}</p>
  <p>Author: ${escapeHtml(AUTHOR_NAME)}. GET /v1/fraggate/list for live names. GET /v1/mesh never enables.</p>`;
  return documentShell(origin, title, description, "/v1/fraggate/describe", describeJsonLd(origin, body || {}), css, inner);
}
