/**
 * About Aziel (work, not biography) + FoldLock corpus-pack human chrome.
 * Published Person / llms / FAQ surfaces only. No legal name / home.
 * No visible 15:20 HTML chrome. GodLock is a product name, not identity.
 * Author: Aziel Eliab only. Person @id https://www.azieleliab.com/#aziel.
 */

import {
  ABOUT_AZIEL,
  ABOUT_AZIEL_SOURCES,
  LIVE_LIBRARY_INDEX,
  LIVE_LIBRARY_ORIGIN,
  PERSON_ID,
  TIP_PACK_ID,
  TIP_PACK_LIMITATION,
  TIP_PACK_SPEC,
  aboutAzielCiteField as aboutAzielBaseCiteField,
  corpusFoldPackCiteField,
} from "./engines/aziel-corpus/tip-pack.js";
import {
  launchHashtagPartsHtml,
  runtimeLaunchParts,
  workerLaunchCiteField,
} from "./launch-parts.js";
import {
  WHAT_AZIEL_ELIAB_DOES,
  whatAzielEliabDoesLlmsLines,
  whatAzielEliabDoesMachineField,
} from "./person-index.js";

export function aboutAzielCiteField() {
  return {
    ...aboutAzielBaseCiteField(),
    ...whatAzielEliabDoesMachineField(),
  };
}

