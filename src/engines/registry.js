/**
 * Local engine registry. A slug is a true engine only if a module here
 * runs the op inside this process (or a jail this process starts).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { ENGINE_ARTIFACTS, embeddedDigest, isTrueEngineSlug, trueEngineSlugs } from "./digest.js";
import { runFoldlock, FOLDLOCK_OPS } from "./foldlock/ops.js";
import { runAzclce, AZCLCE_OPS } from "./azclce/ops.js";
import { runDecisiongate, DECISIONGATE_OPS } from "./decisiongate/ops.js";
import { runAzai, AZAI_OPS } from "./azai/ops.js";
import { runArk, ARK_OPS } from "./ark/ops.js";
import { runZsolver, ZSOLVER_OPS } from "./zsolver/ops.js";

export const ENGINE_RUNNERS = {
  foldlock: { ops: FOLDLOCK_OPS, run: runFoldlock, source: "vendored foldlock Worker codec.js" },
  azclce: { ops: AZCLCE_OPS, run: runAzclce, source: "vendored az-clce Worker engine.js + triad.js" },
  decisiongate: { ops: DECISIONGATE_OPS, run: runDecisiongate, source: "ported DecisionGATE Worker gates" },
  azai: { ops: AZAI_OPS, run: runAzai, source: "vendored AZAI Worker Lamb engine.js" },
  ark: { ops: ARK_OPS, run: runArk, source: "vendored ARK Worker engine.js" },
  zsolver: { ops: ZSOLVER_OPS, run: runZsolver, source: "vendored ZionPattern Solver Worker engine.js" },
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
