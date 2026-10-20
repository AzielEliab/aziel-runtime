// R5: IPv6 rate-limit keys use the /64; IPv4 and IPv4-mapped keep the address.
const root = new URL("../", import.meta.url).href;
await import(root + "src/index.js");
const { rateKeyOf, expandIpv6, rateLimitDecision } = await import(root + "src/production.js");
let n = 0; const ok = (c, m) => { n++; if (!c) { console.error("FAIL " + m); process.exit(1); } };
ok(rateKeyOf("203.0.113.9") === "203.0.113.9", "v4 unchanged");
ok(rateKeyOf("2001:db8:1:2:3:4:5:6") === "2001:0db8:0001:0002::/64", "v6 full");
ok(rateKeyOf("2001:db8:1:2::9") === rateKeyOf("2001:0db8:0001:0002:ffff:eeee:dddd:cccc"), "same /64 same key");
ok(rateKeyOf("2001:db8:1:3::9") !== rateKeyOf("2001:db8:1:2::9"), "different /64 different key");
ok(rateKeyOf("[2001:DB8:1:2::1]") === "2001:0db8:0001:0002::/64", "brackets + case");
ok(rateKeyOf("fe80::1%eth0") === "fe80:0000:0000:0000::/64", "zone id dropped");
ok(rateKeyOf("::ffff:203.0.113.9") === "203.0.113.9", "v4-mapped -> v4");
ok(rateKeyOf("::") === "0000:0000:0000:0000::/64", "unspecified");
ok(rateKeyOf("local") === "local" && rateKeyOf(null) === "local", "non-ip passthrough");
ok(expandIpv6("1::2::3") === null && expandIpv6("12345::") === null && expandIpv6("1:2:3") === null, "invalid v6 rejected");
ok(rateKeyOf("1::2::3") === "1::2::3", "invalid v6 passthrough");
// end to end: rotating addresses inside one /64 shares one bucket
const env = {};
let last;
for (let i = 0; i < 200; i++) {
  const req = new Request("https://runtime.test/v1/session/exec", { headers: { "cf-connecting-ip": `2001:db8:aa:bb::${(i + 1).toString(16)}` } });
  last = await rateLimitDecision(env, req, "exec");
  if (!last.ok) break;
}
ok(last && last.ok === false, "rotating within a /64 is rate-limited");
ok(last.rate_key === "2001:0db8:00aa:00bb::/64", "decision reports rate_key");
const other = await rateLimitDecision(env, new Request("https://runtime.test/v1/session/exec", { headers: { "cf-connecting-ip": "2001:db8:aa:bc::1" } }), "exec");
ok(other.ok, "neighbouring /64 has its own bucket");
console.log(`ok rate key v6 /64: ${n} checks`);
