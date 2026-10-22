"""AZ-UPDATE-MANIFEST-1.0 Python twin of src/auto-update/manifest.js. Same hash, same codes. Fail closed.
Usage: python3 tools/auto_update_verify.py <case.json>  (prints {"code":..,"manifest_hash":..})
Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0"""
import base64, hashlib, json, re, sys

SPEC = "AZ-UPDATE-MANIFEST-1.0"
# Pinned release key; private half only in GH Actions secret AUTO_UPDATE_SIGNING_KEY (aziel-runtime). fp = sha256(raw key)
RELEASE_PUBLIC_KEY = "_3mc9CfQWexUWcyqDadNoQLjb6fFFPRv_XfWirwuH9s"
RELEASE_KEY_FINGERPRINT = "822b409723b81a0dc3fe3f132a2cb95b72b1ec2b2b16c055c526b627132a4ce8"
RELEASE_KEY_PRODUCTS = ("aziel-runtime",)  # any other build with the pinned key, or a null key, refuses
ACCEPTED_CHANNELS = ("stable",)  # stable only; rc etc. -> UPDATE-CHANNEL-REFUSED
ARTIFACT_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
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
            and ARTIFACT_NAME.fullmatch(a["name"]) is not None and ".." not in a["name"]
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
    if public_key == RELEASE_PUBLIC_KEY and m["product"] not in RELEASE_KEY_PRODUCTS: return {"ok": False, "code": "UPDATE-NO-KEY"}
    if m["channel"] not in ACCEPTED_CHANNELS: return {"ok": False, "code": "UPDATE-CHANNEL-REFUSED"}
    if not isinstance(sig, str) or not sig_ok(public_key, m, sig): return {"ok": False, "code": "UPDATE-SIG"}
    def seq_ok(x): return x is None or (sint(x) and x >= 0)
    if not seq_ok(state.get("installed_seq")) or not seq_ok(state.get("floor_seq")): return {"ok": False, "code": "UPDATE-STATE"}
    if m["version_seq"] <= max(state.get("installed_seq") or 0, state.get("floor_seq") or 0):
        return {"ok": False, "code": "UPDATE-DOWNGRADE"}
    if isinstance(state.get("last_manifest_hash"), str) and m["prev_manifest_hash"] != state["last_manifest_hash"]:
        return {"ok": False, "code": "UPDATE-CHAIN"}
    return {"ok": True, "code": "UPDATE-OK", "manifest_hash": manifest_hash(m)}


if __name__ == "__main__":
    c = json.load(open(sys.argv[1]))
    print(json.dumps(verify_manifest(c["manifest"], c.get("signature"), c.get("state"), c["public_key"] if "public_key" in c else RELEASE_PUBLIC_KEY)))
