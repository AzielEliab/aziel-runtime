/**
 * AZInterface engine (AIH-WP-1.0).
 * Custodial operating environment. Pre-locked page cycles:
 * OFF → integrity → ON → FULL SHUTDOWN → MEMORIAL.
 * Cycles are sealed at genesis. No skip. No invented cycle. No auto-unlock.
 * Separate product from AZHub. FragGate LIVE only.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "azinterface";
export const NAME = "AZInterface";
export const VERSION = "0.1.0";
export const SPEC = "AIH-WP-1.0";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Custodial operating environment. Page cycles are pre-locked.";
export const ROLE = "custodial operating environment";
export const WITNESS_CAP = 64;
export const LABEL_CAP = 160;
export const ID_CAP = 80;

/** Pre-locked page cycles per AIH-WP-1.0. Order is sealed. Do not invent or skip. */
export const PAGE_CYCLES = Object.freeze(["OFF", "integrity", "ON", "FULL SHUTDOWN", "MEMORIAL"]);

export const LIMITATION =
  "THIS IS: AZInterface AIH-WP-1.0 — a custodial operating environment. Genesis seals five pre-locked page cycles (OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL). FragGate LIVE only. THIS IS NOT: AZHub; a combined hub+interface engine; an auto-unlock; a completeness detector; ranking; remote scorch; a kernel; AZ-OS / Lumen. Cycles cannot be invented, reordered, or skipped. Author: Aziel Eliab only.";

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
  "skip_cycle",
  "invent_cycle",
]);

const FORBIDDEN_TEXT =
  /\b(auto[-_ ]?unlock|completeness([-_ ]detect|[-_ ]?event)?|rank(ing)?|scorch([-_ ]remote)?|skip[-_ ]cycle|invent[-_ ]cycle)\b/i;

const memory = {
  genesis_sealed: true,
  cycle_index: 0,
  integrity_ok: false,
  witnesses: [],
  seq: 0,
};

export function resetAzinterfaceStore() {
  memory.genesis_sealed = true;
  memory.cycle_index = 0;
  memory.integrity_ok = false;
  memory.witnesses = [];
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
    if (key === "skip_cycle" || key === "invent_cycle") {
      return { kind: "cycle_skip", key, code: "AIH-CYCLE-LOCKED" };
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
    if (text.includes("skip") || text.includes("invent")) return { kind: "cycle_skip", key: "text", code: "AIH-CYCLE-LOCKED" };
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
    pre_locked: true,
    auto_unlock: false,
    completeness: false,
    ranking: false,
    code: hit.code,
    refused: true,
    event: hit.kind,
    cycles: PAGE_CYCLES.slice(),
    current: PAGE_CYCLES[memory.cycle_index],
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
    pre_locked: true,
    auto_unlock: false,
    completeness: false,
    ranking: false,
    separate_from: "azhub",
    cycles: PAGE_CYCLES.slice(),
    current: PAGE_CYCLES[memory.cycle_index],
    cycle_index: memory.cycle_index,
    limitation: LIMITATION,
    author: AUTHOR,
    ...extra,
  };
}

export function normalizeCycle(raw) {
  const text = String(raw == null ? "" : raw).trim();
  if (!text) return null;
  const exact = PAGE_CYCLES.find((c) => c === text);
  if (exact) return exact;
  const folded = text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (folded === "off") return "OFF";
  if (folded === "integrity") return "integrity";
  if (folded === "on") return "ON";
  if (folded === "full shutdown" || folded === "fullshutdown" || folded === "shutdown") return "FULL SHUTDOWN";
  if (folded === "memorial") return "MEMORIAL";
  return null;
}

export function cycleIndex(name) {
  return PAGE_CYCLES.indexOf(name);
}

function cycleView() {
  return {
    pre_locked: true,
    locked_order: true,
    skip_forbidden: true,
    invent_forbidden: true,
    auto_unlock: false,
    cycles: PAGE_CYCLES.slice(),
    current: PAGE_CYCLES[memory.cycle_index],
    index: memory.cycle_index,
    next: memory.cycle_index < PAGE_CYCLES.length - 1 ? PAGE_CYCLES[memory.cycle_index + 1] : null,
    terminal: PAGE_CYCLES[memory.cycle_index] === "MEMORIAL",
  };
}

export function azinterfaceHealth() {
  return baseResult({
    op: "health",
    status: "ok",
    role: ROLE,
    motto: MOTTO,
    live: true,
    genesis_sealed: memory.genesis_sealed,
    page_cycle: cycleView(),
  });
}

export function azinterfaceSkill() {
  return baseResult({
    op: "skill",
    skill: `# AZInterface (AIH-WP-1.0)

Custodial operating environment. Page cycles are **pre-locked** at genesis:

\`OFF → integrity → ON → FULL SHUTDOWN → MEMORIAL\`

- MCP: \`fraggate_call\` with \`{ slug: "azinterface", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same envelope
- Leftover flat names such as \`azinterface_page_cycle_status\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

LIVE_OPS: health, skill, genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status.

Stubs (refuse): scorch_remote, auto_unlock, ranking, completeness_detect.

AZHub is a **separate** product/engine (Blank Key / spatial container). Do not combine them.

Author: Aziel Eliab only.
`,
  });
}

