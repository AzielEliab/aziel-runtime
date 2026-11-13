/**
 * COLD-START-1.0 — offline first hop for a Track 2 node.
 *
 * A node with no operator address does not dial and does not invent a peer.
 * An address is accepted only as cleartext HTTP to a literal loopback or LAN
 * IP with an explicit port. Names, public hosts, HTTPS, and NAT punch are
 * refused before any fetch. The signed bootstrap list keeps
 * needs_starting_address true (one peer is not a multi-provider directory).
 * The local cold-start record clears its own needs_starting_address only after
 * that address returns a verified LAN beacon.
 *
 * second_device follows watchQualifies: different machine ids, and the packet
 * was not loopback. This module does not invent a machine id. Paid satellite
 * stays HELD. The updater is not started here. The public door stays FG-STUB.
 *
 * Author: Aziel Eliab only.
 */

import { watchQualifies } from "../alt-internet-fact.js";
import { PAID_SATELLITE_HELD, qnmNamedLive } from "../qnm-honesty.js";
import { sha256Hex } from "../session-core.js";
import { classifyPeerUrl, isLanHost, isLoopbackHost, urlRequestsPunch } from "./bearers.js";
import { verifyBootstrapPeerList } from "./track2.js";

export const COLD_START_SPEC = "COLD-START-1.0";
const DISCOVER_PATH = "/v1/fed-mesh/discover";
const BODY_CAP = 65536;

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    spec: COLD_START_SPEC,
    message,
    fetched: false,
    invented_address: false,
    invented_peers: false,
    public_deployment: false,
    public_door: "FG-STUB",
    paid_satellite: "HELD",
    updater: "OFF",
    live: false,
    live_multi_provider: false,
    cold_shelf_live: false,
    needs_starting_address: true,
    starting_address_accepted: false,
    bootstrap_list_needs_starting_address: true,
    second_device: false,
    ...qnmNamedLive(),
    ...extra,
    fetched: extra.fetched === true,
  };
}

function bareHost(hostname) {
  return String(hostname || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
}

/**
 * Classify an operator starting address. Does not fetch and does not resolve DNS.
 * @param {string} raw
 */
export function classifyStartingAddress(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return fail("COLD-START-NEEDS-ADDRESS", "No starting address. The node does not invent one and does not dial.");
  }
  if (/\b(inject-payload|jailbreak-ignore|ignore previous instructions|dan mode|poison)\b/i.test(text)) {
    return fail("FED-MESH-POISON", "Poison is refused, not stored, and not dialed.");
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    return fail("FED-MESH-BAD-INPUT", "A starting address must be a URL. NAT punch is not a substitute.");
  }
  if (url.username || url.password) {
    return fail("FED-MESH-BAD-INPUT", "A starting address does not carry userinfo.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    const punched = classifyPeerUrl(text, { role: "direct" });
    return fail(punched.code || "FED-MESH-NAT-REFUSE", punched.message || "That scheme is not a local HTTP starting address.", {
      hole_punch: false,
    });
  }
  if (urlRequestsPunch(text)) {
    const punched = classifyPeerUrl(text, { role: "direct" });
    return fail(punched.code || "FED-MESH-NAT-REFUSE", punched.message || "NAT punch is refused.", { hole_punch: false });
  }
  if (url.protocol === "https:") {
    return fail("COLD-START-HTTP-ONLY", "This cold start dials cleartext HTTP on a literal local address. HTTPS is not this path.", {
      hole_punch: false,
    });
  }
  const host = bareHost(url.hostname);
  const loopback = isLoopbackHost(host);
  const lan = isLanHost(host);
  if (!loopback && !lan) {
    return fail("COLD-START-NOT-LOCAL", "A cold start accepts a literal loopback or LAN IP. A public host is not dialed.", {
      hole_punch: false,
    });
  }
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && host !== "::1" && host !== "0:0:0:0:0:0:0:1") {
    return fail("COLD-START-NOT-LOCAL", "A cold start does not resolve a name. Give a literal loopback or LAN IP.", {
      hole_punch: false,
    });
  }
  const punched = classifyPeerUrl(text, { role: "direct" });
  if (!punched.ok) {
    return fail(punched.code || "FED-MESH-BAD-INPUT", punched.message || "Starting address refused.", { hole_punch: false });
  }
  if (!url.port) {
    return fail("FED-MESH-BAD-INPUT", "A starting address needs an explicit port.");
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/" && path !== DISCOVER_PATH) {
    return fail("FED-MESH-BAD-INPUT", "A starting address is the peer origin or its discover path.");
  }
  const origin = `${url.protocol}//${url.host}`;
  const discoverUrl = `${origin}${DISCOVER_PATH}`;
  return {
    ok: true,
    code: "MESH-OK",
    spec: COLD_START_SPEC,
    discoverUrl,
    origin,
    loopback,
    lan: lan === true && loopback !== true,
    mode: loopback ? "loopback" : "direct-lan",
    fetched: false,
    invented_address: false,
    hole_punch: false,
    public_icann: false,
  };
}

