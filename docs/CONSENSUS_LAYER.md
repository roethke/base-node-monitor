# Consensus Layer Detection for Base Nodes

## Overview

Base uses the OP Stack architecture which separates into two layers:

1. **Execution Layer (EL)**: Handles transaction execution and state management
   - Clients: op-geth, reth, base-node-reth, nethermind, erigon

2. **Consensus Layer (CL)**: Handles block derivation from L1 and sequencing
   - Client: op-node (or base-consensus when forked by Base)

## The Challenge

**Detecting consensus layer versions is significantly harder than execution layer versions:**

### Why Standard RPC Doesn't Help

- `web3_clientVersion` only returns the **execution client** version
- There is no standard JSON-RPC method for querying consensus layer info
- Unlike Ethereum mainnet (which has a Beacon API), L2s don't standardize this
- Most public RPC endpoints don't expose custom methods

## Detection Methods Attempted

Our crawler tries the following methods in order:

| Method | Description | Likelihood |
|--------|-------------|------------|
| `optimism_version` | OP Stack custom method that might return op-node version | Medium |
| `op_version` | Alternative naming for OP Stack version | Low |
| `rollup_version` | Rollup-specific version endpoint | Low |
| `opp2p_version` | P2P layer version (might indicate op-node) | Very Low |
| `optimism_rollupConfig` | Config that might contain version info | Low |

### What We Look For in Responses

If any method returns data, we extract version info from:
- Direct string responses (e.g., `"op-node/v1.7.0"`)
- Object fields: `version`, `nodeVersion`, `clientVersion`, `rollupVersion`
- Full JSON objects (if no version field found)

## Expected Results

### For Public RPC Endpoints

**Reality check:** Most public RPC endpoints will return:
- ✅ Execution layer version: Always available
- ❌ Consensus layer version: **Rarely available**

**Why?**
- Public RPC providers typically don't expose custom OP Stack methods
- Security: Limiting exposed methods reduces attack surface
- Standardization: They stick to standard Ethereum JSON-RPC

### For Node Operators with Admin Access

If you have admin API access or run nodes yourself:
- You can query additional methods
- Direct access to op-node RPC (separate port, typically 9545)
- Can correlate execution + consensus client versions

## API Endpoints

### Get Consensus Distribution

```bash
GET /api/networks/:network/distribution/consensus
```

**Response:**
```json
{
  "network": "mainnet",
  "distribution": [
    {
      "version": "op-node/v1.7.0",
      "count": 3,
      "percentage": 60.0
    },
    {
      "version": "op-node/v1.6.5",
      "count": 2,
      "percentage": 40.0
    }
  ],
  "stats": {
    "total_nodes": 21,
    "nodes_with_consensus_info": 5,
    "nodes_without_consensus_info": 16,
    "detection_rate": 23.8
  }
}
```

### Get All Distributions (Including Consensus)

```bash
GET /api/networks/:network/distribution
```

**Response:**
```json
{
  "network": "mainnet",
  "clients": [
    { "client": "reth", "count": 10, "percentage": 47.6 }
  ],
  "versions": [
    { "version": "base-node-reth/v0.15.1", "count": 8, "percentage": 38.1 }
  ],
  "consensus": [
    { "version": "op-node/v1.7.0", "count": 3, "percentage": 60.0 }
  ],
  "consensus_stats": {
    "total_nodes": 21,
    "nodes_with_consensus_info": 5,
    "nodes_without_consensus_info": 16,
    "detection_rate": 23.8
  }
}
```

## Database Schema

The `nodes` table includes a `consensus_version` field:

```sql
CREATE TABLE nodes (
  id INTEGER PRIMARY KEY,
  url TEXT,
  network TEXT,
  client_version TEXT,           -- Execution layer (EL)
  consensus_version TEXT,        -- Consensus layer (CL)
  block_number INTEGER,
  syncing BOOLEAN,
  peers_count INTEGER,
  online BOOLEAN,
  last_seen DATETIME,
  UNIQUE(url, network)
);
```

## Improving Detection Rate

### Option 1: Partner with Node Operators

Request that operators expose custom methods:
- `optimism_version` returning op-node version
- Separate op-node RPC endpoint access

### Option 2: Admin API Access

With admin API access, you could:
- Query additional custom methods
- Access op-node directly (if exposed)
- Correlate via peer discovery

### Option 3: Run Your Own Nodes

- Full control over both EL and CL
- Can query op-node directly on port 9545
- Know exact versions you're running

### Option 4: Infer from Execution Client

Some execution clients might hint at CL in their version string:
```
op-geth/v1.101701.0+op-node-v1.7.0  # Hypothetical
```

Currently we see:
```
op-geth/v1.101701.0-stable/linux-amd64/go1.21.5
```
No CL info included.

## Interpretation Guidelines

### High Detection Rate (>50%)

Indicates:
- Operators are exposing custom methods
- Good visibility into full stack
- Can track consensus layer upgrades

### Low Detection Rate (<25%)

Expected for public RPC monitoring:
- Most endpoints don't expose custom methods
- Normal for this approach
- Still valuable to track what we can

### Zero Detection Rate

Indicates:
- No endpoints expose consensus info
- All tried methods returned errors
- Need alternative approach (admin API, partnerships)

## Known Consensus Versions

### OP Stack Versions

Base uses op-node (part of OP Stack):

| Version | Release Date | Notes |
|---------|--------------|-------|
| v1.7.0+ | 2024+ | Latest stable |
| v1.6.x | 2024 | Previous stable |
| v1.5.x | 2023 | Older |

### Base-Consensus Versions

Base may fork op-node as "base-consensus":
- Custom modifications for Base-specific features
- Version numbering might differ from upstream op-node

## Recommendations

1. **Don't expect high detection rates** from public RPC endpoints
2. **Use execution layer data** as primary monitoring metric
3. **Consider consensus detection a bonus** when available
4. **For critical visibility**, pursue admin API access or partnerships
5. **Document what you find** - any consensus data is valuable

## Future Improvements

### Standardization Proposal

Work with Base/OP Stack to standardize:
- `rollup_clientVersion` or similar method
- Expose via public RPC (security review required)
- Include in base-node documentation

### Alternative Detection Methods

- Parse execution client logs (requires node access)
- Network traffic analysis (complex, unreliable)
- Ask operators directly (manual, doesn't scale)

## Conclusion

**Current reality:**
- ✅ Execution layer: 95%+ detection rate
- ⚠️ Consensus layer: 0-25% detection rate (expected)

**This is normal and expected** for public RPC monitoring. The execution layer visibility is the primary value, with consensus layer being a "nice to have" bonus when available.

For full stack visibility, you'll need:
- Admin API access, OR
- Partnerships with node operators, OR
- Run your own nodes

---

**Status**: Consensus layer detection implemented but expect low success rate with public RPCs.
