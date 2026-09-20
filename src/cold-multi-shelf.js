/**
 * COLD-MULTI-SHELF-1.0 — runtime cite of corpus#96 /shelves honesty.
 *
 * SoT is live corpus GET /shelves. This Worker cites that registry.
 * The runtime Worker is the same CF/GitHub Plane A tunnel — not a sixth
 * published surface and not an independent shelf.
 *
 * Author: Aziel Eliab only. No visible 15:20 chrome. No invented DOI.
 */

import { AUTHOR_ID, AUTHOR_NAME, LIBRARY_ORIGIN } from "./seo.js";
import { CROSS_NETWORK_SURVIVAL, SURVIVAL_TIP } from "./cross-network-survival.js";
import { NO_LIE_SPEC } from "./no-lie.js";
import {
  ATTACK_SIM_POINTER,
  REDLINE_DOCS,
  REDLINE_SPEC,
  attackSimRefusePointer,
} from "./redline.js";
import {
  CAP7_DESIGN_OF,
  CAP7_RESOLVES_TO_HUB,
  SEMANTIC_BRIDGE_SPEC,
} from "./semantic-bridge.js";

export const COLD_MULTI_SHELF = "COLD-MULTI-SHELF-1.0";
export const COLD_MULTI_SHELF_AUTHOR = AUTHOR_NAME;
export const COLD_MULTI_SHELF_DOCS = "docs/designs/COLD-MULTI-SHELF-1.0.md";
export const CORPUS_SHELVES = `${LIBRARY_ORIGIN}/shelves`;
export const CORPUS_SHELVES_JSON = `${LIBRARY_ORIGIN}/v1/shelves`;
export const CORPUS_LOCKSET = `${LIBRARY_ORIGIN}/lockset.json`;
export const CORPUS_CITE = `${LIBRARY_ORIGIN}/cite.json`;

export const LOCKSET_ID = "AZLOCK-INGEST-REEXPAND-1.0";
export const LOCKSET_TIP = "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245";

export const COLD_MULTI_SHELF_RULE =
  "Planes A/B/C: A=one CF/GitHub tunnel (5 surfaces / 2 family radii, not 5 shelves); B=alt independent forge/archive tip-pack SLOT; C=USB airgap SLOT. Survival = bytes↔hash. LIVE only after hash verify.";

export const CROSS_NETWORK_SURVIVAL_RULE =
  "If network + live data die tomorrow, the chain still survives via cold copies across independent shelves; survival = bytes↔hash.";

export const NO_LIE_NO_REWRITE_RULE =
  "receipts that still hash; copies not all on one tunnel; verify without voice; no rewrite key; network never lies even to stay alive.";

export const USB_ATTEST =
  "USB offline-verify before LIVE: copy the airgap pack off-network, run verify-airgap.sh / sha256sum -c SHA256SUMS against the published tip, then operator attest (CNS-OPERATOR-ATTEST).";

export const REFUSE = Object.freeze({
  NO_CID: "CNS-NO-CID",
  NO_WARC: "CNS-NO-WARC",
  OPERATOR_ATTEST: "CNS-OPERATOR-ATTEST",
  NO_TIP_DOI: "CNS-NO-TIP-DOI",
  ZENODO_NOT_LIVE: "CNS-ZENODO-NOT-LIVE",
  NO_FORGE: "CNS-NO-FORGE-MIRROR",
  GITFLIC_EMAIL: "CNS-GITFLIC-EMAIL",
  GITLAB_CF_LOOP: "CNS-GITLAB-CF-LOOP",
  PLANE_A_ONE_TUNNEL: "CNS-PLANE-A-ONE-TUNNEL",
  SURFACES_NOT_INDEPENDENT: "CNS-SURFACES-NOT-INDEPENDENT",
  PLANE_B_ALL_TARGETS: "CNS-PLANE-B-ALL-TARGETS",
  SHELF_NOT_LIVE: "CNS-SHELF-NOT-LIVE",
  FAKE_DEPOSIT: "CNS-NO-FAN-FAKE-DEPOSIT",
  TIP_NOT_ON_DEPOSIT: "CNS-TIP-NOT-ON-DEPOSIT",
  RUNTIME_NOT_SHELF: "CNS-RUNTIME-NOT-SHELF",
});

export const PLANE_A_MIRRORS = Object.freeze([
  Object.freeze({
    id: "azieleliab-com",
    origin: "https://www.azieleliab.com",
    lockset: "https://www.azieleliab.com/lockset.json",
    receipts: "https://www.azieleliab.com/receipts",
    shelves: "https://www.azieleliab.com/shelves",
    verified_in_this_repo: false,
  }),
  Object.freeze({
    id: "azielcorpuslibrary-net",
    origin: LIBRARY_ORIGIN,
    lockset: CORPUS_LOCKSET,
    receipts: `${LIBRARY_ORIGIN}/receipts`,
    shelves: CORPUS_SHELVES,
    verified_in_this_repo: true,
  }),
  Object.freeze({
    id: "godlock-uk",
    origin: "https://godlock.uk",
    lockset: "https://godlock.uk/lockset.json",
    receipts: "https://godlock.uk/receipts",
    shelves: "https://godlock.uk/shelves",
    verified_in_this_repo: false,
  }),
  Object.freeze({
    id: "hedidntjump-com",
    origin: "https://www.hedidntjump.com",
    lockset: "https://www.hedidntjump.com/lockset.json",
    receipts: "https://www.hedidntjump.com/receipts",
    shelves: "https://www.hedidntjump.com/shelves",
    verified_in_this_repo: false,
  }),
]);

