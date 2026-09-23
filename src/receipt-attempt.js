/**
 * Attempt linkage for new receipts.
 *
 * Groups several attempts under one logical request. Each attempt is its own
 * receipt. parent_receipt_id points at the prior attempt's receipt hash.
 * FragGate ledger prev stays call-order only — it is not the retry parent.
 *
 * Additive on new receipts. Receipts sealed without these fields keep the
 * previous canonical body. This is not a court filing and not a forensic finding.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const ATTEMPT_FIELDS = Object.freeze([
  "request_id",
  "attempt_n",
  "parent_receipt_id",
  "correlation_id",
]);

export const OUTCOMES = Object.freeze(["retry", "failed", "completed"]);

const ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function newRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "req_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sourcesOf(input) {
  const sources = [];
  if (!input || typeof input !== "object") return sources;
  sources.push(input);
  if (input.attempt_link && typeof input.attempt_link === "object") sources.push(input.attempt_link);
  if (input.attempt && typeof input.attempt === "object") sources.push(input.attempt);
  if (input.context && typeof input.context === "object") sources.push(input.context);
  if (input.payload && typeof input.payload === "object") sources.push(input.payload);
  return sources;
}

function hasOwn(sources, key) {
  return sources.some(
    (src) => src && typeof src === "object" && Object.prototype.hasOwnProperty.call(src, key) && src[key] !== undefined,
  );
}

function first(sources, key) {
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    if (src[key] === undefined) continue;
    return src[key];
  }
  return undefined;
}

/**
 * Normalize caller attempt fields.
 * generate:true mints request_id when the caller omitted one.
 * Does not look up prior receipts — callers that have a chain pass parent_receipt_id
 * or use linkSessionAttempt.
 */
export function normalizeAttemptLink(input, opts = {}) {
  const sources = sourcesOf(input);
  const attemptSupplied = hasOwn(sources, "attempt_n");
  const parentSupplied = hasOwn(sources, "parent_receipt_id");
  const correlationSupplied = hasOwn(sources, "correlation_id");
  const outcomeSupplied = hasOwn(sources, "outcome");
  const requestSupplied = hasOwn(sources, "request_id");

  let request_id = null;
  if (requestSupplied) {
    const raw = first(sources, "request_id");
    request_id = raw == null || raw === "" ? "" : String(raw).trim();
  }
  if (!request_id) {
    if (requestSupplied) {
      return { ok: false, error: "request_id must be 1-128 chars [A-Za-z0-9_.:-]", status: 400 };
    }
    request_id = opts.generate === false ? null : newRequestId();
  }
  if (request_id && !ID_RE.test(request_id)) {
    return { ok: false, error: "request_id must be 1-128 chars [A-Za-z0-9_.:-]", status: 400 };
  }

  let attempt_n = 1;
  if (attemptSupplied) {
    const raw = first(sources, "attempt_n");
    if (raw == null || raw === "") {
      attempt_n = 1;
    } else {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 100000) {
        return { ok: false, error: "attempt_n must be an integer >= 1", status: 400 };
      }
      attempt_n = n;
    }
  }

  let parent_receipt_id = null;
  if (parentSupplied) {
    const raw = first(sources, "parent_receipt_id");
    if (raw != null && raw !== "") {
      parent_receipt_id = String(raw).trim();
      if (!ID_RE.test(parent_receipt_id)) {
        return { ok: false, error: "parent_receipt_id must be a prior receipt hash or id", status: 400 };
      }
    }
  }

  let correlation_id = null;
  if (correlationSupplied) {
    const raw = first(sources, "correlation_id");
    if (raw != null && raw !== "") {
      correlation_id = String(raw).trim();
      if (!ID_RE.test(correlation_id)) {
        return { ok: false, error: "correlation_id must be 1-128 chars [A-Za-z0-9_.:-]", status: 400 };
      }
    }
  }

  let outcome = opts.defaultOutcome || "completed";
  if (outcomeSupplied) {
    const raw = first(sources, "outcome");
    if (raw != null && raw !== "") {
      outcome = String(raw).trim().toLowerCase();
      if (!OUTCOMES.includes(outcome)) {
        return { ok: false, error: "outcome must be retry, failed, or completed", status: 400 };
      }
    }
  }

  return {
    ok: true,
    linked: true,
    request_id,
    attempt_n,
    parent_receipt_id,
    correlation_id,
    outcome,
    request_supplied: requestSupplied,
    attempt_supplied: attemptSupplied,
    parent_supplied: parentSupplied,
    correlation_supplied: correlationSupplied,
    outcome_supplied: outcomeSupplied,
  };
}

