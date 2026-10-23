/**
 * Runtime-wide dual hash lattices (AUDIT-2026-10-04 §5.2).
 *
 * Every stored document or receipt carries two chains:
 *   primary   = H({document: document_hash, prev: primary_prev})
 *   secondary = online:  H({offline: false, prev: secondary_prev, primary})
 *               offline: H({primary: document_hash, username})
 *
 * Offline, the secondary hash is that document's own primary hash plus the
 * username, so it does not depend on chain order. The same document from the
 * same user always gives the same secondary hash, and a second write refuses
 * LATTICE-DOUBLE. A document can never be doubled while the user is offline.
 *
 * Used by ChainLock stamps, session receipts, AZNews receipts, and the AZ-OS
 * tether packet. AZ-OS and AZInterface recompute these exact rules only in their parity modules
 * (azos/runtime_lattice.py, azos #42; azinterface/runtime_lattice.py, azinterface #47), with pinned
 * vectors. azos/chains.py is a different, older news-chain formula (newline-joined, chained
 * secondary) and does NOT match these rules; it is left unchanged so existing AZ-OS hashes hold.
 * The username is a short handle. A legal name is not stored.
 * Not a public ledger. Not courtroom proof. Not a Softwares card. Not an MCP tool.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const LATTICE_SPEC = "AZRT-DUAL-LATTICE-1.0";
export const LATTICE_GENESIS = "0".repeat(64);
export const LATTICE_NAMES = Object.freeze(["primary", "secondary"]);
export const LATTICE_USER_RE = /^[a-zA-Z0-9._-]{1,80}$/;
const HEX64 = /^[a-f0-9]{64}$/;

export class LatticeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function isHex64(value) {
  return typeof value === "string" && HEX64.test(value);
}

export async function latticeDocumentHash(doc) {
  return sha256Hex(canonicalize(doc == null ? null : doc));
}

export async function latticePrimary(documentHash, primaryPrev) {
  return sha256Hex(canonicalize({ document: documentHash, prev: primaryPrev || LATTICE_GENESIS }));
}

/** Offline secondary hash: the document primary hash plus the username. */
export async function latticeOfflineSecondary(documentHash, username) {
  return sha256Hex(canonicalize({ primary: documentHash, username: String(username) }));
}

export async function latticeOnlineSecondary(primary, secondaryPrev) {
  return sha256Hex(canonicalize({ offline: false, prev: secondaryPrev || LATTICE_GENESIS, primary }));
}

/**
 * LATTICE-TIEBREAK-1.0 (DRAFT, awaits Aziel's confirmation of the 3-chain spec).
 * Third, user-derived duplicate tie-break chain: 3 chains in 2 lattices. Additive only:
 * primary and secondary hashes are unchanged, and rows without a tiebreak block are legacy.
 *   tiebreak.hash = H({chain:"tiebreak", prev, primary, secondary, username})
 *   primary   = the online (sync) row's primary
 *   secondary = the user's offline row's secondary, H({primary: document_hash, username})
 *   prev      = previous tiebreak hash (all zeros at genesis)
 * A plain offline write carries NO tiebreak block, so its stamp hashes exactly as before
 * (AZBot #327 MED: the offline stamp must not move). Only a real sync (online, sync:true,
 * username) records {status:"synced", hash, prev, offline_secondary}.
 * Unique index key: (username, document_hash). Repeat sync -> LATTICE-DOUBLE;
 * sync with no offline write -> LATTICE-SYNC-NO-OFFLINE.
 */
export const TIEBREAK_SPEC = "LATTICE-TIEBREAK-1.0";

export async function latticeTiebreak({ prev, primary, secondary, username }) {
  return sha256Hex(canonicalize({ chain: "tiebreak", prev: prev || LATTICE_GENESIS, primary, secondary, username: String(username) }));
}

export function tiebreakIndexKey(username, documentHash) {
  return `${String(username)}\u0000${String(documentHash)}`;
}

/** Tiebreak tip of a row list (last synced hash), all zeros at genesis. */
export function tiebreakTip(rows, pick = (row) => row && row.lattice) {
  let tip = LATTICE_GENESIS;
  for (const row of rows || []) {
    const tb = pick(row) && pick(row).tiebreak;
    if (tb && tb.status === "synced" && isHex64(tb.hash)) tip = tb.hash;
  }
  return tip;
}

export function latticeUsername(offline, username) {
  if (!offline) return null;
  const name = username == null ? "" : String(username).trim();
  if (!name || !LATTICE_USER_RE.test(name)) {
    throw new LatticeError(
      "LATTICE-USERNAME-ABSENT",
      "An offline write needs a short username handle. The secondary hash is that document's primary hash plus the username. A legal name is not stored. Nothing was written.",
    );
  }
  return name;
}