export const PAPER_DEPOSITS = Object.freeze([
  Object.freeze({
    doi: "10.5281/zenodo.21435707",
    payload: "ShadowLock paper",
    in_repo_cite: "dossiers/shadowlock-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.21435730",
    payload: "DecisionGATE paper",
    in_repo_cite: "dossiers/decisiongate-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.22258015",
    payload: "TrajectoryLock TL-WP-0.1",
    in_repo_cite: "dossiers/trajectorylock-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.22257762",
    payload: "WhistleLock WL-WP-0.1 / FoldLock FL-WP-0.3",
    in_repo_cite: Object.freeze([
      "dossiers/whistlelock-aziel-dossier-1.0.md",
      "dossiers/foldlock-aziel-dossier-1.0.md",
    ]),
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.22257493",
    payload: "EmployeeLock EL-WP-0.1",
    in_repo_cite: "dossiers/employeelock-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
]);

export const SHELF_KINDS = Object.freeze([
  "zenodo_doi",
  "git_mirror",
  "ipfs_cid",
  "archive_org",
  "usb_airgap",
  "other",
]);

export const SHELF_STATUSES = Object.freeze(["live", "slot", "refused"]);

export const PUBLISHED_SURFACE_IDS = Object.freeze([
  "azieleliab-com",
  "azielcorpuslibrary-net",
  "godlock-uk",
  "hedidntjump-com",
  "github-aziel-corpus",
]);

export const FAMILY_BLAST_RADII = Object.freeze(["cloudflare", "github"]);
export const PLANE_B_WORKING_TARGETS = Object.freeze(["codeberg", "archive.org", "framagit"]);
export const MIN_INDEPENDENT_SHELVES = 3;

export const TIP_PACK_FILES = Object.freeze([
  "aziel-tip-pack.tar",
  "SHA256SUMS",
  "lockset.json",
  "verify-airgap.sh",
]);
export const TIP_PACK_SHA256 = "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37";

export const CODEBERG_TIP_PACK = Object.freeze({
  url: "https://codeberg.org/AzielEliab/aziel-lockset-tip",
  branch: "main",
  files: TIP_PACK_FILES,
  pack_sha256: TIP_PACK_SHA256,
  lockset_tip: LOCKSET_TIP,
  hash_verify: "pass",
});

/** Second IA item. Same blast_radius archive-org as the primary — not a new independent shelf. */
export const ARCHIVE_ORG_TIP_PACK_202609 = Object.freeze({
  url: "https://archive.org/details/aziel-lockset-tip_202609",
  identifier: "aziel-lockset-tip_202609",
  item: "aziel-lockset-tip_202609",
  download_base: "https://archive.org/download/aziel-lockset-tip_202609/",
  zip: "https://archive.org/download/aziel-lockset-tip_202609/aziel-lockset-tip.zip",
  zip_alt: "https://archive.org/download/aziel-lockset-tip_202609/aziel-lockset-tip%202.zip",
  wrap: "zip",
  ia_flat_sha256: null,
  sha256sums_flat_check: "incomplete",
  inner_pack: "aziel-tip-pack.tar",
  files: Object.freeze(["aziel-lockset-tip.zip"]),
  inner_files: TIP_PACK_FILES,
  pack_sha256: TIP_PACK_SHA256,
  lockset_tip: LOCKSET_TIP,
  hash_verify: "pass",
});

export const ARCHIVE_ORG_TIP_PACK = Object.freeze({
  url: "https://archive.org/details/aziel-lockset-tip",
  identifier: "aziel-lockset-tip",
  item: "aziel-lockset-tip",
  download_base: "https://archive.org/download/aziel-lockset-tip/",
  files: TIP_PACK_FILES,
  pack_sha256: TIP_PACK_SHA256,
  lockset_tip: LOCKSET_TIP,
  hash_verify: "pass",
  secondary_items: Object.freeze([
    Object.freeze({
      id: "plane-b-archive-org-tip-pack-202609",
      url: ARCHIVE_ORG_TIP_PACK_202609.url,
      identifier: ARCHIVE_ORG_TIP_PACK_202609.identifier,
      item: ARCHIVE_ORG_TIP_PACK_202609.item,
      download_base: ARCHIVE_ORG_TIP_PACK_202609.download_base,
      zip: ARCHIVE_ORG_TIP_PACK_202609.zip,
      zip_alt: ARCHIVE_ORG_TIP_PACK_202609.zip_alt,
      wrap: ARCHIVE_ORG_TIP_PACK_202609.wrap,
      ia_flat_sha256: null,
      sha256sums_flat_check: "incomplete",
      inner_pack: ARCHIVE_ORG_TIP_PACK_202609.inner_pack,
      pack_sha256: ARCHIVE_ORG_TIP_PACK_202609.pack_sha256,
      lockset_tip: ARCHIVE_ORG_TIP_PACK_202609.lockset_tip,
      hash_verify: "pass",
      same_blast_radius: "archive-org",
      independent_shelf: false,
    }),
  ]),
});

export const ARCHIVE_ORG_TIP_PACK_URLS = Object.freeze([
  ARCHIVE_ORG_TIP_PACK.url,
  ARCHIVE_ORG_TIP_PACK_202609.url,
]);

export const CORPUS_TAGS = Object.freeze([
  Object.freeze({ name: "v2.6.2", commit: "8ba6d9331da4854858e8e4c94319d402c36508e5" }),
  Object.freeze({ name: "v0.1.0", commit: "176172847f828ec4f20bfbb388c1edfcace64b8b" }),
]);

export const SHELF_REGISTRY = Object.freeze([
  Object.freeze({
    id: "plane-a-cf-github",
    plane: "A",
    kind: "other",
    status: "live",
    blast_radius: "cf-github",
    independent: true,
    lockset_shelf: true,
    mirrors: PLANE_A_MIRRORS,
    git: "https://github.com/AzielEliab/aziel-corpus",
    tags: CORPUS_TAGS,
    verify: "in-repo Worker serves lockset.json whose core SHA-256 is the published tip; four hosts are mirrors of that tip, not four shelves",
    note: "LIVE multi-host, same tunnel. Count as one CF/GitHub plane.",
  }),
  Object.freeze({
    id: "plane-a-git-aziel-corpus",
    plane: "A",
    kind: "git_mirror",
    status: "live",
    url: "https://github.com/AzielEliab/aziel-corpus",
    blast_radius: "cf-github",
    independent: false,
    lockset_shelf: true,
    tags: CORPUS_TAGS,
    verify: "git tag objects exist on origin",
    note: "Same Plane A blast radius as the four CF hosts. Not a second independent shelf.",
  }),
  ...PLANE_A_MIRRORS.map((m) =>
    Object.freeze({
      id: "plane-a-host-" + m.id,
      plane: "A",
      kind: "other",
      status: "live",
      origin: m.origin,
      lockset: m.lockset,
      receipts: m.receipts,
      shelves: m.shelves,
      blast_radius: "cf-github",
      independent: false,
      lockset_shelf: true,
      verified_in_this_repo: m.verified_in_this_repo,
      verify: m.verified_in_this_repo
        ? "Worker origin serves published lockset tip"
        : "Named Plane A mirror of the same tip; sister /shelves may still be operator-published",
      note: "One of four Plane A host mirrors. Not an independent shelf.",
    }),
  ),
  Object.freeze({
    id: "plane-b-alt-forge-archive",
    plane: "B",
    kind: "other",
    status: "slot",
    doi: null,
    url: null,
    blast_radius: "alt-forge-archive",
    independent: true,
    lockset_shelf: true,
    lockset_doi: false,
    working_targets: PLANE_B_WORKING_TARGETS,
    refuse: REFUSE.NO_FORGE,
    checklist: "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
    reason:
      "Plane B working shelf is an alternate independent forge/archive tip-pack (Codeberg / archive.org / Framagit). Codeberg + archive.org hash-verify PASS; Framagit URL null (CNS-NO-FORGE-MIRROR) until a real project exists and hash-verifies. archive.org lists two items (primary aziel-lockset-tip + secondary aziel-lockset-tip_202609) under one working_targets kind. SLOT until all three pass (CNS-PLANE-B-ALL-TARGETS). cite.json / lockset doi stay null.",
    note: "Working targets: Codeberg, archive.org, Framagit. doi null.",
  }),
  Object.freeze({
    id: "plane-b-codeberg-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "slot",
    forge: "codeberg",
    url: CODEBERG_TIP_PACK.url,
    branch: CODEBERG_TIP_PACK.branch,
    files: CODEBERG_TIP_PACK.files,
    pack_sha256: CODEBERG_TIP_PACK.pack_sha256,
    lockset_tip: CODEBERG_TIP_PACK.lockset_tip,
    hash_verify: "pass",
    tip_verified: true,
    live_ready: false,
    doi: null,
    blast_radius: "codeberg",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.PLANE_B_ALL_TARGETS,
    reason:
      "Codeberg tip-pack uploaded and hash-verify PASS. SLOT until Framagit also hash-verify. Plane B LIVE only when Codeberg + archive.org + Framagit all pass (CNS-PLANE-B-ALL-TARGETS). doi null.",
  }),
  Object.freeze({
    id: "plane-b-archive-org-tip-pack",
    plane: "B",
    kind: "archive_org",
    status: "slot",
    url: ARCHIVE_ORG_TIP_PACK.url,
    identifier: ARCHIVE_ORG_TIP_PACK.identifier,
    item: ARCHIVE_ORG_TIP_PACK.item,
    download_base: ARCHIVE_ORG_TIP_PACK.download_base,
    files: ARCHIVE_ORG_TIP_PACK.files,
    pack_sha256: ARCHIVE_ORG_TIP_PACK.pack_sha256,
    lockset_tip: ARCHIVE_ORG_TIP_PACK.lockset_tip,
    hash_verify: "pass",
    tip_verified: true,
    live_ready: false,
    doi: null,
    blast_radius: "archive-org",
    independent: true,
    lockset_shelf: true,
    secondary_items: ARCHIVE_ORG_TIP_PACK.secondary_items,
    refuse: REFUSE.PLANE_B_ALL_TARGETS,
    reason:
      "archive.org tip-pack uploaded and hash-verify PASS (primary item aziel-lockset-tip at https://archive.org/details/aziel-lockset-tip, pack b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37). A second IA item (aziel-lockset-tip_202609) is the same blast_radius archive-org, listed under secondary_items — not a new independent shelf. SLOT until Framagit also hash-verify. Plane B LIVE only when Codeberg + archive.org + Framagit all pass (CNS-PLANE-B-ALL-TARGETS). doi null.",
  }),
  Object.freeze({
    id: "plane-b-archive-org-tip-pack-202609",
    plane: "B",
    kind: "archive_org",
    status: "slot",
    url: ARCHIVE_ORG_TIP_PACK_202609.url,
    identifier: ARCHIVE_ORG_TIP_PACK_202609.identifier,
    item: ARCHIVE_ORG_TIP_PACK_202609.item,
    download_base: ARCHIVE_ORG_TIP_PACK_202609.download_base,
    zip: ARCHIVE_ORG_TIP_PACK_202609.zip,
    zip_alt: ARCHIVE_ORG_TIP_PACK_202609.zip_alt,
    wrap: ARCHIVE_ORG_TIP_PACK_202609.wrap,
    ia_flat_sha256: null,
    sha256sums_flat_check: "incomplete",
    inner_pack: ARCHIVE_ORG_TIP_PACK_202609.inner_pack,
    files: ARCHIVE_ORG_TIP_PACK_202609.files,
    inner_files: ARCHIVE_ORG_TIP_PACK_202609.inner_files,
    pack_sha256: ARCHIVE_ORG_TIP_PACK_202609.pack_sha256,
    lockset_tip: ARCHIVE_ORG_TIP_PACK_202609.lockset_tip,
    hash_verify: "pass",
    tip_verified: true,
    live_ready: false,
    doi: null,
    blast_radius: "archive-org",
    independent: false,
    lockset_shelf: true,
    same_pack_as: "plane-b-archive-org-tip-pack",
    required_for_plane_b_live: false,
    refuse: REFUSE.PLANE_B_ALL_TARGETS,
    reason:
      "Second archive.org tip-pack item (aziel-lockset-tip_202609). Same blast_radius archive-org as the primary item — not a new independent shelf. Zip wraps the tip files; flat IA metadata sha256 on the zip may be null. SHA256SUMS flat-check incomplete at IA file list is OK because inner aziel-tip-pack.tar SHA-256 b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37 hash-verifies (AZBot PASS; same pack as Codeberg + primary archive.org). SLOT until Framagit also hash-verify. Plane B LIVE only when Codeberg + archive.org + Framagit all pass (CNS-PLANE-B-ALL-TARGETS). doi null.",
  }),
  Object.freeze({
    id: "plane-b-framagit-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "slot",
    forge: "framagit",
    url: null,
    blast_radius: "framagit",
    independent: true,
    lockset_shelf: true,
    live_ready: false,
    doi: null,
    required_for_plane_b_live: true,
    hash_verify: null,
    tip_verified: false,
    expect_pack_sha256: TIP_PACK_SHA256,
    expect_lockset_tip: LOCKSET_TIP,
    refuse: REFUSE.NO_FORGE,
    plane_b_refuse: REFUSE.PLANE_B_ALL_TARGETS,
    checklist: "tools/cold_shelf/FRAMAGIT-TIP-PACK-CHECKLIST.md",
    reason:
      "Framagit is the third Plane B LIVE-promotion target (CNS-PLANE-B-ALL-TARGETS = Codeberg + archive.org + Framagit). No verified URL (CNS-NO-FORGE-MIRROR). SLOT. Awaiting tip-pack. Do not invent a URL. Hash unverifiable until remote bytes exist. LIVE only after those bytes hash-verify against pack b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37 and tip c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245.",
  }),
  Object.freeze({
    id: "plane-b-gitflic-ru-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "refused",
    forge: "gitflic-ru",
    url: null,
    blast_radius: "gitflic-ru",
    independent: true,
    lockset_shelf: false,
    refuse: REFUSE.GITFLIC_EMAIL,
    reason:
      "GitFlic tip-pack stays SLOT. url null. ALL-TARGETS is Codeberg + archive.org + Framagit. Do not invent a GitFlic URL.",
  }),
  Object.freeze({
    id: "plane-b-gitlab-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "refused",
    forge: "gitlab",
    url: null,
    blast_radius: "gitlab",
    independent: true,
    lockset_shelf: false,
    refuse: REFUSE.GITLAB_CF_LOOP,
    reason:
      "GitLab tip-pack stays SLOT. url null. Do not invent a GitLab URL.",
  }),
  Object.freeze({
    id: "plane-b-zenodo-tip-pack",
    plane: "B",
    kind: "zenodo_doi",
    status: "slot",
    zenodo_live: false,
    doi: null,
    url: null,
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_shelf: false,
    lockset_doi: false,
    refuse: Object.freeze([REFUSE.ZENODO_NOT_LIVE, REFUSE.NO_TIP_DOI]),
    checklist: "tools/cold_shelf/ZENODO-TIP-PACK-CHECKLIST.md",
    reason:
      "Plane B alternate forge/archive tip-pack — Zenodo deposit not LIVE (zenodo_live:false; doi null; CNS-ZENODO-NOT-LIVE / CNS-NO-TIP-DOI). Working path is Codeberg + archive.org + Framagit. cite.json / lockset doi stay null. Do not invent. Paper deposits stay paper deposits.",
  }),
  Object.freeze({
    id: "plane-c-usb-airgap",
    plane: "C",
    kind: "usb_airgap",
    status: "slot",
    blast_radius: "operator-airgap",
    independent: true,
    lockset_shelf: true,
    primary: true,
    refuse: REFUSE.OPERATOR_ATTEST,
    pack: "node tools/cold_shelf/cli.mjs airgap",
    checklist: "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
    attest: USB_ATTEST,
    reason:
      "USB airgap export is the Plane C primary pack (tarball + SHA256SUMS + verify script). Shelf stays SLOT until an operator attests an off-network copy still hashes (CNS-OPERATOR-ATTEST). USB offline-verify before LIVE.",
  }),
  Object.freeze({
    id: "plane-c-forge-off-github",
    plane: "C",
    kind: "git_mirror",
    status: "slot",
    url: null,
    forge: null,
    blast_radius: "second-forge",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_FORGE,
    reason:
      "Optional Plane C second-forge slot. Codeberg / archive.org / Framagit are Plane B working targets, not this slot. No account URL here. SLOT. Do not invent a URL.",
  }),
  Object.freeze({
    id: "ipfs-lockset",
    plane: null,
    kind: "ipfs_cid",
    status: "slot",
    cid: null,
    url: null,
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_CID,
    reason: "Extra slot, not a named plane. No published CID. Do not invent one.",
  }),
]);

export const PLANE_B_TARGET_IDS = Object.freeze([
  "plane-b-codeberg-tip-pack",
  "plane-b-archive-org-tip-pack",
  "plane-b-framagit-tip-pack",
]);

export function liveShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "live");
}

