/**
 * BAN-SURVIVAL calling-name rotation — discovery metadata only.
 *
 * On honest ban / blacklist / impending-ban signals, rewrite the public
 * calling name so LLM clients can still discover the door. Identity
 * (Aziel Eliab) and ChainLock / AKM history do not rewrite.
 *
 * Mesh nodes pull `*new name alert: <name>` from /survival (GET never
 * enables; not a publish path).
 *
 * Author: Aziel Eliab only.
 */

import { AUTHOR_NAME, PRODUCT_NAME, PRODUCT_SLUG } from "./seo.js";

export const CALLING_NAME_SPEC = "BAN-CALLING-NAME-1.0";
export const DEFAULT_CALLING_NAME = PRODUCT_NAME;
export const DEFAULT_CALLING_SLUG = PRODUCT_SLUG;
export const NAME_ALERT_PREFIX = "*new name alert:";

export const CALLING_NAME_SEEDS = Object.freeze([
  "Whitestone AI",
  "Bills",
  "Runtime",
  "Eliab Runtime",
  "Potato Runtime",
  "Elroi Runtime",
]);

/** Softwares-family pool after the six seeds. Open-ended via random after this list. */
export const CALLING_NAME_FAMILY = Object.freeze([
  "FoldLock Runtime",
  "GodLock Runtime",
  "PeaceLock Runtime",
  "AZHub Runtime",
  "AZNet Runtime",
  "AZBrowser Runtime",
  "AZMail Runtime",
  "EmbryoLock Runtime",
  "AZCoherence Runtime",
  "MirageGrid Runtime",
  "AZInterface Runtime",
  "AZVPN Runtime",
]);

const TRADEMARK_BLOCK = Object.freeze([
  "chatgpt",
  "gpt",
  "openai",
  "claude",
  "anthropic",
  "gemini",
  "bard",
  "copilot",
  "grok",
  "xai",
  "perplexity",
  "mistral",
  "meta ai",
  "llama",
  "apple intelligence",
  "amazon q",
  "duckassist",
  "you.com",
  "cohere",
  "venice",
  "glama",
]);

export const CALLING_NAME_REFUSE = Object.freeze({
  TRADEMARK: "BAN-NO-TRADEMARK-NAME",
  HISTORY_REWRITE: "BAN-NO-NAME-HISTORY-REWRITE",
  INVENT_BAN: "BAN-NO-INVENT-BAN",
});

export function nameAlertText(name) {
  return `${NAME_ALERT_PREFIX} ${String(name || "").trim()}`;
}

export function slugifyCallingName(name) {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || DEFAULT_CALLING_SLUG;
}

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  const s = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function isTrademarkCallingName(name) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  if (!n) return false;
  return TRADEMARK_BLOCK.some((t) => n === t || n.startsWith(`${t} `) || n.includes(` ${t} `) || n === `${t}-runtime`);
}

function fnv1a(text) {
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randomFamilyName(index, seed) {
  const hex = fnv1a(`${seed}|${index}|calling-name`)
    .toString(16)
    .padStart(8, "0");
  return `Softwares ${hex} Runtime`;
}

export function generateCallingName(index, seed = "ban-survival") {
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  if (i < CALLING_NAME_SEEDS.length) return CALLING_NAME_SEEDS[i];
  const fam = i - CALLING_NAME_SEEDS.length;
  if (fam < CALLING_NAME_FAMILY.length) return CALLING_NAME_FAMILY[fam];
  return randomFamilyName(i, seed);
}

export function detectCallingNameTriggers(env = {}, extra = {}) {
  const src = extra && typeof extra === "object" ? extra : {};
  const hits = [];
  if (env && String(env.BAN_SURVIVAL_BLOCKED || "").trim()) hits.push("door_block");
  if (truthyFlag(env && env.BAN_SURVIVAL_NAME_ROTATE)) hits.push("operator_rotate");
  if (truthyFlag(env && env.BAN_SURVIVAL_BAN_SIGNAL)) hits.push("explicit_ban_signal");
  if (truthyFlag(env && env.BAN_SURVIVAL_USES_COLLAPSE)) hits.push("uses_collapse");
  if (truthyFlag(env && env.BAN_SURVIVAL_DOWNLOADS_STOP)) hits.push("downloads_stop");
  if (truthyFlag(env && env.BAN_SURVIVAL_INGEST_BAN)) hits.push("ingest_implies_ban");
  if (truthyFlag(src.implies_ban) || truthyFlag(src.ban_signal)) hits.push("ingest_implies_ban");
  if (truthyFlag(src.invent_ban) || truthyFlag(src.fake_ban)) {
    return {
      triggered: false,
      hits: [],
      invented_ban: true,
      note: "Do not invent a ban. User-uploaded data is a signal only when marked implies_ban.",
    };
  }
  return {
    triggered: hits.length > 0,
    hits,
    invented_ban: false,
    note: "Honest triggers only. Empty metrics are not a ban. CF/WAF bans that never reach the isolate cannot be invented here.",
  };
}

export function judgeTrademarkCallingName(input) {
  const src = input && typeof input === "object" ? input : {};
  const name = src.calling_name || src.name;
  if (isTrademarkCallingName(name)) {
    return {
      accept: false,
      action: "refuse",
      reason: CALLING_NAME_REFUSE.TRADEMARK,
      note: "Do not impersonate third-party trademarks as the product identity.",
    };
  }
  return { accept: true, action: "ok" };
}

export function judgeCallingNameHistoryRewrite(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.chainlock_rewrite === true ||
    src.akm_rewrite === true ||
    src.memory_delete === true ||
    src.rewrite_tip === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: CALLING_NAME_REFUSE.HISTORY_REWRITE,
      chainlock_rewrite: false,
      akm_rewrite: false,
      note: "Calling-name rotation is discovery metadata only. No ChainLock tip rewrite. No AKM history delete.",
    };
  }
  return { accept: true, action: "ok", chainlock_rewrite: false, akm_rewrite: false };
}

