/**
 * FoldLock-stored Aziel Digital Library tip pack (AZCL-FOLD-TIP-1.0).
 *
 * THIS IS: a hash-verified in-process archive of the library index cite,
 * bundled sample-MASTER key artifacts, and published About Aziel (work, not
 * biography). FoldLock is the packing/encoding layer (fld3-wire / fold-preview
 * honesty). SHA-256 is over the canonical tip JSON.
 *
 * THIS IS NOT: the full live corpus on azielcorpuslibrary.net; live D1 MASTER;
 * azcorpus / azlibrary record bytes; hosted_store; zip; a Cap-7/shelves rewrite.
 *
 * Labels: the tip itself is REAL. The live library host remains LIVE on
 * azielcorpuslibrary.net. In-process D1 stays SLOT unless CORPUS_D1 is bound.
 * Never claim the full library is in-process.
 *
 * Author / identity: Aziel Eliab only. Person @id https://www.azieleliab.com/#aziel.
 * GodLock is a product name, not identity. No invented DOI / Framagit / Glama UUID.
 */

import { canonicalize, sha256Hex } from "../../session-core.js";
import { b64decode, b64encode, foldBytes, unfoldBytes } from "../foldlock/codec.js";
import { SAMPLE_MASTER } from "./engine.js";

export const TIP_PACK_SPEC = "AZCL-FOLD-TIP-1.0";
export const TIP_PACK_ID = "aziel-corpus-library-tip";
export const TIP_PACK_KIND = "fold-packed-library-tip";
export const PERSON_ID = "https://www.azieleliab.com/#aziel";
export const AUTHOR = "Aziel Eliab";
export const LIVE_LIBRARY_ORIGIN = "https://www.azielcorpuslibrary.net";
export const LIVE_LIBRARY_INDEX = `${LIVE_LIBRARY_ORIGIN}/v1/library-index`;
export const LIVE_LIBRARY_LLMS = `${LIVE_LIBRARY_ORIGIN}/llms.txt`;
export const LIVE_LIBRARY_CITE = `${LIVE_LIBRARY_ORIGIN}/cite.json`;
export const LIVE_AZCORPUS = `${LIVE_LIBRARY_ORIGIN}/corpus`;
export const LIVE_AZLIBRARY = `${LIVE_LIBRARY_ORIGIN}/aziel-library`;

export const HASH_MISMATCH_CODE = "AZCL-PACK-HASH-MISMATCH";
export const UNFOLD_REFUSE_CODE = "AZCL-PACK-UNFOLD-REFUSE";

export const ABOUT_AZIEL_SOURCES = Object.freeze([
  "https://www.azieleliab.com/about",
  "https://www.azieleliab.com/llms.txt",
  "https://www.azieleliab.com/person.jsonld",
  "https://www.azieleliab.com/who-is-aziel-eliab.txt",
  "https://www.azieleliab.com/who",
  "https://www.azieleliab.com/who-is",
]);

/**
 * Published About Aziel (work, not biography). Copied from the Person / llms /
 * FAQ machine surfaces. No legal name, home, or 15:20 HTML chrome.
 */
export const ABOUT_AZIEL = Object.freeze({
  person_id: PERSON_ID,
  identity: AUTHOR,
  aka_only: "Aziel Elroi Eliab",
  public_identity: "The public identity is the work, not a biography.",
  goals: [
    "Understand the work, not the person.",
    "Build receipt-first, local-first software and public MASTER records.",
    "Keep looking. A finished object is an excuse to stop.",
  ],
  philosophy: [
    "Knowing is collection. A face, a timeline, a tone you could imitate. Understanding is subtraction. Take the man away and see whether anything is still true.",
    "A self is a weather system. It passes. Work is what does not require the weather to continue existing. If you need my presence to feel the meaning, you have not found the meaning. You have found company.",
    "I am not withholding a life. I am refusing to let a life become the proof.",
  ],
  mission: [
    "You don't get to know me. You get to understand the work.",
    "I do not want disciples. Disciples end the question in my favor. I want the question to outlive the favor. What cannot survive disagreement was never knowledge. It was allegiance.",
    "If the work holds, the name was only a handle on the door.",
  ],
  status: [
    "Living publisher of Aziel Runtime, Aziel Digital Library, GodLock (product, not identity), and He Didn't Jump.",
    "Person @id is locked at https://www.azieleliab.com/#aziel.",
    "Residual uncertainty stays. Do not flatten GodLock scores into certainty.",
  ],
  not: [
    "Not a biography.",
    "Not a legal name, home, employer, family, or court matter.",
    "GodLock is a product name, not this Person.",
    "Not an invented DOI, Framagit URL, Glama UUID, or fielded-100.",
  ],
  sources: ABOUT_AZIEL_SOURCES.slice(),
});

