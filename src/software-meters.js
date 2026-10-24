/**
 * SOFTWARES-METER-1.0
 *
 * A Softwares meter is a Vibelock {slug}-download-tracker Worker that already
 * exists. Catalog/meta keys are not meters. In-runtime engines with no Worker
 * stay products and are labelled "no front-door meter". Their usage alias is
 * runtime by_op. This module does not create a Worker and does not invent a
 * download count.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const SOFTWARES_METER_SPEC = "SOFTWARES-METER-1.0";
export const SOFTWARES_METER_RULE = "Softwares meters stay on Vibelock download-trackers only.";

/** FragGate engines hosted in this runtime. No download-tracker Worker. */
export const NO_FRONT_DOOR_METER_SLUGS = Object.freeze(["azvpn", "mmconsensus", "toolbench", "zkattest"]);

/**
 * The nine keys a probe treated as Softwares meters. Five are not products.
 * Four are products and are listed under no_front_door_meter instead.
 */
export const DROPPED_METER_KEYS = Object.freeze([
  {
    key: "donation",
    reason: "Packed donationStatic on GET /v1/software. Link-only. Not a Softwares-tab product. No Vibelock download-tracker.",
  },
  {
    key: "memory",
    reason: "FragGate fabric. On the allowlist, not on the Softwares tab. No Vibelock download-tracker.",
  },
  {
    key: "semantic_bridge",
    reason: "Cite field on /cite.json and /v1/catalog.json. Cap-7 name plane, not a product. No Vibelock download-tracker.",
  },
  {
    key: "social_status",
    reason: "AZindex awareness field. Not a Softwares-tab product. No Vibelock download-tracker.",
  },
  {
    key: "stats",
    reason: "Awareness and rollup field. Not a Softwares-tab product. No Vibelock download-tracker.",
  },
]);

export const SKIPPED_NOT_METER_PRODUCTS = Object.freeze([
  { key: "aziel-runtime", reason: "Host runtime. Not a Softwares-tab card." },
  { key: "mesh", reason: "FragGate fabric. Not a Softwares-tab card." },
  { key: "trades-runtime", reason: "Cite-only sister. Not a Softwares-tab card." },
  { key: "azcorpus", reason: "Website design on the library hub. Not a Softwares card." },
  { key: "azlibrary", reason: "Website design on the library hub. Not a Softwares card." },
]);

export function isDownloadTrackerWorker(worker) {
  return typeof worker === "string" && worker.endsWith("-download-tracker");
}

export function meterFieldsFor(product) {
  const slug = product && product.slug ? String(product.slug) : "";
  const worker = product && product.worker;
  if (slug && isDownloadTrackerWorker(worker) && !NO_FRONT_DOOR_METER_SLUGS.includes(slug)) {
    return {
      front_door_meter: true,
      meter_label: "vibelock download-tracker",
      meter_stats: `https://${worker}.vibelock.workers.dev/stats`,
    };
  }
  return {
    front_door_meter: false,
    meter_label: "no front-door meter",
    meter_stats: null,
    usage_alias: slug ? `by_op fraggate.call.${slug} on GET /v1/uses` : null,
    meter_note: "In-runtime FragGate engine. No download-tracker Worker. Download counts are not invented.",
  };
}

export function softwareMeterRoster(products, workerOnly = []) {
  const rows = []
    .concat(Array.isArray(products) ? products : [])
    .concat(Array.isArray(workerOnly) ? workerOnly : []);
  const meters = [];
  const no_front_door_meter = [];
  for (const row of rows) {
    if (!row || !row.slug) continue;
    const fields = meterFieldsFor(row);
    if (fields.front_door_meter === true) {
      meters.push({ slug: row.slug, worker: row.worker, ...fields });
    } else {
      no_front_door_meter.push({ slug: row.slug, worker: null, ...fields });
    }
  }
  return {
    spec: SOFTWARES_METER_SPEC,
    rule: SOFTWARES_METER_RULE,
    count: meters.length,
    count_label: "Front-door meters. Existing Vibelock download-tracker Workers only. Not the Softwares product count (42) and not live_engines (40).",
    product_stats_template: "https://{slug}-download-tracker.vibelock.workers.dev/stats",
    product_stats_template_is_probe_license: false,
    meters,
    no_front_door_meter,
    dropped: DROPPED_METER_KEYS.map((row) => ({ ...row })),
    dropped_count: DROPPED_METER_KEYS.length,
    skipped_not_products: SKIPPED_NOT_METER_PRODUCTS.map((row) => ({ ...row })),
    probed_mix_note:
      "A probe that added the nine 404 keys onto live_engines (40) counted 49. Those nine are not extra meters. donation, memory, semantic_bridge, social_status, and stats are dropped. azvpn, mmconsensus, toolbench, and zkattest stay Softwares products under no_front_door_meter and are not in count. count is only real Vibelock download-trackers. No Worker was created.",
  };
}