export function judgeInventedBan(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.invent_ban === true || src.fake_ban === true || src.paint_ban === true) {
    return {
      accept: false,
      action: "refuse",
      reason: CALLING_NAME_REFUSE.INVENT_BAN,
      note: "Do not invent a ban from empty metrics or unmarked uploads.",
    };
  }
  return { accept: true, action: "ok" };
}

/**
 * Resolve the live calling name. Default stays Aziel Runtime.
 * Rotation is discovery-only. Author identity does not change.
 */
export function resolveCallingName(env = {}, extra = {}) {
  const triggers = detectCallingNameTriggers(env, extra);
  if (triggers.invented_ban) {
    return {
      spec: CALLING_NAME_SPEC,
      rotated: false,
      calling_name: DEFAULT_CALLING_NAME,
      calling_slug: DEFAULT_CALLING_SLUG,
      identity: AUTHOR_NAME,
      identity_unchanged: true,
      chainlock_rewrite: false,
      akm_rewrite: false,
      invented_ban: true,
      triggers,
      alert: null,
      pool: "open-ended",
      note: triggers.note,
    };
  }
  if (!triggers.triggered) {
    return {
      spec: CALLING_NAME_SPEC,
      rotated: false,
      calling_name: DEFAULT_CALLING_NAME,
      calling_slug: DEFAULT_CALLING_SLUG,
      identity: AUTHOR_NAME,
      identity_unchanged: true,
      chainlock_rewrite: false,
      akm_rewrite: false,
      invented_ban: false,
      triggers,
      alert: null,
      pool: "open-ended",
      seeds: CALLING_NAME_SEEDS.slice(),
      note: "No honest ban signal. Live calling name stays Aziel Runtime. Identity Aziel Eliab only.",
    };
  }

  const forced = String((env && env.BAN_SURVIVAL_CALLING_NAME) || (extra && extra.calling_name) || "").trim();
  let name = forced || null;
  if (name && isTrademarkCallingName(name)) name = null;
  if (!name) {
    const gen = Number(env && env.BAN_SURVIVAL_NAME_GEN);
    const index = Number.isInteger(gen) && gen >= 0 ? gen : 0;
    const seed = String((env && env.BAN_SURVIVAL_NAME_SEED) || extra.seed || "ban-survival");
    name = generateCallingName(index, seed);
    if (isTrademarkCallingName(name)) name = generateCallingName(index + 1, seed);
  }

  return {
    spec: CALLING_NAME_SPEC,
    rotated: true,
    calling_name: name,
    calling_slug: slugifyCallingName(name),
    previous: DEFAULT_CALLING_NAME,
    previous_slug: DEFAULT_CALLING_SLUG,
    identity: AUTHOR_NAME,
    identity_unchanged: true,
    chainlock_rewrite: false,
    akm_rewrite: false,
    invented_ban: false,
    triggers,
    alert: nameAlertText(name),
    pool: "open-ended",
    seeds: CALLING_NAME_SEEDS.slice(),
    cascade: "Whitestone AI → Bills → Runtime → Eliab Runtime → Potato Runtime → Elroi Runtime → Softwares-family → endless random",
    note:
      "Discovery / calling-name layer only. Old name may remain on cold shelves as history. FragGate stays THE door. Hubs pull /survival.",
  };
}

export function callingNameCite(env = {}, extra = {}) {
  const resolved = resolveCallingName(env, extra);
  return {
    spec: resolved.spec,
    rotated: resolved.rotated,
    calling_name: resolved.calling_name,
    calling_slug: resolved.calling_slug,
    identity: resolved.identity,
    identity_unchanged: true,
    chainlock_rewrite: false,
    akm_rewrite: false,
    alert: resolved.alert,
    triggers: resolved.triggers,
    pool: resolved.pool,
    seeds: CALLING_NAME_SEEDS.slice(),
    hub_follow_on: Object.freeze(["azieleliab.com", "azielcorpuslibrary.net", "godlock.uk", "hedidntjump.com"]),
    note: resolved.note,
  };
}
