/**
 * AZRT-ANCHOR-1.0 — outside anchoring of runtime chain heads (RIB-001..004),
 * AZRT-INTEGRITY-LEVEL-1.0 (RIB-017) and AZRT-AUDITOR-1.0 read side (RIB-023).
 *
 * The runtime only PUBLISHES its heads (GET /v1/anchor/heads) and READS the witness log.
 * It cannot write the witness log: that lives in a separate GitHub repo, written by a
 * GitHub Actions job that signs with an Ed25519 key held only as that repo's Actions
 * secret. The witness public key is pinned here, so a swapped key in the repo fails closed.
 * RFC 3161 (freetsa.org) and Sigstore Rekor give independent order and time; their tokens
 * are checked by the auditor job (openssl / Rekor API), not by this Worker.
 *
 * Law: docs/designs/AZRT-ANCHOR-1.0.md. Additive only. Fail closed. No rollback.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canonicalize, sha256Hex } from "./session-core.js";

export const ANCHOR_SPEC = "AZRT-ANCHOR-1.0";
export const HEADS_SPEC = "AZRT-ANCHOR-HEADS-1.0";
export const INTEGRITY_SPEC = "AZRT-INTEGRITY-LEVEL-1.0";
export const AUDITOR_SPEC = "AZRT-AUDITOR-1.0";
export const WITNESS_REPO = "AzielEliab/aziel-anchors";
export const WITNESS_REPO_URL = "https://github.com/" + WITNESS_REPO;
export const WITNESS_LOG_URL = "https://raw.githubusercontent.com/" + WITNESS_REPO + "/main/anchors/log.jsonl";
export const AUDIT_LOG_URL = "https://raw.githubusercontent.com/" + WITNESS_REPO + "/main/audits/log.jsonl";
/** Pinned witness key (raw Ed25519, base64url). Private half exists only as an Actions secret of WITNESS_REPO. */
/** Rotated 2026-10-11: generated inside a GitHub Actions run (rotate-keys, run 38108699312), never on a shared box. */
export const WITNESS_PUBLIC_KEY = "7G1g0sBqbrgPoarVni9iEH2k7CfYKookPdSikz7ZoSg";
/** Pinned auditor key (separate key, separate Actions secret, separate job). Rotated the same run. */
export const AUDITOR_PUBLIC_KEY = "znL8Y5UCTytkfgpbhZ79zFCLAqw1xXO9HqP2-WYnkYk";
/**
 * Retired keys (append-only). Each is accepted ONLY for statements n in [from_n, through_n], so
 * historical statements verify unchanged and a retired key cannot sign anything new.
 */
export const WITNESS_RETIRED_KEYS = Object.freeze([
  Object.freeze({ public_key: "tCPVJRmcKKH6LwEdUfcrzoei_dRxkwKl1BouZ4VB0lo", from_n: 1, through_n: 2, retired_at: "2026-10-11" }),
]);
export const AUDITOR_RETIRED_KEYS = Object.freeze([
  Object.freeze({ public_key: "FkI_irqaJPi1smYK1czR0G8TCGiBmmsMC_Eq2I0V6_g", from_n: 1, through_n: 2, retired_at: "2026-10-11" }),
]);
/** The key that must have signed statement n (retired epoch if n falls in one, else current). */
export function keyForN(n, current, retired = []) {
  const ep = (retired || []).find((e) => n >= e.from_n && n <= e.through_n);
  return ep ? ep.public_key : current;
}
export const ANCHOR_CACHE_MS = 120_000;
export const ANCHOR_FETCH_TIMEOUT_MS = 2500;

export const INTEGRITY_LEVELS = Object.freeze(["none", "hash_present", "chain_consistent", "externally_anchored"]);

/** Anchored roots: ChainLock chains + FragGate ask/refuse ledger (DO writers) + checkpointed stores. */
export const ANCHOR_CHAINS = Object.freeze([
  "genesis", "identity", "ssh", "session", "acts", "evidence", "recall", "mesh", "library", "learn", "refusals", "agentcomms", "fraggate",
]);

export const ANCHOR_CODES = Object.freeze({
  missing: "ANCHOR-MISSING",
  unreachable: "ANCHOR-UNREACHABLE",
  sig: "ANCHOR-SIG-BAD",
  key: "ANCHOR-KEY-MISMATCH",
  order: "ANCHOR-ORDER-BREAK",
  mismatch: "ANCHOR-MISMATCH",
});

