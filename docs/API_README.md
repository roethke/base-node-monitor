# Base Node Monitor API

REST API for monitoring Base network node client versions and distribution.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the API Server

```bash
python3 api.py
```

The API will be available at: `http://localhost:8000`

### 3. Start the Background Scheduler (Optional)

In a separate terminal, run the scheduler to crawl networks periodically:

```bash
# Crawl every 6 hours (default)
python3 scheduler.py

# Or specify custom interval in hours
python3 scheduler.py 4  # Every 4 hours
```

### 4. View API Documentation

Open your browser to:
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Networks

#### Get All Networks
```http
GET /api/networks
```

**Response:**
```json
[
  {
    "id": "mainnet",
    "name": "Base Mainnet",
    "endpoint_count": 29
  },
  {
    "id": "sepolia",
    "name": "Base Sepolia",
    "endpoint_count": 6
  }
]
```

### Nodes

#### Get Network Nodes
```http
GET /api/networks/{network}/nodes?online_only=false
```

**Parameters:**
- `network` (path): Network ID (mainnet, sepolia)
- `online_only` (query, optional): Filter to only online nodes (default: false)

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
      "peers_count": null,
      "online": true,
      "last_seen": "2026-04-14T10:30:00"
    }
  ]
}
```

### Statistics

#### Get Network Statistics
```http
GET /api/networks/{network}/stats
```

**Response:**
```json
{
  "network": "mainnet",
  "total_endpoints": 29,
  "online_nodes": 21,
  "offline_nodes": 8,
  "clients": {
    "Geth": 8,
    "reth": 10,
    "Tenderly": 2,
    "Nethermind": 1
  },
  "versions": {
    "op-geth/v1.101701.0-stable": 5,
    "base-node-reth/v0.15.1": 8
  },
  "last_updated": "2026-04-14T10:30:00"
}
```

### Distribution

#### Get Client Distribution
```http
GET /api/networks/{network}/distribution/clients
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

#### Get Version Distribution
```http
GET /api/networks/{network}/distribution/versions
```

**Response:**
```json
[
  {
    "version": "op-geth/v1.101701.0-stable",
    "count": 5,
    "percentage": 23.8
  }
]
```

#### Get All Distributions
```http
GET /api/networks/{network}/distribution
```

**Response:**
```json
{
  "network": "mainnet",
  "clients": [
    {
      "client": "reth",
      "count": 10,
      "percentage": 47.6
    }
  ],
  "versions": [
    {
      "version": "base-node-reth/v0.15.1",
      "count": 8,
      "percentage": 38.1
    }
  ]
}
```

### Crawling

#### Trigger Manual Crawl
```http
POST /api/crawl?network=mainnet
```

**Parameters:**
- `network` (query, optional): Specific network to crawl. If omitted, crawls all networks.

**Response:**
```json
{
  "status": "started",
  "message": "Crawl initiated for mainnet",
  "timestamp": "2026-04-14T10:30:00"
}
```

#### Get Crawl Status
```http
GET /api/crawl/status
```

**Response:**
```json
{
  "is_crawling": false,
  "last_crawl": "2026-04-14T10:30:00",
  "last_crawl_result": {
    "timestamp": "2026-04-14T10:30:00",
    "networks": {
      "mainnet": {
        "network": "mainnet",
        "name": "Base Mainnet",
        "endpoints_queried": 29,
        "nodes_online": 21,
        "nodes_offline": 8
      }
    }
  }
}
```

### Health Check

#### Get API Health
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-14T10:30:00",
  "database": "connected",
  "is_crawling": false,
  "last_crawl": "2026-04-14T09:00:00"
}
```

## Frontend Integration

### Example: React Component

```typescript
// Fetch network statistics
async function fetchNetworkStats(network: string) {
  const response = await fetch(`http://localhost:8000/api/networks/${network}/stats`);
  const data = await response.json();
  return data;
}

// Fetch client distribution
async function fetchClientDistribution(network: string) {
  const response = await fetch(`http://localhost:8000/api/networks/${network}/distribution/clients`);
  const data = await response.json();
  return data;
}

