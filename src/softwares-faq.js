/**
 * Machine-only Softwares list for Person / FAQ / llms / cite surfaces.
 *
 * Softwares-tab / machine cite only. Not homepage HTML. Not a second door.
 * Catalog one_line stays in software-copy.js (do not fork).
 *
 * Identity: Aziel Eliab only. GodLock is a product name, not identity.
 * NO-LIE. No invented DOIs.
 */

import { SOFTWARE_COPY, softwareOneLine } from "./software-copy.js";

const LIBRARY_ORIGIN = "https://www.azielcorpuslibrary.net";
const BUCKET_RANK = Object.freeze({ plain: 0, gate: 1, lock: 2 });

function softwareBucket(name, slug) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  const s = String(slug || "")
    .trim()
    .toLowerCase();
  const clock = n.endsWith("clock") || s.endsWith("clock");
  const lock = !clock && (n.endsWith("lock") || s.endsWith("lock"));
  const gate = n.includes("gate") || s.includes("gate");
  if (lock) return "lock";
  if (gate) return "gate";
  return "plain";
}

function compareSoftwareEntries(a, b) {
  const ra = BUCKET_RANK[a && a.bucket] ?? 9;
  const rb = BUCKET_RANK[b && b.bucket] ?? 9;
  if (ra !== rb) return ra - rb;
  return String((a && a.name) || "").localeCompare(String((b && b.name) || ""), "en", {
    sensitivity: "base",
  });
}

export const ARK_SLUG = "ark";
export const ARK_NAME = "The ARK";
export const ARK_WORKER_HOME = "https://ark-download-tracker.vibelock.workers.dev/";
export const ARK_DOWNLOAD = "https://ark-download-tracker.vibelock.workers.dev/download";
export const ARK_ONE_LINE = SOFTWARE_COPY.ark.one_line;

/** In-runtime placements — no separate product Worker (same as hub software_names). */
const IN_RUNTIME_SLUGS = Object.freeze(["zkattest", "mmconsensus", "toolbench", "azvpn"]);

/** Exact public Softwares names. Do not invent display names. */
export const SOFTWARE_FAQ_NAMES = Object.freeze({
  "4dmap": "4DMap",
  azclce: "AZ-CLCE",
  azos: "AZ-OS",
  azai: "AZAI",
  azbot: "AZBot",
  azbrowser: "AZBrowser",
  azchat: "AZChat",
  azcoherence: "AZCoherence",
  azhub: "AZHub",
  "aziel-corpus": "Aziel Digital Library",
  azieltether: "AzielTether",
  azinterface: "AZInterface",
  azmail: "AZMail",
  aznet: "AZNet",
  azvpn: "AZVPN",
  forgereceipts: "ForgeReceipts",
  glossafilter: "Glossa Filter",
  miragegrid: "MirageGrid",
  mmconsensus: "MMConsensus",
  postking: "Post-King Chess",
  staticclock: "StaticClock",
  ark: ARK_NAME,
  toolbench: "ToolBench",
  zsolver: "ZionPattern Solver",
  zkattest: "ZKAttest",
  decisiongate: "DecisionGATE",
  chronolock: "ChronoLock",
  codelock: "CodeLock",
  embryolock: "EmbryoLock",
  employeelock: "EmployeeLock",
  foldlock: "FoldLock",
  godlock: "GodLock",
  mialock: "M.I.A.Lock",
  peacelock: "PeaceLock",
  shadowlock: "ShadowLock",
  spectrallock: "SpectralLock",
  temporallock: "TemporalLock",
  trajectorylock: "TrajectoryLock",
  veillock: "VeilLock",
  vibelock: "VibeLock",
  whistlelock: "WhistleLock",
  whitestone: "Whitestone",
});

function defaultRuntimeOrigin() {
  return "https://aziel-runtime.vibelock.workers.dev";
}

export function softwareFaqUrl(slug, origin) {
  const s = String(slug || "");
  const base = String(origin || defaultRuntimeOrigin()).replace(/\/$/, "");
  if (s === "aziel-corpus") return `${LIBRARY_ORIGIN}/`;
  if (s === "whitestone") return "https://whitestone.vibelock.workers.dev/";
  if (IN_RUNTIME_SLUGS.includes(s)) return `${base}/#task-${s}`;
  return `https://${s}-download-tracker.vibelock.workers.dev/`;
}

export function softwareFaqDownloadUrl(slug, origin) {
  const s = String(slug || "");
  if (s === "aziel-corpus") return `${LIBRARY_ORIGIN}/download`;
  if (IN_RUNTIME_SLUGS.includes(s)) return null;
  return `${softwareFaqUrl(s, origin)}download`;
}

export function softwareFaqItem(slug, origin) {
  const s = String(slug || "");
  const name = SOFTWARE_FAQ_NAMES[s] || s;
  const one_line = softwareOneLine(s, name);
  const url = softwareFaqUrl(s, origin);
  const download_url = softwareFaqDownloadUrl(s, origin);
  return {
    slug: s,
    name,
    bucket: softwareBucket(name, s),
    one_line,
    url,
    download_url,
    software_tab: true,
  };
}

export function softwaresFaqItems(origin) {
  return Object.keys(SOFTWARE_COPY)
    .map((slug) => softwareFaqItem(slug, origin))
    .sort(compareSoftwareEntries);
}

export function arkFaqItem(origin) {
  return softwareFaqItem(ARK_SLUG, origin);
}

export function softwaresFaqLine(item) {
  return `${item.name} — ${item.one_line} ${item.url}`;
}

export function softwaresAddendum(origin) {
  const items = softwaresFaqItems(origin);
  const ark = items.find((s) => s.slug === ARK_SLUG);
  const peers = items.map(softwaresFaqLine).join("; ");
  return (
    `Softwares (FragGate catalog; Softwares-tab / machine cite): ${peers}. ` +
    `${ark.name} is a local deniable vault — ${ark.one_line} ${ark.url} (${ark.download_url}). ` +
    "Full catalog GET /v1/software. Do not invent DOIs."
  );
}

export function softwaresFaqLlmsLines(origin) {
  const items = softwaresFaqItems(origin);
  return [
    "## Softwares (machine cite)",
    "",
    "Softwares-tab / machine cite only. Locked FAQ Softwares sentence above is unchanged.",
    "Name + one_line + Worker URL (same pattern for every catalog product). GET /v1/software is the hub catalog.",
    "",
    ...items.map((item) => `- ${softwaresFaqLine(item)}`),
    "",
  ];
}

export function softwaresFaqField(origin) {
  const items = softwaresFaqItems(origin);
  const ark = items.find((s) => s.slug === ARK_SLUG);
  return {
    addendum: softwaresAddendum(origin),
    catalog: "GET /v1/software",
    software_tab: true,
    chrome: false,
    invent_doi: false,
    ark,
    items,
  };
}
