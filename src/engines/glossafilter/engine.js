/**
 * Glossa Filter engine (port of workers/download-tracker/src/runtime.js).
 * Mediation, not concealment. Author: Aziel Eliab.
 */
export const PRODUCT = "glossafilter";
export const VERSION = "0.1.0";
export const MOTTO = "Human opinion remains human, and tools remain tools.";
export const LIMITATION = "THIS IS: deterministic linguistic mediation into peer renders. THIS IS NOT: concealment, a live translator API, authorship stamping, or a canonical phrasing.";
const CHANNELS = new Set(["tooling", "civic"]);
const SLOT_KEYS = ["who", "what", "when", "action", "constraint", "interface"];
const IDENTITY_FIELDS = new Set(["author","github","real_name","realname","real-name","identity","full_name","fullname","twitter","email"]);
const PHILOSOPHY_FIELDS = new Set(["philosophy","ideology","belief","doctrine","creed","worldview","partisan"]);
const CANONICAL_FIELDS = new Set(["canonical","primary","authoritative"]);
const PUNCT = `!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`;

const PACKS_RAW = {
  "en-formal": {
    "peer_id": "en-formal",
    "label": "English (formal)",
    "templates": {
      "proposition": "{subject} {rel} {object}.",
      "blurb": "{action} {interface}."
    },
    "glossary": {
      "package": "package",
      "release": "issues",
      "filter": "filter",
      "tool": "instrument",
      "interface": "interface",
      "behavior": "specified behavior",
      "binds": "attaches",
      "bind": "attaches",
      "channel": "channel",
      "loopback": "loopback interface",
      "speech": "speech",
      "remains": "remains",
      "human": "human",
      "tools": "instruments"
    },
    "register_variants": {
      "release": [
        "issues",
        "disseminates",
        "promulgates"
      ],
      "binds": [
        "attaches",
        "associates",
        "connects"
      ]
    }
  },
  "en-plain": {
    "peer_id": "en-plain",
    "label": "English (plain)",
    "templates": {
      "proposition": "{subject} {rel} {object}.",
      "blurb": "{action} {interface}."
    },
    "glossary": {
      "package": "package",
      "release": "ships",
      "filter": "filter",
      "tool": "tool",
      "interface": "interface",
      "behavior": "behavior",
      "binds": "binds",
      "bind": "binds",
      "channel": "channel",
      "loopback": "loopback",
      "speech": "speech",
      "remains": "stays",
      "human": "human",
      "tools": "tools"
    },
    "register_variants": {
      "release": [
        "ships",
        "puts out",
        "sends out"
      ],
      "binds": [
        "binds",
        "hooks to",
        "listens on"
      ]
    }
  },
  "es": {
    "peer_id": "es",
    "label": "Español",
    "templates": {
      "proposition": "{subject} {rel} {object}.",
      "blurb": "{action} {interface}."
    },
    "glossary": {
      "package": "paquete",
      "release": "publica",
      "filter": "filtro",
      "tool": "herramienta",
      "interface": "interfaz",
      "behavior": "comportamiento",
      "binds": "enlaza",
      "bind": "enlaza",
      "channel": "canal",
      "loopback": "bucle local",
      "speech": "habla",
      "remains": "permanece",
      "human": "humana",
      "tools": "herramientas"
    },
    "register_variants": {
      "release": [
        "publica",
        "emite",
        "expide"
      ],
      "binds": [
        "enlaza",
        "vincula",
        "asocia"
      ]
    }
  },
  "fr": {
    "peer_id": "fr",
    "label": "Français",
    "templates": {
      "proposition": "{subject} {rel} {object}.",
      "blurb": "{action} {interface}."
    },
    "glossary": {
      "package": "paquet",
      "release": "publie",
      "filter": "filtre",
      "tool": "outil",
      "interface": "interface",
      "behavior": "comportement",
      "binds": "lie",
      "bind": "lie",
      "channel": "canal",
      "loopback": "boucle locale",
      "speech": "parole",
      "remains": "demeure",
      "human": "humaine",
      "tools": "outils"
    },
    "register_variants": {
      "release": [
        "publie",
        "émet",
        "diffuse"
      ],
      "binds": [
        "lie",
        "associe",
        "relie"
      ]
    }
  },
  "ht": {
    "peer_id": "ht",
    "label": "Kreyòl Ayisyen",
    "templates": {
      "proposition": "{subject} {rel} {object}.",
      "blurb": "{action} {interface}."
    },
    "glossary": {
      "package": "pake",
      "release": "lage",
      "filter": "filtè",
      "tool": "zouti",
      "interface": "entèfas",
      "behavior": "konpòtman",
      "binds": "mare",
      "bind": "mare",
      "channel": "kanal",
      "loopback": "loopback",
      "speech": "pawòl",
      "remains": "rete",
      "human": "moun",
      "tools": "zouti"
    },
    "register_variants": {
      "release": [
        "lage",
        "voye",
        "pibliye"
      ]
    }
  },
  "pt": {
    "peer_id": "pt",
    "label": "Português",
    "templates": {
      "proposition": "{subject} {rel} {object}.",
      "blurb": "{action} {interface}."
    },
    "glossary": {
      "package": "pacote",
      "release": "publica",
      "filter": "filtro",
      "tool": "ferramenta",
      "interface": "interface",
      "behavior": "comportamento",
      "binds": "vincula",
      "bind": "vincula",
      "channel": "canal",
      "loopback": "loopback",
      "speech": "fala",
      "remains": "permanece",
      "human": "humana",
      "tools": "ferramentas"
    },
    "register_variants": {
      "release": [
        "publica",
        "emite",
        "divulga"
      ],
      "binds": [
        "vincula",
        "liga",
        "associa"
      ]
    }
  }
};
export class GlossaError extends Error {
  constructor(message, code = 400) {
    super(message);
    this.code = code;
    this.name = "GlossaError";
  }
}

