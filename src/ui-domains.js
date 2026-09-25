/**
 * Workspace navigation tabs. Isolation domains stay in domain-map.js
 * (MASTER-33, domains_are_doors false). These tabs only group catalog
 * cards on the human workspace. A new Software is one slug in one list.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const UI_DOMAIN_SPEC = "UI-DOMAIN-TABS-1.0";
export const UI_DOMAIN_DEFAULT = "aznet";

export const UI_DOMAINS = Object.freeze([
  {
    id: "aznet",
    label: "AZnet",
    softwares: ["aznet", "azbrowser", "azvpn", "miragegrid", "azieltether"],
  },
  {
    id: "forensics",
    label: "Forensics",
    softwares: ["4dmap", "spectrallock", "trajectorylock", "veillock", "vibelock", "shadowlock", "mialock"],
  },
  {
    id: "games",
    label: "Games",
    softwares: ["postking"],
  },
  {
    id: "social",
    label: "Social",
    softwares: ["azchat", "azmail"],
  },
  {
    id: "language",
    label: "Language",
    softwares: ["codelock", "foldlock", "glossafilter", "zsolver", "godlock", "azclce", "azcoherence"],
  },
  {
    id: "evidence",
    label: "Evidence",
    softwares: ["employeelock", "whistlelock", "peacelock", "chronolock"],
  },
  {
    id: "receipts",
    label: "Receipts",
    softwares: ["forgereceipts", "temporallock", "zkattest"],
  },
  {
    id: "ai",
    label: "AI",
    softwares: ["azai", "azbot", "azhub", "toolbench"],
  },
  {
    id: "vault",
    label: "Vault",
    softwares: ["ark", "embryolock"],
  },
  {
    id: "library",
    label: "Library",
    softwares: ["aziel-corpus", "whitestone"],
  },
  {
    id: "system",
    label: "System",
    softwares: ["azos", "azinterface", "staticclock", "decisiongate", "mmconsensus"],
  },
  {
    id: "corpus",
    label: "Corpus",
    kind: "corpus",
    softwares: [],
  },
  {
    id: "aziel-elroi-eliab",
    label: "Aziel Elroi Eliab",
    kind: "author",
    softwares: [],
  },
]);

const BY_SLUG = (() => {
  const out = Object.create(null);
  for (const domain of UI_DOMAINS) {
    for (const slug of domain.softwares) {
      if (out[slug]) throw new Error(`UI domain slug listed twice: ${slug}`);
      out[slug] = domain.id;
    }
  }
  return Object.freeze(out);
})();

export function uiDomainForSlug(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  return BY_SLUG[key] || null;
}

export function uncoveredUiDomainSlugs(slugs) {
  const missing = [];
  const seen = new Set();
  for (const slug of slugs || []) {
    const key = String(slug || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!BY_SLUG[key]) missing.push(key);
  }
  return missing;
}
