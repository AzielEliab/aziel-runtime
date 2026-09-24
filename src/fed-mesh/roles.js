/**
 * Node-local roles. The relay does not store a role registry.
 * It only checks that the signing key matches the claimed handle.
 * Author: Aziel Eliab only.
 */

import { ROLES } from "./spec.js";

export function roleRecord(name) {
  const key = String(name || "").trim().toLowerCase();
  return ROLES[key] || null;
}

export function roleMay(name, action) {
  const role = roleRecord(name);
  if (!role) return false;
  return role.may.includes(String(action || ""));
}

export const ROLE_NOTE =
  "Admin is the node owner. Developer may post, pull, roll up, publish ref updates, claim .aziel names, witness a claim, vouch, publish an advisory, quarantine a peer locally, switch island mode, restore a reserved hub-mirror slot, sign an isolation or appeal for their own handle, and submit remote-task receipts for their own handle. Guest may pull their own inbox. The runtime does not keep a role table. Registration, rollup, ref update, name record, witness, vouch, advisory, quarantine, island, restore, isolation, appeal, delivery, and remote-task receipts must be signed by the handle's key. One handle cannot act as another. Private keys stay on the node.";
