/**
 * Hosted TrajectoryLock core (small JSON cases). Never stores media.
 * Research prototype. Not a certified forensic instrument. Author Aziel Eliab.
 */
export const PRODUCT = "trajectorylock";
export const VERSION = "0.1.0";
export const SPEC = "trajectorylock-v0.1";
export const AUTHOR = "Aziel Eliab";
export const DOI = "https://doi.org/10.5281/zenodo.22258015";
export const ZENODO = "https://zenodo.org/records/22258015";
export const HOST = "https://trajectorylock-download-tracker.vibelock.workers.dev";
export const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
export const JSON_CAP = 32 * 1024;
export const HOSTED_MC_CAP = 2000;

export const LIMITATION =
  "THIS IS: research prototype / auditable geometric test. Compatibility vs declared official line. Independence groups so copies don't inflate certainty. CLI + local workbench + JSON API. THIS IS NOT: a certified forensic instrument; substitute for scene reconstruction, medical findings, lab exam; shooter/intent/guilt/narrative identifier; automatic detection of invisible projectiles; face recognition. Match probability is P(match | declared model), not P(official account is true). Synthetic example results must never be represented as real-case findings. No private case facts. Hosted API never stores media. Author: Aziel Eliab.";

export const GUARDRAIL =
  "Scores measure geometric compatibility under declared assumptions. This is not a certified forensic instrument. They do not establish intent, identity, shooter, guilt, credibility, or legal truth. Match probability is P(match | declared model), not P(the official account is true). Synthetic example results must never be represented as real-case findings.";

export const EXAMPLE_CASE = {
  case_id: "MINIMAL-DIRECT-LINE",
  description: "Synthetic direct-line example; not real evidence.",
  sources: [
    {
      id: "survey-a",
      kind: "scene_survey",
      quality: 0.95,
      reliability: 1.0,
      calibrated: true,
      independence_group: "survey-a",
    },
  ],
  observations: [
    {
      type: "direct_line",
      source_id: "survey-a",
      point: [0, 0, 1.2],
      direction: [1, 0.1, 0.02],
      angular_sigma_deg: 0.5,
      offset_sigma_m: 0.02,
    },
  ],
  official_hypothesis: {
    point: [0.01, 0.01, 1.19],
    direction: [1, 0.11, 0.02],
    angular_sigma_deg: 0.7,
    offset_sigma_m: 0.04,
    angle_tolerance_deg: 3.0,
    offset_tolerance_m: 0.25,
  },
  analysis: { monte_carlo_samples: 800, random_seed: 7 },
};

const EPS = 1e-12;
const MEDIA_KEYS = ["media", "file_b64", "image", "video", "bytes", "png", "jpeg", "mp4", "wav", "attachment"];

export function looksLikeMedia(obj) {
  const raw = JSON.stringify(obj || {});
  if (raw.length > JSON_CAP) return true;
  const lower = raw.toLowerCase();
  if (lower.includes("data:image") || lower.includes("data:video") || lower.includes("data:audio")) return true;
  function walk(v, depth) {
    if (!v || typeof v !== "object" || depth > 8) return false;
    for (const k of Object.keys(v)) {
      if (MEDIA_KEYS.includes(k.toLowerCase())) return true;
      if (walk(v[k], depth + 1)) return true;
    }
    return false;
  }
  return walk(obj, 0);
}

function vec3(value, name) {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(name + " must contain exactly three finite numbers");
  const a = [Number(value[0]), Number(value[1]), Number(value[2])];
  if (!a.every(Number.isFinite)) throw new Error(name + " must contain exactly three finite numbers");
  return a;
}
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) { return Math.hypot(a[0], a[1], a[2]); }
function unit(value, name) {
  const a = vec3(value, name);
  const n = norm(a);
  if (n < EPS) throw new Error(name + " cannot be zero");
  return scale(a, 1 / n);
}
function eye() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
function matAdd(A, B) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] = A[i][j] + B[i][j];
  return C;
}
function matScale(A, s) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] = A[i][j] * s;
  return C;
}
function outer(a, b) {
  return [
    [a[0] * b[0], a[0] * b[1], a[0] * b[2]],
    [a[1] * b[0], a[1] * b[1], a[1] * b[2]],
    [a[2] * b[0], a[2] * b[1], a[2] * b[2]],
  ];
}
function matVec(A, v) {
  return [dot(A[0], v), dot(A[1], v), dot(A[2], v)];
}
function det3(A) {
  return (
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
  );
}
function invert3(A) {
  const d = det3(A);
  if (!Number.isFinite(d) || Math.abs(d) < 1e-18) throw new Error("feature geometry is degenerate; add a separated viewpoint or survey point");
  const c00 = A[1][1] * A[2][2] - A[1][2] * A[2][1];
  const c01 = -(A[1][0] * A[2][2] - A[1][2] * A[2][0]);
  const c02 = A[1][0] * A[2][1] - A[1][1] * A[2][0];
  const c10 = -(A[0][1] * A[2][2] - A[0][2] * A[2][1]);
  const c11 = A[0][0] * A[2][2] - A[0][2] * A[2][0];
  const c12 = -(A[0][0] * A[2][1] - A[0][1] * A[2][0]);
  const c20 = A[0][1] * A[1][2] - A[0][2] * A[1][1];
  const c21 = -(A[0][0] * A[1][2] - A[0][2] * A[1][0]);
  const c22 = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const adj = [
    [c00, c10, c20],
    [c01, c11, c21],
    [c02, c12, c22],
  ];
  return matScale(adj, 1 / d);
}
function solve3(A, b) {
  return matVec(invert3(A), b);
}
function cond3(A) {
  const inv = invert3(A);
  const n1 = Math.hypot(...A.flat());
  const n2 = Math.hypot(...inv.flat());
  return n1 * n2;
}

