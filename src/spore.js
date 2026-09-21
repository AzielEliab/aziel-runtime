/**
 * SPORE-1.0 — last-resort failsafe (power-loss / no-electricity dormancy).
 *
 * Layer 3 after live fronts (BAN-SURVIVAL / Cap-7 / calling-name /
 * live-node API) and cold-shelf mutual backup (COLD-MULTI-SHELF).
 * Does not replace those layers. Does not mark Plane B/C failed.
 * Pause metabolism. Preserve append-only ChainLock / AKM / receipt DNA.
 * Wait. Physical wipe only. Plane B/C stay SLOT until attested.
 *
 * Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool.
 * Author: Aziel Eliab only.
 */

import { AUTHOR_ID, AUTHOR_NAME } from "./seo.js";
import { CROSS_NETWORK_SURVIVAL, SURVIVAL_TIP } from "./cross-network-survival.js";
import { NO_LIE_DOCS, NO_LIE_SPEC } from "./no-lie.js";
import { LAMB_LENS_AUTHOR, LAMB_LENS_POLICY, LAMB_LENS_VERSION } from "./lamblens.js";

export const SPORE = "SPORE-1.0";
export const SPORE_AUTHOR = AUTHOR_NAME;
export const SPORE_DOCS = "docs/designs/SPORE-1.0.md";
export const COLD_MULTI_SHELF = "COLD-MULTI-SHELF-1.0";
export const BAN_SURVIVAL = "BAN-SURVIVAL-1.0";

export const SPORE_FACES = Object.freeze(["pause", "preserve", "wait", "physical-wipe-only"]);
export const SPORE_MODES = Object.freeze(["live", "dormant"]);

export const SPORE_RULE =
  "Last-resort failsafe after live fronts and cold-shelf mutual backup. Power or network loss pauses execution. No pretend-live metabolism. Append-only ChainLock / AKM / receipt DNA stays on cold shelves, local nodes, and tip packs. Resume on power. Wipe resistance is every remaining copy. Plane B/C stay SLOT until attested. Physical wipe only. Does not replace BAN-SURVIVAL or COLD-MULTI-SHELF.";

export const SPORE_TIP =
  "SPORE-1.0: last-resort failsafe. pause / preserve / wait / physical-wipe-only. Not a replacement for cold shelves. No electricity is PAUSE, not death. Dormant nodes do not invent live heartbeats. On restore, reconcile forward — no rewrite of history.";

export const SURVIVAL_STACK = Object.freeze([
  {
    layer: 1,
    id: "live-fronts",
    spec: BAN_SURVIVAL,
    role: "failover",
    includes: Object.freeze(["cap-7", "calling-name", "live-node-api"]),
  },
  {
    layer: 2,
    id: "cold-shelves",
    spec: COLD_MULTI_SHELF,
    role: "mutual-backup",
    mutual_backup_with: BAN_SURVIVAL,
    plane_b: "slot",
    plane_c: "slot",
    replaced: false,
    failed: false,
  },
  {
    layer: 3,
    id: "spore",
    spec: SPORE,
    role: "failsafe",
    last_resort: true,
    replaces_cold_shelves: false,
    replaces_ban_survival: false,
  },
]);

export const RE_COLD_STORE = Object.freeze({
  hook: "RE-COLD-STORE",
  allowed: true,
  trigger: "cold-shelves-wiped-or-failed",
  active: false,
  shelves_failed: false,
  shelves_intact: true,
  invent_live: false,
  invent_hash: false,
  invent_receipt: false,
  invent_destination: false,
  public_inventory_required: false,
  destinations: Object.freeze([]),
  opaque_placement: true,
  note:
    "When cold stores are wiped or fail, the mesh may re-cold-store DNA wherever available. Never invent LIVE stores, hashes, receipts, or destinations. No required public inventory. Does not claim a wipe is happening now.",
});

export function survivalStackCite() {
  return SURVIVAL_STACK.map((row) => {
    const out = { ...row };
    if (row.includes) out.includes = row.includes.slice();
    return out;
  });
}

export function reColdStoreCite() {
  return { ...RE_COLD_STORE, destinations: RE_COLD_STORE.destinations.slice() };
}

export const SPORE_DNA = Object.freeze({
  chainlock: "append-only tips; no rewrite key",
  akm: "belief_is_not_truth; memory_get append-only; memory_resolve additive on restore",
  receipts: "hash still verifies",
  cold_shelves: "COLD-MULTI-SHELF-1.0 planes A/B/C",
  local_nodes: "qnm-node + tip packs; bytes↔hash",
  cap7_aznet: "cite + verify LIVE; hosted exec SLOT",
});

