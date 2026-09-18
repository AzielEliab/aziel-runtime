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
import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";

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

/** Operator slug forms (`eliab - runtime` → eliab-runtime). Bills uses bills-runtime as needed. */
export const CALLING_NAME_SEED_SLUGS = Object.freeze({
  "Whitestone AI": "whitestone-ai",
  Bills: "bills-runtime",
  "Bills Runtime": "bills-runtime",
  Runtime: "runtime",
  "Eliab Runtime": "eliab-runtime",
  "Potato Runtime": "potato-runtime",
  "Elroi Runtime": "elroi-runtime",
});

/** Softwares-family pool after the six seeds. Not a cap — endless generator follows. */
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

export const CALLING_NAME_HARD_CAP = false;
export const CALLING_NAME_ENDLESS_STEMS = Object.freeze([
  "FoldLock",
  "GodLock",
  "PeaceLock",
  "AZHub",
  "AZNet",
  "AZBrowser",
  "AZMail",
  "EmbryoLock",
  "AZCoherence",
  "MirageGrid",
  "AZInterface",
  "AZVPN",
  "Loom",
  "Span",
  "Keel",
  "Rift",
  "Well",
  "Ember",
  "Vault",
  "Whitestone",
  "Eliab",
  "Potato",
  "Elroi",
  "Bills",
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

/** trigger → mesh alert → metadata rewrite → client rediscovery */
export const CALLING_NAME_PIPELINE = Object.freeze([
  "trigger",
  "mesh_alert",
  "metadata_rewrite",
  "client_rediscovery",
]);

export const CALLING_NAME_SURFACES = Object.freeze([
  "openapi.info.title",
  "openapi.info.summary",
  "openapi.info.description",
  "mcp.serverInfo.name",
  "mcp.serverInfo.title",
  "mcp.serverInfo.description",
  "mcp.initialize.instructions",
  "mcp.server_card",
  "cite.json.product",
  "cite.json.slug",
  "cite.json.how_to_cite",
  "cite.json.bibtex",
  "cite.json.apa",
  "cite.json.calling_name",
  "/survival.calling_name",
  "/survival.live_product",
  "/llms.txt",
  "/ai.txt",
  "/who-is",
  "/person.jsonld",
  "/about",
  "/v1/software.suite_calling_name",
  "/v1/update/manifest",
  "/v1/runtime.json",
  "/v1/health",
  "/v1/skill",
  "/v1/mesh.calling_name_alert",
  "/manifest.webmanifest",
]);

export const CALLING_NAME_CALL_ROUTES = Object.freeze({
  door: "fraggate",
  mcp: "/mcp",
  fraggate_call: "/v1/fraggate/call",
  second_door: false,
  note: "Same FragGate door. Clients rediscover these call routes under the live calling name. Not a new exec path.",
});

/** Hub follow-on — pull runtime /survival SoT. Not this repo. */
export const HUB_FOLLOW_ON_PULL = Object.freeze({
  sot: "/survival",
  also: Object.freeze(["/cite.json", "/v1/mesh"]),
  fields: Object.freeze([
    "live_doors",
    "exec_origins",
    "live_product",
    "calling_name",
    "calling_name.alert",
    "calling_name.calling_name",
    "calling_name.calling_slug",
  ]),
  hardcode: false,
  this_repo: false,
  note: "Hubs pull runtime /survival rather than hardcode live_doors or the calling name. Hub site PRs are follow-on, not this repo.",
});

export const HUB_FOLLOW_ON = Object.freeze([
  Object.freeze({
    id: "ae",
    host: "azieleliab.com",
    origin: "https://www.azieleliab.com",
    runtime: "https://www.azieleliab.com/runtime",
    surfaces: Object.freeze([
      "/runtime Softwares tab + door labels",
      "/cite.json /llms.txt /ai.txt",
      "/who-is /person.jsonld calling strings",
      "homepage / MCP titles that advertise the suite calling name",
    ]),
  }),
  Object.freeze({
    id: "corpus",
    host: "azielcorpuslibrary.net",
    origin: "https://www.azielcorpuslibrary.net",
    runtime: "https://www.azielcorpuslibrary.net/runtime",
    surfaces: Object.freeze([
      "/runtime Softwares tab + door labels",
      "/cite.json /llms.txt /ai.txt",
      "/who-is /person.jsonld calling strings",
      "library catalog copy that names the live suite",
    ]),
  }),
  Object.freeze({
    id: "godlock",
    host: "godlock.uk",
    origin: "https://godlock.uk",
    runtime: "https://godlock.uk/runtime",
    surfaces: Object.freeze([
      "/runtime Softwares tab + door labels",
      "/cite.json /llms.txt",
      "/who-is /person.jsonld calling strings",
      "GodLock is a product name, not identity — only the suite calling name rotates",
    ]),
  }),
  Object.freeze({
    id: "hdj",
    host: "hedidntjump.com",
    origin: "https://www.hedidntjump.com",
    runtime: null,
    surfaces: Object.freeze([
      "/cite.json /llms.txt /ai.txt",
      "/who-is /person.jsonld calling strings",
      "archive about / sister-product copy that advertises the live suite name",
    ]),
    note: "Sister archive. No /runtime exec binding. Still pull /survival for live_doors + calling-name alert.",
  }),
]);

export function nameAlertText(name) {
  return `${NAME_ALERT_PREFIX} ${String(name || "").trim()}`;
}

export function slugifyCallingName(name) {
  const trimmed = String(name || "").trim();
  if (CALLING_NAME_SEED_SLUGS[trimmed]) return CALLING_NAME_SEED_SLUGS[trimmed];
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "bills") return "bills-runtime";
  return slug || DEFAULT_CALLING_SLUG;
}

/** Bills stays Bills; Bills Runtime when a *-runtime form is required. */
export function billsRuntimeAsNeeded(name, needRuntimeSuffix = false) {
  const n = String(name || "").trim();
  if (n === "Bills" && needRuntimeSuffix) return "Bills Runtime";
  return n;
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
  const stem = CALLING_NAME_ENDLESS_STEMS[index % CALLING_NAME_ENDLESS_STEMS.length];
  return `${stem} ${hex} Runtime`;
}

/**
 * Open-ended cascade. Seeds first (never a hard cap of 6), then
 * Softwares-family `*-runtime`, then distinct endless operator names.
 */
export function generateCallingName(index, seed = "ban-survival") {
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  if (i < CALLING_NAME_SEEDS.length) return CALLING_NAME_SEEDS[i];
  const fam = i - CALLING_NAME_SEEDS.length;
  if (fam < CALLING_NAME_FAMILY.length) return CALLING_NAME_FAMILY[fam];
  return randomFamilyName(i, seed);
}

/** Endless random Softwares-family name. Alongside the seeded cascade — not a sixth-name cap. */
export function generateRandomCallingName(seed = "ban-survival", salt = "rnd") {
  const h = fnv1a(`${seed}|${salt}|endless-random`);
  const index = CALLING_NAME_SEEDS.length + CALLING_NAME_FAMILY.length + (h % 1_000_000);
  return randomFamilyName(index, `${seed}|${salt}`);
}

/** Rewrite live calling display. Does not touch URLs, receipts, or Person identity. */
export function rewriteLiveCallingDisplay(text, calling) {
  const src = String(text ?? "");
  if (!calling || calling.rotated !== true || !calling.calling_name) return src;
  return src.replace(/\bAziel Runtime\b/g, calling.calling_name);
}

/** Keyword / vanity lists only. Never rewrite github.com/.../aziel-runtime URLs. */
export function rewriteLiveCallingKeywords(text, calling) {
  const src = rewriteLiveCallingDisplay(text, calling);
  if (!calling || calling.rotated !== true || !calling.calling_slug) return src;
  return src.replace(/(^|[\s,])aziel-runtime(?=[\s,]|$)/g, `$1${calling.calling_slug}`);
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
  if (truthyFlag(src.uses_collapse) || truthyFlag(src.traffic_collapse) || truthyFlag(src.slow_uses)) {
    hits.push("uses_collapse");
  }
  if (truthyFlag(src.downloads_stop) || truthyFlag(src.downloads_crater)) hits.push("downloads_stop");
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
  const seed = String((env && env.BAN_SURVIVAL_NAME_SEED) || extra.seed || "ban-survival");
  const wantRandom = truthyFlag(env && env.BAN_SURVIVAL_NAME_RANDOM) || extra.random === true;
  if (!name && wantRandom) {
    name = generateRandomCallingName(seed, extra.salt || env.BAN_SURVIVAL_NAME_SALT || "rnd");
    if (isTrademarkCallingName(name)) name = generateRandomCallingName(seed, `${extra.salt || "rnd"}|skip`);
  }
  if (!name) {
    const gen = Number(env && env.BAN_SURVIVAL_NAME_GEN);
    const index = Number.isInteger(gen) && gen >= 0 ? gen : 0;
    name = generateCallingName(index, seed);
    if (isTrademarkCallingName(name)) name = generateCallingName(index + 1, seed);
  }
  name = billsRuntimeAsNeeded(
    name,
    truthyFlag(env && env.BAN_SURVIVAL_BILLS_RUNTIME) || truthyFlag(extra.need_runtime_suffix),
  );

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
    hard_cap: CALLING_NAME_HARD_CAP,
    seeds: CALLING_NAME_SEEDS.slice(),
    seed_slugs: { ...CALLING_NAME_SEED_SLUGS },
    cascade: "Whitestone AI → Bills (Bills Runtime as needed) → Runtime → Eliab Runtime → Potato Runtime → Elroi Runtime → Softwares-family *-runtime → endless",
    pipeline: CALLING_NAME_PIPELINE.slice(),
    surfaces: CALLING_NAME_SURFACES.slice(),
    call_routes: { ...CALLING_NAME_CALL_ROUTES },
    mesh_share: "live-mesh-pull",
    random_alongside: true,
    rewrites_all_discovery_metadata: true,
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
    hard_cap: CALLING_NAME_HARD_CAP,
    seeds: CALLING_NAME_SEEDS.slice(),
    seed_slugs: { ...CALLING_NAME_SEED_SLUGS },
    cascade: resolved.cascade || "Whitestone AI → Bills (Bills Runtime as needed) → Runtime → Eliab Runtime → Potato Runtime → Elroi Runtime → Softwares-family *-runtime → endless",
    pipeline: CALLING_NAME_PIPELINE.slice(),
    surfaces: CALLING_NAME_SURFACES.slice(),
    call_routes: { ...CALLING_NAME_CALL_ROUTES },
    mesh_share: "live-mesh-pull",
    random_alongside: true,
    rewrites_all_discovery_metadata: true,
    hub_follow_on: HUB_FOLLOW_ON,
    hub_follow_on_pull: HUB_FOLLOW_ON_PULL,
    note: resolved.note,
  };
}

