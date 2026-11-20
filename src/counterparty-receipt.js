/**
 * RIB-021 / AZRT-COUNTERPARTY-RECEIPT-1.0 (idea from @MaracotResearch).
 *
 * Policy is checked before the act is sealed. The session log seals the act.
 * A later row seals a counterparty receipt the third party can recompute from
 * the chain, without the client's private copy. Absent rows stay absent.
 * A bad commitment, a self-issued name, or an attachment that does not match
 * stays unverified. Nothing here is signed. No key is minted.
 * Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { policyHashOf, policySetBy } from "./evidence-fields.js";
import { validTimestamp } from "./aer1-receipt.js";

export const COUNTERPARTY_SPEC = "AZRT-COUNTERPARTY-RECEIPT-1.0";
const HEX64 = /^[a-f0-9]{64}$/;
const SELF = new Set(["aziel-runtime", "runtime", "session", "self", "client", "caller", "harness", "aziel eliab"]);

export function issuerKey(name) {
  if (name == null) return "";
  return String(name).normalize("NFKC").replace(/\p{Default_Ignorable_Code_Point}/gu, "").trim().toLowerCase();
}

function fail(status, code, message) {
  return { ok: false, status, code, message, written: false };
}

function attachmentOf(raw) {
  if (raw.attachment != null && raw.attachment_b64 != null) return fail(400, "COUNTERPARTY-INVALID", "send attachment text or attachment_b64, not both");
  if (raw.attachment == null && raw.attachment_b64 == null) return { ok: true, attachment: null };
  if (raw.attachment != null) {
    if (typeof raw.attachment !== "string" || !raw.attachment.length || raw.attachment.length > 1024) {
      return fail(400, "COUNTERPARTY-ATTACHMENT-TOO-LARGE", "attachment text must be 1 to 1024 characters");
    }
    return { ok: true, attachment: { encoding: "utf8", body: raw.attachment } };
  }
  if (typeof raw.attachment_b64 !== "string") return fail(400, "COUNTERPARTY-INVALID", "attachment_b64 must be a string");
  let rawBytes;
  try {
    if (raw.attachment_b64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(raw.attachment_b64)) throw new Error("bad");
    rawBytes = Buffer.from(raw.attachment_b64, "base64");
    if (rawBytes.toString("base64") !== raw.attachment_b64) throw new Error("bad");
  } catch {
    return fail(400, "COUNTERPARTY-INVALID", "attachment_b64 is not strict base64");
  }
  if (!rawBytes.length || rawBytes.length > 1024) return fail(400, "COUNTERPARTY-ATTACHMENT-TOO-LARGE", "attachment must be 1 to 1024 bytes");
  return { ok: true, attachment: { encoding: "base64", body: raw.attachment_b64 } };
}

async function hashAttachment(attachment) {
  if (!attachment) return null;
  const bytes = attachment.encoding === "base64" ? Buffer.from(attachment.body, "base64") : new TextEncoder().encode(attachment.body);
  return sha256Hex(bytes);
}

export async function counterpartyRequestOf(receipts, raw, nowIso) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "COUNTERPARTY-INVALID", "counterparty receipt must be an object");
  const issuer = typeof raw.issuer === "string" ? raw.issuer.trim().slice(0, 128) : "";
  if (!issuer) return fail(400, "COUNTERPARTY-INVALID", "issuer is required");
  if (SELF.has(issuerKey(issuer))) return fail(400, "COUNTERPARTY-SELF", "the runtime, the client, and the author are not a counterparty. Nothing was sealed.");
  const actHash = typeof raw.act_receipt_hash === "string" ? raw.act_receipt_hash.toLowerCase() : "";
  if (!HEX64.test(actHash)) return fail(400, "COUNTERPARTY-INVALID", "act_receipt_hash must be 64 hex characters");
  const list = receipts || [];
  const actIndex = list.findIndex((r) => r && r.hash === actHash);
  if (actIndex < 0) return fail(409, "COUNTERPARTY-NO-ACT", "no sealed act has that hash. Nothing was sealed.");
  const act = list[actIndex];
  if (act.event !== "exec") return fail(409, "COUNTERPARTY-NOT-ACT", "a counterparty receipt binds an exec receipt. Nothing was sealed.");
  const policyIndex = list.findIndex((r) => r && r.hash === act.policy_receipt_ref);
  const policyReceipt = policyIndex >= 0 ? list[policyIndex] : null;
  if (!policyReceipt || policyIndex >= actIndex || (policyReceipt.event !== "open" && policyReceipt.event !== "policy") || !act.policy_hash) {
    return fail(409, "COUNTERPARTY-POLICY-UNBOUND", "the act has no policy receipt sealed before it. Nothing was sealed.");
  }
  const bound = await policyHashOf(policySetBy(policyReceipt));
  if (bound !== act.policy_hash) return fail(409, "COUNTERPARTY-POLICY-UNBOUND", "the act's policy hash does not match the policy sealed before it. Nothing was sealed.");
  const statement = typeof raw.statement === "string" ? raw.statement.trim() : "";
  if (!statement || statement.length > 512) return fail(400, "COUNTERPARTY-INVALID", "statement must be 1 to 512 characters");
  const issued_at = raw.issued_at == null ? nowIso : raw.issued_at;
  if (!validTimestamp(issued_at)) return fail(400, "COUNTERPARTY-INVALID", "issued_at is not a valid RFC 3339 timestamp");
  const got = attachmentOf(raw);
  if (!got.ok) return got;
  const sha = await hashAttachment(got.attachment);
  if (raw.attachment_sha256 != null && String(raw.attachment_sha256).toLowerCase() !== sha) {
    return fail(400, "COUNTERPARTY-ATTACHMENT-MISMATCH", "attachment bytes do not match attachment_sha256. Nothing was sealed.");
  }
  const attachment = got.attachment ? { ...got.attachment, sha256: sha } : null;
  const body = {
    spec: COUNTERPARTY_SPEC,
    rib: "RIB-021",
    issuer,
    signed: false,
    signature: null,
    issued_at,
    act_receipt_hash: actHash,
    policy_receipt_ref: act.policy_receipt_ref,
    policy_hash: act.policy_hash,
    statement,
    attachment,
  };
  const commitment = await sha256Hex(canonicalize(body));
  return { ok: true, counterparty: { ...body, commitment } };
}

export async function verifyCounterparty(receipts) {
  const list = (receipts || []).filter(Boolean);
  const errors = [];
  const rows = [];
  const execs = list.filter((r) => r.event === "exec");
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const body = r.payload && r.payload.counterparty;
    if (r.event !== "counterparty" && !body) continue;
    if (!body || body.spec !== COUNTERPARTY_SPEC) {
      errors.push({ seq: r.seq, code: "COUNTERPARTY-COMMITMENT" });
      rows.push({ seq: r.seq, receipt_hash: r.hash, status: "unverified" });
      continue;
    }
    const { commitment, ...rest } = body;
    const again = await sha256Hex(canonicalize(rest));
    let status = "verified";
    if (again !== commitment) {
      status = "unverified";
      errors.push({ seq: r.seq, code: "COUNTERPARTY-COMMITMENT" });
    }
    if (SELF.has(issuerKey(body.issuer)) || (r.session_id && issuerKey(body.issuer) === issuerKey(r.session_id))) {
      status = "unverified";
      errors.push({ seq: r.seq, code: "COUNTERPARTY-SELF" });
    }
    const actIndex = list.findIndex((x) => x && x.hash === body.act_receipt_hash);
    if (actIndex < 0 || actIndex >= i || list[actIndex].event !== "exec") {
      status = "unverified";
      errors.push({ seq: r.seq, code: "COUNTERPARTY-BEFORE-ACT" });
    } else {
      const act = list[actIndex];
      const policyIndex = list.findIndex((x) => x && x.hash === act.policy_receipt_ref);
      if (policyIndex < 0 || policyIndex >= actIndex || body.policy_receipt_ref !== act.policy_receipt_ref || body.policy_hash !== act.policy_hash) {
        status = "unverified";
        errors.push({ seq: r.seq, code: "COUNTERPARTY-POLICY-UNBOUND" });
      }
    }
    if (body.attachment) {
      const sha = await hashAttachment(body.attachment);
      if (!sha || sha !== body.attachment.sha256) {
        status = "unverified";
        errors.push({ seq: r.seq, code: "COUNTERPARTY-ATTACHMENT" });
      }
    }
    if (body.signed !== false || body.signature != null) {
      status = "unverified";
      errors.push({ seq: r.seq, code: "COUNTERPARTY-UNSIGNED" });
    }
    rows.push({ seq: r.seq, receipt_hash: r.hash, act_receipt_hash: body.act_receipt_hash, status, signed: false });
  }
  const byAct = new Map(rows.filter((row) => row.act_receipt_hash).map((row) => [row.act_receipt_hash, row.status]));
  const acts = execs.map((ex) => ({
    act_receipt_hash: ex.hash,
    counterparty: byAct.get(ex.hash) || "absent",
  }));
  return {
    spec: COUNTERPARTY_SPEC,
    ok: errors.length === 0,
    status: rows.length ? (errors.length ? "unverified" : "verified") : "absent",
    signed: false,
    rows,
    acts,
    errors,
    note: "Absent means no counterparty receipt was sealed. Unverified means the sealed evidence does not recompute. Verified means the chain binds a named counterparty statement to an earlier policy-gated act. It is not a signature.",
  };
}