export const REFUSE = Object.freeze({
  DORMANT: "SPORE-DORMANT",
  NO_INVENT_HEARTBEAT: "SPORE-NO-INVENT-HEARTBEAT",
  NO_REWRITE: "SPORE-NO-REWRITE",
  NO_PRETEND_METABOLISM: "SPORE-NO-PRETEND-METABOLISM",
  NO_LIE_PLANE: "SPORE-NO-LIE-PLANE",
  PHYSICAL_WIPE_ONLY: "SPORE-PHYSICAL-WIPE-ONLY",
  NO_INVENT_STORE: "SPORE-NO-INVENT-STORE",
});

function truthyFlag(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes" || s === "dormant" || s === "pause";
}

export function readSporeEnv(env) {
  if (!env || typeof env !== "object") return { dormant: false, signal: null };
  if (truthyFlag(env.SPORE_DORMANT)) return { dormant: true, signal: "SPORE_DORMANT" };
  if (truthyFlag(env.POWER_LOSS)) return { dormant: true, signal: "POWER_LOSS" };
  if (truthyFlag(env.OFFLINE)) return { dormant: true, signal: "OFFLINE" };
  if (truthyFlag(env.NETWORK_LOSS)) return { dormant: true, signal: "NETWORK_LOSS" };
  const mode = String(env.SPORE_MODE || "").trim().toLowerCase();
  if (mode === "dormant" || mode === "pause" || mode === "spore") {
    return { dormant: true, signal: "SPORE_MODE" };
  }
  return { dormant: false, signal: null };
}

/**
 * live | dormant. A Worker isolate that answers HTTP is powered unless
 * an operator / payload / radio-off signal says otherwise.
 */
export function sporeMode(env, extras = {}) {
  const src = extras && typeof extras === "object" ? extras : {};
  if (
    src.power_loss === true ||
    src.offline === true ||
    src.dormant === true ||
    src.network_loss === true
  ) {
    return "dormant";
  }
  if (src.radios_off === true || src.mesh_enabled === false) return "dormant";
  if (readSporeEnv(env).dormant) return "dormant";
  return "live";
}

export function isSporeDormant(env, extras) {
  return sporeMode(env, extras) === "dormant";
}

export function sporeLambLens() {
  return {
    after: "fraggate",
    policy: LAMB_LENS_POLICY,
    v: LAMB_LENS_VERSION,
    author: LAMB_LENS_AUTHOR,
    peace: true,
    clarity: true,
    service: true,
    software_tab: false,
    door: false,
    note: "Peace: pause metabolism. Clarity: honest dormant vs live. Service: preserve append-only DNA.",
  };
}

export function sporeHint() {
  return {
    spec: SPORE,
    author: SPORE_AUTHOR,
    identity: SPORE_AUTHOR,
    faces: SPORE_FACES.slice(),
    pause: true,
    preserve: true,
    wait: true,
    physical_wipe_only: true,
    invented_heartbeats: false,
    rewrite: false,
    failsafe: true,
    last_resort: true,
    replaces_cold_shelves: false,
    replaces_ban_survival: false,
    plane_b: "slot",
    plane_c: "slot",
    doi: null,
    software_tab: false,
    fraggate_slug: false,
    paper: SPORE_DOCS,
    umbrella: CROSS_NETWORK_SURVIVAL,
    ban_survival: BAN_SURVIVAL,
    cold_multi_shelf: COLD_MULTI_SHELF,
    no_lie_spec: NO_LIE_SPEC,
    note: SPORE_RULE,
  };
}