function normKey(key) {
  return String(key).trim().toLowerCase().replace(/-/g, "_");
}

function rejectForbiddenKeys(data, channel) {
  for (const [key, value] of Object.entries(data || {})) {
    const nk = normKey(key);
    if (IDENTITY_FIELDS.has(nk) || IDENTITY_FIELDS.has(key)) {
      throw new GlossaError(`identity field '${key}' is not allowed on Intent; authorship is not stamped onto renders`);
    }
    if (CANONICAL_FIELDS.has(nk) && value) {
      throw new GlossaError("one language treated as authoritative; all outputs are peers");
    }
    if (PHILOSOPHY_FIELDS.has(nk) && channel === "tooling") {
      throw new GlossaError("philosophy/ideology fields on channel=tooling are a failure, not a render");
    }
  }
}

function sortedJson(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(sortedJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + sortedJson(value[k])).join(",") + "}";
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadPacks() {
  const packs = {};
  for (const raw of Object.values(PACKS_RAW)) {
    for (const flag of ["canonical", "primary", "authoritative"]) {
      if (raw[flag]) throw new GlossaError("one language treated as authoritative; all outputs are peers");
    }
    const peer_id = String(raw.peer_id || "").trim();
    const templates = {};
    for (const [k, v] of Object.entries(raw.templates || {})) {
      if (String(v).trim()) templates[String(k)] = String(v);
    }
    if (!templates.proposition) templates.proposition = "{subject} {rel} {object}.";
    if (!templates.blurb) templates.blurb = "{action} {interface}.";
    const glossary = {};
    for (const [k, v] of Object.entries(raw.glossary || {})) {
      if (String(k).trim() && String(v).trim()) glossary[String(k).trim().toLowerCase()] = String(v);
    }
    const variants = {};
    for (const [k, values] of Object.entries(raw.register_variants || {})) {
      const lemma = String(k).trim().toLowerCase();
      if (!lemma) continue;
      const items = Array.isArray(values) ? values.map(String).filter((x) => x.trim()) : [String(values)];
      if (items.length) variants[lemma] = items;
    }
    packs[peer_id] = {
      peer_id,
      label: String(raw.label || peer_id).trim(),
      templates,
      glossary,
      register_variants: variants,
    };
  }
  return packs;
}

const PACKS = loadPacks();

export function parseIntent(data) {
  if (!data || typeof data !== "object") {
    throw new GlossaError("empty intent is a failure, not a render");
  }
  const channel = String(data.channel || "tooling").trim().toLowerCase();
  rejectForbiddenKeys(data, channel);
  if (!CHANNELS.has(channel)) {
    throw new GlossaError(`channel must be 'tooling' or 'civic', not '${channel}'`);
  }
  let slotsRaw = data.slots || {};
  if (slotsRaw && typeof slotsRaw !== "object") throw new GlossaError("slots must be a mapping");
  if (slotsRaw && typeof slotsRaw === "object") rejectForbiddenKeys(slotsRaw, channel);
  const propositions = [];
  const rawProps = data.propositions;
  if (Array.isArray(rawProps)) {
    for (const item of rawProps) {
      if (item && typeof item === "object") {
        propositions.push({
          subject: String(item.subject || ""),
          rel: String(item.rel || ""),
          object: String(item.object || ""),
        });
      }
    }
  }
  if (!propositions.length && (data.subject || data.rel || data.object)) {
    propositions.push({
      subject: String(data.subject || ""),
      rel: String(data.rel || ""),
      object: String(data.object || ""),
    });
  }
  const extra = data.extra_props || data.proposition;
  if (Array.isArray(extra)) {
    for (const raw of extra) {
      const parts = String(raw).split("|").map((p) => p.trim());
      while (parts.length < 3) parts.push("");
      propositions.push({ subject: parts[0], rel: parts[1], object: parts[2] });
    }
  }
  const notes = String(data.notes || data.note || "").trim();
  const slots = {};
  for (const [key, value] of Object.entries(slotsRaw || {})) {
    const nk = normKey(key);
    const text = String(value).trim();
    if (text) slots[nk] = text;
  }
  for (const key of SLOT_KEYS) {
    if (data[key] != null && data[key] !== "") slots[key] = String(data[key]);
  }
  if (channel !== "tooling" && channel !== "civic") {
    throw new GlossaError(`channel must be 'tooling' or 'civic', not '${channel}'`);
  }
  if (!propositions.length || propositions.every((p) => !(p.subject.trim() || p.rel.trim() || p.object.trim()))) {
    throw new GlossaError("empty intent is a failure, not a render");
  }
  if (channel === "tooling" && notes) {
    throw new GlossaError("notes are civic-only; mixing philosophy into tooling is a failure, not a render");
  }
  rejectForbiddenKeys(slots, channel);
  return {
    propositions: propositions.map((p) => ({
      subject: p.subject.trim(),
      rel: p.rel.trim(),
      object: p.object.trim(),
    })),
    slots,
    channel,
    notes: channel === "civic" ? notes : "",
  };
}

function canonicalDict(intent) {
  return {
    channel: intent.channel,
    notes: intent.channel === "civic" ? intent.notes : "",
    propositions: intent.propositions.map((p) => ({
      object: p.object,
      rel: p.rel,
      subject: p.subject,
    })),
    slots: Object.fromEntries(Object.keys(intent.slots).sort().map((k) => [k, intent.slots[k]])),
  };
}

function splitPunct(token) {
  let start = 0;
  let end = token.length;
  while (start < end && PUNCT.includes(token[start])) start += 1;
  while (end > start && PUNCT.includes(token[end - 1])) end -= 1;
  return [token.slice(0, start), token.slice(start, end), token.slice(end)];
}

function matchCase(original, surface) {
  if (!original || !surface) return surface;
  if (original === original.toUpperCase() && original.length > 1) return surface.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return surface[0].toUpperCase() + surface.slice(1);
  return surface;
}

function pickVariantIndex(digestHex, peerId, lemma, n) {
  if (n <= 0) return 0;
  // sync fallback not used; this is called after we have digest bytes via hex
  return 0;
}

async function pickVariantIndexAsync(digest, peerId, lemma, n) {
  if (n <= 0) return 0;
  const material = new TextEncoder().encode(`${digest}|${peerId}|${lemma}`);
  const hashed = new Uint8Array(await crypto.subtle.digest("SHA-256", material));
  let n64 = 0n;
  for (let i = 0; i < 8; i++) n64 = (n64 << 8n) + BigInt(hashed[i]);
  return Number(n64 % BigInt(n));
}

function formatMap(tmpl, map) {
  return tmpl.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => (map[k] != null ? map[k] : ""));
}

