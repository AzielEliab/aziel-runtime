/**
 * AZAI-LEG-TIPS-1.0 (lattice plan step 8). The tether already carries runtime lattice tips to each
 * leg (AZRT-AZOS-TETHER-1.0 packet.tips). This reads back the tips AZ-OS and AZInterface stored
 * (GET /v1/tether on each leg tracker) and compares them with the runtime's own lattice, per chain:
 *   match   leg tip == runtime tip
 *   behind  leg tip is an earlier runtime lattice row (not yet pushed; not a break)
 *   fork    leg tip is not on the runtime lattice at all (cross-leg fork)
 *   absent  the leg stored nothing for this chain
 *   unbound / unreachable  the leg could not be read (fail closed: never reported as match)
 * Read-only: no writes, no pushes, never authorizes an action. Sealed, not signed by AZAI.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { TETHER_CHAINS, TETHER_AZOS_ORIGIN, TETHER_AZINTERFACE_ORIGIN, azosTetherState } from "./azos-tether.js";
import { loadChain } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";

export const AZAI_LEG_TIPS_SPEC = "AZAI-LEG-TIPS-1.0";
export const LEG_NAMES = Object.freeze(["azos", "azinterface"]);

export function classifyLegTip(runtimeRows, legTip) {
  const lats = (runtimeRows || []).map((r) => r && r.lattice).filter((l) => l && l.primary);
  if (!legTip || !legTip.primary) return "absent";
  const last = lats[lats.length - 1];
  if (last && last.primary === legTip.primary) return last.secondary === legTip.secondary ? "match" : "fork";
  const at = lats.findIndex((l) => l.primary === legTip.primary);
  if (at < 0) return "fork";
  return lats[at].secondary === legTip.secondary ? "behind" : "fork";
}

function legFetchers(env, opts) {
  const azos = env && env.AZOS && typeof env.AZOS.fetch === "function" ? (u, i) => env.AZOS.fetch(u, i) : null;
  const azinterface = env && env.AZINTERFACE && typeof env.AZINTERFACE.fetch === "function" ? (u, i) => env.AZINTERFACE.fetch(u, i) : null;
  return {
    azos: opts.azosFetcher !== undefined ? opts.azosFetcher : azos,
    azinterface: opts.azinterfaceFetcher !== undefined ? opts.azinterfaceFetcher : azinterface,
  };
}

export async function compareLegTips(env, opts = {}) {
  const store = opts.store || storeFor(env);
  const chains = opts.chains || TETHER_CHAINS;
  const f = legFetchers(env, opts);
  const origins = { azos: TETHER_AZOS_ORIGIN, azinterface: TETHER_AZINTERFACE_ORIGIN };
  const states = {};
  for (const leg of LEG_NAMES) {
    if (!f[leg]) { states[leg] = { ok: false, code: "unbound", chains: {} }; continue; }
    try { states[leg] = await azosTetherState(env, f[leg], origins[leg]); } catch { states[leg] = { ok: false, code: "unreachable", chains: {} }; }
  }
  const out = { spec: AZAI_LEG_TIPS_SPEC, read_only: true, writes: 0, authorizes_action: false, legs: {}, chains: [], forks: 0, ok: true };
  for (const leg of LEG_NAMES) out.legs[leg] = { reachable: states[leg].ok === true, code: states[leg].ok ? "ok" : states[leg].code === "unbound" ? "unbound" : "unreachable" };
  for (const c of chains) {
    const rows = await loadChain(store, c);
    const lats = rows.map((r) => r && r.lattice).filter((l) => l && l.primary);
    const last = lats[lats.length - 1];
    const row = { chain: c, runtime_tip: last ? { primary: last.primary, secondary: last.secondary } : null };
    for (const leg of LEG_NAMES) {
      if (!states[leg].ok) { row[leg] = out.legs[leg].code; continue; }
      const st = states[leg].chains[c];
      row[leg] = classifyLegTip(rows, st && st.tips);
      if (row[leg] === "fork") out.forks++;
    }
    out.chains.push(row);
  }
  out.ok = out.forks === 0;
  out.note = "Compares leg-stored tether tips with the runtime lattice. 'behind' is not a break; 'fork' is. Unreadable legs are never counted as matching.";
  return out;
}
