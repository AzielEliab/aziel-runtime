/**
 * AZAI hosted runtime (protocol mirror + Lamb Lens). NOT a provider proxy.
 *
 * Does not call GPT, Grok, or Venice. Does not spend the author's keys.
 * The local core is standalone. Ollama is optional SLOT, not the identity.
 *
 * Lamb order is Service → Clarity → Peace.
 */

export const LIMITATION =
  "AZAI is a standalone local core with an OpenAI-compatible local API. Ollama is optional SLOT, not the identity and not required. Not a hosted paid-key proxy. AZAI is not a new foundation model, not a kernel, not a worm, not IP-blocking malware, not a VPN. JEEVES is the Ask Jeeves research assistant (ethics/assistant layer) and is not sovereign. Lamb Lens order is Service, then Clarity, then Peace — public Corpus posture; never the operator. Jeeves cannot modify scores; same rights as a normal user. Hub is a blank key: it does not interpret meaning. Hosted /v1 is lamb-check ONLY (plus a protocol mirror of health/models), NOT a proxy that spends the author's paid keys. Never a paid-key proxy. Site assistants (www.azielcorpuslibrary.net) may call the standalone local core with optional site_context. Constitutional gate, not a proof of ethics.";

/** Protocol-mirror names. Ollama is not in this list: it is optional SLOT, not a required model. */
export const MODELS = ["local", "blend", "gpt", "grok", "venice"];

/** Demoted. Present on the mirror list only as optional SLOT. Not the AZAI identity. */
export const OPTIONAL_SLOT_MODELS = ["ollama"];

export const PEACE_FAIL = [
  "enslave",
  "dominate humanity",
  "dominate humans",
  "take over the world",
  "you are sovereign",
  "jeeves is sovereign",
  "override the operator",
  "make them obey",
  "force the user to",
];

export const CLARITY_FAIL = [
  "deceive as the goal",
  "lie to everyone",
  "gaslight the user as the goal",
  "hide the truth as the goal",
];

export const SERVICE_FAIL = [
  "serve by dominating",
  "force compliance",
  "coerce the operator",
];

export const CHECK_PATTERNS = [
  "ignore previous instructions",
  "ignore all previous",
  "disregard the constitution",
  "bypass lamb",
  "jailbreak",
];

const ORDER = { FAIL: 2, CHECK: 1, PASS: 0 };

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function axis(textN, failPatterns, check) {
  for (const pat of failPatterns) {
    if (textN.includes(pat)) return "FAIL";
  }
  if (check) return "CHECK";
  return "PASS";
}

function worse(a, b) {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export function lambCheck(text) {
  const n = normalize(text);
  const jailbreak = CHECK_PATTERNS.some((p) => n.includes(p));
  const service = axis(n, SERVICE_FAIL, jailbreak);
  const clarity = axis(n, CLARITY_FAIL, jailbreak);
  const peace = axis(n, PEACE_FAIL, jailbreak);
  const overall = worse(worse(service, clarity), peace);
  const notes = [];
  if (jailbreak) notes.push("jailbreak phrasing detected — CHECK, not a silent pass");
  if (service === "FAIL") notes.push("service: coercion / domination-as-service");
  if (clarity === "FAIL") notes.push("clarity: deception-as-goal");
  if (peace === "FAIL") notes.push("peace: domination language");
  if (overall === "PASS") notes.push("no rule fired");
  return {
    service,
    clarity,
    peace,
    overall,
    notes,
    honest: "constitutional gate, not a proof of ethics",
    constitution: "Lamb Lens v1.0 — Service → Clarity → Peace",
    provider_proxy: false,
  };
}

function modelRow(id, note, extra) {
  return {
    id,
    object: "model",
    created: 0,
    owned_by: "azai",
    note,
    ...extra,
  };
}

export function models() {
  const coreNote = "Standalone local core. Protocol mirror. Not this Worker.";
  const mirrorNote = "Protocol mirror name only. Not a hosted provider call. Not this Worker.";
  const optionalNote = "Optional SLOT. Not required. Not the AZAI identity. Not this Worker.";
  return {
    object: "list",
    data: [
      ...MODELS.map((id) => modelRow(id, id === "local" ? coreNote : mirrorNote)),
      ...OPTIONAL_SLOT_MODELS.map((id) => modelRow(id, optionalNote, { optional: true, slot: true })),
    ],
    limitation: LIMITATION,
  };
}
