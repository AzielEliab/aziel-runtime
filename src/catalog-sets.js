/**
 * Intentional split: Softwares tab, FragGate registry / allowlist, mesh software_nodes.
 * Equal counts are not equal sets. Do not merge membership to force one number.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const CATALOG_SET_AUTHOR = "Aziel Eliab";

export const CATALOG_SET_NOTE =
  "Softwares slugs, the FragGate public allowlist (LIVE_OPS), FragGate product_count (registry entries), and mesh software_nodes are not the same set. Equal counts are not equal membership. Softwares includes veillock (local_only; no public FragGate door) and whitestone (worker_only; FragGate status none). The FragGate allowlist includes kernel entries memory and mesh, which are not Softwares cards. FragGate product_count counts registry entries (in-process catalog engines plus memory and mesh, including veillock as local_only) and excludes whitestone. mesh software_nodes fans out in-process catalog product Workers ({slug}-worker) only: whitestone is absent; memory and mesh are not software_nodes rows; veillock is in that fan-out and is not on the public allowlist. Do not invent Softwares rows. Do not drop whitestone or veillock to force one count. Policy keeps the split: memory and mesh stay fabric (not a Softwares-tab product); whitestone stays worker_only with no invented FragGate op; veillock stays local_only.";

function uniqSorted(list) {
  return [...new Set((list || []).map((s) => String(s || "").trim()).filter(Boolean))].sort();
}

function onlyIn(left, right) {
  const ban = new Set(right);
  return left.filter((s) => !ban.has(s));
}

export function catalogSetHonesty({ softwareSlugs, registrySlugs, allowlistSlugs, fanoutSlugs } = {}) {
  const software = uniqSorted(softwareSlugs);
  const registry = uniqSorted(registrySlugs);
  const allowlist = uniqSorted(allowlistSlugs);
  const fanout = uniqSorted(fanoutSlugs);
  const softwares_not_on_allowlist = onlyIn(software, allowlist);
  const allowlist_not_on_softwares = onlyIn(allowlist, software);
  return {
    equate: false,
    sets_equal: false,
    intentional_split: true,
    same_count_not_same_set:
      software.length === allowlist.length &&
      (softwares_not_on_allowlist.length > 0 || allowlist_not_on_softwares.length > 0),
    author: CATALOG_SET_AUTHOR,
    identity: CATALOG_SET_AUTHOR,
    softwares_count: software.length,
    fraggate_registry_count: registry.length,
    fraggate_product_count: registry.length,
    fraggate_allowlist_count: allowlist.length,
    software_nodes_fanout_count: fanout.length,
    softwares_not_on_allowlist,
    allowlist_not_on_softwares,
    softwares_not_in_registry: onlyIn(software, registry),
    registry_not_on_softwares: onlyIn(registry, software),
    softwares_not_in_software_nodes: onlyIn(software, fanout),
    software_nodes_not_on_softwares: onlyIn(fanout, software),
    note: CATALOG_SET_NOTE,
  };
}

/** products = in-process catalog (suite-presence fan-out). workerOnlySlugs = Softwares cards with no FragGate registry row. */
export function catalogSetsFromParts(products, registryEntries, allowlistSlugs, workerOnlySlugs) {
  const productSlugs = (products || []).map((p) => (p && p.slug) || p);
  return catalogSetHonesty({
    softwareSlugs: productSlugs.concat(workerOnlySlugs || []),
    registrySlugs: (registryEntries || []).map((e) => (e && e.slug) || e),
    allowlistSlugs,
    fanoutSlugs: productSlugs,
  });
}

export function llmsCatalogSetsBlock(sets) {
  const s = sets && typeof sets === "object" ? sets : {};
  const join = (list) => (Array.isArray(list) ? list.join(", ") : "");
  return [
    "## Catalog sets",
    "",
    s.note || CATALOG_SET_NOTE,
    "",
    "equate: false",
    `softwares_count: ${s.softwares_count ?? ""}`,
    `fraggate_product_count: ${s.fraggate_product_count ?? ""}`,
    `fraggate_allowlist_count: ${s.fraggate_allowlist_count ?? ""}`,
    `software_nodes_fanout_count: ${s.software_nodes_fanout_count ?? ""}`,
    `softwares_not_on_allowlist: ${join(s.softwares_not_on_allowlist)}`,
    `allowlist_not_on_softwares: ${join(s.allowlist_not_on_softwares)}`,
    `softwares_not_in_registry: ${join(s.softwares_not_in_registry)}`,
    `registry_not_on_softwares: ${join(s.registry_not_on_softwares)}`,
    `softwares_not_in_software_nodes: ${join(s.softwares_not_in_software_nodes)}`,
    "Do not equate Softwares slugs, the FragGate allowlist, FragGate product_count, or mesh software_nodes.",
    "",
  ].join("\n");
}