export function acuteAngleDeg(a, b) {
  const dotv = Math.min(1, Math.max(0, Math.abs(dot(unit(a, "a"), unit(b, "b")))));
  return (Math.acos(dotv) * 180) / Math.PI;
}

export function lineDistance(pa, da, pb, db) {
  const p1 = vec3(pa, "p1");
  const p2 = vec3(pb, "p2");
  const d1 = unit(da, "d1");
  const d2 = unit(db, "d2");
  const cr = cross(d1, d2);
  const cn = norm(cr);
  if (cn < 1e-9) return norm(cross(sub(p2, p1), d1));
  return Math.abs(dot(sub(p2, p1), scale(cr, 1 / cn)));
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function perturbDirection(direction, sigmaDeg, rng) {
  const d = unit(direction, "dir");
  const noise0 = [gaussian(rng) * ((sigmaDeg * Math.PI) / 180), gaussian(rng) * ((sigmaDeg * Math.PI) / 180), gaussian(rng) * ((sigmaDeg * Math.PI) / 180)];
  const noise = sub(noise0, scale(d, dot(noise0, d)));
  return unit(add(d, noise), "perturbed");
}

function triangulateRays(rays, surveyed) {
  let A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let b = [0, 0, 0];
  const constraints = [];
  let count = 0;
  for (const ray of rays || []) {
    const o = vec3(ray.origin, "ray origin");
    const d = unit(ray.direction, "ray direction");
    const sigmaDeg = Math.max(Number(ray.angular_sigma_deg ?? 0.5), 1e-4);
    const rangeHint = Math.max(Number(ray.range_hint_m ?? 10.0), 0.1);
    const sigma = Math.max(Math.tan((sigmaDeg * Math.PI) / 180) * rangeHint, 1e-4);
    const w = Number(ray.weight ?? 1.0) / (sigma * sigma);
    const P = matAdd(eye(), matScale(outer(d, d), -1));
    A = matAdd(A, matScale(P, w));
    b = add(b, scale(matVec(P, o), w));
    constraints.push({ o, d, w });
    count += 1;
  }
  for (const item of surveyed || []) {
    const p = vec3(item.point, "survey point");
    const sigma = Math.max(Number(item.sigma_m ?? 0.01), 1e-5);
    const w = Number(item.weight ?? 1.0) / (sigma * sigma);
    A = matAdd(A, matScale(eye(), w));
    b = add(b, scale(p, w));
    count += 1;
  }
  if (count < 2) throw new Error("a feature needs at least two geometric observations");
  const condition = cond3(A);
  if (!Number.isFinite(condition) || condition > 1e12) {
    throw new Error("feature geometry is degenerate; add a separated viewpoint or survey point");
  }
  const point = solve3(A, b);
  const residuals = constraints.map(({ o, d }) => norm(cross(sub(point, o), d)));
  const residual = residuals.length ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length) : 0;
  const cov = invert3(A);
  const sigma = Math.sqrt(Math.max((cov[0][0] + cov[1][1] + cov[2][2]) / 3, 1e-10));
  return { point, sigma_m: sigma, ray_residual_m: residual, condition_number: condition, observation_count: count };
}