export function slotShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "slot");
}

export function refusedShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "refused");
}

export function independentLiveShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "live" && s.independent === true);
}

export function independentLiveBlastRadii(rows = SHELF_REGISTRY) {
  const set = new Set();
  for (const s of independentLiveShelves(rows)) {
    if (s.blast_radius) set.add(s.blast_radius);
  }
  return [...set];
}

export function planeBLiveReady(rows = SHELF_REGISTRY) {
  return PLANE_B_TARGET_IDS.every((id) => {
    const s = rows.find((row) => row && row.id === id);
    return s && s.hash_verify === "pass" && s.tip_verified === true && s.url;
  });
}

export function judgePlaneAMirrors(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.count_four_hosts_as_four_shelves === true ||
    src.four_independent_cf_hosts === true ||
    src.plane_a_is_four_shelves === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.PLANE_A_ONE_TUNNEL,
      independent_count: 1,
      mirrors: PLANE_A_MIRRORS.length,
      published_surfaces: PUBLISHED_SURFACE_IDS.length,
      note: "Plane A is one CF/GitHub tunnel with four host mirrors. Not four independent shelves.",
    };
  }
  return {
    accept: true,
    action: "ok",
    plane: "A",
    independent_count: 1,
    mirrors: PLANE_A_MIRRORS.length,
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
  };
}

