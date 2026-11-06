/**
 * Build / deploy snapshot for GET /v1/software.
 * env.GIT_SHA (wrangler --var GIT_SHA:$(git rev-parse HEAD)) wins.
 * This fallback is the last stamped commit so Cursor/OAuth deploys
 * still expose a hex sha when --var is omitted.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
export const BUILD_GIT_SHA = "e2159d5b06916717f711e43a40b5c3b8de732365";
export const BUILD_STAMPED_AT = "2026-09-10";
/** sha256 of the uploaded bundle. Null until a build emits one. Not a deploy var. Not live. */
export const BUILD_BUNDLE_DIGEST = null;
