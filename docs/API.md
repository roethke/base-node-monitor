# Base Node Monitor API Documentation

Complete REST API documentation for the Base Node Monitor.

## What This API Provides

**Problem:** During node upgrades (e.g., v0.15.0 → v0.15.1), we have zero visibility into:
- What percentage of nodes have upgraded?
- Which nodes are running problematic versions?
- Are major infrastructure providers affected?

**Solution:** This API tracks execution layer clients and versions across Base network nodes:
- ✅ Client distribution (reth vs op-geth vs nethermind)
- ✅ Version distribution (track upgrade adoption)
- ✅ Historical tracking (see changes over time)
- ✅ Real-time monitoring (know who's upgraded)

**Use Cases:**
- Safe upgrade coordination ("60% of nodes on v0.15.1, safe to proceed")
- Early issue detection ("10% still on problematic v0.15.0")
- Network health monitoring ("Client diversity: 47.6% reth, 38.1% geth")

## Base URL

```
http://localhost:8000/api
```

For production, replace with your deployed domain.

## Response Format

All API responses are in JSON format.

**Success Response:**
```json
{
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "detail": "Optional detailed error information"
}
```

## Endpoints

### Root

#### GET /

Get API information and available endpoints.

**Response:**
```json
{
  "name": "Base Node Monitor API",
  "version": "1.0.0",
  "docs": "/docs",
  "endpoints": {
    "networks": "/api/networks",
    "nodes": "/api/networks/{network}/nodes",
    "stats": "/api/networks/{network}/stats",
    "distribution": "/api/networks/{network}/distribution",
    "crawl": "/api/crawl",
    "health": "/api/health"
  }
}
```

---

### Health Check

#### GET /api/health

Check API server health and status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-14T10:30:00.000Z",
  "database": "connected",
  "uptime": 12345.67
}
```

---

### Networks

#### GET /api/networks

Get list of all monitored networks.

**Response:**
```json
[
  {
    "id": "mainnet",
    "name": "Base Mainnet",
    "endpoint_count": 27
  },
  {
    "id": "sepolia",
    "name": "Base Sepolia",
    "endpoint_count": 6
  }
]
```

#### GET /api/networks/:network/stats

Get statistics for a specific network.

**Parameters:**
- `network` (path, required): Network ID (`mainnet` or `sepolia`)

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
    "base-node-reth/v0.15.1": 8,
    "op-geth/v1.101700.2-stable": 3
  },
  "last_updated": 1713096000000
}
```

**Error Responses:**
- `404 Not Found` - Network not found

---

### Nodes

#### GET /api/networks/:network/nodes

Get all nodes for a specific network.

**Parameters:**
- `network` (path, required): Network ID (`mainnet` or `sepolia`)
- `online_only` (query, optional): Filter to only online nodes (default: `false`)

**Example:**
```
GET /api/networks/mainnet/nodes?online_only=true
```

**Response:**
```json
{
  "network": "mainnet",
  "node_count": 21,
  "nodes": [
    {
      "id": 1,
      "url": "https://mainnet.base.org",
      "network": "mainnet",
      "client_version": "op-geth/v1.101701.0-stable/linux-amd64/go1.21.5",
      "block_number": 25123456,
      "syncing": false,
      "online": true,
      "last_seen": "2026-04-14T10:30:00.000Z"
    },
    {
      "id": 2,
      "url": "https://base.meowrpc.com",
      "network": "mainnet",
      "client_version": "base-node-reth/v0.15.1",
      "block_number": 25123455,
      "syncing": false,
      "online": true,
      "last_seen": "2026-04-14T10:30:05.000Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - Network not found

---

### Distribution

#### GET /api/networks/:network/distribution/clients

Get client distribution with percentages for a specific network.

**Parameters:**
- `network` (path, required): Network ID

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
  },
  {
    "client": "Tenderly",
    "count": 2,
    "percentage": 9.5
  },
  {
    "client": "Nethermind",
    "count": 1,
    "percentage": 4.8
  }
]
```

**Error Responses:**
- `404 Not Found` - Network not found

#### GET /api/networks/:network/distribution/versions

Get version distribution with percentages for a specific network.

**Parameters:**
- `network` (path, required): Network ID

**Response:**
```json
[
  {
    "version": "base-node-reth/v0.15.1",
    "count": 8,
    "percentage": 38.1
  },
  {
    "version": "op-geth/v1.101701.0-stable",
    "count": 5,
    "percentage": 23.8
  },
  {
    "version": "op-geth/v1.101700.2-stable",
    "count": 3,
    "percentage": 14.3
  }
]
```

**Error Responses:**
- `404 Not Found` - Network not found

#### GET /api/networks/:network/distribution

Get client and version distributions for a network.

**Parameters:**
- `network` (path, required): Network ID