/**
 * Live-mesh pull field. GET never enables. Not mesh_broadcast (hash-only).
 * When rotated, the value is exactly `*new name alert: <name>`.
 */
export function meshCallingNameAlert(env = {}, extra = {}) {
  const resolved = resolveCallingName(env, extra);
  return {
    alert: resolved.alert,
    calling_name: resolved.calling_name,
    calling_slug: resolved.calling_slug,
    rotated: resolved.rotated,
    identity: resolved.identity,
    identity_unchanged: true,
    pull: "/survival",
    mesh: "/v1/mesh",
    publish: false,
    mesh_broadcast: false,
    form: "*new name alert: <name>",
    note: resolved.rotated
      ? `${resolved.alert} — live nodes pull this field on GET /v1/mesh and GET /survival. GET never enables. Not a publish path.`
      : "No honest ban signal. Live calling name stays Aziel Runtime. No name alert.",
  };
}

function decisiongateObserveCite(upload = {}) {
  const src = upload && typeof upload === "object" ? upload : {};
  const marked = truthyFlag(src.implies_ban) || truthyFlag(src.ban_signal);
  const fact = String(src.fact || src.text || src.data || src.note || "")
    .trim()
    .slice(0, 160);
  const statement = marked
    ? "Observe this marked user-uploaded ban-early-warning signal and rotate the public calling name without inventing a ban or rewriting ChainLock history."
    : "Observe this unmarked user-uploaded payload as belief only and do not invent a ban or rotate the public calling name.";
  const lineage = decisiongateCheck({
    statement,
    evidence: [
      marked ? "Upload marked implies_ban by the caller." : "Upload is unmarked; empty metrics are not a ban.",
      fact || "No extra fact text was supplied with the upload.",
    ],
    impacts_positive: ["LLM clients can still discover the FragGate door under a fresh Softwares-family name."],
    impacts_negative: ["Old calling name may linger on cold shelves and CNS as history."],
    values: ["NO-LIE", "NO-REWRITE", "belief_is_not_truth"],
    constraints: ["Do not invent a ban.", "Do not rewrite ChainLock or AKM history.", "Do not impersonate third-party trademarks."],
    accountable_person: AUTHOR_NAME,
  });
  return {
    slug: "decisiongate",
    op: "check",
    proposal: statement,
    implies_ban: marked,
    invent_ban: false,
    final_state: lineage && lineage.final_state ? lineage.final_state : "OBSERVE",
    lineage: lineage && lineage.lineage ? lineage.lineage : null,
    note: "Ingest is a signal. DecisionGATE observes. Unmarked uploads are not a ban.",
  };
}

