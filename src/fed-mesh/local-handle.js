/**
 * Local mesh handle: mint, sign, and verify on this machine.
 * Same Ed25519 handle as src/fed-mesh/identity.js (generateEd25519,
 * importEd25519Seed, signObject, verifyObject, handleFromRawPublicKey).
 * The seed stays with the caller. This module does not write a file,
 * upload a key, or register a name.
 * Author: Aziel Eliab only.
 */

import { cap7Honesty, QNM_MEMBERSHIP, QNM_NAMED_LIVE, QNM_SEPARATED } from "../qnm-honesty.js";
import { b64urlToBytes, canonicalHandle, handleFromRawPublicKey, publicKeyMatchesHandle } from "./codec.js";
import { generateEd25519, importEd25519Seed, signObject, verifyObject } from "./identity.js";
import { FED_SPEC, HANDLE_RE } from "./spec.js";

/**
 * Printed on every run. The three named flags are Softwares membership
 * (QNM_NAMED_LIVE). They are not the QNS cite plane. This command does
 * not enable GET /v1/mesh, radio PHY, auto-update, RF transmit, or
 * satellite relay, and it is not a mesh-internet door.
 */
export const HANDLE_HONESTY_LINES = Object.freeze([
  "This is not a government ID.",
  "This is not Sign in with Google or Apple.",
  "This is not an OAuth network.",
  "This is not an ICANN registrar.",
  "Cap-7 names-only is not ICANN.",
  "This handle is not a mesh-internet door.",
  "Softwares membership is on: mesh_node_live, alt_internet_live, and packet_path_live are true. That is Softwares membership, not the QNS cite plane.",
  "GET /v1/mesh never enables.",
]);

export const STATEMENT_TEXT_MAX = 512;

/** Existing everblooming sigil. Same bytes as godlock.uk/sigil.png and www.azieleliab.com/sigil.png. */
export const HANDLE_SIGIL_PATH = "public/sigil.png";
export const HANDLE_SIGIL_SHA256 = "af095e8b0916a7262860a53619c7110f25539988806775b1c7bff8df7b0ee848";

/** Same fields on every JSON result. Values come from the membership contract. */
export function handleHonestyFields() {
  const cap7 = cap7Honesty();
  return {
    honesty: [...HANDLE_HONESTY_LINES],
    sigil: HANDLE_SIGIL_PATH,
    stored: false,
    uploaded: false,
    registered: false,
    mesh_membership: QNM_MEMBERSHIP.mesh_membership,
    mesh_node_live: QNM_NAMED_LIVE.mesh_node_live,
    alt_internet_live: QNM_NAMED_LIVE.alt_internet_live,
    packet_path_live: QNM_NAMED_LIVE.packet_path_live,
    qns_cite_plane: false,
    get_never_enables: QNM_MEMBERSHIP.get_never_enables,
    cap7_name_only: cap7.cap7_name_only === true,
    public_icann: cap7.public_icann === true,
    public_icann_registrar: cap7.public_icann_registrar === true,
    mesh_internet_door: false,
    radio_phy: QNM_SEPARATED.radio_phy === true,
    worker_hardware: QNM_SEPARATED.worker_hardware === true,
  };
}

function fail(command, message) {
  return { ok: false, command, message, spec: FED_SPEC, scheme: "Ed25519", ...handleHonestyFields() };
}

export function parseSeed(text) {
  const raw = String(text || "").trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const bytes = b64urlToBytes(raw);
  if (!bytes || bytes.length !== 32) return null;
  return bytes;
}

export function statementText(text) {
  const value = String(text ?? "");
  if (!value.trim()) return { ok: false, message: "A statement is required." };
  if (value.length > STATEMENT_TEXT_MAX) return { ok: false, message: "That statement is too long." };
  return { ok: true, text: value };
}

export function localStatement({ handle, public_key, text }) {
  return {
    v: FED_SPEC,
    kind: "statement",
    handle,
    public_key,
    text,
  };
}

async function identityFromSeed(seed) {
  const privateKey = await importEd25519Seed(seed);
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const public_key = String(jwk.x || "");
  const handle = await handleFromRawPublicKey(b64urlToBytes(public_key));
  if (!public_key || !handle) throw new Error("The signing key could not be read.");
  return { privateKey, public_key, handle };
}

export async function generateHandle() {
  const signing = await generateEd25519();
  const jwk = await crypto.subtle.exportKey("jwk", signing.privateKey);
  const seed = String(jwk.d || "");
  const seedBytes = parseSeed(seed);
  if (!seedBytes) return fail("generate", "The signing seed could not be read.");
  try {
    const again = await identityFromSeed(seedBytes);
    if (again.handle !== signing.handle || again.public_key !== signing.public_key) {
      return fail("generate", "The signing seed does not match the handle.");
    }
    return {
      ok: true,
      command: "generate",
      spec: FED_SPEC,
      scheme: "Ed25519",
      handle: signing.handle,
      public_key: signing.public_key,
      seed,
      ...handleHonestyFields(),
    };
  } finally {
    seedBytes.fill(0);
  }
}

export async function signHandleStatement(seedText, text) {
  const parsed = statementText(text);
  if (!parsed.ok) return fail("sign", parsed.message);
  const seed = parseSeed(seedText);
  if (!seed) return fail("sign", "The seed must be 32 bytes, hex or base64url.");
  try {
    const identity = await identityFromSeed(seed);
    const statement = localStatement({
      handle: identity.handle,
      public_key: identity.public_key,
      text: parsed.text,
    });
    const sig = await signObject(identity.privateKey, statement);
    return {
      ok: true,
      command: "sign",
      spec: FED_SPEC,
      scheme: "Ed25519",
      handle: identity.handle,
      public_key: identity.public_key,
      sig,
      text: parsed.text,
      statement,
      ...handleHonestyFields(),
    };
  } finally {
    seed.fill(0);
  }
}

export async function verifyHandleStatement({ handle, public_key, sig, text }) {
  const parsed = statementText(text);
  if (!parsed.ok) return fail("verify", parsed.message);
  const canonical = canonicalHandle(handle);
  if (!canonical || !HANDLE_RE.test(canonical)) return fail("verify", "That handle is not a mesh handle.");
  const key = String(public_key || "").trim();
  const signature = String(sig || "").trim();
  if (!key || !signature) return fail("verify", "Verify needs a public key and a signature.");
  const matches = await publicKeyMatchesHandle(key, canonical);
  if (!matches) {
    return {
      ...fail("verify", "Verification failed. The public key does not match this handle."),
      handle: canonical,
      public_key: key,
      text: parsed.text,
    };
  }
  const statement = localStatement({ handle: canonical, public_key: key, text: parsed.text });
  let good = false;
  try {
    good = await verifyObject(key, statement, signature);
  } catch {
    good = false;
  }
  return {
    ok: good === true,
    command: "verify",
    spec: FED_SPEC,
    scheme: "Ed25519",
    handle: canonical,
    public_key: key,
    text: parsed.text,
    message: good
      ? "Signature verified for this handle."
      : "Verification failed. The signature does not match this statement.",
    ...handleHonestyFields(),
  };
}