function b64urlToBytes(text) {
  const s = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function verifyEd25519(publicKeyB64url, messageText, sigB64url) {
  try {
    const key = await crypto.subtle.importKey("raw", b64urlToBytes(publicKeyB64url), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, b64urlToBytes(sigB64url), new TextEncoder().encode(messageText));
  } catch {
    return false;
  }
}

export function integrityLevel({ hash_present = false, chain_consistent = false, externally_anchored = false } = {}) {
  if (hash_present && chain_consistent && externally_anchored) return "externally_anchored";
  if (hash_present && chain_consistent) return "chain_consistent";
  if (hash_present) return "hash_present";
  return "none";
}

export function integrityView(flags, note) {
  const level = integrityLevel(flags || {});
  return { spec: INTEGRITY_SPEC, level, levels: INTEGRITY_LEVELS.slice(1), ...(note ? { note } : {}) };
}

export function parseJsonlLines(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      out.push({ _broken: true });
    }
  }
  return out;
}

/**
 * Verify a witness (or auditor) log: statement hash recompute, pinned-key signature over the
 * canonical statement, contiguous n, prev link. Fails closed on the first break.
 */
export async function verifySignedLog(entries, { publicKey, retiredKeys = [], statementPrevField = "prev_statement_hash" } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  if (!rows.length) return { ok: false, code: ANCHOR_CODES.missing, n: 0, latest: null };
  let prev = "0".repeat(64);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row._broken || !row.statement) return { ok: false, code: ANCHOR_CODES.order, at: i + 1, reason: "unreadable" };
    const st = row.statement;
    const text = canonicalize(st);
    const hash = await sha256Hex(text);
    if (hash !== row.statement_hash) return { ok: false, code: ANCHOR_CODES.mismatch, at: i + 1, reason: "statement-hash" };
    if (Number(st.n) !== i + 1) return { ok: false, code: ANCHOR_CODES.order, at: i + 1, reason: "n-gap" };
    if (st[statementPrevField] !== prev) return { ok: false, code: ANCHOR_CODES.order, at: i + 1, reason: "prev-link" };
    const want = keyForN(i + 1, publicKey, retiredKeys);
    if (row.public_key !== want) return { ok: false, code: ANCHOR_CODES.key, at: i + 1, reason: "key-not-pinned" };
    if (!(await verifyEd25519(want, text, row.sig))) return { ok: false, code: ANCHOR_CODES.sig, at: i + 1, reason: "signature" };
    prev = hash;
  }
  return { ok: true, n: rows.length, latest: rows[rows.length - 1] };
}

const memo = { anchors: null, audits: null };

async function fetchText(fetchImpl, url) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ANCHOR_FETCH_TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(url, { signal: ctl ? ctl.signal : undefined, headers: { "user-agent": "aziel-runtime-anchor-reader" }, cf: { cacheTtl: 0 } });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, text: await res.text() };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err).slice(0, 120) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadLog(kind, fetchImpl, { force = false, now = Date.now() } = {}) {
  const hit = memo[kind];
  if (!force && hit && now - hit.at < ANCHOR_CACHE_MS) return hit.state;
  const url = kind === "anchors" ? WITNESS_LOG_URL : AUDIT_LOG_URL;
  const key = kind === "anchors" ? WITNESS_PUBLIC_KEY : AUDITOR_PUBLIC_KEY;
  const retiredKeys = kind === "anchors" ? WITNESS_RETIRED_KEYS : AUDITOR_RETIRED_KEYS;
  const got = await fetchText(fetchImpl || fetch, url);
  let state;
  if (!got.ok) {
    state = { ok: false, code: got.status === 404 ? ANCHOR_CODES.missing : ANCHOR_CODES.unreachable, url, detail: got.status || got.error };
  } else {
    const entries = parseJsonlLines(got.text);
    const check = await verifySignedLog(entries, { publicKey: key, retiredKeys, statementPrevField: kind === "anchors" ? "prev_statement_hash" : "prev_audit_hash" });
    state = { ...check, url, entries: check.ok ? entries : [] };
  }
  memo[kind] = { at: now, state };
  return state;
}

export function loadAnchors(fetchImpl, opts) {
  return loadLog("anchors", fetchImpl, opts);
}

export function loadAudits(fetchImpl, opts) {
  return loadLog("audits", fetchImpl, opts);
}

export function resetAnchorMemo() {
  memo.anchors = null;
  memo.audits = null;
}

/** Verified witness state this isolate already holds (no fetch). */
export function anchorsKnown() {
  const st = memo.anchors && memo.anchors.state;
  return st && st.ok ? st : null;
}

