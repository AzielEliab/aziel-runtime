/**
 * USER-SIGNIN-ARK-1.0 §12.2: user-side sign-in helper. GET /ark/signin serves a static
 * page that derives the ARK key (PBKDF2-100k → HKDF → Ed25519) in the browser and
 * signs the runtime's nonce. It makes no network calls (CSP connect-src 'none'); the
 * user copies only { vault_pub, nonce, user_sig } into the LLM chat. Author: Aziel Eliab.
 * SPDX-License-Identifier: Apache-2.0
 */
export const HELPER_JS = String.raw`
async function arkSignChallenge(username, password, nonce) {
  const enc = new TextEncoder(), S = crypto.subtle;
  const hex = (b) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
  const sha = async (s) => new Uint8Array(await S.digest("SHA-256", typeof s === "string" ? enc.encode(s) : s));
  const u = String(username).normalize("NFKD").replace(/\p{M}+/gu, "").normalize("NFKC").toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) throw new Error("ARK-INPUT");
  const pw = enc.encode(String(password).normalize("NFKC"));
  if (pw.length < 8 || pw.length > 1024) throw new Error("ARK-INPUT");
  if (!/^[0-9a-f]{64}$/.test(String(nonce))) throw new Error("ARK-INPUT");
  const salt = await sha("ARK-ACCOUNT:v1:salt|" + u);
  const base = await S.importKey("raw", pw, "PBKDF2", false, ["deriveBits"]); pw.fill(0);
  const master = new Uint8Array(await S.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, base, 256));
  const hk = await S.importKey("raw", master, "HKDF", false, ["deriveBits"]); master.fill(0);
  const seed = new Uint8Array(await S.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: enc.encode("ARK:SIGN") }, hk, 256));
  const pk8 = new Uint8Array(48); pk8.set([0x30,0x2e,0x02,0x01,0x00,0x30,0x05,0x06,0x03,0x2b,0x65,0x70,0x04,0x22,0x04,0x20]); pk8.set(seed, 16); seed.fill(0);
  const priv = await S.importKey("pkcs8", pk8, { name: "Ed25519" }, true, ["sign"]); pk8.fill(0);
  const jwk = await S.exportKey("jwk", priv);
  const pub = hex(Uint8Array.from(atob(jwk.x.replace(/-/g, "+").replace(/_/g, "/") + "="), (c) => c.charCodeAt(0)));
  const vault_id = hex(await sha("ARK-ACCOUNT:v1:vault|" + pub));
  const user_sig = hex(await S.sign({ name: "Ed25519" }, priv, enc.encode("ARK-ACCOUNT:v1:session|" + vault_id + "|" + nonce)));
  return { vault_pub: pub, vault_id, nonce, user_sig };
}`;

export function signinHelperHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>ARK sign-in helper</title></head><body style="font:16px system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem">
<h1>ARK sign-in helper</h1>
<p>Your username and password stay on this page. It sends nothing anywhere. Paste the nonce your AI app shows you, then copy the result back to it.</p>
<form id="f"><label>Username <input id="u" autocomplete="username" required></label><br>
<label>Password <input id="p" type="password" autocomplete="current-password" required></label><br>
<label>Nonce <input id="n" size="66" required></label><br><button>Sign</button></form>
<pre id="o" style="white-space:pre-wrap"></pre>
<script>${HELPER_JS}
document.getElementById("f").addEventListener("submit", async (e) => { e.preventDefault();
  const o = document.getElementById("o"); o.textContent = "Working…";
  try { const r = await arkSignChallenge(u.value, p.value, n.value.trim()); p.value = "";
    o.textContent = JSON.stringify({ slug: "ark", op: "account_session", payload: { vault_pub: r.vault_pub, nonce: r.nonce, user_sig: r.user_sig } }, null, 1);
  } catch { o.textContent = "Check the username (3-32 of a-z 0-9 . _ -), password (8+ chars) and nonce."; } });</script></body></html>`;
}

export const SIGNIN_HELPER_HEADERS = Object.freeze({
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
});