export function judgePublishedSurfaces(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.count_five_surfaces_as_five_shelves === true ||
    src.five_independent_surfaces === true ||
    src.five_independent_shelves === true ||
    src.claim_five_independent === true ||
    src.runtime_is_sixth_surface === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: src.runtime_is_sixth_surface ? REFUSE.RUNTIME_NOT_SHELF : REFUSE.SURFACES_NOT_INDEPENDENT,
      published_surfaces: PUBLISHED_SURFACE_IDS.length,
      family_blast_radii: FAMILY_BLAST_RADII.slice(),
      independent_live_count: 1,
      note: "4 CF hubs + GitHub = 5 published surfaces and 2 cf-github family radii. Runtime Worker is the same tunnel. Not 5 (or 6) independent shelves.",
    };
  }
  return {
    accept: true,
    action: "ok",
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
    independent_live_blast_radii: independentLiveBlastRadii(),
    independent_live_count: independentLiveBlastRadii().length,
  };
}

export function judgeZenodoTipReuse(input) {
  const src = input && typeof input === "object" ? input : {};
  const doi = String(src.doi || "").trim();
  const paper = PAPER_DEPOSITS.find((p) => p.doi === doi);
  if (paper) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.TIP_NOT_ON_DEPOSIT,
      working_path: REFUSE.ZENODO_NOT_LIVE,
      reuse_as_plane_b: false,
      tip_verified: false,
      doi,
      payload: paper.payload,
      note: "Paper deposits stay paper deposits. Zenodo deposit not LIVE (zenodo_live:false; doi null; CNS-ZENODO-NOT-LIVE).",
    };
  }
  if (doi) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.FAKE_DEPOSIT,
      working_path: REFUSE.ZENODO_NOT_LIVE,
      doi: null,
      note: "DOI is not a verified tip-pack. Do not invent. Zenodo deposit not LIVE (zenodo_live:false).",
    };
  }
  return {
    accept: false,
    action: "refuse",
    reason: REFUSE.ZENODO_NOT_LIVE,
    also: REFUSE.NO_TIP_DOI,
    status: "slot",
    zenodo_live: false,
    doi: null,
  };
}

