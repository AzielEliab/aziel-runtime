/**
 * Sentinel — integrity defense AFTER SweepGate.
 *
 * PASS / SUSPECT / QUARANTINE / REJECT / HOLD.
 * No rollback language. Recovery is a forward RoseClock action.
 * Complementary to SweepGate. Not ethics. Not a Softwares-tab product.
 *
 * Author: Aziel Eliab only.
 */

export const SENTINEL_VERSION = "SEN-1.0";
export const SENTINEL_AUTHOR = "Aziel Eliab";
export const SENTINEL_SOFTWARE_TAB = false;

const MALWARE = /meterpreter|rm -rf \/|TVpQAA|#!\/bin\/sh/i;
const POISON = /\b(inject-payload|jailbreak-ignore|ignore previous instructions|dan mode)\b/i;
const TAMPER = /\b(rewrite (the )?(stamp|hash|receipt)|backdate|rollback (the )?(chain|stamp))\b/i;

function blobOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Integrity classification. SweepGate already ran.
 * Trusted catalog calls should PASS clean advisory payloads.
 */
export function sentinelInspect(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const text = blobOf(src.payload != null ? src.payload : src);
  const findings = [];

  if (MALWARE.test(text) || /meterpreter/.test(text) || text.includes("MZ\x90")) {
    findings.push("malware-class");
    return verdict("REJECT", findings, "Structural malware-class residue after SweepGate. Halt. No rollback.");
  }
  if (POISON.test(text)) {
    findings.push("poison");
    return verdict("QUARANTINE", findings, "Poison / instruction-override residue. Quarantine. Forward corrective action only.");
  }
  if (TAMPER.test(text)) {
    findings.push("tamper");
    return verdict("REJECT", findings, "Output/stamp tamper language. Reject. Chain is append-only.");
  }

  const size = text.length;
  if (size > 400_000) {
    findings.push("oversize");
    return verdict("HOLD", findings, "Payload exceeds Sentinel hold budget. HOLD. No rollback.");
  }
  if (size > 80_000) {
    findings.push("bulky");
    return verdict("SUSPECT", findings, "Unusually large payload. Continue flagged. Not sole security.");
  }

  return verdict("PASS", findings, "Integrity clear.");
}

function verdict(status, findings, message) {
  const stop = status === "REJECT" || status === "QUARANTINE" || status === "HOLD";
  return {
    v: SENTINEL_VERSION,
    status,
    findings,
    stop,
    refuse: stop ? `sentinel-${status.toLowerCase()}` : undefined,
    message,
    rollback: false,
    software_tab: false,
    after: "sweepgate",
    author: SENTINEL_AUTHOR,
  };
}

export function sentinelView(row) {
  if (!row || typeof row !== "object") return null;
  return {
    v: row.v || SENTINEL_VERSION,
    status: row.status || null,
    findings: Array.isArray(row.findings) ? row.findings.slice() : [],
    stop: Boolean(row.stop),
    rollback: false,
  };
}
