/**
 * One Durable Object per aziel-runtime session.
 * Storage is the session JSON + receipt chain. Local engine exec runs in this
 * Worker isolate (the jail) and the receipt carries that engine's digest.
 * Author: Aziel Eliab.
 */

import {
  applyArtifactChange,
  applyAuditHealth,
  applyClose,
  applyStale,
  applyRevoke,
  applyOpen,
  applyPolicy,
  commitExec,
  openSession,
  publicSession,
  recordIntent,
  SESSION_ID_RE,
  verifyChainStrict,
} from "./session-core.js";
import { SESSION_TTL_MS, isSessionExpired } from "./production.js";
import { applyPause, applyResume, freezeHeadOf, queueFreeze, resumeCheck, RESUME_SPEC } from "./resume-anchor.js";
import { append as chainlockAppend } from "./chainlock/ops.js";
import { storeFor as chainlockStoreFor } from "./chainlock/store.js";
import { ensureDefaultVpnSession, vpnArmed } from "./azvpn-auto.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function fail(err) {
  const status = err && err.status ? err.status : 500;
  return json(
    {
      error: err && err.message ? err.message : String(err),
      code: (err && err.code) || "session_error",
      ...(err && err.extra ? err.extra : {}),
    },
    status,
  );
}

/** RIB-018: AUDIT-PATH-DOWN on the internal refusals chain. Only when the session row itself was sealed. */
async function attachAuditDoorRefusal(env, err) {
  if (!err || err.code !== "AUDIT-PATH-DOWN") return;
  if (!err.extra || !err.extra.refused_receipt || err.extra.refused_receipt.sealed !== true) return;
  let refusal_receipt;
  try {
    const { sealDoorRefusal } = await import("./refusal-doors.js");
    refusal_receipt = await sealDoorRefusal(chainlockStoreFor(env), { surface: "runtime", door: "session-exec", code: "AUDIT-PATH-DOWN", reason: null, method: "POST", route: "/v1/session/{id}/exec", status: 409 }, { budgetMs: 2000 });
  } catch {
    refusal_receipt = { sealed: false, status: "unavailable" };
  }
  err.extra = { ...(err.extra || {}), refusal_receipt };
}

/** Issuer-only gate for pause/resume. Refuses before any row is written, so the chain is unchanged. */
async function assertIssuerFor(session, key, stamp) {
  const { assertIssuer } = await import("./issuer-append.js");
  try {
    return await assertIssuer(session, typeof key === "string" ? key : null);
  } catch (err) {
    if (err && err.code === "CL-NOT-ISSUER") err.extra = { ...(err.extra || {}), stamp };
    throw err;
  }
}

async function readJson(request) {
  const text = await request.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("invalid JSON");
    err.status = 400;
    err.code = "bad_json";
    throw err;
  }
}

export class RuntimeSession {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async load() {
    return (await this.ctx.storage.get("session")) || null;
  }

  async save(session) {
    await this.ctx.storage.put("session", session);
  }

  async scheduleExpiry() {
    if (this.ctx.storage && typeof this.ctx.storage.setAlarm === "function") {
      await this.ctx.storage.setAlarm(Date.now() + SESSION_TTL_MS);
    }
  }

  async expireIfNeeded(session) {
    if (!session || session.closed) return session;
    const now = new Date().toISOString();
    if (!isSessionExpired(session, now)) return session;
    const out = await applyClose(session, now, { force: true });
    await this.save(out.session);
    const err = new Error("session exceeded 6h TTL");
    err.status = 410;
    err.code = "session_expired";
    err.extra = { session_id: session.id, opened_at: session.opened_at, session_ttl_ms: SESSION_TTL_MS };
    throw err;
  }

  /**
   * R6: one mutation at a time per session object. Every POST (open/policy/intent/commit/change/stale/revoke/
   * pause/resume/audit-gate/close) and the TTL alarm run through this queue, so a load -> append -> save can never
   * interleave with another (a concurrent change/policy + close cannot lose an acknowledged row).
   */
  serialize(fn) {
    const run = (this._tail || Promise.resolve()).then(fn, fn);
    this._tail = run.then(() => undefined, () => undefined);
    return run;
  }

