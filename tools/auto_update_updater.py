"""AUTO-UPDATE-1.0 Python twin of src/auto-update/{updater,mesh-peer,triggers}.js.
Same codes and the same lattice primary/secondary tips. Default OFF. live stays false.
Channel acceptance is ACCEPTED_CHANNELS in auto_update_verify.py. An empty release key
refuses UPDATE-NO-KEY and does not fetch. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
"""
import copy
import hashlib

try:
    from . import auto_update_verify as V
except ImportError:
    import auto_update_verify as V

UPDATER_SPEC = "AZ-AUTO-UPDATE-1.0"
GENESIS = "0" * 64
MESH_CARRIER_ORDER = ("lan", "wifi", "bluetooth", "rf", "photon")
C = {
    "off": "UPDATE-OFF",
    "paused": "UPDATE-PAUSED",
    "hash": "UPDATE-HASH",
    "health": "UPDATE-HEALTH",
    "carrier": "UPDATE-CARRIER-ABSENT",
    "ok": "UPDATE-OK",
    "noKey": "UPDATE-NO-KEY",
}


def _h(s):
    return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()


def initial_state(product, installed_seq=0):
    return {
        "product": product, "installed_seq": installed_seq, "floor_seq": installed_seq, "paused": False,
        "manifest_hash": None, "last_check": None, "last_applied": None, "last_code": None, "tips": None,
        "served_manifest": None,
    }


def status(state, enabled=False, public_key=None):
    return {
        "enabled": enabled is True, "paused": bool(state.get("paused")), "key_pinned": bool(public_key),
        "last_check": state.get("last_check"), "last_applied": state.get("last_applied"),
        "last_code": state.get("last_code"), "live": False,
    }


def plan_lattice(document_hash, offline, username, tips):
    t = tips if tips and all(isinstance(tips.get(k), str) and len(tips[k]) == 64 for k in ("primary", "secondary")) else {"primary": GENESIS, "secondary": GENESIS}
    primary = _h(V.canon({"document": document_hash, "prev": t["primary"]}))
    if offline is True:
        secondary = _h(V.canon({"primary": document_hash, "username": username}))
    else:
        secondary = _h(V.canon({"offline": False, "prev": t["secondary"], "primary": primary}))
    return {"primary": primary, "secondary": secondary}


def update_receipt(host, state, doc):
    handle = "node-" + _h(str(getattr(host, "node_id", None) or "unknown"))[:16]
    document_hash = _h(V.canon({"kind": "update", "spec": UPDATER_SPEC, **doc}))
    lat = plan_lattice(document_hash, getattr(host, "offline", False) is True, handle, state.get("tips"))
    state["tips"] = {"primary": lat["primary"], "secondary": lat["secondary"]}
    row = {"kind": "update", **doc, "lattice": lat}
    if getattr(host, "write_receipt", None):
        host.write_receipt(row)
    return row


def pause(host):
    s = host.load()
    s["paused"] = True
    host.save(s)
    return status(s, host.enabled)


def resume(host):
    s = host.load()
    s["paused"] = False
    host.save(s)
    return status(s, host.enabled)


def _paused_now(host):
    try:
        cur = host.load()
        return (not cur) or cur.get("paused") is True
    except Exception:
        return True


def _rollback(host, state):
    try:
        host.rollback()
        return "rolled_back"
    except Exception:
        state["paused"] = True
        return "rollback_failed"


def apply_offer(host, offer, source, fetch_bytes, public_key=V.RELEASE_PUBLIC_KEY):
    s = host.load()
    at = host.now()
    s["last_check"] = at
    m = offer.get("manifest") if isinstance(offer, dict) else None
    to_seq = m["version_seq"] if isinstance(m, dict) and V.sint(m.get("version_seq")) else None

    def done(code, manifest_hash=None, outcome="refused"):
        s["last_code"] = code
        row = update_receipt(host, s, {
            "product": s["product"], "from_seq": s["installed_seq"], "to_seq": to_seq,
            "manifest_hash": manifest_hash, "source": source, "outcome": outcome, "code": code, "at": at,
        })
        host.save(s)
        return {"ok": code == C["ok"], "code": code, "row": row, "live": False}

    if host.enabled is not True:
        return done(C["off"])
    if s.get("paused"):
        return done(C["paused"])
    if not public_key:
        return done(C["noKey"])
    try:
        v = V.verify_manifest(m, offer.get("signature") if isinstance(offer, dict) else None, s, public_key)
    except Exception:
        v = {"ok": False, "code": "UPDATE-MANIFEST-SHAPE"}
    if not v["ok"]:
        return done(v["code"])
    try:
        data = fetch_bytes(m)
    except Exception:
        data = None
    if not isinstance(data, (bytes, bytearray)) or len(data) != m["artifact"]["size"] or _h(bytes(data)) != m["artifact"]["sha256"]:
        return done(C["hash"], v["manifest_hash"])
    if _paused_now(host):
        s["paused"] = True
        return done(C["paused"], v["manifest_hash"])
    try:
        host.stage(bytes(data), m)
        host.swap()
        if not host.health_check():
            raise RuntimeError("health")
        if _paused_now(host):
            s["paused"] = True
            return done(C["paused"], v["manifest_hash"], _rollback(host, s))
    except Exception:
        return done(C["health"], v["manifest_hash"], _rollback(host, s))
    s["installed_seq"] = m["version_seq"]
    s["floor_seq"] = max(s["floor_seq"], s["installed_seq"])
    s["manifest_hash"] = v["manifest_hash"]
    s["served_manifest"] = {"manifest": m, "signature": offer["signature"]}
    s["last_applied"] = at
    return done(C["ok"], v["manifest_hash"], "applied")