function akmObserveCite(upload = {}, marked = false) {
  const src = upload && typeof upload === "object" ? upload : {};
  const fact = String(src.fact || src.text || src.data || "")
    .trim()
    .slice(0, 160);
  return {
    op: "observe",
    subject: "ban-survival-calling-name",
    fact: marked
      ? fact || "User-uploaded data marked implies_ban. Belief, not truth."
      : fact || "User-uploaded data observed. Unmarked. Not a ban.",
    belief_is_not_truth: true,
    append_only: true,
    memory_delete: false,
    memory_update_overwrite: false,
    persisted: false,
    persist_via: "POST /v1/memory/observe",
    note: "AKM observe cite. Persist through the existing memory door. No memory_delete. Posterior ≠ truth.",
  };
}

/**
 * User-uploaded ban-early-warning ingest.
 * DecisionGATE check + AKM observe (belief, not truth). Rotate only when
 * the upload is marked implies_ban / ban_signal. Do not invent a ban.
 */
export function ingestBanSignal(upload = {}, env = {}) {
  const src = upload && typeof upload === "object" ? upload : {};
  if (src.invent_ban === true || src.fake_ban === true || src.paint_ban === true || truthyFlag(src.invent_ban) || truthyFlag(src.fake_ban)) {
    return {
      ok: false,
      rotate: false,
      invented_ban: true,
      reason: CALLING_NAME_REFUSE.INVENT_BAN,
      decisiongate: { slug: "decisiongate", op: "check", action: "refuse", reason: CALLING_NAME_REFUSE.INVENT_BAN },
      akm: {
        op: "observe",
        belief_is_not_truth: true,
        append_only: true,
        memory_delete: false,
        persisted: false,
        fact: "Invented ban refused. Empty metrics are not a ban.",
      },
      calling_name: resolveCallingName(env, { invent_ban: true }),
      pipeline: CALLING_NAME_PIPELINE.slice(),
      note: "Do not invent a ban from empty metrics or unmarked uploads.",
    };
  }
  const marked = truthyFlag(src.implies_ban) || truthyFlag(src.ban_signal);
  const decisiongate = decisiongateObserveCite(src);
  const akm = akmObserveCite(src, marked);
  const calling = resolveCallingName(env, {
    implies_ban: marked,
    calling_name: src.calling_name,
    seed: src.seed,
  });
  return {
    ok: true,
    rotate: Boolean(marked && calling.rotated),
    invented_ban: false,
    implies_ban: marked,
    decisiongate,
    akm,
    calling_name: calling,
    alert: calling.alert,
    pipeline: CALLING_NAME_PIPELINE.slice(),
    note: marked
      ? "Marked ingest observed. Calling name may rotate. Belief is not truth."
      : "Unmarked ingest observed. Not a ban. Calling name stays Aziel Runtime.",
  };
}
