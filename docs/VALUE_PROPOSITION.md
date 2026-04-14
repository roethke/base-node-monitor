# What We Track and Why It Matters

## The Problem We Solve

### v0.15.0/v0.15.1 Rollout Example

**What happened:**
- Base released v0.15.0 with a critical bug (block writing issue)
- Released v0.15.1 to fix it
- **Had ZERO visibility into network adoption**

**Questions we couldn't answer:**
- ❌ How many nodes upgraded to v0.15.1?
- ❌ How many nodes are still on problematic v0.15.0?
- ❌ Are major infrastructure providers (exchanges, RPC providers) affected?
- ❌ Is it safe to continue the rollout or should we pause?

**Result:** Flying blind, relying on Discord reports, no data-driven decisions.

---

## What We Track Now

### 1. **Client Distribution**

**What it shows:**
```
reth:        47.6% (10 nodes)
Geth:        38.1% (8 nodes)
Tenderly:     9.5% (2 nodes)
Nethermind:   4.8% (1 node)
```

**Why it matters:**
- **Client diversity** - Multiple implementations reduce risk
- **Identify monoculture** - If 95% run one client, bug affects whole network
- **Track adoption** - See which clients are gaining/losing share

**Real-world use:**
> "We found a bug in reth v0.15.1. Since 47.6% of monitored nodes run reth, we know ~half the network needs immediate attention."

---

### 2. **Version Distribution**

**What it shows:**
```
base-node-reth/v0.15.1:    38.1% (8 nodes)
op-geth/v1.101701.0:       23.8% (5 nodes)
op-geth/v1.101700.2:       14.3% (3 nodes)
base-node-reth/v0.15.0:     9.5% (2 nodes)  ⚠️ Problematic
```

**Why it matters:**
- **Upgrade adoption** - Track how fast nodes upgrade
- **Identify stragglers** - Find nodes stuck on old versions
- **Problem detection** - See how many nodes affected by known issues

**Real-world use:**
> "v0.15.0 has a critical bug. Our monitoring shows 9.5% still on v0.15.0. We can reach out to those 2 operators directly."

---

### 3. **Online/Offline Status**

**What it shows:**
```
Total endpoints: 27
Online nodes:    21 (77.8%)
Offline nodes:    6 (22.2%)
```

**Why it matters:**
- **Service availability** - Track infrastructure health
- **Outage detection** - Know when major providers go down
- **Network resilience** - Monitor redundancy

**Real-world use:**
> "Major RPC provider went offline. Monitoring shows 3 endpoints down, but 21 still online. Network is stable."

---

### 4. **Block Height & Sync Status**

**What it shows:**
```
Node A: Block 25,123,456 | Syncing: false
Node B: Block 25,120,000 | Syncing: true   ⚠️ 3,456 blocks behind
Node C: Block 25,123,450 | Syncing: false
```

**Why it matters:**
- **Sync issues** - Detect nodes falling behind
- **Network consensus** - All nodes should be on similar blocks
- **Problem diagnosis** - Nodes stuck at old blocks indicate issues

**Real-world use:**
> "Node stuck at block 25,120,000 while others at 25,123,456. Indicates sync issue, not just slow."

---

## What We DON'T Track (And Why)

### ❌ Consensus Layer Versions

**What:** op-node, base-consensus versions

**Why we don't track it:**
- Public RPC endpoints **don't expose** this information
- Custom OP Stack methods (`optimism_version`) not available
- Detection rate: 0-5% (not useful)

**When you'd get this:**
- Running your own node with admin API
- Direct partnerships with node operators
- Not available from public RPCs

**Decision:** Focus on what we CAN get (execution layer) which solves 95% of the problem.

---

### ❌ Peer Count

**What:** Number of peers each node is connected to

**Why we don't track it:**
- Tells us about **that endpoint's infrastructure**, not the network
- Not useful for version tracking
- Doesn't solve our core problem

**Example why it's not useful:**
```
Alchemy RPC: 150 peers

This tells us:
✗ Alchemy's node has 150 peers (their infrastructure)

This does NOT tell us:
✗ The Base network has 150 nodes
✗ What versions those peers are running
✗ Network composition
```