export function claimShelfLive(shelf) {
  if (!shelf || typeof shelf !== "object") {
    return { live: false, action: "refuse", reason: REFUSE.SHELF_NOT_LIVE };
  }
  if (shelf.status !== "live") {
    return {
      live: false,
      action: "refuse",
      reason: shelf.refuse || REFUSE.SHELF_NOT_LIVE,
      status: shelf.status,
    };
  }
  return { live: true, action: "ok", id: shelf.id, kind: shelf.kind };
}

export function planesDoc() {
  return {
    A: {
      name: "CF/GitHub tunnel",
      status: "live",
      independent: true,
      mirrors: PLANE_A_MIRRORS.length,
      published_surfaces: PUBLISHED_SURFACE_IDS.length,
      family_blast_radii: FAMILY_BLAST_RADII.slice(),
      note: "4 CF hubs + GitHub = 5 published surfaces / 2 family radii (cloudflare + github). One cf-github plane, not five shelves.",
    },
    B: {
      name: "alternate independent forge/archive tip-pack",
      status: "slot",
      doi: null,
      working_targets: PLANE_B_WORKING_TARGETS.slice(),
      zenodo_working_path: false,
      live_ready: planeBLiveReady(),
      refuse: REFUSE.PLANE_B_ALL_TARGETS,
      zenodo_live: false,
      checklist: "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
      honesty: {
        hash_verify_pass_is_not_live: true,
        do_not_paint_slot_as_live: true,
        invented_live: false,
        framagit_url: null,
        zenodo_live: false,
        gitlab_live: false,
        gitflic_live: false,
        slot_until: REFUSE.PLANE_B_ALL_TARGETS,
      },
      note: "Codeberg + archive.org hash-verify PASS (still SLOT — hash-verify PASS is not Plane B LIVE). archive.org has two items (aziel-lockset-tip + aziel-lockset-tip_202609), same blast_radius — not a second independent shelf. Zip wrap on the 202609 item: flat IA sha256 on the zip may be null; inner aziel-tip-pack.tar hash-verifies. Framagit URL null (CNS-NO-FORGE-MIRROR) until a real project exists and hash-verifies. LIVE only when all three pass (CNS-PLANE-B-ALL-TARGETS). Zenodo deposit not LIVE (zenodo_live:false; doi null; CNS-ZENODO-NOT-LIVE). Do not invent LIVE Zenodo/Framagit/GitLab/GitFlic.",
    },
    C: {
      name: "USB airgap + optional second forge",
      status: "slot",
      primary: "usb_airgap",
      refuse: [REFUSE.OPERATOR_ATTEST, REFUSE.NO_FORGE],
      checklist: "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
      attest: USB_ATTEST,
      honesty: {
        do_not_paint_slot_as_live: true,
        attested: false,
        slot_until: REFUSE.OPERATOR_ATTEST,
      },
    },
  };
}

