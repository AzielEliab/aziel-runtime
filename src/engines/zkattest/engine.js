/**
 * ZKAttest — hash-commitment attest without returning the private witness.
 *
 * REAL: SHA-256 commitment of { salt, witness }. Public attest binds a
 * statement to that commitment. Opening checks the commitment (reveals
 * the witness to the caller who supplied it).
 * THIS IS NOT: Groth16, SNARK, STARK, PLONK, Bulletproofs, pairings,
 * a trusted setup, or a zero-knowledge proof system.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "zkattest";
export const NAME = "ZKAttest";
export const VERSION = "0.1.0";
export const ENGINE_VERSION = VERSION;
export const SPEC = "ZK-ATTEST-0.1";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Commit without publishing the witness. Opening is not a ZK proof.";
export const ROLE = "hash-commitment attest (not a SNARK)";
export const SCHEMA = "zkattest.receipt.v0.1";
export const PRODUCT_GITHUB = "https://github.com/AzielEliab/aziel-runtime";
export const MAX_FIELD_CHARS = 64 * 1024;

export const AXES = Object.freeze(["statement", "commitment", "opening"]);
export const NEIGHBORS = Object.freeze(["forgereceipts", "temporallock"]);
export const VERDICTS = Object.freeze(["COMMITTED", "BOUND", "OPEN", "MISMATCH", "REFUSE"]);

export const STUB_REFUSE = Object.freeze([
  "groth16",
  "snark",
  "stark",
  "plonk",
  "bulletproofs",
  "pairing",
  "trusted_setup",
  "prove",
  "full_zk",
  "zk_snark",
  "reveal_witness",
]);

export const LIMITATION =
  "THIS IS: a hash-commitment attest helper (ZK-ATTEST-0.1). commit hides the witness in a SHA-256 commitment; attest binds a public statement to that commitment without returning the witness. open checks an opening the caller already holds (not zero-knowledge). THIS IS NOT: Groth16 / SNARK / STARK / PLONK / Bulletproofs, a pairing curve, a trusted setup, or a live cryptographic ZK proving system. Honesty: REAL hash commitment; SLOT for full ZK. FragGate only. Author: Aziel Eliab only.";

export const LIVE_OPS = Object.freeze([
  "health",
  "skill",
  "doctor",
  "commit",
  "attest",
  "open",
  "verify",
  "limitation",
]);

function asStr(value) {
  if (value == null) return "";
  return String(value);
}

function checkField(name, value) {
  const text = value == null ? "" : String(value);
  if (text.length > MAX_FIELD_CHARS) {
    const err = new Error(name + " exceeds size limit (" + text.length + " > " + MAX_FIELD_CHARS + " characters)");
    err.code = "SIZE_LIMIT";
    err.status = 400;
    throw err;
  }
  return text;
}

async function sha256Hex(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalizeCommit(salt, witness) {
  return JSON.stringify({ salt: String(salt), witness: String(witness) });
}

export async function commitmentOf(salt, witness) {
  return sha256Hex(canonicalizeCommit(salt, witness));
}

function honesty() {
  return {
    honesty: "REAL",
    kind: "hash-commitment",
    zk_system: false,
    snark: false,
    groth16: false,
    witness_returned: false,
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

export async function commit(payload) {
  const witness = checkField("witness", payload && payload.witness);
  if (!witness) {
    return { ok: false, error: "witness is required", status: 400, ...honesty() };
  }
  const salt = checkField("salt", payload && payload.salt) || randomSalt();
  const commitment = await commitmentOf(salt, witness);
  return {
    ok: true,
    op: "commit",
    schema: SCHEMA,
    product: PRODUCT,
    spec: SPEC,
    version: VERSION,
    commitment,
    salt,
    algorithm: "sha256(json({salt,witness}))",
    note: "Witness is not returned. Salt is returned to the committer so they can open later. This is not a SNARK.",
    ...honesty(),
  };
}

export async function attest(payload) {
  const statement = checkField("statement", payload && payload.statement);
  const commitment = checkField("commitment", payload && payload.commitment).toLowerCase();
  if (!statement) {
    return { ok: false, error: "statement is required", status: 400, ...honesty() };
  }
  if (!/^[a-f0-9]{64}$/.test(commitment)) {
    return { ok: false, error: "commitment must be 64-hex SHA-256", status: 400, ...honesty() };
  }
  if (payload && payload.witness != null && String(payload.witness) !== "") {
    return {
      ok: false,
      error: "attest refuses a posted witness — use commit then attest(commitment, statement)",
      status: 400,
      code: "WITNESS-NOT-ON-ATTEST",
      ...honesty(),
    };
  }
  const statement_hash = await sha256Hex(statement);
  const publicBody = {
    schema: SCHEMA,
    product: PRODUCT,
    spec: SPEC,
    statement,
    statement_hash,
    commitment,
    kind: "hash-commitment-attest",
    zk_system: false,
    author: AUTHOR,
  };
  const receipt_hash = await sha256Hex(JSON.stringify(publicBody));
  return {
    ok: true,
    op: "attest",
    verdict: "BOUND",
    receipt: { ...publicBody, receipt_hash },
    note: "Public receipt binds statement to commitment. Witness is not in this receipt.",
    ...honesty(),
  };
}

export async function openCommitment(payload) {
  const commitment = checkField("commitment", payload && payload.commitment).toLowerCase();
  const salt = checkField("salt", payload && payload.salt);
  const witness = checkField("witness", payload && payload.witness);
  if (!/^[a-f0-9]{64}$/.test(commitment) || !salt || !witness) {
    return { ok: false, error: "open requires commitment, salt, and witness", status: 400, ...honesty() };
  }
  const expected = await commitmentOf(salt, witness);
  const match = expected === commitment;
  return {
    ok: true,
    op: "open",
    verdict: match ? "OPEN" : "MISMATCH",
    match,
    commitment,
    expected,
    honesty: "REAL",
    kind: "commitment-opening",
    zk_system: false,
    zero_knowledge: false,
    note: "Opening reveals the witness to the caller who supplied it. This is not a ZK proof.",
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

export async function verifyReceipt(payload) {
  const receipt = payload && payload.receipt && typeof payload.receipt === "object" ? payload.receipt : payload;
  if (!receipt || typeof receipt !== "object") {
    return { ok: false, error: "receipt object required", status: 400, ...honesty() };
  }
  const { receipt_hash, ...publicBody } = receipt;
  const expected = await sha256Hex(JSON.stringify(publicBody));
  const posted = asStr(receipt_hash).toLowerCase();
  const match = posted === expected;
  return {
    ok: true,
    op: "verify",
    match,
    expected,
    posted,
    verdict: match ? "BOUND" : "MISMATCH",
    note: "Recomputes the public receipt hash. Does not recover a witness.",
    ...honesty(),
  };
}

export function limitationCite() {
  return {
    ok: true,
    op: "limitation",
    product: PRODUCT,
    spec: SPEC,
    limitation: LIMITATION,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
    honesty_labels: {
      commit: "REAL",
      attest: "REAL",
      open: "REAL-not-ZK",
      groth16: "SLOT",
      full_zk: "SLOT",
    },
    out_of_scope: STUB_REFUSE.slice(),
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}
