"""AZ-UPDATE-MANIFEST-1.0 Python twin of src/auto-update/manifest.js. Same hash, same codes. Fail closed.
Usage: python3 tools/auto_update_verify.py <case.json>  (prints {"code":..,"manifest_hash":..})
Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0"""
import base64, hashlib, json, re, sys

SPEC = "AZ-UPDATE-MANIFEST-1.0"
RELEASE_PUBLIC_KEY = None  # placeholder: refuse until Aziel holds the key
HEX64, HEX40 = re.compile(r"^[a-f0-9]{64}$"), re.compile(r"^[a-f0-9]{40}$")
KEYS = sorted(["artifact", "channel", "git_sha", "issued_at", "prev_manifest_hash", "product", "spec", "version", "version_seq"])
MAXI = 2 ** 53 - 1


def canon(v):
    if v is None: return "null"
    if v is True: return "true"
    if v is False: return "false"
    if isinstance(v, int): return str(v)
    if isinstance(v, float):
        if v != v or v in (float("inf"), float("-inf")): raise ValueError("non-finite")
        return str(int(v)) if v.is_integer() and abs(v) < 1e21 else json.dumps(v)
    if isinstance(v, str): return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list): return "[" + ",".join(canon(x) for x in v) + "]"
    if isinstance(v, dict): return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canon(v[k]) for k in sorted(v)) + "}"
    raise ValueError("cannot canonicalize")


def sint(x): return isinstance(x, int) and not isinstance(x, bool) and abs(x) <= MAXI


def shape_ok(m):
    if not isinstance(m, dict) or sorted(m) != KEYS: return False
    a = m["artifact"]
    return (m["spec"] == SPEC and isinstance(m["product"], str) and re.fullmatch(r"[a-z0-9-]{1,64}", m["product"]) is not None
            and isinstance(m["version"], str) and len(m["version"]) <= 40 and sint(m["version_seq"]) and m["version_seq"] > 0
            and isinstance(m["git_sha"], str) and HEX40.match(m["git_sha"]) is not None and m["channel"] in ("stable", "rc")
            and isinstance(m["issued_at"], str)
            and (m["prev_manifest_hash"] is None or (isinstance(m["prev_manifest_hash"], str) and HEX64.match(m["prev_manifest_hash"]) is not None))
            and isinstance(a, dict) and sorted(a) == ["name", "sha256", "size"] and isinstance(a["name"], str)
            and sint(a["size"]) and a["size"] >= 0 and isinstance(a["sha256"], str) and HEX64.match(a["sha256"]) is not None)


def b64u(s): return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sig_ok(pub, m, sig):
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        Ed25519PublicKey.from_public_bytes(b64u(pub)).verify(b64u(sig), canon(m).encode())
        return True
    except Exception:
        return False  # includes missing library: fail closed


def manifest_hash(m): return hashlib.sha256(canon(m).encode()).hexdigest()


def verify_manifest(m, sig, state, public_key=RELEASE_PUBLIC_KEY):
    if not public_key: return {"ok": False, "code": "UPDATE-NO-KEY"}
    if not shape_ok(m): return {"ok": False, "code": "UPDATE-MANIFEST-SHAPE"}
    if not state or m["product"] != state.get("product"): return {"ok": False, "code": "UPDATE-PRODUCT"}
    if not isinstance(sig, str) or not sig_ok(public_key, m, sig): return {"ok": False, "code": "UPDATE-SIG"}
    if m["version_seq"] <= max(int(state.get("installed_seq") or 0), int(state.get("floor_seq") or 0)):
        return {"ok": False, "code": "UPDATE-DOWNGRADE"}
    return {"ok": True, "code": "UPDATE-OK", "manifest_hash": manifest_hash(m)}


if __name__ == "__main__":
    c = json.load(open(sys.argv[1]))
    print(json.dumps(verify_manifest(c["manifest"], c.get("signature"), c.get("state"), c.get("public_key"))))
