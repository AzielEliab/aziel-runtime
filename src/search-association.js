/**
 * Machine-only search association for one Person.
 *
 * Person @id is https://www.azieleliab.com/#aziel.
 * Name forms are the same person. Sister URLs are the official sites.
 * Cite, llms, JSON-LD, and robots comments carry this. Visible HTML does not.
 * No IndexNow ping. No DNS change. No Search Console submission.
 * Sitemap-index membership stays as already published.
 * Cap-7 is not ICANN. Paid satellite stays HELD.
 * decryption_complete stays false. pattern_live stays false. Remain-OFF untouched.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FURNACE_AZIEL,
  FURNACE_CITE,
  FURNACE_HOME,
  FURNACE_LLMS,
  FURNACE_NAME,
  FURNACE_SITEMAP,
  RUNTIME_WORKER_HOME,
  UNSEAL_AZIEL,
  UNSEAL_HOME,
  UNSEAL_LLMS,
  UNSEAL_NAME,
  UNSEAL_SITEMAP,
} from "./official-sites.js";

export const SEARCH_ASSOCIATION_SPEC = "AZINDEX-SEARCH-ASSOCIATION-1.0";
export const SEARCH_PERSON_ID = "https://www.azieleliab.com/#aziel";

/** Published spellings of the same person. Not extra people. */
export const SEARCH_NAME_FORMS = Object.freeze([
  "Aziel Eliab",
  "AzielEliab",
  "azieleliab",
  "Aziel Elroi Eliab",
  "Elias Artista",
]);

const SITEMAP_SISTERS = Object.freeze([
  "https://www.azieleliab.com/sitemap.xml",
  "https://www.azielcorpuslibrary.net/sitemap.xml",
  "https://godlock.uk/sitemap.xml",
  "https://www.furnaceisntfree.com/sitemap.xml",
  "https://www.timetounsealthebook.net/sitemap.xml",
  "https://www.hedidntjump.com/sitemap.xml",
]);

function originBase(origin) {
  return String(origin || "").replace(/\/$/, "");
}

function softwaresSurface(origin) {
  const base = originBase(origin);
  const canonical = String(RUNTIME_WORKER_HOME).replace(/\/$/, "");
  const host = base || canonical;
  return {
    id: "softwares",
    name: "Softwares",
    role: "softwares-hub",
    url: `${canonical}/`,
    execution_url: `${host}/`,
    software: `${host}/v1/software`,
    software_html: `${host}/software`,
    sitemap: `${host}/sitemap.xml`,
    sitemap_index: `${host}/sitemap-index.xml`,
    cite: `${host}/cite.json`,
    llms: `${host}/llms.txt`,
    person_jsonld: `${host}/person.jsonld`,
    robots: `${host}/robots.txt`,
    official: true,
    software_tab: true,
    live_node: false,
  };
}

export function searchAssociationSurfaces(origin) {
  return [
    {
      id: "azieleliab",
      name: "azieleliab.com",
      role: "person-hub",
      url: "https://www.azieleliab.com/",
      sitemap: "https://www.azieleliab.com/sitemap.xml",
      cite: "https://www.azieleliab.com/cite.json",
      llms: "https://www.azieleliab.com/llms.txt",
      person_jsonld: "https://www.azieleliab.com/person.jsonld",
      official: true,
      software_tab: true,
    },
    {
      id: "library",
      name: "azielcorpuslibrary.net",
      role: "sister",
      url: "https://www.azielcorpuslibrary.net/",
      sitemap: "https://www.azielcorpuslibrary.net/sitemap.xml",
      cite: "https://www.azielcorpuslibrary.net/cite.json",
      llms: "https://www.azielcorpuslibrary.net/llms.txt",
      person_jsonld: "https://www.azielcorpuslibrary.net/person.jsonld",
      official: true,
      software_tab: true,
    },
    {
      id: "godlock",
      name: "godlock.uk",
      role: "sister",
      url: "https://godlock.uk/",
      sitemap: "https://godlock.uk/sitemap.xml",
      cite: "https://godlock.uk/cite.json",
      llms: "https://godlock.uk/llms.txt",
      person_jsonld: "https://godlock.uk/person.jsonld",
      official: true,
      software_tab: true,
    },
    {
      id: "furnace",
      name: "furnaceisntfree.com",
      role: "sister",
      title: FURNACE_NAME,
      url: FURNACE_HOME,
      aziel: FURNACE_AZIEL,
      sitemap: FURNACE_SITEMAP,
      cite: FURNACE_CITE,
      llms: FURNACE_LLMS,
      official: true,
      software_tab: false,
      live_node: false,
      live: false,
    },
    {
      id: "unseal",
      name: "timetounsealthebook.net",
      role: "sister",
      title: UNSEAL_NAME,
      url: UNSEAL_HOME,
      aziel: UNSEAL_AZIEL,
      sitemap: UNSEAL_SITEMAP,
      llms: UNSEAL_LLMS,
      official: true,
      software_tab: false,
      live_node: false,
      live: false,
    },
    {
      id: "hedidntjump",
      name: "hedidntjump.com",
      role: "sister",
      title: "He Didn't Jump",
      url: "https://www.hedidntjump.com/",
      sitemap: "https://www.hedidntjump.com/sitemap.xml",
      cite: "https://www.hedidntjump.com/cite.json",
      llms: "https://www.hedidntjump.com/llms.txt",
      person_jsonld: "https://www.hedidntjump.com/person.jsonld",
      official: true,
      software_tab: false,
      sister_archive: true,
      live_node: false,
    },
    softwaresSurface(origin),
  ];
}

