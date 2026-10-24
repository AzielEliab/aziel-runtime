"""Parity driver for verify-auto-update-adoption.mjs. Replays one scripted scenario. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import auto_update_updater as U


class Host:
    def __init__(self, c):
        self.enabled, self.node_id, self.offline = c["enabled"], c["node_id"], c.get("offline", False)
        self.state = U.initial_state(c["product"], c["installed_seq"])
        self.t = 0
        self.rows = []
        self.rel, self.healthy, self.reach = None, c.get("healthy", True), c.get("reach")
        self.active, self.prev, self.staged = "a", None, None

    def now(self):
        v = "2026-10-22T12:00:%02dZ" % self.t
        self.t += 1
        return v

    def load(self):
        return copy.deepcopy(self.state)

    def save(self, s):
        self.state = copy.deepcopy(s)

    def write_receipt(self, r):
        self.rows.append(r)

    def fetch_release(self):
        return self.rel and {"manifest": self.rel["manifest"], "signature": self.rel["signature"]}

    def fetch_artifact(self, m):
        return self.rel["bytes"].encode()

    def stage(self, b, m):
        self.staged = b

    def swap(self):
        self.prev, self.active = self.active, self.staged

    def health_check(self):
        return self.healthy

    def rollback(self):
        self.active = self.prev

    def internet_reachable(self):
        return self.reach


c = json.load(open(sys.argv[1]))
h = Host(c)
out = []
for step in c["steps"]:
    if step.get("op") == "pause":
        U.pause(h)
        out.append("paused")
        continue
    if step.get("op") == "resume":
        U.resume(h)
        out.append("resumed")
        continue
    h.rel = step.get("rel")
    h.reach = step.get("reach", h.reach)
    out.append(U.on_internet_reach(h, c["public_key"])["code"])
print(json.dumps({"codes": out, "tips": h.state["tips"], "installed_seq": h.state["installed_seq"], "rows": len(h.rows)}))
