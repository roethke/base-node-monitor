# Base Node Monitor

Professional network monitoring tool for Base Mainnet and Sepolia that tracks node client versions, distribution, and health across the network.

Built with Node.js, Express, and SQLite.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the API Server

```bash
npm start
```

API will be available at: `http://localhost:8000`

### 3. Start the Background Scheduler (Optional)

In a separate terminal:

```bash
npm run scheduler
```

This will crawl all networks every 6 hours automatically.

## Development

```bash
# Start API with auto-reload
npm run dev

# Start scheduler with auto-reload
npm run scheduler:dev

# Run a one-time crawl
npm run crawl
```

## Project Structure

```
base-node-monitor/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── networks.js      # Network endpoints
│   │   │   ├── nodes.js         # Node & distribution endpoints
│   │   │   └── crawl.js         # Crawl trigger endpoints
│   │   ├── middleware/
│   │   │   └── errorHandler.js  # Error handling
│   │   └── server.js            # Express server
│   ├── database/
│   │   └── db.js                # SQLite database module
│   ├── crawler/
│   │   ├── crawler.js           # Network crawler
│   │   └── config.js            # Network configurations
│   ├── scheduler/
│   │   └── scheduler.js         # Background scheduler
│   └── utils/
│       └── logger.js            # Logging utility
├── scripts/
│   └── legacy/                  # Legacy Python scripts
├── docs/                        # Documentation
├── tests/                       # Tests (TODO)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

### Networks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/networks` | GET | List all monitored networks |
| `/api/networks/:network/stats` | GET | Get network statistics |

### Nodes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/networks/:network/nodes` | GET | Get all nodes (query: `online_only`) |
| `/api/networks/:network/distribution/clients` | GET | Client distribution with percentages |
| `/api/networks/:network/distribution/versions` | GET | Version distribution with percentages |
| `/api/networks/:network/distribution` | GET | All distributions |

### Crawling

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crawl` | POST | Trigger manual crawl (query: `network`) |
| `/api/crawl/status` | GET | Get current crawl status |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | API health check |

## Example API Usage

### Get Network Statistics

```bash
curl http://localhost:8000/api/networks/mainnet/stats
```

**Response:**
```json
{
  "network": "mainnet",
  "total_endpoints": 27,
  "online_nodes": 21,
  "offline_nodes": 6,
  "clients": {
    "reth": 10,
    "Geth": 8,
    "Tenderly": 2,
    "Nethermind": 1
  },
  "versions": {
    "op-geth/v1.101701.0-stable": 5,
    "base-node-reth/v0.15.1": 8
  },
  "last_updated": 1713096000000
}
```

### Get Client Distribution

```bash
curl http://localhost:8000/api/networks/mainnet/distribution/clients
```

**Response:**
```json
[
  {
    "client": "reth",
    "count": 10,
    "percentage": 47.6
  },
  {
    "client": "Geth",
    "count": 8,
    "percentage": 38.1
  }
]
```

### Trigger Manual Crawl

```bash
curl -X POST http://localhost:8000/api/crawl
# Or for specific network:
curl -X POST http://localhost:8000/api/crawl?network=mainnet
```

## Frontend Integration

### React/TypeScript Example

```typescript
const API_BASE = 'http://localhost:8000/api';

// Fetch network stats
export async function fetchNetworkStats(network: string) {
  const response = await fetch(`${API_BASE}/networks/${network}/stats`);
  return response.json();
}

// Fetch client distribution
export async function fetchClientDistribution(network: string) {
  const response = await fetch(`${API_BASE}/networks/${network}/distribution/clients`);
  return response.json();
}

// Fetch all distributions
export async function fetchDistributions(network: string) {
  const response = await fetch(`${API_BASE}/networks/${network}/distribution`);
  return response.json();
}

// Trigger crawl
export async function triggerCrawl(network?: string) {
  const url = network
    ? `${API_BASE}/crawl?network=${network}`
    : `${API_BASE}/crawl`;

  const response = await fetch(url, { method: 'POST' });
  return response.json();
}
```

### Vue 3 Example

```javascript
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const stats = ref(null);
    const distribution = ref(null);

    const loadData = async () => {
      const statsRes = await fetch('http://localhost:8000/api/networks/mainnet/stats');
      stats.value = await statsRes.json();

      const distRes = await fetch('http://localhost:8000/api/networks/mainnet/distribution');
      distribution.value = await distRes.json();
    };

    onMounted(loadData);

    return { stats, distribution };
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```bash
PORT=8000
NODE_ENV=development
DB_PATH=base_nodes.db
SCHEDULER_INTERVAL_HOURS=6
```

### Adding New Endpoints

Edit `src/crawler/config.js`:

```javascript
const NETWORKS = {
  mainnet: {
    name: 'Base Mainnet',
    rpc_endpoints: [
      'https://your-new-endpoint.com',
      // ... existing endpoints
    ]
  }
};
```

### Changing Crawl Interval

```bash
# 3 hours
SCHEDULER_INTERVAL_HOURS=3 npm run scheduler

# Or pass as argument (legacy Python scheduler)
node src/scheduler/scheduler.js 3
```

## Database

SQLite database (`base_nodes.db`) with two tables:

**nodes** - Current state of all monitored nodes
- `url`: RPC endpoint URL
- `network`: Network identifier (mainnet/sepolia)
- `client_version`: Client version string
- `block_number`: Latest block number
- `online`: Boolean online status
- `last_seen`: Last successful query timestamp

**node_history** - Historical records
- Same fields as `nodes`
- `timestamp`: Record creation time

