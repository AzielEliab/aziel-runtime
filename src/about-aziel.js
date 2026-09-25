/**
 * About Aziel (published work) + FoldLock corpus-pack human chrome.
 * Published Person / llms / FAQ surfaces only. No legal name / home.
 * No visible 15:20 HTML chrome. GodLock is a product name.
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
  WHY_AZIEL_ELIAB,
  whatAzielEliabDoesLlmsLines,
  whatAzielEliabDoesMachineField,
} from "./person-index.js";
import { JEEVES_PUBLIC_FILE_COUNT } from "./engines/aziel-corpus/jeeves-eggs.js";
import { RUNTIME_VERSION } from "./runtime-api.js";

export function aboutAzielCiteField() {
  const base = aboutAzielBaseCiteField();
  const { not: _omitNot, ...rest } = base;
  const status = (rest.status || []).map((line) =>
    String(line).replace("GodLock (product, not identity)", "GodLock (product)"),
  );
  return {
    ...rest,
    public_identity: "The public identity is the published work.",
    status,
    ...whatAzielEliabDoesMachineField(),
  };
}

function publishedStatusLines() {
  return ABOUT_AZIEL.status.map((line) =>
    String(line).replace("GodLock (product, not identity)", "GodLock (product)"),
  );
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
  return `<p class="about-aziel-strip"${attr}>About Aziel · Person <a href="${PERSON_ID}"><span class="hashtag">#aziel</span></a> · identity <strong>${escapeHtml(ABOUT_AZIEL.identity)}</strong> only · published work · <a href="#about-aziel">full section</a></p>`;
}

/** Human About Aziel section. Dashboard + /about. No 15:20 chrome. */
export function aboutAzielSectionHtml() {
  return `<section class="cite" id="about-aziel">
  <h2>About Aziel <span class="hashtag">#about-aziel</span></h2>
  <p class="lead">${escapeHtml(ABOUT_AZIEL.mission[0])} The public identity is the published work.</p>
  <p>Person <code>@id</code> <a href="${PERSON_ID}">${PERSON_ID}</a>. Identity <strong>${escapeHtml(ABOUT_AZIEL.identity)}</strong> only. Also known as ${escapeHtml(ABOUT_AZIEL.aka_only)} (alternateName only). GodLock is a product name.</p>
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
${listHtml(publishedStatusLines())}
  </ul>
  <p class="secondary">Published machine / Person surfaces only: ${ABOUT_AZIEL_SOURCES.map((u) => `<a href="${escapeHtml(u)}">${escapeHtml(u.replace("https://www.azieleliab.com/", "/"))}</a>`).join(" · ")}.</p>
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
  return `<section id="elroi-pane" class="cite">
  <h2>Aziel Elroi Eliab <span class="hashtag">#elroi</span></h2>
  <p>Alternate name only. The primary identity is <strong>Aziel Eliab</strong>. Corpus and Ask Jeeves are sub-tabs here, not top-bar domains.</p>
  <div class="elroi-tabs" role="tablist">
    <button type="button" data-elroi-tab="published" aria-selected="true">Published work</button>
    <button type="button" data-elroi-tab="corpus" aria-selected="false">Corpus</button>
    <button type="button" data-elroi-tab="jeeves" aria-selected="false">Ask Jeeves</button>
  </div>
  <div data-elroi-panel="published">
${aboutAzielSectionHtml()}
  </div>
  <div data-elroi-panel="corpus" hidden>
    <p>Corpus sub-tab under Aziel Elroi Eliab (alternateName). The Library top-bar tab still groups the Aziel Corpus and Whitestone Softwares cards.</p>
${corpusFoldPackPanelHtml(origin)}
  </div>
  <div data-elroi-panel="jeeves" id="elroi-jeeves" hidden>
${jeevesHelpHtml(origin)}
  </div>
  <style>
    #elroi-pane .elroi-tabs{display:flex;flex-wrap:wrap;gap:.4rem;margin:.4rem 0 .8rem}
    #elroi-pane .elroi-tabs button{background:#241c0d;color:#f0d78c;border:1px solid #5c4a1a;border-radius:8px;padding:.4rem .75rem;cursor:pointer;font:inherit}
    #elroi-pane .elroi-tabs button[aria-selected="true"]{box-shadow:0 0 0 1px #d4af37}
    #jeeves-egg{max-width:280px;display:block;margin:.5rem 0}
  </style>
  <script>
(function () {
  var root = document.getElementById("elroi-pane");
  if (!root || root.getAttribute("data-bound") === "1") return;
  root.setAttribute("data-bound", "1");
  var tabs = root.querySelectorAll("[data-elroi-tab]");
  function show(id) {
    tabs.forEach(function (tab) {
      tab.setAttribute("aria-selected", tab.getAttribute("data-elroi-tab") === id ? "true" : "false");
    });
    root.querySelectorAll("[data-elroi-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-elroi-panel") !== id;
    });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { show(tab.getAttribute("data-elroi-tab")); });
  });
  function fromHash() {
    var h = location.hash;
    if (h === "#elroi-jeeves" || h === "#ask-jeeves") show("jeeves");
    else if (h === "#corpus-fold-pack" || h === "#elroi-corpus") show("corpus");
  }
  fromHash();
  window.addEventListener("hashchange", fromHash);
  var box = document.getElementById("desk-jeeves");
  if (!box) return;
  var origin = box.getAttribute("data-origin") || "";
  var library = box.getAttribute("data-library") || "";
  var out = document.getElementById("jeeves-out");
  var img = document.getElementById("jeeves-egg");
  var miss = document.getElementById("jeeves-egg-miss");
  var field = document.getElementById("jeeves-q");
  var dry = document.getElementById("jeeves-dry");
  var previous = "";
  var snake = null;
  function paint(body) {
    var answer = body && body.answer != null ? String(body.answer) : "";
    var head = body && body.display && body.display.summary ? body.display.summary : (body && body.source ? body.source : "");
    out.textContent = (head ? head + "\\n\\n" : "") + (answer ? answer + "\\n\\n" : "") + JSON.stringify(body, null, 2);
    var path = body && body.image ? String(body.image) : "";
    if (img) {
      if (path) {
        img.alt = (body && body.image_alt) || "Ask Jeeves easter egg";
        img.hidden = false;
        img.src = library.replace(/\\/$/, "") + path;
      } else {
        img.removeAttribute("src");
        img.hidden = true;
      }
    }
    if (miss) miss.textContent = "";
    if (body && body.snake) snake = body.snake;
  }
  if (img) {
    img.addEventListener("error", function () {
      img.hidden = true;
      if (miss) miss.textContent = "Bitmap last-known at " + (img.src || "the corpus public path") + ". This page could not load it (unreachable or blocked). The file list was not invented.";
    });
  }
  function ask(q) {
    var text = String(q || "").trim();
    if (!text) {
      out.textContent = "Type a question. Nothing was sent.";
      return;
    }
    var body = { call: "jeeves_help", q: text, previous: previous };
    if (dry && dry.checked) body.dry_run = true;
    if (snake && /^(up|down|left|right|u|d|l|r|quit|exit|stop|end)$/i.test(text)) body.snake = snake;
    out.textContent = "Asking Jeeves…";
    fetch(origin + "/v1/interface", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); }).then(function (payload) {
      previous = text;
      paint(payload);
    }).catch(function (err) {
      out.textContent = "Ask Jeeves did not answer. " + String(err && err.message ? err.message : err) + " Last-known help is the on-page note. No shelf row was invented.";
    });
  }
  box.querySelectorAll("[data-jeeves]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var kind = btn.getAttribute("data-jeeves");
      if (kind === "eggs") ask("list ask jeeves easter eggs");
      else ask(field && field.value);
    });
  });
  if (field) {
    field.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") ask(field.value);
    });
  }
})();
  </script>