function fitLine(points, directLines) {
  const pts = points || [];
  const lines = directLines || [];
  if (pts.length < 2 && !lines.length) throw new Error("trajectory needs two reconstructed features or one direct line");
  let center, direction, rms, offsetSigma, angularSigma;
  if (pts.length >= 2) {
    const weights = pts.map((p) => 1.0 / Math.max(p.sigma_m ** 2, 1e-8));
    const wsum = weights.reduce((a, b) => a + b, 0);
    center = [0, 0, 0];
    for (let i = 0; i < pts.length; i++) center = add(center, scale(pts[i].point, weights[i] / wsum));
    const centered = pts.map((p) => sub(p.point, center));
    let cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < pts.length; i++) cov = matAdd(cov, matScale(outer(centered[i], centered[i]), weights[i] / wsum));
    // power iteration for principal axis
    let v = [1, 0, 0];
    for (let k = 0; k < 24; k++) v = unit(matVec(cov, v), "pca");
    direction = v;
    const residuals = centered.map((c) => norm(cross(c, direction)));
    rms = Math.sqrt(residuals.reduce((s, r, i) => s + weights[i] * r * r, 0) / wsum);
    const projs = pts.map((p) => dot(p.point, direction));
    const span = Math.max(Math.max(...projs) - Math.min(...projs), 1e-3);
    offsetSigma = Math.sqrt(pts.reduce((s, p, i) => s + weights[i] * p.sigma_m ** 2, 0) / wsum);
    angularSigma = (Math.atan2(Math.max(rms, offsetSigma), span) * 180) / Math.PI;
  } else {
    const first = lines[0];
    center = vec3(first.point, "direct line point");
    direction = unit(first.direction, "direct line direction");
    rms = 0;
    offsetSigma = Number(first.offset_sigma_m ?? 0.05);
    angularSigma = Number(first.angular_sigma_deg ?? 1.0);
  }
  let directionSum = scale(direction, 1 / Math.max(angularSigma, 1e-3) ** 2);
  let dirWeight = 1 / Math.max(angularSigma, 1e-3) ** 2;
  const centers = [[center, 1 / Math.max(offsetSigma, 1e-4) ** 2]];
  for (const line of lines) {
    let d = unit(line.direction, "direct line direction");
    if (dot(d, direction) < 0) d = scale(d, -1);
    const sigA = Math.max(Number(line.angular_sigma_deg ?? 1.0), 1e-3);
    const w = Number(line.weight ?? 1.0) / sigA ** 2;
    directionSum = add(directionSum, scale(d, w));
    dirWeight += w;
    const sigO = Math.max(Number(line.offset_sigma_m ?? 0.05), 1e-4);
    centers.push([vec3(line.point, "direct line point"), Number(line.weight ?? 1.0) / sigO ** 2]);
  }
  direction = unit(scale(directionSum, 1 / dirWeight), "blend dir");
  const csum = centers.reduce((s, [, w]) => s + w, 0);
  center = centers.reduce((acc, [p, w]) => add(acc, scale(p, w / csum)), [0, 0, 0]);
  angularSigma = Math.max(0.05, 1 / Math.sqrt(dirWeight));
  offsetSigma = Math.max(0.001, 1 / Math.sqrt(csum));
  return { point: center, direction, angular_sigma_deg: angularSigma, offset_sigma_m: offsetSigma, rms_residual_m: rms };
}

export function evidenceStrength(sources, reconstructedFeatures) {
  const groups = new Map();
  let calibrated = 0;
  for (const source of sources) {
    const q = Math.min(1, Math.max(0, Number(source.quality ?? 0.5)));
    const r = Math.min(1, Math.max(0, Number(source.reliability ?? 1)));
    const g = String(source.independence_group ?? source.id ?? "unknown");
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(q * r);
    if (source.calibrated) calibrated += 1;
  }
  let effective = 0;
  for (const values of groups.values()) {
    values.sort((a, b) => b - a);
    const copies = values.slice(1).reduce((s, v) => s + v, 0);
    effective += values[0] + 0.2 * (1 - Math.exp(-copies));
  }
  const sourceTerm = 1 - Math.exp(-effective / 2.2);
  const geometryTerm = Math.min(1, reconstructedFeatures / 3);
  const calibrationTerm = sources.length ? calibrated / sources.length : 0;
  const confidence = 100 * (0.55 * sourceTerm + 0.3 * geometryTerm + 0.15 * calibrationTerm);
  return {
    confidence_percent: Math.round(Math.min(confidence, 99) * 100) / 100,
    effective_source_count: Math.round(effective * 1000) / 1000,
    independent_group_count: groups.size,
    calibrated_source_fraction: Math.round(calibrationTerm * 1000) / 1000,
  };
}

function quantile(arr, q) {
  const a = arr.slice().sort((x, y) => x - y);
  const i = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
  return a[i];
}

