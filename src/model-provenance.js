/**
 * RIB-068 / AZRT-MODEL-PROVENANCE-1.0 — which model answered a model-backed call.
 *
 * A model-backed receipt records:
 *   requested_alias  the name the caller asked for
 *   model_id         the id the provider response reported (never copied from the alias)
 *   model_version    the version the provider response reported
 *
 * A later receipt whose model_version differs under that same alias seals a finding.
 * The finding is hash-linked (sha256 of its canonical body) and is not signed.
 * Calls with no provider model report omit the fields. Receipts sealed before this
 * spec keep their hashes.
 *
 * Not LIVE until this code and an AZBot CLEAR. The check runs; live:false is the status.
 * Cap-7 and .aziel values that appear here are names only. They are not resolved.
 * Cap-7 is not ICANN. Paid satellite stays HELD.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const MODEL_PROVENANCE_SPEC = "AZRT-MODEL-PROVENANCE-1.0";
export const MODEL_PROVENANCE_LIVE = false;
export const MODEL_FIELDS = Object.freeze(["requested_alias", "model_id", "model_version"]);
export const MODEL_RECEIPT_FIELDS = Object.freeze([...MODEL_FIELDS, "model_basis", "model_finding"]);

const ALIAS_RE = /^[A-Za-z0-9._:@-]{1,128}$/;
const ID_RE = /^[A-Za-z0-9._:@-]{1,160}$/;
const VER_RE = /^[A-Za-z0-9._:+-]{1,64}$/;
const ALIAS_KEYS = Object.freeze(["requested_alias", "model_alias", "alias", "model"]);

function cleanName(value, re) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!re.test(text)) return null;
  if (text.includes("..")) return null;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(text)) return null;
  return text;
}

function bagsOf(value) {
  const bags = [];
  const push = (o) => {
    if (o && typeof o === "object" && !Array.isArray(o)) bags.push(o);
  };
  push(value);
  if (value && typeof value === "object") {
    push(value.payload);
    push(value.body);
    push(value.result);
  }
  return bags;
}

function aliasOf(request) {
  for (const bag of bagsOf(request)) {
    for (const key of ALIAS_KEYS) {
      const name = cleanName(bag[key], ALIAS_RE);
      if (name) return name;
    }
  }
  return null;
}

function idAndVersion(obj, allowModelKey) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const explicit = cleanName(obj.model_id != null ? obj.model_id : obj.modelId, ID_RE);
  const model_id = explicit || (allowModelKey ? cleanName(obj.model, ID_RE) : null);
  const model_version = cleanName(obj.model_version != null ? obj.model_version : obj.modelVersion, VER_RE);
  if (!model_id || !model_version) return null;
  return { model_id, model_version };
}

/** Provider report only. A top-level `model` echo of the alias is not a model id. */
function providerOf(response) {
  const rows = [];
  const push = (o, allowModelKey) => {
    if (o && typeof o === "object" && !Array.isArray(o)) rows.push([o, allowModelKey]);
  };
  push(response, false);
  if (response && typeof response === "object") {
    push(response.provider, true);
    push(response.model_report, true);
    for (const nested of [response.body, response.result]) {
      push(nested, false);
      if (nested && typeof nested === "object") {
        push(nested.provider, true);
        push(nested.model_report, true);
      }
    }
  }
  for (const [obj, allowModelKey] of rows) {
    const found = idAndVersion(obj, allowModelKey);
    if (found) return found;
  }
  return null;
}

function basis() {
  return {
    spec: MODEL_PROVENANCE_SPEC,
    source: "provider-response",
    names_only: true,
    resolved: false,
  };
}

/**
 * Fields for a model-backed call, or null when the call did not report a provider model.
 * model_id and model_version come from the provider response. The alias comes from the request.
 * @param {{ request?: object, response?: object }} args
 */
export function modelProvenance({ request = null, response = null } = {}) {
  const requested_alias = aliasOf(request);
  const provider = providerOf(response);
  if (!requested_alias || !provider) return null;
  return {
    requested_alias,
    model_id: provider.model_id,
    model_version: provider.model_version,
    model_basis: basis(),
  };
}

export function modelStampOf(rec) {
  if (!rec || typeof rec !== "object") return null;
  const requested_alias = cleanName(rec.requested_alias, ALIAS_RE);
  const model_id = cleanName(rec.model_id, ID_RE);
  const model_version = cleanName(rec.model_version, VER_RE);
  if (!requested_alias || !model_id || !model_version) return null;
  return {
    requested_alias,
    model_id,
    model_version,
    model_basis: rec.model_basis && typeof rec.model_basis === "object" ? rec.model_basis : null,
    seq: rec.seq ?? null,
    hash: typeof rec.hash === "string" ? rec.hash : null,
  };
}

function presenceOf(rec) {
  const present = MODEL_FIELDS.filter((key) => rec && rec[key] != null && rec[key] !== "");
  if (present.length === 0) return "absent";
  if (present.length === 3 && modelStampOf(rec)) return "stamped";
  return "partial";
}

