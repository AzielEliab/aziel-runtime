/**
 * FoldLock Aziel Corpus Library tip + About Aziel honesty.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, classifyCall, buildRegistry } from "../src/fraggate/registry.js";
import { engineOps } from "../src/engines/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { embeddedDigest } from "../src/engines/digest.js";
import {
  ABOUT_AZIEL,
  HASH_MISMATCH_CODE,
  PERSON_ID,
  TIP_PACK_ID,
  TIP_PACK_SPEC,
  aboutAzielCiteField,
  corpusFoldPackCiteField,
  tipPackDocument,
  tipPackReady,
  verifyTipPack,
} from "../src/engines/aziel-corpus/tip-pack.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path), {});
}

const doc = tipPackDocument();
assert.equal(doc.spec, TIP_PACK_SPEC);
assert.equal(doc.id, TIP_PACK_ID);
assert.equal(doc.full_library_in_process, false);
assert.equal(doc.zip, false);
assert.equal(doc.hosted_store, false);
assert.equal(doc.labels.tip, "REAL");
assert.equal(doc.labels.live_library, "LIVE");
assert.equal(doc.labels.in_process_d1, "SLOT");
assert.equal(doc.person_id, PERSON_ID);
assert.equal(doc.identity, "Aziel Eliab");
assert.ok(doc.key_artifacts.length >= 3);
assert.ok(doc.about_aziel.mission[0].includes("understand the work"));
assert.doesNotMatch(JSON.stringify(doc), /15:20|1 Chronicles|Chronicles 15/i);
assert.doesNotMatch(JSON.stringify(doc), /legal name|home address|county/i);
assert.match(JSON.stringify(doc.about_aziel), /GodLock is a product/);

const ready = await tipPackReady();
assert.match(ready.sha256, /^[a-f0-9]{64}$/);
assert.equal(ready.fold.zip, false);
assert.ok(ready.orig_size > 0);
assert.ok(ready.b64.length > 0);

const ok = await verifyTipPack({});
assert.equal(ok.ok, true);
assert.equal(ok.verified, true);
assert.equal(ok.sha256, ready.sha256);
assert.equal(ok.full_library_in_process, false);

const mismatch = await verifyTipPack({ sha256: "0".repeat(64) });
assert.equal(mismatch.ok, false);
assert.equal(mismatch.refused, true);
assert.equal(mismatch.code, HASH_MISMATCH_CODE);
assert.equal(mismatch.expected_sha256, ready.sha256);

const badFold = await verifyTipPack({ b64: btoa("not-a-foldlock-tip") });
assert.equal(badFold.ok, false);
assert.equal(badFold.refused, true);
assert.match(String(badFold.code), /AZCL-PACK-(HASH-MISMATCH|UNFOLD-REFUSE)/);

const foldExec = JSON.parse(
  (
    await executeLocal({
      slug: "foldlock",
      op: "pack-verify",
      payload: {},
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(foldExec.ok, true);
assert.equal(foldExec.verified, true);
assert.equal(foldExec.sha256, ready.sha256);
assert.equal(foldExec.zip, false);
assert.equal(foldExec.hosted_store, false);

const foldRefuse = JSON.parse(
  (
    await executeLocal({
      slug: "foldlock",
      op: "pack-verify",
      payload: { sha256: "a".repeat(64) },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(foldRefuse.ok, false);
assert.equal(foldRefuse.code, HASH_MISMATCH_CODE);

const opened = JSON.parse(
  (
    await executeLocal({
      slug: "aziel-corpus",
      op: "tip-pack",
      payload: {},
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(opened.ok, true);
assert.equal(opened.op, "tip-pack");
assert.equal(opened.pack.full_library_in_process, false);
assert.equal(opened.pack.about_aziel.identity, "Aziel Eliab");
assert.ok(opened.b64);

const openRefuse = JSON.parse(
  (
    await executeLocal({
      slug: "aziel-corpus",
      op: "tip-pack",
      payload: { sha256: "b".repeat(64) },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(openRefuse.ok, false);
assert.equal(openRefuse.code, HASH_MISMATCH_CODE);

assert.ok(LIVE_OPS.foldlock.includes("pack-verify"));
assert.ok(LIVE_OPS["aziel-corpus"].includes("tip-pack"));
assert.ok(engineOps("foldlock").includes("pack-verify"));
assert.ok(engineOps("aziel-corpus").includes("tip-pack"));
assert.ok(STUB_OPS.foldlock.includes("zip"));
assert.ok(STUB_OPS.foldlock.includes("hosted_store"));
assert.ok(!LIVE_OPS.foldlock.includes("hosted_store"));

const foldProd = PRODUCTS.find((p) => p.slug === "foldlock");
const corpusProd = PRODUCTS.find((p) => p.slug === "aziel-corpus");
assert.ok(foldProd.ops.some((o) => o.op === "pack-verify"));
assert.ok(corpusProd.ops.some((o) => o.op === "tip-pack"));

const registry = buildRegistry(PRODUCTS);
assert.equal(classifyCall(registry.bySlug.foldlock, "pack-verify").kind, "live");
assert.equal(classifyCall(registry.bySlug["aziel-corpus"], "tip-pack").kind, "live");
assert.equal(classifyCall(registry.bySlug.foldlock, "hosted_store").kind, "stub");
assert.equal(classifyCall(registry.bySlug.foldlock, "zip").kind, "stub");

const home = await (await get("/")).text();
assert.match(home, /id="about-aziel"/);
assert.match(home, /About Aziel/);
assert.match(home, /You don't get to know me|You don’t get to know me/);
assert.match(home, /id="corpus-fold-pack"/);
assert.match(home, /FoldLock corpus tip/);
assert.match(home, /full Aziel Digital Library remains/);
assert.match(home, /data-op="pack-verify"/);
assert.match(home, /data-op="tip-pack"/);
assert.match(home, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(home, /15:20|1 Chronicles/i);
assert.doesNotMatch(home, /legal name|home address/i);
assert.doesNotMatch(home, /glama\.ai\/mcp\/servers\/[0-9a-f]{8}-[0-9a-f-]{27}/i);

const about = await (await get("/about")).text();
assert.match(about, /id="about-aziel"/);
assert.match(about, /About Aziel/);
assert.match(about, /id="corpus-fold-pack"/);
assert.match(about, /pack-verify/);
assert.doesNotMatch(about, /15:20|1 Chronicles/i);

const foldPage = await (await get("/p/foldlock")).text();
assert.match(foldPage, /id="about-aziel"/);
assert.match(foldPage, /id="corpus-fold-pack"/);

const corpusPage = await (await get("/p/aziel-corpus")).text();
assert.match(corpusPage, /id="about-aziel"/);
assert.match(corpusPage, /id="corpus-fold-pack"/);

const cite = await (await get("/cite.json")).json();
assert.equal(cite.about_aziel.person_id, PERSON_ID);
assert.equal(cite.about_aziel.biography, false);
assert.equal(cite.about_aziel.chrome_15_20, false);
assert.equal(cite.about_aziel.godlock_is_product, true);
assert.equal(cite.corpus_fold_pack.spec, TIP_PACK_SPEC);
assert.equal(cite.corpus_fold_pack.full_library_in_process, false);
assert.equal(cite.corpus_fold_pack.in_process_label, "REAL");
assert.equal(cite.corpus_fold_pack.live_library_label, "LIVE");
assert.match(cite.corpus_fold_pack.verify, /pack-verify/);
assert.match(cite.corpus_fold_pack.open, /tip-pack/);
assert.deepEqual(cite.about_aziel.goals, ABOUT_AZIEL.goals.slice());
assert.deepEqual(aboutAzielCiteField().sources, ABOUT_AZIEL.sources);
assert.equal(corpusFoldPackCiteField().hosted_store, false);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /About Aziel \(work, not biography\)/);
assert.match(llms, /AZCL-FOLD-TIP-1\.0/);
assert.match(llms, /pack-verify/);
assert.doesNotMatch(llms, /15:20|1 Chronicles/i);

assert.match(embeddedDigest("aziel-corpus"), /^[a-f0-9]{64}$/);

const door = await handler(
  new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "foldlock", op: "pack-verify", payload: {} }),
  }),
  {},
);
assert.equal(door.status, 200);
const doorBody = await door.json();
assert.equal(doorBody.ok, true, JSON.stringify(doorBody));
assert.equal(doorBody.code, "FG-OK");
assert.equal(doorBody.result.ok, true);
assert.equal(doorBody.result.verified, true);
assert.equal(doorBody.result.sha256, ready.sha256);
assert.equal(doorBody.result.full_library_in_process, false);

console.log(`ok corpus fold pack ${ready.sha256} + About Aziel`);