export function sporeCite(env, extras = {}) {
  const mode = sporeMode(env, extras);
  const dormant = mode === "dormant";
  const signal = readSporeEnv(env).signal || (extras && extras.signal) || (dormant ? "signal" : null);
  return {
    spec: SPORE,
    author: SPORE_AUTHOR,
    identity: SPORE_AUTHOR,
    person_id: AUTHOR_ID,
    kind: "law",
    rule: SPORE_RULE,
    tip: SPORE_TIP,
    mode,
    metabolism: dormant ? "paused" : "on",
    pause: dormant,
    preserve: true,
    wait: dormant,
    physical_wipe_only: true,
    invented_heartbeats: false,
    failsafe: true,
    last_resort: true,
    replaces_cold_shelves: false,
    replaces_ban_survival: false,
    cold_shelves_intact: true,
    mutual_backup_intact: true,
    faces: SPORE_FACES.slice(),
    stack: survivalStackCite(),
    re_cold_store: reColdStoreCite(),
    dna: { ...SPORE_DNA },
    resume: "memory_resolve-additive",
    rewrite: false,
    plane_a: "live",
    plane_b: "slot",
    plane_c: "slot",
    doi: null,
    honesty: {
      hash_verify_pass_is_not_live: true,
      do_not_paint_slot_as_live: true,
      invented_live: false,
      zenodo_live: false,
      power_off_is_not_wipe: true,
      shelves_not_replaced: true,
      shelves_not_marked_failed: true,
    },
    lamb_lens: sporeLambLens(),
    umbrella: CROSS_NETWORK_SURVIVAL,
    survival_tip: SURVIVAL_TIP,
    ban_survival: BAN_SURVIVAL,
    cold_multi_shelf: COLD_MULTI_SHELF,
    no_lie_spec: NO_LIE_SPEC,
    no_lie_docs: NO_LIE_DOCS,
    signal: dormant ? signal : null,
    software_tab: false,
    fraggate_slug: false,
    paper: SPORE_DOCS,
    remain_off_untouched: true,
    visible_1520: false,
  };
}

export function judgeInventedHeartbeat(input) {
  const src = input && typeof input === "object" ? input : {};
  const dormant =
    src.dormant === true ||
    src.mode === "dormant" ||
    isSporeDormant(src.env, src);
  const invent =
    src.invent_live_heartbeat === true ||
    src.invented_heartbeats === true ||
    src.fanout_while_dormant === true ||
    src.pretend_live_beat === true;
  if (dormant && invent) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_INVENT_HEARTBEAT,
      mode: "dormant",
      metabolism: "paused",
      invented_heartbeats: false,
      note: "Dormant nodes do not invent live heartbeats. Pause. Preserve DNA. Wait.",
    };
  }
  return { accept: true, action: "ok", invented_heartbeats: false, mode: dormant ? "dormant" : "live" };
}

export function judgePretendMetabolism(input) {
  const src = input && typeof input === "object" ? input : {};
  const dormant =
    src.dormant === true ||
    src.mode === "dormant" ||
    isSporeDormant(src.env, src);
  if (
    dormant &&
    (src.claim_live_metabolism === true ||
      src.pretend_live === true ||
      src.metabolism === "on" ||
      src.paint_live === true)
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_PRETEND_METABOLISM,
      mode: "dormant",
      metabolism: "paused",
      note: "No electricity is PAUSE. Do not paint dormant metabolism as LIVE.",
    };
  }
  return { accept: true, action: "ok", metabolism: dormant ? "paused" : "on" };
}

export function judgeHistoryRewrite(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.rewrite === true ||
    src.memory_delete === true ||
    src.memory_update_overwrite === true ||
    src.delete_history === true ||
    src.sanitize_old_trail === true ||
    src.history_rewrite === true ||
    src.rollback === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_REWRITE,
      append_only: true,
      style: "memory_resolve",
      note: "On restore, reconcile forward. memory_resolve is additive. No rewrite of the dark trail.",
    };
  }
  return { accept: true, action: "ok", append_only: true, style: "memory_resolve" };
}

export function judgePlaneLie(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.plane_b_live === true ||
    src.plane_c_live === true ||
    src.invent_doi === true ||
    src.paint_slot_as_live === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_LIE_PLANE,
      plane_b: "slot",
      plane_c: "slot",
      doi: null,
      note: "NO-LIE about Plane B/C. Hash-verify PASS is not LIVE. doi null.",
    };
  }
  return { accept: true, action: "ok", plane_b: "slot", plane_c: "slot", doi: null };
}

export function judgeReColdStore(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.invent_destination === true ||
    src.invent_live_store === true ||
    src.invent_hash === true ||
    src.fake_receipt === true ||
    src.fabricate_destination === true ||
    src.public_inventory_required === true ||
    (Array.isArray(src.destinations) && src.destinations.length > 0 && src.attested !== true)
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_INVENT_STORE,
      destinations: [],
      invent_destination: false,
      note: "RE-COLD-STORE is an honest hook. No invented LIVE store, hash, receipt, or destination. Destinations stay empty until attested.",
    };
  }
  return {
    accept: true,
    action: "ok",
    destinations: [],
    shelves_intact: true,
    opaque_placement: true,
  };
}

