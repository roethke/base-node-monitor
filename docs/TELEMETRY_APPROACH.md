# Node Telemetry Approach

## What Is Node Telemetry?

**Instead of crawling nodes externally**, embed telemetry collection **inside the Base node software** that operators can opt into.

### How It Works

```
┌─────────────────────────────────────┐
│     Base Node (Operator's)          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Telemetry Module (Optional) │  │
│  │                              │  │
│  │  Collects:                   │  │
│  │  - Client version            │  │
│  │  - Network (mainnet/sepolia) │  │
│  │  - Block height              │  │
│  │  - Sync status               │  │
│  │  - Optional: Hardware info   │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             │ Sends every 6 hours   │
│             ▼                       │
│      ┌────────────┐                │
│      │ HTTP POST  │                │
│      └────────────┘                │
└──────────────┼─────────────────────┘
               │
               │ HTTPS
               ▼
    ┌─────────────────────┐
    │  Telemetry Server   │
    │  (Your Backend)     │
    │                     │
    │  Receives reports   │
    │  Stores in DB       │
    │  Exposes via API    │
    └─────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │   Dashboard         │
    │   (Your Frontend)   │
    └─────────────────────┘
```

## Real-World Examples

### 1. **Ethereum (Geth)**

Geth includes optional telemetry:

```bash
# Enable metrics
geth --metrics --metrics.addr 127.0.0.1 --metrics.port 6060

# Reports to Prometheus/InfluxDB
# Operators can opt in
```

### 2. **Polkadot**

Polkadot nodes send telemetry to `telemetry.polkadot.io`:

```bash
# Enable telemetry when starting node
polkadot --telemetry-url 'wss://telemetry.polkadot.io/submit/ 0'

# Public dashboard shows all opted-in nodes:
# https://telemetry.polkadot.io/
```

**What they show:**
- Node name (operator-chosen)
- Version
- Block height
- Peer count
- Location (approximate)
- Hardware specs (CPU, memory)

### 3. **Cosmos/Tendermint**

Cosmos SDK includes built-in telemetry:

```go
// In app.toml
[telemetry]
enabled = true
prometheus-retention-time = 60
```

### 4. **Substrate**

Substrate (blockchain framework) has telemetry built-in:
- Operators opt in with `--telemetry-url`
- Public dashboard: https://telemetry.polkadot.io/

---

## What Base Node Telemetry Would Look Like

### Implementation Option 1: Built Into base-node

**Add to base-node (Rust):**

```rust
// In base-node/src/telemetry.rs

pub struct TelemetryConfig {
    pub enabled: bool,
    pub endpoint: String,
    pub interval_seconds: u64,
    pub node_name: Option<String>,
}

pub struct TelemetryReport {
    pub node_id: String,           // Anonymous hash
    pub node_name: Option<String>, // Optional operator name
    pub client_version: String,    // "base-node-reth/v0.15.1"
    pub network: String,           // "mainnet" or "sepolia"
    pub block_number: u64,
    pub syncing: bool,
    pub peer_count: u32,
    pub uptime_seconds: u64,
    pub timestamp: u64,
}

impl TelemetryService {
    pub async fn send_report(&self, report: TelemetryReport) {
        if !self.config.enabled {
            return;
        }

        let client = reqwest::Client::new();
        let result = client
            .post(&self.config.endpoint)
            .json(&report)
            .send()
            .await;

        if let Err(e) = result {
            debug!("Failed to send telemetry: {}", e);
            // Don't crash node if telemetry fails
        }
    }

    pub async fn run(&self) {
        let mut interval = tokio::time::interval(
            Duration::from_secs(self.config.interval_seconds)
        );

        loop {
            interval.tick().await;

            let report = self.collect_metrics().await;
            self.send_report(report).await;
        }
    }

    async fn collect_metrics(&self) -> TelemetryReport {
        TelemetryReport {
            node_id: self.get_node_id(),
            node_name: self.config.node_name.clone(),
            client_version: get_client_version(),
            network: self.chain_spec.network_name(),
            block_number: self.provider.block_number().await.unwrap_or(0),
            syncing: self.sync_service.is_syncing(),
            peer_count: self.network.peer_count() as u32,
            uptime_seconds: self.start_time.elapsed().as_secs(),
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        }
    }

    fn get_node_id(&self) -> String {
        // Hash of node's public key (anonymous but consistent)
        let mut hasher = Sha256::new();
        hasher.update(self.node_key.public().as_bytes());
        format!("{:x}", hasher.finalize())
    }
}
```