function auditRow(id, kind, peer, extra = {}) {
  const row = { id, kind, peer };
  for (const key of Object.keys(extra).sort()) row[key] = extra[key];
  return row;
}

async function surface(text, pack, digest, audit) {
  if (!text) return "";
  const out = [];
  for (const token of text.split(/\s+/)) {
    const [lead, core, trail] = splitPunct(token);
    const lemma = core.toLowerCase();
    if (!lemma) {
      out.push(token);
      continue;
    }
    if (pack.register_variants[lemma]) {
      const variants = pack.register_variants[lemma];
      const idx = await pickVariantIndexAsync(digest, pack.peer_id, lemma, variants.length);
      const s = matchCase(core, variants[idx]);
      audit.push(auditRow(`register:${pack.peer_id}:${lemma}`, "register_variant", pack.peer_id, { lemma, surface: s }));
      out.push(`${lead}${s}${trail}`);
    } else if (pack.glossary[lemma]) {
      const s = matchCase(core, pack.glossary[lemma]);
      audit.push(auditRow(`glossary:${pack.peer_id}:${lemma}`, "glossary", pack.peer_id, { lemma, surface: s }));
      out.push(`${lead}${s}${trail}`);
    } else {
      out.push(token);
    }
  }
  return out.join(" ");
}

