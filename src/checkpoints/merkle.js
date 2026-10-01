/**
 * Binary Merkle tree over record hashes.
 * Leaf = SHA-256(0x00 || raw hash). Node = SHA-256(0x01 || left || right).
 * An odd last node is promoted. Author: Aziel Eliab only.
 */

import { bytesToHex, hexToBytes, sha256Bytes } from "../security/canonical.js";

async function hashLeaf(hex) {
  const raw = hexToBytes(hex);
  if (!raw || raw.length !== 32) return "";
  const pref = new Uint8Array(1 + raw.length);
  pref[0] = 0x00;
  pref.set(raw, 1);
  return bytesToHex(await sha256Bytes(pref));
}

async function hashNode(leftHex, rightHex) {
  const left = hexToBytes(leftHex);
  const right = hexToBytes(rightHex);
  if (!left || !right) return "";
  const pref = new Uint8Array(1 + left.length + right.length);
  pref[0] = 0x01;
  pref.set(left, 1);
  pref.set(right, 1 + left.length);
  return bytesToHex(await sha256Bytes(pref));
}

async function levelsOf(leafHashes) {
  let level = [];
  for (const hex of leafHashes) {
    const leaf = await hashLeaf(hex);
    if (!leaf) return null;
    level.push(leaf);
  }
  const levels = [level];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) next.push(await hashNode(level[i], level[i + 1]));
      else next.push(level[i]);
    }
    levels.push(next);
    level = next;
  }
  return levels;
}

export async function merkleRoot(leafHashes) {
  if (!Array.isArray(leafHashes) || leafHashes.length === 0) {
    return { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle input is empty." };
  }
  const levels = await levelsOf(leafHashes);
  if (!levels) return { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle leaf is not a hash." };
  return { ok: true, root: levels[levels.length - 1][0] };
}

export async function merkleProof(leafHashes, index) {
  const root = await merkleRoot(leafHashes);
  if (!root.ok) return root;
  const levels = await levelsOf(leafHashes);
  const proof = [];
  let idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= leafHashes.length) {
    return { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle index is outside the tree." };
  }
  for (let depth = 0; depth < levels.length - 1; depth++) {
    const level = levels[depth];
    if (idx % 2 === 1) proof.push({ side: "left", hash: level[idx - 1] });
    else if (idx + 1 < level.length) proof.push({ side: "right", hash: level[idx + 1] });
    idx = Math.floor(idx / 2);
  }
  return { ok: true, root: root.root, index: Number(index), proof };
}

export async function verifyMerkleInclusion(root, leafHash, index, proof) {
  let acc = await hashLeaf(leafHash);
  if (!acc || !Array.isArray(proof)) {
    return { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle proof is malformed." };
  }
  let idx = Number(index);
  for (const step of proof) {
    if (!step || (step.side !== "left" && step.side !== "right") || !step.hash) {
      return { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle proof step is malformed." };
    }
    acc = step.side === "left" ? await hashNode(step.hash, acc) : await hashNode(acc, step.hash);
    if (!acc) return { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle proof hash failed." };
    idx = Math.floor(idx / 2);
  }
  const ok = acc === root;
  return ok
    ? { ok: true, root }
    : { ok: false, code: "AZP-CHECKPOINT", fail_closed: true, message: "Merkle inclusion failed." };
}
