/**
 * AZBot engine. Skill router — not a foundation model.
 * Maps a request onto catalog slugs/ops. Jeeves is not sovereign.
 * Author: Aziel Eliab.
 */

export const PRODUCT = "azbot";
export const VERSION = "0.2.0";
export const LIMITATION =
  "AZBot is a skill, not a foundation model, not a kernel, not a VPN, and not a paid-key proxy. Jeeves is not sovereign. This in-process op routes a request onto Aziel Eliab catalog engines. It does not invent scores, overlays, or receipts.";

const CATALOG = [
  { slug: "vibelock", keys: ["audio", "wav", "speech", "deepfake", "liveness", "mic"], op: "analyze", banner: "not courtroom audio proof" },
  { slug: "veillock", keys: ["camera", "veil", "zoom", "facetime", "screen"], op: "apps", banner: "does not inject into FaceTime/Zoom" },
  { slug: "codelock", keys: ["source", "rosetta", "normalize", "render code"], op: "render", banner: "alters perception, not meaning" },
  { slug: "godlock", keys: ["abad", "vpn", "harden", "godlock"], op: "score", banner: "not a VPN" },
  { slug: "shadowlock", keys: ["observe", "counterfactual", "job list"], op: "observe", banner: "no OS hook" },
  { slug: "temporallock", keys: ["receipt", "genesis", "timeslate", "hash chain"], op: "genesis", banner: "receipts, not truth claims" },
  { slug: "forgereceipts", keys: ["court", "legal", "forge", "checklist"], op: "receipt", banner: "not legal advice" },
  { slug: "decisiongate", keys: ["gate", "proposal", "decide", "check"], op: "check", banner: "not moral authority" },
  { slug: "zsolver", keys: ["zion", "pattern", "case", "ontology"], op: "score", banner: "75% cap; does not solve cases" },
  { slug: "azos", keys: ["shell", "azos", "principles", "invite"], op: "status", banner: "not a kernel; session/exec stay proxy" },
  { slug: "glossafilter", keys: ["peer", "language", "glossa", "intent"], op: "render", banner: "tools remain tools" },
  { slug: "miragegrid", keys: ["mesh", "circuit", "anonymity", "socks"], op: "assign", banner: "control-plane only; not a hosted VPN hop" },
  { slug: "staticclock", keys: ["gear", "click", "staticclock", "advise"], op: "advise", banner: "not a scheduler" },
  { slug: "chronolock", keys: ["window", "08:30", "advisory", "chrono"], op: "advisory", banner: "advisory only" },
  { slug: "postking", keys: ["chess", "king", "fen", "uci", "continuity"], op: "new", banner: "the goal is to remain" },
  { slug: "azclce", keys: ["clce", "jaccard", "triad", "inconsist"], op: "score", banner: "detects inconsistency, not intent" },
  { slug: "azcoherence", keys: ["coherence", "hallucination", "alternate triad", "alternate score", "neutralize", "azcoherence"], op: "coherence_check", banner: "confidence ≠ truth; never invents evidence" },
  { slug: "ark", keys: ["vault", "sweep", "pe", "elf", "powershell"], op: "sweep", banner: "not a kernel" },
  { slug: "azai", keys: ["lamb", "jeeves", "blend", "openai"], op: "lamb-check", banner: "not the local blend" },
  { slug: "spectrallock", keys: ["overlay", "uv", "rosetta", "spectral", "png"], op: "overlay", banner: "256px preview, not a spectrometer" },
  { slug: "employeelock", keys: ["workbook", "unowned", "xlsx", "log row"], op: "append-preview", banner: "not a court" },
  { slug: "foldlock", keys: ["fold", "compress", "tether", "zip"], op: "fold-preview", banner: "not zip" },
  { slug: "whistlelock", keys: ["whistle", "drop", "mailer", "dead-man"], op: "canon-preview", banner: "not a mailer" },
  { slug: "trajectorylock", keys: ["trajectory", "forensic", "ray", "geometry"], op: "analyze", banner: "not a certified instrument" },
  { slug: "mialock", keys: ["doe", "missing", "mia", "cold case"], op: "doe-match", banner: "leads ≠ ID" },
  { slug: "azieltether", keys: ["tether", "mesh", "reconcile", "dual-chain"], op: "verify", banner: "not a VPN" },
  { slug: "peacelock", keys: ["silence", "inaction", "peacelock", "hard_duty", "absent", "chosen silence"], op: "open", banner: "not a transcript; HARD_DUTY refuses" },
  { slug: "azmail", keys: ["azmail", "airlock", "phishing", "keyword alert", "mesh_post", "anonymous mail"], op: "airlock_classify", banner: "not an MTA; FragGate only; mesh default off" },
  { slug: "azbrowser", keys: ["azbrowser", "browser", "ethical search", "lamb lens", "navigate", "tab"], op: "ethical_search", banner: "not Chromium; FragGate only; no invented visit results" },
  { slug: "aznet", keys: ["aznet", "garden", "memorial", "hash stamp", "hash continuity", "azbrowser pair", "verify_hash"], op: "pair_status", banner: "not a payload host; AZBrowser pair required" },
  { slug: "azhub", keys: ["azhub", "blank key", "region", "place module", "tether"], op: "blank_key_status", banner: "not AZInterface; no auto-unlock; Blank Key does not interpret" },
  { slug: "azinterface", keys: ["azinterface", "page cycle", "genesis", "site state", "full shutdown"], op: "page_cycle_status", banner: "not AZHub; pre-locked page cycles; no auto-unlock" },
  { slug: "aziel-corpus", keys: ["library", "corpus", "florence", "search"], op: "search", banner: "not a 26-card index; live D1 MASTER is separate" },
  { slug: "4dmap", keys: ["4dmap", "4d map", "inspection", "card_pin", "card_walk", "four axis", "inspection frame", "frame_status", "pin", "span", "stack", "walk", "lens"], op: "card_new", banner: "not a sequential gate; not a truth score; not an extra door" },
  { slug: "embryolock", keys: ["embryolock", "embryo lock", "vault wipe", "self-destruct", "destructive vault"], op: "policy", banner: "not a hosted unlock; wipe/unlock stay local-only" },
];