**Configuration (in node's config file):**

```toml
# base-node.toml
[telemetry]
enabled = true
endpoint = "https://telemetry.base.org/report"
interval_seconds = 21600  # 6 hours
node_name = "MyCompany-Node-1"  # Optional

# Or disable:
# enabled = false
```

**Command-line flags:**

```bash
# Enable telemetry
base-node --telemetry-enabled --telemetry-url https://telemetry.base.org/report

# Disable (default)
base-node --no-telemetry

# With custom name
base-node --telemetry-enabled --telemetry-name "Coinbase-Node-SF-1"
```

### Implementation Option 2: External Sidecar

**Don't modify base-node**, instead create a sidecar that operators can run:

```yaml
# docker-compose.yml
services:
  base-node:
    image: ghcr.io/base-org/node:latest
    ports:
      - "8545:8545"
      - "8546:8546"

  telemetry-agent:
    image: ghcr.io/base-org/telemetry-agent:latest
    environment:
      - NODE_RPC_URL=http://base-node:8545
      - TELEMETRY_ENDPOINT=https://telemetry.base.org/report
      - NODE_NAME=MyCompany-Node-1
      - REPORT_INTERVAL=21600
    depends_on:
      - base-node
```

**Telemetry agent (Go example):**

```go
// telemetry-agent/main.go
package main

import (
    "context"
    "time"
    "github.com/ethereum/go-ethereum/ethclient"
    "github.com/ethereum/go-ethereum/rpc"
)

type TelemetryReport struct {
    NodeID        string `json:"node_id"`
    NodeName      string `json:"node_name,omitempty"`
    ClientVersion string `json:"client_version"`
    Network       string `json:"network"`
    BlockNumber   uint64 `json:"block_number"`
    Syncing       bool   `json:"syncing"`
    PeerCount     uint64 `json:"peer_count"`
    Timestamp     int64  `json:"timestamp"`
}

func main() {
    config := loadConfig()

    client, err := ethclient.Dial(config.NodeRPCURL)
    if err != nil {
        log.Fatal(err)
    }

    ticker := time.NewTicker(time.Duration(config.ReportInterval) * time.Second)

    for range ticker.C {
        report := collectMetrics(client, config)
        sendReport(report, config.TelemetryEndpoint)
    }
}

func collectMetrics(client *ethclient.Client, config Config) TelemetryReport {
    ctx := context.Background()

    // Query web3_clientVersion
    var version string
    client.Client().Call(&version, "web3_clientVersion")

    // Query block number
    blockNumber, _ := client.BlockNumber(ctx)

    // Query sync status
    syncProgress, _ := client.SyncProgress(ctx)
    syncing := syncProgress != nil

    // Query peer count
    var peerCount hexutil.Uint64
    client.Client().Call(&peerCount, "net_peerCount")

    return TelemetryReport{
        NodeID:        config.NodeID,
        NodeName:      config.NodeName,
        ClientVersion: version,
        Network:       config.Network,
        BlockNumber:   blockNumber,
        Syncing:       syncing,
        PeerCount:     uint64(peerCount),
        Timestamp:     time.Now().Unix(),
    }
}

func sendReport(report TelemetryReport, endpoint string) {
    data, _ := json.Marshal(report)
    http.Post(endpoint, "application/json", bytes.NewBuffer(data))
}
```

---

## Telemetry Server Backend

**Your telemetry collection server:**

```javascript
// telemetry-server/src/api/routes/telemetry.js

const express = require('express');
const router = express.Router();

module.exports = (db) => {
  /**
   * POST /telemetry/report
   * Receive telemetry report from node
   */
  router.post('/report', async (req, res) => {
    try {
      const report = req.body;

      // Validate report
      if (!report.node_id || !report.client_version) {
        return res.status(400).json({ error: 'Invalid report' });
      }

      // Store report
      await db.storeTelemetryReport({
        node_id: report.node_id,
        node_name: report.node_name || null,
        client_version: report.client_version,
        network: report.network,
        block_number: report.block_number,
        syncing: report.syncing,
        peer_count: report.peer_count,
        uptime_seconds: report.uptime_seconds || null,
        timestamp: new Date(report.timestamp * 1000)
      });

      // Update node registry (latest state)
      await db.upsertNode({
        node_id: report.node_id,
        node_name: report.node_name,
        client_version: report.client_version,
        network: report.network,
        last_seen: new Date(),
        online: true
      });

      res.json({ status: 'received' });

    } catch (error) {
      console.error('Error processing telemetry:', error);
      res.status(500).json({ error: 'Failed to process report' });
    }
  });

  /**
   * GET /telemetry/stats
   * Public API to view telemetry data
   */
  router.get('/stats', async (req, res) => {
    const { network } = req.query;

    const stats = await db.getTelemetryStats(network);

    res.json({
      total_nodes: stats.total,
      active_nodes_24h: stats.active_24h,
      clients: stats.client_distribution,
      versions: stats.version_distribution,
      networks: stats.network_breakdown
    });
  });

  return router;
};
```

---

## Pros and Cons

### ✅ Advantages of Telemetry

1. **Opt-in, transparent**
   - Operators choose to participate
   - They know exactly what data is sent
   - More ethical than crawling

2. **More data points**
   - Can include metrics not available via RPC
   - Hardware info, uptime, peer count
   - Consensus layer info (since it's internal)

3. **Better coverage**
   - Captures private nodes (not publicly accessible)
   - Even firewalled nodes can send telemetry
   - Gets nodes that don't expose RPC publicly

4. **Lower resource usage**
   - No crawling overhead
   - Nodes report on their schedule
   - Scales naturally

5. **Richer insights**
   - Geographic distribution (if operators share)
   - Hardware specs (helps with performance analysis)
   - Uptime statistics

### ❌ Disadvantages of Telemetry

1. **Requires node software changes**
   - Must be built into base-node
   - Or operators must run separate agent
   - Can't deploy immediately

2. **Adoption dependency**
   - Only works if operators opt in
   - May have low participation initially
   - Requires education/incentives

3. **Trust required**
   - Operators must trust telemetry server
   - Privacy concerns (even with anonymization)
   - Some operators will refuse on principle

4. **Development overhead**
   - Must build telemetry collection system
   - Maintain telemetry server infrastructure
   - Handle privacy/security correctly

5. **Version fragmentation**
   - Old node versions won't have telemetry
   - Can't track nodes that haven't upgraded
   - Chicken-and-egg problem

---

## Hybrid Approach (Recommended)

**Use BOTH crawling AND telemetry:**

```
┌─────────────────────────────────────────────┐
│          Base Network Monitoring            │
├─────────────────────────────────────────────┤
│                                             │
│  Data Source 1: Public RPC Crawling         │
│  ├─ Available immediately                   │
│  ├─ Covers major infrastructure (Alchemy)   │
│  └─ ~25 nodes (5% of network)              │
│                                             │
│  Data Source 2: Node Telemetry (Opt-in)     │
│  ├─ Requires software changes               │
│  ├─ Captures private nodes                  │
│  └─ ~500 nodes (50% of network with time)  │
│                                             │
│  Data Source 3: Admin API Discovery         │
│  ├─ Requires running Base node              │
│  ├─ P2P peer discovery                      │
│  └─ ~1,000 nodes (100% of network)         │
│                                             │
└─────────────────────────────────────────────┘
              │
              ▼
      Combined Dashboard
      (Best of all sources)
```

**Timeline:**

```
Week 1-4:   Public RPC crawling (immediate)
            ├─ Deploy current tool
            ├─ Monitor 25 nodes
            └─ Establish baseline

Month 2-3:  Add telemetry support
            ├─ Build telemetry module
            ├─ Add to base-node
            ├─ Operators start opting in
            └─ Gradual coverage increase

Month 4+:   Admin API discovery
            ├─ Run Base node
            ├─ P2P peer discovery
            └─ Maximum coverage
```

---

## Convincing Operators to Opt In

### Incentives

**1. Public Recognition**
```
"Your node appears on the Base Network Health Dashboard"
```

**2. Network Health**
```
"Help the Base team coordinate safe upgrades"
```

**3. Personal Benefits**
```
"Get notified when:
 - You're running an outdated version
 - Network detects sync issues
 - Major upgrades are released"
```

**4. Benchmarking**
```
"Compare your node performance to network average:
 - Uptime: 99.8% (Network avg: 98.5%)
 - Peers: 127 (Network avg: 85)
 - Sync speed: 1,234 blocks/sec (Network avg: 980)"
```

### Addressing Privacy Concerns

**What's sent:**
- ✅ Node ID (hashed, anonymous)
- ✅ Client version
- ✅ Block height
- ✅ Sync status
- ❌ NOT: IP address
- ❌ NOT: Transaction data
- ❌ NOT: Account information

**Optional:**
- Node name (operator chooses)
- Location (operator chooses)
- Hardware specs (operator chooses)

**Transparency:**
- Open source telemetry code
- Public dashboard shows all data
- Operators can inspect what's sent

---

## Implementation Recommendation

### Phase 1: Start with Crawling (Current Tool)
**Why:** Available immediately, covers major infrastructure

### Phase 2: Add Telemetry (3-6 months)
**Steps:**
1. Build telemetry module for base-node
2. Submit PR to base-node repository
3. Document opt-in process
4. Launch public dashboard
5. Announce to community

**Alternative:** Build external telemetry agent (sidecar)
- Doesn't require base-node changes
- Faster to deploy
- Operators can choose to run it

### Phase 3: Admin API Discovery (6+ months)
**Why:** Maximum coverage, complete network visibility

---

## Sample Public Dashboard (Inspired by Polkadot)

```
╔═══════════════════════════════════════════════════════════╗
║         Base Network Health Dashboard                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Total Nodes Reporting: 437                               ║
║  Active (Last 24h): 421                                   ║
║                                                           ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  Client Distribution                               │  ║
║  │  ██████████████████ reth (47.6%)                  │  ║
║  │  ███████████████ Geth (38.1%)                     │  ║
║  │  ████ Nethermind (9.5%)                           │  ║
║  │  ██ Erigon (4.8%)                                 │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                           ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  Version Distribution                              │  ║
║  │  v0.15.1: ████████████████ 68.2%                  │  ║
║  │  v0.15.0: ████ 15.3%  ⚠️ Please upgrade           │  ║
║  │  v0.14.x: ██ 8.1%  ⚠️ Deprecated                  │  ║
║  │  Other:   ██ 8.4%                                  │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                           ║
║  Recent Nodes (showing 5 of 437):                         ║
║  ┌──────────────────────────────────────────────────┐    ║
║  │ MyNode-1    │ reth v0.15.1 │ 25,123,456 │ 127p │    ║
║  │ Coinbase-SF │ geth v1.10.0 │ 25,123,456 │ 93p  │    ║
║  │ Node-Berlin │ reth v0.15.1 │ 25,123,450 │ 104p │    ║
║  │ Private-42  │ geth v1.10.0 │ 25,123,456 │ 81p  │    ║
║  │ Base-Labs   │ reth v0.15.1 │ 25,123,456 │ 142p │    ║
║  └──────────────────────────────────────────────────┘    ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Bottom Line

**Telemetry is a great complement to crawling:**

| Approach | Coverage | Speed to Deploy | Operator Buy-in Required |
|----------|----------|----------------|-------------------------|
| **RPC Crawling** | 5% | Immediate | No |
| **Telemetry (Opt-in)** | 50%+ | 3-6 months | Yes |
| **Admin API Discovery** | 95%+ | 1-2 months | Partial |

**Best Strategy:**
1. **Start with crawling** (what you have now)
2. **Add telemetry** (3-6 month horizon)
3. **Complement with admin API** (when you run your own node)

**All three together = comprehensive network visibility**

Would you like me to build a prototype telemetry agent (external sidecar) that operators could optionally run alongside their nodes?
