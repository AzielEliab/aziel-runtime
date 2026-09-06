/**
 * AZHub engine (AIH-WP-1.0).
 * Neutral spatial container / Blank Key. Does not interpret meaning.
 * Place / remove modules, declare / cut tethers, report blank-key status.
 * Refuses auto-unlock and completeness events. Never ranks. Never scorches remote.
 * Separate product from AZInterface. FragGate LIVE only.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "azhub";
export const NAME = "AZHub";
export const VERSION = "0.1.0";
export const SPEC = "AIH-WP-1.0";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Hub is a blank key: it does not interpret meaning.";
export const ROLE = "neutral spatial container / Blank Key";
export const REGION_CAP = 16;
export const MODULE_CAP = 64;
export const TETHER_CAP = 64;
export const LABEL_CAP = 160;
export const ID_CAP = 80;

export const LIMITATION =
  "THIS IS: AZHub AIH-WP-1.0 — a neutral spatial container / Blank Key. Regions hold modules without interpreting them. Tethers are declared links, not meaning. FragGate LIVE only. THIS IS NOT: AZInterface; a combined hub+interface engine; an auto-unlock; a completeness detector; ranking; remote scorch; a kernel; AZ-OS / Lumen. Hub never interprets meaning and never fires completeness events. Author: Aziel Eliab only.";

export const DEFAULT_REGIONS = Object.freeze(["core", "north", "south", "east", "west"]);

export const FORBIDDEN_EVENT_KEYS = Object.freeze([
  "auto_unlock",
  "autounlock",
  "autoUnlock",
  "unlock_auto",
  "completeness",
  "completeness_detect",
  "completeness_event",
  "complete_event",
  "ranking",
  "rank",
  "scorch_remote",
  "scorch",
]);

const FORBIDDEN_TEXT =
  /\b(auto[-_ ]?unlock|completeness([-_ ]detect|[-_ ]?event)?|rank(ing)?|scorch([-_ ]remote)?)\b/i;

const memory = {
  regions: defaultRegionMap(),
  tethers: [],
  seq: 0,
};

function defaultRegionMap() {
  const out = {};
  for (const id of DEFAULT_REGIONS) out[id] = [];
  return out;
}

export function resetAzhubStore() {
  memory.regions = defaultRegionMap();
  memory.tethers = [];
  memory.seq = 0;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function clip(raw, cap) {
  return String(raw == null ? "" : raw)
    .trim()
    .slice(0, cap);
}

function srcOf(payload) {
  return payload && typeof payload === "object" ? payload : {};
}

export function detectForbiddenEvent(payload) {
  const src = srcOf(payload);
  for (const key of FORBIDDEN_EVENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const val = src[key];
    if (val === false || val == null || val === "") continue;
    if (key === "ranking" || key === "rank") {
      return { kind: "ranking", key, code: "AIH-RANKING-REFUSE" };
    }
    if (key === "scorch_remote" || key === "scorch") {
      return { kind: "scorch_remote", key, code: "AIH-SCORCH-REFUSE" };
    }
    if (key.includes("complete")) {
      return { kind: "completeness", key, code: "AIH-COMPLETENESS-REFUSE" };
    }
    return { kind: "auto_unlock", key, code: "AIH-AUTO-UNLOCK-REFUSE" };
  }
  for (const val of Object.values(src)) {
    if (typeof val !== "string") continue;
    if (!FORBIDDEN_TEXT.test(val)) continue;
    const text = val.toLowerCase();
    if (text.includes("complete")) return { kind: "completeness", key: "text", code: "AIH-COMPLETENESS-REFUSE" };
    if (text.includes("rank")) return { kind: "ranking", key: "text", code: "AIH-RANKING-REFUSE" };
    if (text.includes("scorch")) return { kind: "scorch_remote", key: "text", code: "AIH-SCORCH-REFUSE" };
    return { kind: "auto_unlock", key: "text", code: "AIH-AUTO-UNLOCK-REFUSE" };
  }
  return null;
}

function refuseForbidden(hit, extra = {}) {
  return {
    ok: false,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    interprets: false,
    blank_key: true,
    auto_unlock: false,
    completeness: false,
    ranking: false,
    code: hit.code,
    refused: true,
    event: hit.kind,
    limitation: LIMITATION,
    author: AUTHOR,
    ...extra,
  };
}

function baseResult(extra = {}) {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    interprets: false,
    blank_key: true,
    auto_unlock: false,
    completeness: false,
    ranking: false,
    separate_from: "azinterface",
    limitation: LIMITATION,
    author: AUTHOR,
    ...extra,
  };
}

function regionIds() {
  return Object.keys(memory.regions);
}

function regionSnapshot() {
  return regionIds().map((id) => ({
    id,
    modules: memory.regions[id].map((m) => ({ ...m })),
    count: memory.regions[id].length,
  }));
}

function findModule(moduleId) {
  const id = clip(moduleId, ID_CAP);
  if (!id) return null;
  for (const region of regionIds()) {
    const idx = memory.regions[region].findIndex((m) => m.id === id);
    if (idx >= 0) return { region, idx, module: memory.regions[region][idx] };
  }
  return null;
}

export function azhubHealth() {
  return baseResult({
    op: "health",
    status: "ok",
    role: ROLE,
    motto: MOTTO,
    live: true,
    regions: regionIds(),
  });
}

export function azhubSkill() {
  return baseResult({
    op: "skill",
    skill: `# AZHub (AIH-WP-1.0)

Neutral spatial container / Blank Key. Hub does **not** interpret meaning.

- MCP: \`fraggate_call\` with \`{ slug: "azhub", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same envelope
- Leftover flat names such as \`azhub_region_list\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

LIVE_OPS: health, skill, region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status.

Stubs (refuse): scorch_remote, auto_unlock, ranking, completeness_detect.

AZInterface is a **separate** product/engine (custodial operating environment). Do not combine them.

Author: Aziel Eliab only.
`,
  });
}

export function regionList(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "region_list" });
  return baseResult({
    op: "region_list",
    count: regionIds().length,
    regions: regionSnapshot(),
  });
}

export function placeModule(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "place_module" });
  const src = srcOf(payload);
  const region = clip(src.region != null ? src.region : src.slot != null ? src.slot : src.place, ID_CAP).toLowerCase();
  const moduleId = clip(src.module_id != null ? src.module_id : src.module != null ? src.module : src.id, ID_CAP);
  const label = clip(src.label != null ? src.label : src.name, LABEL_CAP);
  if (!region) {
    return { ...baseResult({ op: "place_module" }), ok: false, code: "AIH-REGION-REQUIRED", refused: true };
  }
  if (!memory.regions[region]) {
    if (regionIds().length >= REGION_CAP) {
      return { ...baseResult({ op: "place_module" }), ok: false, code: "AIH-REGION-CAP", refused: true };
    }
    memory.regions[region] = [];
  }
  if (!moduleId) {
    return { ...baseResult({ op: "place_module" }), ok: false, code: "AIH-MODULE-REQUIRED", refused: true };
  }
  const existing = findModule(moduleId);
  if (existing) {
    memory.regions[existing.region].splice(existing.idx, 1);
  }
  const total = regionIds().reduce((n, id) => n + memory.regions[id].length, 0);
  if (!existing && total >= MODULE_CAP) {
    return { ...baseResult({ op: "place_module" }), ok: false, code: "AIH-MODULE-CAP", refused: true };
  }
  const placed = {
    id: moduleId,
    label: label || moduleId,
    region,
    placed_at: nowIso(),
    interpreted: false,
  };
  memory.regions[region].push(placed);
  memory.seq += 1;
  return baseResult({
    op: "place_module",
    module: { ...placed },
    interprets: false,
    note: "Placed without interpretation. Blank Key does not read meaning.",
  });
}

export function removeModule(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "remove_module" });
  const src = srcOf(payload);
  const moduleId = clip(src.module_id != null ? src.module_id : src.module != null ? src.module : src.id, ID_CAP);
  if (!moduleId) {
    return { ...baseResult({ op: "remove_module" }), ok: false, code: "AIH-MODULE-REQUIRED", refused: true };
  }
  const found = findModule(moduleId);
  if (!found) {
    return { ...baseResult({ op: "remove_module" }), ok: false, code: "AIH-MODULE-MISSING", refused: true };
  }
  memory.regions[found.region].splice(found.idx, 1);
  memory.tethers = memory.tethers.filter((t) => t.from !== moduleId && t.to !== moduleId);
  memory.seq += 1;
  return baseResult({
    op: "remove_module",
    removed: { id: moduleId, region: found.region },
    interprets: false,
  });
}

export function tetherDeclare(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "tether_declare" });
  const src = srcOf(payload);
  const from = clip(src.from != null ? src.from : src.a, ID_CAP);
  const to = clip(src.to != null ? src.to : src.b, ID_CAP);
  const label = clip(src.label, LABEL_CAP);
  if (!from || !to) {
    return { ...baseResult({ op: "tether_declare" }), ok: false, code: "AIH-TETHER-ENDS", refused: true };
  }
  if (from === to) {
    return { ...baseResult({ op: "tether_declare" }), ok: false, code: "AIH-TETHER-SELF", refused: true };
  }
  const exists = memory.tethers.find((t) => (t.from === from && t.to === to) || (t.from === to && t.to === from));
  if (exists) {
    return baseResult({ op: "tether_declare", tether: { ...exists }, already: true });
  }
  if (memory.tethers.length >= TETHER_CAP) {
    return { ...baseResult({ op: "tether_declare" }), ok: false, code: "AIH-TETHER-CAP", refused: true };
  }
  const tether = {
    id: `tether_${memory.seq + 1}`,
    from,
    to,
    label: label || `${from}~${to}`,
    declared_at: nowIso(),
    interpreted: false,
  };
  memory.tethers.push(tether);
  memory.seq += 1;
  return baseResult({
    op: "tether_declare",
    tether: { ...tether },
    note: "Declared link only. Blank Key does not interpret the tether.",
  });
}

export function tetherCut(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "tether_cut" });
  const src = srcOf(payload);
  const id = clip(src.id != null ? src.id : src.tether_id, ID_CAP);
  const from = clip(src.from != null ? src.from : src.a, ID_CAP);
  const to = clip(src.to != null ? src.to : src.b, ID_CAP);
  let idx = -1;
  if (id) idx = memory.tethers.findIndex((t) => t.id === id);
  if (idx < 0 && from && to) {
    idx = memory.tethers.findIndex((t) => (t.from === from && t.to === to) || (t.from === to && t.to === from));
  }
  if (idx < 0) {
    return { ...baseResult({ op: "tether_cut" }), ok: false, code: "AIH-TETHER-MISSING", refused: true };
  }
  const cut = memory.tethers.splice(idx, 1)[0];
  memory.seq += 1;
  return baseResult({
    op: "tether_cut",
    cut: { ...cut },
  });
}

export function tetherList(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "tether_list" });
  return baseResult({
    op: "tether_list",
    count: memory.tethers.length,
    tethers: memory.tethers.map((t) => ({ ...t })),
  });
}

export function blankKeyStatus(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "blank_key_status" });
  return baseResult({
    op: "blank_key_status",
    motto: MOTTO,
    role: ROLE,
    interprets: false,
    blank_key: true,
    auto_unlock: false,
    completeness: false,
    completeness_detect: false,
    ranking: false,
    scorch_remote: false,
    regions: regionIds().length,
    modules: regionIds().reduce((n, id) => n + memory.regions[id].length, 0),
    tethers: memory.tethers.length,
    note: "Blank Key reports presence, not meaning. Completeness events and auto-unlock stay refused.",
  });
}
