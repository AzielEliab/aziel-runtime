/**
 * Catalog versions, known Zenodo DOIs, and related-identifier wiring.
 * Public identity: Aziel Eliab only. Do not invent DOIs.
 */

/** Extra slugs an installer or AI may type. Values are catalog slugs. */
export const CATALOG_ALIASES = {
  "zion-pattern-solver": "zsolver",
  zionpatternsolver: "zsolver",
  "postking-chess": "postking",
  "az-clce": "azclce",
  "aziel-digital-library": "aziel-corpus",
  "aziel-digital-library-v2": "aziel-corpus",
  azielcorpus: "aziel-corpus",
  corpus: "aziel-corpus",
  "mia-lock": "mialock",
  "mia.lock": "mialock",
  "m.i.a.lock": "mialock",
};

/** Package versions from live product Workers / counted /download filenames. */
export const VERSIONS = {
  vibelock: "0.3.0",
  veillock: "0.2.0",
  codelock: "0.1.0",
  godlock: "0.1.0",
  shadowlock: "0.2.0",
  temporallock: "0.2.0",
  forgereceipts: "0.3.0",
  decisiongate: "0.1.0",
  zsolver: "0.2.0",
  azos: "0.3.0",
  glossafilter: "0.1.0",
  miragegrid: "0.2.0",
  staticclock: "0.2.0",
  chronolock: "0.1.0",
  postking: "0.1.0",
  azclce: "0.3.0",
  ark: "0.1.0",
  azai: "0.3.1",
  spectrallock: "0.3.0",
  azbot: "0.2.0",
  employeelock: "0.1.0",
  foldlock: "0.8.0",
  whistlelock: "0.1.0",
  trajectorylock: "0.1.0",
  mialock: "0.1.1",
  azieltether: "0.1.0",
  "aziel-corpus": "2.6.2",
};

/**
 * Known Zenodo DOIs only. Do not invent.
 *
 * Public API audit 2026-09-04:
 *   GET https://zenodo.org/api/records/{id} → HTTP 410 for every id below
 *   tombstone.note = "User was blocked"
 *   creators.name:"Aziel Eliab" / "Eliab, Aziel" → 0 hits
 *   title queries for each product → 0 Aziel Eliab software records
 *
 * Cite historical DOIs anyway. A new deposit is required for a live record.
 *
 * foldlock + whistlelock share 10.5281/zenodo.22257762 on purpose:
 * joint method paper FoldLock_WhistleLock_FL-WP-0.3_WL-WP-0.1.pdf
 * (FoldLock TETH-1 / WhistleLock WL-WP-0.1). Not a catalog copy-paste bug.
 * That record is a paper, not a WhistleLock-only software package.
 * WhistleLock (and FoldLock UNI1 0.8 software) still need their own
 * software + tarball deposits. UNI1 has no new DOI per the FoldLock README.
 */
export const DOI_BY_SLUG = {
  vibelock: "10.5281/zenodo.21431610",
  veillock: "10.5281/zenodo.21431659",
  codelock: "10.5281/zenodo.21431561",
  shadowlock: "10.5281/zenodo.21435707",
  temporallock: "10.5281/zenodo.21431405",
  forgereceipts: "10.5281/zenodo.21436074",
  decisiongate: "10.5281/zenodo.21435730",
  zsolver: "10.5281/zenodo.21436155",
  azos: "10.5281/zenodo.21431711",
  postking: "10.5281/zenodo.21897338",
  ark: "10.5281/zenodo.21435810",
  employeelock: "10.5281/zenodo.22257493",
  foldlock: "10.5281/zenodo.22257762",
  whistlelock: "10.5281/zenodo.22257762",
  trajectorylock: "10.5281/zenodo.22258015",
};

export const SHARED_METHOD_PAPER_DOI = "10.5281/zenodo.22257762";

export const DOI_KIND_BY_SLUG = {
  foldlock: "shared_method_paper",
  whistlelock: "shared_method_paper",
};