def check_online(host, public_key=V.RELEASE_PUBLIC_KEY):
    try:
        offer = host.fetch_release()
    except Exception:
        offer = None
    return apply_offer(host, offer, "online", host.fetch_artifact, public_key)


def probe_internet(opener=None, url="https://github.com/AzielEliab/aziel-runtime", timeout=2.0):
    if opener is False:
        return {"ok": False, "reachable": False, "code": "UPDATE-NO-REACH-PROBE", "live": False}
    if callable(opener):
        try:
            opener(url, timeout)
            return {"ok": True, "reachable": True, "code": "UPDATE-REACHABLE", "live": False}
        except Exception:
            return {"ok": False, "reachable": False, "code": "UPDATE-INTERNET-UNREACHABLE", "live": False}
    try:
        import urllib.request
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=timeout) as res:
            status = getattr(res, "status", 0) or 0
        reachable = 100 <= status < 600
        return {"ok": reachable, "reachable": reachable, "code": "UPDATE-REACHABLE" if reachable else "UPDATE-INTERNET-UNREACHABLE", "live": False}
    except Exception:
        return {"ok": False, "reachable": False, "code": "UPDATE-INTERNET-UNREACHABLE", "live": False}


def on_internet_reach(host, public_key=V.RELEASE_PUBLIC_KEY):
    if getattr(host, "enabled", False) is not True:
        return {"ok": False, "code": "UPDATE-OFF", "trigger": "internet", "enabled": False, "live": False, "applied": False}
    if not public_key:
        return {"ok": False, "code": "UPDATE-NO-KEY", "trigger": "internet", "live": False, "applied": False, "enabled": True}
    probe = getattr(host, "internet_reachable", None)
    if callable(probe):
        try:
            up = probe() is True
        except Exception:
            up = False
        code = "UPDATE-INTERNET-UNREACHABLE"
    else:
        probed = probe_internet(getattr(host, "probe_opener", None))
        up = probed.get("reachable") is True
        code = probed.get("code") or "UPDATE-INTERNET-UNREACHABLE"
    if not up:
        return {"ok": False, "code": code, "trigger": "internet", "live": False, "applied": False, "enabled": True}
    out = check_online(host, public_key)
    out["trigger"] = "internet"
    out["live"] = False
    return out


def on_peer_contact(host, public_key=V.RELEASE_PUBLIC_KEY):
    if getattr(host, "enabled", False) is not True:
        return {"ok": False, "code": "UPDATE-OFF", "trigger": "mesh", "enabled": False, "live": False, "applied": False}
    if not public_key:
        return {"ok": False, "code": "UPDATE-NO-KEY", "trigger": "mesh", "live": False, "applied": False, "enabled": True}
    carrier = None
    for cid in MESH_CARRIER_ORDER:
        try:
            if host.carrier_present(cid):
                carrier = cid
                break
        except Exception:
            pass
    def refuse(code, source):
        s = host.load()
        s["last_code"] = code
        update_receipt(host, s, {
            "product": s["product"], "from_seq": s["installed_seq"], "to_seq": None, "manifest_hash": None,
            "source": source, "outcome": "refused", "code": code, "at": host.now(),
        })
        host.save(s)
        return {"ok": False, "code": code, "carrier": carrier, "trigger": "mesh", "live": False, "applied": False, "enabled": True}

    if not carrier:
        return refuse(C["carrier"], "mesh:none")
    try:
        hello = host.peer_hello(carrier)
    except Exception:
        hello = None
    if isinstance(hello, dict) and hello.get("refused") is True:
        code = hello.get("code") if isinstance(hello.get("code"), str) and hello.get("code", "").startswith("UPDATE-") else "UPDATE-PEER-NO-ROUTE"
        return refuse(code, "mesh:" + carrier)
    if not isinstance(hello, dict):
        return refuse("UPDATE-PEER-NO-ROUTE", "mesh:" + carrier)
    s = host.load()
    if hello.get("product") != s["product"] or not V.sint(hello.get("version_seq")) or hello["version_seq"] <= s["installed_seq"]:
        return {"ok": True, "code": "UPDATE-PEER-NOT-NEWER", "carrier": carrier, "applied": False, "trigger": "mesh", "live": False, "enabled": True}
    fetched = host.peer_fetch(carrier, hello.get("manifest"))
    if isinstance(fetched, dict) and fetched.get("refused") is True:
        code = fetched.get("code") if isinstance(fetched.get("code"), str) and fetched.get("code", "").startswith("UPDATE-") else "UPDATE-PEER-NO-ARTIFACT"
        return refuse(code, "mesh:" + carrier)
    r = apply_offer(host, {"manifest": hello.get("manifest"), "signature": hello.get("signature")}, "mesh:" + carrier, lambda m: fetched, public_key)
    return dict(r, carrier=carrier, trigger="mesh", live=False, enabled=True)


class FileStateHost:
    """On-device JSON state + receipts JSONL. AZ-OS and AZInterface repos can vendor this. enabled defaults false."""

    def __init__(self, path, product, enabled=False, node_id="device", installed_seq=0):
        import json
        import os
        self._json, self._os, self.path, self.product = json, os, path, product
        self.enabled, self.node_id, self.offline = enabled is True, node_id, False
        self._seq = installed_seq

    def load(self):
        try:
            with open(self.path) as f:
                return self._json.load(f)
        except (OSError, ValueError):
            return initial_state(self.product, self._seq)

    def save(self, s):
        d = self._os.path.dirname(self.path)
        if d:
            self._os.makedirs(d, exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w") as f:
            self._json.dump(s, f)
        self._os.replace(tmp, self.path)

    def write_receipt(self, row):
        with open(self.path + ".receipts.jsonl", "a") as f:
            f.write(self._json.dumps(row) + "\n")

    def now(self):
        import datetime
        return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
