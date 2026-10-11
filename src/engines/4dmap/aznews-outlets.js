/**
 * AZNews outlet config (AZNEWS-OUTLETS-1.0). One row per outlet in the Press Gazette
 * English-language global top 50 (August 2026, Similarweb-based).
 * feed_url is the outlet's own official public RSS/Atom document. access:
 *   public-rss      fetched by the cron
 *   paid-or-blocked the official feed answered 401/402/403/404 or is metered when probed (2026-10-09)
 *   unwired         no official public feed exists for this outlet (aggregators and platforms)
 * hq_* is the outlet headquarters city, used as the reported location when an item
 * has no resolvable dateline.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
export const OUTLETS_SPEC = "AZNEWS-OUTLETS-1.0";
export const OUTLETS_PROBED = "2026-10-10";

const LONDON = ["London", 51.5072, -0.1276];
const NYC = ["New York", 40.7128, -74.006];
const DC = ["Washington", 38.9072, -77.0369];
const DELHI = ["New Delhi", 28.6139, 77.209];
const MUMBAI = ["Mumbai", 19.076, 72.8777];
const NOIDA = ["Noida", 28.5355, 77.391];
const SYDNEY = ["Sydney", -33.8688, 151.2093];

/** rank, id, name, domain, country, feed_url, access, hq, note */
const ROWS = [
  [1, "bbc", "BBC", "bbc.com", "GB", "https://feeds.bbci.co.uk/news/rss.xml", "public-rss", LONDON],
  [2, "nytimes", "The New York Times", "nytimes.com", "US", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "public-rss", NYC],
  [3, "msn", "MSN", "msn.com", "US", null, "unwired", ["Redmond", 47.674, -122.1215], "MSN is an aggregator and publishes no official public RSS."],
  [4, "cnn", "CNN", "cnn.com", "US", "http://rss.cnn.com/rss/edition.rss", "public-rss", ["Atlanta", 33.749, -84.388]],
  [5, "indiatimes", "Times of India", "indiatimes.com", "IN", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "public-rss", MUMBAI],
  [6, "google-news", "Google News", "news.google.com", "US", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", "public-rss", ["Mountain View", 37.3861, -122.0839]],
  [7, "guardian", "The Guardian", "theguardian.com", "GB", "https://www.theguardian.com/international/rss", "public-rss", LONDON],
  [8, "foxnews", "Fox News", "foxnews.com", "US", "https://moxie.foxnews.com/google-publisher/latest.xml", "public-rss", NYC],
  [9, "dailymail", "Daily Mail", "dailymail.com", "GB", "https://www.dailymail.co.uk/articles.rss", "public-rss", LONDON],
  [10, "yahoo-finance", "Yahoo Finance", "finance.yahoo.com", "US", "https://finance.yahoo.com/news/rssindex", "paid-or-blocked", NYC, "The documented feed answered HTTP 404 on 2026-10-09."],
  [11, "substack", "Substack", "substack.com", "US", null, "unwired", ["San Francisco", 37.7749, -122.4194], "Substack is a platform of many newsletters, not one outlet feed."],
  [12, "people", "People", "people.com", "US", "https://people.com/feed/", "paid-or-blocked", NYC, "The feed answered HTTP 402/404 on 2026-10-09."],
  [13, "yahoo-news", "Yahoo News", "news.yahoo.com", "US", "https://news.yahoo.com/rss", "public-rss", NYC],
  [14, "ndtv", "NDTV", "ndtv.com", "IN", "https://feeds.feedburner.com/ndtvnews-top-stories", "public-rss", DELHI],
  [15, "oneindia", "Oneindia", "oneindia.com", "IN", "https://www.oneindia.com/rss/news-india-fb.xml", "public-rss", ["Bengaluru", 12.9716, 77.5946]],
  [16, "nypost", "New York Post", "nypost.com", "US", "https://nypost.com/feed/", "public-rss", NYC],
  [17, "cnbc", "CNBC", "cnbc.com", "US", "https://www.cnbc.com/id/100003114/device/rss/rss.html", "public-rss", ["Englewood Cliffs", 40.8854, -73.9524]],
  [18, "usatoday", "USA Today", "usatoday.com", "US", "https://www.usatoday.com/rss/", "paid-or-blocked", ["McLean", 38.9339, -77.1773], "The feed answered HTTP 402 on 2026-10-09."],
  [19, "hindustantimes", "Hindustan Times", "hindustantimes.com", "IN", "https://www.hindustantimes.com/feeds/rss/latest/rssfeed.xml", "public-rss", DELHI],
  [20, "wsj", "The Wall Street Journal", "wsj.com", "US", "https://feeds.a.dj.com/rss/RSSWorldNews.xml", "public-rss", NYC],
  [21, "ap", "Associated Press", "apnews.com", "US", null, "paid-or-blocked", NYC, "AP publishes no official public RSS; apnews.com/index.rss answered HTTP 403. Third-party mirrors are not used."],
  [22, "nbcnews", "NBC News", "nbcnews.com", "US", "https://feeds.nbcnews.com/nbcnews/public/world", "public-rss", NYC],
  [23, "indianexpress", "The Indian Express", "indianexpress.com", "IN", "https://indianexpress.com/section/india/feed/", "public-rss", MUMBAI],
  [24, "news18", "News18", "news18.com", "IN", "https://www.news18.com/commonfeeds/v1/eng/rss/india.xml", "paid-or-blocked", NOIDA, "The feed answered HTTP 403 on 2026-10-09."],
  [25, "aljazeera", "Al Jazeera", "aljazeera.com", "QA", "https://www.aljazeera.com/xml/rss/all.xml", "public-rss", ["Doha", 25.2854, 51.531]],
  [26, "reuters", "Reuters", "reuters.com", "GB", null, "paid-or-blocked", LONDON, "Reuters retired its public RSS feeds. Third-party mirrors are not used."],
  [27, "washingtonpost", "The Washington Post", "washingtonpost.com", "US", "https://feeds.washingtonpost.com/rss/world", "public-rss", DC, "The feed answers slowly (about 8 s from the box on 2026-10-10); timeout 20 s with one retry.", 20000],
  [28, "telegraph", "The Telegraph", "telegraph.co.uk", "GB", "https://www.telegraph.co.uk/rss.xml", "public-rss", LONDON],
  [29, "forbes", "Forbes", "forbes.com", "US", "https://www.forbes.com/business/feed/", "public-rss", ["Jersey City", 40.7178, -74.0431]],
  [30, "independent", "The Independent", "independent.co.uk", "GB", "https://www.independent.co.uk/rss", "public-rss", LONDON],
  [31, "india-com", "India.com", "india.com", "IN", "https://www.india.com/feed/", "public-rss", NOIDA, "Answered HTTP 403 on 2026-10-09; re-probed 200 with 20 items on 2026-10-10."],
  [32, "cbsnews", "CBS News", "cbsnews.com", "US", "https://www.cbsnews.com/latest/rss/main", "public-rss", NYC],
  [33, "abc-au", "ABC News Australia", "abc.net.au", "AU", "https://www.abc.net.au/news/feed/51120/rss.xml", "public-rss", SYDNEY],
  [34, "thehindu", "The Hindu", "thehindu.com", "IN", "https://www.thehindu.com/feeder/default.rss", "public-rss", ["Chennai", 13.0827, 80.2707]],
  [35, "cbc", "CBC", "cbc.ca", "CA", "https://www.cbc.ca/webfeed/rss/rss-topstories", "public-rss", ["Ottawa", 45.4215, -75.6972], "rss.cbc.ca answered 520 from Workers; CBC's own www.cbc.ca/webfeed URL is used (200, 2026-10-10)."],
  [36, "thesun", "The Sun", "thesun.co.uk", "GB", "https://www.thesun.co.uk/feed/", "public-rss", LONDON],
  [37, "news-com-au", "news.com.au", "news.com.au", "AU", null, "unwired", SYDNEY, "The content-feeds URLs return an HTML page, not RSS (2026-10-09)."],
  [38, "npr", "NPR", "npr.org", "US", "https://feeds.npr.org/1001/rss.xml", "public-rss", DC],
  [39, "indiatoday", "India Today", "indiatoday.in", "IN", "https://www.indiatoday.in/rss/1206578", "public-rss", NOIDA],
  [40, "abcnews", "ABC News", "abcnews.com", "US", "https://abcnews.go.com/abcnews/topstories", "public-rss", NYC],
  [41, "rediff", "Rediff", "rediff.com", "IN", "https://www.rediff.com/rss/newsrss.xml", "public-rss", MUMBAI],
  [42, "buzzfeed", "BuzzFeed", "buzzfeed.com", "US", "https://www.buzzfeed.com/world.xml", "public-rss", NYC],
  [43, "euronews", "Euronews", "euronews.com", "FR", "https://www.euronews.com/rss?format=mrss", "public-rss", ["Lyon", 45.764, 4.8357]],
  [44, "drudge", "Drudge Report", "drudgereport.com", "US", null, "unwired", ["Miami", 25.7617, -80.1918], "No official public RSS; unofficial feedburner mirrors are not used."],
  [45, "sky", "Sky News", "news.sky.com", "GB", "https://feeds.skynews.com/feeds/rss/home.xml", "public-rss", ["London (Isleworth)", 51.4876, -0.3285]],
  [46, "variety", "Variety", "variety.com", "US", "https://variety.com/feed/", "public-rss", ["Los Angeles", 34.0522, -118.2437]],
  [47, "newsnow", "NewsNow", "newsnow.co.uk", "GB", null, "unwired", LONDON, "NewsNow is an aggregator with no official public RSS."],
  [48, "businessinsider", "Business Insider", "businessinsider.com", "US", "https://www.businessinsider.com/rss", "public-rss", NYC],
  [49, "thehill", "The Hill", "thehill.com", "US", "https://thehill.com/feed/", "public-rss", DC],
  [50, "mirror", "Daily Mirror", "mirror.co.uk", "GB", "https://www.mirror.co.uk/?service=rss", "public-rss", LONDON],
];

export const OUTLETS = Object.freeze(
  ROWS.map(([rank, id, name, domain, country, feed_url, access, hq, note, timeout_ms]) =>
    Object.freeze({ rank, id, name, domain, country, feed_url, access, hq_city: hq[0], hq_lat: hq[1], hq_lon: hq[2], note: note || null, timeout_ms: timeout_ms || null }),
  ),
);

export function wiredOutlets() {
  return OUTLETS.filter((o) => o.access === "public-rss" && o.feed_url);
}

export function outletConfigById(id) {
  const key = String(id || "").trim().toLowerCase();
  return OUTLETS.find((o) => o.id === key || o.domain === key) || null;
}