export const DOI_NOTE_BY_SLUG = {
  foldlock:
    "Shared FoldLock+WhistleLock method paper (FL-WP-0.3 / WL-WP-0.1). TETH-1 method DOI. UNI1 0.8 has no new DOI. Not a FoldLock-only software-package record.",
  whistlelock:
    "Same Zenodo record as FoldLock: joint method paper, not a WhistleLock-only software deposit. Keep citing the paper; still deposit WhistleLock software + whistlelock-0.1.0.tar.gz under its own record.",
};

/** Products with no known Zenodo DOI. Do not invent one. */
export const FIRST_TIME_DEPOSIT_SLUGS = [
  "godlock",
  "glossafilter",
  "miragegrid",
  "staticclock",
  "chronolock",
  "azclce",
  "azai",
  "spectrallock",
  "azbot",
  "mialock",
  "azieltether",
  "aziel-corpus",
];

export const ZENODO_AUDIT = {
  checked_at: "2026-09-04",
  public_api: "https://zenodo.org/api/records",
  token_present: false,
  live_aziel_eliab_records: 0,
  known_dois_http_status: 410,
  tombstone_note: "User was blocked",
  creator_queries: ['creators.name:"Aziel Eliab"', 'creators.name:"Eliab, Aziel"'],
  result:
    "No live Aziel Eliab software records. Every wired DOI is a 410 tombstone. Related-identifier updates require a Zenodo token and new deposits (deleted records cannot be PATCHed).",
};

export function doiUrl(doi) {
  return doi ? `https://doi.org/${doi}` : null;
}

export function zenodoStatus(slug, doi) {
  if (!doi) return "deposit_needed";
  if (DOI_KIND_BY_SLUG[slug] === "shared_method_paper") return "shared_method_paper_tombstoned";
  return "historical_doi_tombstoned";
}

export function softwareDepositNeeded(_slug, _doi) {
  // Every product needs a live software deposit: wired DOIs are 410 tombstones,
  // foldlock/whistlelock share a method paper, and the rest never had a DOI.
  return true;
}

export function softwareTarball(slug, version, downloadUrl) {
  if (slug === "aziel-corpus") {
    return {
      url: downloadUrl,
      filename: version ? `aziel-digital-library-${version}.zip` : "aziel-digital-library.zip",
      content_type: "application/zip",
      note: "Counted Aziel Digital Library package (zip 200). Upload this file as the Zenodo software package.",
    };
  }
  return {
    url: downloadUrl,
    filename: version ? `${slug}-${version}.tar.gz` : `${slug}.tar.gz`,
    content_type: "application/gzip",
    note: "Counted Worker /download asset (gzip 200). Upload this file as the Zenodo software package.",
  };
}

/**
 * Identifiers that belong on a Zenodo software deposit for this product.
 * GitHub source + counted Worker download. Paper DOI is isDocumentedBy when
 * the catalog DOI is a shared method paper rather than this software record.
 */
export function relatedIdentifiers(product, urls) {
  const ids = [
    {
      identifier: product.github,
      relation: "isSupplementTo",
      resource_type: "software",
      scheme: "url",
    },
    {
      identifier: urls.download,
      relation: "isIdenticalTo",
      resource_type: "software",
      scheme: "url",
    },
  ];
  if (DOI_KIND_BY_SLUG[product.slug] === "shared_method_paper" && product.doi) {
    ids.push({
      identifier: product.doi,
      relation: "isDocumentedBy",
      resource_type: "publication-other",
      scheme: "doi",
    });
  }
  return ids;
}

export function zenodoDepositMetadata(product, urls) {
  const tarball = softwareTarball(product.slug, product.version, urls.download);
  const description = [
    product.oneLine || product.name,
    product.banner || "",
    `GitHub: ${product.github}`,
    `Counted software package: ${urls.download} (${tarball.filename})`,
    "Author: Aziel Eliab. Identity is Aziel Eliab only.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const metadata = {
    upload_type: "software",
    title: product.version ? `${product.name} ${product.version}` : product.name,
    description,
    creators: [{ name: "Eliab, Aziel" }],
    access_right: "open",
    license: "Apache-2.0",
    keywords: ["Aziel Eliab", product.name, product.slug],
    related_identifiers: relatedIdentifiers(product, urls),
    notes:
      "Public identity: Aziel Eliab only. Upload the counted Worker /download file as the software package. Do not invent a DOI — Zenodo assigns one on publish.",
  };
  if (product.version) metadata.version = product.version;
  return metadata;
}

