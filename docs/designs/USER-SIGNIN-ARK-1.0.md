# USER-SIGNIN-ARK-1.0 — username + password sign-in (ARK account mode) across runtime, AZ-OS, AZInterface

Status: **DESIGN v1.1, decisions from Aziel applied (2026-10-22 7:46 AM EDT). Nothing live.** Ships default-OFF behind `ARK_ACCOUNTS=on`; no deploy, no secret, no flag flip in this batch.
Bases: runtime `a4f8a17`, azos `b4fe86a`, azinterface `f67c728`. Lockstep `5921cfd344c2` (bumped by the lockstep PR, re-vendored to peers). Version `2.0.0-rc1`. tools/list **36**, Softwares **42**, stub ops **363** — all unchanged.

## 1. Request (Aziel, relayed by Chief of Staff)

> "runtime + AZOS + interface should all have a new user / user sign in option username + password. username and password should be ARK encrypted and stored into the hash chain lattices for specific receipt recalls and sign all actions hash chains and receipts encrypted to recall that users specific history."

## 2. ARK — source definition

`library_lookup q="ARK encryption"` (aziel-runtime MCP, 2026-10-22): FG-OK, **no hits**. Definition comes from the ARK repo:

- github.com/AzielEliab/ark README: "The ARK (Aziel Rotating Kernel) — **Local deniable vault.** Every phrase is a login. One phrase → one vault. Empty vault indistinguishable from a wrong phrase. AES-256-GCM, Argon2id, HKDF subkeys, Mode E intake filter before encrypt, auto-lock + zeroization."
- ark/docs/whitepaper.md: "There are no usernames, accounts, vault registries, or selector UIs." · "HKDF-SHA256 subkeys: `ARK:ENC`, `ARK:META`, `ARK:LOG`, `ARK:FILE`" · "Uniform failure" · "No passphrase endpoints. No vault blobs in KV." · "Forgotten phrase = permanent loss".

**Aziel's decisions (2026-10-22) resolve the conflicts:** a wrong password silently opens an EMPTY history (ARK deniability, kept); no recovery codes; hosted endpoint AND on-device are both allowed, on-device preferred; usernames only hashed/encrypted on chain; the server never holds plaintext, any reversible form, or private keys; 3-chain spec confirmed. "ARK account mode" below = ARK's construction (HKDF `ARK:*` labels, AES-256-GCM, uniform failure, one phrase → one vault) with the **username folded into the phrase**.

## 3. The core idea: no account record at all

There is **no credential record, no verifier, no salt store, no username table**. The vault's address is derived from `(username, password)`:

```
u        = lower(NFKC(strip_marks(NFKD(username))))      must match ^[a-z0-9._-]{3,32}$
pw       = UTF-8(NFKC(password))                          8..1024 bytes
salt     = SHA-256("ARK-ACCOUNT:v1:salt|" + u)
master   = PBKDF2-SHA256(pw, salt, 100000 iters, 32 B)    (100k = Workers WebCrypto max)
sign_sk  = HKDF-SHA256(master, salt, "ARK:SIGN", 32)      → Ed25519 seed
enc_key  = HKDF-SHA256(master, salt, "ARK:ENC", 32)       → AES-256-GCM
pub      = Ed25519(sign_sk)
vault_id = SHA-256("ARK-ACCOUNT:v1:vault|" + hex(pub))
```

Consequences:
- **Deniable, no oracle.** Any (username, password) pair is valid and opens *a* vault. A wrong password is a different, empty vault. Sign-in never says yes/no; there is nothing to enumerate.
- **Server holds nothing secret.** KV holds only `vault_id`, `pub`, and ciphertext rows. No plaintext, no hash of the password, no salt+hash pair, no private key.
- **Username never on chain.** Only `vault_id` (unlinkable to the username without the password). Lattice `username` slots carry `ark.<vault_id>` (fits `LATTICE_USER_RE`).
- **Lost password = history unreadable forever.** Receipts still exist on the chain (sealed, verifiable by AZAI), but no one — including Aziel or the runtime — can open or append to them. No recovery codes (Aziel). A password change is not possible in place: a new password is a new vault (documented in UI copy).

## 4. Two sign-in modes, one key schedule

