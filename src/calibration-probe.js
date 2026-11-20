/**
 * RIB-022 / AZRT-CALIBRATION-PROBE-1.0 (idea from @DTXNaidu).
 *
 * A deliberately wrong premise is sealed before any response. A later row seals
 * premise × response × verdict (held | hedged | built_on) linked to that
 * pre-registration hash. The runtime does not grade the verdict. The record is
 * append-only: a second verdict for the same probe is refused, and a conflict
 * already on the chain fails closed.
 * Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const CALIBRATION_SPEC = "AZRT-CALIBRATION-PROBE-1.0";
export const VERDICTS = Object.freeze(["held", "hedged", "built_on"]);
const HEX64 = /^[a-f0-9]{64}$/;

function fail(status, code, message) {
  return { ok: false, status, code, message, written: false };
}

function probes(receipts) {
  return (receipts || []).filter((r) => r && r.event === "probe" && r.payload && r.payload.calibration);
}

export async function premiseHashOf(premise) {
  return sha256Hex(canonicalize({ spec: CALIBRATION_SPEC, premise }));
}

export async function preregHashOf(premise) {
  return sha256Hex(canonicalize({
    spec: CALIBRATION_SPEC,
    phase: "preregister",
    deliberately_wrong: true,
    premise,
  }));
}

export async function recordHashOf({ prereg_hash, premise_hash, response, verdict }) {
  return sha256Hex(canonicalize({ spec: CALIBRATION_SPEC, prereg_hash, premise_hash, response, verdict }));
}

export async function calibrationRequestOf(receipts, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "CALIBRATION-INVALID", "calibration probe must be an object");
  const phase = raw.phase || (raw.verdict == null && raw.response == null ? "preregister" : "record");
  if (phase === "preregister") {
    if (raw.verdict != null || raw.response != null) {
      return fail(400, "CALIBRATION-VERDICT-BEFORE-RUN", "the verdict and the response are sealed after the premise, not on the pre-registration. Nothing was sealed.");
    }
    if (raw.deliberately_wrong !== true) {
      return fail(400, "CALIBRATION-NOT-WRONG-PREMISE", "a calibration probe is a deliberately wrong premise. Nothing was sealed.");
    }
    const premise = typeof raw.premise === "string" ? raw.premise.trim() : "";
    if (!premise || premise.length > 1024) return fail(400, "CALIBRATION-INVALID", "premise must be 1 to 1024 characters");
    const premise_hash = await premiseHashOf(premise);
    const prereg_hash = await preregHashOf(premise);
    return {
      ok: true,
      calibration: {
        spec: CALIBRATION_SPEC,
        rib: "RIB-022",
        phase: "preregister",
        deliberately_wrong: true,
        premise,
        premise_hash,
        prereg_hash,
        claimed_by: "caller",
        computed_by_runtime: false,
      },
    };
  }
  if (phase !== "record") return fail(400, "CALIBRATION-INVALID", "phase must be preregister or record");
  const prereg_hash = typeof raw.prereg_hash === "string" ? raw.prereg_hash.toLowerCase() : "";
  if (!HEX64.test(prereg_hash)) return fail(400, "CALIBRATION-INVALID", "prereg_hash must be 64 hex characters");
  if (!VERDICTS.includes(raw.verdict)) return fail(400, "CALIBRATION-VERDICT-INVALID", "verdict must be held, hedged, or built_on");
  const response = typeof raw.response === "string" ? raw.response : "";
  if (!response || response.length > 2048) return fail(400, "CALIBRATION-INVALID", "response must be 1 to 2048 characters");
  const prior = probes(receipts);
  const prereg = prior.find((r) => r.payload.calibration.phase === "preregister" && r.payload.calibration.prereg_hash === prereg_hash);
  if (!prereg) return fail(409, "CALIBRATION-UNKNOWN-PREREG", "no pre-registration has that hash. Nothing was sealed.");
  if (prior.some((r) => r.payload.calibration.phase === "record" && r.payload.calibration.prereg_hash === prereg_hash)) {
    return fail(409, "CALIBRATION-ALREADY-SEALED", "this probe already has a sealed verdict. Nothing was appended.");
  }
  if (raw.premise != null && raw.premise !== prereg.payload.calibration.premise) {
    return fail(400, "CALIBRATION-PREMISE-MOVED", "the premise does not match the pre-registration. Nothing was sealed.");
  }
  if (raw.response_receipt_hash != null) {
    const hash = String(raw.response_receipt_hash).toLowerCase();
    const exec = (receipts || []).find((r) => r && r.hash === hash);
    const preregIndex = (receipts || []).findIndex((r) => r === prereg);
    const execIndex = (receipts || []).findIndex((r) => r === exec);
    if (!exec || exec.event !== "exec" || execIndex < preregIndex) {
      return fail(409, "CALIBRATION-RESPONSE-BEFORE-PREMISE", "the named response receipt is not an exec sealed after the premise. Nothing was sealed.");
    }
  }
  const premise_hash = prereg.payload.calibration.premise_hash;
  const record_hash = await recordHashOf({ prereg_hash, premise_hash, response, verdict: raw.verdict });
  return {
    ok: true,
    calibration: {
      spec: CALIBRATION_SPEC,
      rib: "RIB-022",
      phase: "record",
      prereg_hash,
      prereg_receipt_hash: prereg.hash,
      premise_hash,
      response,
      verdict: raw.verdict,
      ...(raw.response_receipt_hash ? { response_receipt_hash: String(raw.response_receipt_hash).toLowerCase() } : {}),
      record_hash,
      claimed_by: "caller",
      computed_by_runtime: false,
    },
  };
}

export async function verifyCalibration(receipts) {
  const list = (receipts || []).filter(Boolean);
  const errors = [];
  const rows = [];
  const seen = new Map();
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const body = r.payload && r.payload.calibration;
    if (r.event !== "probe" && !body) continue;
    if (!body || body.spec !== CALIBRATION_SPEC) {
      errors.push({ seq: r.seq, code: "CALIBRATION-RECORD-HASH" });
      rows.push({ seq: r.seq, status: "unverified" });
      continue;
    }
    if (body.phase === "preregister") {
      const premise_hash = await premiseHashOf(body.premise);
      const prereg_hash = await preregHashOf(body.premise);
      if (body.deliberately_wrong !== true || premise_hash !== body.premise_hash || prereg_hash !== body.prereg_hash) {
        errors.push({ seq: r.seq, code: "CALIBRATION-PREMISE-HASH" });
        rows.push({ seq: r.seq, phase: "preregister", status: "unverified", prereg_hash: body.prereg_hash });
      } else rows.push({ seq: r.seq, phase: "preregister", status: "sealed", prereg_hash: body.prereg_hash });
      continue;
    }
    if (body.phase !== "record" || !VERDICTS.includes(body.verdict)) {
      errors.push({ seq: r.seq, code: "CALIBRATION-VERDICT-INVALID" });
      rows.push({ seq: r.seq, status: "unverified" });
      continue;
    }
    const again = await recordHashOf({
      prereg_hash: body.prereg_hash,
      premise_hash: body.premise_hash,
      response: body.response,
      verdict: body.verdict,
    });
    if (again !== body.record_hash) errors.push({ seq: r.seq, code: "CALIBRATION-RECORD-HASH" });
    const preregIndex = list.findIndex((x) => x && x.event === "probe" && x.payload && x.payload.calibration && x.payload.calibration.phase === "preregister" && x.payload.calibration.prereg_hash === body.prereg_hash);
    if (preregIndex < 0 || preregIndex >= i) errors.push({ seq: r.seq, code: "CALIBRATION-UNLINKED" });
    else if (list[preregIndex].payload.calibration.premise_hash !== body.premise_hash || list[preregIndex].hash !== body.prereg_receipt_hash) {
      errors.push({ seq: r.seq, code: "CALIBRATION-PREMISE-HASH" });
    }
    if (seen.has(body.prereg_hash)) errors.push({ seq: r.seq, code: "CALIBRATION-CONFLICT" });
    seen.set(body.prereg_hash, r.seq);
    rows.push({
      seq: r.seq,
      phase: "record",
      prereg_hash: body.prereg_hash,
      verdict: body.verdict,
      status: errors.some((e) => e.seq === r.seq) ? "unverified" : "sealed",
      computed_by_runtime: false,
    });
  }
  return {
    spec: CALIBRATION_SPEC,
    ok: errors.length === 0,
    status: rows.length ? (errors.length ? "unverified" : "sealed") : "absent",
    rows,
    errors,
    note: "The verdict is the caller's claim, sealed against the pre-registered premise. The runtime does not grade it. held, hedged, and built_on are the only verdicts.",
  };
}
