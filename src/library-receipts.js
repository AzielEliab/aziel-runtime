/**
 * Push a sanitized four-field action receipt to the Corpus Library tab.
 * Local ChainLock remains source-of-truth on the node. This is the public mesh copy.
 * Author: Aziel Eliab only.
 */
export const LIBRARY_RECEIPTS = "https://www.azielcorpuslibrary.net/v1/receipts/append";
export const RECEIPTS_SPEC = "ACT-RECEIPT-1.0";

function oneSentence(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const cut = raw.split(/(?<=[.!?])\s+/)[0] || raw;
  return cut.length <= 240 ? cut : cut.slice(0, 239) + "…";
}

export async function publishLibraryReceipt(env, input = {}) {
  const token = String((env && (env.RECEIPT_APPEND_TOKEN || env.LIBRARY_RECEIPT_TOKEN)) || "");
  if (!token) return { ok: false, refuse: "no-token", published: false };
  const body = {
    action: oneSentence(input.action || input.request),
    output: oneSentence(input.output),
    surface: "aziel-runtime",
    path: input.path || "/runtime",
    method: input.method || "POST",
    tool: input.tool || "",
    runtime: input.runtime || "",
    metadata: {
      event: input.event || "runtime-act",
      spec: RECEIPTS_SPEC,
    },
  };
  if (!body.action || !body.output) return { ok: false, refuse: "need-action-and-output", published: false };
  const res = await fetch(LIBRARY_RECEIPTS, {
    method: "POST",
    headers: { "content-type": "application/json", "x-aziel-receipt": token },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: !!json.ok, published: res.status === 201, status: res.status, receipt: json.receipt || null, refuse: json.refuse };
}
