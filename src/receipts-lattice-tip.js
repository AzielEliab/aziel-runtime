/**
 * RECEIPTS-LATTICE-TIP-1.0. Additive block on GET /v1/receipts and /v1/receipts/tip:
 * the runtime's own ChainLock primary and secondary tips per chain, read from chain meta.
 * Fails closed: an unbound store or a timeout gives ok:false and no tips; nothing is invented.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
export const RECEIPTS_LATTICE_TIP_SPEC = "RECEIPTS-LATTICE-TIP-1.0";

export async function runtimeLatticeTip(env, store, { timeoutMs = 2500 } = {}) {
  const base = { spec: RECEIPTS_LATTICE_TIP_SPEC, source: "chainlock", heads_path: "/v1/anchor/heads", corpus_tip_unchanged: true };
  if (!store || typeof store.chainMeta !== "function") return { ...base, ok: false, code: "LATTICE-TIP-STORE-UNBOUND", chains: [] };
  const { ANCHOR_CHAINS } = await import("./anchor.js");
  const read = Promise.all(ANCHOR_CHAINS.map(async (c) => {
    try {
      if (c === "agentcomms") {
        // AGENT-SUBNET-1.0 (AZBot N4): the hourly tip only, like /v1/anchor/heads (no real-time agent timing).
        const { agentHourlyTip } = await import("./agent-subnet.js");
        const ht = await agentHourlyTip(env);
        if (!ht || !(ht.seq > 0) || !ht.h) return null;
        return { c, seq: ht.seq, h: ht.h, primary: (ht.lattice && ht.lattice.primary) || null, secondary: (ht.lattice && ht.lattice.secondary) || null, hourly: true, as_of: ht.as_of };
      }
      const m = await store.chainMeta(c);
      if (!m || !m.ok || !(m.seq > 0)) return null;
      return { c, seq: m.seq, h: m.tip, primary: (m.lt && m.lt.primary) || null, secondary: (m.lt && m.lt.secondary) || null };
    } catch {
      return { c, error: "unreadable" };
    }
  }));
  let timer;
  const late = new Promise((r) => { timer = setTimeout(() => r("timeout"), timeoutMs); });
  const got = await Promise.race([read, late]);
  clearTimeout(timer);
  if (got === "timeout") return { ...base, ok: false, code: "LATTICE-TIP-TIMEOUT", chains: [] };
  const chains = got.filter(Boolean);
  const bad = chains.some((x) => x.error);
  return { ...base, ok: !bad && chains.length > 0, code: bad ? "LATTICE-TIP-PARTIAL" : chains.length ? "LATTICE-TIP-OK" : "LATTICE-TIP-EMPTY", chains };
}
