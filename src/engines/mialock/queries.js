/**
 * M.I.A.Lock query-plan renderer (portable Worker core).
 * Search plans only. Doe leads ≠ ID. Author: Aziel Eliab.
 */
import SEARCH_MODES from "./search-modes.js";

export const PRODUCT = "mialock";
export const VERSION = "0.1.1";
export const AUTHOR = "Aziel Eliab";
export const LIMITATION =
  "Search plans only. Archive publication dates are not event dates. Doe hits are compatibility leads — never confirmed identity. Doe leads ≠ ID. Coverage heat ≠ presence. No live tracking. Live Leaflet map is local CLI.";

export function listModes() {
  return Object.values(SEARCH_MODES).map((mode) => ({
    mode_id: mode.mode_id,
    title: mode.title,
    summary: mode.summary,
    cold_case: mode.cold_case,
    doe_match: mode.doe_match,
    archive: mode.archive,
    event_classes: mode.event_classes,
    adapter_families: mode.adapter_families,
    query_family_count: (mode.query_families || []).length,
  }));
}

export function renderQueries(modeId, tokens) {
  const mode = SEARCH_MODES[modeId];
  if (!mode) return { error: "unknown mode", status: 400, modes: listModes(), limitation: LIMITATION };
  const src = tokens && typeof tokens === "object" ? tokens : {};
  const defaults = {
    name: src.name || "{name}",
    aliases: src.aliases || "{aliases}",
    jurisdiction: src.jurisdiction || "{jurisdiction}",
    jurisdiction_or_region: src.jurisdiction_or_region || src.jurisdiction || "{jurisdiction_or_region}",
    year_from: src.year_from || "{year_from}",
    year_to: src.year_to || "{year_to}",
    decade: src.decade || (String(src.year_from || "").length >= 4 ? `${String(src.year_from).slice(0, 3)}0s` : "{decade}"),
    age_band: src.age_band || "{age_band}",
    sex: src.sex || "{sex}",
    date_window: src.date_window || "{date_window}",
    distinguishing_marks: src.distinguishing_marks || "{distinguishing_marks}",
    estimated_year_of_death: src.estimated_year_of_death || "{estimated_year_of_death}",
    hair: src.hair || "{hair}",
    height_band: src.height_band || "{height_band}",
    last_seen_year: src.last_seen_year || "{last_seen_year}",
  };
  const pairs = Object.entries(defaults).map(([k, v]) => [`{${k}}`, v]);
  const sub = (text) => {
    let out = String(text || "");
    for (const [key, val] of pairs) out = out.split(key).join(val);
    return out;
  };
  const families = (mode.query_families || []).map((qf) => ({
    family_id: qf.family_id,
    title: qf.title,
    event_classes: qf.event_classes,
    template: qf.template,
    rendered: sub(qf.template),
    notes: qf.notes || "",
  }));
  return {
    mode_id: mode.mode_id,
    title: mode.title,
    summary: mode.summary,
    cold_case: mode.cold_case,
    doe_match: mode.doe_match,
    archive: mode.archive,
    event_classes: mode.event_classes,
    queries: families,
    boundary: LIMITATION,
    product: PRODUCT,
    version: VERSION,
    author: AUTHOR,
    true_engine_runtime: true,
  };
}
