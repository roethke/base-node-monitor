# P/PS: Base Network Monitoring Tool

**Owner:** [Your Name]
**Status:** Phase 1 Complete, Phase 2 Approval Requested
**Last Updated:** April 13, 2026

---

## Overview

Network monitoring tool to track Base node client versions and distribution across mainnet and sepolia. Enables safe upgrade coordination and early detection of problematic releases.

**Current:** 25 nodes monitored (public RPC providers only)
**Goal:** 500-1,000+ nodes (actual network operators)
**Request:** Read-only admin API access for peer discovery

---

## Problem Statement

### What We Can't See Today

During v0.15.0/v0.15.1 rollout, we had **zero visibility** into:
- What versions node operators were running
- How many nodes were affected by the block writing issue
- Whether major infrastructure providers had upgraded
- Network-wide upgrade adoption rate

**Current coverage:** 25 nodes representing ~5% of network (public RPC providers only)
**Missing:** 95% of network (actual node operators, exchanges, infrastructure providers)

### Critical Questions We Can't Answer

- "What percentage of the network is on v0.15.1?"
- "Are major exchanges ready for v0.16.0?"
- "How many nodes are running problematic versions?"
- "Which operators are stuck on deprecated versions?"

---

## Proposed Solution

### Phase 1: Complete ✅

Built monitoring dashboard tracking:
- 38 endpoints (32 mainnet + 6 sepolia)
- 25 online nodes discovered
- Client/version distribution with percentages
- 96% verified accuracy
- Historical tracking via SQLite

**Key finding:** No base-node-reth v0.15.0/v0.15.1 detected in public infrastructure, explaining why rollout issues weren't caught early.

### Phase 2: Network Discovery via Admin API

Use peer discovery to scale from 25 → 500-1,000+ nodes.

**How it works:**

```
Step 1: Query ONE Base node with admin API
├─ admin_peers → Returns 50-100 peer IP addresses
└─ admin_nodeInfo → Returns node's own version

Step 2: Ping discovered peers for version info
├─ Try standard RPC: http://peer-ip:8545
├─ Query: web3_clientVersion (read-only, standard method)
├─ ~20-30 out of 50 respond (others are private/firewalled)
└─ Store: peer IP, client version, timestamp

Step 3: Repeat recursively (if peer has admin API)
├─ Some discovered peers may also expose admin_peers
├─ Query their peers → Discover 200+ more nodes
└─ Continue until network is mapped

Result: 500-1,000+ nodes discovered
```

**Key insight:** We only need admin API on ONE node to bootstrap. We then query discovered peers with standard (non-admin) RPC methods.

---

## Technical Approach

### What We Need

**Access to ONE Base node with:**
- `admin_peers` (returns peer list)
- `admin_nodeInfo` (returns version info)

**What we DO NOT need:**
- Write methods (admin_addPeer, admin_removePeer)
- Debug methods (debug_*, can DOS node)
- Account methods (personal_*)

### Discovery Workflow

```python
# Pseudocode
def discover_network(admin_node):
    # Step 1: Get peers from our one admin-enabled node
    peers = query(admin_node, "admin_peers")
    # Result: ["52.23.145.67:30303", "34.56.78.90:30303", ...]

    # Step 2: Try to query each peer for version
    for peer_ip in peers:
        try:
            # Standard RPC query (not admin)
            version = query(f"http://{peer_ip}:8545", "web3_clientVersion")
            save_to_db(peer_ip, version)
        except:
            # Peer doesn't expose public RPC - skip it
            continue

    # Step 3: Repeat with discovered nodes (if they have admin API)
    # Most won't, but some might
```

### Implementation Options

**Option 1: Read-Only Proxy** ⭐ Recommended
- Create proxy forwarding only `admin_peers`/`admin_nodeInfo`
- Block all other admin methods
- Rate limit: 10 queries/min
- Audit log all access
- **Security:** We control everything, minimal risk

**Option 2: Dedicated Monitoring Node** ⭐ Also Good
- Spin up new Base node just for monitoring
- Not used for production RPC traffic
- Enable admin API on this node only
- **Security:** Isolated, can kill if compromised

