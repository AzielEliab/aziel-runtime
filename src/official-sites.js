/**
 * Official Aziel sites on Softwares handles, doors, and SEO.
 * Not Softwares hubs. Not Live Nodes. pattern_live stays false.
 * A /aziel path is listed only when that URL returns HTTP 200.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const FURNACE_NAME = "The Furnace Isn't Free";
/** Apex is canonical. www redirects here. Never thefurnaceisntfree.com. */
export const FURNACE_HOME = "https://furnaceisntfree.com/";
export const FURNACE_AZIEL = "https://furnaceisntfree.com/aziel/";
export const FURNACE_SITEMAP = "https://furnaceisntfree.com/sitemap.xml";
export const FURNACE_CITE = "https://furnaceisntfree.com/cite.json";
export const FURNACE_LLMS = "https://furnaceisntfree.com/llms.txt";

/** Apex is canonical. www redirects here. /aziel on this host is HTTP 200. Not a Live Node. */
export const UNSEAL_NAME = "TimeToUnsealTheBook";
export const UNSEAL_HOME = "https://timetounsealthebook.net/";
/** Live path. Listed because that path returns HTTP 200. */
export const UNSEAL_AZIEL = "https://timetounsealthebook.net/aziel";
export const UNSEAL_AZIEL_HTTP = 200;
export const UNSEAL_SITEMAP = "https://timetounsealthebook.net/sitemap.xml";
export const UNSEAL_LLMS = "https://timetounsealthebook.net/llms.txt";
export const UNSEAL_AZIEL_STATUS_NOTE =
  "Apex origin is HTTP 200. /aziel on this host is HTTP 200.";

/** This Worker's public Softwares origin. Execution surface, not a second identity. */
export const RUNTIME_WORKER_HOME = "https://aziel-runtime.vibelock.workers.dev/";

export function officialAzielSitePages() {
  return [
    {
      id: "furnace",
      name: FURNACE_NAME,
      home: FURNACE_HOME,
      aziel: FURNACE_AZIEL,
      cite: FURNACE_CITE,
      llms: FURNACE_LLMS,
      sitemap: FURNACE_SITEMAP,
      software_tab: false,
      fraggate_engine: false,
      live: false,
      live_node: false,
      official: true,
    },
    {
      id: "unseal",
      name: UNSEAL_NAME,
      home: UNSEAL_HOME,
      aziel: UNSEAL_AZIEL,
      aziel_http: UNSEAL_AZIEL_HTTP,
      llms: UNSEAL_LLMS,
      sitemap: UNSEAL_SITEMAP,
      software_tab: false,
      fraggate_engine: false,
      live: false,
      live_node: false,
      official: true,
      note: UNSEAL_AZIEL_STATUS_NOTE,
    },
  ];
}

export function officialAzielSitePageUrls() {
  const out = [];
  const seen = new Set();
  for (const site of officialAzielSitePages()) {
    for (const url of [site.home, site.aziel, site.cite, site.llms, site.sitemap]) {
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

export function officialAzielSiteSitemaps() {
  return officialAzielSitePages().map((site) => site.sitemap);
}

export function officialAzielSitesHubFields() {
  return {
    furnace: FURNACE_HOME,
    furnace_name: FURNACE_NAME,
    furnace_aziel: FURNACE_AZIEL,
    furnace_sitemap: FURNACE_SITEMAP,
    furnace_cite: FURNACE_CITE,
    furnace_llms: FURNACE_LLMS,
    furnace_software_tab: false,
    furnace_live_node: false,
    furnace_live: false,
    timetounsealthebook: UNSEAL_HOME,
    timetounsealthebook_name: UNSEAL_NAME,
    timetounsealthebook_aziel: UNSEAL_AZIEL,
    timetounsealthebook_aziel_http: UNSEAL_AZIEL_HTTP,
    timetounsealthebook_sitemap: UNSEAL_SITEMAP,
    timetounsealthebook_llms: UNSEAL_LLMS,
    timetounsealthebook_software_tab: false,
    timetounsealthebook_live_node: false,
    timetounsealthebook_live: false,
    official_aziel_sites: officialAzielSitePages(),
    runtime_worker: RUNTIME_WORKER_HOME,
  };
}
