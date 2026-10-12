/**
 * RIB-039 / AZRT-SERVER-PROVENANCE-1.0 — which server answered a call.
 *
 * Every call receipt (FragGate ledger row, session exec receipt) records:
 *   server_path   where the answer came from
 *   server_hash   sha256 of the code that answered
 *   server_reason why a value is null (never a guess)
 *   server_basis  the inputs hashed (so a reviewer can see what changed)
 *
 * Hosted Worker: the "binary" is the deployed code, so server_hash covers the deploy identity
 * (CF_VERSION_METADATA.id and a deploy-time GIT_SHA) plus the tool's engine_digest (or the
 * FragGate registry_digest when the tool has no engine digest). A baked build-meta sha is not
 * a deploy stamp and is not used.
 * Local stdio (--local): the CLI registers the resolved module file and its sha256.
 * Proxy fallback: server_path is the upstream URL; its code cannot be hashed from here (null).
 *
 * Verify (checkServerDrift) walks receipts in order and reports SERVER-DRIFT per tool name when
 * server_path or server_hash differs from the previous receipt for that tool, and fails closed
 * (SERVER-PROVENANCE-MISSING) when a value goes null/absent after an earlier receipt had one.
 * Receipts without any server_* field before the first stamped one (old receipts) are skipped.
 * Receipts are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const SERVER_PROVENANCE_SPEC = "AZRT-SERVER-PROVENANCE-1.0";
export const SERVER_FIELDS = Object.freeze(["server_path", "server_hash", "server_reason", "server_basis"]);
const HEX = /^[0-9a-f]{7,40}$/;
const HASH = /^[0-9a-f]{64}$/;

let localIdentity = null;
/** Called once by the stdio CLI in --local mode with the resolved module file and its sha256. */
export function setLocalServerIdentity(id) {
  localIdentity = id && typeof id === "object" ? { path: id.path || null, sha256: HASH.test(String(id.sha256 || "")) ? id.sha256 : null, reason: id.reason || null } : null;
}
export function localServerIdentity() {
  return localIdentity;
}

function deployIdentity(env) {
  const meta = env && env.CF_VERSION_METADATA && typeof env.CF_VERSION_METADATA === "object" ? env.CF_VERSION_METADATA : null;
  const version_id = meta && typeof meta.id === "string" && meta.id ? meta.id : null;
  const raw = String((env && env.GIT_SHA) || "").trim().toLowerCase();
  const git_sha = HEX.test(raw) ? raw : null;
  return { version_id, git_sha };
}

/**
 * @param {object} o
 * @param {object} o.env
 * @param {string} o.tool        registered tool name (drift key)
 * @param {string} o.slug
 * @param {string|null} o.engine_digest
 * @param {string|null} o.registry_digest
 * @param {string|null} o.upstream  proxy target when the answer came from another server
 */
export async function serverProvenance({ env = null, tool = null, slug = null, engine_digest = null, registry_digest = null, upstream = null } = {}) {
  const tool_digest = engine_digest || registry_digest || null;
  const tool_digest_kind = engine_digest ? "engine_digest" : registry_digest ? "registry_digest" : null;
  const reasons = [];
  if (upstream) {
    return {
      server_path: String(upstream).slice(0, 300),
      server_hash: null,
      server_reason: "proxy_fallback: the upstream server answered; its code cannot be hashed from this runtime",
      server_basis: { spec: SERVER_PROVENANCE_SPEC, kind: "upstream", tool: tool || null },
    };
  }
  if (localIdentity) {
    const path = localIdentity.path ? `stdio://${localIdentity.path}#${slug || tool || ""}` : null;
    if (!path) reasons.push("local stdio module path not resolved" + (localIdentity.reason ? ": " + localIdentity.reason : ""));
    if (!localIdentity.sha256) reasons.push("local stdio module file could not be hashed" + (localIdentity.reason ? ": " + localIdentity.reason : ""));
    if (!tool_digest) reasons.push("no engine_digest or registry_digest for this tool");
    const basis = { spec: SERVER_PROVENANCE_SPEC, kind: "stdio", module_sha256: localIdentity.sha256, tool_digest_kind, tool_digest };
    const hash = localIdentity.sha256 && tool_digest ? await sha256Hex(canonicalize(basis)) : null;
    return { server_path: path, server_hash: hash, server_reason: reasons.length ? reasons.join("; ") : null, server_basis: { ...basis, tool: tool || null } };
  }
  const { version_id, git_sha } = deployIdentity(env);
  if (!version_id && !git_sha) reasons.push("no deployed code identity: CF_VERSION_METADATA is unbound and no deploy-time GIT_SHA was set");
  if (!tool_digest) reasons.push("no engine_digest or registry_digest for this tool");
  const basis = { spec: SERVER_PROVENANCE_SPEC, kind: "worker", version_id, git_sha, tool_digest_kind, tool_digest };
  const hash = (version_id || git_sha) && tool_digest ? await sha256Hex(canonicalize(basis)) : null;
  return {
    server_path: `worker://aziel-runtime/fraggate/${slug || tool || "unknown"}`,
    server_hash: hash,
    server_reason: reasons.length ? reasons.join("; ") : null,
    server_basis: { ...basis, tool: tool || null },
  };
}