/** Tips of a lattice row list. Rows without a lattice block are legacy and do not move the tips. */
export function latticeTips(rows, pick = (row) => row && row.lattice) {
  let primary = LATTICE_GENESIS;
  let secondary = LATTICE_GENESIS;
  let count = 0;
  for (const row of rows || []) {
    const lat = pick(row);
    if (!lat || !isHex64(lat.primary) || !isHex64(lat.secondary)) continue;
    primary = lat.primary;
    secondary = lat.secondary;
    count += 1;
  }
  return { primary, secondary, count };
}

/**
 * Plan one lattice block.
 * Give either `rows` (existing rows in this chain, scanned for tips and the
 * offline double check) or `tips` plus `hasOffline(secondary)` (a writer that
 * keeps tips in its own metadata, such as the ChainWriter Durable Object).
 * Throws LATTICE-DOUBLE when offline and the same user already stored this document.
 */
export async function planLattice({ document_hash, offline = false, username = null, rows = null, pick, tips = null, hasOffline = null, sync = false, tiebreakPrev = null, hasSynced = null } = {}) {
  if (!isHex64(document_hash)) throw new LatticeError("LATTICE-DOCUMENT", "A lattice row needs a SHA-256 document hash.");
  const off = offline === true;
  const user = latticeUsername(off, username);
  const getter = pick || ((row) => row && row.lattice);
  const prev = tips && isHex64(tips.primary) && isHex64(tips.secondary)
    ? { primary: tips.primary, secondary: tips.secondary }
    : latticeTips(rows || [], getter);
  const primary = await latticePrimary(document_hash, prev.primary);
  const secondary = off ? await latticeOfflineSecondary(document_hash, user) : await latticeOnlineSecondary(primary, prev.secondary);
  if (off) {
    let doubled = false;
    if (typeof hasOffline === "function") doubled = Boolean(await hasOffline(secondary));
    if (!doubled) {
      for (const row of rows || []) {
        const lat = getter(row);
        if (lat && lat.offline === true && lat.secondary === secondary) {
          doubled = true;
          break;
        }
      }
    }
    if (doubled) {
      throw new LatticeError(
        "LATTICE-DOUBLE",
        "This document is already stored for this user while offline. The secondary hash matched, so it was not written twice.",
      );
    }
  }
  let tiebreak;
  if (!off && sync === true) {
    const name = latticeUsername(true, username);
    const offSecondary = await latticeOfflineSecondary(document_hash, name);
    let found = false;
    let synced = typeof hasSynced === "function" ? Boolean(await hasSynced(tiebreakIndexKey(name, document_hash))) : false;
    for (const row of rows || []) {
      const lat = getter(row);
      if (!lat || lat.document_hash !== document_hash) continue;
      if (lat.offline === true && lat.secondary === offSecondary) found = true;
      if (lat.tiebreak && lat.tiebreak.status === "synced" && lat.tiebreak.offline_secondary === offSecondary) synced = true;
    }
    if (!found && typeof hasOffline === "function") found = Boolean(await hasOffline(offSecondary));
    if (synced) throw new LatticeError("LATTICE-DOUBLE", "This user's offline document is already synced. The tiebreak index (username, document) matched, so it was not written twice.");
    if (!found) throw new LatticeError("LATTICE-SYNC-NO-OFFLINE", "No offline write by this user exists for this document, so there is nothing to sync. Nothing was written.");
    const tprev = isHex64(tiebreakPrev) ? tiebreakPrev : tiebreakTip(rows || [], getter);
    tiebreak = {
      status: "synced",
      hash: await latticeTiebreak({ prev: tprev, primary, secondary: offSecondary, username: name }),
      prev: tprev,
      offline_secondary: offSecondary,
    };
  }
  return {
    ...(tiebreak ? { tiebreak } : {}),
    spec: LATTICE_SPEC,
    document_hash,
    primary,
    primary_prev: prev.primary,
    secondary,
    secondary_prev: prev.secondary,
    offline: off,
    username: user,
    lattices: LATTICE_NAMES.slice(),
  };
}

