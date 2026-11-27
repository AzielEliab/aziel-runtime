/**
 * Public RSS 2.0 feed for this Worker.
 *
 * An item is included only when a date is already recorded:
 * the GitHub release published_at, the Softwares catalog updated_at,
 * or a RIB note whose source line names that RIB and a calendar day.
 * A missing or impossible date is left out. A calendar day with no clock
 * is published as 00:00:00 GMT, and the item says so.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const SITE_RSS_PATH = "/rss.xml";
export const SITE_RSS_ALIAS = "/feed.xml";
/** Public runtime origin. The feed never copies the request host. */
export const SITE_RSS_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";

const GITHUB = "https://github.com/AzielEliab/aziel-runtime";

/** GitHub Releases published_at for tag v2.0.0-rc1. Pre-release. */
export const RELEASE_PUBLISHED_AT = "2026-09-11T01:23:57Z";

/**
 * RIB notes whose source line names the id and a calendar day.
 * line is 1-based. The feed quotes that line's date role, not a new date.
 */
export const RIB_RECORDS = Object.freeze([
  {
    id: "ack-clock",
    ribs: Object.freeze(["RIB-064", "RIB-065", "RIB-066", "RIB-067"]),
    date: "2026-10-30",
    date_role: "source date",
    source: "docs/designs/AZRT-ACK-CLOCK-1.0.md",
    line: 5,
    title: "RIB-064, RIB-065, RIB-066, and RIB-067",
    link: `${GITHUB}/blob/main/docs/designs/AZRT-ACK-CLOCK-1.0.md#L5`,
  },
  {
    id: "rib-018-follow-up",
    ribs: Object.freeze(["RIB-018"]),
    date: "2026-10-19",
    date_role: "follow-up review date",
    source: "src/refusal-doors.js",
    line: 104,
    title: "RIB-018 follow-up",
    link: `${GITHUB}/blob/main/src/refusal-doors.js#L104`,
  },
  {
    id: "rib-015-reinforced",
    ribs: Object.freeze(["RIB-015"]),
    date: "2026-10-08",
    date_role: "reinforced date",
    source: "src/issuer-append.js",
    line: 2,
    title: "RIB-015 issuer append",
    link: `${GITHUB}/blob/main/src/issuer-append.js#L2`,
  },
]);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function calendarDay(raw) {
  const s = String(raw == null ? "" : raw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return s;
}

export function rfc822Utc(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${DAYS[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} GMT`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dayItem(fields, day) {
  const calendar = calendarDay(day);
  if (!calendar) return null;
  const iso = `${calendar}T00:00:00Z`;
  const pubDate = rfc822Utc(iso);
  if (!pubDate) return null;
  return { ...fields, iso, pubDate, clock: "00:00:00 GMT because the source recorded a calendar day and no clock time" };
}

/**
 * Newest static recorded day (release or RIB). The catalog date is not
 * included: it is known only when the Worker serves the feed.
 */
export function siteRssStaticLastmod() {
  const days = [calendarDay(RELEASE_PUBLISHED_AT.slice(0, 10))];
  for (const row of RIB_RECORDS) days.push(calendarDay(row.date));
  return days.filter(Boolean).sort().at(-1) || null;
}

export function siteRssItems({ origin, updatedAt = null, softwareCount = null } = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const items = [];

  const releasePub = rfc822Utc(RELEASE_PUBLISHED_AT);
  if (releasePub) {
    items.push({
      kind: "release",
      guid: "aziel-runtime:release:v2.0.0-rc1",
      title: "Aziel Runtime 2.0.0-rc1",
      link: `${GITHUB}/releases/tag/v2.0.0-rc1`,
      iso: RELEASE_PUBLISHED_AT,
      pubDate: releasePub,
      description: `GitHub release v2.0.0-rc1. published_at ${RELEASE_PUBLISHED_AT}. Pre-release. Worker version stays 2.0.0-rc1.`,
    });
  }

  const catalogDay = calendarDay(updatedAt);
  const count = Number.isInteger(softwareCount) && softwareCount >= 0 ? softwareCount : null;
  if (catalogDay && base) {
    const software = dayItem(
      {
        kind: "software",
        guid: "aziel-runtime:software-catalog",
        title: "Softwares catalog",
        link: `${base}/v1/software`,
        description: `Catalog updated_at ${catalogDay}. GET /v1/software${count == null ? "" : `. ${count} Softwares on this response`}. This is the catalog date, not a separate release date for each Software.`,
      },
      catalogDay,
    );
    if (software) items.push(software);
  }

  for (const row of RIB_RECORDS) {
    const names = row.ribs.join(", ");
    const rib = dayItem(
      {
        kind: "rib",
        guid: `aziel-runtime:rib:${row.id}`,
        title: row.title,
        link: row.link,
        description: `${names}. ${row.date_role} ${row.date} on ${row.source} line ${row.line}.`,
      },
      row.date,
    );
    if (rib) items.push(rib);
  }

  items.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : a.guid < b.guid ? -1 : a.guid > b.guid ? 1 : 0));
  return items;
}

export function siteRssXml(_origin, options = {}) {
  const base = SITE_RSS_ORIGIN;
  const items = siteRssItems({ origin: base, ...options });
  const self = `${base}${SITE_RSS_PATH}`;
  // Newest recorded item date. Not the request clock.
  const newest = items[0] ? items[0].pubDate : null;
  const body = items
    .map((item) => {
      const clock = item.clock ? ` ${item.clock}.` : "";
      return `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${escapeXml(item.link)}</link>
    <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
    <pubDate>${escapeXml(item.pubDate)}</pubDate>
    <category>${escapeXml(item.kind)}</category>
    <dc:creator>Aziel Eliab</dc:creator>
    <description>${escapeXml(item.description + clock)}</description>
  </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Aziel Runtime</title>
  <link>${escapeXml(base)}/</link>
  <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>
  <description>Public feed for Aziel Runtime. Items are the GitHub release, the Softwares catalog when that catalog has a date, and RIB notes that record a date on the same source line.</description>
  <language>en</language>
  <dc:creator>Aziel Eliab</dc:creator>
${newest ? `  <lastBuildDate>${newest}</lastBuildDate>\n` : ""}<generator>aziel-runtime</generator>
${body}
</channel>
</rss>
`;
}
