/**
 * Lattice learn (LATTICE-LEARN-1.0).
 *
 * The memory path learns from hash-chain lattice growth. One call reads the
 * next page of rows on one chain from a forward-only cursor, verifies the
 * rows link, and observes the new primary and secondary tips as one memory
 * observation per chain (subject "lattice:<chain>"). Append-only: it only
 * observes; it never rewrites or deletes a memory. Forward-only: the cursor
 * comes from the last observation, and a head behind the cursor refuses.
 * Fails closed: unbound store, broken page, or legacy rows without a lattice
 * block refuse or are skipped, and nothing is written.
 *
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */


export const LATTICE_LEARN_SPEC = "LATTICE-LEARN-1.0";
export const LATTICE_LEARN_PAPER = "docs/designs/LATTICE-LEARN-1.0.md";

function refuse(code, message, extra = {}) {
  return { ok: false, spec: LATTICE_LEARN_SPEC, code, message, fail_closed: true, written: false, ...extra };
}

/** Parse the cursor out of a prior fact: "seq=<n> primary=<hex> secondary=<hex>". */
export function cursorOf(fact) {
  const m = /seq=(\d+)/.exec(String(fact || ""));
  return m ? Number(m[1]) : 0;
}

export function learnFact(seq, primary, secondary, count) {
  return `seq=${seq} p=${String(primary).slice(0, 16)} s=${String(secondary).slice(0, 16)} n=${count}`;
}

/**
 * deps: { observe(env, packet), page?, kv? }. Cursor lives at RUNTIME_KV
 * lattice-learn:cursor:<chain> and only ever moves forward.
 * page defaults to anchor.pageRows with the CHAINLOCK store.
 */
export async function latticeLearn(env, src = {}, deps = {}) {
  const { pageRows, ANCHOR_CHAINS } = await import("./anchor.js");
  const chain = String(src.chain || src.c || "");
  if (!ANCHOR_CHAINS.includes(chain)) return refuse("LATTICE-LEARN-BAD-CHAIN", "Name one chain.", { chains: ANCHOR_CHAINS.slice() });
  const subject = `lattice:${chain}`;
  const kv = deps.kv || (env && env.RUNTIME_KV) || null;
  if (!kv) return refuse("LATTICE-LEARN-KV-UNBOUND", "No cursor store. Nothing was learned.");
  const key = `lattice-learn:cursor:${chain}`;
  const cursor = cursorOf(await kv.get(key));
  const page = deps.page || (async (e, c, from, n) => { const { storeFor } = await import("./chainlock/store.js"); return pageRows(e, c, from, n, { storeFor }); });
  const out = await page(env, chain, cursor + 1, Math.min(Math.max(Number(src.limit) || 100, 1), 100));
  if (!out || out.code === "LEDGER-STORE-UNBOUND") return refuse("LATTICE-LEARN-STORE-UNBOUND", "The chain store is not bound. Nothing was learned.");
  if (!out.ok && out.code === "LEDGER-NO-ROWS") {
    return { ok: true, spec: LATTICE_LEARN_SPEC, code: "LATTICE-LEARN-NOTHING-NEW", chain, cursor, written: false };
  }
  if (!out.ok) return refuse("LATTICE-LEARN-PAGE-BROKEN", "The page did not verify. Nothing was learned.", { chain, breaks: out.breaks || null });
  if (Number.isInteger(out.head_seq) && out.head_seq < cursor) {
    return refuse("LATTICE-LEARN-BEHIND-CURSOR", "The chain head is behind the learned cursor. Forward-only; nothing was learned.", { chain, cursor, head_seq: out.head_seq });
  }
  const lat = (out.rows || []).filter((r) => r.lattice && r.lattice.primary && r.lattice.secondary);
  const last = (out.rows || []).length ? out.rows[out.rows.length - 1].seq : cursor;
  if (!lat.length) {
    return { ok: true, spec: LATTICE_LEARN_SPEC, code: last > cursor ? "LATTICE-LEARN-LEGACY-ONLY" : "LATTICE-LEARN-NOTHING-NEW", chain, cursor, written: false, note: "Rows without a lattice block do not move the cursor." };
  }
  const tip = lat[lat.length - 1];
  const fact = learnFact(tip.seq, tip.lattice.primary, tip.lattice.secondary, lat.length);
  if (src.dry_run) return { ok: true, spec: LATTICE_LEARN_SPEC, code: "LATTICE-LEARN-DRY-RUN", chain, cursor, would_observe: { subject, fact }, written: false };
  const obs = await deps.observe(env, { subject, fact, relation_key: "lattice_tip", object_key: chain });
  if (obs && obs.ok !== false) {
    const again = cursorOf(await kv.get(key));
    if (again > tip.seq) return refuse("LATTICE-LEARN-BEHIND-CURSOR", "Another writer moved the cursor past this page. Forward-only.", { chain, observation: obs });
    await kv.put(key, fact);
  }
  return { ok: Boolean(obs && obs.ok !== false), spec: LATTICE_LEARN_SPEC, code: obs && obs.ok !== false ? "LATTICE-LEARN-OK" : "LATTICE-LEARN-OBSERVE-REFUSED", chain, cursor_from: cursor, cursor_to: tip.seq, new_lattice_rows: lat.length, observation: obs, append_only: true, forward_only: true };
}
