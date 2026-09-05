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

export const ENGINE_RUNNERS = {
  foldlock: { ops: FOLDLOCK_OPS, run: runFoldlock, source: "vendored foldlock Worker codec.js", module: "src/engines/foldlock.js" },
  azclce: { ops: AZCLCE_OPS, run: runAzclce, source: "vendored az-clce Worker engine.js + triad.js", module: "src/engines/azclce.js" },
  decisiongate: { ops: DECISIONGATE_OPS, run: runDecisiongate, source: "ported DecisionGATE Worker gates (no separate engine.js upstream)", module: "src/engines/decisiongate.js" },
  azai: { ops: AZAI_OPS, run: runAzai, source: "vendored AZAI Worker Lamb engine.js", module: "src/engines/azai.js" },
  ark: { ops: ARK_OPS, run: runArk, source: "vendored ARK Worker engine.js", module: "src/engines/ark.js" },
  zsolver: { ops: ZSOLVER_OPS, run: runZsolver, source: "vendored ZionPattern Solver Worker engine.js", module: "src/engines/zsolver.js" },
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
  return {
    true_engine_runtime: local.length > 0,
    true_engine_slugs: local,
    engine_slugs: local,
    proxy_fallback_slugs: fallback,
    proxy_is_not_exec: true,
    isolate_is_the_jail: true,
    isolate_note:
      "Cloudflare's Worker / Durable Object isolate is the jail for Worker-side engines. The receipt carries that engine's digest, not only an upstream HTTP status.",
    hosted_azai_is_not_the_blend: true,
    no_extra_sandbox_claimed: true,
    engines: engineMap(all.length ? all : local),
  };
}