/**
 * Integrity for an in-memory chain (rows 0-based, seq 1-based). Uses only the already-verified
 * witness view. A witnessed head that no longer matches is a hard break (fail closed).
 */
export function chainIntegrity(chain, rows, chainOk) {
  const list = Array.isArray(rows) ? rows : [];
  const hashPresent = list.length > 0 && list.every((r) => r && (r.stamp_sha256 || r.hash));
  const known = anchorsKnown();
  const best = known ? anchoredThrough(known.entries, chain) : null;
  let anchored = false;
  let mismatch = null;
  if (best) {
    const row = list[best.seq - 1];
    const h = row ? row.stamp_sha256 || row.hash : null;
    if (h === best.h) anchored = true;
    else mismatch = { code: ANCHOR_CODES.mismatch, anchored_seq: best.seq, n: best.n };
  }
  const view = integrityView({ hash_present: hashPresent, chain_consistent: hashPresent && chainOk, externally_anchored: anchored && chainOk });
  return {
    ...view,
    anchored_through: anchored ? best.seq : 0,
    rows: list.length,
    ...(anchored && list.length > best.seq ? { unanchored_tail: list.length - best.seq } : {}),
    witness_view: known ? "verified" : "not-loaded",
    ...(mismatch ? { mismatch } : {}),
  };
}

/** Test hook: seed a verified state without network. */
export function seedAnchorMemo(kind, state, at = Date.now()) {
  memo[kind] = { at, state };
}

/**
 * Anchor reference recorded on new receipts: the newest witness statement this isolate has
 * VERIFIED (pinned key). Non-blocking: never fetches on the mint path. Null when none is known;
 * then the receipt simply has no anchor field (honest, lower integrity).
 */
export function anchorRefNow() {
  const st = memo.anchors && memo.anchors.state;
  if (!st || !st.ok || !st.latest) return null;
  return {
    spec: ANCHOR_SPEC,
    log: WITNESS_REPO,
    n: Number(st.latest.statement.n),
    statement_hash: st.latest.statement_hash,
  };
}

/** Background refresh (ctx.waitUntil) so the mint path never waits on GitHub. */
export async function refreshAnchorsIfStale(fetchImpl, now = Date.now()) {
  const hit = memo.anchors;
  if (hit && now - hit.at < ANCHOR_CACHE_MS) return hit.state;
  return loadAnchors(fetchImpl, { now });
}

function storeOf(env, storeFor) {
  return env && env.CHAINLOCK && storeFor ? storeFor(env) : null;
}

/** GET /v1/anchor/heads — what the witness pulls. Read-only; mints nothing. */
export async function collectHeads(env, { storeFor, aznewsCall, mapCall, agentHourlyTip = null, version, gitSha, versionId = null, now = new Date() } = {}) {
  const store = storeOf(env, storeFor);
  const chains = [];
  if (store && typeof store.chainMeta === "function") {
    for (const c of ANCHOR_CHAINS) {
      try {
        if (c === "agentcomms" && typeof agentHourlyTip === "function") {
          // AGENT-SUBNET-1.0: the hourly tip only (exact seq and h at that hour, so the witness can check it).
          const ht = await agentHourlyTip(env);
          if (ht && ht.seq > 0 && ht.h) chains.push({ c, seq: ht.seq, h: ht.h, lattice: ht.lattice || null, hourly: true, as_of: ht.as_of });
          continue;
        }
        const m = await store.chainMeta(c);
        if (m && m.ok && m.seq > 0) chains.push({ c, seq: m.seq, h: m.tip, lattice: m.lt || null });
      } catch {
        chains.push({ c, error: "unreadable" });
      }
    }
  }
  const stores = {};
  for (const [name, call] of [["aznews", aznewsCall], ["4dmap", mapCall]]) {
    if (typeof call !== "function") continue;
    try {
      const led = await call(env, "ledger", {});
      const cp = led && led.checkpoint_tip;
      if (cp && cp.n) stores[name] = { n: cp.n, cp_hash: cp.cp_hash, to_seq: cp.to_seq };
    } catch {
      stores[name] = { error: "unreadable" };
    }
  }
  return {
    spec: HEADS_SPEC,
    runtime: "aziel-runtime",
    author: "Aziel Eliab",
    version: version || null,
    git_sha: gitSha || null,
    // RIB-041 AZRT-BUILD-WITNESS-1.0: build identity for the witness to sign next to the heads.
    build: { spec: "AZRT-BUILD-WITNESS-1.0", git_sha: gitSha || null, version_id: versionId || null },
    at: now.toISOString(),
    seq_base: 1,
    chains,
    stores,
    witness: { repo: WITNESS_REPO_URL, log: WITNESS_LOG_URL, public_key: WITNESS_PUBLIC_KEY },
    note: "Heads only. The runtime cannot write the witness log; it can only read it.",
  };
}

