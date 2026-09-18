/**
 * Dual-surface human hrefs (homepage + Softwares HTML + workspace).
 * Labeled #task-* panes exist only for HUMAN_TASKS slugs.
 * Other Softwares open /p/{slug} (FragGate button rack), not a dead hash.
 * Author: Aziel Eliab only.
 */

export const LABELED_HUMAN_TASK_SLUGS = Object.freeze([
  "decisiongate",
  "foldlock",
  "azbrowser",
  "aznet",
  "azvpn",
  "forgereceipts",
  "godlock",
  "temporallock",
]);

export function hasLabeledTask(slug) {
  return LABELED_HUMAN_TASK_SLUGS.includes(String(slug || ""));
}

export function useInBrowserHref(origin, slug) {
  const base = String(origin || "").replace(/\/$/, "");
  const s = String(slug || "").trim();
  if (!s) return `${base}/workspace`;
  if (hasLabeledTask(s)) return `${base}/workspace#task-${s}`;
  return `${base}/p/${s}`;
}

export function suiteDownloadHref(origin) {
  return `${String(origin || "").replace(/\/$/, "")}/download`;
}