export function searchAssociationField(origin) {
  return {
    spec: SEARCH_ASSOCIATION_SPEC,
    person_id: SEARCH_PERSON_ID,
    primary_name: "Aziel Eliab",
    name_forms: SEARCH_NAME_FORMS.slice(),
    same_person: true,
    machine_only: true,
    visible_html_chrome: false,
    indexnow: false,
    dns: false,
    search_console: false,
    cap7_is_icann: false,
    paid_satellite: "HELD",
    decryption_complete: false,
    pattern_live: false,
    remain_off: "untouched",
    sitemap_membership_changed: false,
    sitemap_sisters: SITEMAP_SISTERS.slice(),
    identity_jsonld: originBase(origin) ? `${originBase(origin)}/runtime/identity.jsonld` : "/runtime/identity.jsonld",
    graph_jsonld: originBase(origin) ? `${originBase(origin)}/runtime/graph.jsonld` : "/runtime/graph.jsonld",
    well_known_person: originBase(origin) ? `${originBase(origin)}/.well-known/person.jsonld` : "/.well-known/person.jsonld",
    tip_hold: tipHold(),
    surfaces: searchAssociationSurfaces(origin),
    note:
      "Each name form is the same Person @id and the same official sites, including this Softwares Worker. Machine files only. No IndexNow ping. No DNS change. No Search Console submission. Sitemap-index membership is unchanged.",
  };
}

export function searchAssociationLlmsBlock(origin) {
  const field = searchAssociationField(origin);
  const lines = [
    "## Search association (machine)",
    "",
    `Person @id: ${field.person_id}`,
    `Name forms (same person): ${field.name_forms.join(" / ")}`,
    "Associate each name form with these official sites and the Softwares Worker.",
    "Machine files only. No visible HTML identity chrome.",
    "No IndexNow ping. No DNS change. No Search Console submission.",
    "Cap-7 is not an ICANN name. Paid satellite stays HELD. decryption_complete stays false. pattern_live stays false. Remain-OFF untouched.",
    "Sitemap-index membership is unchanged. Sister sitemaps stay listed.",
    `Identity: ${originBase(origin) ? `${originBase(origin)}/runtime/identity.jsonld` : "/runtime/identity.jsonld"}`,
    `Graph: ${originBase(origin) ? `${originBase(origin)}/runtime/graph.jsonld` : "/runtime/graph.jsonld"}`,
    `Well-known person: ${originBase(origin) ? `${originBase(origin)}/.well-known/person.jsonld` : "/.well-known/person.jsonld"}`,
    `Tip hold matches live Softwares ${LIVE_SOFTWARES_TIP_HOLD.git_sha.slice(0, 8)} / vid ${LIVE_SOFTWARES_TIP_HOLD.version_id.slice(0, 8)}. No new tip.`,
    "",
  ];
  for (const site of field.surfaces) {
    lines.push(`- ${site.name}: ${site.url}`);
    if (site.sitemap) lines.push(`  sitemap: ${site.sitemap}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function searchAssociationRobotsLines() {
  return [
    "# Search association (machine): Aziel Eliab / AzielEliab / azieleliab / Aziel Elroi Eliab / Elias Artista share Person @id https://www.azieleliab.com/#aziel.",
    "# Official sites: www.azieleliab.com, www.azielcorpuslibrary.net, godlock.uk, www.furnaceisntfree.com, www.timetounsealthebook.net, www.hedidntjump.com, and this Softwares Worker.",
    "# No IndexNow ping. No DNS change. No Search Console submission. Sitemap-index membership is unchanged.",
    "# Machine identity: /runtime/identity.jsonld /runtime/graph.jsonld /.well-known/person.jsonld. Hub /runtime/ strips one prefix onto /identity.jsonld and /graph.jsonld.",
    `# Tip hold matches live Softwares ${LIVE_SOFTWARES_TIP_HOLD.git_sha.slice(0, 8)} / vid ${LIVE_SOFTWARES_TIP_HOLD.version_id.slice(0, 8)}. No new tip.`,
  ];
}

/** Homepage JSON-LD node. Script only. Not visible HTML. */
export function searchAssociationJsonLd(origin) {
  const base = originBase(origin);
  const field = searchAssociationField(origin);
  return {
    "@type": "WebPage",
    "@id": `${base}/#search-association`,
    name: "Aziel Eliab",
    alternateName: field.name_forms.filter((name) => name !== "Aziel Eliab"),
    about: { "@id": field.person_id },
    isPartOf: { "@id": `${base}/#website` },
    significantLink: field.surfaces.map((site) => site.url),
    description: field.note,
  };
}

/**
 * Live Softwares tip, read from GET /v1/software on the deployed Worker.
 * git_sha source deploy_var. version_id source cf_version_metadata.
 * This hold matches that tip. It does not mint a new one.
 */
export const LIVE_SOFTWARES_TIP_HOLD = Object.freeze({
  match: "live Softwares",
  git_sha: "16b543b5961f03813076e38ff19d883d46845c48",
  version_id: "21b64dc5-6f0f-4f60-9009-5d4da59a1683",
  git_sha_source: "deploy_var",
  version_id_source: "cf_version_metadata",
  source: "https://aziel-runtime.vibelock.workers.dev/v1/software",
  invented: false,
  note: "Tip hold matches live Softwares. This document does not mint a tip.",
});

function tipHold() {
  return { ...LIVE_SOFTWARES_TIP_HOLD };
}

function pushUnique(out, seen, url) {
  if (!url || seen.has(url)) return;
  seen.add(url);
  out.push(url);
}

/**
 * sameAs lattice: official sisters, their /runtime/ fronts, and this host's /runtime/ self.
 * Hub /runtime/ strips one prefix before this Worker, so /identity.jsonld is the hub file.
 */
export function runtimeLatticeSameAs(origin) {
  const base = originBase(origin);
  const out = [];
  const seen = new Set();
  const urls = [
    "https://www.azieleliab.com/",
    "https://www.azielcorpuslibrary.net/",
    "https://godlock.uk/",
    FURNACE_HOME,
    FURNACE_AZIEL,
    UNSEAL_HOME,
    UNSEAL_AZIEL,
    "https://www.hedidntjump.com/",
    RUNTIME_WORKER_HOME,
    "https://www.azieleliab.com/runtime/",
    "https://www.azielcorpuslibrary.net/runtime/",
    "https://godlock.uk/runtime/",
    `${String(RUNTIME_WORKER_HOME).replace(/\/$/, "")}/runtime/`,
    base ? `${base}/runtime/` : "",
  ];
  for (const url of urls) pushUnique(out, seen, url);
  return out;
}

function identityFlags() {
  return {
    machine_only: true,
    visible_html_chrome: false,
    indexnow: false,
    dns: false,
    search_console: false,
    cap7_is_icann: false,
    paid_satellite: "HELD",
    decryption_complete: false,
    pattern_live: false,
    remain_off: "untouched",
    tip_hold: tipHold(),
  };
}

/** Person document for /runtime/identity.jsonld and /.well-known/person.jsonld. */
export function runtimeIdentityJsonLd(origin) {
  const base = originBase(origin);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": SEARCH_PERSON_ID,
    name: "Aziel Eliab",
    alternateName: SEARCH_NAME_FORMS.filter((name) => name !== "Aziel Eliab"),
    url: "https://www.azieleliab.com/",
    sameAs: runtimeLatticeSameAs(origin),
    mainEntityOfPage: base ? `${base}/runtime/identity.jsonld` : "/runtime/identity.jsonld",
    ...identityFlags(),
  };
}