**On-device (preferred):** AZ-OS (Python) and AZInterface derive keys locally. Only `pub`, signatures and ciphertext leave the device.
**Hosted — SUPERSEDED by §12.2; plaintext is now refused (for LLM clients — Grok, GPT, Claude, Venice … over MCP/OpenAPI):** the client passes `username`+`password` to `fraggate_call` `{slug:"ark", op:"account_*"}`. The **credential firewall** runs first at every door (MCP `tools/call` before the refusal guard, `POST /v1/fraggate/call`, and `fraggateCall` itself): it derives keys in memory, **deletes** `username`/`password` from the args (top level and `payload`), and attaches keys to a WeakMap handle that is never serialized. Ledger rows, attempt links, refusal `args_digest`, background jobs, telemetry and receipts therefore never see the secret or any hash of it. Residual (disclosed): in hosted mode the LLM provider and its transcript see the password; prefer on-device.

Both modes produce identical keys (parity vectors pinned in runtime JS, AZ-OS Python, AZInterface Python).

## 5. Ops (FragGate is the single door; tools stay 36)

All on the existing `ark` slug, via `fraggate_call` and `POST /v1/fraggate/call`. No new MCP tool; Softwares 42; stub ops 363.

| op | hosted args | device args | result |
|---|---|---|---|
| `account_open` | username, password | vault_pub | `{vault_id, count, tip}` — always ok (empty vault looks the same as new) |
| `account_append` | username, password, data, kind? | vault_pub, seq, prev, kind, ct_b64, ct_sha256, ts, user_sig | sealed row `{seq, row_hash, lattice}` |
| `account_recall` | username, password, limit? | vault_pub, ts, user_sig | hosted: decrypted `data[]`; device: ciphertext rows |

Uniform refusals: `ARK-ACCOUNTS-OFF` (flag off), `ARK-STORE-OFF` (no KV), `ARK-INPUT` (malformed), `ARK-RATE`, `ARK-SIG-BAD`, `ARK-STALE` (seq/prev race or ts window). None depends on whether a vault "exists".

## 6. Rows, lattice, sealed vs signed

