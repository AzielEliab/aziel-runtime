/**
 * Pull verified checkpoints from peers. Unverified state is not merged.
 * Author: Aziel Eliab only.
 */

import { acceptCheckpoint } from "../checkpoints/verify.js";
import { inspectPeerState } from "./peer-state.js";

export async function syncPeerState(log, remote, opts = {}) {
  const state = remote && remote.state ? remote.state : remote;
  const inspected = inspectPeerState(state);
  if (!inspected.ok) return inspected;
  const checkpoint = state.checkpoints && state.checkpoints[0];
  const records = state.records || [];
  const accepted = await acceptCheckpoint(log, checkpoint, records, { fork: opts.fork });
  return {
    ...accepted,
    provider_id: state.provider_id || "",
    merged: accepted.ok === true,
  };
}