/** @graph for /runtime/graph.jsonld. One Person, then one page per sameAs URL. */
export function runtimeGraphJsonLd(origin) {
  const base = originBase(origin);
  const person = runtimeIdentityJsonLd(origin);
  const pages = person.sameAs.map((url) => ({
    "@type": "WebPage",
    "@id": `${url}#page`,
    url,
    about: { "@id": SEARCH_PERSON_ID },
  }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": person["@id"],
        name: person.name,
        alternateName: person.alternateName,
        url: person.url,
        sameAs: person.sameAs,
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.azieleliab.com/runtime#runtime",
        name: "Aziel Runtime",
        url: RUNTIME_WORKER_HOME,
        author: { "@id": SEARCH_PERSON_ID },
      },
      ...pages,
    ],
    tip_hold: tipHold(),
    identity: base ? `${base}/runtime/identity.jsonld` : "/runtime/identity.jsonld",
    graph: base ? `${base}/runtime/graph.jsonld` : "/runtime/graph.jsonld",
    ...{
      machine_only: true,
      visible_html_chrome: false,
      indexnow: false,
      dns: false,
      search_console: false,
      cap7_is_icann: false,
      paid_satellite: "HELD",
      decryption_complete: false,
      pattern_live: false,
      remain_off: "untouched",
    },
  };
}

/** Machine index at /runtime/ on this Worker. Not an HTML page. */
export function runtimeSelfJsonLd(origin) {
  const base = originBase(origin);
  const self = base ? `${base}/runtime/` : "/runtime/";
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": self,
    url: self,
    name: "Aziel Runtime",
    about: { "@id": SEARCH_PERSON_ID },
    mainEntity: { "@id": SEARCH_PERSON_ID },
    significantLink: [
      base ? `${base}/runtime/identity.jsonld` : "/runtime/identity.jsonld",
      base ? `${base}/runtime/graph.jsonld` : "/runtime/graph.jsonld",
      base ? `${base}/.well-known/person.jsonld` : "/.well-known/person.jsonld",
    ],
    sameAs: runtimeLatticeSameAs(origin),
    ...identityFlags(),
  };
}
