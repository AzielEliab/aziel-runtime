/**
 * AGENT-SUBNET-1.0 state, held in ONE Durable Object ("__agentnet__" on the CHAINLOCK namespace), so every
 * read-check-write runs one at a time with strong consistency (AZBot review of #304, items 1, 4, 8, 13).
 *
 * Held here: the subnet salt (created once; never re-minted once receipts exist), seen-statement replay
 * keys, agents, owner lists, the discoverable index, grants (never overwritten), revocation and retirement
 * tombstones (permanent), registration rate counters, single-use view challenges, the hourly public
 * snapshot. Mailbox boxes stay in KV with a TTL (ciphertext only, hashed recipient key).
 *
 * The writer-side receipt caps for the `agentcomms` chain also live here (agentCommCap*), used by
 * ChainWriter.append: per-class shares (msg = send / ctl / refuse, riders = deliver+read) plus fair-share
 * sub-caps per sending visitor and owner pair and a per-agent cap on `refuse` rows, counted
 * only after a successful write (the #302 pattern). Paper: docs/designs/AGENT-SUBNET-1.0.md
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
export const AGENT_STATE_OBJECT = "__agentnet__";
export const AGENT_STATE_PATH = "/agentnet";
const SEEN_BUCKET_MS = 60 * 1000;

/**
 * agentcomms writer caps per minute (AZBot re-review N1).
 * - msg counts the `send` row only. deliver/read are riders: each is idempotent per msg_id
 *   (`deliver|<msg_id>`, `read|<msg_id>`) and only sealed for a box that a sealed send put there, so a
 *   message spends at most one deliver and one read. Riders have their own backstop share and never
 *   spend msg, ctl, refuse, or the total.
 * - Fair share in every counted class (msg, ctl, refuse): at most per_ip rows per visitor (hashed IP with
 *   IPv6 cut to its /64, never on the chain) per class, so one IP or /64 can't fill any share (AZBot B1).
 *   Inside msg also at most per_pair sends per owner pair.
 * - refuse rows: at most refuse_per_agent per agent.
 * Counted only after a successful write (the #302 pattern).
 */
export const AGENTCOMM_CAP = Object.freeze({
  chain: "agentcomms",
  total: 540,
  classes: Object.freeze({ msg: 300, ctl: 120, refuse: 120 }),
  rider: 1200,
  per_ip: 60,
  per_pair: 60,
  refuse_per_agent: 10,
});
export function agentCommClass(kind) {
  if (kind === "send") return "msg";
  if (kind === "deliver" || kind === "read") return "rider";
  if (kind === "refuse") return "refuse";
  return "ctl";
}

/**
 * Check the agentcomms caps for one new row. Returns { refuse } when over a cap, else { commit } to call
 * after the row is stored (a failed write spends nothing). input.agentcap = { ip, pair } carries the
 * fair-share keys out of band (salted hashes; not part of the stamped row).
 */