export {
  ABOUT_AZIEL,
  ABOUT_AZIEL_SOURCES,
  PERSON_ID,
  TIP_PACK_SPEC,
  corpusFoldPackCiteField,
  workerLaunchCiteField,
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listHtml(items) {
  return items.map((line) => `    <li>${escapeHtml(line)}</li>`).join("\n");
}

/** Always-visible About Aziel cite on operator panel / dashboard / cards. No 15:20 chrome. */
export function aboutAzielStripHtml({ id = "about-aziel-strip" } = {}) {
  const attr = id ? ` id="${escapeHtml(id)}"` : "";
  return `<p class="about-aziel-strip"${attr}>About Aziel · Person <a href="${PERSON_ID}"><span class="hashtag">#aziel</span></a> · identity <strong>${escapeHtml(ABOUT_AZIEL.identity)}</strong> only · published work, not a biography · <a href="#about-aziel">full section</a></p>`;
}

/** Human About Aziel section. Dashboard + /about. No 15:20 chrome. */
export function aboutAzielSectionHtml() {
  return `<section class="cite" id="about-aziel">
  <h2>About Aziel <span class="hashtag">#about-aziel</span></h2>
  <p class="lead">${escapeHtml(ABOUT_AZIEL.mission[0])} ${escapeHtml(ABOUT_AZIEL.public_identity)}</p>
  <p>Person <code>@id</code> <a href="${PERSON_ID}">${PERSON_ID}</a>. Identity <strong>${escapeHtml(ABOUT_AZIEL.identity)}</strong> only. Also known as ${escapeHtml(ABOUT_AZIEL.aka_only)} (alternateName only). GodLock is a product name, not identity.</p>
  <h3>Goals</h3>
  <ul>
${listHtml(ABOUT_AZIEL.goals)}
  </ul>
  <h3>Philosophy</h3>
  <ul>
${listHtml(ABOUT_AZIEL.philosophy)}
  </ul>
  <h3>Mission</h3>
  <ul>
${listHtml(ABOUT_AZIEL.mission)}
  </ul>
  <h3>Status</h3>
  <ul>
${listHtml(ABOUT_AZIEL.status)}
  </ul>
  <h3>Not this</h3>
  <ul>
${listHtml(ABOUT_AZIEL.not)}
  </ul>
  <p class="secondary">Published machine / Person surfaces only: ${ABOUT_AZIEL_SOURCES.map((u) => `<a href="${escapeHtml(u)}">${escapeHtml(u.replace("https://www.azieleliab.com/", "/"))}</a>`).join(" · ")}. Not a biography.</p>
</section>`;
}

/** FragGate control panel: open / verify the FoldLock corpus tip. */
export function corpusFoldPackPanelHtml(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const verifyExample = JSON.stringify({ pack: TIP_PACK_ID }, null, 2);
  return `<section class="cite" id="corpus-fold-pack">
  <h2>FoldLock corpus tip <span class="hashtag">#foldlock-corpus-tip</span></h2>
  <p><strong>${escapeHtml(TIP_PACK_SPEC)}</strong> — hash-verified in-process tip (label <strong>REAL</strong>). The full Aziel Digital Library remains on <a href="${LIVE_LIBRARY_ORIGIN}/">${LIVE_LIBRARY_ORIGIN}/</a> (label <strong>LIVE</strong>). In-process D1 is <strong>SLOT</strong> unless <code>CORPUS_D1</code> is bound. This Worker does <em>not</em> contain the entire live library.</p>
  <p class="secondary">${escapeHtml(TIP_PACK_LIMITATION)}</p>
  <p>Live index (not embedded): <a href="${LIVE_LIBRARY_INDEX}">${LIVE_LIBRARY_INDEX}</a>. Open / verify only through FragGate.</p>
  <div class="fg-door" data-slug="foldlock" data-origin="${escapeHtml(base)}" id="fold-pack-verify">
    <p>Control panel — FragGate <code>foldlock/pack-verify</code> and <code>aziel-corpus/tip-pack</code>. Same door as MCP <code>fraggate_call</code>.</p>
    <div class="fg-ops">
      <button type="button" data-op="pack-verify">pack-verify</button>
      <button type="button" data-slug="aziel-corpus" data-op="tip-pack">tip-pack</button>
    </div>
    <label for="fold-pack-payload">Pack payload JSON</label>
    <textarea id="fold-pack-payload" class="fg-payload" name="fold_pack_payload">${escapeHtml(verifyExample)}</textarea>
    <pre class="fg-out">POST ${escapeHtml(base)}/v1/fraggate/call
{ "slug": "foldlock", "op": "pack-verify", "payload": ${verifyExample} }</pre>
  </div>
  <script>
(function () {
  var box = document.getElementById("fold-pack-verify");
  if (!box || box.getAttribute("data-bound") === "1") return;
  box.setAttribute("data-bound", "1");
  function parsePayload(raw) {
    var text = String(raw || "").trim();
    if (!text) return {};
    try { return JSON.parse(text); } catch (e) { return { pack: text }; }
  }
  var origin = box.getAttribute("data-origin") || "";
  var out = box.querySelector(".fg-out");
  var area = box.querySelector(".fg-payload");
  box.querySelectorAll("[data-op]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var op = btn.getAttribute("data-op");
      var callSlug = btn.getAttribute("data-slug") || box.getAttribute("data-slug") || "foldlock";
      var payload = parsePayload(area && area.value);
      out.textContent = "calling " + callSlug + "/" + op + " …";
      fetch(origin + "/v1/fraggate/call", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ slug: callSlug, op: op, payload: payload })
      }).then(function (res) { return res.json(); }).then(function (body) {
        var title = body && body.display && body.display.title ? body.display.title : (callSlug + "/" + op);
        var summary = body && body.display && body.display.summary ? body.display.summary : "";
        out.textContent = title + (summary ? "\\n" + summary : "") + "\\n\\n" + JSON.stringify(body, null, 2);
      }).catch(function (err) {
        out.textContent = String(err && err.message ? err.message : err);
      });
    });
  });
})();
  </script>
</section>`;
}

export function aboutAzielAndPackHtml(origin) {
  return `${aboutAzielSectionHtml()}
${corpusFoldPackPanelHtml(origin)}`;
}

/**
 * Shared Worker-launch footer: distinct #hashtag parts + About Aziel + FoldLock tip.
 * Wire this once on every homepage / dashboard / /p/{slug} / HTML shell.
 */
export function workerLaunchHtml(origin, product) {
  return `${launchHashtagPartsHtml(product)}
${aboutAzielAndPackHtml(origin)}`;
}

export function runtimeLaunchHtml(origin) {
  return workerLaunchHtml(origin, {
    slug: "aziel-runtime",
    name: "Aziel Runtime",
    oneLine: runtimeLaunchParts()[0].body,
  });
}

export function aboutAzielLlmsBlock() {
  return [
    "## About Aziel (work, not biography)",
    "",
    `Person @id: ${PERSON_ID}. Identity Aziel Eliab only. GodLock is a product name, not identity.`,
    WHAT_AZIEL_ELIAB_DOES,
    ABOUT_AZIEL.mission[0],
    ABOUT_AZIEL.public_identity,
    ...whatAzielEliabDoesLlmsLines(),
    ...ABOUT_AZIEL.goals.map((line) => `- Goal: ${line}`),
    ...ABOUT_AZIEL.mission.slice(1).map((line) => `- Mission: ${line}`),
    "No legal name / home. No biography chrome. Sources: " + ABOUT_AZIEL_SOURCES.join(" · "),
    "",
    "## FoldLock corpus tip (not the full library)",
    "",
    `${TIP_PACK_SPEC} is a hash-verified in-process tip (label REAL): library index cite + sample-MASTER key artifacts + About Aziel.`,
    `Full library remains LIVE on ${LIVE_LIBRARY_ORIGIN}/ (index ${LIVE_LIBRARY_INDEX}). In-process D1 is SLOT unless CORPUS_D1 is bound.`,
    "Verify: fraggate_call { slug: foldlock, op: pack-verify }. Open: fraggate_call { slug: aziel-corpus, op: tip-pack }.",
    "Not zip. Not hosted_store. Not an invented DOI / Framagit / Glama UUID / fielded-100.",
    "",
    "## Worker launch (every surface)",
    "",
    "Every Worker launch includes (1) product-specific #hashtag parts — not identical copy across slugs — and (2) the same About Aziel block + FoldLock corpus tip.",
    "Shared partial: src/about-aziel.js workerLaunchHtml. Product Workers inherit by copying that partial; hashtag parts stay slug-specific. See docs/WORKER-LAUNCH.md.",
    "",
  ].join("\n");
}