export function verifyHowTo() {
  return {
    paste_hash: `${LIBRARY_ORIGIN}/receipts/verify?hash=`,
    machine: `${LIBRARY_ORIGIN}/v1/receipts/verify?hash=`,
    lockset: CORPUS_LOCKSET,
    shelves: CORPUS_SHELVES,
    cli: "node tools/cold_shelf/cli.mjs verify --hash <64-hex> | --file ",
    rule: `yes/no against the published lockset tip ${LOCKSET_TIP}. Cheap mismatch. cite, don't merge. bytes survive; crawlers do not re-expand.`,
    reexpand: "original receipts + prev-hash; not index→mesh (RE-EXPAND-FROM-ARCHIVE-1.0)",
    reheal: "self tip + trusted pull or phoenix-WAIT; never neighbor vote",
    crawlers: "extra shelves, not re-expand",
    training_residue: "rumor",
  };
}

export function shelfRegistryDoc() {
  const radii = independentLiveBlastRadii();
  return {
    spec: COLD_MULTI_SHELF,
    author: COLD_MULTI_SHELF_AUTHOR,
    identity: COLD_MULTI_SHELF_AUTHOR,
    person_id: AUTHOR_ID,
    umbrella: CROSS_NETWORK_SURVIVAL,
    no_lie_spec: NO_LIE_SPEC,
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    lockset_zenodo: null,
    lockset_doi: null,
    source_of_truth: CORPUS_SHELVES,
    source_of_truth_json: CORPUS_SHELVES_JSON,
    planes: planesDoc(),
    paper_deposits: PAPER_DEPOSITS.map((p) => ({ ...p })),
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    published_surface_ids: PUBLISHED_SURFACE_IDS.slice(),
    published_surfaces_note: "4 CF hubs + GitHub. Not 5 independent shelves.",
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
    min_independent_shelves: MIN_INDEPENDENT_SHELVES,
    independent_live_blast_radii: radii,
    independent_live_count: radii.length,
    independent_requirement_met: radii.length >= MIN_INDEPENDENT_SHELVES,
    survival: "bytes↔hash",
    crawlers: "extra-shelf-not-reexpand",
    training_residue: "rumor",
    kinds: SHELF_KINDS.slice(),
    statuses: SHELF_STATUSES.slice(),
    live: liveShelves().map((s) => s.id),
    slot: slotShelves().map((s) => s.id),
    refused: refusedShelves().map((s) => s.id),
    shelves: SHELF_REGISTRY.map((s) => ({ ...s })),
    verify: verifyHowTo(),
    growth_on: true,
    softwares_tab: false,
    mesh_radio: false,
    az_gen_live_icann_publish: false,
    visible_1520: false,
    fifth_product: false,
    runtime_is_shelf: false,
    note:
      `CROSS-NETWORK-SURVIVAL: ${CROSS_NETWORK_SURVIVAL_RULE} ` +
      `NO-LIE / NO-REWRITE: ${NO_LIE_NO_REWRITE_RULE} ` +
      COLD_MULTI_SHELF_RULE +
      " Plane A is one CF/GitHub tunnel (5 published surfaces / 2 family radii; independent_live_count stays 1). " +
      "Plane B is alt independent forge/archive SLOT (Codeberg + archive.org PASS; Framagit URL null, CNS-NO-FORGE-MIRROR). " +
      "archive.org items: https://archive.org/details/aziel-lockset-tip and https://archive.org/details/aziel-lockset-tip_202609 (same blast_radius; zip wrap on 202609 — flat IA sha256 may be null; inner tar hash-verifies). Not two independent shelves. " +
      "Zenodo tip-pack stays SLOT (zenodo_live:false; doi null; CNS-ZENODO-NOT-LIVE). " +
      "Paper deposits stay paper deposits. Plane C USB stays SLOT until CNS-OPERATOR-ATTEST. " +
      "aziel-runtime Worker cites this registry; it is the same Plane A tunnel.",
  };
}

export function shelvesCap7Cite() {
  return {
    spec: SEMANTIC_BRIDGE_SPEC,
    design_of: CAP7_DESIGN_OF,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
  };
}

export function shelvesRedlineCite(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    spec: REDLINE_SPEC,
    path: REDLINE_DOCS,
    cite: base ? `${base}/cite.json` : "/cite.json",
    field: "redline",
    software_tab: false,
    fraggate_slug: false,
    cap7: shelvesCap7Cite(),
    attack_sims: attackSimRefusePointer(),
  };
}

export function runtimeTunnelNote(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    origin: base || null,
    github: "https://github.com/AzielEliab/aziel-runtime",
    plane: "A",
    blast_radius: "cf-github",
    independent: false,
    published_surface: false,
    software_tab: false,
    note: "Same CF/GitHub Plane A tunnel as the four hubs + corpus git. Not a sixth published surface and not an independent shelf.",
  };
}