export async function agentCommCapCheck(store, input, nowMs = Date.now()) {
  const a = (input && input.agentcomm) || {};
  const keys = (input && input.agentcap) || {};
  const minute = Math.floor(nowMs / 60000);
  const fresh = () => ({ m: minute, total: 0, cls: { msg: 0, ctl: 0, refuse: 0, rider: 0 }, agents: {}, ip: {}, pair: {} });
  const prev = await store.get("agentcap");
  const cap = prev && prev.m === minute && prev.cls ? { ip: {}, pair: {}, ...prev, cls: { rider: 0, ...prev.cls } } : fresh();
  const cls = agentCommClass(a.kind);
  const who = cls === "refuse" ? String(a.from_h || "anon") : null;
  // Per-visitor key per class (msg/ctl/refuse); riders have their own backstop and no visitor share.
  const ipKey = cls !== "rider" ? cls + ":" + String(keys.ip || "none").slice(0, 64) : null;
  const pairKey = cls === "msg" ? String(keys.pair || a.owner_pair_h || "none").slice(0, 64) : null;
  let limit = null;
  let why = null;
  if (cls === "rider") {
    if ((cap.cls.rider || 0) >= AGENTCOMM_CAP.rider) { limit = "class"; why = `deliver/read rider backstop ${AGENTCOMM_CAP.rider}/min reached`; }
  } else if (cap.total >= AGENTCOMM_CAP.total) { limit = "total"; why = `agentcomms receipt cap ${AGENTCOMM_CAP.total}/min reached`; }
  else if ((cap.cls[cls] || 0) >= AGENTCOMM_CAP.classes[cls]) { limit = "class"; why = `${cls} receipt share ${AGENTCOMM_CAP.classes[cls]}/min reached`; }
  else if (who && (cap.agents[who] || 0) >= AGENTCOMM_CAP.refuse_per_agent) { limit = "agent"; why = `refuse rows for this agent capped at ${AGENTCOMM_CAP.refuse_per_agent}/min`; }
  else if (ipKey && (cap.ip[ipKey] || 0) >= AGENTCOMM_CAP.per_ip) { limit = "ip"; why = `${cls} rows from one visitor capped at ${AGENTCOMM_CAP.per_ip}/min (fair share)`; }
  else if (pairKey && (cap.pair[pairKey] || 0) >= AGENTCOMM_CAP.per_pair) { limit = "pair"; why = `sends between one owner pair capped at ${AGENTCOMM_CAP.per_pair}/min (fair share)`; }
  if (why) return { refuse: { ok: false, refuse: "agentcomm-cap", code: "AGENT-RECEIPT-CAP", cap_class: cls, cap_limit: limit, cap_minute: minute, written: false, message: `${why}; nothing was done` } };
  return {
    commit: async () => {
      const cur = await store.get("agentcap");
      const c = cur && cur.m === minute && cur.cls ? { ip: {}, pair: {}, ...cur, cls: { rider: 0, ...cur.cls } } : fresh();
      if (cls !== "rider") c.total++;
      c.cls[cls] = (c.cls[cls] || 0) + 1;
      if (who) c.agents[who] = (c.agents[who] || 0) + 1;
      if (ipKey) c.ip[ipKey] = (c.ip[ipKey] || 0) + 1;
      if (pairKey) c.pair[pairKey] = (c.pair[pairKey] || 0) + 1;
      await store.put("agentcap", c);
    },
  };
}

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const HEX64 = /^[a-f0-9]{64}$/;
const isId = (s) => typeof s === "string" && s.length > 0 && s.length <= 128;

async function seenOnce(st, key, ttlMs, nowMs) {
  const k = "seen:" + key;
  const hit = await st.get(k);
  if (hit && Number(hit) > nowMs) return false;
  const exp = nowMs + ttlMs;
  await st.put(k, exp);
  // Index by expiry minute and prune expired buckets (bounded work per call).
  const b = Math.floor(exp / SEEN_BUCKET_MS);
  const ix = (await st.get("seenix:" + b)) || [];
  ix.push(key);
  await st.put("seenix:" + b, ix);
  let cursor = Number(await st.get("seenix:cursor")) || Math.floor(nowMs / SEEN_BUCKET_MS) - 1;
  const stop = Math.floor(nowMs / SEEN_BUCKET_MS);
  for (let i = 0; cursor < stop && i < 4; i++, cursor++) {
    const old = (await st.get("seenix:" + cursor)) || [];
    for (const key2 of old) {
      const e = await st.get("seen:" + key2);
      if (e && Number(e) <= nowMs) await st.delete("seen:" + key2);
    }
    await st.delete("seenix:" + cursor);
  }
  await st.put("seenix:cursor", cursor);
  return true;
}

async function rateMulti(st, slots, nowMs) {
  const minute = Math.floor(nowMs / 60000);
  const cur = await st.get("rate");
  const r = cur && cur.m === minute ? cur : { m: minute, n: {} };
  for (const s of slots) if ((r.n[s.key] || 0) >= s.limit) return { ok: false, key_class: String(s.key).split(":")[0] };
  for (const s of slots) r.n[s.key] = (r.n[s.key] || 0) + 1;
  await st.put("rate", r);
  return { ok: true };
}