export function citationFields(product, urls) {
  const doi = product.doi || null;
  const tarball = softwareTarball(product.slug, product.version, urls.download);
  const fields = {
    version: product.version || null,
    github: product.github,
    download: urls.download,
    doi,
    doi_url: doiUrl(doi),
    doi_kind: DOI_KIND_BY_SLUG[product.slug] || (doi ? "historical_record" : null),
    zenodo_status: zenodoStatus(product.slug, doi),
    software_deposit_needed: softwareDepositNeeded(product.slug, doi),
    related_identifiers: relatedIdentifiers(product, urls),
    software_tarball: tarball,
    zenodo_deposit: {
      metadata: zenodoDepositMetadata(product, urls),
    },
  };
  if (DOI_NOTE_BY_SLUG[product.slug]) fields.doi_note = DOI_NOTE_BY_SLUG[product.slug];
  return fields;
}

export function productHowToCite(product) {
  const ver = product.version ? ` ${product.version}` : "";
  const id = product.doi ? ` https://doi.org/${product.doi}` : ` ${product.github}`;
  return `Eliab, Aziel. (2026). ${product.name}${ver} [Software]. Apache-2.0.${id}`;
}

export const ZENODO_CURL = {
  note:
    "A Zenodo personal access token is required. Deleted (410) records cannot be updated. Create a new software deposition, upload the counted tarball, then publish. Replace $ZENODO_TOKEN and $DEPOSITION_ID. Creator name must be Aziel Eliab only (family, given → Eliab, Aziel).",
  create_deposition: `curl -sS -X POST https://zenodo.org/api/deposit/depositions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $ZENODO_TOKEN" \\
  -d @zenodo-metadata.json`,
  upload_file: `curl -sS -X POST https://zenodo.org/api/deposit/depositions/$DEPOSITION_ID/files \\
  -H "Authorization: Bearer $ZENODO_TOKEN" \\
  -F file=@vibelock-0.3.0.tar.gz`,
  fetch_counted_tarball: `curl -fsSL -o vibelock-0.3.0.tar.gz \\
  https://vibelock-download-tracker.vibelock.workers.dev/download`,
  publish: `curl -sS -X POST https://zenodo.org/api/deposit/depositions/$DEPOSITION_ID/actions/publish \\
  -H "Authorization: Bearer $ZENODO_TOKEN"`,
  metadata_json_shape: {
    metadata: {
      upload_type: "software",
      title: "VibeLock 0.3.0",
      description: "… Author: Aziel Eliab. Identity is Aziel Eliab only.",
      creators: [{ name: "Eliab, Aziel" }],
      version: "0.3.0",
      access_right: "open",
      license: "Apache-2.0",
      related_identifiers: [
        {
          identifier: "https://github.com/AzielEliab/vibelock",
          relation: "isSupplementTo",
          resource_type: "software",
          scheme: "url",
        },
        {
          identifier: "https://vibelock-download-tracker.vibelock.workers.dev/download",
          relation: "isIdenticalTo",
          resource_type: "software",
          scheme: "url",
        },
      ],
    },
  },
};

export function citeZenodoBlock() {
  return {
    audit: ZENODO_AUDIT,
    shared_method_paper: {
      doi: SHARED_METHOD_PAPER_DOI,
      doi_url: doiUrl(SHARED_METHOD_PAPER_DOI),
      products: ["foldlock", "whistlelock"],
      file: "FoldLock_WhistleLock_FL-WP-0.3_WL-WP-0.1.pdf",
      verdict:
        "Not a catalog bug. Joint method paper. WhistleLock still needs its own software + tarball record.",
    },
    first_time_deposits: FIRST_TIME_DEPOSIT_SLUGS,
    redeposit_tombstoned_dois: Object.entries(DOI_BY_SLUG)
      .filter(([slug]) => DOI_KIND_BY_SLUG[slug] !== "shared_method_paper")
      .map(([slug, doi]) => ({ slug, doi })),
    curl: ZENODO_CURL,
  };
}
