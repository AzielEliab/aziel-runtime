/**
 * LEG-CLIENT-IP-1.0: X-Azrt-Client-IP is trusted only over the service binding (no CF-Connecting-IP),
 * stripped and ignored on public ingress; rate-limit buckets differ per leg client over the binding.
 * Also: signed tips go to AZInterface as well as AZ-OS (pushAllLegs), and an absent binding fails closed.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { clientIp, isIpLiteral, viaServiceBinding, stripLegClientIpOnPublicIngress, rateLimitDecision, LEG_CLIENT_IP_HEADER } from "../src/production.js";
import { pushAllLegs, tetherKey, TETHER_ROUTE, TETHER_AZINTERFACE_ORIGIN, TETHER_AZOS_ORIGIN } from "../src/azos-tether.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { sealRefusal } from "../src/receipt-guard.js";
import { verifyLattice, LATTICE_GENESIS } from "../src/dual-lattice.js";

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const req = (h) => new Request("https://aziel-runtime.example/v1/fraggate/call", { method: "POST", headers: h });

// 1. public ingress: CF-Connecting-IP wins; the leg header is ignored and stripped
const pub = req({ "CF-Connecting-IP": "203.0.113.9", [LEG_CLIENT_IP_HEADER]: "198.51.100.1" });
ok(!viaServiceBinding(pub), "public ingress detected");
ok(clientIp(pub) === "203.0.113.9", "public: CF-Connecting-IP, leg header ignored");
const stripped = stripLegClientIpOnPublicIngress(pub);
ok(!stripped.headers.has(LEG_CLIENT_IP_HEADER) && stripped.headers.get("CF-Connecting-IP") === "203.0.113.9", "public: leg header stripped");

// 2. binding: the leg header names the caller
const a = req({ [LEG_CLIENT_IP_HEADER]: "198.51.100.1" });
const b = req({ [LEG_CLIENT_IP_HEADER]: "2001:db8::7" });
ok(viaServiceBinding(a) && clientIp(a) === "198.51.100.1" && clientIp(b) === "2001:db8::7", "binding: leg header trusted");
ok(stripLegClientIpOnPublicIngress(a).headers.get(LEG_CLIENT_IP_HEADER) === "198.51.100.1", "binding: header kept");
ok(clientIp(req({ [LEG_CLIENT_IP_HEADER]: "not-an-ip; drop table" })) === "local", "binding: garbage header ignored");
ok(clientIp(req({})) === "local", "binding without header stays local");
for (const bad of ["", "1.2.3", "999.1.1.1", "a".repeat(50), "::1::2", "1.2.3.4, 5.6.7.8"]) ok(!isIpLiteral(bad), `not an IP: ${bad}`);

// 3. rate-limit buckets differ per leg client over the binding
const env = { __aziel_rate_limits: { fraggate_call: 2 } };
const t = 1_000_000;
ok(rateLimitDecision(env, a, "fraggate_call", t).ok && rateLimitDecision(env, a, "fraggate_call", t).ok, "client A: 2 calls");
ok(rateLimitDecision(env, a, "fraggate_call", t).ok === false, "client A: 3rd call limited");
const db = rateLimitDecision(env, b, "fraggate_call", t);
ok(db.ok === true && db.ip !== rateLimitDecision(env, a, "fraggate_call", t).ip, "client B over the same binding has its own bucket");
// public caller claiming A's IP in the leg header does not spend A's bucket
const spoof = req({ "CF-Connecting-IP": "203.0.113.50", [LEG_CLIENT_IP_HEADER]: "198.51.100.1" });
ok(rateLimitDecision(env, spoof, "fraggate_call", t).ip === "203.0.113.50", "public spoof keyed by its own CF IP");

// 4. through the real fetch handler: public ingress never sees the header downstream
const handler = (await import("../src/index.js")).default.fetch;
const res = await handler(new Request("https://aziel-runtime.example/v1/health", { headers: { "CF-Connecting-IP": "203.0.113.9", [LEG_CLIENT_IP_HEADER]: "198.51.100.1" } }), {});
ok(res.status === 200, "handler serves with the header present");

// 5. tips to both legs; absent AZInterface binding fails closed without blocking AZ-OS
const tenv = { TETHER_SIGNING_SEED: "22".repeat(32) /* test-only seed */, GIT_SHA: "c".repeat(40) };
const key = await tetherKey(tenv);
const receiver = (origin) => {
  const state = new Map(); const posts = [];
  const fetcher = async (url, init = {}) => {
    const u = new URL(url);
    assert.equal(u.origin, origin, "packet sent to the right leg");
    if (u.pathname === "/v1/tether" && (!init.method || init.method === "GET")) return Response.json({ ok: true, public_key: key.public_key, chains: [...state.values()] });
    if (u.pathname === TETHER_ROUTE) {
      const p = JSON.parse(init.body); posts.push(p.chain);
      const prev = state.get(p.chain);
      const res = await verifyLattice(p.rows, { pick: (r) => r, anchor: prev ? prev.tips : { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS }, legacyAllowed: false });
      if (!res.ok) return Response.json({ ok: false, code: "TETHER-LINK" }, { status: 409 });
      const row = { chain: p.chain, tips: res.tips, rows: (prev ? prev.rows : 0) + p.rows.length, verified: true };
      state.set(p.chain, row);
      return Response.json({ ok: true, stored: true, verified: true, chain: p.chain, tips: res.tips, rows: row.rows });
    }
    return new Response("nf", { status: 404 });
  };
  return { fetcher, posts, state };
};
const store = new MemoryStore();
await sealRefusal(store, { code: "FG-STUB", tool: "fraggate_call", slug: "embryolock", op: "wipe", args: { b: 2 }, minuteBucket: 3 });
const os = receiver(TETHER_AZOS_ORIGIN), ifc = receiver(TETHER_AZINTERFACE_ORIGIN);
let out = await pushAllLegs(tenv, { store, fetcher: os.fetcher, azinterfaceFetcher: ifc.fetcher });
ok(out.ok === true && out.legs.azos.updated === true && out.legs.azinterface.updated === true, "both legs stored the same tips");
ok(os.state.get("refusals").tips.primary === ifc.state.get("refusals").tips.primary, "same primary tip on both legs");
out = await pushAllLegs(tenv, { store, fetcher: receiver(TETHER_AZOS_ORIGIN).fetcher, azinterfaceFetcher: null });
ok(out.ok === true && out.legs.azinterface.code === "TETHER-AZINTERFACE-UNBOUND" && out.legs.azinterface.sent === false, "absent AZInterface binding: unbound, nothing sent, AZ-OS unaffected");
out = await pushAllLegs(tenv, { store, fetcher: receiver(TETHER_AZOS_ORIGIN).fetcher, azinterfaceFetcher: async () => { throw new Error("down"); } });
ok(out.legs.azos.updated === true && out.legs.azinterface.ok === false, "AZInterface down does not block AZ-OS");
console.log(`ok leg client ip + tips to both legs: ${n} checks`);
