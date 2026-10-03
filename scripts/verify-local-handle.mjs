/**
 * Local `aziel-runtime handle`: mint, sign, verify.
 * Reuses the FED-MESH Ed25519 handle. The seed stays in this process.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import {
  HANDLE_HONESTY_LINES,
  generateHandle,
  signHandleStatement,
  verifyHandleStatement,
} from "../src/fed-mesh/local-handle.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const VECTOR_SEED = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";
const VECTOR_HANDLE = "#CPV0CWYPXP4";
const VECTOR_PUBLIC = "ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ";

assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PUBLIC_MCP_TOOLS.includes("handle"), false);
const guide = await readFile(new URL("../src/guide-reason.js", import.meta.url), "utf8");
assert.match(guide, /SUITE_SOFTWARE_COUNT = 42/);

const localSrc = await readFile(new URL("../src/fed-mesh/local-handle.js", import.meta.url), "utf8");
const cliSrc = await readFile(new URL("../cli/aziel-runtime.mjs", import.meta.url), "utf8");
for (const src of [localSrc, cliSrc]) {
  assert.equal(src.includes("alt_internet_live: true"), false);
  assert.equal(src.includes("public_icann_registrar: true"), false);
}

const paper = await readFile(new URL("../docs/designs/FED-MESH-1.0.md", import.meta.url), "utf8");
assert.match(paper, /aziel-runtime handle/);
assert.match(paper, /handle generate/);
for (const line of HANDLE_HONESTY_LINES) assert.ok(paper.includes(line), line);

const vector = await signHandleStatement(VECTOR_SEED, "vector");
assert.equal(vector.ok, true);
assert.equal(vector.handle, VECTOR_HANDLE);
assert.equal(vector.public_key, VECTOR_PUBLIC);
assert.equal(vector.uploaded, false);
assert.equal(vector.registered, false);
assert.equal(vector.stored, false);
assert.equal(vector.alt_internet_live, false);
assert.equal(vector.public_icann_registrar, false);
const vectorOk = await verifyHandleStatement({
  handle: vector.handle,
  public_key: vector.public_key,
  sig: vector.sig,
  text: "vector",
});
assert.equal(vectorOk.ok, true);
const vectorBad = await verifyHandleStatement({
  handle: vector.handle,
  public_key: vector.public_key,
  sig: vector.sig,
  text: "vector-no",
});
assert.equal(vectorBad.ok, false);

const work = await mkdtemp(join(tmpdir(), "aziel-handle-work-"));
const home = await mkdtemp(join(tmpdir(), "aziel-handle-home-"));
const keys = await mkdtemp(join(tmpdir(), "aziel-handle-keys-"));

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, "cli/aziel-runtime.mjs"), ...args], {
      cwd: work,
      env: {
        ...process.env,
        AZIEL_RUNTIME_URL: "http://127.0.0.1:9",
        AZIEL_RUNTIME_HOME: home,
      },
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: 124, out, err: `${err}\ntimeout` });
    }, 15000);
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
}

function assertHonesty(text) {
  const block = `${HANDLE_HONESTY_LINES.join("\n")}\n\n`;
  assert.equal(text.startsWith(block), true);
}

function parseResult(text) {
  assertHonesty(text);
  const rest = text.slice(`${HANDLE_HONESTY_LINES.join("\n")}\n\n`.length);
  return JSON.parse(rest);
}

try {
  const help = await runCli(["handle", "--help"]);
  assert.equal(help.code, 0);
  assertHonesty(help.out);
  assert.match(help.out, /generate/);
  assert.match(help.out, /sign --seed/);
  assert.match(help.out, /verify --handle/);

  const bare = await runCli(["handle"]);
  assert.equal(bare.code, 0);
  assertHonesty(bare.out);

  const human = await runCli(["handle", "generate"]);
  assert.equal(human.code, 0);
  assertHonesty(human.out);
  assert.match(human.out, /Minted a mesh handle on this machine/);
  assert.match(human.out, /#[0-9A-HJKMNP-TV-Z]{11}/);
  assert.match(human.out, /Key file: none/);

  const mintedAlias = await runCli(["--json", "handle", "mint"]);
  assert.equal(mintedAlias.code, 0, mintedAlias.err);
  const mintedAliasBody = parseResult(mintedAlias.out);
  assert.equal(mintedAliasBody.command, "generate");
  assert.match(mintedAliasBody.handle, /^#[0-9A-HJKMNP-TV-Z]{11}$/);

  const generated = await runCli(["--json", "handle", "generate"]);
  assert.equal(generated.code, 0, generated.err);
  const minted = parseResult(generated.out);
  assert.equal(minted.ok, true);
  assert.equal(minted.command, "generate");
  assert.equal(minted.scheme, "Ed25519");
  assert.match(minted.handle, /^#[0-9A-HJKMNP-TV-Z]{11}$/);
  assert.equal(minted.stored, false);
  assert.equal(minted.uploaded, false);
  assert.equal(minted.registered, false);
  assert.equal(minted.alt_internet_live, false);
  assert.equal(minted.public_icann_registrar, false);
  assert.deepEqual(minted.honesty, [...HANDLE_HONESTY_LINES]);
  assert.equal(typeof minted.seed, "string");
  assert.equal(minted.seed.length > 0, true);

  const signedRun = await runCli([
    "--json",
    "handle",
    "sign",
    "--seed",
    minted.seed,
    "--text",
    "local note",
  ]);
  assert.equal(signedRun.code, 0, signedRun.err);
  const signed = parseResult(signedRun.out);
  assert.equal(signed.ok, true);
  assert.equal(signed.handle, minted.handle);
  assert.equal(signed.public_key, minted.public_key);
  assert.equal(signed.text, "local note");
  assert.equal(signed.stored, false);
  assert.equal(signed.uploaded, false);
  assert.equal(signed.registered, false);
  assert.equal(Object.hasOwn(signed, "seed"), false);

  const verifiedRun = await runCli([
    "--json",
    "handle",
    "verify",
    "--handle",
    signed.handle,
    "--public-key",
    signed.public_key,
    "--sig",
    signed.sig,
    "--text",
    "local note",
  ]);
  assert.equal(verifiedRun.code, 0, verifiedRun.err);
  const verified = parseResult(verifiedRun.out);
  assert.equal(verified.ok, true);
  assert.equal(verified.handle, minted.handle);
  assert.match(verified.message, /Signature verified for this handle/);

  const mismatch = await runCli([
    "--json",
    "handle",
    "verify",
    "--handle",
    signed.handle,
    "--public-key",
    signed.public_key,
    "--sig",
    signed.sig,
    "--text",
    "other note",
  ]);
  assert.equal(mismatch.code, 1);
  const mismatchBody = parseResult(mismatch.out);
  assert.equal(mismatchBody.ok, false);
  assert.match(mismatchBody.message, /Verification failed/);

  const other = await generateHandle();
  assert.equal(other.ok, true);
  assert.notEqual(other.handle, minted.handle);
  const wrongHandle = await runCli([
    "--json",
    "handle",
    "verify",
    "--handle",
    other.handle,
    "--public-key",
    signed.public_key,
    "--sig",
    signed.sig,
    "--text",
    "local note",
  ]);
  assert.equal(wrongHandle.code, 1);
  const wrongBody = parseResult(wrongHandle.out);
  assert.equal(wrongBody.ok, false);

  const wrongKey = await runCli([
    "--json",
    "handle",
    "verify",
    "--handle",
    other.handle,
    "--public-key",
    other.public_key,
    "--sig",
    signed.sig,
    "--text",
    "local note",
  ]);
  assert.equal(wrongKey.code, 1);
  assert.equal(parseResult(wrongKey.out).ok, false);

  await writeFile(join(keys, "seed"), `${minted.seed}\n`, { mode: 0o600 });
  const fromFile = await runCli([
    "--json",
    "handle",
    "sign",
    "--seed-file",
    join(keys, "seed"),
    "--text",
    "from file",
  ]);
  assert.equal(fromFile.code, 0, fromFile.err);
  const filed = parseResult(fromFile.out);
  assert.equal(filed.handle, minted.handle);
  const filedOk = await verifyHandleStatement({
    handle: filed.handle,
    public_key: filed.public_key,
    sig: filed.sig,
    text: "from file",
  });
  assert.equal(filedOk.ok, true);

  const cliVector = await runCli([
    "--json",
    "handle",
    "sign",
    "--seed",
    VECTOR_SEED,
    "--text",
    "vector",
  ]);
  assert.equal(cliVector.code, 0, cliVector.err);
  const cliVectorBody = parseResult(cliVector.out);
  assert.equal(cliVectorBody.handle, VECTOR_HANDLE);
  assert.equal(cliVectorBody.public_key, VECTOR_PUBLIC);

  const unknown = await runCli(["handle", "publish"]);
  assert.equal(unknown.code, 1);
  assertHonesty(unknown.out);
  assert.match(unknown.out, /Unknown handle command/);

  assert.deepEqual(await readdir(work), []);
  assert.deepEqual(await readdir(home), []);
} finally {
  await rm(work, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
  await rm(keys, { recursive: true, force: true });
}

console.log("ok local handle: generate, sign, verify, mismatch fails, honesty lines present");