  async alarm() {
    return this.serialize(() => this.alarmInner());
  }

  async alarmInner() {
    const session = await this.load();
    if (!session || session.closed) return;
    const now = new Date().toISOString();
    const out = await applyClose(session, now, { force: true });
    await this.save(out.session);
  }

  async fetch(request) {
    if (request.method === "POST") return this.serialize(() => this.fetchInner(request));
    return this.fetchInner(request);
  }

  async fetchInner(request) {
    try {
      // RIB-042: use the provisioned receipt key if one is held (never generated here).
      const { heldSignerFromEnv, setActiveReceiptSigner } = await import("./receipt-signing.js");
      setActiveReceiptSigner(await heldSignerFromEnv(this.env));
      const url = new URL(request.url);
      const action = url.pathname.replace(/^\//, "") || "status";
      if (action === "open" && request.method === "POST") {
        return await this.open(await readJson(request));
      }
      if (action === "policy" && request.method === "POST") {
        return await this.policy(await readJson(request));
      }
      if (action === "intent" && request.method === "POST") {
        return await this.intent(await readJson(request));
      }
      if (action === "commit" && request.method === "POST") {
        return await this.commit(await readJson(request));
      }
      if (action === "audit-gate" && request.method === "POST") {
        return await this.auditGate(await readJson(request));
      }
      if (action === "receipt" && request.method === "GET") {
        return await this.receipt();
      }
      if (action === "receipts" && request.method === "GET") {
        return await this.receipts();
      }
      if (action === "close" && request.method === "POST") {
        return await this.close(await readJson(request));
      }
      if (action === "change" && request.method === "POST") {
        return await this.change(await readJson(request));
      }
      if (action === "audit" && request.method === "POST") {
        return await this.audit(await readJson(request));
      }
      if (action === "stale" && request.method === "POST") {
        return await this.stale(await readJson(request));
      }
      if (action === "revoke" && request.method === "POST") {
        return await this.revoke(await readJson(request));
      }
      if (action === "spec" && request.method === "GET") {
        return await this.specState();
      }
      if (action === "pause" && request.method === "POST") {
        return await this.pause(await readJson(request));
      }
      if (action === "resume" && request.method === "POST") {
        return await this.resume(await readJson(request));
      }
      if (action === "job-put" && request.method === "POST") {
        return await this.jobPut(await readJson(request));
      }
      if (action === "job-get" && request.method === "POST") {
        return await this.jobGet(await readJson(request));
      }
      if ((action === "status" || action === "") && request.method === "GET") {
        return await this.status();
      }
      if (action === "ui-hold-get" && request.method === "GET") {
        const holds = (await this.ctx.storage.get("ui-holds")) || {};
        return json({ ok: true, holds });
      }
      if (action === "ui-hold-put" && request.method === "POST") {
        const body = await readJson(request);
        const holds = body && body.holds && typeof body.holds === "object" && !Array.isArray(body.holds) ? body.holds : {};
        await this.ctx.storage.put("ui-holds", holds);
        return json({ ok: true });
      }
      return json({ error: "unknown session action", action }, 404);
    } catch (err) {
      return fail(err);
    }
  }

  async jobPut(body) {
    const id = String((body && body.job_id) || "");
    if (!/^job_[a-f0-9]{16}$/.test(id)) {
      return json({ ok: false, code: "bad_job_id", message: "job id must match job_ + 16 hex" }, 400);
    }
    await this.ctx.storage.put("bgjob:" + id, body.record);
    return json({ ok: true, job_id: id });
  }

  async jobGet(body) {
    const id = String((body && body.job_id) || "");
    const record = await this.ctx.storage.get("bgjob:" + id);
    if (!record) return json({ ok: false, code: "job_not_found" }, 404);
    return json({ ok: true, record });
  }

  async open(body) {
    const existing = await this.load();
    if (existing) {
      return json({ ok: true, already: true, session: publicSession(existing), receipt: existing.receipts[0] || null });
    }
    const id = String(body.id || "");
    if (!SESSION_ID_RE.test(id)) {
      return json({ error: "session id must match sess_ + 32 hex", code: "bad_session_id" }, 400);
    }
    const now = body.now || new Date().toISOString();
    const session = openSession({
      id,
      now,
      version: body.version,
      source: body.source || "worker",
    });
    if (vpnArmed(body)) {
      const auto = await ensureDefaultVpnSession(body, this.env);
      if (!auto || auto.ok === false) {
        return json(
          {
            ok: false,
            error: (auto && auto.error) || "AZVPN auto-bind could not start.",
            code: (auto && auto.code) || "AZVPN-AUTO-FAIL",
            connected: false,
            fake_connected: false,
            vpn_auto: auto && auto.vpn_auto ? auto.vpn_auto : null,
          },
          400,
        );
      }
      session.vpn_auto = {
        backend: "azvpn",
        auto: true,
        tunnel_id: auto.tunnel_id,
        kind: "https_ws",
        honesty: "REAL",
      };
    }
    await applyOpen(session, now, body || {});
    await this.save(session);
    await this.scheduleExpiry();
    return json({ ok: true, session: publicSession(session), receipt: session.receipts[0] });
  }

  async policy(body) {
    const session = await this.expireIfNeeded(await this.load());
    const now = new Date().toISOString();
    const out = await applyPolicy(session, body && body.policy != null ? body.policy : body, now);
    await this.save(out.session);
    return json({ ok: true, session: publicSession(out.session), receipt: out.receipt });
  }

  async intent(body) {
    const session = await this.expireIfNeeded(await this.load());
    const now = new Date().toISOString();
    // RIB-044: a paused session runs nothing; a frozen session is re-checked once per (cold) isolate.
    if (session && session.paused) {
      return json({ ok: false, error: "session is paused; POST /resume first", code: "SESSION-PAUSED", spec: RESUME_SPEC, executed: false }, 409);
    }
    // Checked on every session (not only when session.freeze exists): a deleted session.freeze is caught
    // from the chain / the session-keyed ChainLock index.
    if (session && !this.resumeChecked) {
      try {
        const chk = await resumeCheck(session, this.env, { strict: session.policy && session.policy.resume_strict === true, allowNoFreeze: true, storeFor: chainlockStoreFor, nowIso: now });
        this.resumeChecked = true;
        this.lastResumeCheck = chk;
      } catch (err) {
        if (err && err.sessionDirty) await this.save(session);
        throw err;
      }
    }
    const known = body.known_slugs ? new Set(body.known_slugs) : null;
    let out;
    try {
      out = await recordIntent(
      session,
      {
        slug: body.slug,
        op: body.op,
        payload: body.payload,
        payloadText: body.payload_text,
        knownSlugs: known,
        banner: body.banner || null,
        schemaHash: body.schema_hash || null,
        decision: body.decision || null,
        goal: body.goal || null,
      },
      now,
    );
    } catch (err) {
      // RIB-018: a refusal that appended a `refused` receipt is persisted before the error returns.
      if (err && err.sessionDirty) await this.save(session);
      await attachAuditDoorRefusal(this.env, err);
      throw err;
    }
    await this.save(session);
    return json({ ok: true, session: publicSession(session), intent: out.intent });
  }

  async commit(body) {
    const session = await this.expireIfNeeded(await this.load());
    const now = new Date().toISOString();
    try {
      const receipt = await commitExec(
        session,
        {
          intent: body.intent,
          status: body.status,
          latencyMs: body.latency_ms,
          requestDigest: body.request_digest,
          responseDigest: body.response_digest,
          error: body.error || null,
          upstream: body.upstream || null,
          responseBytes: body.response_bytes,
          contentType: body.content_type,
          engine: body.engine || null,
          request_id: body.request_id,
          attempt_n: body.attempt_n,
          parent_receipt_id: body.parent_receipt_id,
          correlation_id: body.correlation_id,
          outcome: body.outcome,
          additive: body,
        },
        now,
      );
      await this.save(session);
      return json({ ok: true, session: publicSession(session), receipt });
    } catch (err) {
      if (err && err.sessionDirty) await this.save(session);
      await attachAuditDoorRefusal(this.env, err);
      throw err;
    }
  }

  /** Read-only, serialized with audit. High-impact work does not start when the path is already not healthy. */
  async auditGate(body = {}) {
    const session = await this.load();
    const { isHighImpactOp, currentHealth, recorderFrom } = await import("./audit-path.js");
    const recorder = recorderFrom(session && session.receipts);
    const status = currentHealth(session && session.receipts);
    const high = isHighImpactOp(body && body.slug, body && body.op);
    const block = Boolean(recorder) && high && status !== "healthy";
    return json({ ok: true, block, status: status || null, high_impact: high, written: false, executed: false });
  }

  async receipt() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    const last = session.receipts[session.receipts.length - 1] || null;
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipt: last, verified });
  }

  async receipts() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipts: session.receipts, verified });
  }

  async stale(body = {}) {
    const session = await this.expireIfNeeded(await this.load());
    const { issuer_key: issuerKey, ...rest } = body || {};
    const receipt = await applyStale(session, new Date().toISOString(), rest, { issuerKey });
    await this.save(session);
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipt, spec_stale: verified.spec_stale, verified });
  }

  /** RIB-055: seal recorder health (healthy / degraded / down). Does not exec. */
  async audit(body = {}) {
    const session = await this.expireIfNeeded(await this.load());
    const receipt = await applyAuditHealth(session, new Date().toISOString(), body || {});
    await this.save(session);
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipt, verified });
  }

  /** RIB-052: declared change to a frozen artifact (append-only, in-session). */
  async change(body = {}) {
    const session = await this.expireIfNeeded(await this.load());
    const receipt = await applyArtifactChange(session, new Date().toISOString(), body || {});
    await this.save(session);
    return json({ ok: true, session: publicSession(session), receipt });
  }

  async revoke(body = {}) {
    const session = await this.expireIfNeeded(await this.load());
    const { issuer_key: issuerKey, ...rest } = body || {};
    const receipt = await applyRevoke(session, new Date().toISOString(), rest, { issuerKey });
    await this.save(session);
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipt, verified });
  }

  async specState() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    const { specState } = await import("./issuer-append.js");
    const { specStaleness } = await import("./spec-stale.js");
    return json({ ok: true, session_id: session.id, state: specState(session.receipts), spec_stale: specStaleness(session.receipts) });
  }

  async pause(body = {}) {
    const session = await this.expireIfNeeded(await this.load());
    // Pause/resume are issuer-only (CL-NOT-ISSUER, 403, chain unchanged), like stale and revoke.
    if (session) await assertIssuerFor(session, body && body.issuer_key, "pause");
    const now = new Date().toISOString();
    const out = await applyPause(session, now);
    out.session.freeze.queue = await queueFreeze(this.env, out.session.freeze.freeze_head, { append: chainlockAppend, storeFor: chainlockStoreFor, reason: "pause" });
    await this.save(out.session);
    this.resumeChecked = true;
    return json({ ok: true, session: publicSession(out.session), receipt: out.receipt, freeze: out.session.freeze });
  }

  async resume(body = {}) {
    const session = await this.load();
    if (session) await assertIssuerFor(session, body && body.issuer_key, "resume");
    const now = new Date().toISOString();
    try {
      const out = await applyResume(session, this.env, { strict: body && body.strict === true, storeFor: chainlockStoreFor, nowIso: now });
      await this.save(out.session);
      this.resumeChecked = true;
      return json({ ok: true, session: publicSession(out.session), receipt: out.receipt, resume: out.check });
    } catch (err) {
      if (err && err.sessionDirty) await this.save(session);
      throw err;
    }
  }

  async close(body = {}) {
    const session = await this.expireIfNeeded(await this.load());
    const now = new Date().toISOString();
    if (session && session.paused) session.paused = false;
    const {
      delivered_artifacts: delivered,
      observer_records: observerRecords,
      reconcile: _dropReconcile,
      unaudited_gap: _dropGap,
      audit_path: _dropAudit,
      audit_status: _dropStatus,
      ...closeRest
    } = body || {};
    const out = await applyClose(session, now, { additive: closeRest, delivered, observerRecords });
    // RIB-044: the close receipt is the freeze row; its head is queued for the witness.
    const fh = freezeHeadOf(out.session);
    out.session.freeze = { spec: RESUME_SPEC, reason: "close", freeze_head: fh, frozen_at: now, queue: await queueFreeze(this.env, fh, { append: chainlockAppend, storeFor: chainlockStoreFor, reason: "close" }) };
    await this.save(out.session);
    const verified = await verifyChainStrict(out.session.receipts);
    const harness = {
      ...(out.delivery_check ? { delivery_check: out.delivery_check } : {}),
      ...(out.unaudited_gap ? { unaudited_gap: out.unaudited_gap } : {}),
      ...(out.reconcile ? { reconcile: out.reconcile } : {}),
    };
    // RIB-052 / RIB-055: a refused harness check seals the refusal and closes the session, but the verdict is refused.
    const frozenRefused = out.delivery_check && out.delivery_check.delivery_check && out.delivery_check.delivery_check.refused;
    const auditRefused = out.audit_refused || null;
    const refused = auditRefused || frozenRefused;
    if (refused) {
      const code = (auditRefused && auditRefused.code) || frozenRefused.code;
      // RIB-018: the refusal is also sealed on the internal `refusals` chain (fail-soft; never turns into success).
      let refusal_receipt;
      try {
        const { sealDoorRefusal } = await import("./refusal-doors.js");
        refusal_receipt = await sealDoorRefusal(chainlockStoreFor(this.env), { surface: "runtime", door: "session-close", code, reason: null, method: "POST", route: "/v1/session/{id}/close", status: 409 }, { budgetMs: 2000 });
      } catch {
        refusal_receipt = { sealed: false, status: "unavailable" };
      }
      const error = auditRefused && frozenRefused
        ? "audit path and frozen-artifact checks refused the verdict; the refusals are sealed."
        : auditRefused
          ? "audit path is not clean; the refusal is sealed."
          : "frozen-artifact delivery check refused the verdict; the refusal is sealed.";
      return json({ ok: false, code, error, session: publicSession(out.session), receipt: out.receipt, ...harness, refusal_receipt, verified }, 409);
    }
    return json({ ok: true, session: publicSession(out.session), receipt: out.receipt, ...harness, verified });
  }

  async status() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    return json({ ok: true, session: publicSession(session) });
  }
}

/** In-memory Durable Object namespace for tests (and CLI local HTTP adapter). */
/** One Durable Object holds background job records. Not a second door. */
export function backgroundStub(env) {
  if (!env || !env.SESSION || typeof env.SESSION.idFromName !== "function") return null;
  const id = env.SESSION.idFromName("aziel-background");
  if (typeof env.SESSION.getByName === "function") return env.SESSION.getByName("aziel-background");
  return env.SESSION.get(id);
}

export function memorySessionNamespace(env) {
  const objects = new Map();
  function idFromName(name) {
    const key = String(name);
    return { name: key, toString() { return key; } };
  }
  function get(id) {
    const key = String(id);
    if (!objects.has(key)) {
      const store = new Map();
      const storage = {
        get: async (k) => store.get(k),
        put: async (k, v) => {
          store.set(k, v);
        },
        setAlarm: async () => {},
        deleteAlarm: async () => {},
      };
      objects.set(key, new RuntimeSession({ storage }, env));
    }
    return objects.get(key);
  }
  return {
    idFromName,
    getByName(name) {
      return get(idFromName(name));
    },
    get,
  };
}
