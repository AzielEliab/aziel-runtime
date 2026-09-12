/**
 * ChainLock public surface — internal fabric + MCP chainlock_* tools.
 *
 * Not a Softwares-tab product. Not a FragGate catalog slug.
 * Author: Aziel Eliab only.
 */

import { append, groundedDoor, interact, recall, ROSTER, tip, verify, CL_VERSION, VAULT_NOTE } from "./chainlock/ops.js";
import { adaptiveRecall } from "./memory.js";
import { storeFor, VAULT_CHAINS_PATH } from "./chainlock/store.js";
import { seal, verify as verifyLockset, LS_VERSION } from "./lockset.js";
import { arch, pipe, thinPipe, AZPIPE_VERSION } from "./azpipe.js";
import {
  chainSelectProps,
  FRAGGATE_OUTPUT_SCHEMA,
  HINT_ADDITIVE,
  HINT_READ,
  mcpAnnotations,
  tdqsDescription,
  toolEnvelopeOutputSchema,
} from "./mcp-schema.js";

export {
  append,
  recall,
  adaptiveRecall,
  tip,
  verify,
  interact,
  ROSTER,
  CL_VERSION,
  VAULT_CHAINS_PATH,
  VAULT_NOTE,
};

export const CHAINLOCK_MCP_TOOLS = Object.freeze([
  "chainlock_append",
  "chainlock_tip",
  "chainlock_recall",
  "chainlock_verify",
  "chainlock_seal",
]);

export function isChainlockTool(name) {
  const n = String(name || "");
  return n === "chainlock" || n.startsWith("chainlock_");
}

export function parseChainlockOp(name, args) {
  const n = String(name || "");
  if (n.startsWith("chainlock_")) return n.slice("chainlock_".length);
  return String((args && (args.op || args.verb)) || "status");
}

export async function runChainlockOp(name, args, env) {
  const op = parseChainlockOp(name, args);
  const src = args && typeof args === "object" ? args : {};
  const store = storeFor(env);

  if (op === "status" || op === "health") {
    return {
      ok: true,
      v: CL_VERSION,
      lockset: LS_VERSION,
      pipe: AZPIPE_VERSION,
      roster: ROSTER.slice(),
      vault: VAULT_NOTE,
      software_tab: false,
      author: "Aziel Eliab",
    };
  }
  if (op === "append") return append(store, src);
  if (op === "tip") return tip(store, src.c || src.chain);
  if (op === "recall") return recall(store, src);
  if (op === "verify") {
    const chains = await verify(store, src);
    const lattice = await verifyLockset(store, src);
    return { ...lattice, chains: chains.chains, chain_ok: chains.ok };
  }
  if (op === "seal") return seal(store, src);
  if (op === "interact") return interact(store, src);
  if (op === "door") return groundedDoor(await recall(store, src));
  if (op === "pipe") {
    if (src.arch) return arch();
    const envl = await pipe({
      dir: src.dir || "in",
      payload: src.payload !== undefined ? src.payload : src.json,
      claim: src.claim,
      env,
      fact: src.fact,
    });
    return { ok: envl.ok, envelope: envl, pipe: thinPipe(envl) };
  }
  if (op === "arch") return arch();
  return { ok: false, refuse: "unknown-op", op, live: CHAINLOCK_MCP_TOOLS.slice() };
}