**When it WOULD be useful:**
- If we had admin API access to query `admin_peers`
- Then we'd get peer IPs and could query them directly
- That's Phase 2 (peer discovery via admin API)

---

## How This Solves the Problem

### Before (v0.15.0/v0.15.1 rollout)

```
Question: "How many nodes upgraded to v0.15.1?"
Answer:   "We don't know. Check Discord?"

Question: "Are exchanges ready?"
Answer:   "No idea. Maybe ask them?"

Question: "Safe to continue rollout?"
Answer:   "🤷 Hope for the best?"
```

### After (with this monitoring tool)

```
Question: "How many nodes upgraded to v0.15.1?"
Answer:   "38.1% of monitored nodes (8/21)"

Question: "Are exchanges ready?"
Answer:   "Can identify which endpoints are exchanges and check their versions"

Question: "Safe to continue rollout?"
Answer:   "60% adoption after 48 hours. Historical data shows this is typical. Safe to proceed."
```

---

## Current Limitations

**Coverage: ~5% of network**
- We monitor public RPC endpoints (Alchemy, Infura, etc.)
- Missing: Individual operators, exchanges, community nodes

**Why this is still valuable:**
- Public RPCs represent **major infrastructure providers**
- They handle majority of user traffic
- Early indicator of network-wide issues
- Better than zero visibility

**Next Phase: Expand to 500-1,000+ nodes**
- Use admin API for peer discovery
- See [PROPOSAL.md](PROPOSAL.md) for details

---

## Real-World Impact

### Scenario 1: Safe Upgrade Rollout

**v0.16.0 release:**
```
Day 0:  Release v0.16.0
Day 1:  15% adoption (3/21 nodes)
Day 3:  45% adoption (9/21 nodes)
Day 7:  75% adoption (16/21 nodes)
Day 14: 95% adoption (20/21 nodes)

Decision: "Normal adoption curve. No major issues detected. Proceed with announcement."
```

### Scenario 2: Problem Detection

**Hypothetical bug in v0.16.1:**
```
Day 0:  Release v0.16.1
Day 1:  10% adoption (2/21 nodes)
        ⚠️ Both nodes showing sync issues
Day 1:  ALERT: "New version shows sync problems"
Day 1:  PAUSE rollout, investigate

Result: Caught issue before widespread adoption
```

### Scenario 3: Network Health

**Weekly monitoring:**
```
Week 1: 47.6% reth, 38.1% Geth, 14.3% other
Week 2: 50.0% reth, 35.0% Geth, 15.0% other
Week 3: 55.0% reth, 30.0% Geth, 15.0% other

Observation: "Reth adoption growing. Geth declining. Client diversity healthy."
```

---

## What Success Looks Like

### Short-term (With Current 25 Nodes)

✅ Know client distribution across major RPC providers
✅ Track version adoption for upgrades
✅ Detect problems before widespread impact
✅ Make data-driven rollout decisions

### Long-term (With 500-1,000+ Nodes)

✅ Full network visibility
✅ Identify specific operators on old versions
✅ Coordinate upgrades with major stakeholders
✅ Proactive outreach to stragglers
✅ Industry-standard monitoring (like ethernodes.org)

---

## Bottom Line

**What we track:**
- Execution layer clients (op-geth, reth, nethermind)
- Exact versions (e.g., `op-geth/v1.101701.0-stable`)
- Distribution percentages
- Online/offline status
- Block heights and sync status

**What this solves:**
- ✅ "How many nodes upgraded?" → **Data-driven answer**
- ✅ "Safe to proceed?" → **Evidence-based decision**
- ✅ "Who's affected?" → **Identify specific nodes**
- ✅ "Network health?" → **Real-time monitoring**

**What we don't track:**
- ❌ Consensus layer (not exposed by public RPCs)
- ❌ Peer counts (not useful for our goal)

**Focus:** Deliver actionable insights for safe network upgrades, not chase metrics we can't get.