Row (KV `ark:acct:<vault_id>:<seq>`, tip `ark:acct:<vault_id>:tip`, append-only, write-once per seq):
`{spec:"ARK-ACCOUNT-1.0", vault_id, seq, prev, ts, kind, ct_b64 (iv‖ciphertext, AAD "ARK:V1|vault_id|seq"), ct_sha256, lattice:{document_hash:ct_sha256, primary, secondary, offline:false}, user_pub, user_sig, row_hash}`
- `primary = latticePrimary(ct_sha256, prev_primary)`, `secondary = latticeOnlineSecondary(primary, prev_secondary)` — the existing dual-lattice rules, unchanged.
- **Sealed (unchanged rule):** every row has `row_hash` and the FragGate receipt seals the call like any other. The runtime still does not sign (`signing: hash-linked-sealed-not-signed` stays).
- **Signed (new, opt-in, additive):** `user_sig` = Ed25519 by the *user's* key over canonical `{spec,vault_id,seq,prev,kind,ct_sha256,ts}`. It sits outside every existing hash preimage, so no existing hash changes. Missing on non-account receipts = today's behavior.
- **Encrypted to the user:** only the user's `enc_key` opens `ct_b64`. AZAI's lattice review (#325) still verifies `seq/prev/row_hash/lattice` without reading content.

## 7. 3-chain spec (confirmed)

Primary = online chain; secondary = offline chain; tie-break = chained, username-hashed on sync. Account rows written offline by AZ-OS use `latticeOfflineSecondary(ct_sha256, "ark.<vault_id>")`, so the "username" hashed into tie-break is already a hash. **`account_sync` is NOT in this batch:** it waits for the audited tie-break formula from LumenBot (lumen#31) and runtime #327. Until then AZ-OS keeps offline account rows local.

## 8. Rate limit, lockout, no existence leak

Per-window KV counters (15 min): per /64 (IPv4 /32) and per subject (hosted: `SHA-256("ARK-ACCOUNT:v1:rl|"+u)`; device: `vault_id`). Limits: 60 calls/prefix, 30/subject per window → `ARK-RATE`. Counters run identically for any username, so lockout reveals nothing about existence. Refusals are sealed by the existing refusal guard (args already scrubbed by the firewall).

## 9. KV write budget

- append: 2 writes (row + tip) + 2 counter writes = **4**
- open / recall: 0 data writes + 2 counter writes = **2**
- KV 1 write/s per key: counters are per-window keys; tip is per-vault.
- Free tier (1k writes/day) ≈ 250 appends/day total — tight; paid tier fine. No CAS in KV: two concurrent appends to one vault can race; the second fails `ARK-STALE` on read-back, and a lost race is disclosed as a residual (move to the #324 serialized writer DO in a follow-up).

## 10. Constraints

FragGate single door · additive only · append-only · fail closed (any crypto/KV/parse error refuses) · nothing Remain-OFF enabled · default OFF (`ARK_ACCOUNTS` unset) · version 2.0.0-rc1 · tools 36 · Softwares 42 · stub ops 363 · lockstep feature row `ark-account` added → contract bumped from `5921cfd344c2` and re-vendored to azos and azinterface.

## 11. PRs (one idea each)

runtime: (1) this note · (2) `src/account/ark-kdf.js` key schedule + vectors · (3) credential firewall + `account_*` ops (default OFF) · (4) lockstep feature row + contract bump.
azos: (1) re-vendor contract · (2) on-device `azos/ark_account.py` + parity vectors + offline rows.
azinterface: (1) re-vendor contract · (2) on-device `azinterface/ark_account.py` + parity vectors, calls proxy through union.js/FragGate.

## 12. Aziel's decisions (2026-10-22 08:13 EDT)

1. **KDF: PBKDF2-SHA256 100k is accepted for now.** Raising it later is a v2 key schedule (new vault addresses); not in this batch.
2. **The LLM app never sees the plaintext username or password.** This supersedes the hosted mode of §4.
   - Key derivation runs on the user's side: the static helper page `GET /ark/signin` (PBKDF2/HKDF/Ed25519 in the browser via WebCrypto; CSP `connect-src 'none'`, no network calls) or the CLI `scripts/ark-signin.mjs` (password on stdin). AZ-OS and AZInterface use their on-device `ark_account.py`.
   - The LLM/MCP client only receives and forwards the hashed/encrypted login: `vault_pub` (vault id = SHA-256 of it) plus a challenge signed with the user's Ed25519 key.
   - Ops: `account_challenge {vault_pub}` → single-use nonce (120 s, consumed before verify, bound to its vault); `account_session {vault_pub, nonce, user_sig over "ARK-ACCOUNT:v1:session|vault_id|nonce"}` → the runtime checks the signature and the vault's receipt chain (tip row must be signed by that key) and only then returns a 15-minute session token (stored only as a hash). `account_open` / `account_recall` accept `{session}`. Appends stay per-row user-signed.
   - A wrong password derives a different key that signs validly for its own empty vault: same response shape, no oracle. A malformed or foreign signature is `ARK-SIG-BAD`, which says nothing about the password.
   - **Plaintext door refused.** `username`/`password` sent to any door are still scrubbed by the credential firewall (kept), then refused `ARK-PLAINTEXT-REFUSED`; nothing derived or stored. Deprecated re-open only via `ARK_PLAINTEXT_DOOR=deprecated-on`, which is not configured.
3. **AZInterface and AZOS Workers get sign-in routes** (`POST /v1/ark/account`) that forward only the hashed/signed login to the runtime over the `AZIEL_RUNTIME` binding and refuse plaintext locally. The lockstep row `ark_account` moves from `gap` to `proxied` on both legs (contract `e4e7dcecb01b`, gaps 0).
4. **Accepted known residual, to address later (no code change now):** public `vault_id`s allow offline guessing of weak passwords, because the server holds no secret by design. Mitigation today is a long password.

PRs: runtime #343 (challenge/session), #344 (plaintext refused), #345 (helper page + CLI), #346 (lockstep routes + leg alias); azinterface #52, azos #47 (Worker routes).

## 12a. AZBot #333 review fixes

Firewall detects every shape `parseTarget` routes and matches credential keys case-insensitively; the MCP confirm retry hint is scrubbed. PBKDF2 runs only after `ARK_ACCOUNTS`, store and both rate checks. Rate subject is a window-salted, 24-bit-truncated hash (not `sha256(username)`); per-subject limit eased 30 → 100 per 15 min. `verifyArkRows` / `verify_rows` recheck `ct_sha256` and bind to the stored tip. Offline `LATTICE-DOUBLE` is keyed on an HMAC of the plaintext under the vault's enc key, so it fires despite the random IV.

## 13. Still for Aziel

- Flip `ARK_ACCOUNTS=on` (deploy) only after AZBot review + his OK.
- New password = new empty vault (no in-place change).