</section>`;
}

function jeevesHelpHtml(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return `<section class="dash" id="desk-jeeves" data-origin="${escapeHtml(base)}" data-library="${escapeHtml(LIVE_LIBRARY_ORIGIN)}">
  <h2>Ask Jeeves <span class="hashtag">#ask-jeeves</span></h2>
  <p>Suite help for this build (<strong>${escapeHtml(RUNTIME_VERSION)}</strong>). Answers about domain tabs, receipts, and dry_run come from this runtime. Library answers come from corpus op <code>jeeves</code> on <code>aziel-corpus</code>. The Softwares card for that library carries <code>suite_help</code> with <code>software_tab</code> false. Last-known easter-egg files: ${JEEVES_PUBLIC_FILE_COUNT} under the corpus Worker public directory. This page does not host the bitmaps. A live fetch is not attempted until an image tag loads.</p>
  <div class="field">
    <label for="jeeves-q">Question</label>
    <input id="jeeves-q" type="text" placeholder="How do the domain tabs work?" autocomplete="off" spellcheck="false">
  </div>
  <label><input id="jeeves-dry" type="checkbox"> dry_run (store nothing)</label>
  <div class="actions">
    <button type="button" data-jeeves="ask">Ask</button>
    <button type="button" data-jeeves="eggs">List easter eggs</button>
  </div>
  <img id="jeeves-egg" alt="" hidden>
  <p id="jeeves-egg-miss" class="secondary"></p>
  <pre class="fg-out" id="jeeves-out" role="status" aria-live="polite">Ask about this build, or list the corpus easter eggs.</pre>
</section>`;
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
    "## About Aziel",
    "",
    `Person @id: ${PERSON_ID}. Identity Aziel Eliab only. GodLock is a product name.`,
    WHAT_AZIEL_ELIAB_DOES,
    WHY_AZIEL_ELIAB,
    ABOUT_AZIEL.mission[0],
    "The public identity is the published work.",
    ...whatAzielEliabDoesLlmsLines(),
    ...ABOUT_AZIEL.goals.map((line) => `- Goal: ${line}`),
    ...ABOUT_AZIEL.mission.slice(1).map((line) => `- Mission: ${line}`),
    "Published work surfaces only. Sources: " + ABOUT_AZIEL_SOURCES.join(" · "),
    "",
    "## FoldLock corpus tip",
    "",
    `${TIP_PACK_SPEC} is a hash-verified in-process tip (label REAL): library index cite + sample-MASTER key artifacts + About Aziel.`,
    `Full library remains LIVE on ${LIVE_LIBRARY_ORIGIN}/ (index ${LIVE_LIBRARY_INDEX}). In-process D1 is SLOT unless CORPUS_D1 is bound.`,
    "Verify: fraggate_call { slug: foldlock, op: pack-verify }. Open: fraggate_call { slug: aziel-corpus, op: tip-pack }.",
    "",
    "## Worker launch (every surface)",
    "",
    "Every Worker launch includes (1) product-specific #hashtag parts — not identical copy across slugs — and (2) the same About Aziel block + FoldLock corpus tip.",
    "Shared partial: src/about-aziel.js workerLaunchHtml. Product Workers inherit by copying that partial; hashtag parts stay slug-specific. See docs/WORKER-LAUNCH.md.",
    "",
  ].join("\n");
}