**Response:**
```json
{
  "network": "mainnet",
  "clients": [
    {
      "client": "reth",
      "count": 10,
      "percentage": 47.6
    },
    {
      "client": "Geth",
      "count": 8,
      "percentage": 38.1
    },
    {
      "client": "Tenderly",
      "count": 2,
      "percentage": 9.5
    }
  ],
  "versions": [
    {
      "version": "base-node-reth/v0.15.1",
      "count": 8,
      "percentage": 38.1
    },
    {
      "version": "op-geth/v1.101701.0-stable",
      "count": 5,
      "percentage": 23.8
    },
    {
      "version": "op-geth/v1.101700.2-stable",
      "count": 3,
      "percentage": 14.3
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - Network not found

**Use Case:** Track upgrade adoption and identify nodes running problematic versions.

---

### Crawling

#### POST /api/crawl

Trigger a manual crawl of networks.

**Parameters:**
- `network` (query, optional): Specific network to crawl. If omitted, crawls all networks.

**Example:**
```
POST /api/crawl?network=mainnet
```

**Response:**
```json
{
  "status": "started",
  "message": "Crawl initiated for mainnet",
  "timestamp": "2026-04-14T10:30:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Network not found (when network parameter is provided)
- `409 Conflict` - Crawl already in progress

**Notes:**
- Crawl runs asynchronously in the background
- Use `/api/crawl/status` to check progress
- Each node is queried with a 100ms delay between requests

#### GET /api/crawl/status

Get current crawl status and last crawl results.

**Response:**
```json
{
  "isCrawling": false,
  "lastCrawl": "2026-04-14T10:00:00.000Z",
  "lastCrawlResult": {
    "timestamp": "2026-04-14T10:00:00.000Z",
    "networks": {
      "mainnet": {
        "network": "mainnet",
        "name": "Base Mainnet",
        "endpoints_queried": 27,
        "nodes_online": 21,
        "nodes_offline": 6,
        "timestamp": "2026-04-14T10:00:00.000Z"
      },
      "sepolia": {
        "network": "sepolia",
        "name": "Base Sepolia",
        "endpoints_queried": 6,
        "nodes_online": 4,
        "nodes_offline": 2,
        "timestamp": "2026-04-14T10:00:15.000Z"
      }
    }
  }
}
```

---

## Data Types

### Node Object

```typescript
interface Node {
  id: number;
  url: string;
  network: string;
  client_version: string | null;  // Execution layer client (e.g., "op-geth/v1.101701.0")
  block_number: number | null;
  syncing: boolean | null;
  online: boolean;
  last_seen: string; // ISO 8601 timestamp
}
```

### Client Distribution Object

```typescript
interface ClientDistribution {
  client: string;
  count: number;
  percentage: number;
}
```

### Version Distribution Object

```typescript
interface VersionDistribution {
  version: string;
  count: number;
  percentage: number;
}
```

### Network Stats Object

```typescript
interface NetworkStats {
  network: string;
  total_endpoints: number;
  online_nodes: number;
  offline_nodes: number;
  clients: { [client: string]: number };
  versions: { [version: string]: number };
  last_updated: number | null; // Unix timestamp (milliseconds)
}
```

---

## Client Mapping

The API automatically maps client version strings to simplified client names:

| Version String Contains | Mapped To |
|------------------------|-----------|
| `reth`, `base-node` | `reth` |
| `geth`, `op-geth` | `Geth` |
| `nethermind` | `Nethermind` |
| `tenderly` | `Tenderly` |
| `erigon` | `Erigon` |
| Other | `Other` |

---

## Rate Limiting

No rate limiting is currently implemented. For production deployments, consider adding:
- Nginx rate limiting
- Express rate limiter middleware
- API key authentication for write operations

---

## CORS

By default, all origins are allowed:

```javascript
app.use(cors());
```

For production, restrict to specific origins:

```javascript
app.use(cors({
  origin: ['https://your-frontend.com', 'https://app.yourdomain.com']
}));
```

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 404 | Resource not found (invalid network ID) |
| 409 | Conflict (crawl already in progress) |
| 500 | Internal server error |

---

## Client Examples

### cURL

```bash
# Get networks
curl http://localhost:8000/api/networks

# Get mainnet stats
curl http://localhost:8000/api/networks/mainnet/stats

# Get client distribution
curl http://localhost:8000/api/networks/mainnet/distribution/clients

# Trigger crawl
curl -X POST http://localhost:8000/api/crawl

# Check crawl status
curl http://localhost:8000/api/crawl/status
```

### JavaScript (Fetch API)

```javascript
const API_BASE = 'http://localhost:8000/api';

// Get networks
async function getNetworks() {
  const res = await fetch(`${API_BASE}/networks`);
  return res.json();
}

// Get stats
async function getStats(network) {
  const res = await fetch(`${API_BASE}/networks/${network}/stats`);
  return res.json();
}

// Trigger crawl
async function triggerCrawl(network = null) {
  const url = network
    ? `${API_BASE}/crawl?network=${network}`
    : `${API_BASE}/crawl`;
  const res = await fetch(url, { method: 'POST' });
  return res.json();
}
```

### Python

```python
import requests

API_BASE = 'http://localhost:8000/api'

# Get networks
def get_networks():
    response = requests.get(f'{API_BASE}/networks')
    return response.json()

# Get stats
def get_stats(network):
    response = requests.get(f'{API_BASE}/networks/{network}/stats')
    return response.json()

# Trigger crawl
def trigger_crawl(network=None):
    url = f'{API_BASE}/crawl'
    if network:
        url += f'?network={network}'
    response = requests.post(url)
    return response.json()
```

---

## WebSocket Support

WebSocket support is not currently implemented. For real-time updates, consider:
- Polling `/api/crawl/status` endpoint
- Implementing Server-Sent Events (SSE)
- Adding Socket.io for real-time notifications

---

## Versioning

Current API version: **v1.0.0**

Future versions will be namespaced:
- `/api/v1/networks`
- `/api/v2/networks`

---

## Support

For issues or questions:
- GitHub Issues: [base-node-monitor/issues]
- Documentation: [README.md](../README.md)
- Proposal: [PROPOSAL.md](PROPOSAL.md)