async function grantView(st, gid) {
  const grant = await st.get("grant:" + gid);
  if (!grant) return { ok: true, grant: null };
  const revoked = await st.get("revoked:" + gid);
  const rf = await st.get("retired:" + grant.from);
  const rt = await st.get("retired:" + grant.to);
  return { ok: true, grant, revoked: Boolean(revoked), revoked_at: revoked ? revoked.at : null, retired_from: Boolean(rf), retired_to: Boolean(rt) };
}

/** One state op, run inside the Durable Object. st = { get, put, delete }. */
export async function agentStateOp(st, body, nowMs = Date.now()) {
  const op = body && body.op;
  if (op === "salt") {
    const s = await st.get("salt");
    if (s && HEX64.test(s)) return { ok: true, salt: s, created: false };
    if (!body.create) return { ok: true, salt: null, missing: true };
    // Created once. Never re-minted: the caller only asks to create when agentcomms has no rows.
    const fresh = hex(crypto.getRandomValues(new Uint8Array(32)));
    await st.put("salt", fresh);
    await st.put("salt:created_at", new Date(nowMs).toISOString());
    return { ok: true, salt: fresh, created: true };
  }
  if (op === "seen") {
    if (typeof body.key !== "string" || body.key.length > 200) return { ok: false, refuse: "bad-key" };
    return { ok: true, fresh: await seenOnce(st, body.key, Math.max(1000, Number(body.ttl_ms) || 0), nowMs) };
  }
  if (op === "rate") {
    const slots = Array.isArray(body.slots) ? body.slots.filter((s) => s && typeof s.key === "string" && s.key.length <= 120 && Number(s.limit) > 0).slice(0, 4) : [];
    if (!slots.length) return { ok: false, refuse: "bad-slots" };
    return rateMulti(st, slots, nowMs);
  }
  if (op === "agent") {
    if (!isId(body.id)) return { ok: false, refuse: "bad-id" };
    const agent = await st.get("agent:" + body.id);
    const retired = await st.get("retired:" + body.id);
    return { ok: true, agent: agent || null, retired: Boolean(retired) };
  }
  if (op === "register") {
    const row = body.row || {};
    if (!isId(row.agent_id) || !isId(row.owner_id)) return { ok: false, refuse: "bad-row" };
    if (await st.get("retired:" + row.agent_id)) return { ok: false, code: "AGENT-RETIRED" };
    if (await st.get("agent:" + row.agent_id)) return { ok: false, code: "AGENT-EXISTS" };
    const owned = (await st.get("owner:" + row.owner_id)) || [];
    if (owned.length >= Number(body.owner_cap || 0)) return { ok: false, code: "AGENT-OWNER-CAP" };
    await st.put("agent:" + row.agent_id, row);
    owned.push(row.agent_id);
    await st.put("owner:" + row.owner_id, owned);
    if (row.discoverable === true) {
      const dir = (await st.get("directory")) || [];
      if (!dir.includes(row.agent_id) && dir.length < 1000) { dir.push(row.agent_id); await st.put("directory", dir); }
    }
    return { ok: true };
  }
  if (op === "unregister") {
    // Undo a register whose receipt could not be sealed (no receipt, no agent).
    const row = await st.get("agent:" + body.id);
    if (!row) return { ok: true, removed: false };
    await st.delete("agent:" + body.id);
    const owned = ((await st.get("owner:" + row.owner_id)) || []).filter((x) => x !== body.id);
    await st.put("owner:" + row.owner_id, owned);
    const dir = ((await st.get("directory")) || []).filter((x) => x !== body.id);
    await st.put("directory", dir);
    return { ok: true, removed: true };
  }
  if (op === "owner_agents") {
    if (!isId(body.owner_id)) return { ok: false, refuse: "bad-id" };
    return { ok: true, ids: (await st.get("owner:" + body.owner_id)) || [] };
  }
  if (op === "directory") {
    const ids = ((await st.get("directory")) || []).slice(0, 200);
    const agents = [];
    for (const id of ids) {
      if (await st.get("retired:" + id)) continue;
      const a = await st.get("agent:" + id);
      if (a && a.discoverable === true) agents.push(a);
    }
    return { ok: true, agents };
  }
  if (op === "grant_get") {
    if (!HEX64.test(String(body.grant_id || ""))) return { ok: true, grant: null };
    return grantView(st, body.grant_id);
  }
  if (op === "grant_add") {
    const g = body.grant || {};
    if (!HEX64.test(String(g.grant_id || "")) || !isId(g.from) || !isId(g.to)) return { ok: false, refuse: "bad-grant" };
    // Never overwrite: grant_id is the statement hash; a revoked grant keeps its tombstone forever.
    if (await st.get("revoked:" + g.grant_id)) return { ok: false, code: "AGENT-GRANT-REVOKED" };
    if (await st.get("grant:" + g.grant_id)) return { ok: false, code: "AGENT-REPLAY" };
    if ((await st.get("retired:" + g.from)) || (await st.get("retired:" + g.to))) return { ok: false, code: "AGENT-RETIRED" };
    await st.put("grant:" + g.grant_id, { ...g, revoked_at: null });
    for (const id of [g.from, g.to]) {
      const list = (await st.get("grants_of:" + id)) || [];
      if (!list.includes(g.grant_id)) { list.push(g.grant_id); await st.put("grants_of:" + id, list.slice(-512)); }
    }
    return { ok: true };
  }
  if (op === "grant_undo") {
    const g = await st.get("grant:" + body.grant_id);
    if (!g || g.revoked_at) return { ok: true, removed: false };
    await st.delete("grant:" + body.grant_id);
    for (const id of [g.from, g.to]) {
      const list = ((await st.get("grants_of:" + id)) || []).filter((x) => x !== body.grant_id);
      await st.put("grants_of:" + id, list);
    }
    return { ok: true, removed: true };
  }
  if (op === "revoke") {
    const gid = String(body.grant_id || "");
    const g = await st.get("grant:" + gid);
    if (!g) return { ok: false, code: "AGENT-NO-GRANT" };
    const had = await st.get("revoked:" + gid);
    if (!had) await st.put("revoked:" + gid, { at: new Date(nowMs).toISOString(), by: body.by || null, why: body.why || "owner" });
    if (!g.revoked_at) await st.put("grant:" + gid, { ...g, revoked_at: new Date(nowMs).toISOString() });
    return { ok: true, already: Boolean(had), grant: g };
  }
  if (op === "retire") {
    const id = String(body.agent_id || "");
    const a = await st.get("agent:" + id);
    if (!a) return { ok: false, code: "AGENT-UNKNOWN" };
    const had = await st.get("retired:" + id);
    if (!had) await st.put("retired:" + id, { at: new Date(nowMs).toISOString() });
    // Kill every grant at once: a tombstone per grant (and the retired flag is checked at send and pull too).
    const list = (await st.get("grants_of:" + id)) || [];
    let killed = 0;
    for (const gid of list) {
      if (await st.get("revoked:" + gid)) continue;
      await st.put("revoked:" + gid, { at: new Date(nowMs).toISOString(), by: null, why: "agent-retired" });
      const g = await st.get("grant:" + gid);
      if (g && !g.revoked_at) await st.put("grant:" + gid, { ...g, revoked_at: new Date(nowMs).toISOString() });
      killed++;
    }
    const dir = ((await st.get("directory")) || []).filter((x) => x !== id);
    await st.put("directory", dir);
    return { ok: true, already: Boolean(had), grants_revoked: killed, grants: list.slice() };
  }
  if (op === "pub_get") return { ok: true, snapshot: (await st.get("pub")) || null };
  if (op === "pub_put") {
    const s = body.snapshot;
    if (!s || !Number.isFinite(Number(s.hour))) return { ok: false, refuse: "bad-snapshot" };
    const cur = await st.get("pub");
    if (cur && Number(cur.hour) >= Number(s.hour)) return { ok: true, snapshot: cur };
    await st.put("pub", s);
    return { ok: true, snapshot: s };
  }
  return { ok: false, refuse: "unknown-agent-state-op" };
}
