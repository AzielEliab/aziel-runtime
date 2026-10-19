// AZRT-WITNESS-QUORUM-1.0 slot 2: the second witness (different key, host and provider; same account holder).
// Designed to run on a host that is not GitHub and not Cloudflare (default: Codeberg Forgejo Actions), every
// 15 minutes once set up. Before appending it re-verifies its own log (order, links, hashes, pinned key,
// signatures) and refuses to append to a broken log. When run, it reads aziel-runtime GET /v1/anchor/heads, signs a chained
// statement in the SAME format as slot 1 (AZRT-ANCHOR-1.0) with WITNESS2_ED25519_PKCS8 (a repo secret on this
// host only), and appends anchors/log.jsonl. The runtime reads this log as slot 2 (WITNESS2_LOG_URL +
// WITNESS2_PUBLIC_KEY). The runtime has no write path here. Author: Aziel Eliab.
import fs from "node:fs";
import { RUNTIME, ZERO, canonicalize, sha256, loadKey, sign, verify, readJsonl, getJson } from "./lib.mjs";

const LOG = process.env.WITNESS2_LOG_PATH || "anchors/log.jsonl";
const PUB = process.env.WITNESS2_PUB_PATH || "keys/witness2.pub";
const HOST = process.env.WITNESS2_HOST || "codeberg.org";
const REPO = process.env.WITNESS2_REPO || process.env.GITHUB_REPOSITORY || null;

/**
 * Re-verify this witness's own log before appending: n is 1..len in order, each prev_statement_hash links to
 * the previous statement_hash (ZERO first), statement_hash is sha256 of the canonical statement, the row's key
 * is the pinned key and the signature verifies. Returns { ok, n } or { ok:false, code, at, reason }.
 */
export function verifyOwnLog(log, pinned) {
  let prev = ZERO;
  for (let i = 0; i < (log || []).length; i++) {
    const r = log[i];
    const at = i + 1;
    const bad = (code, reason) => ({ ok: false, code, at, reason });
    if (!r || typeof r !== "object" || !r.statement || typeof r.statement !== "object") return bad("W2-LOG-ROW-BAD", "row is not a statement");
    if (r.statement.n !== at) return bad("W2-LOG-ORDER", `n is ${r.statement.n}, expected ${at}`);
    if (r.statement.prev_statement_hash !== prev) return bad("W2-LOG-LINK", "prev_statement_hash does not link to the previous row");
    const text = canonicalize(r.statement);
    if (r.statement_hash !== sha256(text)) return bad("W2-LOG-HASH", "statement_hash does not match the statement");
    if (r.public_key !== pinned) return bad("W2-LOG-KEY", "row key is not the pinned keys/witness2.pub");
    let ok = false;
    try { ok = verify(pinned, text, r.sig); } catch { ok = false; }
    if (!ok) return bad("W2-LOG-SIG", "signature does not verify");
    prev = r.statement_hash;
  }
  return { ok: true, n: (log || []).length };
}

export async function anchorOnce({ heads, now = new Date(), force = false, key, pub, log, runId = null }) {
  // Fail closed: never append to a log that does not verify (and never "repair" it).
  const own = verifyOwnLog(log, pub);
  if (!own.ok) return { anchored: false, refused: true, ...own, reason: `own log does not verify at row ${own.at} (${own.code}): ${own.reason}; nothing appended` };
  const last = log[log.length - 1];
  const same = last && canonicalize(last.statement.heads.chains) === canonicalize(heads.chains) && canonicalize(last.statement.heads.stores || null) === canonicalize(heads.stores || null) && (last.statement.git_sha || null) === (heads.git_sha || null);
  if (same && !force) return { anchored: false, reason: `heads unchanged since statement ${last.statement.n}` };
  const statement = {
    spec: "AZRT-ANCHOR-1.0",
    n: log.length + 1,
    prev_statement_hash: last ? last.statement_hash : ZERO,
    observed_at: now.toISOString(),
    source: `${RUNTIME}/v1/anchor/heads`,
    git_sha: heads.git_sha || null,
    heads: { chains: heads.chains, stores: heads.stores || null, version: heads.version || null, git_sha: heads.git_sha || null, at: heads.at || null },
    witness: { slot: 2, host: HOST, repo: REPO, run_id: runId, key: "keys/witness2.pub" },
  };
  const text = canonicalize(statement);
  const row = { statement, statement_hash: sha256(text), public_key: pub, sig: sign(key, text), tsa: null, rekor: null };
  const next = verifyOwnLog([...log, row], pub);
  if (!next.ok) return { anchored: false, refused: true, ...next, reason: `new row does not verify (${next.code}); nothing appended` };
  return { anchored: true, row };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pinned = fs.readFileSync(PUB, "utf8").trim();
  const { key, pub } = loadKey("WITNESS2_ED25519_PKCS8");
  if (pub !== pinned) throw new Error("WITNESS2_ED25519_PKCS8 does not match keys/witness2.pub");
  const log = readJsonl(LOG);
  const heads = await getJson(`${RUNTIME}/v1/anchor/heads`);
  if (!heads || !Array.isArray(heads.chains)) throw new Error("runtime heads unreadable; nothing anchored");
  const out = await anchorOnce({ heads, force: process.env.FORCE === "1", key, pub, log, runId: process.env.GITHUB_RUN_ID || null });
  if (!out.anchored) { console.log(out.reason); process.exit(out.refused ? 1 : 0); }
  fs.mkdirSync(LOG.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify(out.row) + "\n");
  console.log(`witness2 anchored n=${out.row.statement.n} ${out.row.statement_hash} chains=${heads.chains.length}`);
}
