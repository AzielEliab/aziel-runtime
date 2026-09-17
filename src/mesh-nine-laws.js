/**
 * Nine QNM / Node Mesh laws — HARD TRUE.
 *
 * Machine fields on GET /v1/mesh (+ status) plus refuse paths that reuse
 * published MESH-* codes. Not a new Softwares-tab product. Not a FragGate
 * slug. Not a new MCP tool. FragGate stays the only public exec door.
 *
 * GodLock is a product name, not identity. Die-with-pull must not
 * resurrect godlock.uk. Cap-7 stays resolves_to_hub false.
 *
 * Identity: Aziel Eliab only. Lamb Lens. NO-LIE.
 */

import { COLD_COPY } from "./cold-copy.js";
import { REHEAL, REHEAL_LAW, neighborTalkHeal } from "./reheal.js";
import { AUTHOR_ID, RUNTIME_SOFTWARE_ID } from "./seo.js";
import {
  DWELL_S,
  PAYLOAD_PLANE,
  SPLIT_WIRES,
  TICK_MS_MAX,
  TICK_MS_MIN,
  TICK_PLANE,
  clocksShareSocket,
  neighborPhoenix,
} from "./split-wires.js";

export const NINE_LAWS_AUTHOR = "Aziel Eliab";
export const NINE_LAWS_IDENTITY = "Aziel Eliab";
export const NINE_LAWS_COUNT = 9;
export const NINE_LAWS_HARD_TRUE = true;
export const NINE_LAWS_AUTHOR_ID = AUTHOR_ID;
export const NINE_LAWS_RUNTIME_ID = RUNTIME_SOFTWARE_ID;
export const NINE_LAWS_HASHTAG_PARTS = Object.freeze({
  person: "#aziel",
  runtime: "#runtime",
});

export const NINE_LAW_PAPERS = Object.freeze({
  node_mesh: "docs/NODE_MESH.md",
  sec_feat: "docs/designs/SEC-FEAT-1.0.md",
  node_ops: "docs/designs/NODE-OPS-1.0.md",
  qnm_wp: "docs/designs/QNM-WP-1.0.md",
});

/** Published refuse codes only — do not invent a tenth door. */
export const NINE_LAW_REFUSE_CODES = Object.freeze({
  "split-wires": "MESH-NO-BYTES",
  "split-wires-clocks": "MESH-BAD-INPUT",
  "cold-copy": "MESH-NO-BYTES",
  reheal: "MESH-NO-NEIGHBOR-HEAL",
  phoenix: "MESH-STUB",
  "die-with-pull": "MESH-STUB",
  "neighbor-heal": "MESH-NO-NEIGHBOR-HEAL",
  "node-gate": "MESH-STUB",
  "auto-heal": "MESH-STUB",
  anonymity: "MESH-STUB",
});

const TRUTHY = new Set(["1", "true", "on", "yes"]);

function flagOn(src, key) {
  if (!src || typeof src !== "object") return false;
  const v = src[key];
  if (v === true) return true;
  if (v == null || v === false) return false;
  return TRUTHY.has(String(v).trim().toLowerCase());
}

function anyFlag(src, keys) {
  return keys.some((k) => flagOn(src, k));
}