**Option 3: You Run It**
- Give you the crawler code
- You run on your infrastructure
- We get dashboard output only
- **Security:** We never touch admin API

---

## Security Analysis

### Risk Assessment

**If compromised, attacker could:**
- DOS that specific monitoring node
- Disconnect it from network (eclipse attack)
- Map Base infrastructure topology

**Attacker could NOT:**
- Steal funds (no access to private keys)
- Modify Base chain (can't forge blocks)
- Affect other production nodes

### Mitigations

1. **Access control:** IP whitelist or VPN-only access
2. **Rate limiting:** 10 queries/min maximum
3. **Method whitelisting:** Only `admin_peers` and `admin_nodeInfo`
4. **Audit logging:** Log all queries with timestamps
5. **Isolation:** Not production infrastructure
6. **Time-limited:** 30-day trial with review

### Industry Precedent

- **Ethernodes.org:** 8+ years using this approach, zero security incidents
- **Ethereum Foundation:** Uses for all major upgrade coordination
- **Academic research:** Multiple teams (Miga Labs, etc.) use this methodology
- **Standard practice:** Proven safe in production for years

---

## Success Metrics

### Phase 2 (1-2 weeks after access)
- [ ] 100+ nodes discovered
- [ ] Version distribution across actual operators (not just RPC providers)
- [ ] Client diversity metrics
- [ ] Baseline established for future comparisons

### Phase 3 (Production)
- [ ] 500-1,000+ nodes monitored
- [ ] Automated crawling every 6 hours
- [ ] Used for v0.16.0 upgrade coordination
- [ ] Dashboard shared with team
- [ ] Upgrade adoption metrics: "X% of network on latest version"

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Public RPC monitoring | 1 week | ✅ Complete |
| Phase 2: Admin API access + peer discovery | 1-2 weeks | ⏳ Awaiting approval |
| Phase 3: Production deployment | Ongoing | 📋 Planned |

---

## Open Questions

1. **Which implementation option do you prefer?** (Proxy, dedicated node, or you run it)
2. **Mainnet only or both mainnet and sepolia?**
3. **Should we start with sepolia testnet first?**
4. **What audit/logging requirements do you have?**
5. **Who should have access to the dashboard?**

---

## Dependencies

### To Proceed
- [ ] Security review and approval
- [ ] Choose implementation approach
- [ ] Provision admin API access or proxy endpoint
- [ ] VPN/IP whitelist configuration (if needed)

### Nice to Have
- [ ] Integration with release process
- [ ] Automated alerting for version anomalies
- [ ] Public dashboard (optional)

---

## Alternatives Considered

### Alternative 1: Continue with Public RPC Only
- **Pro:** No admin API needed, zero security risk
- **Con:** Only covers 5% of network, misses actual operators
- **Verdict:** Insufficient for upgrade coordination

### Alternative 2: Run Our Own Base Node for P2P Discovery
- **Pro:** No admin API needed from others, complete control
- **Con:** 2-3 weeks setup time, requires infrastructure, more complex
- **Verdict:** Good long-term solution, but slower to implement

### Alternative 3: Partner with Node Providers
- **Pro:** Fast, no admin API needed
- **Con:** Partial coverage, depends on partnerships, stale data
- **Verdict:** Supplementary approach, not sufficient alone

**Chosen approach:** Admin API access (fastest path to full coverage) + eventual P2P discovery (long-term robustness)

---

## References

- **Live Dashboard:** `base_nodes_report.html`
- **Code Repository:** `/Users/jonroethke/base/base-node-monitor/`
- **Ethereum Precedent:** `VALIDATION.md`
- **Expansion Strategy:** `EXPANSION_STRATEGY.md`
- **Security Details:** `PROPOSAL.md`

---

## Approval

**Decision needed:** Approve Phase 2 implementation (admin API access for peer discovery)

**Recommended approach:** Option 1 (Read-Only Proxy) or Option 2 (Dedicated Monitoring Node)

**Next step:** 30-minute technical discussion to address security concerns and choose implementation

---

**Questions?** Contact [Your Name] or see detailed proposal in `PROPOSAL.md`