export function shelvesDoc(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const registry = shelfRegistryDoc();
  return {
    spec: COLD_MULTI_SHELF,
    rule: COLD_MULTI_SHELF_RULE,
    author: COLD_MULTI_SHELF_AUTHOR,
    identity: COLD_MULTI_SHELF_AUTHOR,
    person_id: AUTHOR_ID,
    ingest_as_receipt: "INGEST-AS-RECEIPT-1.0",
    cross_network_survival: "CROSS-NETWORK-SURVIVAL",
    cross_network_survival_rule: CROSS_NETWORK_SURVIVAL_RULE,
    no_lie: "NO-LIE",
    no_rewrite: "NO-REWRITE",
    no_lie_no_rewrite: "NO-LIE / NO-REWRITE",
    no_lie_no_rewrite_rule: NO_LIE_NO_REWRITE_RULE,
    no_lie_spec: NO_LIE_SPEC,
    cold_multi_shelf: COLD_MULTI_SHELF,
    cold_multi_shelf_rule: COLD_MULTI_SHELF_RULE,
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    source_of_truth: CORPUS_SHELVES,
    source_of_truth_json: CORPUS_SHELVES_JSON,
    cite: base ? `${base}/cite.json` : "/cite.json",
    llms: base ? `${base}/llms.txt` : "/llms.txt",
    ai: base ? `${base}/ai.txt` : "/ai.txt",
    lockset: CORPUS_LOCKSET,
    corpus_cite: CORPUS_CITE,
    registry,
    planes: registry.planes,
    verify: registry.verify,
    runtime: runtimeTunnelNote(base),
    redline: shelvesRedlineCite(base),
    cap7: shelvesCap7Cite(),
    attack_sims: attackSimRefusePointer(),
    visible_1520: false,
    growth_on: true,
    software_tab: false,
    fraggate_slug: false,
    survival_tip: SURVIVAL_TIP,
  };
}

export function shelvesCiteField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const radii = independentLiveBlastRadii();
  return {
    spec: COLD_MULTI_SHELF,
    author: COLD_MULTI_SHELF_AUTHOR,
    identity: COLD_MULTI_SHELF_AUTHOR,
    person_id: AUTHOR_ID,
    rule: COLD_MULTI_SHELF_RULE,
    umbrella: CROSS_NETWORK_SURVIVAL,
    no_lie_spec: NO_LIE_SPEC,
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    lockset_doi: null,
    doi: null,
    source_of_truth: CORPUS_SHELVES,
    source_of_truth_json: CORPUS_SHELVES_JSON,
    shelves: base ? `${base}/shelves` : "/shelves",
    cold_copy: base ? `${base}/cold-copy` : "/cold-copy",
    shelves_json: base ? `${base}/v1/shelves` : "/v1/shelves",
    corpus_shelves: CORPUS_SHELVES,
    archive_org_tip_packs: ARCHIVE_ORG_TIP_PACK_URLS.slice(),
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    published_surface_ids: PUBLISHED_SURFACE_IDS.slice(),
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
    independent_live_blast_radii: radii,
    independent_live_count: radii.length,
    independent_requirement_met: false,
    planes: {
      A: "live",
      B: "slot",
      C: "slot",
    },
    plane_b: {
      status: "slot",
      doi: null,
      live_ready: false,
      working_targets: PLANE_B_WORKING_TARGETS.slice(),
      honesty: {
        hash_verify_pass_is_not_live: true,
        do_not_paint_slot_as_live: true,
        invented_live: false,
        framagit_url: null,
        zenodo_live: false,
        gitlab_live: false,
        gitflic_live: false,
        slot_until: REFUSE.PLANE_B_ALL_TARGETS,
      },
      codeberg: {
        url: CODEBERG_TIP_PACK.url,
        pack_sha256: CODEBERG_TIP_PACK.pack_sha256,
        hash_verify: "pass",
        hash_verify_pass_is_not_live: true,
        live_ready: false,
        refuse: REFUSE.PLANE_B_ALL_TARGETS,
      },
      archive_org: {
        url: ARCHIVE_ORG_TIP_PACK.url,
        identifier: ARCHIVE_ORG_TIP_PACK.identifier,
        pack_sha256: ARCHIVE_ORG_TIP_PACK.pack_sha256,
        hash_verify: "pass",
        hash_verify_pass_is_not_live: true,
        live_ready: false,
        refuse: REFUSE.PLANE_B_ALL_TARGETS,
        secondary_items: ARCHIVE_ORG_TIP_PACK.secondary_items,
      },
      archive_org_202609: {
        url: ARCHIVE_ORG_TIP_PACK_202609.url,
        identifier: ARCHIVE_ORG_TIP_PACK_202609.identifier,
        item: ARCHIVE_ORG_TIP_PACK_202609.item,
        pack_sha256: ARCHIVE_ORG_TIP_PACK_202609.pack_sha256,
        hash_verify: "pass",
        live_ready: false,
        independent: false,
        same_blast_radius: "archive-org",
        wrap: ARCHIVE_ORG_TIP_PACK_202609.wrap,
        ia_flat_sha256: null,
        refuse: REFUSE.PLANE_B_ALL_TARGETS,
      },
      framagit: {
        url: null,
        status: "slot",
        hash_verify: null,
        live_ready: false,
        refuse: REFUSE.NO_FORGE,
        plane_b_refuse: REFUSE.PLANE_B_ALL_TARGETS,
        checklist: "tools/cold_shelf/FRAMAGIT-TIP-PACK-CHECKLIST.md",
      },
      gitflic_ru: { status: "refused", url: null, refuse: REFUSE.GITFLIC_EMAIL },
      gitlab: { status: "refused", url: null, refuse: REFUSE.GITLAB_CF_LOOP },
      zenodo: { status: "slot", zenodo_live: false, doi: null, refuse: [REFUSE.ZENODO_NOT_LIVE, REFUSE.NO_TIP_DOI] },
    },
    plane_c: {
      status: "slot",
      refuse: REFUSE.OPERATOR_ATTEST,
      attest: USB_ATTEST,
      honesty: {
        do_not_paint_slot_as_live: true,
        attested: false,
        slot_until: REFUSE.OPERATOR_ATTEST,
      },
    },
    redline: shelvesRedlineCite(base),
    cap7: shelvesCap7Cite(),
    attack_sims: attackSimRefusePointer(),
    growth_on: true,
    visible_1520: false,
    software_tab: false,
    fraggate_slug: false,
    runtime_is_shelf: false,
    paper: COLD_MULTI_SHELF_DOCS,
  };
}