/**
 * Check one witness statement against what the runtime holds now. Append-only law: every
 * anchored head must still be the same row at the same seq. Any difference is ANCHOR-MISMATCH.
 */
export async function checkStatementAgainstRuntime(env, statement, { storeFor, aznewsCall, mapCall } = {}) {
  const heads = (statement && statement.heads) || {};
  const store = storeOf(env, storeFor);
  const results = [];
  for (const head of Array.isArray(heads.chains) ? heads.chains : []) {
    if (!head || !head.c || !head.seq || !head.h) continue;
    if (!store || typeof store.chainRow !== "function") {
      results.push({ c: head.c, seq: head.seq, ok: false, code: "ANCHOR-STORE-UNBOUND" });
      continue;
    }
    const got = await store.chainRow(head.c, head.seq);
    const row = got && got.row;
    const h = row ? row.stamp_sha256 || row.hash : null;
    results.push({ c: head.c, seq: head.seq, ok: h === head.h, code: h === head.h ? "ANCHOR-OK" : ANCHOR_CODES.mismatch, ...(h === head.h ? {} : { runtime_h: h, anchored_h: head.h }) });
  }
  for (const [name, call] of [["aznews", aznewsCall], ["4dmap", mapCall]]) {
    const a = heads.stores && heads.stores[name];
    if (!a || !a.n || !a.cp_hash || typeof call !== "function") continue;
    const out = await call(env, "checkpoints", { after: a.n - 1 });
    const cp = out && Array.isArray(out.checkpoints) ? out.checkpoints.find((x) => x && x.n === a.n) : null;
    const ok = Boolean(cp && cp.cp_hash === a.cp_hash);
    results.push({ c: name, cp_n: a.n, ok, code: ok ? "ANCHOR-OK" : ANCHOR_CODES.mismatch });
  }
  return { ok: results.length > 0 && results.every((r) => r.ok), checked: results.length, results };
}

/** Highest anchored seq for a chain across the verified witness log (for integrity levels). */
export function anchoredThrough(entries, chain) {
  let best = null;
  for (const row of entries || []) {
    const heads = row && row.statement && row.statement.heads;
    for (const head of (heads && Array.isArray(heads.chains) ? heads.chains : [])) {
      if (head && head.c === chain && head.seq && (!best || head.seq > best.seq)) best = { seq: head.seq, h: head.h, n: row.statement.n, statement_hash: row.statement_hash };
    }
  }
  return best;
}

export const ROW_WALK_MAX = 256;

export async function recomputeRowHash(row) {
  if (!row) return null;
  if (row.stamp_sha256) {
    const { stampSha256 } = await import("./chainlock/ops.js");
    return stampSha256(row);
  }
  if (row.hash) {
    const { hash, idemp, ...body } = row;
    return sha256Hex(canonicalize(body));
  }
  return null;
}

export const LEDGER_ROWS_SPEC = "LEDGER-ROWS-1.0";
export const LEDGER_PAGE_MAX = 100;
export const GENESIS_PREVS = Object.freeze(["GENESIS", "0".repeat(64)]);

/**
 * LEDGER-ROWS-1.0: public walk from genesis, one page at a time. GET /v1/anchor/rows?c=&from=&limit=.
 * Every row is recomputed and linked by prev inside the page. The first row of page 1 must link to
 * genesis (64 zeros). A walker carries `next.expect_prev` into the next page and checks the link
 * itself, so no page has to be trusted on its own. Fails closed on any break. Read-only.
 */
