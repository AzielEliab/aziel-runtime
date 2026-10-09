/**
 * AZNews feed reader (AZNEWS-FEED-1.0): RSS 2.0 and Atom, regex-based, bounded.
 * Reads only the public feed document. Never scrapes article pages or paywalls.
 * full_text is true only when the feed itself carries the article body
 * (content:encoded or Atom <content>) of at least FULL_TEXT_MIN_CHARS characters
 * and longer than the summary. Otherwise the summary plus the canonical link is
 * stored and full_text is false.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
export const FEED_SPEC = "AZNEWS-FEED-1.0";
export const FEED_MAX_BYTES = 600000;
export const FULL_TEXT_MIN_CHARS = 600;
export const WORDING_MAX_CHARS = 20000;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(text) {
  return String(text || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
    }
    const hit = ENTITIES[code.toLowerCase()];
    return hit == null ? all : hit;
  });
}

function unwrap(raw) {
  return String(raw || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/** HTML or XML fragment to plain text (paragraph breaks kept). */
export function plainText(raw) {
  let text = decodeEntities(unwrap(raw));
  text = text.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t\r\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function tagRaw(chunk, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(chunk);
  return m ? m[1] : "";
}

function linkOf(chunk) {
  const alt = /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(chunk) || /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i.exec(chunk);
  if (alt) return decodeEntities(alt[1]);
  const href = /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(chunk);
  if (href) return decodeEntities(href[1]);
  const text = plainText(tagRaw(chunk, "link"));
  if (text) return text;
  const guid = /<guid\b[^>]*isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i.exec(chunk);
  return guid ? plainText(guid[1]) : "";
}

function imagesOf(chunk, htmlBodies) {
  const urls = [];
  const push = (u) => {
    const url = decodeEntities(String(u || "").trim());
    if (/^https?:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  };
  for (const re of [/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/gi, /<media:thumbnail\b[^>]*url=["']([^"']+)["']/gi, /<enclosure\b[^>]*url=["']([^"']+)["'][^>]*>/gi]) {
    let m;
    while ((m = re.exec(chunk))) {
      if (/<enclosure/i.test(m[0]) && /type=["'](?!image)/i.test(m[0])) continue;
      if (/<media:content/i.test(m[0]) && /medium=["'](?!image)/i.test(m[0])) continue;
      push(m[1]);
    }
  }
  for (const body of htmlBodies) {
    const re = /<img\b[^>]*src=["']([^"']+)["']/gi;
    let m;
    const html = decodeEntities(unwrap(body));
    while ((m = re.exec(html))) push(m[1]);
  }
  return urls.slice(0, 4);
}

/** Canonical URL: https, lower-case host, no fragment, tracking params dropped. */
export function canonicalUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.protocol === "http:") u.protocol = "https:";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ocid|cmpid|ito|at_|smid|ref$|src$|rss$|feed$)/i.test(key)) u.searchParams.delete(key);
    }
    let out = u.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
    return out;
  } catch {
    return "";
  }
}

export function parseFeed(xml, { max = 50 } = {}) {
  const text = String(xml || "").slice(0, FEED_MAX_BYTES);
  let parts = text.split(/<item\b/i).slice(1);
  let atom = false;
  if (!parts.length) {
    parts = text.split(/<entry\b/i).slice(1);
    atom = true;
  }
  const out = [];
  for (const part of parts) {
    const chunk = part.split(atom ? /<\/entry>/i : /<\/item>/i)[0];
    const title = plainText(tagRaw(chunk, "title")).slice(0, 400);
    const summaryRaw = tagRaw(chunk, "description") || tagRaw(chunk, "summary");
    const bodyRaw = tagRaw(chunk, "content:encoded") || (atom ? tagRaw(chunk, "content") : "");
    const summary = plainText(summaryRaw);
    const body = plainText(bodyRaw);
    const full = body.length >= FULL_TEXT_MIN_CHARS && body.length > summary.length;
    const link = linkOf(chunk);
    if (!title && !summary && !body) continue;
    out.push({
      title,
      link,
      canonical_url: canonicalUrl(link),
      guid: plainText(tagRaw(chunk, "guid") || tagRaw(chunk, "id")).slice(0, 400),
      published_raw: plainText(tagRaw(chunk, "pubDate") || tagRaw(chunk, "published") || tagRaw(chunk, "updated") || tagRaw(chunk, "dc:date")),
      summary: summary.slice(0, WORDING_MAX_CHARS),
      wording: (full ? body : summary || title).slice(0, WORDING_MAX_CHARS),
      wording_truncated: (full ? body : summary || title).length > WORDING_MAX_CHARS,
      full_text: full,
      text_source: full ? "feed-body" : summary ? "feed-summary" : "feed-title",
      image_urls: imagesOf(chunk, [bodyRaw, summaryRaw]),
      raw: chunk.slice(0, 32000),
    });
    if (out.length >= max) break;
  }
  return out;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const ZONES = { GMT: 0, UTC: 0, UT: 0, Z: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7, IST: 5.5, BST: 1, CET: 1, CEST: 2, AEST: 10, AEDT: 11 };

/** RFC 822 / ISO 8601 to ISO UTC, or null. */
export function parseDate(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const t = Date.parse(text);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  const m = /^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([A-Za-z]{1,4}|[+-]\d{4})?/.exec(text);
  if (!m) {
    const t = Date.parse(text);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  const mon = MONTHS[m[2].toLowerCase()];
  if (mon == null) return null;
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  let ms = Date.UTC(year, mon, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  const zone = m[7] || "GMT";
  if (/^[+-]\d{4}$/.test(zone)) {
    const sign = zone[0] === "-" ? -1 : 1;
    ms -= sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3))) * 60000;
  } else if (ZONES[zone.toUpperCase()] != null) {
    ms -= ZONES[zone.toUpperCase()] * 3600000;
  }
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