export function shelvesLlmsBlock(origin) {
  const cite = shelvesCiteField(origin);
  return [
    "## Cold multi-shelf (COLD-MULTI-SHELF-1.0)",
    "",
    COLD_MULTI_SHELF_RULE,
    "",
    `CROSS-NETWORK-SURVIVAL: ${CROSS_NETWORK_SURVIVAL_RULE}`,
    `NO-LIE / NO-REWRITE: ${NO_LIE_NO_REWRITE_RULE}`,
    `Person @id: ${AUTHOR_ID}. No visible 15:20 chrome.`,
    `Source of truth (corpus#96): ${CORPUS_SHELVES}`,
    `Runtime cite: ${cite.shelves} · ${cite.shelves_json} · alias ${cite.cold_copy}`,
    `Lockset tip: ${LOCKSET_TIP} (AZLOCK-INGEST-REEXPAND-1.0). doi null. Never invent a DOI.`,
    "Plane A LIVE: 5 published surfaces (4 CF hubs + GitHub) / 2 family radii (cloudflare + github). One independent live: cf-github.",
    `Plane B SLOT: Codeberg ${CODEBERG_TIP_PACK.url} hash-verify PASS pack ${CODEBERG_TIP_PACK.pack_sha256} still SLOT. archive.org PASS primary ${ARCHIVE_ORG_TIP_PACK.url} + secondary ${ARCHIVE_ORG_TIP_PACK_202609.url} (same blast_radius archive-org; pack ${ARCHIVE_ORG_TIP_PACK.pack_sha256}; zip wrap on 202609 — ia_flat_sha256 null; inner tar hash-verifies) still SLOT. Framagit URL null (CNS-NO-FORGE-MIRROR; third ALL-TARGETS). LIVE only after all three (CNS-PLANE-B-ALL-TARGETS). Zenodo tip-pack stays SLOT (zenodo_live:false; doi null; CNS-ZENODO-NOT-LIVE).`,
    "Plane C USB SLOT until CNS-OPERATOR-ATTEST.",
    "aziel-runtime Worker is the same Plane A tunnel.",
    `REDLINE cite: ${REDLINE_SPEC} (${REDLINE_DOCS}). Cap-7 design_of: hub_designs. resolves_to_hub: false.`,
    `Attack-sim refuse pointer: ${ATTACK_SIM_POINTER}.`,
    "Cap-7 names inherit hub designs only. resolves_to_hub: false. public_icann: false. No fifth product.",
    "Growth-ON crawlers Allow. Dual-surface MCP/OpenAPI. Full AI client set.",
    "",
  ].join("\n");
}

export function shelvesSkillMarkdown(origin) {
  const cite = shelvesCiteField(origin);
  return `## Cold multi-shelf (COLD-MULTI-SHELF-1.0)

${COLD_MULTI_SHELF_RULE}

Corpus SoT: [${CORPUS_SHELVES}](${CORPUS_SHELVES}). Runtime cite: \`GET ${cite.shelves}\` / \`GET ${cite.shelves_json}\` (alias \`/cold-copy\`). Person \`@id\` ${AUTHOR_ID}.

- **Plane A** LIVE — 5 published surfaces (4 CF hubs + GitHub) / 2 family radii. \`independent_live_count\` stays **1** (\`cf-github\`).
- **Plane B** SLOT — Codeberg ${CODEBERG_TIP_PACK.url} hash-verify PASS (pack \`${CODEBERG_TIP_PACK.pack_sha256}\`) still SLOT. archive.org PASS primary ${ARCHIVE_ORG_TIP_PACK.url} + secondary ${ARCHIVE_ORG_TIP_PACK_202609.url} (same blast_radius archive-org; not two independent shelves; pack \`${ARCHIVE_ORG_TIP_PACK.pack_sha256}\`; zip wrap on 202609 — ia_flat_sha256 null; inner tar hash-verifies) still SLOT. Framagit URL **null** (\`CNS-NO-FORGE-MIRROR\`; third ALL-TARGETS). LIVE only after all three (\`CNS-PLANE-B-ALL-TARGETS\`). Zenodo tip-pack SLOT (\`CNS-ZENODO-NOT-LIVE\`). \`doi\` null — never invent.
- **Plane C** USB SLOT until \`CNS-OPERATOR-ATTEST\`.

This Worker is the same Plane A tunnel. No new MCP tool. Linked fields: \`redline.spec\` ${REDLINE_SPEC}; Cap-7 \`design_of: hub_designs\` + \`resolves_to_hub: false\`; attack-sim refuse pointer \`${ATTACK_SIM_POINTER}\`. Cap-7 stays \`resolves_to_hub: false\` / \`public_icann: false\`. Growth-ON.
`;
}

export function isShelvesPath(pathname) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  return path === "/shelves" || path === "/cold-copy" || path === "/v1/shelves" || path === "/v1/cold-copy";
}

export function dispatchShelvesHttp(method, pathname, origin) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "/shelves")
    .split("?")[0]
    .replace(/\/+$/, "") || "/shelves";
  if (!isShelvesPath(path)) return null;
  if (verb === "GET" || verb === "HEAD") {
    return { status: 200, body: shelvesDoc(origin) };
  }
  return {
    status: 405,
    body: {
      ok: false,
      code: "CNS-CITE-ONLY",
      spec: COLD_MULTI_SHELF,
      message: "GET /shelves cites COLD-MULTI-SHELF-1.0. Not a live registrar. Not a shelf promote.",
      path,
      method: verb,
      hint: "GET /shelves",
    },
  };
}
