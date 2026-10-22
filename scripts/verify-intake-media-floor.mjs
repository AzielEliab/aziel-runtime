/**
 * CORPUS-INTAKE-SAFETY-1.0 media floor on the runtime side: AZNews `news_ingest` /
 * `news_pin` never keep image bytes. Supplied or fetched bytes are hashed and dropped;
 * the receipt keeps the content hash plus the fetch URL. Synthetic header bytes only.
 * Counts and version are untouched (36 tools / 42 Softwares / 2.0.0-rc1).
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { captureImage } from "../src/engines/4dmap/aznews-source.js";

const MARK = "__AZ_SYNTHETIC_MEDIA_MARKER__";
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from("IHDR"), Buffer.from(MARK)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from("JFIF\0"), Buffer.from(MARK), Buffer.from([0xff, 0xd9])]);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const URL = "https://example.invalid/synthetic.png";
const noMark = (v) => assert.equal(JSON.stringify(v).includes(MARK) || JSON.stringify(v).includes(Buffer.from(MARK).toString("base64").slice(0, 16)), false);

// supplied as b64, base64 and raw bytes: hashed, never kept (old code kept b64 when <= 4096 bytes)
for (const entry of [{ b64: png.toString("base64"), url: URL }, { base64: jpeg.toString("base64") }, { bytes: new Uint8Array(png), sha256: sha(png) }]) {
  const out = await captureImage(entry, null);
  const row = out.images[0];
  assert.equal(row.b64, null, "image bytes must not be kept");
  assert.equal(row.bytes_stored, false);
  assert.equal(row.media_floor, true);
  assert.equal(row.verified, true);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.dropped, false, "the reference (hash + URL) is kept");
  assert.equal(Object.values(row).some((v) => v instanceof Uint8Array), false);
  noMark(out);
}
assert.equal((await captureImage({ b64: png.toString("base64") }, null)).images[0].sha256, sha(png));
assert.equal((await captureImage({ b64: png.toString("base64") }, null)).images[0].byte_length, png.length);

// fetched bytes: hashed and dropped too
const fetchImpl = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array(jpeg).buffer });
const fetched = await captureImage(URL, fetchImpl);
assert.equal(fetched.images[0].fetched, true);
assert.equal(fetched.images[0].b64, null);
assert.equal(fetched.images[0].bytes_stored, false);
assert.equal(fetched.images[0].sha256, sha(jpeg));
noMark(fetched);

// hash mismatch still refuses, and the hash-only path is unchanged
await assert.rejects(() => captureImage({ b64: png.toString("base64"), sha256: "0".repeat(64) }, null), (e) => e.code === "AZNEWS-IMAGE-MISMATCH");
const hashOnly = await captureImage({ sha256: sha(png), url: URL, fetch: false }, null);
assert.deepEqual([hashOnly.images[0].sha256, hashOnly.images[0].b64, hashOnly.images[0].bytes_stored], [sha(png), null, false]);

console.log("verify-intake-media-floor: ok");