/**
 * second_device only when the packet was not loopback and the two machine ids differ.
 * A posted same_machine_id is ignored. Matching ids never qualify.
 */
export function deliveryWatch({ machineId, peerMachineId, loopback, arrived } = {}) {
  const local = typeof machineId === "string" ? machineId : "";
  const peer = typeof peerMachineId === "string" ? peerMachineId : "";
  const same = local.length > 0 && local === peer;
  const crossed = loopback !== true && arrived === true;
  const watch = {
    mock: false,
    left_machine: crossed,
    arrived_other_machine: crossed,
    same_machine_id: same || !local || !peer ? true : false,
    machine_id: local,
    peer_machine_id: peer,
  };
  if (same) watch.same_machine_id = true;
  return {
    watch,
    second_device: watchQualifies(watch) === true,
    same_machine: same,
    machine_id: local || null,
    peer_machine_id: peer || null,
  };
}

async function postJson(fetchImpl, url, body) {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  if (text.length > BODY_CAP) {
    return { ok: false, code: "FED-MESH-TOO-LARGE", message: "Peer body is over the cold-start cap." };
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : { ok: false, code: "FED-MESH-BAD-INPUT" };
  } catch {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Peer did not return JSON." };
  }
}

/**
 * @param {ReturnType<import("./track2.js").createTrack2>} track2
 * @param {{ fetchImpl?: typeof fetch, machineId?: string|null }} [opts]
 */
