# Base Node Monitor

Network monitoring tool for Base Mainnet and Sepolia that tracks node client versions, distribution, and health across the network.

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

## License

MIT
