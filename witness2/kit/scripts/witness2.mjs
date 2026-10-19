// AZRT-WITNESS-QUORUM-1.0 slot 2: the second, independent witness. Runs on a host that is not GitHub and not
// Cloudflare (default: Codeberg Forgejo Actions). Reads aziel-runtime GET /v1/anchor/heads, signs a chained
// statement in the SAME format as slot 1 (AZRT-ANCHOR-1.0) with WITNESS2_ED25519_PKCS8 (a repo secret on this
// host only), and appends anchors/log.jsonl. The runtime reads this log as slot 2 (WITNESS2_LOG_URL +
// WITNESS2_PUBLIC_KEY). The runtime has no write path here. Author: Aziel Eliab.
import fs from "node:fs";
import { RUNTIME, ZERO, canonicalize, sha256, loadKey, sign, readJsonl, getJson } from "./lib.mjs";

const LOG = process.env.WITNESS2_LOG_PATH || "anchors/log.jsonl";
const PUB = process.env.WITNESS2_PUB_PATH || "keys/witness2.pub";
const HOST = process.env.WITNESS2_HOST || "codeberg.org";
const REPO = process.env.WITNESS2_REPO || process.env.GITHUB_REPOSITORY || null;

export async function anchorOnce({ heads, now = new Date(), force = false, key, pub, log, runId = null }) {
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
  if (!out.anchored) { console.log(out.reason); process.exit(0); }
  fs.mkdirSync(LOG.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify(out.row) + "\n");
  console.log(`witness2 anchored n=${out.row.statement.n} ${out.row.statement_hash} chains=${heads.chains.length}`);
}
