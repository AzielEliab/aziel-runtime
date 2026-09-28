/**
 * Short start path for agents and humans.
 * Call the Softwares tool. The door and the ledger run behind the wall.
 * background stays Running until a receipt. tools/list stays 36.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent first-call path. FragGate stays the single exec door.
 * Softwares is the catalog read. library_lookup searches library papers and cites.
 * This sentence is help text. It is not a Softwares desk card field.
 */
export const FIRST_CALL_PATH =
  "First call: Softwares (pick a slug) → FragGate fraggate_call (run that slug) → library_lookup for library papers and cites.";

/** Human / docs sentence. */
export const START_HERE_LINE =
  "Start here: call Softwares (tools/list name Softwares), pick a slug, then fraggate_call. library_lookup searches library papers and cites. FragGate runs first. ChainLock, TemporalLock, and ForgeReceipts stamp when the call needs a ledger. confirm=true writes. dry_run=true previews and writes nothing. background=true returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36.";

/**
 * Prepended to MCP initialize instructions.
 * Must not contain the bare tokens this, Aziel, counters, leftover, retired, or FragGate.
 */
export const START_HERE_MCP =
  "Start here. Call Softwares (tools/list name Softwares). Pick a slug, then fraggate_call. library_lookup is the library paper and cite. The door runs before the tool. A ledger op stamps chainlock, temporallock, and forgereceipts on its own. confirm=true writes. dry_run=true previews and writes nothing. background=true returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36. fraggate_list, fraggate_describe, fraggate_call, and chainlock tools stay for diagnostics. ";