export function priorAttemptReceipt(receipts, requestId) {
  if (!requestId) return null;
  const list = Array.isArray(receipts) ? receipts : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const rec = list[i];
    if (rec && rec.request_id === requestId) return rec;
  }
  return null;
}

/** Fill omitted attempt_n / parent_receipt_id from the latest session receipt with the same request_id. */
export function linkSessionAttempt(session, explicit = {}, opts = {}) {
  const norm = normalizeAttemptLink(explicit, {
    generate: opts.generate !== false,
    defaultOutcome: opts.defaultOutcome || "completed",
  });
  if (!norm.ok) return norm;
  const prior = priorAttemptReceipt(session && session.receipts, norm.request_id);
  if (prior && !norm.attempt_supplied) {
    const prevN = Number(prior.attempt_n);
    norm.attempt_n = Number.isInteger(prevN) && prevN >= 1 ? prevN + 1 : 2;
  }
  if (prior && !norm.parent_supplied) {
    norm.parent_receipt_id = prior.hash || null;
  }
  return norm;
}

export function attemptLinkView(link) {
  if (!link || link.ok === false || !link.request_id) return null;
  return {
    request_id: link.request_id,
    attempt_n: link.attempt_n,
    parent_receipt_id: link.parent_receipt_id == null ? null : link.parent_receipt_id,
    correlation_id: link.correlation_id == null ? null : link.correlation_id,
    outcome: link.outcome || "completed",
    hash_covers_attempt: true,
    parent_is_prior_attempt_receipt: true,
    ledger_prev_is_call_order_only: true,
    ledger_prev_is_retry_parent: false,
    forensic_claim: false,
    court_filing: false,
  };
}

export function attachAttemptEnvelope(envelope, link) {
  if (!envelope || typeof envelope !== "object") return envelope;
  const view = attemptLinkView(link);
  if (!view) return envelope;
  envelope.request_id = view.request_id;
  envelope.attempt_n = view.attempt_n;
  envelope.parent_receipt_id = view.parent_receipt_id;
  envelope.correlation_id = view.correlation_id;
  envelope.outcome = view.outcome;
  envelope.attempt = view;
  envelope.ledger_prev_is_call_order_only = true;
  envelope.ledger_prev_is_retry_parent = false;
  if (envelope.ledger_tip && typeof envelope.ledger_tip === "object") {
    envelope.ledger_tip.prev_role = "call-order";
    envelope.ledger_tip.prev_is_retry_parent = false;
  }
  return envelope;
}

/** Fields safe to copy onto an ACT event. Omitted when the caller did not send them. */
export function actEventAttempt(meta) {
  const src = meta && typeof meta === "object" ? meta : {};
  const linked =
    hasOwn([src], "request_id") ||
    hasOwn([src], "attempt_n") ||
    hasOwn([src], "parent_receipt_id") ||
    hasOwn([src], "correlation_id") ||
    hasOwn([src], "outcome");
  if (!linked) return null;
  const norm = normalizeAttemptLink(src, { generate: false, defaultOutcome: src.outcome || "completed" });
  if (!norm.ok) return { error: norm.error };
  if (!norm.request_id && !norm.attempt_supplied && !norm.parent_supplied && !norm.correlation_id && !norm.outcome_supplied) {
    return null;
  }
  const event = {};
  if (norm.request_id) event.request_id = norm.request_id;
  if (norm.attempt_supplied || norm.request_id) event.attempt_n = norm.attempt_n;
  if (norm.parent_supplied || norm.request_id || norm.attempt_supplied) {
    event.parent_receipt_id = norm.parent_receipt_id;
  }
  if (norm.correlation_id) event.correlation_id = norm.correlation_id;
  if (norm.outcome_supplied || norm.request_id) event.outcome = norm.outcome;
  return event;
}
