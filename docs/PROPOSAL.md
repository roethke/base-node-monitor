# Base Network Monitoring Tool - Access Proposal

**Status:** Phase 1 Complete | Requesting Phase 2 Access
**TL;DR:** Built monitoring tool tracking 25 nodes. Need read-only admin API access to scale to 500+ nodes for safe upgrade coordination.

---

## What I've Built

**Dashboard tracking Base node versions:**
- 25 online nodes (38 endpoints)
- Client/version distribution with percentages
- 96% verified accuracy
- Dashboard: `base_nodes_report.html`

**Current findings:**
- Mainnet: 47.6% reth, 38.1% Geth
- **No base-node-reth v0.15.0/v0.15.1 detected** in public infrastructure

---

## The Problem

**I can only see 5% of the network** (public RPC providers like Alchemy/Infura)

**Missing 95%:**
- Actual node operators
- Exchanges
- Infrastructure providers
- Community nodes

**Can't answer:**
- "What % of network is on v0.15.1?"
- "Are exchanges ready for v0.16.0?"
- "How many nodes are affected by issues?"

---

## The Solution

**Peer discovery** like ethernodes.org (8+ years, industry standard):
1. Query `admin_peers` on one node → get peer IPs
2. Query those peers → discover more peers
3. Repeat recursively → map network

**Result:** 25 nodes → 500-1,000+ nodes

---

## Specific Request

**Need read-only access to:**
- `admin_peers` (peer list)
- `admin_nodeInfo` (version info)

**DO NOT need:**
- Write methods (addPeer, removePeer)
- Debug methods
- Account access

**Recommended implementation (choose one):**

### Option 1: Read-Only Proxy ⭐ Recommended
- Create proxy forwarding only `admin_peers`/`admin_nodeInfo`
- Block all other methods
- Rate limit 10/min
- **Security:** You control everything

### Option 2: Dedicated Monitoring Node ⭐ Also Good
- New Base node just for monitoring
- Not used for production traffic
- Enable admin API on this node only
- **Security:** Isolated, can kill if needed

### Option 3: You Run It (Zero Risk)
- Give you the crawler code
- You run on your infrastructure
- I get dashboard output only
- **Security:** I never touch admin API

---

## Security

**If compromised, attacker could:**
✓ DOS that specific node
✓ Disconnect it from network
✓ Map infrastructure topology

**Could NOT:**
✗ Steal funds
✗ Modify Base chain
✗ Affect other nodes

**Mitigations:**
- IP whitelist or VPN access
- Rate limiting (10/min)
- Audit logging
- Isolated from production
- 30-day trial period

**Precedent:** Ethernodes.org has done this for 8+ years with zero security incidents.

---

## Why This Matters

### Before v0.16.0 release, we need to know:
- What % upgraded to v0.15.1?
- Which operators are stuck on old versions?
- Are major exchanges ready?

### With v0.15.0/v0.15.1 issues:
- Had no visibility into affected nodes
- Couldn't measure impact
- Relied on Discord reports

### This tool provides:
- Upgrade adoption metrics
- Early warning for issues
- Evidence-based coordination
- Network health monitoring


## Questions?

**"Why not use public RPC endpoints?"**
→ Those are <5% of network (providers only)

**"Can't you use P2P discovery instead?"**
→ Yes, but requires running my own Base node (more complex, slower)

**"What if we say no?"**
→ Option 3 works - you run it, I get dashboard access

**"Can we start small?"**
→ Yes! Start with Sepolia testnet only

**"Performance impact?"**
→ Negligible - 10 queries/min vs thousands the node handles

---

**Dashboard:** `/Users/jonroethke/base/base-node-monitor/base_nodes_report.html`
**Code:** `/Users/jonroethke/base/base-node-monitor/`
**Validation:** See `VALIDATION.md` for Ethereum precedent
