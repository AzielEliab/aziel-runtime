/**
 * Operator UI for AZOS and the runtime doors.
 * Plain buttons and text inputs. No decorative chrome.
 * Author: Aziel Eliab.
 */

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function form(slug, op, label, fields = "") {
  return `<form method="POST" action="/operator">
    <input type="hidden" name="slug" value="${esc(slug)}">
    <input type="hidden" name="op" value="${esc(op)}">
    ${fields}
    <button type="submit">${esc(label)}</button>
  </form>`;
}

function textField(name, label, value = "") {
  return `<label>${esc(label)} <input name="${esc(name)}" type="text" value="${esc(value)}" autocomplete="off"></label>`;
}

function statusText(result) {
  if (!result) return "Ready.";
  if (result.line) return String(result.line);
  if (result.banner) return String(result.banner);
  if (Array.isArray(result.modes) && result.modes.length) {
    return result.modes.map((row) => row && row.line).filter(Boolean).join(" ");
  }
  if (result.code && result.ok === false) return String(result.code);
  if (result.engine) return String(result.engine);
  if (result.status) return String(result.status);
  if (result.ok === false) return "refused";
  return "ok";
}

export function operatorPageHtml(origin, result) {
  const base = String(origin || "").replace(/\/$/, "");
  const lattice = result && result.lattice_receipt ? result.lattice_receipt : null;
  const receiptLine = !lattice
    ? "Receipt: missing"
    : lattice.missing
      ? "Receipt: missing"
      : lattice.chained
        ? "Receipt: present, chained"
        : lattice.present
          ? "Receipt: present, not chained"
          : "Receipt: missing";
  const status = esc(statusText(result));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AZOS</title>
  <style>
    body{font:16px/1.4 sans-serif;margin:0;padding:1rem;background:#fff;color:#111}
    main{max-width:40rem;margin:0 auto}
    h1,h2{font-size:1.1rem;margin:1.2rem 0 .4rem}
    button{min-height:44px;min-width:44px;margin:.2rem .2rem .2rem 0;font:inherit}
    input{font:inherit;min-height:44px;width:100%;box-sizing:border-box}
    form{margin:.35rem 0}
    label{display:block;margin:.3rem 0}
    #status{border:1px solid #ccc;padding:.6rem}
    a{color:#111}
  </style>
</head>
<body>
<main>
  <p><a href="${esc(base)}/">Back</a></p>
  <h1>AZOS</h1>
  <p>Jeeves is a helper, not the owner. This device and its choices belong to you. Jeeves will ask before it changes anything.</p>
  <p id="status" role="status">${receiptLine}. ${status}</p>

  <h2>Welcome</h2>
  ${form("azos", "mode_list", "Get started")}
  ${form("azos", "mode_list", "What is AZOS?")}

  <h2>Pick a mode</h2>
  ${form("azos", "download_list", "Server", `<input type="hidden" name="mode" value="server">`)}
  ${form("azos", "download_list", "Bootstrap OS", `<input type="hidden" name="mode" value="bootstrap">`)}
  ${form("azos", "download_list", "Full install", `<input type="hidden" name="mode" value="install">`)}
  ${form("azos", "mode_list", "Next")}
  <p><a href="${esc(base)}/operator">Back</a></p>

  <h2>What will download</h2>
  ${form("azos", "download_list", "Download all", `<input type="hidden" name="mode" value="server">`)}
  ${form("azos", "download_check", "Show details", `<input type="hidden" name="mode" value="server">`)}

  <h2>Phone</h2>
  ${form("azos", "phone_path", "Try again")}
  ${form("azos", "phone_path", "Pick my phone myself")}
  ${form("azos", "phone_path", "Flash AZOS (erases phone)", textField("model", "Type the phone model to confirm"))}
  ${form("azos", "phone_path", "Use bootstrap app (keeps everything)")}
  ${form("azos", "phone_path", "Erase and flash", textField("model", "Type the phone model to confirm"))}

  <h2>Cellular</h2>
  ${form("azos", "cellular", "Check all now")}
  ${form("azos", "cellular", "Check now")}
  ${form("azos", "sim_lockout", "Lock out SIM", `<input type="hidden" name="on" value="true">`)}
  ${form("azos", "sim_lockout", "Cancel")}
  ${form("azos", "sim_lockout", "Use SIM again", `<input type="hidden" name="on" value="false">`)}

  <h2>IP masking</h2>
  ${form("azos", "ip_mask", "Check now", `<input type="hidden" name="mode" value="server"><input type="hidden" name="direct" value="true">`)}
  ${form("azos", "ip_mask", "Why?")}

  <h2>VeilLock</h2>
  ${form("azos", "veillock", "Turn off")}
  ${form("azos", "veillock", "Open phone settings")}
  ${form("veillock", "veil_status", "Camera: Off")}
  ${form("veillock", "screen_share", "Screen share: Off")}

  <h2>AZ Call</h2>
  ${form("azos", "azcall", "AZ Call")}

  <h2>AZChat</h2>
  ${form("azchat", "channel_seal", "Seal AZChat channel")}
  ${form("azchat", "bridge_status", "Bridge status")}
  ${form("azchat", "malware_sweep", "Malware sweep", textField("text", "Text to scan"))}
  ${form("azchat", "airgap", "Airgap", textField("text", "Text to airgap"))}

  <h2>AZMail</h2>
  ${form("azmail", "health", "AZMail health")}
  ${form("azmail", "malware_sweep", "Malware sweep")}
  ${form("azmail", "airgap", "Airgap", textField("text", "Text to airgap", "hello"))}

  <h2>AZ Browser</h2>
  ${form("azbrowser", "airgap", "Airgap", textField("text", "Text to airgap", "notes"))}
  ${form("azbrowser", "malware_sweep", "Malware sweep", textField("text", "Text to scan", "notes"))}
  ${form("azbrowser", "jeeves_site", "Ask", `${textField("text", "What should Jeeves change")}<input type="hidden" name="asked" value="true">`)}
  ${form("azbrowser", "human_check", "I'm done, continue", textField("text", "Page text"))}
  ${form("azbrowser", "human_check", "Stop", textField("text", "Page text", "are you a robot"))}

  <h2>AZAI and AZclicker</h2>
  ${form("azai", "conversation", "Chat", textField("q", "Question"))}
  ${form("azai", "agent", "Agent", textField("q", "Task"))}
  ${form("azai", "azclicker", "AZclicker", textField("q", "Coding question"))}
  ${form("azai", "engine_status", "Engine status")}
  ${form("azai", "attach", "Attach file", textField("text", "File text"))}
  ${form("azai", "crawl", "Crawl", `${textField("url", "URL")}<input type="hidden" name="asked" value="true">`)}
  ${form("azai", "receipt_learn", "Learn receipts")}
  ${form("azai", "human_check", "Stop", textField("text", "Page text", "captcha"))}
  ${form("azai", "score_gate", "Score check", `${textField("claim", "Claim")}${textField("source", "Source")}`)}
  ${form("azai", "cap7_lookup", "Cap-7 name", textField("name", "Cap-7 name"))}
  ${form("azai", "corpus_note", "Corpus note", `${textField("published", "Published text")}${textField("note", "Note beside it")}`)}

  <p>Author: Aziel Eliab</p>
</main>
</body>
</html>`;
}

export function operatorPayload(form) {
  const src = {};
  for (const [key, value] of form.entries()) {
    if (key === "slug" || key === "op") continue;
    if (value === "true") src[key] = true;
    else if (value === "false") src[key] = false;
    else src[key] = value;
  }
  return src;
}