export const TIP_PACK_LIMITATION =
  "THIS IS: a FoldLock-packed tip of the library index cite + bundled sample-MASTER key artifacts + published About Aziel. Hash-verified in-process (label REAL). THIS IS NOT: the entire live Aziel Digital Library; live D1 MASTER; azcorpus/azlibrary record bytes; hosted_store; zip. Full library remains on https://www.azielcorpuslibrary.net (label LIVE). In-process D1 is SLOT unless CORPUS_D1 is bound. Author: Aziel Eliab only.";

function sampleKeyArtifacts() {
  return SAMPLE_MASTER.map((rec) => ({
    record_id: String(rec.record_id || ""),
    title: String(rec.title || ""),
    author: String(rec.author || ""),
    domain: String(rec.domain || ""),
    library: String(rec.library || ""),
    created_utc: String(rec.created_utc || ""),
    label: "REAL",
    note: "Bundled public sample MASTER row. Not a live D1 record.",
  }));
}

/** Deterministic tip document. No timestamps. No live-index bytes. */
export function tipPackDocument() {
  return {
    spec: TIP_PACK_SPEC,
    id: TIP_PACK_ID,
    kind: TIP_PACK_KIND,
    author: AUTHOR,
    identity: AUTHOR,
    person_id: PERSON_ID,
    full_library_in_process: false,
    zip: false,
    hosted_store: false,
    foldlock: {
      layer: "fld3-wire",
      preview_honesty: "fold-preview / unfold-preview stay ~8KB user previews. This tip is a shipped Worker asset, not hosted_store.",
      not_zip: true,
    },
    labels: {
      tip: "REAL",
      live_library: "LIVE",
      in_process_d1: "SLOT",
    },
    about_aziel: {
      ...ABOUT_AZIEL,
      sources: ABOUT_AZIEL_SOURCES.slice(),
    },
    library_index: {
      packed: [
        {
          kind: "index-cite",
          label: "REAL",
          url: LIVE_LIBRARY_INDEX,
          note: "Cite of the live packed library index URL. The live index bytes stay on the library host — not embedded here.",
        },
        {
          kind: "sample-master",
          label: "REAL",
          count: SAMPLE_MASTER.length,
          note: "Bundled public sample MASTER (portable). Not live D1.",
        },
        {
          kind: "about-aziel",
          label: "REAL",
          note: "Published About Aziel from Person / llms / FAQ machine surfaces. Not a biography.",
        },
      ],
      remains_on_azielcorpuslibrary_net: [
        {
          kind: "live-library-index",
          label: "LIVE",
          url: LIVE_LIBRARY_INDEX,
        },
        {
          kind: "azcorpus",
          label: "LIVE",
          url: LIVE_AZCORPUS,
        },
        {
          kind: "azlibrary",
          label: "LIVE",
          url: LIVE_AZLIBRARY,
        },
        {
          kind: "library-llms",
          label: "LIVE",
          url: LIVE_LIBRARY_LLMS,
        },
        {
          kind: "library-cite",
          label: "LIVE",
          url: LIVE_LIBRARY_CITE,
        },
        {
          kind: "in-process-d1",
          label: "SLOT",
          note: "Production `records` run only when CORPUS_D1 is bound. Unbound search uses sample MASTER.",
        },
      ],
    },
    key_artifacts: sampleKeyArtifacts(),
    limitation: TIP_PACK_LIMITATION,
  };
}

export function tipPackCanonical() {
  return canonicalize(tipPackDocument());
}

let packed = null;

export async function tipPackReady() {
  if (packed) return packed;
  const document = tipPackDocument();
  const canonical = canonicalize(document);
  const sha256 = await sha256Hex(canonical);
  const raw = new TextEncoder().encode(canonical);
  const { blob, receipt } = await foldBytes(raw, { name: `${TIP_PACK_ID}.json` });
  packed = {
    document,
    canonical,
    sha256,
    orig_size: raw.byteLength,
    folded_size: blob.byteLength,
    b64: b64encode(blob),
    fold: {
      magic: receipt.magic,
      method: receipt.method,
      strategy: receipt.strategy,
      passthrough: !!receipt.passthrough,
      zip: false,
      orig_sha256: receipt.orig_sha256 || sha256,
    },
  };
  return packed;
}

