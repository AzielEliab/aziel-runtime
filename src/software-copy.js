/**
 * Softwares-tab catalog copy — designed-purpose addendum.
 *
 * SoT for GET /v1/software one_line + description. Hubs refresh from that
 * route. FragGate is THE single public door; Softwares stay separate products.
 * Identity: Aziel Eliab only. GodLock is a product name.
 *
 * one_line: one sentence — designed action.
 * description: 1–2 sentences — Use X to … It exists so …
 * Write only what the product is designed to do. Do not define by what it
 * is not, never-invent bans, verified-status marketing, THIS IS / THIS IS NOT,
 * or SLOT / REAL / LIVE placement tags.
 *
 * Sort law lives in software-catalog.js (Plain → Gate → Lock; Clock ≠ Lock).
 * Do not invent capabilities, DOIs, or VPN claims beyond AZVPN
 * honesty (HTTPS/WS REAL; WireGuard/OpenVPN/L3 SLOT — placement docs only).
 *
 * Author: Aziel Eliab.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAP7_PLANE_BOUNDARY, CAP7_PUBLIC_WORKER_LIVE } from "./engines/miragegrid/cap7-public.js";
import { D2D_ORDER_ARROW, D2D_ORDER_LABEL } from "./d2d-carriers.js";

export const SOFTWARE_COPY = Object.freeze({
  "4dmap": {
    one_line: "Inspect the same event on time, change, graph, and place axes at once.",
    description:
      "Use 4DMap to walk one event across time, change, graph, and place as recorded axes, including a library pin when the paper gives a date and a place. AZNews can store an item on its own, or pin that item here and open it from the map. An empty pin stays refused until a real item is stored. It exists so multi-axis inspection stays a recorded walk.",
  },
  azclce: {
    one_line: "Score how consistently three written layers agree with each other.",
    description:
      "Use AZ-CLCE to check whether requirement, design, and practice statements line up. It exists to flag inconsistency in text you already posted.",
  },
  azos: {
    one_line: "Read ethics status and open a prefab isolate session folder.",
    description:
      "Use AZ-OS to read its principles and open a short isolate ethics session. It exists as a local ethics workspace.",
  },
  azai: {
    one_line: "Run a Lamb Lens check (Service → Clarity → Peace) or the adaptive AZAI Guide.",
    description:
      "Use AZAI for a hosted Lamb ethics check or the adaptive Guide (Lamb Lens first). It exists as a local OpenAI-compatible stack plus a protocol mirror — prefer op=guide with q; skill and doctor stay diagnostics; chat/blend/complete stay refuse on the Worker.",
  },
  azbot: {
    one_line: "Route a request onto the matching catalog product and operation.",
    description:
      "Use AZBot to point a question at the matching Aziel product. It exists as a skill router.",
  },
  azbrowser: {
    one_line: "Browse and search with citations for ethical research.",
    description:
      "Use AZBrowser for ethical research search and advisory page metadata. It exists so research stays cited.",
  },
  azchat: {
    one_line:
      "Join a room from the all-rooms list, where a hosted room appears, and a private room requires a passphrase. The product mesh hop starts off.",
    description:
      "Use AZChat to join from the all-rooms list, to see a room you host in that list, and to require a passphrase on a private room. The product mesh hop starts off. It exists for spendable-handle chat and an agent bus. Those room options are the AZChat product contract.",
  },
  azcoherence: {
    one_line: "Review whether a primary score and an alternate hold together.",
    description:
      "Use AZCoherence for a second look at a posted triad versus an alternate. It exists to review coherence.",
  },
  azhub: {
    one_line: "Place and tether modules in a blank spatial container.",
    description:
      "Use AZHub to put modules in regions and declare links. It exists as a neutral container so placement stays placement.",
  },
  "aziel-corpus": {
    one_line: "Search the public library with Ask Jeeves suite help and download azcorpus + azlibrary designs.",
    description:
      "Use the Aziel Digital Library to search the public MASTER and to ask Ask Jeeves on the corpus jeeves operation. It exists as a self-contained public library with that suite help assistant on this card.",
  },
  azieltether: {
    one_line: "Keep downloaded Aziel software in sync when the central Worker is up or down.",
    description:
      "Use AzielTether so downloaded packages prefer the central Worker, peer-sync when it is down, and reconcile on restore. It exists so copies survive outages.",
  },
  azinterface: {
    one_line: "Open the Softwares suite shell and step pre-locked page cycles.",
    description:
      "Use AZInterface as the suite shell that opens Softwares that can run on this computer, and to read and step site state through OFF, integrity, ON, FULL SHUTDOWN, and MEMORIAL. It exists so the desk and those page cycles stay in one custodial shell.",
  },
  azmail: {
    one_line:
      "Classify mail text and keep a local mailbox sealed to the user key, including links and files. Scan is LIVE-when-scanner-present. The airgap is present. Ordinary SMTP is not end-to-end.",
    description:
      "Use AZMail for an advisory airlock and a local mailbox encrypted to the user key. It exists so untrusted mail is scanned and sealed before it reaches the user. Body, links, videos, docs, images, zips, and other files cross an airgap only after a scan. The scan is LIVE-when-scanner-present (ClamAV). An absent scanner refuses AZM-SCAN-ABSENT and returns no clean verdict. Attachments stay inert. AZMail-to-AZMail seals those parts end-to-end to the user key. Mail to @gmail, @live, @yahoo, and other SMTP domains is a normal MIME message over opportunistic TLS and is not end-to-end. smtp_send queues when a local SMTP transport accepts the message. It is not a public MTA. Field 1.0 is false. A Proton-clone claim is false. The anonymous ring still starts off.",
  },
  aznet: {
    one_line: `Check hash continuity on the Cap-7 and .aziel name plane. Track 2 packet reachability stays NOT-READY (STANDS-until-demonstrated) in failover order ${D2D_ORDER_LABEL}.`,
    description: `Use AZNet to stamp and check hash refs in a custodian garden on the name plane. It exists so integrity can be checked on a side-net while Cap-7 and MirageGrid stay name and land-region metadata (not an ICANN registrar, not a public egress IP, and not AZVPN). Track 2 device-to-device carriers fail over ${D2D_ORDER_ARROW}. Local LAN discovery is LIVE-when-armed and the peer tunnel is LIVE-when-session on the node. Local store-forward is LIVE-when-three-local-nodes / fixture. The public door stays FG-STUB. RF and photon light flashes stay refused without hardware. WARN-5 stays open. The packet path stays short of a live alternative internet.`,
  },
  azvpn: {
    one_line: "Open an HTTPS or WebSocket VPN session on the public concentrator.",
    description:
      "Use AZVPN as the automatic public VPN concentrator for HTTPS and WebSocket tunnels. It exists to concentrate those sessions in-runtime. Track 2 device-to-device reachability stays a separate NOT-READY plane.",
  },
  forgereceipts: {
    one_line: "Mint and hash-check client-held receipts so retries of one request stay linked.",
    description:
      "Use ForgeReceipts to package local receipts and check their hashes. It exists so request_id, attempt_n, parent_receipt_id, correlation_id, and outcome are hashed into the receipt. ledger_tip.prev is call-order only (prev_is_retry_parent false).",
  },
  glossafilter: {
    one_line: "Render one intent across the bundled peer phrasings.",
    description:
      "Use Glossa Filter when you need the same intent spoken in several peer styles. It exists for deterministic mediation.",
  },
  miragegrid: {
    one_line:
      "Assign a short-lived session node and cite Cap-7 mesh-name metadata from a factory that is not a public ICANN registrar. Cap-7 geo, sticky session, and land rotation are LIVE on the Cap-7 plane, not a public egress IP, not a residential IP, and not AZVPN.",
    description:
      `Use MirageGrid to assign a short-lived session node and cite Cap-7 mesh-name metadata. The Cap-7 factory is not a public ICANN registrar. It exists for Cap-7 control-plane assignment. geo-target, session-stick, and egress-rotate are LIVE on the Cap-7 plane (region label, sticky mesh node and factory land, land rotate among 7 sites). ${CAP7_PLANE_BOUNDARY} ${CAP7_PUBLIC_WORKER_LIVE} vpn-hop, hop, tunnel, and mesh stay stub. AZVPN remains the suite VPN. Track 2 carriers (${D2D_ORDER_ARROW}) stay NOT-READY and FG-STUB on this public door. Local LAN discovery is a separate node path.`,
  },
  mmconsensus: {
    one_line: "Tally consensus from opinions you already posted.",
    description:
      "Use MMConsensus to majority-count or compare posted opinions. It exists to structure agreement you already have.",
  },
  postking: {
    one_line: "Play continuity chess where the aim is to remain.",
    description:
      "Use Post-King Chess for a game where the human is king-bound and the AI has a Node. It exists to practice remaining.",
  },
  staticclock: {
    one_line: "Record a forward-only gear-click timeline and read companion advice.",
    description:
      "Use StaticClock to click a client-held chain forward and read advisory fields. It exists as a plain clock of actions.",
  },
  ark: {
    one_line: "Keep a local deniable vault; one phrase opens one vault.",
    description:
      "Use The ARK as a local deniable vault you download and run on your device. It exists so one phrase opens one vault on that machine.",
  },
  toolbench: {
    one_line: "Run synthetic door cases to see how FragGate classifies them.",
    description:
      "Use ToolBench to play closed-path and happy-path cases against the door table. It exists as a self-test playground.",
  },
  zsolver: {
    one_line: "Score answers against nine ontology nodes, with scores labeled up to 75%.",
    description:
      "Use ZionPattern Solver to work through the Zioncheck seed nodes. It exists as an assistive scorer with scores labeled up to 75%.",
  },
  zkattest: {
    one_line: "Attest a statement with a hash commitment that keeps the witness private.",
    description:
      "Use ZKAttest to bind a public statement to a SHA-256 commitment. It exists so the witness stays with the caller.",
  },
  decisiongate: {
    one_line: "Run a proposal through five sequential gates and get PASS, REVISE, or BLOCK.",
    description:
      "Use DecisionGATE to check Definition, Evidence, Impact, Integrity, and Responsibility in order. It exists as a pre-execution filter.",
  },
  chronolock: {
    one_line: "Check whether a place sits in the 08:30–10:30 local advisory window.",
    description:
      "Use ChronoLock for timezone-aware linguistic alignment around the Temporal Neutral Window. It exists as advisory timing.",
  },
  codelock: {
    one_line: "View source as Canonical or Rosetta HTML while keeping the same meaning.",
    description:
      "Use CodeLock when you want a different view of source. It exists to change perception.",
  },
  embryolock: {
    one_line: "Cite an offline vault that prefers destruction over recovery.",
    description:
      "Use EmbryoLock to check health, policy, and published hashes for the local vault. It exists so wipe and unlock stay on the device.",
  },
  employeelock: {
    one_line: "Hash a proposed accountability log row on the client.",
    description:
      "Use EmployeeLock as a hash-chained accountability workbook. It exists to preview log integrity.",
  },
  foldlock: {
    one_line: "Fold UTF-8 text by suppressing tether words, then check the restore.",
    description:
      "Use FoldLock to preview small-text folds and check the shipped corpus tip hash. It exists as algorithmic text folding.",
  },
  godlock: {
    one_line: "Score text for offline hardening and receive an ephemeral receipt.",
    description:
      "Use GodLock to score text and receive a logical receipt. GodLock is a product name. Public identity is Aziel Eliab only. It exists for offline hardening scores.",
  },
  mialock: {
    one_line: "Map missing-person events and rank Doe notices as compatibility leads.",
    description:
      "Use M.I.A.Lock for event maps, archive search plans, Doe matching, and coverage heat. It exists to organize authorized search work — Doe hits are leads, and heat is search intensity.",
  },
  peacelock: {
    one_line: "Record chosen silence or chosen inaction as a hash-chained receipt.",
    description:
      "Use PeaceLock when the act worth keeping is that someone chose silence or inaction. It exists so silence can be a receipt.",
  },
  shadowlock: {
    one_line: "Observe a job list you already have, then discard the observation.",
    description:
      "Use ShadowLock to wrap an existing job list in a zero-retention observation. It exists as an ethics envelope.",
  },
  spectrallock: {
    one_line: "Preview a 256-pixel overlay, paint membership from the Spectral Harmonic Wheel, and restore faded pigment where the pixels still carry it.",
    description:
      "Use SpectralLock 0.3.1 for a hosted overlay whose wheel-paint plane is separate from the spectral triad. Restore lost pigment is live under SpectralLock on FragGate ops pigment and restore-pigment. AMOE stays on the suite project map and is not a live product. It exists as a hosted overlay preview.",
  },
  temporallock: {
    one_line: "Build and check hashes on a receipt timeline you keep on the client.",
    description:
      "Use TemporalLock to start, append, and check hashes on receipts anyone can recompute. It exists so time-stamped records stay client-held.",
  },
  trajectorylock: {
    one_line: "Test whether observations fit a declared geometric line.",
    description:
      "Use TrajectoryLock to check posted geometry against a line you declared. It exists as a research compatibility test.",
  },
  veillock: {
    one_line: "Follow local camera and screen steps for apps on your own device.",
    description:
      "Use VeilLock for device-local camera and screen steps in your own apps. It exists for camera and screen work on your own device.",
  },
  vibelock: {
    one_line:
      "Assess AI deepfake risk in mp4, mp3, and other audio and video. Physics and related signals are heuristic. Linguistics is experimental. Vibration is measured only with a body-coupled track.",
    description:
      "Use VibeLock to assess AI deepfake risk in audio and video you already hold. It exists as a media authenticity advisory. Physics and related signals are heuristic. Linguistics is experimental. Vibration is a measurement only when a body-coupled track is present. Hosted analyze and detect score posted features or limited PCM, refuse raw container bytes, and publish no accuracy percentage. Compressed files on the local package need ffmpeg.",
  },
  whistlelock: {
    one_line: "Hash a local drop and keep a dead-man copy on the client.",
    description:
      "Use WhistleLock to hash posted bytes and hold isolate-hash objects. It exists as a local drop ledger.",
  },
  whitestone: {
    one_line:
      "Advise on short Criminal, Civil, and Divorce questions with historical as-of and Case Mode (suppression axes, TrajectoryLock-lite, export, confidence labeled up to 75%). Session-only web app plus optional zip. https://whitestone.vibelock.workers.dev/",
    description:
      "Use Whitestone for short Criminal, Civil, or Divorce questions in a web app, including historical as-of evaluation and Case Mode axes (truth_upheld, narrative / systemic / personal-professional suppression, honesty). It exists as an ephemeral pro se advisor: TrajectoryLock-lite is labeled heuristic, Case Mode may export a hash-chain card, and confidence is labeled up to 75%. Session-only memory wipes when you close. Optional counted zip is on the download tracker; the web app stays on the Whitestone Worker. https://whitestone.vibelock.workers.dev/ · https://whitestone-download-tracker.vibelock.workers.dev/download",
  },
});

export function softwareOneLine(slug, fallback = "") {
  const copy = SOFTWARE_COPY[String(slug || "")];
  const line = copy && copy.one_line;
  return line || fallback || String(slug || "");
}

export function softwareDescription(slug, product = {}) {
  const copy = SOFTWARE_COPY[String(slug || "")];
  return (
    (copy && copy.description) ||
    product.description ||
    product.banner ||
    (copy && copy.one_line) ||
    product.oneLine ||
    product.one_line ||
    product.name ||
    String(slug || "")
  );
}

export function softwareCopySlugs() {
  return Object.keys(SOFTWARE_COPY);
}