function compareLines(reconstructed, official, samples, seed) {
  const op = vec3(official.point, "official point");
  const od = unit(official.direction, "official direction");
  const osA = Math.max(Number(official.angular_sigma_deg ?? 1.0), 0.01);
  const osO = Math.max(Number(official.offset_sigma_m ?? 0.1), 0.001);
  const toleranceA = Math.max(Number(official.angle_tolerance_deg ?? 3.0), 0.01);
  const toleranceO = Math.max(Number(official.offset_tolerance_m ?? 0.3), 0.001);
  const measuredAngle = acuteAngleDeg(reconstructed.direction, od);
  const measuredOffset = lineDistance(reconstructed.point, reconstructed.direction, op, od);
  const rng = mulberry32(seed >>> 0);
  let matches = 0;
  let likelihoodSum = 0;
  const angles = [];
  const offsets = [];
  const combinedA = Math.hypot(reconstructed.angular_sigma_deg, osA);
  const combinedO = Math.hypot(reconstructed.offset_sigma_m, osO);
  for (let i = 0; i < samples; i++) {
    const rd = perturbDirection(reconstructed.direction, reconstructed.angular_sigma_deg, rng);
    const oDir = perturbDirection(od, osA, rng);
    const rp = add(reconstructed.point, [gaussian(rng) * reconstructed.offset_sigma_m, gaussian(rng) * reconstructed.offset_sigma_m, gaussian(rng) * reconstructed.offset_sigma_m]);
    const oPoint = add(op, [gaussian(rng) * osO, gaussian(rng) * osO, gaussian(rng) * osO]);
    const angle = acuteAngleDeg(rd, oDir);
    const offset = lineDistance(rp, rd, oPoint, oDir);
    angles.push(angle);
    offsets.push(offset);
    if (angle <= toleranceA && offset <= toleranceO) matches += 1;
    likelihoodSum += Math.exp(-0.5 * ((angle / Math.max(combinedA, toleranceA)) ** 2 + (offset / Math.max(combinedO, toleranceO)) ** 2));
  }
  const thresholdProbability = (100 * matches) / samples;
  const compatibility = (100 * likelihoodSum) / samples;
  let conclusion = "indeterminate";
  if (thresholdProbability >= 80) conclusion = "consistent_with_declared_tolerances";
  else if (thresholdProbability <= 20) conclusion = "inconsistent_with_declared_tolerances";
  return {
    measured_angle_difference_deg: Math.round(measuredAngle * 10000) / 10000,
    measured_line_offset_m: Math.round(measuredOffset * 10000) / 10000,
    compatibility_score_percent: Math.round(compatibility * 100) / 100,
    threshold_match_probability_percent: Math.round(thresholdProbability * 100) / 100,
    conclusion,
    angle_95_interval_deg: [Math.round(quantile(angles, 0.025) * 10000) / 10000, Math.round(quantile(angles, 0.975) * 10000) / 10000],
    offset_95_interval_m: [Math.round(quantile(offsets, 0.025) * 10000) / 10000, Math.round(quantile(offsets, 0.975) * 10000) / 10000],
    monte_carlo_samples: samples,
    random_seed: seed,
    declared_tolerances: { angle_deg: toleranceA, offset_m: toleranceO },
  };
}

function scoreWitnesses(witnesses, trajectoryDirection) {
  if (!witnesses.length) return { count: 0, weighted_agreement_percent: null, details: [] };
  const details = [];
  let totalW = 0;
  let total = 0;
  for (const witness of witnesses) {
    const delta = acuteAngleDeg(witness.direction, trajectoryDirection);
    const sigma = Math.max(Number(witness.angular_sigma_deg ?? 15), 1);
    const reliability = Math.min(1, Math.max(0, Number(witness.reliability ?? 0.5)));
    const agreement = Math.exp(-0.5 * (delta / sigma) ** 2);
    total += agreement * reliability;
    totalW += reliability;
    details.push({
      source_id: witness.source_id,
      angle_difference_deg: Math.round(delta * 1000) / 1000,
      agreement_percent: Math.round(100 * agreement * 100) / 100,
      reliability_weight: reliability,
    });
  }
  return {
    count: witnesses.length,
    weighted_agreement_percent: totalW ? Math.round((100 * total) / totalW * 100) / 100 : null,
    details,
  };
}