### Manual Queries

```bash
sqlite3 base_nodes.db

# View online nodes
SELECT url, client_version, block_number FROM nodes WHERE online = 1;

# Count by client
SELECT
  CASE
    WHEN client_version LIKE '%reth%' THEN 'reth'
    WHEN client_version LIKE '%geth%' THEN 'Geth'
    ELSE 'Other'
  END as client,
  COUNT(*) as count
FROM nodes
WHERE online = 1
GROUP BY client;
```

## Deployment

### Option 1: PM2 (Recommended)

```bash
npm install -g pm2

# Start API
pm2 start src/api/server.js --name base-monitor-api

# Start Scheduler
pm2 start src/scheduler/scheduler.js --name base-monitor-scheduler

# Save and setup startup
pm2 save
pm2 startup
```

### Option 2: Docker (Coming Soon)

```bash
docker build -t base-monitor .
docker run -p 8000:8000 base-monitor
```

### Option 3: Systemd Service

Create `/etc/systemd/system/base-monitor-api.service`:

```ini
[Unit]
Description=Base Node Monitor API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/base-node-monitor
ExecStart=/usr/bin/node /path/to/base-node-monitor/src/api/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/base-monitor-scheduler.service` (similar but with `src/scheduler/scheduler.js`).

```bash
sudo systemctl enable base-monitor-api base-monitor-scheduler
sudo systemctl start base-monitor-api base-monitor-scheduler
```

## Documentation

- **[docs/VALUE_PROPOSITION.md](docs/VALUE_PROPOSITION.md)** - What we track and why it matters ⭐ Start here
- **[docs/API.md](docs/API.md)** - Complete API documentation
- **[docs/PROPOSAL.md](docs/PROPOSAL.md)** - Engineering proposal for admin API access
- **[docs/P_PS_BASE_NODE_MONITOR.md](docs/P_PS_BASE_NODE_MONITOR.md)** - P/PS format document
- **[docs/VALIDATION.md](docs/VALIDATION.md)** - Ethereum precedent validation
- **[docs/EXPANSION_STRATEGY.md](docs/EXPANSION_STRATEGY.md)** - Network expansion strategies

## Current Status

**Coverage:**
- 27 mainnet endpoints
- 6 sepolia endpoints
- ~25 online nodes

**What We Track:**
- ✅ **Client types**: op-geth, reth, nethermind, etc.
- ✅ **Client versions**: Exact version strings (e.g., `op-geth/v1.101701.0-stable`)
- ✅ **Distribution**: Percentage breakdown by client and version
- ✅ **Upgrade adoption**: Track which nodes have upgraded to latest versions

**Current Limitations:**
- Only monitors publicly listed RPC endpoints (~5% of network)
- Missing: Individual operators, exchanges, infrastructure providers

**How This Solves the Problem:**

During v0.15.0/v0.15.1 rollout, we couldn't answer:
- ❌ "What percentage of nodes upgraded to v0.15.1?"
- ❌ "Are major infrastructure providers affected?"

Now we can answer (for monitored nodes):
- ✅ "47.6% running reth, 38.1% running Geth"
- ✅ "X% of nodes on latest version, Y% on problematic versions"
- ✅ "Track upgrade adoption over time"

**Data Sources:**

1. **Public RPC Crawling** (Current - 25 nodes)
   - Monitors public RPC endpoints automatically
   - Covers major infrastructure providers

2. **Opt-in Telemetry** (NEW - Expandable)
   - Node operators run telemetry agent alongside their nodes
   - Captures private nodes, better data
   - See [docs/TELEMETRY_SETUP.md](docs/TELEMETRY_SETUP.md)

3. **Admin API Discovery** (Future - 500-1,000+ nodes)
   - P2P peer discovery via admin API
   - See [docs/PROPOSAL.md](docs/PROPOSAL.md)

## Why This Matters

During the v0.15.0/v0.15.1 rollout, we had **zero visibility** into:
- What versions node operators were running
- How many nodes were affected by issues
- Whether major infrastructure providers had upgraded

This tool provides:
- Real-time network composition
- Version adoption metrics
- Early warning for problematic releases
- Evidence-based upgrade coordination

## Proven Approach

Ethereum has used this methodology for 8+ years:
- **Ethernodes.org** - 5,000+ nodes monitored
- **Nodewatch.io** - Consensus layer monitoring
- **ClientDiversity.org** - Upgrade coordination

See [docs/VALIDATION.md](docs/VALIDATION.md) for details.

## Legacy Scripts

Python scripts have been moved to `scripts/legacy/`:
- `base_node_crawler.py` - Original standalone crawler
- `verify_crawler.py` - Accuracy verification
- `update_endpoints.py` - Endpoint list generator

These are kept for reference but the Node.js version is recommended for all new deployments.

## Troubleshooting

### Port Already in Use

Change the port:

```bash
PORT=8001 npm start
```

### CORS Errors

Update `src/api/server.js` to specify allowed origins:

```javascript
app.use(cors({
  origin: ['https://your-frontend.com']
}));
```

### No Data Available

Run a manual crawl first:

```bash
npm run crawl
# Or via API:
curl -X POST http://localhost:8000/api/crawl
```

## License

MIT

## Acknowledgments

Inspired by:
- Ethernodes.org (Ethereum network monitoring)
- Nodewatch.io (Ethereum consensus monitoring)
- ClientDiversity.org (Ethereum client diversity tracking)

---

**Built with Node.js** | **API: Express** | **Database: SQLite** | **Scheduler: node-cron**
