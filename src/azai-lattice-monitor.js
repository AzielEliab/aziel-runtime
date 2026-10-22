/**
 * AZAI-LATTICE-MONITOR-1.0 (Aziel goal 5). Read-only review of the whole ChainLock lattice.
 * For every roster chain: seq, tip, lattice tips, verify breaks, and duplicate stamp / primary /
 * secondary / seq / prev (fork) counts. Then one cross-chain duplicate check over all chains.
 * Never writes, never seals, never authorizes an action. Sealed receipts are reviewed; nothing is signed.
 * Not an MCP tool (tools stay 36). Not a Softwares card (stays 42).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { ROSTER, loadChain, verify } from "./chainlock/ops.js";

export const AZAI_LATTICE_MONITOR_SPEC = "AZAI-LATTICE-MONITOR-1.0";

function dups(xs) {
  const seen = new Set();
  let n = 0;
  for (const x of xs) {
    if (x == null) continue;
    if (seen.has(x)) n++;
    else seen.add(x);
  }
  return n;
}

export async function reviewLattice(store, { chains = ROSTER, caller = undefined } = {}) {
  const out = { ok: true, spec: AZAI_LATTICE_MONITOR_SPEC, read_only: true, writes: 0, authorizes_action: false, signed: false, chains: [], cross_chain: null };
  const allStamps = [];
  const allPrimary = [];
  for (const c of chains) {
    const rows = await loadChain(store, c, caller);
    const checked = rows.length ? await verify(store, { c, caller }) : { ok: true, breaks: [] };
    const lat = rows.map((r) => r && r.lattice).filter(Boolean);
    const row = {
      chain: c,
      rows: rows.length,
      tip: rows.length ? rows[rows.length - 1].stamp_sha256 || null : null,
      lattice_tips: lat.length ? { primary: lat[lat.length - 1].primary, secondary: lat[lat.length - 1].secondary } : null,
      verify_ok: Boolean(checked.ok),
      breaks: (checked.breaks || []).slice(0, 20),
      dup_stamp: dups(rows.map((r) => r.stamp_sha256)),
      dup_primary: dups(lat.map((l) => l.primary)),
      dup_secondary: dups(lat.map((l) => l.secondary)),
      forks_prev_reused: dups(rows.map((r) => r.prev)),
      offline_rows: lat.filter((l) => l.offline === true).length,
    };
    row.healthy = row.verify_ok && row.dup_stamp + row.dup_primary + row.dup_secondary + row.forks_prev_reused === 0;
    if (!row.healthy) out.ok = false;
    out.chains.push(row);
    for (const r of rows) allStamps.push(r.stamp_sha256);
    for (const l of lat) allPrimary.push(l.primary);
  }
  out.cross_chain = { stamps: allStamps.length, dup_stamp: dups(allStamps), dup_primary: dups(allPrimary) };
  if (out.cross_chain.dup_stamp + out.cross_chain.dup_primary > 0) out.ok = false;
  out.note = "Read-only AZAI review of sealed ChainLock rows. Not signed. Not a public ledger. Does not authorize any action.";
  return out;
}
