/** AUTO-UPDATE-1.0 manifest verify: fail-closed codes + JS/Python parity. Test keys are generated per run, never a release key. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { verifyManifest, verifyArtifact, manifestHash, RELEASE_PUBLIC_KEY, UPDATE_CODES as C } from "../src/auto-update/manifest.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const b64u = (b) => Buffer.from(b).toString("base64url");
const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
const other = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const sign = async (m, k = kp) => b64u(await crypto.subtle.sign({ name: "Ed25519" }, k.privateKey, new TextEncoder().encode(canonicalize(m))));
const bytes = new TextEncoder().encode("build-bytes-é");
const m = { spec: "AZ-UPDATE-MANIFEST-1.0", product: "aziel-runtime", version: "2.0.0-rc2", version_seq: 7, git_sha: "a".repeat(40), channel: "rc",
  artifact: { name: "aziel-runtime.tgz", size: bytes.length, sha256: await sha256Hex(bytes) }, issued_at: "2026-10-22T12:00:00Z — ✓", prev_manifest_hash: null };
const st = { product: "aziel-runtime", installed_seq: 6, floor_seq: 6 };
const sig = await sign(m);

ok(RELEASE_PUBLIC_KEY === null, "release key slot must stay a refusing placeholder");
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
ok((await verifyArtifact(m, bytes)).ok, "artifact ok");
ok((await verifyArtifact(m, new Uint8Array([...bytes].reverse()))).code === C.hash, "artifact tamper");
ok((await verifyArtifact(m, bytes.slice(1))).code === C.hash, "artifact size");
console.log(`verify-auto-update-manifest: ${n} checks ok${py ? " (python parity)" : " (python crypto missing: parity skipped)"}`);