function tokensOf(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9._+-]*/g) || [];
}

export function route(body) {
  const src = body && typeof body === "object" ? body : {};
  const text = src.q != null ? String(src.q) : src.text != null ? String(src.text) : src.note != null ? String(src.note) : "";
  const tokens = tokensOf(text);
  const hay = tokens.join(" ");
  const scored = CATALOG.map((row) => {
    let hits = 0;
    const matched = [];
    for (const key of row.keys) {
      if (hay.includes(key) || tokens.includes(key.replace(/\s+/g, ""))) {
        hits += 1;
        matched.push(key);
      }
    }
    if (tokens.includes(row.slug) || hay.includes(row.slug.replace("-", " "))) {
      hits += 3;
      matched.push(row.slug);
    }
    return { ...row, score: hits, matched };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const picks = scored.length ? scored.slice(0, 5) : [];
  return {
    product: PRODUCT,
    version: VERSION,
    true_engine_runtime: true,
    is_skill: true,
    not_a_model: true,
    jeeves_sovereign: false,
    limitation: LIMITATION,
    query: text,
    matches: picks.map((p) => ({
      slug: p.slug,
      op: p.op,
      score: p.score,
      matched: p.matched,
      banner: p.banner,
      exec: { slug: p.slug, op: p.op },
    })),
    note: picks.length
      ? "Route only. Call aziel-runtime session exec for the chosen slug. Do not invent scores."
      : "No keyword hit. Open a session and name a catalog slug, or GET /v1/bundle.",
  };
}

export function examplePayload() {
  return { q: "score a login button triad" };
}