export async function pageRows(env, chain, from, limit, deps = {}) {
  const store = storeOf(env, deps.storeFor);
  if (!store || typeof store.chainRows !== "function") return { ok: false, code: "LEDGER-STORE-UNBOUND", chain };
  const n = Math.min(Math.max(Math.floor(Number(limit)) || 50, 1), LEDGER_PAGE_MAX);
  const got = await store.chainRows(chain, from, n);
  if (!got || !got.ok) return { ok: false, code: "LEDGER-NO-ROWS", chain, from, reason: got && got.refuse };
  const rows = [];
  const breaks = [];
  let prevHash = null;
  for (const { seq, row } of got.rows) {
    const h = rowHash(row);
    const recomputed = await recomputeRowHash(row);
    if (!h || recomputed !== h) breaks.push({ seq, why: "hash does not recompute" });
    if (seq === 1 && !GENESIS_PREVS.includes(rowPrev(row))) breaks.push({ seq, why: "row 1 does not link to genesis" });
    if (prevHash !== null && rowPrev(row) !== prevHash) breaks.push({ seq, why: "prev does not link to the row before" });
    prevHash = h;
    rows.push({ seq, h, prev: rowPrev(row) || null, lattice: row && row.lattice ? { primary: row.lattice.primary, secondary: row.lattice.secondary } : null, row });
  }
  const last = rows.length ? rows[rows.length - 1].seq : Number(from) - 1;
  const ok = breaks.length === 0;
  return {
    spec: LEDGER_ROWS_SPEC,
    ok,
    code: ok ? "LEDGER-PAGE-OK" : "LEDGER-PAGE-BROKEN",
    fail_closed: true,
    chain,
    from: Number(from),
    count: rows.length,
    head_seq: got.seq,
    first_prev: rows.length ? rows[0].prev : null,
    rows,
    breaks,
    next: last < got.seq ? { from: last + 1, expect_prev: prevHash, url: `/v1/anchor/rows?c=${chain}&from=${last + 1}&limit=${n}` } : null,
    walk_rule: "Start at from=1 (first_prev must be \"GENESIS\" or 64 zeros). For each next page, first_prev must equal the expect_prev you were given. Compare the last h with /v1/anchor/heads and the aziel-anchors log.",
  };
}

export function rowPrev(row) {
  return row ? row.prev : null;
}

export function rowHash(row) {
  return row ? row.stamp_sha256 || row.hash || null : null;
}

/**
 * Integrity of one stored row (1-based seq). chain_consistent: the row recomputes and every
 * row from it up to the newest anchored row (bounded walk) recomputes and links by prev.
 * externally_anchored: additionally a verified witness statement anchors this chain at
 * seq >= row and the anchored row still matches. Anything else fails closed.
 */
export async function rowIntegrity(env, chain, seq, deps = {}) {
  const store = storeOf(env, deps.storeFor);
  if (!store || typeof store.chainRow !== "function") return { ok: false, code: "ANCHOR-STORE-UNBOUND", integrity: integrityView({}) };
  const got = await store.chainRow(chain, seq);
  if (!got || !got.ok) return { ok: false, code: "ANCHOR-NO-ROW", chain, seq, integrity: integrityView({}) };
  const row = got.row;
  const hash = rowHash(row);
  const selfOk = Boolean(hash) && (await recomputeRowHash(row)) === hash;
  const anchors = await loadAnchors(deps.fetchImpl || fetch);
  const best = anchors.ok ? anchoredThrough(anchors.entries, chain) : null;
  let anchorCheck = { ok: false, code: anchors.ok ? ANCHOR_CODES.missing : anchors.code, note: anchors.ok ? "No verified witness statement anchors this chain at or after this row yet." : "Witness log could not be verified." };
  let walkOk = selfOk;
  let externally = false;
  if (selfOk && best && best.seq >= seq) {
    if (best.seq - seq > ROW_WALK_MAX) {
      anchorCheck = { ok: false, code: "ANCHOR-WALK-TOO-LONG", anchored_seq: best.seq, note: `More than ${ROW_WALK_MAX} rows to the anchored head; use chainlock_verify for the full walk.` };
    } else {
      let prevHash = hash;
      let last = row;
      for (let i = seq + 1; i <= best.seq && walkOk; i++) {
        const next = await store.chainRow(chain, i);
        const r = next && next.row;
        if (!r || rowPrev(r) !== prevHash || (await recomputeRowHash(r)) !== rowHash(r)) walkOk = false;
        else {
          prevHash = rowHash(r);
          last = r;
        }
      }
      externally = walkOk && rowHash(last) === best.h;
      anchorCheck = externally
        ? { ok: true, code: "ANCHOR-OK", anchored_seq: best.seq, n: best.n, statement_hash: best.statement_hash }
        : { ok: false, code: ANCHOR_CODES.mismatch, anchored_seq: best.seq };
    }
  }
  return {
    ok: anchorCheck.ok,
    code: anchorCheck.code,
    chain,
    seq,
    hash,
    anchor_ref: row.anchor || null,
    anchor_check: anchorCheck,
    integrity: integrityView({ hash_present: Boolean(hash), chain_consistent: walkOk, externally_anchored: externally }),
  };
}
