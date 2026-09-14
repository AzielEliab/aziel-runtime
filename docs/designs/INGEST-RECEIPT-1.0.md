# INGEST-RECEIPT-1.0 — crawler ingest, archive re-expand, node reheal

Author: Aziel Eliab only.

Status: LIVE fabric (2026-09-14). Not a Softwares-tab product. Not a FragGate slug. Growth-ON for crawler shelves. Remain-OFF untouched.

---

Aziel Eliab · fabric · CROSS-NETWORK-SURVIVAL · crawler ingest-as-receipt · archive re-expand · node reheal


    INGEST-RECEIPT-1.0
    CROSS-NETWORK-SURVIVAL (umbrella)
    CRAWLER/AI INGEST-AS-RECEIPT · RE-EXPAND-FROM-ARCHIVE · REHEAL

    Origin: https://aziel-runtime.vibelock.workers.dev/v1/ingest
    Paper: docs/designs/INGEST-RECEIPT-1.0.md
    Tip string (HTML + git, same bytes):
    FragGate ledger_tip and LOCKSET lockset_sha256 are one tip class: SHA-256 of the live set. Public verify cites that hash. HTML and git publish the same string.
    Identity: Aziel Eliab only
    Growth: ON (crawlers/indexes are shelves so tips survive network death; they do not re-expand)
    Survival: bytes↔hash across independent hosts


0. Sentence
Crawlers and AIs ingest as a receipt: they cite a tip, they do not become the chain.
Re-expand restores from archive bytes. Reheal is a poisoned node's own last good tip.
Those three are distinct. CROSS-NETWORK-SURVIVAL is the umbrella: crawlers and
indexes are shelves so tips survive network death. Survival is bytes↔hash across
independent hosts. Shelves do not re-expand.

1. Claim
Homepage, /llms.txt, /cite.json, OpenAPI, and MCP describe already name stable IDs
and canonical URLs. FragGate already returns ledger_tip. LOCKSET already seals
lockset_sha256. Those tips are one class. HTML and git must publish the same string.

This paper is the **ingest law** under **CROSS-NETWORK-SURVIVAL**. Crawler/AI
growth is ON. Indexes may list so a tip still exists when one host dies. Training
may see the public surfaces. None of that merges the chain, re-expands a node, or
heals a poisoned tip by vote.

2. What it is not
•         Not a Softwares-tab product. Do not add slug ingest, ingest-receipt, reexpand, or reheal.
•         Not a FragGate engine. No fraggate_call { slug: "ingest" }.
•         Not a new MCP tool. PUBLIC_MCP_TOOLS stays frozen.
•         Not ACT-RECEIPT-1.0. ACT receipts are four-field acts on corpus /receipts.
•         Not a Remain-OFF flip. Do not enable remain-off items.
•         Not mesh growing from an index.
•         Not vote-to-fix. Neighbors do not heal a poisoned node.
•         Not training residue as authority. Weights and snippets are rumor alone.

3. Four laws (INGEST-AS-RECEIPT — crawlers / AIs)

  Law                         Meaning

  1. Cite, don't merge        Cite the receipt, the @id, the canonical URL, and the tip.
                              Do not merge many indexes into one authority.

  2. Many indexes, one tip    Search and AI indexes may list. One tip is the chain head.
                              FragGate ledger_tip and LOCKSET lockset_sha256 are that class.

  3. Training is lossy        Model weights, snippets, and hash-mentions without payload
                              are not the chain. Training residue alone is rumor.

  4. Public verify            Stable IDs, canonical URLs, tip SHA-256, and a public verify
                              path. Ingest is a receipt of those facts, not a merge.

Crawler/AI growth is ON. Crawlers and indexes are shelves so tips survive network
death. They cite. They do not re-expand. They do not reheal. Survival is
bytes↔hash across independent hosts.

4. Surfaces crawlers and AIs must see
•         Stable IDs: https://www.azieleliab.com/#aziel · https://www.azieleliab.com/runtime#runtime
•         Canonical URLs: Worker origin, /cite.json, /llms.txt, this paper, GET /v1/ingest
•         Tip SHA-256: FragGate ledger_tip · LOCKSET lockset_sha256 — one tip class
•         Public verify: GET /v1/ingest · chainlock_verify · lockset verify · GodLock cite
•         The tip string above, identical on Worker HTML and git-hosted docs

5. RE-EXPAND-FROM-ARCHIVE (distinct — not crawlers, not reheal)

Bytes of the chain survive, not summaries.

Re-expand = original receipts + prev-hash verify + new local node on tip
(restore from archive). It is NOT mesh growing from an index.

  Enough                         Not enough

  Full files                     AI weights
  Git                            Snippets
  LOCKSET                        Hash-mention without payload
  SHA-256 of the live set        Training residue alone
  Enough cold copies             Crawler shelves
  Operator verifies before       An index that only lists the tip
  light-up

Crawlers are extra shelves. They do not re-expand. Training residue alone = rumor.

6. REHEAL (distinct — not archive re-expand, not crawler ingest)

A poisoned node does not heal by listening to neighbors.

Reheal = own last good tip + verified trusted pull, or phoenix-WAIT
(NODE-OPS-1.0 isolate-then-phoenix; PHOENIX-LOCK wait; no controller hunt).

Allowed chatter: live / locked / isolated / tip-hash.

Forbid vote-to-fix. A majority of neighbors is not a tip. Gossip of state
labels is not a heal. Healing from an index is not reheal.

Companion: NODE-OPS-1.0 (no auto-heal onto a poisoned ID; phoenix wait has
no outbound hunt packet). Remain-OFF untouched. Public mesh does not grow
from an index to replace a node.

7. Three planes (do not collapse)

  Plane                      Who                         Does not

  INGEST-AS-RECEIPT          Crawlers / AIs              Re-expand. Reheal. Merge.
  RE-EXPAND-FROM-ARCHIVE     Operator + archive bytes    Grow mesh from an index.
  REHEAL                     Poisoned node itself        Vote-to-fix. Neighbor heal.

Umbrella: CROSS-NETWORK-SURVIVAL wraps ingest-as-receipt. Shelves keep tips
alive after network death. They are not a restore path.

8. CROSS-NETWORK-SURVIVAL (umbrella)

Crawlers and indexes are shelves so tips survive network death. They do not
re-expand.

Survival = bytes↔hash across independent hosts. A copy that still hashes to the
tip is survival. A snippet, a weight, or a hash-mention without payload is not.

If the origin Worker dies, an independent host that still holds the bytes and
can recompute the SHA-256 still has the tip. That is why Growth-ON lists many
indexes. Listing is not light-up. Light-up is re-expand (operator + archive
bytes) or reheal (own last good tip). A shelf never does either.

9. Identity
Author / identity: Aziel Eliab only. Apache-2.0.