async function renderPeer(intent, pack, digest) {
  const audit = [auditRow(`pack:${pack.peer_id}`, "pack", pack.peer_id, { label: pack.label })];
  const lines = [];
  const propTmpl = pack.templates.proposition || "{subject} {rel} {object}.";
  for (const prop of intent.propositions) {
    const subject = await surface(prop.subject, pack, digest, audit);
    const rel = await surface(prop.rel, pack, digest, audit);
    const obj = await surface(prop.object, pack, digest, audit);
    audit.push(auditRow(`template:${pack.peer_id}:proposition`, "template", pack.peer_id, { template: "proposition" }));
    const mapping = { subject, rel, object: obj };
    for (const [k, v] of Object.entries(intent.slots)) {
      mapping[k] = await surface(v, pack, digest, audit);
    }
    lines.push(formatMap(propTmpl, mapping).trim());
  }
  if (Object.keys(intent.slots).length) {
    const blurbTmpl = pack.templates.blurb || "";
    if (blurbTmpl) {
      const surfacedSlots = {};
      for (const [k, v] of Object.entries(intent.slots)) {
        surfacedSlots[k] = await surface(v, pack, digest, audit);
      }
      audit.push(auditRow(`template:${pack.peer_id}:blurb`, "template", pack.peer_id, { template: "blurb" }));
      const blurb = formatMap(blurbTmpl, surfacedSlots).trim();
      if (blurb) lines.push(blurb);
    }
  }
  if (intent.channel === "civic" && intent.notes) {
    const noteLine = await surface(intent.notes, pack, digest, audit);
    if (noteLine) lines.push(noteLine);
  }
  return { text: lines.filter(Boolean).join("\n"), audit };
}

export async function render(intent, peers) {
  if (intent.canonical || intent.primary || intent.authoritative || intent.canonical_peer) {
    throw new GlossaError("one language treated as authoritative; all outputs are peers");
  }
  const digest = await sha256Hex(sortedJson(canonicalDict(intent)));
  let selected;
  if (peers == null) selected = Object.keys(PACKS).sort();
  else {
    selected = Array.isArray(peers) ? peers : [peers];
    const unknown = selected.filter((p) => !PACKS[p]);
    if (unknown.length) {
      throw new GlossaError(`unknown peer(s) ${JSON.stringify(unknown)}; bundled: ${JSON.stringify(Object.keys(PACKS).sort())}`);
    }
    selected = [...new Set(selected)].sort();
  }
  const texts = {};
  const audit = [];
  for (const peerId of selected) {
    const { text, audit: entries } = await renderPeer(intent, PACKS[peerId], digest);
    texts[peerId] = text;
    audit.push(...entries);
  }
  const ordered = Object.fromEntries(Object.keys(texts).sort().map((k) => [k, texts[k]]));
  return { audit, digest, peers: ordered, texts: ordered, motto: MOTTO, product: PRODUCT, version: VERSION };
}

export function listPeers() {
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    note: "All peers are equal. None is primary. Mediation, not concealment. No live translator APIs.",
    peers: Object.keys(PACKS).sort().map((id) => ({ peer_id: id, label: PACKS[id].label })),
  };
}