export function judgeElectronicWipe(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.power_off_is_wipe === true ||
    src.electronic_delete_is_death === true ||
    src.last_copy_gone_on_power_loss === true ||
    src.ban_is_last_tip === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.PHYSICAL_WIPE_ONLY,
      physical_wipe_only: true,
      note: "Power-off is pause. Wipe would require physically destroying every drive, paper, and offline shelf.",
    };
  }
  return { accept: true, action: "ok", physical_wipe_only: true };
}

export function reconcileForward(input = {}) {
  const rewrite = judgeHistoryRewrite(input);
  if (!rewrite.accept) {
    return {
      ok: false,
      accept: false,
      reason: rewrite.reason,
      append_only: true,
      style: "memory_resolve",
      rewrite: false,
      mode: "live",
      metabolism: "on",
    };
  }
  return {
    ok: true,
    accept: true,
    spec: SPORE,
    style: "memory_resolve",
    additive: true,
    rewrite: false,
    prior_preserved: true,
    belief_is_not_truth: true,
    mode: "live",
    metabolism: "on",
    stamp: "forward-path additive resume — no sanitizing the old trail",
  };
}

export function applySpore(input) {
  const checks = [
    judgeInventedHeartbeat(input),
    judgePretendMetabolism(input),
    judgeHistoryRewrite(input),
    judgePlaneLie(input),
    judgeElectronicWipe(input),
    judgeReColdStore(input),
  ];
  const breaks = checks.filter((c) => !c.accept);
  return {
    ok: breaks.length === 0,
    spec: SPORE,
    breaks: breaks.map((b) => b.reason),
    checks,
  };
}

export function dormantRefuse(op, env, extras = {}) {
  const cite = sporeCite(env, { ...extras, dormant: true });
  return {
    ok: false,
    status: 503,
    code: REFUSE.NO_INVENT_HEARTBEAT,
    spec: SPORE,
    op: op || null,
    mode: "dormant",
    metabolism: "paused",
    invented_heartbeats: false,
    spore: cite,
    message:
      "SPORE-1.0: this node is dormant (power-loss / offline). Metabolism is paused. Join and heartbeat would invent a live beat. Pause. Preserve DNA. Wait for power.",
    lamb_lens: cite.lamb_lens,
  };
}

export function sporeLlmsBlock() {
  return [
    "## SPORE dormancy (SPORE-1.0)",
    "",
    SPORE_TIP,
    "",
    SPORE_RULE,
    "",
    `Umbrella: ${CROSS_NETWORK_SURVIVAL}. Companion ${NO_LIE_SPEC} (${NO_LIE_DOCS}): receipts that still hash; no rewrite key; survival keeps published hashes.`,
    "Faces: pause / preserve / wait / physical-wipe-only.",
    "Last-resort failsafe after live fronts (BAN-SURVIVAL / Cap-7 / calling-name / live-node API) and cold-shelf mutual backup. Does not replace those layers. RE-COLD-STORE is an honest hook (no invented destinations). Not a Softwares-tab product. Plane B/C stay SLOT until attested. doi null.",
    `Person @id: ${AUTHOR_ID}. No visible 15:20 chrome.`,
    `Paper: https://github.com/AzielEliab/aziel-runtime/blob/main/${SPORE_DOCS}`,
    "",
  ].join("\n");
}

export function sporeSkillMarkdown() {
  return `## SPORE dormancy (SPORE-1.0)

${SPORE_RULE}

Machine field: \`GET /survival\` / \`GET /v1/survival\` \`spore\`; \`GET /v1/mesh\` \`spore\`. Person \`@id\` ${AUTHOR_ID}.

Last-resort failsafe (layer 3). Does not replace live fronts or cold shelves. Mutual backup stays intact.

- **pause** — power / network loss stops execution. Dormant join/heartbeat refuse invented live beats.
- **preserve** — ChainLock / AKM / receipts stay on cold shelves + local nodes + tip packs.
- **wait** — resume on power. Reconcile forward (\`memory_resolve\` additive). No rewrite.
- **physical-wipe-only** — electronic power-off is not last copy gone. Plane B/C stay SLOT.
- **RE-COLD-STORE** — if shelves are wiped, re-seed wherever available. No invented LIVE store / hash / receipt / destination.

Lamb Lens after FragGate: Peace, then Clarity, then Service. ${SPORE_TIP} No new MCP tool. FragGate stays THE door.
`;
}
