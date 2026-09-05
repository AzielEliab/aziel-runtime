/**
 * Local engine registry. A slug is a true engine only if a module here
 * runs the op inside this process (or a jail this process starts).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { ENGINE_ARTIFACTS, embeddedDigest, isTrueEngineSlug, trueEngineSlugs } from "./digest.js";
import { FOLDLOCK_OPS, run as runFoldlock } from "./foldlock.js";
import { AZCLCE_OPS, run as runAzclce } from "./azclce.js";
import { DECISIONGATE_OPS, run as runDecisiongate } from "./decisiongate.js";
import { AZAI_OPS, run as runAzai } from "./azai.js";
import { ARK_OPS, run as runArk } from "./ark.js";
import { ZSOLVER_OPS, run as runZsolver } from "./zsolver.js";
import { VIBELOCK_OPS, run as runVibelock } from "./vibelock.js";
import { VEILLOCK_OPS, run as runVeillock } from "./veillock.js";
import { CODELOCK_OPS, run as runCodelock } from "./codelock.js";
import { GODLOCK_OPS, run as runGodlock } from "./godlock.js";
import { SHADOWLOCK_OPS, run as runShadowlock } from "./shadowlock.js";
import { TEMPORALLOCK_OPS, run as runTemporallock } from "./temporallock.js";
import { FORGERECEIPTS_OPS, run as runForgereceipts } from "./forgereceipts.js";
import { AZOS_OPS, run as runAzos } from "./azos.js";
import { GLOSSAFILTER_OPS, run as runGlossafilter } from "./glossafilter.js";
import { MIRAGEGRID_OPS, run as runMiragegrid } from "./miragegrid.js";
import { STATICCLOCK_OPS, run as runStaticclock } from "./staticclock.js";
import { CHRONOLOCK_OPS, run as runChronolock } from "./chronolock.js";
import { POSTKING_OPS, run as runPostking } from "./postking.js";
import { SPECTRALLOCK_OPS, run as runSpectrallock } from "./spectrallock.js";
import { AZBOT_OPS, run as runAzbot } from "./azbot.js";
import { EMPLOYEELOCK_OPS, run as runEmployeelock } from "./employeelock.js";
import { WHISTLELOCK_OPS, run as runWhistlelock } from "./whistlelock.js";
import { TRAJECTORYLOCK_OPS, run as runTrajectorylock } from "./trajectorylock.js";
import { MIALOCK_OPS, run as runMialock } from "./mialock.js";
import { AZIELTETHER_OPS, run as runAzieltether } from "./azieltether.js";
import { AZIEL_CORPUS_OPS, run as runAzielCorpus } from "./aziel-corpus.js";

/** Ops that cannot run as pure JS here (bindings / media / live store). Per-op proxy_fallback. */
const PROXY_OPS = {
  azos: ["session", "exec", "close", "lattice"],
  "aziel-corpus": ["review", "score", "jeeves", "transcribe", "ocr", "verify-backfill", "verify-geo", "document-chain", "media-run"],
  azai: [],
  spectrallock: [],
  vibelock: [],
};