export function corpusFoldPackCiteField() {
  return {
    spec: TIP_PACK_SPEC,
    id: TIP_PACK_ID,
    kind: TIP_PACK_KIND,
    full_library_in_process: false,
    in_process_label: "REAL",
    live_library_label: "LIVE",
    in_process_d1_label: "SLOT",
    live_library: LIVE_LIBRARY_ORIGIN + "/",
    live_index: LIVE_LIBRARY_INDEX,
    person_id: PERSON_ID,
    identity: AUTHOR,
    verify: 'POST /v1/fraggate/call { "slug": "foldlock", "op": "pack-verify" }',
    open: 'POST /v1/fraggate/call { "slug": "aziel-corpus", "op": "tip-pack" }',
    zip: false,
    hosted_store: false,
    note: TIP_PACK_LIMITATION,
  };
}

export function aboutAzielCiteField() {
  return {
    person_id: PERSON_ID,
    identity: AUTHOR,
    public_identity: ABOUT_AZIEL.public_identity,
    goals: ABOUT_AZIEL.goals.slice(),
    philosophy: ABOUT_AZIEL.philosophy.slice(),
    mission: ABOUT_AZIEL.mission.slice(),
    status: ABOUT_AZIEL.status.slice(),
    not: ABOUT_AZIEL.not.slice(),
    sources: ABOUT_AZIEL_SOURCES.slice(),
    biography: false,
    godlock_is_product: true,
    chrome_15_20: false,
  };
}

function srcOf(body) {
  return body && typeof body === "object" ? body : {};
}

function refuse(code, error, extra = {}) {
  return {
    ok: false,
    refused: true,
    verified: false,
    code,
    error,
    spec: TIP_PACK_SPEC,
    id: TIP_PACK_ID,
    full_library_in_process: false,
    zip: false,
    hosted_store: false,
    author: AUTHOR,
    identity: AUTHOR,
    limitation: TIP_PACK_LIMITATION,
    ...extra,
  };
}

/**
 * Verify the shipped tip (and optional posted b64 / sha256).
 * Hash mismatch refuses. Not hosted_store. Not the 8KB user preview path.
 */
export async function verifyTipPack(body) {
  const src = srcOf(body);
  const ready = await tipPackReady();
  const postedHash = src.sha256 != null ? String(src.sha256).trim().toLowerCase() : "";
  if (postedHash && postedHash !== ready.sha256) {
    return refuse(HASH_MISMATCH_CODE, "sha256 does not match the shipped FoldLock corpus tip", {
      expected_sha256: ready.sha256,
      got_sha256: postedHash,
    });
  }
  const postedB64 = src.b64 || src.fld_b64 || src.bytes_b64;
  if (postedB64) {
    let blob;
    try {
      blob = b64decode(postedB64);
    } catch (err) {
      return refuse(UNFOLD_REFUSE_CODE, "bad base64: " + String(err && err.message ? err.message : err));
    }
    let unfolded;
    try {
      unfolded = await unfoldBytes(blob);
    } catch (err) {
      return refuse(UNFOLD_REFUSE_CODE, "unfold refused: " + String(err && err.message ? err.message : err));
    }
    const got = await sha256Hex(unfolded.raw);
    if (got !== ready.sha256) {
      return refuse(HASH_MISMATCH_CODE, "unfolded bytes do not match the shipped FoldLock corpus tip", {
        expected_sha256: ready.sha256,
        got_sha256: got,
      });
    }
  }
  return {
    ok: true,
    verified: true,
    refused: false,
    product: "foldlock",
    spec: TIP_PACK_SPEC,
    id: TIP_PACK_ID,
    kind: TIP_PACK_KIND,
    sha256: ready.sha256,
    orig_size: ready.orig_size,
    folded_size: ready.folded_size,
    fold: ready.fold,
    labels: ready.document.labels,
    full_library_in_process: false,
    zip: false,
    hosted_store: false,
    live_library: LIVE_LIBRARY_ORIGIN + "/",
    person_id: PERSON_ID,
    author: AUTHOR,
    identity: AUTHOR,
    limitation: TIP_PACK_LIMITATION,
    note: "Shipped tip verified. Not the full live library. Not zip. Not hosted_store.",
  };
}

/** Open the shipped tip after hash verify. Optional posted sha256 must match. */
export async function openTipPack(body) {
  const verified = await verifyTipPack(body);
  if (!verified.ok) return { ...verified, product: "aziel-corpus", op: "tip-pack" };
  const ready = await tipPackReady();
  return {
    ...verified,
    product: "aziel-corpus",
    op: "tip-pack",
    pack: ready.document,
    b64: ready.b64,
    note: "Opened the FoldLock-packed library tip. Full library remains on azielcorpuslibrary.net.",
  };
}

export function resetTipPackCache() {
  packed = null;
}
