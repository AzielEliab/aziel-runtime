# AZMAIL-USER-1.0 — private user-to-user mail (inbox + outbox) on ARK accounts, receipted in the lattice

Status: **DESIGN v1.0. Nothing live.** Default OFF behind `AZMAIL_USER=on` (and it also needs `ARK_ACCOUNTS=on`). No deploy, no secret, no flag flip in this batch. This is mail between AZ users **inside the system**. It is **not** internet SMTP. AZMail public mail and the existing REMAIN-OFF stubs (`smtp`, `send`, `mail`, `deliver`, `imap`, `pop3`, `mx` …) stay off and are unchanged.
Builds on USER-SIGNIN-ARK-1.0 (runtime #330/#332/#333/#334). Version `2.0.0-rc1`. tools/list **36**, Softwares **42**, stub ops **363**, all unchanged.

## 1. Request (Aziel, 2026-10-22 8:11 AM EDT)

> "az mail users should have inbox and outbox and be able to mail each other via true user names and or encrypted hash versions - mail messages are private - hash chain lattice of receipting verifying mail sent received is in hash chain lattice receipt chain"

## 2. Keys (one more HKDF label on the ARK account schedule)

The ARK account master (USER-SIGNIN-ARK §3) gets one extra, additive subkey:

```
mail_seed = HKDF-SHA256(master, salt, "ARK:MAIL", 32)    → X25519 private key
mail_pub  = X25519(mail_seed)
address   = "azm1." + hex(mail_pub)                          the "hash version" address, self-certifying
inbox_id  = SHA-256("AZMAIL-USER:v1:inbox|"  + hex(mail_pub))
outbox_id = SHA-256("AZMAIL-USER:v1:outbox|" + vault_id)
```
Existing `pub`, `vault_id` and parity vectors do not change.

## 3. Two ways to address a user

1. **Key address (no directory, no oracle):** `azm1.<64 hex>`. Anyone can encrypt to it. Mail to an address no one owns is stored and is unreadable. The send reply is the same either way.
2. **Username:** a user may **claim** their normalized username once (`user_mail_claim`, hosted creds, signed by the vault key). The directory is KV `azmail:u:name:<SHA-256("AZMAIL-USER:v1:name|"+u)>` → `{mail_pub, vault_pub, sig}`. Write-once, first claim wins. The plaintext username is never stored.
   - **No existence oracle on lookup:** `user_mail_resolve` and send-by-name return a key for **every** valid username. An unclaimed name returns a **decoy** key, X25519 from `HMAC-SHA256(AZMAIL_DECOY_SECRET, "AZMAIL-USER:v1:decoy|"+u)`. Without the secret, decoys can't be told apart from real keys. Mail to a decoy is stored the same way and can't be read by anyone. Replies, sizes, KV write counts and rate limits are the same.
   - **Fail closed:** if `AZMAIL_DECOY_SECRET` is unset, every by-name op refuses `AZMAIL-NAME-OFF` for every name. Key addresses still work.
   - **Claim is uniform:** `user_mail_claim` always answers `AZMAIL-CLAIM-RECORDED`. The only way to learn that a name was taken is to claim it and then resolve it. That leak is unavoidable with unique names, and it is disclosed (§10).

## 4. Message envelope (end-to-end, the server holds only ciphertext)

```
inner = canonical{v:1, from:"azm1.<sender mail_pub>", from_vault_pub, subject, body, ts, r:hex(32 random)}
inner_sig = Ed25519(sender sign key, inner)
eph       = fresh X25519 keypair
k         = HKDF-SHA256(ECDH(eph, rcpt_mail_pub), eph_pub‖rcpt_mail_pub, "AZMAIL-USER:v1:msg", 32)
ct_b64    = base64(eph_pub ‖ iv ‖ AES-256-GCM(k, iv, {inner, inner_sig}, AAD "AZMAIL-USER:v1|"+inbox_id))
```
The sender's identity, subject and body exist only inside the ciphertext. The recipient checks `inner_sig` against `from_vault_pub` after decrypting. The sender's outbox copy is sealed with the sender's own `ARK:ENC` key (USER-SIGNIN-ARK `sealData`, AAD bound to `outbox_id`+seq).

## 5. Receipts in the lattice (primary + secondary now, room for tie-break)

Three append-only chains per user, same row discipline as ARK account rows (seq/prev/row_hash, write-once, `latticePrimary` then `latticeOnlineSecondary`, `offline:false`):

| chain | key | rows | on-chain fields |
|---|---|---|---|
| inbox | `azmail:u:in:<inbox_id>:<seq>` | `delivered` (at send), `ack` (the recipient read it) | inbox_id, seq, prev, ts, kind, ct_sha256, commit, lattice, row_hash |
| outbox | `azmail:u:out:<outbox_id>:<seq>` | `sent` | outbox_id, seq, prev, ts, ct_sha256 (own copy), commit, user_pub, user_sig, lattice, row_hash |

- **Sent and received can be verified without leaking who wrote to whom.** The commitments are `commit_out = SHA-256("AZMAIL-USER:v1:out|"+r)`, `commit_in = SHA-256("…:in|"+r)` and `commit_ack = SHA-256("…:ack|"+r)`. They don't match each other, so a public observer can't link an outbox row to an inbox row. Either party can reveal `r` (it's inside both ciphertexts) to prove the pair: sent, then delivered, then acked.
- **No duplicate hashes:** every row hashes its own `seq`, `prev`, chain id and a fresh-IV ciphertext. Two sends of the same text produce different `ct_sha256`, `commit` and `row_hash`.
- **No plaintext username on the chain.** Rows carry only `inbox_id`/`outbox_id` (hashes), and no sender on inbox rows.
- **Signed vs sealed:** outbox rows are signed by the user (Ed25519, as ARK account rows are). Inbox `delivered` rows are sealed only. A user signature there would link the inbox to the sender. `ack` rows are written only after a hosted sign-in proves the derived `mail_pub` owns the inbox. The runtime still does not sign (`hash-linked-sealed-not-signed` stays).
- **Tie-break (third chain):** offline-composed mail synced later would use `latticeOfflineSecondary(ct_sha256, "azm.<inbox_id>")` once LumenBot's tie-break formula (lumen#31 / runtime #327) is audited. `user_mail_sync` is **not** in this batch.

## 6. Ops (FragGate single door, existing `azmail` slug, tools stay 36)

| op | args (hosted creds go through the ARK credential firewall) | result |
|---|---|---|
| `user_mail_open` | username, password | `{address, inbox_count, outbox_count}` (always ok, deniable) |
| `user_mail_claim` | username, password | `AZMAIL-CLAIM-RECORDED` (uniform) |
| `user_mail_resolve` | to (name) | `{address}` (real or decoy, the same shape) |
| `user_mail_send` | username, password, to (name or `azm1.`), subject?, body | `{sent:true, outbox_row, commit_in}`. Never returns inbox seq/count |
| `user_mail_inbox` | username, password, limit? | decrypted messages + row receipts + `sender_verified` |
| `user_mail_outbox` | username, password, limit? | decrypted own copies + receipts |
| `user_mail_ack` | username, password, seq | appends an `ack` row to the inbox chain |

The credential firewall widens from `ark/account_*` to also cover `azmail/user_mail_*`, so credentials are scrubbed before ledger, telemetry, refusal digest or jobs see them. These are **live ops on an existing slug**, so stubs stay 363 and Softwares stay 42. The `registry_digest` changes (additive), as #333 did. Uniform refusals: `AZMAIL-USER-OFF`, `ARK-ACCOUNTS-OFF`, `ARK-STORE-OFF`, `AZMAIL-NAME-OFF`, `ARK-INPUT`, `ARK-RATE`, `ARK-STALE`, `ARK-FAIL-CLOSED`.

## 7. Limits

body ≤ 16 KiB, subject ≤ 200 chars, inbox/outbox page ≤ 50. Rate limits reuse ARK §8 counters (per /64 prefix + per subject) and also add a per-recipient window cap (`azmail:rl:to:<inbox_id>`, 100/15 min) that applies to decoys too. KV writes: send = 4 data (2 rows + 2 tips) + 3 counters = **7**. claim = 1 + 2. ack = 2 + 2. read = 2 counters.

## 8. Fail closed

Any crypto, KV or parse error gives `ARK-FAIL-CLOSED` and nothing is written. Rows are write-once (a seq that already exists gives `ARK-STALE`). KV has no CAS, so concurrent sends to one inbox can race. The loser gets `ARK-STALE` on read-back, and the sender's outbox row is written **only after** the inbox row lands. Moving to the #324 serialized writer DO is a follow-up.

## 9. PRs (one idea each)

runtime: (1) this note · (2) `ARK:MAIL` subkey + `src/mail/user-crypto.js` envelope/commitments + vectors (pure) · (3) firewall widening + `azmail` `user_mail_*` ops through FragGate (default OFF) + tests.
Next, not in this batch: lockstep feature row `azmail-user`, AZ-OS / AZInterface on-device mail clients (parity), `user_mail_sync` (tie-break), device-mode (pre-encrypted) send.

## 10. Still for Aziel

- **Decoy secret:** name lookup needs a server secret (`AZMAIL_DECOY_SECRET`) to hide which names exist. It is not a user secret and decrypts nothing, but it is a secret the server holds. Without it, by-name mail stays off and only `azm1.` addresses work.
- **Unique names leak on claim:** someone who tries to claim a name can learn it was already taken. Squatting is first-come. Alternatives: key addresses only, or names scoped per user (contacts).
- **Same name, different password = a different account** (ARK deniability). Only the first vault to claim a name receives mail sent to that name.
- **Hosted mode:** the LLM app sees the password and the plaintext mail it sends or reads. On-device clients come later.
- **Metadata:** the server sees which inbox_id receives ciphertext and when, plus the sender's request IP. It doesn't see content or names.
