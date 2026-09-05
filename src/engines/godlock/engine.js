/**
 * GodLock engine (port of workers/download-tracker/src/runtime.js score/submit).
 * Offline ABAD / hardening score. Not a VPN. Author: Aziel Eliab.
 */

export const PRODUCT = "godlock";
export const VERSION = "0.1.0";
export const BANNER = "NOT an anonymity network. No IP hiding. Logical ABAD receipts only. Not a VPN, proxy, or Tor hop.";
export const MOTTO = "GodLock does not argue. It records, analyzes, hardens, and grows.";
export const JEEVES_MODEL = "godlock-jeeves-heuristic-0.1";
export const MAX_TEXT = 32768;
export const GRID_SIZE = 25;
export const NODE_PREFIX = "grid";
export const LIMITATION =
  "THIS IS: an offline ABAD / hardening score and ephemeral logical receipt. THIS IS NOT: a VPN, anonymity network, proxy, Tor hop, or IP-hiding tool. Logical grid nodes are names, not IPs.";

const WEIGHTS = {
  aziel_sequence: 3.0,
  phi: 2.0,
  sqrt2: 2.0,
  flower_of_life: 2.5,
  corkscrew: 2.0,
  abad: 3.0,
  merged_rule: 1.5,
};
const PATTERNS = {
  aziel_sequence: [/aziel\s+sequence/i, /aziel[-_]?seq(?:uence)?/i],
  phi: [/\bphi\b/i, /golden\s+ratio/i, /φ/, /\b1\.618\d*\b/],
  sqrt2: [/sqrt\s*\(?\s*2/i, /√\s*2/, /square\s+root\s+of\s+2/i, /\b1\.414\d*\b/],
  flower_of_life: [/flower\s+of\s+life/i, /vesica\s+piscis/i],
  corkscrew: [/corkscrew/i],
  abad: [/\babad\b/i, /a\s*[-–—]\s*b\s*[-–—]\s*a\s*[-–—]\s*d/i, /\ba\s*-\s*b\s*-\s*a\s*-\s*d\b/i],
};

async function sha256Hex(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const dig = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(dig);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function withBanner(obj) {
  return { banner: BANNER, motto: MOTTO, anonymity_network: false, ip_hiding: false, proxy: false, vpn: false, tor: false, ...obj };
}

export function scoreEngagement(text, extraKeywords) {
  if (!text) return { score: 0.0, hits: [] };
  const hits = [];
  let score = 0.0;
  for (const [family, patterns] of Object.entries(PATTERNS)) {
    if (patterns.some((p) => p.test(text))) {
      hits.push(family);
      score += WEIGHTS[family];
    }
    for (const p of patterns) p.lastIndex = 0;
  }
  const extras = extraKeywords || [];
  const low = text.toLowerCase();
  for (const kw of extras) {
    if (kw && low.includes(String(kw).toLowerCase())) {
      const tag = "merged_rule:" + kw;
      if (!hits.includes(tag)) {
        hits.push(tag);
        score += WEIGHTS.merged_rule;
      }
    }
  }
  return { score: Math.round(score * 10000) / 10000, hits };
}

function nodeName(i) {
  const n = i + 1;
  return NODE_PREFIX + "-" + String(n).padStart(2, "0");
}

function airlockPair() {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  const ingressIdx = buf[0] % GRID_SIZE;
  let egressIdx = buf[1] % GRID_SIZE;
  if (egressIdx === ingressIdx) egressIdx = (egressIdx + 1) % GRID_SIZE;
  return { ingress_node: nodeName(ingressIdx), egress_node: nodeName(egressIdx) };
}

function canonicalReceiptPayload(id, timestamp, ingress, egress, text) {
  const body = { egress_node: egress, id, ingress_node: ingress, text, timestamp };
  const keys = Object.keys(body).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(body[k])).join(",") + "}";
}

function jeevesHeuristic(receipt, engagement) {
  const families = engagement.hits.filter((h) => !String(h).startsWith("merged_rule:"));
  let suggested;
  let notes;
  if (families.length) {
    suggested = "Harden ABAD coverage for: " + families.join(", ") + ". Require an explicit " + families[0] + " check in the active rules.";
    notes = "Heuristic engagement score=" + engagement.score + ". Families present in the counter-argument are treated as the surface that should be hardened. Not a language model.";
  } else {
    suggested = "Add a rule requiring the counter-argument to engage at least one ABAD token (Aziel Sequence, phi, sqrt(2), Flower of Life, corkscrew, A-B-A-D).";
    notes = "Heuristic engagement score=" + engagement.score + ". No ABAD family hit. Suggested rule is a keyword floor, not a proof.";
  }
  return {
    receipt_id: receipt.id,
    suggested_hardening: suggested,
    model: JEEVES_MODEL,
    notes,
    engagement,
  };
}

export function score(body) {
  const text = body && body.text != null ? String(body.text) : "";
  if (!text.trim()) return withBanner({ ok: false, error: "text is required", status: 400 });
  if (text.length > MAX_TEXT) return withBanner({ ok: false, error: "text too large", max: MAX_TEXT, status: 413 });
  const engagement = scoreEngagement(text);
  return withBanner({ ok: true, product: PRODUCT, engagement, durable: false, true_engine_runtime: true });
}

export async function submit(body) {
  const text = body && body.text != null ? String(body.text).trim() : "";
  if (!text) return withBanner({ ok: false, error: "text is required", status: 400 });
  if (text.length > MAX_TEXT) return withBanner({ ok: false, error: "text too large", max: MAX_TEXT, status: 413 });
  const pair = airlockPair();
  const id = crypto.randomUUID();
  const timestamp = utcNow();
  const payload = canonicalReceiptPayload(id, timestamp, pair.ingress_node, pair.egress_node, text);
  const digest = await sha256Hex(payload);
  const receipt = {
    id,
    timestamp,
    ingress_node: pair.ingress_node,
    egress_node: pair.egress_node,
    text,
    hash: digest,
  };
  const engagement = scoreEngagement(text);
  const analysis = jeevesHeuristic(receipt, engagement);
  return withBanner({
    ok: true,
    product: PRODUCT,
    receipt,
    jeeves_analysis: analysis,
    engagement,
    durable: false,
    stored: false,
    true_engine_runtime: true,
    note: "Ephemeral receipt for this response only. Logical grid nodes are names, not IPs. No durable anonymity.",
  });
}
