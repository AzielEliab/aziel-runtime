/** AUTO-UPDATE-1.0 manifest verify: fail-closed codes + JS/Python parity. Test keys are generated per run, never a release key. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { verifyManifest, verifyArtifact, manifestHash, RELEASE_PUBLIC_KEY, RELEASE_KEY_FINGERPRINT, UPDATE_CODES as C } from "../src/auto-update/manifest.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const b64u = (b) => Buffer.from(b).toString("base64url");
const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
const other = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const sign = async (m, k = kp) => b64u(await crypto.subtle.sign({ name: "Ed25519" }, k.privateKey, new TextEncoder().encode(canonicalize(m))));
const bytes = new TextEncoder().encode("build-bytes-é");
const m = { spec: "AZ-UPDATE-MANIFEST-1.0", product: "aziel-runtime", version: "2.0.0-rc2", version_seq: 7, git_sha: "a".repeat(40), channel: "stable",
  artifact: { name: "aziel-runtime.tgz", size: bytes.length, sha256: await sha256Hex(bytes) }, issued_at: "2026-10-22T12:00:00Z — ✓", prev_manifest_hash: null };
const st = { product: "aziel-runtime", installed_seq: 6, floor_seq: 6 };
const sig = await sign(m);

const PINNED = "_3mc9CfQWexUWcyqDadNoQLjb6fFFPRv_XfWirwuH9s";
ok(RELEASE_PUBLIC_KEY === PINNED, "pinned release key changed");
ok(Buffer.from(PINNED, "base64url").length === 32, "pinned key is 32 raw bytes");
ok(RELEASE_KEY_FINGERPRINT === await sha256Hex(new Uint8Array(Buffer.from(PINNED, "base64url"))), "fingerprint = sha256(raw key)");
ok((await crypto.subtle.importKey("raw", Buffer.from(PINNED, "base64url"), { name: "Ed25519" }, false, ["verify"])).type === "public", "pinned key imports");
const cases = [
  ["nokey", m, sig, st, null, C.noKey],
  ["ok", m, sig, st, pub, C.ok],
  ["shape", { ...m, extra: 1 }, sig, st, pub, C.shape],
  ["product", m, sig, { ...st, product: "azos" }, pub, C.product],
  ["tamper", { ...m, artifact: { ...m.artifact, sha256: "b".repeat(64) } }, sig, st, pub, C.sig],
  ["wrongkey", m, await sign(m, other), st, pub, C.sig],
  ["same", m, sig, { ...st, installed_seq: 7 }, pub, C.downgrade],
  ["floor", m, sig, { ...st, installed_seq: 1, floor_seq: 9 }, pub, C.downgrade],
  ["nosig", m, undefined, st, pub, C.sig],
  ["seq-2^32-wrap", { ...m, version_seq: 2 }, await sign({ ...m, version_seq: 2 }), { ...st, installed_seq: 2 ** 32 + 5, floor_seq: 2 ** 32 + 5 }, pub, C.downgrade],
  ["seq-float", m, sig, { ...st, installed_seq: 6.5 }, pub, C.state],
  ["seq-negative", m, sig, { ...st, floor_seq: -1 }, pub, C.state],
  ["seq-string", m, sig, { ...st, installed_seq: "6" }, pub, C.state],
  ["seq-unsafe", m, sig, { ...st, floor_seq: 2 ** 53 }, pub, C.state],
  ["name-traversal", { ...m, artifact: { ...m.artifact, name: "../../etc/x" } }, sig, st, pub, C.shape],
  ["name-slash", { ...m, artifact: { ...m.artifact, name: "a/b.tgz" } }, sig, st, pub, C.shape],
  ["name-dotdot", { ...m, artifact: { ...m.artifact, name: "a..tgz" } }, sig, st, pub, C.shape],
  ["name-leading-dot", { ...m, artifact: { ...m.artifact, name: ".bashrc" } }, sig, st, pub, C.shape],
  ["name-backslash", { ...m, artifact: { ...m.artifact, name: "a\\b" } }, sig, st, pub, C.shape],
  ["name-trailing-dot", { ...m, artifact: { ...m.artifact, name: "a.tgz." } }, sig, st, pub, C.shape],
  ...["CON", "prn.tgz", "Aux", "NUL.img", "com1", "COM9.tar.gz", "lpt1", "LPT9.x"].map((nm) => ["win-" + nm, { ...m, artifact: { ...m.artifact, name: nm } }, sig, st, pub, C.shape]),
  ["com0-ok-name-but-sig", { ...m, artifact: { ...m.artifact, name: "com0.tgz" } }, sig, st, pub, C.sig],
  ["seqs-missing", m, sig, { product: "aziel-runtime" }, pub, C.state],
  ["seqs-null", m, sig, { product: "aziel-runtime", installed_seq: null, floor_seq: null }, pub, C.state],
  ["rc", { ...m, channel: "rc" }, await sign({ ...m, channel: "rc" }), st, pub, C.channel],
  ["pinned-forged", m, sig, st, PINNED, C.sig],
  ["pinned-other-build", { ...m, product: "azos" }, await sign({ ...m, product: "azos" }), { ...st, product: "azos" }, PINNED, C.noKey],
  ["pinned-other-build-rc", { ...m, product: "azos", channel: "rc" }, sig, { ...st, product: "azos" }, PINNED, C.noKey],
];
const dir = mkdtempSync(tmpdir() + "/au-");
let py = true; try { execFileSync("python3", ["-c", "import cryptography"]); } catch { py = false; }
for (const [name, man, s, state, key, want] of cases) {
  const r = await verifyManifest(man, s, state, { publicKey: key });
  ok(r.code === want, `${name}: js ${r.code} != ${want}`);
  if (py) {
    const f = `${dir}/${name}.json`; writeFileSync(f, JSON.stringify({ manifest: man, signature: s, state, public_key: key }));
    const p = JSON.parse(execFileSync("python3", ["tools/auto_update_verify.py", f]).toString());
    ok(p.code === want, `${name}: python ${p.code} != ${want}`);
    if (r.ok) ok(p.manifest_hash === r.manifest_hash && r.manifest_hash === (await manifestHash(m)), "hash parity");
  }
}
ok((await verifyManifest(m, sig, st)).code === C.sig, "default = pinned key; test-key sig refused");
// raw JSON parity: 5.0-style numbers refused in JS (strict parse) and Python (float fails shape)
const { parseManifestJson } = await import("../src/auto-update/manifest.js");
const rawOk = JSON.stringify(m), rawF = rawOk.replace('"version_seq":7', '"version_seq":7.0'), rawE = rawOk.replace('"version_seq":7', '"version_seq":7e0');
ok(rawF.includes("7.0") && rawE.includes("7e0"), "raw vectors built");
ok(parseManifestJson(rawOk) !== null && parseManifestJson('{"s":"1.5 inside a string"}') !== null, "strict parse keeps ints/strings");
for (const [nm, raw, want] of [["raw-ok", rawOk, C.ok], ["raw-5.0", rawF, C.shape], ["raw-7e0", rawE, C.shape]]) {
  const pm = parseManifestJson(raw);
  const jr = pm === null ? { code: C.shape } : await verifyManifest(pm, sig, st, { publicKey: pub });
  ok(jr.code === want, `${nm}: js ${jr.code}`);
  if (py) { const f = `${dir}/${nm}.json`; writeFileSync(f, JSON.stringify({ raw, signature: sig, state: st, public_key: pub }));
    const p = JSON.parse(execFileSync("python3", ["tools/auto_update_verify.py", f]).toString()); ok(p.code === want, `${nm}: python ${p.code}`); }
}
ok((await verifyArtifact(m, bytes)).ok, "artifact ok");
ok((await verifyArtifact(m, new Uint8Array([...bytes].reverse()))).code === C.hash, "artifact tamper");
ok((await verifyArtifact(m, bytes.slice(1))).code === C.hash, "artifact size");
console.log(`verify-auto-update-manifest: ${n} checks ok${py ? " (python parity)" : " (python crypto missing: parity skipped)"}`);
