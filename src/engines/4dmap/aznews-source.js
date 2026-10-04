/**
 * AZNews source adapter.
 * Standalone catalog data for outlets, weather, and cited black-swan rows.
 * Not a Softwares card. Not an MCP tool. Not a live feed by itself.
 * A row stays configured-but-not-live until a fetch on this call returns an item.
 * No reading, rank, or event is filled in when the source did not publish it.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "../../session-core.js";

export const NEWS_RANKING = Object.freeze({
  publisher: "Press Gazette",
  title: "Top 50 English-language news sites in the world",
  article: "https://pressgazette.co.uk/media-audience-and-business-data/media_metrics/most-popular-websites-news-world-monthly-2/",
  chart: "https://datawrapper.dwcdn.net/RsAJi/1/",
  dataset: "https://datawrapper.dwcdn.net/RsAJi/1/dataset.csv",
  period: "August 2026",
  published: "2026-09-14",
  method: "Similarweb visit estimates, refined by Press Gazette to news publishers",
  scope: "English-language global top 50. Not an all-language circulation list.",
});

export const WEATHER_ADAPTER = Object.freeze({
  name: "open-meteo",
  cite: "https://open-meteo.com/",
  endpoint: "https://api.open-meteo.com/v1/forecast",
  fields: ["temperature_2m", "weather_code", "wind_speed_10m"],
  region_scheme: "UN M49 geographic subregions",
  region_cite: "https://unstats.un.org/unsd/methodology/m49/",
  note: "Coordinates are query keys for the adapter. They are not weather readings.",
});

/** rank, id, name, domain, country, august_2026_visits, homepage, feed_url, access */
const OUTLET_ROWS = [
  [1, "bbc", "BBC", "bbc.com", "GB", 818517932, "https://www.bbc.com/", "https://feeds.bbci.co.uk/news/rss.xml", "public-rss"],
  [2, "nytimes", "The New York Times", "nytimes.com", "US", 618945587, "https://www.nytimes.com/", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "public-rss"],
  [3, "msn", "MSN", "msn.com", "US", 411909971, "https://www.msn.com/", null, "unwired"],
  [4, "cnn", "CNN", "cnn.com", "US", 313340839, "https://www.cnn.com/", "http://rss.cnn.com/rss/edition.rss", "public-rss"],
  [5, "indiatimes", "Times of India", "indiatimes.com", "IN", 295423000, "https://timesofindia.indiatimes.com/", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "public-rss"],
  [6, "google-news", "Google News", "news.google.com", "US", 290809727, "https://news.google.com/", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", "public-rss"],
  [7, "guardian", "The Guardian", "theguardian.com", "GB", 284133655, "https://www.theguardian.com/", "https://www.theguardian.com/international/rss", "public-rss"],
  [8, "foxnews", "Fox News", "foxnews.com", "US", 226415829, "https://www.foxnews.com/", "https://moxie.foxnews.com/google-publisher/latest.xml", "public-rss"],
  [9, "dailymail", "Daily Mail", "dailymail.com", "GB", 212122734, "https://www.dailymail.com/", "https://www.dailymail.co.uk/articles.rss", "public-rss"],
  [10, "yahoo-finance", "Yahoo Finance", "finance.yahoo.com", "US", 210422689, "https://finance.yahoo.com/", "https://finance.yahoo.com/news/rssindex", "public-rss"],
  [11, "substack", "Substack", "substack.com", "US", 175946014, "https://substack.com/", null, "unwired"],
  [12, "people", "People", "people.com", "US", 168063431, "https://people.com/", "https://people.com/feed/", "paid-or-blocked"],
  [13, "yahoo-news", "Yahoo News", "news.yahoo.com", "US", 142778287, "https://news.yahoo.com/", "https://news.yahoo.com/rss", "public-rss"],
  [14, "ndtv", "NDTV", "ndtv.com", "IN", 128308226, "https://www.ndtv.com/", "https://feeds.feedburner.com/ndtvnews-top-stories", "public-rss"],
  [15, "oneindia", "Oneindia", "oneindia.com", "IN", 100945546, "https://www.oneindia.com/", "https://www.oneindia.com/rss/news-india-fb.xml", "public-rss"],
  [16, "nypost", "New York Post", "nypost.com", "US", 96577641, "https://nypost.com/", "https://nypost.com/feed/", "public-rss"],
  [17, "cnbc", "CNBC", "cnbc.com", "US", 93342625, "https://www.cnbc.com/", "https://www.cnbc.com/id/100003114/device/rss/rss.html", "public-rss"],
  [18, "usatoday", "USA Today", "usatoday.com", "US", 86703569, "https://www.usatoday.com/", "https://www.usatoday.com/rss/", "paid-or-blocked"],
  [19, "hindustantimes", "Hindustan Times", "hindustantimes.com", "IN", 84448518, "https://www.hindustantimes.com/", "https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml", "public-rss"],
  [20, "wsj", "The Wall Street Journal", "wsj.com", "US", 80823514, "https://www.wsj.com/", "https://feeds.a.dj.com/rss/RSSWorldNews.xml", "public-rss"],
  [21, "ap", "Associated Press", "apnews.com", "US", 76391910, "https://apnews.com/", null, "paid-or-blocked"],
  [22, "nbcnews", "NBC News", "nbcnews.com", "US", 73607401, "https://www.nbcnews.com/", "https://feeds.nbcnews.com/nbcnews/public/world", "public-rss"],
  [23, "indianexpress", "The Indian Express", "indianexpress.com", "IN", 71730377, "https://indianexpress.com/", "https://indianexpress.com/section/india/feed/", "public-rss"],
  [24, "news18", "News18", "news18.com", "IN", 68566545, "https://www.news18.com/", null, "paid-or-blocked"],
  [25, "aljazeera", "Al Jazeera", "aljazeera.com", "QA", 66697134, "https://www.aljazeera.com/", "https://www.aljazeera.com/xml/rss/all.xml", "public-rss"],
  [26, "reuters", "Reuters", "reuters.com", "US", 65785529, "https://www.reuters.com/", null, "paid-or-blocked"],
  [27, "washingtonpost", "The Washington Post", "washingtonpost.com", "US", 64868363, "https://www.washingtonpost.com/", "https://feeds.washingtonpost.com/rss/world", "public-rss"],
  [28, "telegraph", "The Telegraph", "telegraph.co.uk", "GB", 64567390, "https://www.telegraph.co.uk/", "https://www.telegraph.co.uk/rss.xml", "paid-or-blocked"],
  [29, "forbes", "Forbes", "forbes.com", "US", 63885091, "https://www.forbes.com/", null, "unwired"],
  [30, "independent", "The Independent", "independent.co.uk", "GB", 63806951, "https://www.independent.co.uk/", "https://www.independent.co.uk/rss", "public-rss"],
  [31, "india-com", "India.com", "india.com", "IN", 63197191, "https://www.india.com/", null, "paid-or-blocked"],
  [32, "cbsnews", "CBS News", "cbsnews.com", "US", 62611435, "https://www.cbsnews.com/", "https://www.cbsnews.com/latest/rss/main", "public-rss"],
  [33, "abc-au", "ABC News Australia", "abc.net.au", "AU", 61176735, "https://www.abc.net.au/news", "https://www.abc.net.au/news/feed/51120/rss.xml", "public-rss"],
  [34, "thehindu", "The Hindu", "thehindu.com", "IN", 59741370, "https://www.thehindu.com/", "https://www.thehindu.com/feeder/default.rss", "public-rss"],
  [35, "cbc", "CBC", "cbc.ca", "CA", 54808892, "https://www.cbc.ca/news", "https://rss.cbc.ca/lineup/topstories.xml", "public-rss"],
  [36, "thesun", "The Sun", "thesun.co.uk", "GB", 54201102, "https://www.thesun.co.uk/", "https://www.thesun.co.uk/feed/", "public-rss"],
  [37, "news-com-au", "news.com.au", "news.com.au", "AU", 53080569, "https://www.news.com.au/", null, "unwired"],
  [38, "npr", "NPR", "npr.org", "US", 52362628, "https://www.npr.org/", "https://feeds.npr.org/1001/rss.xml", "public-rss"],
  [39, "indiatoday", "India Today", "indiatoday.in", "IN", 51322835, "https://www.indiatoday.in/", "https://www.indiatoday.in/rss/1206578", "public-rss"],
  [40, "abcnews", "ABC News", "abcnews.com", "US", 47047857, "https://abcnews.com/", "https://abcnews.go.com/abcnews/topstories", "public-rss"],
  [41, "rediff", "Rediff", "rediff.com", "IN", 46931034, "https://www.rediff.com/", "https://www.rediff.com/rss/newsrss.xml", "public-rss"],
  [42, "buzzfeed", "BuzzFeed", "buzzfeed.com", "US", 46572632, "https://www.buzzfeed.com/", "https://www.buzzfeed.com/world.xml", "public-rss"],
  [43, "euronews", "Euronews", "euronews.com", "FR", 46158126, "https://www.euronews.com/", "https://www.euronews.com/rss?format=mrss", "public-rss"],
  [44, "drudge", "Drudge Report", "drudgereport.com", "US", 45772913, "https://www.drudgereport.com/", null, "unwired"],
  [45, "sky", "Sky News", "news.sky.com", "GB", 43120234, "https://news.sky.com/", "https://feeds.skynews.com/feeds/rss/home.xml", "public-rss"],
  [46, "variety", "Variety", "variety.com", "US", 42378504, "https://variety.com/", "https://variety.com/feed/", "public-rss"],
  [47, "newsnow", "NewsNow", "newsnow.co.uk", "GB", 41441377, "https://www.newsnow.co.uk/", null, "unwired"],
  [48, "businessinsider", "Business Insider", "businessinsider.com", "US", 41110891, "https://www.businessinsider.com/", "https://www.businessinsider.com/rss", "public-rss"],
  [49, "thehill", "The Hill", "thehill.com", "US", 38893374, "https://thehill.com/", "https://thehill.com/feed/", "public-rss"],
  [50, "mirror", "Daily Mirror", "mirror.co.uk", "GB", 37875445, "https://www.mirror.co.uk/", "https://www.mirror.co.uk/?service=rss", "public-rss"],
];

const ACCESS_REASON = {
  "public-rss": "Public RSS is wired. This catalog row is not a stored article, so it is not live.",
  "paid-or-blocked": "The public feed was metered or blocked when probed (HTTP 401, 402, or 403). Configured, not live.",
  unwired: "No unpaid public RSS document is recorded for this outlet. The homepage is kept. Not live.",
};

/** id, name, lat, lon. Coordinates are Open-Meteo query keys, not readings. */
const REGION_ROWS = [
  ["northern-africa", "Northern Africa", 30.0444, 31.2357],
  ["eastern-africa", "Eastern Africa", -1.2921, 36.8219],
  ["middle-africa", "Middle Africa", -4.4419, 15.2663],
  ["southern-africa", "Southern Africa", -26.2041, 28.0473],
  ["western-africa", "Western Africa", 6.5244, 3.3792],
  ["caribbean", "Caribbean", 17.9712, -76.7936],
  ["central-america", "Central America", 14.6349, -90.5069],
  ["south-america", "South America", -15.7939, -47.8828],
  ["northern-america", "Northern America", 38.9072, -77.0369],
  ["central-asia", "Central Asia", 41.2995, 69.2401],
  ["eastern-asia", "Eastern Asia", 35.6762, 139.6503],
  ["south-eastern-asia", "South-eastern Asia", 1.3521, 103.8198],
  ["southern-asia", "Southern Asia", 28.6139, 77.209],
  ["western-asia", "Western Asia", 39.9334, 32.8597],
  ["eastern-europe", "Eastern Europe", 55.7558, 37.6173],
  ["northern-europe", "Northern Europe", 59.3293, 18.0686],
  ["southern-europe", "Southern Europe", 41.9028, 12.4964],
  ["western-europe", "Western Europe", 48.8566, 2.3522],
  ["australia-new-zealand", "Australia and New Zealand", -35.2809, 149.13],
  ["melanesia", "Melanesia", -9.4438, 147.1803],
  ["micronesia", "Micronesia", 6.9248, 158.1611],
  ["polynesia", "Polynesia", -13.8506, -171.7513],
];

const BLACK_SWAN_PAGE = "https://en.wikipedia.org/wiki/Black_swan_theory";
const EDGE_TALEB = "https://www.edge.org/3rd_culture/taleb04/taleb_index.html";
const INVESTOPEDIA = "https://www.investopedia.com/terms/b/blackswan.asp";

const BLACK_SWAN_ROWS = [
  {
    id: "september-11-2001",
    date: "2001-09-11",
    date_precision: "day",
    event: "September 11 attacks",
    lat: 40.7115,
    lon: -74.0134,
    gazetteer_id: "event:september-11-2001",
    pinnable: true,
    wording:
      "Taleb provides the example of the 9/11 attacks, which were a black swan for many observers. The New York Stock Exchange and Nasdaq stayed closed until September 17, 2001.",
    cites: [BLACK_SWAN_PAGE],
  },
  {
    id: "world-war-i",
    date: "1914-07-28",
    date_precision: "day",
    date_note: "The black swan theory page names World War I and does not print this calendar day. 1914-07-28 is the public date Austria-Hungary declared war on Serbia.",
    event: "World War I",
    lat: null,
    lon: null,
    gazetteer_id: "event:world-war-i",
    pinnable: true,
    wording: "Taleb gives World War I as an example of a black swan event.",
    cites: [BLACK_SWAN_PAGE, "https://en.wikipedia.org/wiki/World_War_I"],
  },
  {
    id: "soviet-dissolution",
    date: "1991-12-26",
    date_precision: "day",
    date_note: "The black swan theory page names the dissolution and does not print this calendar day. 1991-12-26 is the public date the Soviet Union ceased to exist.",
    event: "Dissolution of the Soviet Union",
    lat: null,
    lon: null,
    gazetteer_id: "event:soviet-dissolution",
    pinnable: true,
    wording: "Taleb gives the dissolution of the Soviet Union as an example of a black swan event.",
    cites: [BLACK_SWAN_PAGE, "https://en.wikipedia.org/wiki/Dissolution_of_the_Soviet_Union"],
  },
  {
    id: "black-monday-1987",
    date: "1987-10-19",
    date_precision: "day",
    date_note: "The black swan theory page names Black Monday (1987). 1987-10-19 is the public session date of that name.",
    event: "Black Monday 1987",
    lat: null,
    lon: null,
    gazetteer_id: "event:black-monday-1987",
    pinnable: true,
    wording: "The black swan theory page names Black Monday (1987) as an extreme market move a simple daily-return model may include.",
    cites: [BLACK_SWAN_PAGE, "https://en.wikipedia.org/wiki/Black_Monday_(1987)"],
  },
  {
    id: "housing-crash-2008",
    date: "2008-09-15",
    date_precision: "day",
    date_note: "Investopedia names the 2008 housing market crash and does not print this day. 2008-09-15 is the public Lehman Brothers bankruptcy date used as the dated marker.",
    event: "2008 housing market crash",
    lat: null,
    lon: null,
    gazetteer_id: "event:housing-crash-2008",
    pinnable: true,
    wording: "Investopedia describes the 2008 housing market crash as an oft-cited black swan event.",
    cites: [INVESTOPEDIA, "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers"],
  },
  {
    id: "ltcm-1998",
    date: "1998-01-01",
    date_precision: "year",
    event: "LTCM collapse after the Russian debt default",
    lat: null,
    lon: null,
    gazetteer_id: "event:ltcm-1998",
    pinnable: true,
    wording: "Investopedia describes the 1998 collapse of Long-Term Capital Management after the Russian government's debt default. The page names the year and does not print a calendar day.",
    cites: [INVESTOPEDIA],
  },
  {
    id: "dotcom-2001",
    date: "2001-01-01",
    date_precision: "year",
    event: "Dot-com bubble",
    lat: null,
    lon: null,
    gazetteer_id: "event:dotcom-2001",
    pinnable: true,
    wording: "Investopedia names the dot-com bubble of 2001 as a black swan event. The page names the year and does not print a calendar day.",
    cites: [INVESTOPEDIA],
  },
  {
    id: "zimbabwe-hyperinflation-2008",
    date: "2008-01-01",
    date_precision: "year",
    event: "Zimbabwe hyperinflation",
    lat: null,
    lon: null,
    gazetteer_id: "event:zimbabwe-hyperinflation-2008",
    pinnable: true,
    wording: "Investopedia names Zimbabwe's 2008 hyperinflation, with a peak inflation rate of more than 79.6 billion percent. The page names the year and does not print a calendar day.",
    cites: [INVESTOPEDIA],
  },
  {
    id: "covid-19-2020",
    date: "2020-01-01",
    date_precision: "year",
    event: "COVID-19 pandemic",
    lat: null,
    lon: null,
    gazetteer_id: "event:covid-19-2020",
    pinnable: true,
    wording:
      "Investopedia calls the COVID-19 pandemic a black swan. The black swan theory page records that Taleb calls it a white swan: a high-impact event he treats as expected. Both labels are kept. Neither page prints a single calendar day here.",
    cites: [INVESTOPEDIA, BLACK_SWAN_PAGE],
    labels: ["investopedia: black swan", "taleb via wikipedia: white swan"],
  },
  {
    id: "rise-of-the-internet",
    date: null,
    date_precision: "absent",
    event: "Rise of the Internet",
    lat: null,
    lon: null,
    gazetteer_id: null,
    pinnable: false,
    wording: "Taleb gives the rise of the Internet as an example of a black swan event. The page does not print a calendar day, so this row is not pinned.",
    cites: [BLACK_SWAN_PAGE],
  },
  {
    id: "personal-computer",
    date: null,
    date_precision: "absent",
    event: "Personal computer",
    lat: null,
    lon: null,
    gazetteer_id: null,
    pinnable: false,
    wording: "Taleb gives the personal computer as an example of a black swan event. The page does not print a calendar day, so this row is not pinned.",
    cites: [BLACK_SWAN_PAGE],
  },
  {
    id: "internet-bubble",
    date: null,
    date_precision: "absent",
    event: "Internet bubble",
    lat: null,
    lon: null,
    gazetteer_id: null,
    pinnable: false,
    wording: "Taleb's Edge.org essay names the Internet bubble among events that were not predicted. The essay does not print a calendar day, so this row is not pinned.",
    cites: [EDGE_TALEB],
  },
  {
    id: "rise-of-hitler",
    date: null,
    date_precision: "absent",
    event: "Rise of Hitler",
    lat: null,
    lon: null,
    gazetteer_id: null,
    pinnable: false,
    wording: "Taleb's Edge.org essay names the rise of Hitler among events that were not predicted. The essay does not print a calendar day, so this row is not pinned.",
    cites: [EDGE_TALEB],
  },
  {
    id: "soviet-bloc-demise",
    date: null,
    date_precision: "absent",
    event: "Demise of the Soviet bloc",
    lat: null,
    lon: null,
    gazetteer_id: null,
    pinnable: false,
    wording: "Taleb's Edge.org essay names the demise of the Soviet bloc. The essay does not print a calendar day. The dated dissolution row is separate.",
    cites: [EDGE_TALEB],
  },
];

function outletFromRow(row) {
  const [rank, id, name, domain, country, visits, homepage, feed_url, access] = row;
  return {
    rank,
    id,
    name,
    domain,
    country,
    august_2026_visits: visits,
    homepage,
    feed_url,
    access,
    configured: true,
    live: false,
    status: "configured-but-not-live",
    reason: ACCESS_REASON[access] || ACCESS_REASON.unwired,
    installed: false,
    mesh_node: false,
  };
}

export function newsOutlets() {
  return OUTLET_ROWS.map(outletFromRow);
}

export function outletById(id) {
  const key = String(id || "").trim().toLowerCase();
  return newsOutlets().find((row) => row.id === key || row.domain === key) || null;
}

export function rankScore(rank) {
  const n = Number(rank);
  if (!Number.isInteger(n) || n < 1 || n > 50) return null;
  return Number(((51 - n) / 50).toFixed(4));
}

export function weatherRegions() {
  return REGION_ROWS.map(([id, name, lat, lon]) => ({
    id,
    name,
    lat,
    lon,
    query_key: true,
    reading: null,
    gap: true,
    live: false,
    origin: null,
    scheme: WEATHER_ADAPTER.region_scheme,
    cite: WEATHER_ADAPTER.region_cite,
  }));
}

export function regionById(id) {
  const key = String(id || "").trim().toLowerCase();
  return weatherRegions().find((row) => row.id === key) || null;
}

export function blackSwanCatalog() {
  return BLACK_SWAN_ROWS.map((row) => ({
    ...row,
    cites: row.cites.slice(),
    labels: row.labels ? row.labels.slice() : [],
    score: 1,
    score_kind: "cited-row",
    truth_score: false,
    live: false,
    image_gap: true,
    images: [],
    image_note: "The cite does not include an image. None was attached and none was dropped.",
  }));
}

export function blackSwanById(id) {
  const key = String(id || "").trim().toLowerCase();
  return blackSwanCatalog().find((row) => row.id === key) || null;
}

function decodeXml(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(chunk, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const found = re.exec(chunk);
  return found ? decodeXml(found[1]) : "";
}

function pickLink(chunk) {
  const href = /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(chunk);
  if (href) return href[1];
  return pickTag(chunk, "link");
}

function pickEnclosure(chunk) {
  const media = /<media:content\b[^>]*url=["']([^"']+)["']/i.exec(chunk);
  if (media) return media[1];
  const enc = /<enclosure\b[^>]*url=["']([^"']+)["']/i.exec(chunk);
  return enc ? enc[1] : "";
}

export function rssItems(xml) {
  const text = String(xml || "");
  const parts = text.split(/<item\b/i).slice(1);
  const chunks = parts.length ? parts : text.split(/<entry\b/i).slice(1);
  const out = [];
  for (const chunk of chunks) {
    const title = pickTag(chunk, "title");
    const wording = pickTag(chunk, "description") || pickTag(chunk, "summary") || pickTag(chunk, "content");
    if (!title && !wording) continue;
    out.push({
      title,
      link: pickLink(chunk),
      date: pickTag(chunk, "pubDate") || pickTag(chunk, "updated") || pickTag(chunk, "published"),
      wording: wording || title,
      image_url: pickEnclosure(chunk) || "",
    });
    if (out.length >= 3) break;
  }
  return out;
}

function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function bytesFromB64(b64) {
  const clean = String(b64 || "").replace(/\s/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashBytes(bytes) {
  return sha256Hex(bytes);
}

/**
 * Keep image bytes, or the content hash plus a fetch URL.
 * A missing image is an empty list with a gap flag. The URL is not discarded.
 */
export async function captureImage(raw, fetchImpl) {
  if (raw == null || raw === "") {
    return { images: [], image_gap: true, dropped: false };
  }
  const list = Array.isArray(raw) ? raw : [raw];
  const images = [];
  for (const entry of list) {
    if (typeof entry === "string") {
      images.push(await oneImage({ url: entry }, fetchImpl));
      continue;
    }
    images.push(await oneImage(entry || {}, fetchImpl));
  }
  return { images, image_gap: images.length === 0, dropped: false };
}

async function oneImage(entry, fetchImpl) {
  const url = entry.url || entry.fetch_url || entry.src || "";
  let bytes = null;
  if (entry.bytes instanceof Uint8Array) bytes = entry.bytes;
  else if (typeof entry.b64 === "string" && entry.b64.trim()) bytes = bytesFromB64(entry.b64);
  else if (typeof entry.base64 === "string" && entry.base64.trim()) bytes = bytesFromB64(entry.base64);
  let fetched = false;
  if (!bytes && url && entry.fetch !== false && fetchImpl) {
    try {
      const res = await fetchImpl(url, { headers: { "user-agent": "Mozilla/5.0" } });
      if (res && res.ok) {
        const buf = await res.arrayBuffer();
        bytes = new Uint8Array(buf);
        fetched = true;
      }
    } catch {
      fetched = false;
    }
  }
  if (bytes) {
    const sha256 = await hashBytes(bytes);
    const claimed = String(entry.sha256 || entry.hash || "").trim().toLowerCase();
    if (claimed && claimed !== sha256) {
      const err = new Error("The supplied image hash does not match the image bytes.");
      err.code = "AZNEWS-IMAGE-MISMATCH";
      throw err;
    }
    const keep = bytes.length <= 4096;
    return {
      sha256,
      fetch_url: url || null,
      byte_length: bytes.length,
      b64: keep ? bytesToB64(bytes) : null,
      bytes_stored: keep,
      fetched,
      verified: true,
      dropped: false,
    };
  }
  const claimed = String(entry.sha256 || entry.hash || "").trim().toLowerCase();
  if (claimed && !/^[a-f0-9]{64}$/.test(claimed)) {
    const err = new Error("An image hash must be 64 hex characters, or the image bytes must be supplied.");
    err.code = "AZNEWS-IMAGE-MISMATCH";
    throw err;
  }
  return {
    sha256: claimed || null,
    fetch_url: url || null,
    byte_length: null,
    b64: null,
    bytes_stored: false,
    fetched: false,
    verified: false,
    dropped: false,
  };
}

export function imageReady(images) {
  return Array.isArray(images) && images.some((row) => row && row.sha256 && (row.fetch_url || row.bytes_stored || row.verified));
}

export async function pullOutlet(outlet, fetchImpl) {
  const base = { ...outlet, live: false, status: "configured-but-not-live", fetched: false, item: null };
  if (!outlet || !outlet.feed_url) return { ...base, reason: outlet ? outlet.reason : "That outlet is not in the ranking." };
  if (!fetchImpl) return base;
  let res;
  try {
    res = await fetchImpl(outlet.feed_url, {
      headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "user-agent": "Mozilla/5.0" },
    });
  } catch (err) {
    return { ...base, reason: `The feed was not fetched. ${err && err.message ? err.message : "fetch failed"}` };
  }
  if (!res || !res.ok) {
    return {
      ...base,
      http_status: res && res.status ? res.status : null,
      reason: `The feed responded ${res && res.status ? res.status : "without a document"}. Configured, not live.`,
    };
  }
  const xml = await res.text();
  const items = rssItems(xml);
  if (!items.length) return { ...base, reason: "The feed document had no item. Configured, not live." };
  return {
    ...base,
    fetched: true,
    status: "fetched",
    live: false,
    item: items[0],
    reason: "A feed item was read on this call. The catalog row stays not live until that item is stored with wording, an image hash, and a score.",
  };
}

export function weatherUrl(region) {
  const params = new URLSearchParams({
    latitude: String(region.lat),
    longitude: String(region.lon),
    current: WEATHER_ADAPTER.fields.join(","),
  });
  return `${WEATHER_ADAPTER.endpoint}?${params.toString()}`;
}

export async function pullWeather(region, fetchImpl) {
  const gap = {
    ...region,
    reading: null,
    gap: true,
    live: false,
    origin: null,
    score: 0,
    score_kind: "observation-present",
    wording: `No observation for ${region.name}. None was filled in.`,
  };
  if (!fetchImpl) return { ...gap, reason: "The Open-Meteo adapter was not asked to fetch." };
  let res;
  try {
    res = await fetchImpl(weatherUrl(region), { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } });
  } catch (err) {
    return { ...gap, reason: `Open-Meteo was not reached. ${err && err.message ? err.message : "fetch failed"}` };
  }
  if (!res || !res.ok) {
    return { ...gap, http_status: res && res.status ? res.status : null, reason: "Open-Meteo did not return an observation." };
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return { ...gap, reason: "Open-Meteo did not return JSON." };
  }
  const current = body && body.current;
  const temp = current && current.temperature_2m;
  if (typeof temp !== "number" || !Number.isFinite(temp)) {
    return { ...gap, reason: "Open-Meteo JSON had no temperature_2m. The gap is recorded." };
  }
  const reading = {
    temperature_2m: temp,
    weather_code: typeof current.weather_code === "number" ? current.weather_code : null,
    wind_speed_10m: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : null,
    time: current.time || null,
  };
  return {
    ...region,
    reading,
    gap: false,
    live: true,
    origin: "open-meteo",
    score: 1,
    score_kind: "observation-present",
    wording: `Open-Meteo temperature_2m ${temp} at ${reading.time || "an unstated time"} for ${region.name}.`,
    reason: "This observation was fetched on this call.",
  };
}

export function suppliedWeather(region, observation) {
  const temp = observation && observation.temperature_2m;
  if (typeof temp !== "number" || !Number.isFinite(temp)) return null;
  const reading = {
    temperature_2m: temp,
    weather_code: typeof observation.weather_code === "number" ? observation.weather_code : null,
    wind_speed_10m: typeof observation.wind_speed_10m === "number" ? observation.wind_speed_10m : null,
    time: observation.observed_at || observation.time || null,
  };
  return {
    ...region,
    reading,
    gap: false,
    live: false,
    origin: "supplied",
    adapter_fetched: false,
    score: 1,
    score_kind: "observation-present",
    wording: `Supplied temperature_2m ${temp} for ${region.name}. This number was not fetched from Open-Meteo.`,
  };
}

export async function canonicalHash(doc) {
  return sha256Hex(canonicalize(doc));
}
