/**
 * 4DMap engine (4DM-WP-1.0).
 * Four-axis inspection frame T / Δ / Γ / Π.
 * Inspection frame after AZPIPE — not an extra door (domains_are_doors:false).
 * NOT a sequential gate. Neighbors: TemporalLock, StaticClock, ChronoLock,
 * TrajectoryLock, SpectralLock. ChainLock may stamp walks.
 * FragGate claims cite join types.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "4dmap";
export const NAME = "4DMap";
export const VERSION = "0.1.0";
export const SPEC = "4DM-WP-1.0";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Inspect on four axes. Do not invent a mark. Do not score truth.";
export const ROLE = "four-axis inspection frame T/Δ/Γ/Π";
export const LAYER = "domain_door";
export const SEQUENTIAL_GATE = false;
export const CARD_CAP = 64;
export const WALK_CAP = 32;
export const MARK_CAP = 240;
export const LABEL_CAP = 120;
export const ID_CAP = 80;
export const GENESIS_PREV = "0".repeat(64);

export const AXES = Object.freeze(["T", "Δ", "Γ", "Π"]);

export const AXIS_ALIASES = Object.freeze({
  t: "T",
  time: "T",
  temporal: "T",
  tau: "T",
  d: "Δ",
  delta: "Δ",
  change: "Δ",
  g: "Γ",
  gamma: "Γ",
  class: "Γ",
  genus: "Γ",
  spectral: "Γ",
  p: "Π",
  pi: "Π",
  path: "Π",
  walk: "Π",
  projection: "Π",
});

export const AXIS_NEIGHBORS = Object.freeze({
  T: ["temporallock", "staticclock", "chronolock"],
  Δ: ["temporallock", "trajectorylock"],
  Γ: ["spectrallock"],
  Π: ["trajectorylock"],
});

export const NEIGHBORS = Object.freeze([
  "temporallock",
  "staticclock",
  "chronolock",
  "trajectorylock",
  "spectrallock",
]);

export const JOIN_TYPES = Object.freeze([
  "pin",
  "span",
  "join",
  "walk",
  "overlay",
  "cite",
  "neighbor",
  "inspect",
]);

export const JOIN_TYPE_ALIASES = Object.freeze({
  pin: "pin",
  pinned: "pin",
  span: "span",
  join: "join",
  walk: "walk",
  overlay: "overlay",
  cite: "cite",
  citation: "cite",
  neighbor: "neighbor",
  neighbour: "neighbor",
  inspect: "inspect",
});

export const STUB_REFUSE = Object.freeze([
  "truth_score",
  "lumen_panel",
  "invent_mark",
  "backdate_class",
]);

export const LIMITATION =
  "THIS IS: 4DMap 4DM-WP-1.0 — a four-axis inspection frame T/Δ/Γ/Π. Inspection frame after AZPIPE routes to isolated engines (not an extra door; domains_are_doors:false). Cards pin, span, join, and walk declared marks. FragGate claims cite join types. ChainLock may stamp walks. THIS IS NOT: a sequential gate (DecisionGATE is); a truth score; a Lumen panel; an invented mark; a backdated class; TemporalLock; StaticClock; ChronoLock; TrajectoryLock; SpectralLock; AZ-OS / Lumen. Mesh default off. GET /v1/mesh never enables. EmbryoLock stays stub. Author: Aziel Eliab only.";

const FORBIDDEN_KEYS = Object.freeze({
  truth_score: { kind: "truth_score", code: "4DM-TRUTH-REFUSE" },
  truth: { kind: "truth_score", code: "4DM-TRUTH-REFUSE" },
  lumen_panel: { kind: "lumen_panel", code: "4DM-LUMEN-REFUSE" },
  lumen: { kind: "lumen_panel", code: "4DM-LUMEN-REFUSE" },
  invent_mark: { kind: "invent_mark", code: "4DM-INVENT-REFUSE" },
  invent: { kind: "invent_mark", code: "4DM-INVENT-REFUSE" },
  invented: { kind: "invent_mark", code: "4DM-INVENT-REFUSE" },
  fabricate: { kind: "invent_mark", code: "4DM-INVENT-REFUSE" },
  backdate_class: { kind: "backdate_class", code: "4DM-BACKDATE-REFUSE" },
  backdate: { kind: "backdate_class", code: "4DM-BACKDATE-REFUSE" },
  backdated: { kind: "backdate_class", code: "4DM-BACKDATE-REFUSE" },
});

const FORBIDDEN_TEXT =
  /\b(truth[-_ ]?score|lumen([-_ ]panel)?|invent([-_ ]mark)?|backdate([-_ ]class)?)\b/i;

const memory = {
  cards: new Map(),
  walks: new Map(),
  seq: 0,
};

export function resetFourdmapStore() {
  memory.cards = new Map();
  memory.walks = new Map();
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

export function normalizeAxis(raw) {
  const s = String(raw || "")
    .trim();
  if (AXES.includes(s)) return s;
  const key = s.toLowerCase();
  return AXIS_ALIASES[key] || null;
}

export function normalizeJoinType(raw) {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return JOIN_TYPE_ALIASES[key] || null;
}

export function joinTypeForOp(op) {
  const verb = String(op || "").trim();
  if (verb === "card_pin") return "pin";
  if (verb === "card_span") return "span";
  if (verb === "card_join") return "join";
  if (verb === "card_walk") return "walk";
  if (verb === "verify_hash") return "cite";
  return "inspect";
}

export function detectForbidden(payload) {
  const src = srcOf(payload);
  for (const [key, spec] of Object.entries(FORBIDDEN_KEYS)) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const val = src[key];
    if (val === false || val == null || val === "") continue;
    return spec;
  }
  for (const val of Object.values(src)) {
    if (typeof val !== "string") continue;
    if (!FORBIDDEN_TEXT.test(val)) continue;
    const text = val.toLowerCase();
    if (text.includes("truth")) return FORBIDDEN_KEYS.truth_score;
    if (text.includes("lumen")) return FORBIDDEN_KEYS.lumen_panel;
    if (text.includes("backdate")) return FORBIDDEN_KEYS.backdate_class;
    return FORBIDDEN_KEYS.invent_mark;
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
    sequential_gate: false,
    layer: LAYER,
    truth_score: false,
    lumen_panel: false,
    invent_mark: false,
    backdate_class: false,
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
    sequential_gate: SEQUENTIAL_GATE,
    layer: LAYER,
    axes: AXES.slice(),
    neighbors: NEIGHBORS.slice(),
    join_types: JOIN_TYPES.slice(),
    mesh_enabled_default: false,
    limitation: LIMITATION,
    author: AUTHOR,
    ...extra,
  };
}

function emptyAxes() {
  return { T: null, Δ: null, Γ: null, Π: null };
}

function canonicalJson(value) {
  return JSON.stringify(value, (k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out = {};
      for (const key of Object.keys(v).sort()) out[key] = v[key];
      return out;
    }
    return v;
  });
}

export async function sha256Hex(data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashCard(card) {
  return sha256Hex(
    canonicalJson({
      axes: card.axes,
      card_id: card.card_id,
      created_at: card.created_at,
      joins: card.joins,
      label: card.label,
      prev_hash: card.prev_hash,
      spans: card.spans,
    }),
  );
}

function cardView(card) {
  return {
    card_id: card.card_id,
    label: card.label,
    axes: { ...card.axes },
    spans: card.spans.map((s) => ({ ...s })),
    joins: card.joins.map((j) => ({ ...j })),
    created_at: card.created_at,
    prev_hash: card.prev_hash,
    card_hash: card.card_hash,
  };
}

function walkView(walk) {
  return {
    walk_id: walk.walk_id,
    card_ids: walk.card_ids.slice(),
    join_types: walk.join_types.slice(),
    card_hashes: walk.card_hashes.slice(),
    created_at: walk.created_at,
    walk_hash: walk.walk_hash,
    chainlock_may_stamp: true,
  };
}

export function fourdmapHealth() {
  return baseResult({
    op: "health",
    status: "ok",
    role: ROLE,
    motto: MOTTO,
    live: true,
    cards: memory.cards.size,
    walks: memory.walks.size,
  });
}

export function fourdmapSkill() {
  return baseResult({
    op: "skill",
    markdown: `# 4DMap (4DM-WP-1.0)

Four-axis inspection frame **T / Δ / Γ / Π**. Inspection frame after AZPIPE (not an extra door; \`domains_are_doors:false\`). **Not a sequential gate.**

- MCP: \`fraggate_call\` with \`{ slug: "4dmap", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same envelope
- FragGate claims cite join types: pin, span, join, walk, overlay, cite, neighbor, inspect
- Leftover flat names such as \`4dmap_card_new\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

LIVE_OPS: health, skill, card_new, card_pin, card_span, card_join, card_walk, card_list, verify_hash.

Stubs (refuse): truth_score, lumen_panel, invent_mark, backdate_class.

Neighbors: TemporalLock, StaticClock, ChronoLock, TrajectoryLock, SpectralLock. ChainLock may stamp walks.

Author: Aziel Eliab only.
Limitation: ${LIMITATION}
`,
    skill: `# 4DMap (4DM-WP-1.0)

Four-axis inspection frame T/Δ/Γ/Π. Inspection frame after AZPIPE, not an extra door. Not a sequential gate.

LIVE_OPS: health, skill, card_new, card_pin, card_span, card_join, card_walk, card_list, verify_hash.
Stubs: truth_score, lumen_panel, invent_mark, backdate_class.
Join types cited on FragGate claims: ${JOIN_TYPES.join(", ")}.
Neighbors: ${NEIGHBORS.join(", ")}.

Author: Aziel Eliab only.
`,
  });
}

export async function cardNew(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "card_new", join_type: "inspect" });
  if (memory.cards.size >= CARD_CAP) {
    return {
      ...refuseForbidden({ kind: "cap", code: "4DM-CAP" }, { op: "card_new" }),
      message: "Card cap reached. 4DMap does not invent overflow cards.",
    };
  }
  const src = srcOf(payload);
  memory.seq += 1;
  const created_at = nowIso();
  const card_id = clip(src.card_id, ID_CAP) || `4dm-${memory.seq}`;
  if (memory.cards.has(card_id)) {
    return {
      ...refuseForbidden({ kind: "duplicate", code: "4DM-DUP" }, { op: "card_new" }),
      message: `Card ${card_id} already exists. 4DMap does not invent a second genesis.`,
    };
  }
  const card = {
    card_id,
    label: clip(src.label || src.note, LABEL_CAP) || card_id,
    axes: emptyAxes(),
    spans: [],
    joins: [],
    created_at,
    prev_hash: GENESIS_PREV,
    card_hash: "",
  };
  card.card_hash = await hashCard(card);
  memory.cards.set(card_id, card);
  return baseResult({
    op: "card_new",
    join_type: "inspect",
    card: cardView(card),
  });
}

export async function cardPin(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "card_pin", join_type: "pin" });
  const src = srcOf(payload);
  const card = memory.cards.get(clip(src.card_id, ID_CAP));
  if (!card) {
    return {
      ...refuseForbidden({ kind: "missing", code: "4DM-MISSING" }, { op: "card_pin", join_type: "pin" }),
      message: "Unknown card_id. Pin a declared card — 4DMap does not invent marks.",
    };
  }
  const axis = normalizeAxis(src.axis);
  if (!axis) {
    return {
      ...refuseForbidden({ kind: "axis", code: "4DM-AXIS" }, { op: "card_pin", join_type: "pin" }),
      message: `Axis must be one of ${AXES.join(" / ")}.`,
    };
  }
  const mark = clip(src.mark || src.text || src.declared, MARK_CAP);
  if (!mark) {
    return refuseForbidden(
      { kind: "invent_mark", code: "4DM-INVENT-REFUSE" },
      { op: "card_pin", join_type: "pin", message: "Pin requires a declared mark. 4DMap does not invent marks." },
    );
  }
  const classAt = clip(src.class_at || src.classified_at || src.pinned_at, 40);
  if (classAt && classAt < card.created_at) {
    return refuseForbidden(
      { kind: "backdate_class", code: "4DM-BACKDATE-REFUSE" },
      { op: "card_pin", join_type: "pin", message: "4DMap refuses a backdated class. Γ/class time cannot precede card genesis." },
    );
  }
  if (axis === "Γ" && card.axes.Γ && classAt && card.axes.Γ.pinned_at && classAt < card.axes.Γ.pinned_at) {
    return refuseForbidden(
      { kind: "backdate_class", code: "4DM-BACKDATE-REFUSE" },
      { op: "card_pin", join_type: "pin", message: "4DMap refuses a backdated Γ class." },
    );
  }
  const pinned_at = classAt || nowIso();
  const klass = clip(src.class || src.genus, MARK_CAP);
  const pin = {
    axis,
    mark,
    class: klass || null,
    neighbor: clip(src.neighbor, ID_CAP) || null,
    pinned_at,
  };
  pin.hash = await sha256Hex(canonicalJson(pin));
  card.prev_hash = card.card_hash;
  card.axes[axis] = pin;
  card.card_hash = await hashCard(card);
  memory.cards.set(card.card_id, card);
  return baseResult({
    op: "card_pin",
    join_type: "pin",
    axis,
    pin,
    card: cardView(card),
  });
}

export async function cardSpan(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "card_span", join_type: "span" });
  const src = srcOf(payload);
  const card = memory.cards.get(clip(src.card_id, ID_CAP));
  if (!card) {
    return {
      ...refuseForbidden({ kind: "missing", code: "4DM-MISSING" }, { op: "card_span", join_type: "span" }),
      message: "Unknown card_id. Span declared pins only.",
    };
  }
  const from = normalizeAxis(src.from || src.a);
  const to = normalizeAxis(src.to || src.b);
  if (!from || !to || from === to) {
    return {
      ...refuseForbidden({ kind: "axis", code: "4DM-AXIS" }, { op: "card_span", join_type: "span" }),
      message: "Span needs two distinct axes from T / Δ / Γ / Π.",
    };
  }
  if (!card.axes[from] || !card.axes[to]) {
    return refuseForbidden(
      { kind: "invent_mark", code: "4DM-INVENT-REFUSE" },
      { op: "card_span", join_type: "span", message: "Span requires pins already declared on both axes. 4DMap does not invent marks." },
    );
  }
  const span = {
    from,
    to,
    note: clip(src.note, MARK_CAP) || null,
  };
  span.hash = await sha256Hex(canonicalJson({ ...span, card_id: card.card_id }));
  card.prev_hash = card.card_hash;
  card.spans.push(span);
  card.card_hash = await hashCard(card);
  memory.cards.set(card.card_id, card);
  return baseResult({
    op: "card_span",
    join_type: "span",
    span,
    card: cardView(card),
  });
}

export async function cardJoin(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "card_join", join_type: "join" });
  const src = srcOf(payload);
  const join_type = normalizeJoinType(src.join_type || src.join || "join") || "join";
  if (!JOIN_TYPES.includes(join_type)) {
    return {
      ...refuseForbidden({ kind: "join", code: "4DM-JOIN" }, { op: "card_join" }),
      message: `FragGate claims cite join types: ${JOIN_TYPES.join(", ")}.`,
    };
  }
  const a = memory.cards.get(clip(src.card_id, ID_CAP));
  const b = memory.cards.get(clip(src.other_id || src.other_card_id, ID_CAP));
  if (!a || !b) {
    return {
      ...refuseForbidden({ kind: "missing", code: "4DM-MISSING" }, { op: "card_join", join_type }),
      message: "Join needs two existing cards. 4DMap does not invent a counterpart.",
    };
  }
  if (a.card_id === b.card_id) {
    return {
      ...refuseForbidden({ kind: "join", code: "4DM-JOIN" }, { op: "card_join", join_type }),
      message: "A card cannot join itself.",
    };
  }
  const link = {
    other_id: b.card_id,
    join_type,
  };
  link.hash = await sha256Hex(canonicalJson({ a: a.card_id, b: b.card_id, join_type }));
  a.prev_hash = a.card_hash;
  a.joins.push(link);
  a.card_hash = await hashCard(a);
  memory.cards.set(a.card_id, a);
  return baseResult({
    op: "card_join",
    join_type,
    join: link,
    card: cardView(a),
    other: cardView(b),
  });
}

export async function cardWalk(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "card_walk", join_type: "walk" });
  const src = srcOf(payload);
  const ids = Array.isArray(src.card_ids) ? src.card_ids.map((id) => clip(id, ID_CAP)).filter(Boolean) : [];
  if (ids.length < 2) {
    return {
      ...refuseForbidden({ kind: "walk", code: "4DM-WALK" }, { op: "card_walk", join_type: "walk" }),
      message: "A walk needs at least two card_ids. 4DMap is not a sequential gate.",
    };
  }
  if (memory.walks.size >= WALK_CAP) {
    return {
      ...refuseForbidden({ kind: "cap", code: "4DM-CAP" }, { op: "card_walk", join_type: "walk" }),
      message: "Walk cap reached.",
    };
  }
  const cards = [];
  for (const id of ids) {
    const card = memory.cards.get(id);
    if (!card) {
      return {
        ...refuseForbidden({ kind: "missing", code: "4DM-MISSING" }, { op: "card_walk", join_type: "walk" }),
        message: `Unknown card_id ${id}. Walks do not invent cards.`,
      };
    }
    cards.push(card);
  }
  const rawJoins = Array.isArray(src.join_types) ? src.join_types : [];
  const join_types = ids.slice(1).map((_, i) => normalizeJoinType(rawJoins[i]) || "walk");
  memory.seq += 1;
  const walk_id = clip(src.walk_id, ID_CAP) || `4dm-walk-${memory.seq}`;
  const created_at = nowIso();
  const card_hashes = cards.map((c) => c.card_hash);
  const walk_hash = await sha256Hex(canonicalJson({ card_hashes, join_types, walk_id }));
  const walk = {
    walk_id,
    card_ids: ids,
    join_types,
    card_hashes,
    created_at,
    walk_hash,
  };
  memory.walks.set(walk_id, walk);
  return baseResult({
    op: "card_walk",
    join_type: "walk",
    walk: walkView(walk),
    note: "ChainLock may stamp this walk_hash. 4DMap does not write the ChainLock vault.",
  });
}

export function cardList(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "card_list", join_type: "inspect" });
  return baseResult({
    op: "card_list",
    join_type: "inspect",
    count: memory.cards.size,
    cards: [...memory.cards.values()].map(cardView),
    walks: [...memory.walks.values()].map(walkView),
  });
}

export async function verifyHash(payload) {
  const hit = detectForbidden(payload);
  if (hit) return refuseForbidden(hit, { op: "verify_hash", join_type: "cite" });
  const src = srcOf(payload);
  const want = clip(src.hash || src.card_hash || src.walk_hash, 64).toLowerCase();
  if (src.card_id) {
    const card = memory.cards.get(clip(src.card_id, ID_CAP));
    if (!card) {
      return {
        ...refuseForbidden({ kind: "missing", code: "4DM-MISSING" }, { op: "verify_hash", join_type: "cite" }),
        message: "Unknown card_id.",
      };
    }
    const recomputed = await hashCard({ ...card, card_hash: undefined });
    const match = recomputed === card.card_hash && (!want || want === card.card_hash);
    return baseResult({
      op: "verify_hash",
      join_type: "cite",
      kind: "card",
      card_id: card.card_id,
      card_hash: card.card_hash,
      recomputed,
      match,
    });
  }
  if (src.walk_id) {
    const walk = memory.walks.get(clip(src.walk_id, ID_CAP));
    if (!walk) {
      return {
        ...refuseForbidden({ kind: "missing", code: "4DM-MISSING" }, { op: "verify_hash", join_type: "cite" }),
        message: "Unknown walk_id.",
      };
    }
    const recomputed = await sha256Hex(canonicalJson({ card_hashes: walk.card_hashes, join_types: walk.join_types, walk_id: walk.walk_id }));
    const match = recomputed === walk.walk_hash && (!want || want === walk.walk_hash);
    return baseResult({
      op: "verify_hash",
      join_type: "cite",
      kind: "walk",
      walk_id: walk.walk_id,
      walk_hash: walk.walk_hash,
      recomputed,
      match,
      chainlock_may_stamp: true,
    });
  }
  if (!want) {
    return {
      ...refuseForbidden({ kind: "hash", code: "4DM-HASH" }, { op: "verify_hash", join_type: "cite" }),
      message: "Pass hash, card_id, or walk_id.",
    };
  }
  for (const card of memory.cards.values()) {
    if (card.card_hash === want) {
      return baseResult({ op: "verify_hash", join_type: "cite", kind: "card", card_id: card.card_id, match: true, card_hash: want });
    }
  }
  for (const walk of memory.walks.values()) {
    if (walk.walk_hash === want) {
      return baseResult({ op: "verify_hash", join_type: "cite", kind: "walk", walk_id: walk.walk_id, match: true, walk_hash: want, chainlock_may_stamp: true });
    }
  }
  return baseResult({
    op: "verify_hash",
    join_type: "cite",
    match: false,
    hash: want,
  });
}
