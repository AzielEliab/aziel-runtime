#!/usr/bin/env node
/**
 * AZRT-HELD-KEY-1.0 / AZRT-KEYS-1.0: provision the receipt signing key on the deploy side. Dry run by default.
 *
 *   node scripts/provision-receipt-key.mjs                    # dry run: checks only, generates nothing
 *   node scripts/provision-receipt-key.mjs --apply            # first key (live origin must have AZRT-KEYS-1.0 and signing:false)
 *   node scripts/provision-receipt-key.mjs --apply --next-epoch   # a later key: the live RECEIPT_KEY_EPOCHS must
 *                                                                 # already list the held key (merged + deployed),
 *                                                                 # so the runtime has stopped signing with it
 *
 * Format (src/receipt-signing.js): RECEIPT_SIGNING_KEY = Ed25519 private key, PKCS#8 DER, base64url;
 * RECEIPT_SIGNING_PUBLIC_KEY = the raw 32-byte public key, base64url. The key pair is generated in this
 * process's memory, each half is piped on stdin straight into
 *   env -u CLOUDFLARE_API_TOKEN npx --no-install wrangler secret put <NAME>
 * (public first, so a half-done run never signs: the runtime refuses to sign without a matching published
 * key), and nothing is written to disk, printed or kept. Only the public key and key_id are printed.
 * No backup is kept: a key change makes a new pair and appends the old PUBLIC key to RECEIPT_KEY_EPOCHS.
 * Author: Aziel Eliab.
 */
import { generateKeyPairSync, createHash } from "node:crypto";
import { spawn } from "node:child_process";

const ORIGIN = process.env.ORIGIN || "https://aziel-runtime.vibelock.workers.dev";
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const nextEpoch = args.includes("--next-epoch");
export const SECRET_PRIVATE = "RECEIPT_SIGNING_KEY";
export const SECRET_PUBLIC = "RECEIPT_SIGNING_PUBLIC_KEY";
// --no-install: use the repo's pinned wrangler (node_modules), never fetch one from the registry.
export const WRANGLER = ["env", "-u", "CLOUDFLARE_API_TOKEN", "npx", "--no-install", "wrangler", "secret", "put"];

/** Same key_id rule as src/receipt-signing.js keyIdOf: sha256 over the lowercase hex text of the raw key. */
export function keyIdOfRaw(raw) {
  return "ed25519:" + createHash("sha256").update(Buffer.from(raw).toString("hex")).digest("hex");
}

/** Preflight against the live origin. Returns { ok, code, ... }; never generates anything. */
export async function preflight({ fetchImpl = fetch, origin = ORIGIN, next = false } = {}) {
  const get = async (p) => { const r = await fetchImpl(origin + p, { headers: { "user-agent": "provision-receipt-key" } }); return r.ok ? r.json() : null; };
  const keys = await get("/.well-known/azrt-keys.json").catch(() => null);
  if (!keys || keys.spec !== "AZRT-KEYS-1.0") return { ok: false, code: "PROVISION-CODE-NOT-DEPLOYED", message: "The live origin does not serve AZRT-KEYS-1.0 yet. Merge and deploy that PR first; nothing was generated." };
  const cur = await get("/v1/receipt-key").catch(() => null);
  if (!cur) return { ok: false, code: "PROVISION-ORIGIN-UNREADABLE" };
  if (!next && cur.signing) return { ok: false, code: "PROVISION-KEY-ALREADY-HELD", key_id: cur.key_id, message: "A key is already held. A new key needs --next-epoch after its epoch is merged and deployed." };
  if (next) {
    const r = keys.receipt || {};
    // The runtime refuses to sign with a key listed in RECEIPT_KEY_EPOCHS (RECEIPT-KEY-IS-RETIRED), so once
    // the epoch is deployed the held key shows up as refused_key_id, not as signing.
    if (cur.signing) return { ok: false, code: "PROVISION-EPOCH-NOT-DEPLOYED", key_id: cur.key_id, message: "Add the current public key to RECEIPT_KEY_EPOCHS (until = the switch time) in a PR, merge and deploy it, then rerun." };
    if (r.code !== "RECEIPT-KEY-IS-RETIRED" || !r.refused_key_id) return { ok: false, code: "PROVISION-NO-CURRENT-KEY", message: "--next-epoch is for replacing a held key that is now listed as retired; none is." };
    const listed = (r.retired || []).some((e) => e.key_id === r.refused_key_id);
    if (!listed) return { ok: false, code: "PROVISION-EPOCH-NOT-DEPLOYED", key_id: r.refused_key_id };
    return { ok: true, code: "PROVISION-PREFLIGHT-OK", current_key_id: null, retired_key_id: r.refused_key_id };
  }
  return { ok: true, code: "PROVISION-PREFLIGHT-OK", current_key_id: cur.signing ? cur.key_id : null };
}

function put(name, value) {
  return new Promise((resolve, reject) => {
    const p = spawn(WRANGLER[0], [...WRANGLER.slice(1), name], { stdio: ["pipe", "inherit", "inherit"] });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`wrangler secret put ${name} exited ${code}`))));
    p.stdin.end(value);
  });
}

async function main() {
  const pre = await preflight({ next: nextEpoch });
  if (!pre.ok || !apply) {
    console.log(JSON.stringify({ ...pre, dry_run: !apply, would: apply ? undefined : [`generate Ed25519 in memory`, `${WRANGLER.join(" ")} ${SECRET_PUBLIC}  (stdin: raw public key, base64url)`, `${WRANGLER.join(" ")} ${SECRET_PRIVATE}  (stdin: PKCS#8 DER, base64url)`, "poll /v1/receipt-key until signing:true with the new key_id"] }, null, 2));
    process.exit(pre.ok ? 0 : 2);
  }
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  const pub = raw.toString("base64url");
  const key_id = keyIdOfRaw(raw);
  const der = privateKey.export({ format: "der", type: "pkcs8" });
  try {
    await put(SECRET_PUBLIC, pub);
    await put(SECRET_PRIVATE, der.toString("base64url"));
  } finally {
    der.fill(0);
  }
  for (let i = 0; i < 20; i++) {
    const r = await fetch(ORIGIN + "/v1/receipt-key").then((x) => x.json()).catch(() => null);
    if (r && r.signing && r.key_id === key_id) { console.log(JSON.stringify({ ok: true, code: "PROVISION-OK", key_id, public_key: pub, note: "Private key was piped to wrangler only; no copy kept." }, null, 2)); return; }
    await new Promise((s) => setTimeout(s, 3000));
  }
  console.log(JSON.stringify({ ok: false, code: "PROVISION-NOT-VISIBLE", key_id, public_key: pub, message: "Secrets were set but /v1/receipt-key does not show the new key yet; check the deploy." }, null, 2));
  process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
