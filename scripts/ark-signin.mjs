#!/usr/bin/env node
// USER-SIGNIN-ARK-1.0 §12.2 CLI: derive locally and sign a runtime nonce. Prompts for the password
// (never an argv). Prints only { vault_pub, nonce, user_sig } for the LLM/MCP client to forward.
// Usage: node scripts/ark-signin.mjs <username> <nonce>   (password read from stdin)
import { deriveArkAccount, signBytes } from "../src/account/ark-kdf.js";
import { sessionMessage } from "../src/account/ops.js";
const [username, nonce] = process.argv.slice(2);
if (!username || !/^[0-9a-f]{64}$/.test(String(nonce || ""))) { console.error("usage: ark-signin.mjs <username> <nonce-hex64>  (password on stdin)"); process.exit(2); }
let pw = "";
for await (const chunk of process.stdin) pw += chunk;
pw = pw.replace(/\r?\n$/, "");
const k = await deriveArkAccount(username, pw);
pw = "";
const user_sig = await signBytes(k.signKey, sessionMessage(k.vault_id, nonce));
console.log(JSON.stringify({ slug: "ark", op: "account_session", payload: { vault_pub: k.pub, nonce, user_sig } }));