/** Recompute one lattice block against expected previous tips. Returns null when it holds, else a reason. */
export async function checkLatticeRow(lat, expected) {
  if (!lat || typeof lat !== "object") return "lattice-missing";
  if (!isHex64(lat.document_hash) || !isHex64(lat.primary) || !isHex64(lat.secondary)) return "lattice-shape";
  if (!Array.isArray(lat.lattices) || !lat.lattices.includes("primary") || !lat.lattices.includes("secondary")) {
    return "lattice-names";
  }
  if (expected) {
    if (lat.primary_prev !== expected.primary) return "lattice-primary-prev";
    if (lat.secondary_prev !== expected.secondary) return "lattice-secondary-prev";
  }
  const primary = await latticePrimary(lat.document_hash, lat.primary_prev);
  if (primary !== lat.primary) return "lattice-primary-miss";
  if (lat.offline === true) {
    if (!lat.username || !LATTICE_USER_RE.test(String(lat.username))) return "lattice-username";
    const secondary = await latticeOfflineSecondary(lat.document_hash, lat.username);
    if (secondary !== lat.secondary) return "lattice-secondary-miss";
  } else {
    if (lat.username != null) return "lattice-online-username";
    const secondary = await latticeOnlineSecondary(lat.primary, lat.secondary_prev);
    if (secondary !== lat.secondary) return "lattice-secondary-miss";
  }
  return null;
}

async function checkTiebreak(lat, { tiebreakPrev, offlineUser, syncedKeys }) {
  const tb = lat.tiebreak;
  if (typeof tb !== "object") return "tiebreak-shape";
  if (tb.status === "pending") {
    if (lat.offline !== true || tb.offline_secondary !== lat.secondary || tb.hash != null) return "tiebreak-pending";
    return null;
  }
  if (tb.status !== "synced" || lat.offline === true) return "tiebreak-status";
  if (!isHex64(tb.hash) || !isHex64(tb.offline_secondary)) return "tiebreak-shape";
  if (tb.prev !== tiebreakPrev) return "tiebreak-prev";
  const off = offlineUser.get(tb.offline_secondary);
  if (!off || off.document_hash !== lat.document_hash) return "tiebreak-no-offline";
  const key = tiebreakIndexKey(off.username, lat.document_hash);
  if (syncedKeys.has(key)) return "tiebreak-double";
  const want = await latticeTiebreak({ prev: tb.prev, primary: lat.primary, secondary: tb.offline_secondary, username: off.username });
  if (want !== tb.hash) return "tiebreak-miss";
  syncedKeys.add(key);
  return null;
}

/**
 * Walk both chains over a row list. Fail closed on the first break.
 * `anchor` is the tip pair the first lattice row must link to (default genesis).
 * lattice_live is true only when at least one lattice row exists, every
 * non-legacy row stores both chains, and the walk holds. Legacy rows (written
 * before the lattice) are counted and never make the flag true.
 */
export async function verifyLattice(rows, { pick, anchor, legacyAllowed = true } = {}) {
  const getter = pick || ((row) => row && row.lattice);
  let expected = {
    primary: (anchor && anchor.primary) || LATTICE_GENESIS,
    secondary: (anchor && anchor.secondary) || LATTICE_GENESIS,
  };
  const offlineSeen = new Set();
  const offlineUser = new Map(); // offline secondary -> {username, document_hash}
  const syncedKeys = new Set();
  let tiebreakPrev = LATTICE_GENESIS;
  let tiebreakRows = 0;
  let latticeRows = 0;
  let legacy = 0;
  const breaks = [];
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const lat = getter(list[i]);
    if (lat == null) {
      if (!legacyAllowed || latticeRows > 0) {
        breaks.push({ seq: i, reason: "lattice-missing" });
        break;
      }
      legacy += 1;
      continue;
    }
    const reason = await checkLatticeRow(lat, expected);
    if (reason) {
      breaks.push({ seq: i, reason });
      break;
    }
    if (lat.offline === true) {
      if (offlineSeen.has(lat.secondary)) {
        breaks.push({ seq: i, reason: "lattice-double" });
        break;
      }
      offlineSeen.add(lat.secondary);
      offlineUser.set(lat.secondary, { username: lat.username, document_hash: lat.document_hash });
    }
    if (lat.tiebreak != null) {
      const tr = await checkTiebreak(lat, { tiebreakPrev, offlineUser, syncedKeys });
      if (tr) {
        breaks.push({ seq: i, reason: tr });
        break;
      }
      if (lat.tiebreak.status === "synced") {
        tiebreakPrev = lat.tiebreak.hash;
        tiebreakRows += 1;
      }
    }
    expected = { primary: lat.primary, secondary: lat.secondary };
    latticeRows += 1;
  }
  const ok = breaks.length === 0;
  return {
    ok,
    spec: LATTICE_SPEC,
    lattices: LATTICE_NAMES.slice(),
    rows: list.length,
    lattice_rows: latticeRows,
    legacy_rows: legacy,
    tips: expected,
    tiebreak: { spec: TIEBREAK_SPEC, synced_rows: tiebreakRows, tip: tiebreakPrev },
    breaks,
    lattice_live: ok && latticeRows > 0,
    fail_closed: true,
  };
}