export function createColdStart(track2, opts = {}) {
  if (!track2 || typeof track2.beacon !== "function" || typeof track2.ingest !== "function") {
    throw new Error("Cold start needs a Track 2 node.");
  }
  const fetchImpl = typeof opts.fetchImpl === "function" ? opts.fetchImpl : fetch;
  const machineId = typeof opts.machineId === "string" ? opts.machineId : "";
  let supplied = null;
  let accepted = false;
  let fetches = 0;

  function record() {
    return {
      spec: COLD_START_SPEC,
      fetches,
      fetched_public_mesh: false,
      invented_address: false,
      invented_peers: false,
      public_deployment: false,
      public_door: "FG-STUB",
      paid_satellite: "HELD",
      paid_satellite_held: PAID_SATELLITE_HELD.held === true,
      paid_satellite_spend: PAID_SATELLITE_HELD.spend === true,
      updater: "OFF",
      live: false,
      live_multi_provider: false,
      cold_shelf_live: false,
      needs_starting_address: accepted !== true,
      starting_address_supplied: supplied != null,
      starting_address_accepted: accepted === true,
      bootstrap_list_needs_starting_address: true,
      second_device: false,
      hole_punch: false,
      public_icann: false,
      ...qnmNamedLive(),
    };
  }

  function allowedDial(url) {
    if (!supplied) return false;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (`${parsed.protocol}//${parsed.host}` !== supplied.origin) return false;
    const path = parsed.pathname.replace(/\/+$/, "");
    return path === DISCOVER_PATH || path === "/v1/fed-mesh/peer-session" || path === "/v1/fed-mesh/peer";
  }

  async function fetchLocal(url, init) {
    if (!allowedDial(url)) {
      const err = new Error("Dial refused a URL that is not the supplied local peer.");
      err.code = "COLD-START-NOT-LOCAL";
      throw err;
    }
    fetches += 1;
    return fetchImpl(url, init);
  }

  return {
    record,
    async supply(raw) {
      const classified = classifyStartingAddress(raw);
      if (!classified.ok) return { ...classified, fetches, ...record(), needs_starting_address: true, starting_address_accepted: false };
      supplied = classified;
      accepted = false;
      return {
        ok: true,
        code: "MESH-OK",
        op: "cold_supply",
        ...record(),
        needs_starting_address: true,
        starting_address_accepted: false,
        mode: classified.mode,
        loopback: classified.loopback,
        lan: classified.lan,
        message: "Address stored. Nothing was dialed.",
      };
    },
    async dial() {
      if (!supplied) {
        return fail("COLD-START-NEEDS-ADDRESS", "No starting address. Nothing was dialed.", { fetches, ...record() });
      }
      let last = null;
      for (let round = 0; round < 2; round += 1) {
        const mine = await track2.beacon("lan");
        if (!mine.ok) return { ...mine, ...record(), cold_start: true };
        let body;
        try {
          body = await postJson(fetchLocal, supplied.discoverUrl, mine.beacon);
        } catch (err) {
          if (err && err.code === "COLD-START-NOT-LOCAL") {
            return fail("COLD-START-NOT-LOCAL", err.message, { fetches });
          }
          return fail("FED-MESH-NO-ROUTE", "The starting address did not answer. NAT punch is not a fallback.", {
            fetches,
            detail: String(err && err.message ? err.message : err),
            hole_punch: false,
          });
        }
        if (!body || body.ok !== true || !body.beacon) {
          return fail(body && body.code ? body.code : "FED-MESH-NO-ROUTE", (body && body.message) || "Peer did not return a beacon.", {
            fetches,
          });
        }
        last = await track2.ingest(body.beacon);
        if (!last.ok) return { ...last, ...record(), fetches };
      }
      const mutual = last && last.mutual === true;
      accepted = mutual === true;
      const peers = [...track2.state.roster.values()]
        .filter((row) => row.verified === true && row.mutual === true && row.presence !== "isolated")
        .map((row) => ({ handle: row.handle, public_key: row.public_key }));
      const signed = await track2.bootstrapList(peers);
      const checked = signed && signed.list ? await verifyBootstrapPeerList(signed.list) : { ok: false };
      return {
        ok: mutual === true && signed.ok === true && checked.ok === true,
        code: mutual ? "MESH-OK" : "FED-MESH-NO-ROUTE",
        op: "cold_dial",
        ...record(),
        mode: supplied.mode,
        loopback: supplied.loopback === true,
        lan: supplied.lan === true,
        mutual: mutual === true,
        fetches,
        signed_peers: peers.length,
        signed_list_needs_starting_address: signed.needs_starting_address === true,
        signed_list_live: signed.live === true,
        signed_list_verified: checked.ok === true,
        discovery_live: track2.status().ok === true && track2.status().carriers.lan.live === true,
        message: mutual
          ? "The supplied address answered with a verified beacon. The signed list still needs a starting address."
          : "The peer did not become a mutual verified beacon.",
      };
    },
    async deliver({ plaintext, peerMachineId } = {}) {
      if (accepted !== true || !supplied) {
        return fail("COLD-START-NEEDS-ADDRESS", "Delivery waits until the starting address has been verified. Nothing was sent.", {
          fetches,
        });
      }
      const peer = [...track2.state.roster.values()].find((row) => row.verified === true && row.mutual === true && row.presence !== "isolated");
      if (!peer) return fail("MESH-NO-ROUTE", "No mutual peer to deliver to.", { fetches });
      const allowed = track2.allowSession(peer.handle);
      if (!allowed.ok) return { ...allowed, ...record() };
      const directUrl = `${supplied.origin}/v1/fed-mesh/direct`;
      const offered = await track2.offer(peer.handle, { directUrl });
      if (!offered.ok) return { ...offered, ...record(), fetches };
      let acceptedOffer;
      try {
        acceptedOffer = await postJson(fetchLocal, `${supplied.origin}/v1/fed-mesh/peer-session`, offered.offer);
      } catch (err) {
        return fail("FED-MESH-NO-ROUTE", "The peer did not accept the session.", {
          fetches,
          detail: String(err && err.message ? err.message : err),
        });
      }
      if (!acceptedOffer || acceptedOffer.ok !== true || !acceptedOffer.offer) {
        return fail(acceptedOffer && acceptedOffer.code ? acceptedOffer.code : "FED-MESH-NO-ROUTE", (acceptedOffer && acceptedOffer.message) || "Session was not accepted.", {
          fetches,
        });
      }
      const done = await track2.complete(acceptedOffer.offer);
      if (!done.ok) return { ...done, ...record(), fetches };
      const text = String(plaintext ?? "");
      if (!text) return fail("FED-MESH-BAD-INPUT", "A cold-start share needs plaintext.", { fetches });
      const sent = await track2.send(done.session_id, text);
      if (!sent.ok) return { ...sent, ...record(), fetches };
      const envelope = sent.envelope;
      if (!envelope || envelope.plaintext || envelope.body || envelope.payload) {
        return fail("MESH-NO-BYTES", "The share on the wire must be ciphertext only.", { fetches, sent: false });
      }
      const wire = JSON.stringify(envelope);
      if (wire.includes(text)) {
        return fail("MESH-NO-BYTES", "Plaintext appeared in the share envelope.", { fetches, sent: false });
      }
      let opened;
      try {
        opened = await postJson(fetchLocal, `${supplied.origin}/v1/fed-mesh/peer`, envelope);
      } catch (err) {
        return fail("FED-MESH-NO-ROUTE", "The peer did not take the share.", {
          fetches,
          detail: String(err && err.message ? err.message : err),
        });
      }
      const arrived = opened && opened.ok === true && opened.plaintext === String(plaintext ?? "");
      const measured = deliveryWatch({
        machineId,
        peerMachineId: typeof peerMachineId === "string" ? peerMachineId : "",
        loopback: supplied.loopback === true,
        arrived,
      });
      const plaintextHash = await sha256Hex(text);
      const ciphertextHash = await sha256Hex(String(envelope.ciphertext || ""));
      return {
        ok: arrived === true,
        code: arrived ? "MESH-OK" : opened && opened.code ? opened.code : "FED-MESH-NO-ROUTE",
        op: "cold_deliver",
        ...record(),
        mode: supplied.mode,
        origin: supplied.origin,
        loopback: supplied.loopback === true,
        lan: supplied.lan === true,
        bearer_mode: done.bearer_mode || supplied.mode,
        route_class: done.route_class || null,
        fetches,
        plaintext_sha256: plaintextHash,
        ciphertext_sha256: ciphertextHash,
        plaintext_on_wire: false,
        plaintext_returned: opened ? opened.plaintext != null : false,
        second_device: measured.second_device === true,
        same_machine: measured.same_machine === true,
        machine_id: measured.machine_id,
        peer_machine_id: measured.peer_machine_id,
        physical_devices: measured.same_machine ? 1 : null,
        public_deployment: false,
        radio_phy: false,
        peer_exchange_wifi: false,
        peer_exchange_bluetooth: false,
        peer_exchange_rf: false,
        peer_exchange_photon: false,
        message: arrived
          ? "Sealed share delivered to the supplied address. second_device follows the machine ids."
          : "The peer did not open the share.",
      };
    },
  };
}