function toolOf(rec) {
  if (!rec || typeof rec !== "object") return null;
  if (rec.name) return String(rec.name); // FragGate ledger: the registered tool name
  if (rec.server_basis && rec.server_basis.tool) return String(rec.server_basis.tool);
  const intent = rec.payload && rec.payload.intent;
  if (intent && intent.slug) return String(intent.slug) + (intent.op ? "." + intent.op : "");
  return null;
}

function stamped(rec) {
  return SERVER_FIELDS.some((k) => rec && Object.prototype.hasOwnProperty.call(rec, k));
}

/**
 * Walk receipts oldest first. Only call receipts carry server_* (refusals and session
 * open/policy/close do not), so `isCall` decides which rows must carry them.
 */
export function checkServerDrift(receipts, { isCall = (r) => stamped(r) || (r && r.event === "exec") || (r && r.asked === true && r.refused === false) } = {}) {
  const last = new Map();
  const drifts = [];
  let checked = 0;
  for (const rec of receipts || []) {
    if (!rec || !isCall(rec)) continue;
    const tool = toolOf(rec);
    if (!tool) continue;
    const prior = last.get(tool);
    const has = stamped(rec);
    if (!has && !prior) continue; // old receipt, nothing to compare yet
    checked++;
    const cur = { path: has ? rec.server_path ?? null : null, hash: has ? rec.server_hash ?? null : null, seq: rec.seq ?? null };
    if (prior) {
      const missing = [];
      if (prior.path && !cur.path) missing.push("server_path");
      if (prior.hash && !cur.hash) missing.push("server_hash");
      if (missing.length) {
        drifts.push({ code: "SERVER-PROVENANCE-MISSING", tool, seq: cur.seq, prev_seq: prior.seq, missing, reason: has ? rec.server_reason || null : "receipt carries no server_* fields" });
      }
      const changed = [];
      if (prior.path && cur.path && prior.path !== cur.path) changed.push({ field: "server_path", from: prior.path, to: cur.path });
      if (prior.hash && cur.hash && prior.hash !== cur.hash) changed.push({ field: "server_hash", from: prior.hash, to: cur.hash });
      if (changed.length) drifts.push({ code: "SERVER-DRIFT", tool, seq: cur.seq, prev_seq: prior.seq, changed });
    }
    last.set(tool, {
      path: cur.path || (prior && prior.path) || null,
      hash: cur.hash || (prior && prior.hash) || null,
      seq: cur.seq,
    });
  }
  return {
    spec: SERVER_PROVENANCE_SPEC,
    ok: drifts.length === 0,
    checked,
    tools: last.size,
    drifts,
    rule: "SERVER-DRIFT when server_path or server_hash differs from the previous receipt for the same tool name; SERVER-PROVENANCE-MISSING (fail closed) when a value is null after a prior receipt had one. A redeploy changes server_hash for every tool, so drift right after a deploy is expected and shows the version_id change in server_basis.",
  };
}
