/**
 * RE-EXPAND-FROM-ARCHIVE — bytes survive, not summaries.
 *
 * Re-expand restores from archive after prev-hash verify.
 * It is not mesh-from-index. Crawlers are extra shelves only.
 * Training residue is rumor. Die-with-pull, split-the-wires, and
 * cold-copy survival stay locked.
 *
 * Companion: COLD-COPY-1.0, SPLIT-WIRES-1.0, LS-WP-0.1, NODE-OPS-1.0
 * Author: Aziel Eliab only.
 */

import { isSha256Hex } from "./split-wires.js";

export const RE_EXPAND = "RE-EXPAND-1.0";
export const RE_EXPAND_AUTHOR = "Aziel Eliab";
export const RE_EXPAND_SHORT =
  "Bytes survive, not summaries. Re-expand restores from archive after prev-hash verify. Not mesh from index. Crawlers are extra shelves only. Training residue is rumor.";

export const RE_EXPAND_LAW = Object.freeze({
  spec: RE_EXPAND,
  author: RE_EXPAND_AUTHOR,
  identity: "Aziel Eliab",
  bytes_survive: true,
  summaries_survive: false,
  re_expand: "restore from archive after prev-hash verify",
  mesh_from_index: false,
  crawlers: "extra shelves only — not the archive",
  training_residue: "rumor — not a restore source",
  short: RE_EXPAND_SHORT,
  die_with_pull: true,
  split_wires: true,
  cold_copy: true,
});

function hasArchiveBytes(input) {
  if (input.archive_bytes === true) return true;
  if (typeof input.archive_bytes === "string" && input.archive_bytes.length > 0) return true;
  if (typeof Uint8Array !== "undefined" && input.archive_bytes instanceof Uint8Array && input.archive_bytes.length > 0) {
    return true;
  }
  return false;
}

/** Re-expand = restore from archive after prev-hash verify. */
export function reExpandFromArchive(input = {}) {
  const breaks = [];
  if (input.from_index === true || input.mesh_from_index === true) {
    breaks.push({ reason: "not-mesh-from-index" });
  }
  if (input.summary === true && !hasArchiveBytes(input)) {
    breaks.push({ reason: "summary-not-bytes" });
  }
  if (input.crawler === true && input.as_archive === true) {
    breaks.push({ reason: "crawler-shelf-only" });
  }
  if (input.training_residue === true || input.training === true) {
    breaks.push({ reason: "training-residue-is-rumor" });
  }
  const held = normalizeHash(input.held_prev || input.prev);
  const cited = normalizeHash(input.cited_prev);
  if (!held || !cited || held !== cited) {
    breaks.push({ reason: "prev-hash-verify-miss" });
  }
  if (input.verified !== true) {
    breaks.push({ reason: "verify-fail-closed" });
  }
  if (!hasArchiveBytes(input)) {
    breaks.push({ reason: "archive-bytes-required" });
  }
  return {
    ok: breaks.length === 0,
    spec: RE_EXPAND,
    restore: breaks.length === 0,
    bytes_survive: true,
    summaries_survive: false,
    mesh_from_index: false,
    breaks,
  };
}

export function meshFromIndex() {
  return {
    ok: false,
    spec: RE_EXPAND,
    mesh_from_index: false,
    reason: "not-mesh-from-index",
  };
}

export function crawlerShelf(input = {}) {
  return {
    spec: RE_EXPAND,
    extra_shelf: true,
    archive: false,
    restore: false,
    crawler: input.crawler !== false,
    reason: "crawler-shelf-only",
  };
}

export function trainingResidue(input = {}) {
  return {
    spec: RE_EXPAND,
    rumor: true,
    truth: false,
    restore: false,
    residue: input.residue != null ? String(input.residue) : "training",
    reason: "training-residue-is-rumor",
  };
}

function normalizeHash(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return isSha256Hex(s) ? s : "";
}