export function chainlockMcpTools() {
  return [
    {
      name: "chainlock_append",
      title: "ChainLock append",
      description: tdqsDescription({
        action:
          "Append one fact-bearing stamp to a local ChainLock chain (CL-WP-0.4). Grounded write — not a tip read, not AKM observe, not a LOCKSET seal. Fabric, not Softwares-tab. No Node Gate",
        when: "you have a concrete fact to stamp onto a named chain",
        notFor: "reading the tip, adaptive memory observation, or sealing LOCKSET",
        instead: "chainlock_tip, memory_observe, or chainlock_seal",
        effects:
          "Write: additive append (append-only vault; no chainlock_delete). Hash-only or empty fact refuses no-fact. Unknown roster name refuses unknown-chain. Oversized card refuses card-cap. Does not write godlock.uk",
        params:
          "Omit c/chain to stamp the session chain. Door aliases: chain→c, s→subject, f→fact, kind→k. Omit k to store kind stamp. subject clips to 80; fact clips to 160 then refuses if still empty",
        returns: "the new stamp (id, h, fh, chain, seq) plus display envelope",
      }),
      annotations: mcpAnnotations("ChainLock append", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description:
          "fact is required. Omit c/chain to stamp session. Extra keys such as s/f/kind are aliases; they do not change the append-only rule.",
        properties: {
          ...chainSelectProps("Omit both to stamp the session chain."),
          subject: {
            type: "string",
            description: "Optional subject clipped to 80 characters. Alias: s.",
            maxLength: 80,
          },
          fact: {
            type: "string",
            description:
              "Required fact text clipped to 160 characters. Empty or hash-only after clip refuses no-fact. Alias: f.",
            maxLength: 160,
          },
          k: {
            type: "string",
            description: "Optional kind label. Omit to store kind stamp. Alias: kind.",
          },
        },
        required: ["fact"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Append body: ok, stamp (id, c, k, fact, fh, stamp_sha256, prev), card, seq, vault path. Refuses: no-fact, unknown-chain, card-cap.",
      ),
    },
    {
      name: "chainlock_tip",
      title: "ChainLock tip",
      description: tdqsDescription({
        action: "Read only the live tip card of one local ChainLock chain — not depth recall and not LOCKSET verify",
        when: "you need the current tip of a named chain",
        notFor: "depth-0–5 grounded recall, LOCKSET verify, or adaptive memory explain",
        instead: "chainlock_recall, chainlock_verify, or memory_get",
        effects:
          "Does not invent a missing tip. An empty chain returns ok with tip=null and empty=true (not a refuse). Fabric module — not a Softwares-tab product",
        params:
          "Omit c/chain to read the session chain tip (not the full vault). chain is an alias of c. This is one card, not depth recall",
        returns: "the tip card (id, h, fh) or tip=null / empty=true when that chain has no stamp",
      }),
      annotations: mcpAnnotations("ChainLock tip", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "Omit c/chain to read the session chain tip. Extra properties are rejected.",
        properties: chainSelectProps("Omit both to read the session chain tip."),
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Tip body: ok, chain, tip card or null, empty flag, seq when a stamp exists. Empty chain is ok+empty, not an invented card.",
      ),
    },
    {
      name: "chainlock_recall",
      title: "ChainLock recall",
      description: tdqsDescription({
        action: "Grounded ChainLock recall at depth 0–5 (id+h+fh facts or refuse=no-stamp). Stamped vault facts — not Bayesian rank and not tip-only",
        when: "you need stamped facts from the local vault, not a Bayesian ranking",
        notFor: "adaptive memory ranking or reading only the live tip",
        instead: "memory_recall or chainlock_tip",
        effects: "Depth above 5 is clipped to 5. refuse=no-stamp when empty — do not invent a fact. Append-only; there is no chainlock_delete",
        params:
          "Omit depth to use 1 (not 0). 0 = tip only; 5 = full chain / genesis budget. Omit c/chain to scan session+acts+recall+learn (not the whole roster). q/query is a case-insensitive subject/fact substring; empty q does not invent cards",
        returns: "grounded facts (id, h, fh) or refuse=no-stamp",
      }),
      annotations: mcpAnnotations("ChainLock recall", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "All fields optional. Default depth is 1. Default chains are session, acts, recall, learn.",
        properties: {
          depth: {
            type: "number",
            minimum: 0,
            maximum: 5,
            description:
              "Optional recall depth. Omit for 1. 0 = tip only; 5 = genesis/budget maximum. Values outside 0–5 are clipped. Alias: d.",
          },
          q: {
            type: "string",
            description: "Optional case-insensitive substring over subject/fact. Alias: query. Empty does not invent matches.",
          },
          ...chainSelectProps("Omit both to scan session, acts, recall, and learn — not the full roster."),
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "chainlock_verify",
      title: "ChainLock / LOCKSET verify",
      description: tdqsDescription({
        action:
          "Confirm fail-closed integrity of ChainLock chains and LOCKSET (LS-WP-0.1): broken prev, tip drift, missing GodLock cite. Integrity check — not a new seal",
        when: "you must prove local chain integrity before trusting a recall",
        notFor: "appending a stamp or sealing a new lockset",
        instead: "chainlock_append or chainlock_seal",
        effects:
          "Cites godlock.uk; does not write the public ledger. Fail-closed — do not repair silently. Break reasons include broken-prev, stamp-hash-miss, body-hash-miss, tip-drift, missing-godlock-cite",
        params:
          "Omit c/chain to verify every roster chain plus the stored LOCKSET. require_seal=true fails closed if no lockset is stored",
        returns: "chain_ok, LOCKSET lattice, and per-chain verify notes",
      }),
      annotations: mcpAnnotations("ChainLock / LOCKSET verify", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "Optional chain selector. Omit to verify the live vault / LOCKSET.",
        properties: {
          ...chainSelectProps("Omit both to verify every roster chain plus the stored LOCKSET."),
          require_seal: {
            type: "boolean",
            description:
              "Optional. When true, fail-closed if receipts/LOCKSET.json is missing. When omitted, a stored lockset is still checked if present.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "chainlock_seal",
      title: "LOCKSET seal",
      description: tdqsDescription({
        action:
          "Write a new local LOCKSET over live chain tips (members {c,id,h,fh} + TemporalLock + GodLock cite, LS-WP-0.1). Not a raw-session close and not verify-only",
        when: "the operator wants a new local lockset over current tips",
        notFor: "verify-only, appending one fact, writing godlock.uk, or sealing a raw runtime session",
        instead: "chainlock_verify, chainlock_append, or runtime_session_close",
        effects:
          "Write: replaces receipts/LOCKSET.json. Empty vault (no live tip on any roster chain) refuses empty-vault. Empty chains are omitted from members, not invented. Runtime cites godlock.uk and does not write the public ledger — the operator posts lockset_sha256. A later seal overwrites the previous local lockset",
        params:
          "Empty {} still attempts the seal. Omit ts so TemporalLock stamps now. Passing ts labels that receipt only and never backdates seal authority or prior stamps",
        returns: "lockset document (members, temporal, godlock cite) and lockset_sha256",
      }),
      annotations: mcpAnnotations("LOCKSET seal", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description:
          "No required arguments. Empty {} seals current live tips. Optional ts is TemporalLock metadata only.",
        properties: {
          ts: {
            type: "string",
            description:
              "Optional ISO-8601 timestamp copied onto the TemporalLock block. Omit to use now. Never backdates authority, prior stamps, or godlock.uk.",
          },
        },
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Seal body: ok, lockset (members, temporal, godlock, lockset_sha256), or refuse empty-vault when no live tips exist. Does not write godlock.uk.",
      ),
    },
  ];
}