export const ENGINE_RUNNERS = {
  vibelock: { ops: VIBELOCK_OPS, run: runVibelock, source: "ported VibeLock Worker scoring (features/PCM; no live mic)", module: "src/engines/vibelock.js" },
  veillock: { ops: VEILLOCK_OPS, run: runVeillock, source: "ported VeilLock Worker consent/apps/pulse (no camera inject)", module: "src/engines/veillock.js" },
  codelock: { ops: CODELOCK_OPS, run: runCodelock, source: "ported CodeLock Worker tokenizer + render", module: "src/engines/codelock.js" },
  godlock: { ops: GODLOCK_OPS, run: runGodlock, source: "ported GodLock Worker ABAD score/submit", module: "src/engines/godlock.js" },
  shadowlock: { ops: SHADOWLOCK_OPS, run: runShadowlock, source: "ported ShadowLock Worker observe/ethics", module: "src/engines/shadowlock.js" },
  temporallock: { ops: TEMPORALLOCK_OPS, run: runTemporallock, source: "ported TemporalLock Worker genesis/append/verify", module: "src/engines/temporallock.js" },
  forgereceipts: { ops: FORGERECEIPTS_OPS, run: runForgereceipts, source: "ported ForgeReceipts Worker receipt mint", module: "src/engines/forgereceipts.js" },
  decisiongate: { ops: DECISIONGATE_OPS, run: runDecisiongate, source: "ported DecisionGATE Worker gates (no separate engine.js upstream)", module: "src/engines/decisiongate.js" },
  zsolver: { ops: ZSOLVER_OPS, run: runZsolver, source: "vendored ZionPattern Solver Worker engine.js", module: "src/engines/zsolver.js" },
  azos: { ops: AZOS_OPS, run: runAzos, source: "ported AZ-OS status/principles/invite (session/exec/lattice stay per-op proxy)", module: "src/engines/azos.js" },
  glossafilter: { ops: GLOSSAFILTER_OPS, run: runGlossafilter, source: "ported Glossa Filter Worker render + packs", module: "src/engines/glossafilter.js" },
  miragegrid: { ops: MIRAGEGRID_OPS, run: runMiragegrid, source: "ported MirageGrid Worker control-plane (not a hosted VPN hop)", module: "src/engines/miragegrid.js" },
  staticclock: { ops: STATICCLOCK_OPS, run: runStaticclock, source: "ported StaticClock Worker advise + gear-click + index-data", module: "src/engines/staticclock.js" },
  chronolock: { ops: CHRONOLOCK_OPS, run: runChronolock, source: "ported ChronoLock Worker advisory + index-data", module: "src/engines/chronolock.js" },
  postking: { ops: POSTKING_OPS, run: runPostking, source: "vendored Post-King Chess Worker engine.js", module: "src/engines/postking.js" },
  azclce: { ops: AZCLCE_OPS, run: runAzclce, source: "vendored az-clce Worker engine.js + triad.js", module: "src/engines/azclce.js" },
  ark: { ops: ARK_OPS, run: runArk, source: "vendored ARK Worker engine.js", module: "src/engines/ark.js" },
  azai: { ops: AZAI_OPS, run: runAzai, source: "vendored AZAI Worker Lamb engine.js", module: "src/engines/azai.js" },
  spectrallock: { ops: SPECTRALLOCK_OPS, run: runSpectrallock, source: "vendored SpectralLock Worker overlay.js (256px PNG preview)", module: "src/engines/spectrallock.js" },
  azbot: { ops: AZBOT_OPS, run: runAzbot, source: "AZBot skill router (not a model)", module: "src/engines/azbot.js" },
  employeelock: { ops: EMPLOYEELOCK_OPS, run: runEmployeelock, source: "ported EmployeeLock Worker append-preview / verify-canonical", module: "src/engines/employeelock.js" },
  foldlock: { ops: FOLDLOCK_OPS, run: runFoldlock, source: "vendored foldlock Worker codec.js", module: "src/engines/foldlock.js" },
  whistlelock: { ops: WHISTLELOCK_OPS, run: runWhistlelock, source: "ported WhistleLock Worker hash/canon preview", module: "src/engines/whistlelock.js" },
  trajectorylock: { ops: TRAJECTORYLOCK_OPS, run: runTrajectorylock, source: "vendored TrajectoryLock Worker engine.js", module: "src/engines/trajectorylock.js" },
  mialock: { ops: MIALOCK_OPS, run: runMialock, source: "vendored M.I.A.Lock doe-match + query renderer", module: "src/engines/mialock.js" },
  azieltether: { ops: AZIELTETHER_OPS, run: runAzieltether, source: "ported AzielTether Worker hash-chain (not a VPN)", module: "src/engines/azieltether.js" },
  "aziel-corpus": { ops: AZIEL_CORPUS_OPS, run: runAzielCorpus, source: "portable sample-MASTER search (live D1 ingest/review stay per-op proxy)", module: "src/engines/aziel-corpus.js" },
};

export { ENGINE_ARTIFACTS, embeddedDigest, isTrueEngineSlug, trueEngineSlugs };

export function engineOps(slug) {
  const entry = ENGINE_RUNNERS[String(slug || "").toLowerCase()];
  return entry ? entry.ops.slice() : [];
}

export function engineRecord(slug) {
  const key = String(slug || "").toLowerCase();
  const entry = ENGINE_RUNNERS[key];
  if (!entry) {
    return {
      slug: key,
      true_engine_runtime: false,
      mode: "proxy_fallback",
      engine_digest: null,
    };
  }
  return {
    slug: key,
    true_engine_runtime: true,
    mode: "local",
    ops: entry.ops.slice(),
    proxy_fallback_ops: (PROXY_OPS[key] || []).slice(),
    artifact_files: (ENGINE_ARTIFACTS[key] || []).slice(),
    module: entry.module,
    engine_digest: embeddedDigest(key),
    source: entry.source,
    isolate: "Cloudflare Worker / Durable Object isolate is the jail. engine_digest is required.",
  };
}

export function engineMap(productSlugs) {
  const slugs = productSlugs && productSlugs.length ? productSlugs : trueEngineSlugs();
  const out = {};
  for (const slug of slugs) out[slug] = engineRecord(slug);
  return out;
}

export function honestyFields(productSlugs) {
  const all = productSlugs || [];
  const local = trueEngineSlugs();
  const fallback = all.filter((s) => !local.includes(s));
  const perOp = {};
  for (const [slug, ops] of Object.entries(PROXY_OPS)) {
    if (ops.length) perOp[slug] = ops.slice();
  }
  return {
    true_engine_runtime: local.length > 0,
    true_engine_slugs: local,
    engine_slugs: local,
    proxy_fallback_slugs: fallback,
    proxy_fallback_ops: perOp,
    proxy_is_not_exec: true,
    isolate_is_the_jail: true,
    isolate_note:
      "Cloudflare's Worker / Durable Object isolate is the jail for Worker-side engines. The receipt carries that engine's digest, not only an upstream HTTP status.",
    hosted_azai_is_not_the_blend: true,
    no_extra_sandbox_claimed: true,
    engines: engineMap(all.length ? all : local),
  };
}