function canonicalJson(data) {
  return JSON.stringify(data, (k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out = {};
      for (const key of Object.keys(v).sort()) out[key] = v[key];
      return out;
    }
    return v;
  });
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function analyzeCase(caseObj, opts = {}) {
  if (!caseObj || typeof caseObj !== "object") throw new Error("JSON case required");
  if (looksLikeMedia(caseObj)) throw new Error("hosted analyze never stores media; send a small JSON case only");
  const required = ["case_id", "sources", "observations", "official_hypothesis"];
  const missing = required.filter((n) => !(n in caseObj));
  if (missing.length) throw new Error("missing required fields: " + missing.join(", "));
  const ids = caseObj.sources.map((s) => s.id);
  if (ids.some((x) => x == null) || new Set(ids).size !== ids.length) throw new Error("every source needs a unique id");
  const known = new Set(ids);
  const byFeature = new Map();
  const directLines = [];
  const witnesses = [];
  const sourceMap = Object.fromEntries(caseObj.sources.map((s) => [s.id, s]));
  const used = new Set();
  for (const observation of caseObj.observations) {
    if (!known.has(observation.source_id)) throw new Error("observation references unknown source " + observation.source_id);
    const item = { ...observation };
    const source = sourceMap[item.source_id];
    item.weight = Number(item.weight ?? 1) * Number(source.quality ?? 0.5);
    const kind = item.type;
    if (kind === "visual_ray") {
      if (!byFeature.has(item.feature_id)) byFeature.set(item.feature_id, { rays: [], points: [] });
      byFeature.get(item.feature_id).rays.push(item);
    } else if (kind === "survey_point") {
      if (!byFeature.has(item.feature_id)) byFeature.set(item.feature_id, { rays: [], points: [] });
      byFeature.get(item.feature_id).points.push(item);
    } else if (kind === "direct_line") {
      directLines.push(item);
    } else if (kind === "witness_bearing") {
      witnesses.push(item);
    } else {
      throw new Error("unsupported observation type " + kind);
    }
    used.add(item.source_id);
  }
  const features = {};
  const featureObjects = [];
  const warnings = [];
  for (const [featureId, obs] of byFeature.entries()) {
    try {
      const result = triangulateRays(obs.rays, obs.points);
      featureObjects.push(result);
      features[featureId] = {
        point_m: result.point.map((v) => Math.round(v * 1e6) / 1e6),
        sigma_m: Math.round(result.sigma_m * 1e6) / 1e6,
        ray_residual_m: Math.round(result.ray_residual_m * 1e6) / 1e6,
        condition_number: Math.round(result.condition_number * 1000) / 1000,
        observation_count: result.observation_count,
      };
    } catch (err) {
      warnings.push("feature " + featureId + ": " + (err && err.message ? err.message : err));
    }
  }
  const line = fitLine(featureObjects, directLines);
  let mc = Number(opts.samples ?? caseObj.analysis?.monte_carlo_samples ?? 800);
  if (!Number.isFinite(mc)) mc = 800;
  mc = Math.max(100, Math.min(HOSTED_MC_CAP, Math.floor(mc)));
  const seed = Number(opts.seed ?? caseObj.analysis?.random_seed ?? 7) || 7;
  const comparison = compareLines(line, caseObj.official_hypothesis, mc, seed);
  const sourceConfidence = evidenceStrength(
    [...used].map((s) => sourceMap[s]),
    featureObjects.length,
  );
  const witness = scoreWitnesses(witnesses, line.direction);
  const result = {
    schema_version: "trajectorylock-result-0.1",
    case_id: caseObj.case_id,
    generated_at_utc: new Date().toISOString(),
    input_sha256: await sha256Hex(canonicalJson(caseObj)),
    trajectory: {
      point_m: line.point.map((v) => Math.round(v * 1e6) / 1e6),
      direction_unit: line.direction.map((v) => Math.round(v * 1e8) / 1e8),
      angular_sigma_deg: Math.round(line.angular_sigma_deg * 10000) / 10000,
      offset_sigma_m: Math.round(line.offset_sigma_m * 1e6) / 1e6,
      fit_rms_residual_m: Math.round(line.rms_residual_m * 1e6) / 1e6,
    },
    reconstructed_features: features,
    official_narrative_comparison: comparison,
    reconstruction_confidence: sourceConfidence,
    witness_corroboration: witness,
    warnings,
    interpretation: {
      primary_statement: comparison.conclusion,
      guardrail: GUARDRAIL,
      limitation: LIMITATION,
      certified_instrument: false,
      author: AUTHOR,
      product_version: VERSION,
      spec: SPEC,
    },
    frozen_tolerances: comparison.declared_tolerances,
    hosted: true,
    stored: false,
    kv_increment: false,
    media_stored: false,
  };
  result.result_sha256 = await sha256Hex(canonicalJson(result));
  return result;
}
