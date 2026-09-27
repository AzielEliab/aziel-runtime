/**
 * Reviewed production copies for the interface gallery.
 *
 * A copy is stored only when an executed production carried real image bytes
 * (png_b64 / jpeg_b64 and the same family) and those bytes sniffed as an image.
 * dry_run does not mint a reviewed copy. Cited URLs stay unreviewed and are
 * not gallery rows. Nothing here is a Softwares card.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { imageFromProduction } from "./display.js";

export const REVIEWED_COPIES_SPEC = "REVIEWED-COPIES-1.0";

const SESSION_CAP = 24;
const sessions = new Map();

export function resetReviewedCopies() {
  sessions.clear();
}

function sessionKey(value) {
  const raw = String(value || "interface").trim();
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(raw)) return "interface";
  return raw;
}

function listOf(key) {
  if (!sessions.has(key)) sessions.set(key, []);
  return sessions.get(key);
}

export function listReviewedCopies(sessionId) {
  const key = sessionKey(sessionId);
  return listOf(key).map((row) => ({ ...row }));
}

/**
 * Remember one reviewed image from an executed production.
 * Returns the session gallery after the attempt (unchanged when nothing qualified).
 */
export function rememberReviewed({ sessionId, production, slug, op, dryRun } = {}) {
  const key = sessionKey(sessionId);
  const rows = listOf(key);
  if (dryRun === true) return rows.map((row) => ({ ...row }));
  const image = imageFromProduction(production, { dryRun: false });
  if (!image || image.reviewed !== true || typeof image.data !== "string" || !image.data) {
    return rows.map((row) => ({ ...row }));
  }
  rows.push({
    id: `copy-${rows.length + 1}`,
    session_id: key,
    slug: slug ? String(slug).slice(0, 64) : null,
    op: op ? String(op).slice(0, 80) : null,
    mimeType: image.mimeType || "image/png",
    data: image.data,
    source: image.source || null,
    reviewed: true,
    invented: false,
  });
  if (rows.length > SESSION_CAP) rows.splice(0, rows.length - SESSION_CAP);
  return rows.map((row) => ({ ...row }));
}
