/**
 * F05 — honest durable-commit labels.
 * FragGate ledger public window is ephemeral (cap 64).
 * ChainLock / SESSION Durable Objects are durable commits when bound.
 * MemoryStore is never durable. AKM memory is belief, not a commit.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { LEDGER_CAP } from "./fraggate/ledger.js";
import { RECEIPT_CAP, SESSION_TTL_MS, sessionBindingUp } from "./production.js";

export const MEMORY_STORE_IS_DURABLE = false;

function bindingUp(ns) {
  return Boolean(
    ns && (typeof ns.getByName === "function" || typeof ns.idFromName === "function" || typeof ns.get === "function"),
  );
}

export function durabilityLabels(env) {
  const chainlock = bindingUp(env && env.CHAINLOCK);
  const session = sessionBindingUp(env);
  const rate = bindingUp(env && env.RATE);
  return {
    fraggate_ledger: {
      kind: "ask-refuse-hash-chain",
      window_cap: LEDGER_CAP,
      ephemeral_window: true,
      durable_commit: chainlock,
      durable_commit_label: chainlock
        ? "CHAINLOCK Durable Object (commit-before-ack, public window last 64)"
        : "isolate MemoryStore — not durable; public window last 64",
      memory_store_is_durable: false,
      public_qxact_ledger: false,
    },
    chainlock: {
      kind: "append-only-stamps",
      durable_commit: chainlock,
      durable_commit_label: chainlock
        ? "CHAINLOCK Durable Object per chain (commit-before-ack)"
        : "isolate MemoryStore — not durable",
      memory_store_is_durable: false,
      public_ledger: false,
    },
    session: {
      kind: "runtime-session",
      durable_commit: session,
      durable_commit_label: session
        ? "SESSION Durable Object (TTL 6h, receipt cap 64)"
        : "SESSION binding missing",
      receipt_cap: RECEIPT_CAP,
      ttl_ms: SESSION_TTL_MS,
      memory_store_is_durable: false,
    },
    rate_quota: {
      kind: "abuse-quota",
      durable_commit: rate,
      durable_commit_label: rate
        ? "RATE Durable Object (per IP+bucket sliding window)"
        : "isolate sliding window — not a global quota",
      memory_store_is_durable: false,
    },
    memory_store: {
      durable: false,
      durable_commit: false,
      note: "MemoryStore is in-process isolate memory. Not a durable commit. Do not treat as CHAINLOCK, SESSION, or a public ledger.",
    },
    akm_memory: {
      durable: false,
      durable_commit: false,
      note: "AKM-TRIAD memory is derived belief, not a durable commit and not ChainLock. Posterior ≠ truth.",
    },
  };
}

export function attachDurability(body, env) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  if (body.durability && typeof body.durability === "object") return body;
  return { ...body, durability: durabilityLabels(env) };
}