function priorModel(receipts, alias) {
  let found = null;
  for (const rec of receipts || []) {
    const stamp = modelStampOf(rec);
    if (stamp && stamp.requested_alias === alias) found = stamp;
  }
  return found;
}

/** Hash-linked finding. `hash` is sha256 of the canonical body. Not a signature. */
export async function sealModelFinding(prev, current) {
  const body = {
    code: "MODEL-VERSION-SWAP",
    model_id: current.model_id,
    model_version: current.model_version,
    prev_model_id: prev.model_id,
    prev_model_version: prev.model_version,
    prev_receipt_hash: prev.hash || null,
    requested_alias: current.requested_alias,
    signed: false,
    spec: MODEL_PROVENANCE_SPEC,
  };
  const hash = await sha256Hex(canonicalize(body));
  return { ...body, hash };
}

async function sealPartial(rec) {
  const clip = (value, max) => (typeof value === "string" ? value.slice(0, max) : null);
  const body = {
    code: "MODEL-PROVENANCE-PARTIAL",
    model_id: clip(rec && rec.model_id, 160),
    model_version: clip(rec && rec.model_version, 64),
    requested_alias: clip(rec && rec.requested_alias, 128),
    signed: false,
    spec: MODEL_PROVENANCE_SPEC,
  };
  const hash = await sha256Hex(canonicalize(body));
  return { ...body, hash };
}

/** Stamp plus a sealed finding when the prior receipt for this alias had another version. */
export async function withSwapFinding(prior, stamp) {
  if (!stamp) return {};
  const prev = priorModel(prior, stamp.requested_alias);
  const out = {
    requested_alias: stamp.requested_alias,
    model_id: stamp.model_id,
    model_version: stamp.model_version,
    model_basis: stamp.model_basis || basis(),
  };
  if (prev && prev.model_version !== stamp.model_version) {
    out.model_finding = await sealModelFinding(prev, stamp);
  }
  return out;
}

/** Ledger/session helper. Empty object when the call is not model-backed. */
export async function modelCallFields({ request = null, response = null, prior = null } = {}) {
  const stamp = modelProvenance({ request, response });
  if (!stamp) return {};
  return withSwapFinding(prior, stamp);
}

function reportNote(flagged, checked, count) {
  if (flagged) return "Model version changed under the same requested alias. The finding is hash-linked and sealed, not signed. This spec is not LIVE.";
  if (checked) return "Model provenance verified over " + checked + " model-backed receipt(s). No version change under the same alias. This spec is not LIVE.";
  return "Model provenance NOT checked: no model-backed receipts in this window (" + count + " receipt(s)). Non-model calls omit these fields. This spec is not LIVE.";
}

/**
 * Walk receipts oldest first. A version change under one requested_alias seals a finding.
 * Receipts with none of the model fields are skipped, so old receipts and non-model calls stay quiet.
 */
export async function checkModelVersion(receipts) {
  const last = new Map();
  const findings = [];
  const errors = [];
  let checked = 0;
  const list = receipts || [];
  for (const rec of list) {
    if (!rec || typeof rec !== "object") continue;
    const presence = presenceOf(rec);
    if (presence === "absent") continue;
    const seq = rec.seq ?? null;
    if (presence === "partial") {
      findings.push(await sealPartial(rec));
      errors.push({ seq, error: "MODEL-PROVENANCE-PARTIAL", requested_alias: typeof rec.requested_alias === "string" ? rec.requested_alias : null });
      continue;
    }
    const stamp = modelStampOf(rec);
    checked++;
    const prior = last.get(stamp.requested_alias);
    if (prior && prior.model_version !== stamp.model_version) {
      const finding = await sealModelFinding(prior, stamp);
      findings.push(finding);
      errors.push({ seq, error: "MODEL-VERSION-SWAP", requested_alias: stamp.requested_alias });
      if (!rec.model_finding || rec.model_finding.hash !== finding.hash) {
        if (rec.model_finding) errors.push({ seq, error: "MODEL-FINDING-TAMPER", requested_alias: stamp.requested_alias });
      }
    } else if (rec.model_finding) {
      errors.push({ seq, error: "MODEL-FINDING-TAMPER", requested_alias: stamp.requested_alias });
    }
    last.set(stamp.requested_alias, stamp);
  }
  const flagged = errors.length > 0;
  return {
    spec: MODEL_PROVENANCE_SPEC,
    rib: "RIB-068",
    live: MODEL_PROVENANCE_LIVE,
    signed: false,
    hash_linked: true,
    names_only: true,
    cap7_is_icann: false,
    paid_satellite: "HELD",
    ok: flagged ? false : checked ? true : null,
    status: flagged ? "swap" : checked ? "verified" : "not_checked",
    checked,
    receipts: list.length,
    findings,
    errors,
    note: reportNote(flagged, checked, list.length),
  };
}
