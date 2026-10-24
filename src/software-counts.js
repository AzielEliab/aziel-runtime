/**
 * Labelled Softwares counts.
 *
 * The product lock stays softwares_tab_placements. health count, live_count,
 * and live_engines are different sets that can share a digit. Do not add them.
 * Do not rename any of them "41 live advisory engines".
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CATALOG_COUNT_NOTE, MASTER_33_SLUGS, TAB_PLACEMENT_SLUGS, WORKER_ONLY_TAB_SLUGS } from "./domain-map.js";
import { LIVE_OPS, NAMED_STUBS } from "./fraggate/registry.js";

function publicDoor(slug) {
  const ops = LIVE_OPS[slug];
  return Array.isArray(ops) && ops.length > 0;
}

export function softwareCountFacts(products) {
  const list = Array.isArray(products) ? products : [];
  const in_process_catalog_products = list.length;
  const local_only_slugs = list.filter((p) => p && p.slug && !publicDoor(p.slug)).map((p) => p.slug);
  const worker_only_placements = WORKER_ONLY_TAB_SLUGS.slice();
  const named_stubs = Array.isArray(NAMED_STUBS) ? NAMED_STUBS.length : 0;
  const tab_placement_slugs = TAB_PLACEMENT_SLUGS.slice();
  const isolation_software_count = MASTER_33_SLUGS.length;
  const softwares_tab_placements = in_process_catalog_products + named_stubs + worker_only_placements.length;
  const live_engines = in_process_catalog_products - local_only_slugs.length;
  const live_count = live_engines + worker_only_placements.length;
  const summary =
    `Canonical Softwares product count is softwares_tab_placements ${softwares_tab_placements} ` +
    `(isolation software_count ${isolation_software_count} + ${tab_placement_slugs.length} tab placements). ` +
    `live_count ${live_count} is tab cards with status live (that set minus local_only ${local_only_slugs.join(", ") || "none"}). ` +
    `GET /v1/health count ${in_process_catalog_products} is in-process catalog products ` +
    `(includes local_only, excludes worker-only ${worker_only_placements.join(", ") || "none"}). ` +
    `live_engines ${live_engines} applies both adjustments. These are different labelled sets. Do not add them. ` +
    `Do not call any of them 41 live advisory engines.`;
  return {
    equate: false,
    canonical: "softwares_tab_placements",
    do_not_add: true,
    summary,
    softwares_tab_placements,
    softwares_tab_placements_label:
      "Softwares product count. The lock. Isolation software_count plus Softwares-tab placements. Not GET /v1/health count.",
    isolation_software_count,
    isolation_software_count_label:
      "MASTER-33 isolation domains. domains_are_doors is false. A third set. Not the Softwares product count.",
    tab_placement_count: tab_placement_slugs.length,
    tab_placement_slugs,
    tab_placement_label:
      "Softwares-tab cards that are not in the 33 isolation domains. Includes Whitestone. Not a hub or runtime slot.",
    live_count,
    live_count_label:
      "Softwares-tab cards with status live. Tab placements minus local_only VeilLock. This number is not GET /v1/health count.",
    local_only_slugs,
    in_process_catalog_products,
    in_process_catalog_products_label:
      "GET /v1/health count. In-process catalog products (PRODUCTS). Includes VeilLock. Excludes worker-only Whitestone. Not the Softwares product count.",
    health_count: in_process_catalog_products,
    health_count_label: "in_process_catalog_products",
    health_count_is_softwares_count: false,
    health_count_is_live_count: false,
    live_engines,
    live_engines_label:
      "In-process FragGate engines with a public door. Health count minus VeilLock, and live_count minus Whitestone.",
    worker_only_placements,
    named_stubs,
    named_stubs_label: "Named FragGate stubs on the tab. Empty on this build. Not counted in live_count.",
  };
}

export function softwareCountNote(products) {
  return `${softwareCountFacts(products).summary} ${CATALOG_COUNT_NOTE}`;
}

export function softwareCountSentence(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const tab = list.length;
  const localOnly = list.filter((c) => c && c.status === "local_only").map((c) => c.slug);
  const workerOnly = list.filter((c) => c && c.worker_only).map((c) => c.slug);
  const live = list.filter((c) => c && c.status === "live").length;
  const liveEngines = list.filter((c) => c && c.status === "live" && !c.worker_only).length;
  const inProcess = list.filter((c) => c && !c.worker_only && c.status !== "stub").length;
  return (
    `Softwares count on this build is ${tab} (softwares_tab_placements, the product lock). ` +
    `live_count is ${live} (status live; local_only ${localOnly.join(", ") || "none"}). ` +
    `GET /v1/health count is ${inProcess} (in-process catalog products; includes local_only; excludes worker-only ${workerOnly.join(", ") || "none"}). ` +
    `live_engines is ${liveEngines}. These are different labelled sets. Do not add them.`
  );
}
