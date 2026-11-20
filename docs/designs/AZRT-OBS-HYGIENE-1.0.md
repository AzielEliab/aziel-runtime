# AZRT-OBS-HYGIENE-1.0 — run snapshot, schema disposition, and log hygiene

Author: Aziel Eliab only. Status: additive. Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool.

Sources: Nov 6–19 notes from @reveratrol, @DFIR_Radar, @MarkZofMarkZ, @itaiwins, @sunilmehta_si, and @dipankaronfire.

This layer sits on the session receipt, the FragGate door (`guardToolCall`), ChainLock append, and the log writers. `tools/list` stays 36. Softwares stay 42. Remain-OFF stays untouched. No signing key is minted. Cap-7 is not ICANN. Paid satellite stays HELD.

1. **Capability snapshot** (`AZRT-CAPABILITY-SNAPSHOT-1.0`). Session open seals a dated hash of the active MCP tools (name + input-schema hash), the runtime skill, policy-granted software skills, and the session's granted scopes. Later `verifyChainStrict` recomputes that hash. A mismatch is `CAPABILITY-SNAPSHOT-TAMPER`. Receipts sealed before this field stay valid.

2. **Credential baselines** (`AZRT-CREDENTIAL-BASELINE-1.0`). An identity is stored as a hash. The baseline is the sorted set of credential classes or scopes that identity has already touched (`password`, `api_key`, `token`, `scope:…`). The first touch establishes the set. A later class outside the set seals `credential_anomaly` with `finding_hash`. The raw secret is not copied. The baseline is not widened by the anomaly.

3. **Schema disposition** (`AZRT-SCHEMA-DISPOSITION-1.0`). Tool arguments and tool output are checked against the published schema. Types are not coerced. A caller-fixable input failure returns `SCHEMA-INPUT-RETRY` (`disposition: "retry"`, nothing runs). A missing schema, or an output value that breaks a declared type, enum, const, or pattern, returns `SCHEMA-INPUT-ABORT` or `SCHEMA-OUTPUT-ABORT` (`disposition: "abort"`). Documented door alternates (`f` for `fact`, `q` without slug on `runtime_run`, `job_id` or `name/op` for `fraggate_call`) still satisfy `required`. They are not coercion.

4. **Untrusted tool results** (`AZRT-UNTRUSTED-RESULT-1.0`). A tool result is marked `trust: "UNTRUSTED"` with `sha256`, `bytes`, and `source_boundary`. `policy` and `operator` are false. Any `result_taint` on the tool output is stripped before that hash and replaced with the runtime stamp. A tool cannot set `trust`, `policy`, or `operator`. Session exec receipts carry the same mark when the response digest is 64 hex.

5. **No gated data in logs or receipts** (`AZRT-OBS-HYGIENE-1.0`). Secret-named fields, PII-flagged objects, and secret-shaped tokens are replaced with `[REDACTED:<class>:<hash16>]` before a session receipt, a ChainLock stamp, a capped log line, or `console.log` / `console.error` / `console.warn`. If a raw secret still matches after that pass, the value is `[REDACTED:closed]` (`LOG-LEAK-CLOSED`). A `BigInt`, and a property whose getter throws, becomes `[REDACTED:closed]`. The exception text is not written. `cappedLogger` uses the same closed marker and does not throw.

6. **Explicit tool errors** (`AZRT-TOOL-ERROR-1.0`). A thrown engine, an `error` string without a code, or an `ok: false` body without a code gets `TOOL-THROWN` or `TOOL-FAILED` plus `tool_error`. The shape is `ok: false`, a stable `code`, and a redacted `reason`. Empty success is not used for that failure.

Code: `src/run-observability.js`. Check: `node scripts/verify-obs-hygiene.mjs`.