export function genesisStatus(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "genesis_status" });
  return baseResult({
    op: "genesis_status",
    genesis_sealed: memory.genesis_sealed,
    cycles_sealed: true,
    page_cycle: cycleView(),
    note: "Genesis sealed the five AIH-WP-1.0 page cycles. They cannot be invented or reordered.",
  });
}

export function siteStateGet(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "site_state_get" });
  return baseResult({
    op: "site_state_get",
    genesis_sealed: memory.genesis_sealed,
    integrity_ok: memory.integrity_ok,
    page_cycle: cycleView(),
    state: {
      cycle: PAGE_CYCLES[memory.cycle_index],
      integrity_ok: memory.integrity_ok,
      witnesses: memory.witnesses.length,
    },
  });
}

export function siteStateSet(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "site_state_set" });
  const src = srcOf(payload);
  const requested = normalizeCycle(src.cycle != null ? src.cycle : src.state != null ? src.state : src.page_cycle);
  if (!requested) {
    return {
      ...baseResult({ op: "site_state_set" }),
      ok: false,
      code: "AIH-CYCLE-UNKNOWN",
      refused: true,
      note: "Only the five pre-locked cycles are accepted: OFF, integrity, ON, FULL SHUTDOWN, MEMORIAL.",
    };
  }
  const target = cycleIndex(requested);
  const current = memory.cycle_index;
  if (target === current) {
    return baseResult({
      op: "site_state_set",
      unchanged: true,
      page_cycle: cycleView(),
    });
  }
  if (PAGE_CYCLES[current] === "MEMORIAL") {
    return {
      ...baseResult({ op: "site_state_set" }),
      ok: false,
      code: "AIH-CYCLE-TERMINAL",
      refused: true,
      page_cycle: cycleView(),
      note: "MEMORIAL is terminal. Page cycles stay pre-locked.",
    };
  }
  if (target !== current + 1) {
    return {
      ...baseResult({ op: "site_state_set" }),
      ok: false,
      code: "AIH-CYCLE-LOCKED",
      refused: true,
      requested,
      page_cycle: cycleView(),
      note: "Pre-locked cycles advance one step only. Auto-unlock / skip / invent stay refused.",
    };
  }
  if (requested === "ON" && !memory.integrity_ok) {
    return {
      ...baseResult({ op: "site_state_set" }),
      ok: false,
      code: "AIH-INTEGRITY-REQUIRED",
      refused: true,
      page_cycle: cycleView(),
      note: "ON requires a passing integrity_check. Auto-unlock is refused.",
    };
  }
  memory.cycle_index = target;
  memory.seq += 1;
  return baseResult({
    op: "site_state_set",
    advanced: true,
    page_cycle: cycleView(),
  });
}

export function integrityCheck(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "integrity_check" });
  const src = srcOf(payload);
  const witnessId = clip(src.witness != null ? src.witness : src.witness_id != null ? src.witness_id : src.id, ID_CAP);
  const label = clip(src.label != null ? src.label : src.note, LABEL_CAP);
  memory.integrity_ok = true;
  if (witnessId && memory.witnesses.length < WITNESS_CAP && !memory.witnesses.some((w) => w.id === witnessId)) {
    memory.witnesses.push({
      id: witnessId,
      label: label || witnessId,
      at: nowIso(),
      cycle: PAGE_CYCLES[memory.cycle_index],
    });
  }
  if (PAGE_CYCLES[memory.cycle_index] === "OFF") {
    memory.cycle_index = cycleIndex("integrity");
  }
  memory.seq += 1;
  return baseResult({
    op: "integrity_check",
    integrity_ok: true,
    page_cycle: cycleView(),
    witnesses: memory.witnesses.length,
    note: "Integrity recorded. Does not auto-unlock to ON.",
  });
}

export function witnessList(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "witness_list" });
  return baseResult({
    op: "witness_list",
    count: memory.witnesses.length,
    witnesses: memory.witnesses.map((w) => ({ ...w })),
    ranking: false,
    note: "Custodial witnesses only. Not a ranking.",
  });
}

export function pageCycleStatus(payload) {
  const hit = detectForbiddenEvent(payload);
  if (hit) return refuseForbidden(hit, { op: "page_cycle_status" });
  const view = cycleView();
  return baseResult({
    op: "page_cycle_status",
    spec: SPEC,
    page_cycle: view,
    cycles: view.cycles,
    current: view.current,
    OFF: view.current === "OFF",
    integrity: view.current === "integrity",
    ON: view.current === "ON",
    "FULL SHUTDOWN": view.current === "FULL SHUTDOWN",
    MEMORIAL: view.current === "MEMORIAL",
    pre_locked: true,
    note: "AIH-WP-1.0 pre-locked page cycles: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL.",
  });
}