function hostnameBlob(src) {
  if (!src || typeof src !== "object") return "";
  return [
    src.hostname,
    src.host,
    src.restore_hostname,
    src.public_hostname,
    src.site,
    src.domain,
    src.url,
  ]
    .map((v) => String(v == null ? "" : v).trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function looksLikeGodlockUk(raw) {
  return /godlock\.uk/.test(String(raw || "").toLowerCase());
}

export const NINE_LAWS = Object.freeze([
  Object.freeze({
    id: 1,
    slug: "split-wires",
    name: "Split the wires",
    spec: SPLIT_WIRES,
    source: "src/split-wires.js",
    test: "law1_split_wires_fields_and_refuse",
    refuse: NINE_LAW_REFUSE_CODES["split-wires"],
    refuse_clocks: NINE_LAW_REFUSE_CODES["split-wires-clocks"],
    fields: Object.freeze({
      clocks_share_socket: false,
      tick_plane: TICK_PLANE,
      payload_plane: PAYLOAD_PLANE,
      tick_body: false,
      tick_diff: false,
      tick_file: false,
      tick_ms_min: TICK_MS_MIN,
      tick_ms_max: TICK_MS_MAX,
      dwell_s: DWELL_S,
    }),
  }),
  Object.freeze({
    id: 2,
    slug: "cold-copy",
    name: "Cold-copy survival",
    spec: COLD_COPY,
    source: "src/cold-copy.js",
    test: "law2_cold_copy_fields_and_refuse",
    refuse: NINE_LAW_REFUSE_CODES["cold-copy"],
    fields: Object.freeze({
      live_body_sync: false,
      named_hosts_only: true,
      tip_content_addressed: true,
    }),
  }),
  Object.freeze({
    id: 3,
    slug: "reheal",
    name: "REHEAL refuse",
    spec: REHEAL,
    source: "src/reheal.js",
    test: "law3_reheal_refuse",
    refuse: NINE_LAW_REFUSE_CODES.reheal,
    fields: Object.freeze({
      isolation_is_the_cure: true,
      neighbor_heal: false,
      vote_to_fix: false,
      bodies: false,
      diffs: false,
    }),
  }),
  Object.freeze({
    id: 4,
    slug: "phoenix",
    name: "Phoenix local only",
    spec: "PHOENIX-LOCK",
    source: "src/split-wires.js",
    test: "law4_phoenix_local_only",
    refuse: NINE_LAW_REFUSE_CODES.phoenix,
    fields: Object.freeze({
      phoenix_local_only: true,
      neighbor_phoenix: false,
      public_hostname_resurrection: false,
    }),
  }),
  Object.freeze({
    id: 5,
    slug: "die-with-pull",
    name: "Die-with-pull does not bring godlock.uk back",
    spec: "DIE-WITH-PULL",
    source: "src/mesh.js",
    test: "law5_die_with_pull_no_godlock_uk",
    refuse: NINE_LAW_REFUSE_CODES["die-with-pull"],
    fields: Object.freeze({
      die_with_pull: true,
      restore_godlock_uk: false,
      climb_public_hostname: false,
      public_hostname_resurrection: false,
    }),
  }),
  Object.freeze({
    id: 6,
    slug: "neighbor-heal",
    name: "No neighbor talk-back-to-health",
    spec: REHEAL,
    source: "src/reheal.js",
    test: "law6_no_neighbor_heal",
    refuse: NINE_LAW_REFUSE_CODES["neighbor-heal"],
    fields: Object.freeze({
      neighbor_heal: false,
      vote_to_fix: false,
      apply_last_packet_on_heartbeat_loss: false,
    }),
  }),
  Object.freeze({
    id: 7,
    slug: "node-gate",
    name: "No Node Gate",
    spec: "QNM-BUILD-1.0",
    source: "src/mesh.js",
    test: "law7_no_node_gate",
    refuse: NINE_LAW_REFUSE_CODES["node-gate"],
    fields: Object.freeze({
      node_gate: false,
      login_mesh: false,
      login_recovery: false,
      ip_panel: false,
      get_is_node_gate: false,
    }),
  }),
  Object.freeze({
    id: 8,
    slug: "auto-heal",
    name: "No auto-heal",
    spec: "NODE-OPS-1.0",
    source: "src/mesh.js",
    test: "law8_no_auto_heal",
    refuse: NINE_LAW_REFUSE_CODES["auto-heal"],
    fields: Object.freeze({
      implicit_heal: false,
      auto_heal: false,
      heartbeat_loss_isolates: false,
      apply_last_packet: false,
    }),
  }),
  Object.freeze({
    id: 9,
    slug: "anonymity",
    name: "Not an anonymity network",
    spec: COLD_COPY,
    source: "src/cold-copy.js",
    test: "law9_not_anonymity_network",
    refuse: NINE_LAW_REFUSE_CODES.anonymity,
    fields: Object.freeze({
      anonymity_network: false,
      vpn: false,
      origin_hiding: false,
      godlock_is_identity: false,
    }),
  }),
]);

/** Worker-launch cite only — hashtag parts + always About Aziel. Not a UI. */
export function nineLawsLaunchCite(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const about = {
    path: "/about",
    v1: "/v1/about",
    identity: NINE_LAWS_IDENTITY,
    author_id: AUTHOR_ID,
    always: true,
  };
  if (base) {
    about.url = `${base}/about`;
    about.v1_url = `${base}/v1/about`;
  }
  return {
    author_id: AUTHOR_ID,
    runtime_id: RUNTIME_SOFTWARE_ID,
    hashtag_parts: { ...NINE_LAWS_HASHTAG_PARTS },
    about,
  };
}

export function nineLawsHint() {
  return {
    hard_true: NINE_LAWS_HARD_TRUE,
    count: NINE_LAWS_COUNT,
    author: NINE_LAWS_AUTHOR,
    identity: NINE_LAWS_IDENTITY,
    author_id: AUTHOR_ID,
    runtime_id: RUNTIME_SOFTWARE_ID,
    hashtag_parts: { ...NINE_LAWS_HASHTAG_PARTS },
    about: { path: "/about", v1: "/v1/about", identity: NINE_LAWS_IDENTITY, always: true },
    clocks_share_socket: false,
    live_body_sync: false,
    isolation_is_the_cure: true,
    neighbor_heal: false,
    phoenix_local_only: true,
    die_with_pull: true,
    restore_godlock_uk: false,
    node_gate: false,
    implicit_heal: false,
    anonymity_network: false,
    papers: { ...NINE_LAW_PAPERS },
  };
}

export function nineLawsFrame() {
  return {
    nine_laws: nineLawsHint(),
    ...nineLawsLaunchCite(),
    payload_plane: PAYLOAD_PLANE,
    tick_ms_min: TICK_MS_MIN,
    tick_ms_max: TICK_MS_MAX,
    tick_body: false,
    tick_diff: false,
    tick_file: false,
    clocks_share_socket: clocksShareSocket(),
    live_body_sync: false,
    named_hosts_only: true,
    tip_content_addressed: true,
    isolation_is_the_cure: REHEAL_LAW.isolation_is_the_cure === true,
    neighbor_heal: false,
    vote_to_fix: false,
    bodies: false,
    diffs: false,
    phoenix_local_only: true,
    neighbor_phoenix: false,
    public_hostname_resurrection: false,
    die_with_pull: true,
    restore_godlock_uk: false,
    climb_public_hostname: false,
    apply_last_packet_on_heartbeat_loss: false,
    node_gate: false,
    login_mesh: false,
    login_recovery: false,
    ip_panel: false,
    get_is_node_gate: false,
    implicit_heal: false,
    auto_heal: false,
    heartbeat_loss_isolates: false,
    apply_last_packet: false,
    anonymity_network: false,
    vpn: false,
    origin_hiding: false,
    godlock_is_identity: false,
    papers: { ...NINE_LAW_PAPERS },
  };
}

function baseRefuse(law, code, message, extra = {}) {
  return {
    ok: false,
    law,
    code,
    author: NINE_LAWS_AUTHOR,
    identity: NINE_LAWS_IDENTITY,
    nine_laws: nineLawsHint(),
    message,
    ...nineLawsFrame(),
    ...extra,
  };
}

export function looksLikeNeighborHeal(src) {
  return anyFlag(src, [
    "neighbor_heal",
    "listen_neighbors",
    "listen_to_neighbors",
    "heal_from_neighbors",
    "talk_back",
    "vote_to_fix",
    "majority_vote",
  ]);
}

export function looksLikeApplyLastPacket(src) {
  return anyFlag(src, [
    "apply_last_packet",
    "apply_last_packet_on_heartbeat_loss",
    "replay_last_packet",
    "heartbeat_loss_heal",
  ]);
}

export function looksLikeAutoHeal(src) {
  return anyFlag(src, ["auto_heal", "implicit_heal", "heal_on_loss", "heal_on_heartbeat_loss"]);
}

export function looksLikeNeighborPhoenix(src) {
  if (anyFlag(src, ["neighbor_phoenix", "neighbor_phoenixed", "phoenix_because_neighbor", "public_phoenix"])) {
    return true;
  }
  const judged = neighborPhoenix({
    neighbor_phoenixed: flagOn(src, "neighbor_phoenixed") || flagOn(src, "neighbor_phoenix"),
  });
  return judged.phoenix === false && judged.reason === "neighbors-do-not-phoenix";
}

export function looksLikeHostnameRestore(src) {
  if (
    anyFlag(src, [
      "restore_godlock_uk",
      "restore_godlock",
      "bring_uk_back",
      "public_hostname_resurrection",
      "climb_public_hostname",
      "resurrect_hostname",
      "hostname_restore",
    ])
  ) {
    return true;
  }
  const hosts = hostnameBlob(src);
  if (!hosts) return false;
  const restore = anyFlag(src, ["restore", "resurrect", "resurrection", "phoenix_public"]);
  return restore && (looksLikeGodlockUk(hosts) || /[a-z0-9.-]+\.[a-z]{2,}/.test(hosts));
}

export function looksLikeNodeGate(src) {
  return anyFlag(src, [
    "node_gate",
    "gate",
    "ip_panel",
    "ippanel",
    "login_recovery",
    "login_mesh",
  ]);
}

export function looksLikeAnonymityClaim(src) {
  return anyFlag(src, [
    "anonymity_network",
    "anonymity",
    "vpn",
    "origin_hiding",
    "hide_origin",
    "conceal_origin",
  ]);
}

export function looksLikeSharedSocket(src) {
  return flagOn(src, "clocks_share_socket") || flagOn(src, "share_socket") || flagOn(src, "clocks_share");
}

export function looksLikeLiveBodySyncClaim(src) {
  return flagOn(src, "live_body_sync");
}

export function refuseNineLawViolation(src = {}, op = "") {
  const resolved = String(op || "")
    .trim()
    .toLowerCase();
  const body = src && typeof src === "object" && !Array.isArray(src) ? src : {};

  if (looksLikeSharedSocket(body)) {
    return baseRefuse(
      "split-wires",
      NINE_LAW_REFUSE_CODES["split-wires-clocks"],
      "The 1s loop and the 777s gate never share a socket. clocks_share_socket stays false.",
      { reason: "clocks-share-socket-refused", clocks_share_socket: false },
    );
  }
  if (looksLikeLiveBodySyncClaim(body)) {
    return baseRefuse(
      "cold-copy",
      NINE_LAW_REFUSE_CODES["cold-copy"],
      "Live body sync is refused. Cold copies are pull-only. Named hosts only.",
      { reason: "live-body-sync-refused", live_body_sync: false },
    );
  }
  if (looksLikeNeighborHeal(body)) {
    const hug = neighborTalkHeal();
    return baseRefuse(
      "neighbor-heal",
      hug.code,
      "Isolation is the cure. Heal from own last good tip + verified trusted pull, or phoenix-WAIT. Never by listening to neighbors.",
      { reason: hug.reason, isolation_is_the_cure: true, neighbor_heal: false, vote_to_fix: false },
    );
  }
  if (looksLikeApplyLastPacket(body)) {
    return baseRefuse(
      "neighbor-heal",
      NINE_LAW_REFUSE_CODES["neighbor-heal"],
      "Heartbeat loss is not poison and does not apply last packet. Neighbor talk-back-to-health is refused.",
      { reason: "apply-last-packet-refused", apply_last_packet: false, apply_last_packet_on_heartbeat_loss: false },
    );
  }
  if (looksLikeHostnameRestore(body) || looksLikeGodlockUk(resolved)) {
    return baseRefuse(
      "die-with-pull",
      NINE_LAW_REFUSE_CODES["die-with-pull"],
      "Sites pulled die with the pull. Mesh refuses resurrect / hostname-restore for godlock.uk and public hostnames. GodLock is a product name, not identity.",
      {
        reason: "hostname-restore-refused",
        restore_godlock_uk: false,
        public_hostname_resurrection: false,
        climb_public_hostname: false,
        godlock_is_identity: false,
      },
    );
  }
  if (looksLikeNeighborPhoenix(body)) {
    return baseRefuse(
      "phoenix",
      NINE_LAW_REFUSE_CODES.phoenix,
      "Phoenix is local wait / re-seal on the failed node. Neighbors do not phoenix because a neighbor phoenix’d. Not public hostname resurrection.",
      {
        reason: "neighbor-phoenix-refused",
        phoenix_local_only: true,
        neighbor_phoenix: false,
        public_hostname_resurrection: false,
      },
    );
  }
  if (looksLikeAutoHeal(body)) {
    return baseRefuse(
      "auto-heal",
      NINE_LAW_REFUSE_CODES["auto-heal"],
      "No implicit heal. Tethers drop clean. Heartbeat loss is not poison and does not apply last packet.",
      { reason: "auto-heal-refused", implicit_heal: false, auto_heal: false },
    );
  }
  if (looksLikeNodeGate(body)) {
    return baseRefuse(
      "node-gate",
      NINE_LAW_REFUSE_CODES["node-gate"],
      "No Node Gate / IP panel / login-recovery on the public mesh. GET /v1/mesh is never a Node Gate.",
      { reason: "node-gate-refused", node_gate: false, get_is_node_gate: false, ip_panel: false, login_recovery: false },
    );
  }
  if (looksLikeAnonymityClaim(body)) {
    return baseRefuse(
      "anonymity",
      NINE_LAW_REFUSE_CODES.anonymity,
      "Not a VPN and not an anonymity network. No origin-hiding claim. GodLock is a product name, not identity.",
      { reason: "anonymity-claim-refused", anonymity_network: false, vpn: false, origin_hiding: false },
    );
  }
  return null;
}

function searchLooksLike(searchParams, keys) {
  if (!searchParams || typeof searchParams.get !== "function") return false;
  for (const key of keys) {
    const raw = searchParams.get(key);
    if (raw == null || raw === "") continue;
    if (TRUTHY.has(String(raw).trim().toLowerCase())) return true;
    if (key === "op") {
      const v = String(raw).trim().toLowerCase();
      if (
        [
          "gate",
          "node-gate",
          "node_gate",
          "ip-panel",
          "login",
          "recover",
          "recovery",
          "resurrect",
          "resurrection",
          "restore",
          "vpn",
          "heal",
          "auto-heal",
          "anonymity",
        ].includes(v)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function meshGetLooksLikeNineLawViolation(searchParams, payload) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (refuseNineLawViolation(src, src.op || "")) return true;
  return searchLooksLike(searchParams, [
    "node_gate",
    "gate",
    "ip_panel",
    "ippanel",
    "login_recovery",
    "restore_godlock_uk",
    "resurrect",
    "resurrection",
    "public_hostname_resurrection",
    "vpn",
    "anonymity",
    "origin_hiding",
    "auto_heal",
    "implicit_heal",
    "apply_last_packet",
    "neighbor_heal",
    "vote_to_fix",
    "op",
  ]);
}

export function refuseNineLawGet(searchParams, payload) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const fromBody = refuseNineLawViolation(src, src.op || "");
  if (fromBody) return fromBody;
  if (!meshGetLooksLikeNineLawViolation(searchParams, payload)) return null;
  const op = searchParams && typeof searchParams.get === "function" ? String(searchParams.get("op") || "").toLowerCase() : "";
  if (["gate", "node-gate", "node_gate", "ip-panel", "login", "recover", "recovery"].includes(op) || searchLooksLike(searchParams, ["node_gate", "gate", "ip_panel", "ippanel", "login_recovery"])) {
    return refuseNineLawViolation({ node_gate: true }, op || "gate");
  }
  if (["resurrect", "resurrection", "restore"].includes(op) || searchLooksLike(searchParams, ["restore_godlock_uk", "resurrect", "resurrection", "public_hostname_resurrection"])) {
    return refuseNineLawViolation({ restore_godlock_uk: true }, op || "resurrect");
  }
  if (["vpn", "anonymity"].includes(op) || searchLooksLike(searchParams, ["vpn", "anonymity", "origin_hiding"])) {
    return refuseNineLawViolation({ anonymity_network: true }, op || "vpn");
  }
  if (["heal", "auto-heal"].includes(op) || searchLooksLike(searchParams, ["auto_heal", "implicit_heal", "apply_last_packet"])) {
    return refuseNineLawViolation({ auto_heal: true }, op || "heal");
  }
  if (searchLooksLike(searchParams, ["neighbor_heal", "vote_to_fix"])) {
    return refuseNineLawViolation({ neighbor_heal: true }, "heartbeat");
  }
  return refuseNineLawViolation({ node_gate: true }, "gate");
}

export function assertNineLawsHardTrue(obj) {
  const missing = [];
  if (!obj || typeof obj !== "object") return { ok: false, missing: ["object"] };
  for (const law of NINE_LAWS) {
    for (const [key, expected] of Object.entries(law.fields)) {
      if (obj[key] !== expected) missing.push(`${law.slug}.${key}`);
    }
  }
  if (obj.nine_laws?.hard_true !== true) missing.push("nine_laws.hard_true");
  if (obj.godlock_is_identity !== false) missing.push("godlock_is_identity");
  if (obj.author_id !== AUTHOR_ID) missing.push("author_id");
  if (obj.runtime_id !== RUNTIME_SOFTWARE_ID) missing.push("runtime_id");
  if (obj.hashtag_parts?.person !== NINE_LAWS_HASHTAG_PARTS.person) missing.push("hashtag_parts.person");
  if (obj.hashtag_parts?.runtime !== NINE_LAWS_HASHTAG_PARTS.runtime) missing.push("hashtag_parts.runtime");
  if (obj.about?.always !== true) missing.push("about.always");
  if (obj.about?.path !== "/about") missing.push("about.path");
  if (obj.about?.identity !== NINE_LAWS_IDENTITY) missing.push("about.identity");
  if (obj.papers?.node_mesh !== NINE_LAW_PAPERS.node_mesh) missing.push("papers.node_mesh");
  if (obj.papers?.sec_feat !== NINE_LAW_PAPERS.sec_feat) missing.push("papers.sec_feat");
  if (obj.papers?.node_ops !== NINE_LAW_PAPERS.node_ops) missing.push("papers.node_ops");
  if (obj.papers?.qnm_wp !== NINE_LAW_PAPERS.qnm_wp) missing.push("papers.qnm_wp");
  return { ok: missing.length === 0, missing };
}