// Trigger crawl
async function triggerCrawl(network?: string) {
  const url = network
    ? `http://localhost:8000/api/crawl?network=${network}`
    : 'http://localhost:8000/api/crawl';

  const response = await fetch(url, { method: 'POST' });
  const data = await response.json();
  return data;
}
```

### Example: Vue Component

```javascript
export default {
  data() {
    return {
      stats: null,
      distribution: null
    }
  },
  async mounted() {
    // Load network stats
    const statsRes = await fetch('http://localhost:8000/api/networks/mainnet/stats');
    this.stats = await statsRes.json();

    // Load distribution
    const distRes = await fetch('http://localhost:8000/api/networks/mainnet/distribution');
    this.distribution = await distRes.json();
  }
}
```

## Architecture

```
┌─────────────────┐
│  Frontend App   │
│  (React/Vue)    │
└────────┬────────┘
         │
         │ HTTP/REST
         ▼
┌─────────────────┐      ┌──────────────┐
│   FastAPI       │──────│   SQLite     │
│   (api.py)      │      │  Database    │
└────────┬────────┘      └──────────────┘
         │
         │ Calls
         ▼
┌─────────────────┐
│   Crawler       │
│  (crawler.py)   │──────▶ Base Network
└─────────────────┘       RPC Endpoints
         ▲
         │
         │ Scheduled
┌────────┴────────┐
│   Scheduler     │
│ (scheduler.py)  │
└─────────────────┘
```

## Configuration

### Change Crawl Interval

Edit `scheduler.py` or pass as argument:

```bash
python3 scheduler.py 3  # Every 3 hours
```

### Add New Endpoints

Edit `NETWORKS` in `crawler.py`:

```python
NETWORKS = {
    "mainnet": {
        "name": "Base Mainnet",
        "rpc_endpoints": [
            "https://your-new-endpoint.com",
            # ... existing endpoints
        ]
    }
}
```

### CORS Configuration

For production, update `api.py` to specify exact origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com",
        "https://app.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Deployment

### Option 1: Docker (Recommended)

Coming soon: Dockerfile and docker-compose.yml

### Option 2: Systemd Service

Create `/etc/systemd/system/base-monitor-api.service`:

```ini
[Unit]
Description=Base Node Monitor API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/base-node-monitor
ExecStart=/usr/bin/python3 /path/to/base-node-monitor/api.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/base-monitor-scheduler.service`:

```ini
[Unit]
Description=Base Node Monitor Scheduler
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/base-node-monitor
ExecStart=/usr/bin/python3 /path/to/base-node-monitor/scheduler.py 6
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable base-monitor-api base-monitor-scheduler
sudo systemctl start base-monitor-api base-monitor-scheduler
```

### Option 3: PM2 (Node.js Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start API
pm2 start api.py --name base-monitor-api --interpreter python3

# Start Scheduler
pm2 start scheduler.py --name base-monitor-scheduler --interpreter python3 -- 6

# Save and setup startup
pm2 save
pm2 startup
```

## Database

The API uses SQLite for data storage. The database file `base_nodes.db` is created automatically.

### Tables

**nodes**: Current state of all monitored nodes
- `url`: RPC endpoint URL
- `network`: Network identifier (mainnet/sepolia)
- `client_version`: Client version string
- `block_number`: Latest block number
- `online`: Boolean status
- `last_seen`: Last successful query timestamp

**node_history**: Historical records of all crawls
- Same fields as `nodes` table
- `timestamp`: When the record was created

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

## Troubleshooting

### Port Already in Use

Change the port in `api.py`:

```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Changed from 8000
```

### CORS Errors

Make sure your frontend origin is allowed in the CORS middleware configuration.

### No Data Available

Run a manual crawl first:

```bash
curl -X POST http://localhost:8000/api/crawl
```

Or start the scheduler to populate data automatically.

## Performance

- **Request latency**: <50ms for cached data
- **Crawl duration**: ~30 seconds for all networks (38 endpoints)
- **Database size**: ~1MB per 10,000 historical records
- **Memory usage**: ~50MB for API server

## Security

- **Read-only queries**: API only exposes read operations on public data
- **No authentication required**: All endpoints are public (monitoring data)
- **Rate limiting**: Consider adding nginx rate limiting in production
- **CORS**: Configure strict origin policies for production

## Support

For issues or questions, refer to:
- **PROPOSAL.md**: Full project context
- **API Docs**: http://localhost:8000/docs
- **Original crawler**: `base_node_crawler.py` (legacy)
