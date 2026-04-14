# Telemetry Agent Setup Guide for Node Operators

## What Is This?

The **Base Telemetry Agent** is an optional sidecar that you can run alongside your Base node to help monitor network health.

**What it does:**
- Queries your local node every 6 hours
- Sends anonymous metrics to the Base monitoring dashboard
- Helps coordinate safe network upgrades

**What it does NOT do:**
- ❌ Access your private keys
- ❌ Collect transaction data
- ❌ Expose your IP address
- ❌ Affect node performance

## Why Should I Opt In?

### 1. Help the Network
Enable the Base team to:
- Track upgrade adoption ("60% of nodes on v0.16.0")
- Detect problematic versions early
- Make data-driven upgrade decisions

### 2. Public Recognition
- Your node (optionally) appears on the public dashboard
- Show your support for Base

### 3. Network Health
Better monitoring = safer upgrades = more stable network

## What Data Is Sent?

**Every 6 hours, the agent sends:**

```json
{
  "node_id": "abc123...",              // Anonymous hash (consistent per node)
  "node_name": "MyCompany-Node-1",     // Optional - you choose this
  "client_version": "op-geth/v1.10.0", // Your execution client
  "network": "mainnet",                // mainnet or sepolia
  "block_number": 25123456,            // Current block height
  "syncing": false,                    // Whether node is syncing
  "peer_count": 127,                   // Number of peers connected
  "uptime_seconds": 86400,             // How long agent has been running
  "timestamp": 1713096000              // When this report was sent
}
```

**Privacy protections:**
- `node_id` is a random hash (anonymous but consistent)
- `node_name` is optional (you choose whether to share)
- Your IP address is **never** collected or stored
- No transaction data, no account information

## Quick Start

### Option 1: Docker (Recommended)

**Step 1: Create config file**

```bash
# Create .env file
cat > telemetry.env <<EOF
NODE_RPC_URL=http://localhost:8545
TELEMETRY_ENDPOINT=https://telemetry.base.org/api/telemetry/report
NETWORK=mainnet
NODE_NAME=MyCompany-Node-1
REPORT_INTERVAL=21600
EOF
```

**Step 2: Run agent**

```bash
docker run -d \
  --name base-telemetry \
  --env-file telemetry.env \
  --restart unless-stopped \
  base-telemetry-agent:latest
```

**Step 3: Check logs**

```bash
docker logs -f base-telemetry
```

You should see:
```
============================================================
Base Node Telemetry Agent
============================================================
Node ID: abc123def456
Node Name: MyCompany-Node-1
Network: mainnet
RPC URL: http://localhost:8545
Telemetry Server: https://telemetry.base.org/api/telemetry/report
Report Interval: 21600 seconds
============================================================

Collecting initial metrics...
[2026-04-14T10:30:00.000Z] Telemetry report sent successfully
Telemetry agent is running. Press Ctrl+C to stop.
```

### Option 2: Docker Compose (With Base Node)

If you're running your Base node with Docker Compose:

**Add to your existing `docker-compose.yml`:**

```yaml
services:
  # Your existing Base node
  base-node:
    image: ghcr.io/base-org/node:latest
    # ... your existing config ...

  # Add this:
  telemetry-agent:
    image: base-telemetry-agent:latest
    environment:
      NODE_RPC_URL: http://base-node:8545
      TELEMETRY_ENDPOINT: https://telemetry.base.org/api/telemetry/report
      NETWORK: mainnet
      NODE_NAME: MyCompany-Node-1  # Optional: customize this
      REPORT_INTERVAL: 21600        # 6 hours
    depends_on:
      - base-node
    restart: unless-stopped
```

**Start:**

```bash
docker-compose up -d telemetry-agent
```

### Option 3: Standalone (Node.js)

If you prefer to run without Docker:

**Step 1: Install Node.js 16+**

```bash
# Check if you have Node.js
node --version  # Should be v16+
```

**Step 2: Download agent**

```bash
git clone https://github.com/base-org/base-node-monitor.git
cd base-node-monitor/src/telemetry-agent
npm install
```

**Step 3: Configure**

```bash
# Set environment variables
export NODE_RPC_URL=http://localhost:8545
export TELEMETRY_ENDPOINT=https://telemetry.base.org/api/telemetry/report
export NETWORK=mainnet
export NODE_NAME=MyCompany-Node-1
export REPORT_INTERVAL=21600
```

**Step 4: Run**

```bash
node agent.js
```

**Step 5: Run as systemd service (Linux)**

```bash
# Create service file
sudo tee /etc/systemd/system/base-telemetry.service <<EOF
[Unit]
Description=Base Telemetry Agent
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/base-node-monitor/src/telemetry-agent
Environment="NODE_RPC_URL=http://localhost:8545"
Environment="TELEMETRY_ENDPOINT=https://telemetry.base.org/api/telemetry/report"
Environment="NETWORK=mainnet"
Environment="NODE_NAME=MyCompany-Node-1"
Environment="REPORT_INTERVAL=21600"
ExecStart=/usr/bin/node agent.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable base-telemetry
sudo systemctl start base-telemetry

# Check status
sudo systemctl status base-telemetry
```

## Configuration Options

### Required Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_RPC_URL` | Your node's RPC endpoint | `http://localhost:8545` |
| `TELEMETRY_ENDPOINT` | Where to send reports | `https://telemetry.base.org/api/telemetry/report` |
| `NETWORK` | mainnet or sepolia | `mainnet` |

### Optional Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_NAME` | Your node's display name | `null` (anonymous) | `MyCompany-Node-1` |
| `REPORT_INTERVAL` | Seconds between reports | `21600` (6 hours) | `3600` (1 hour) |
| `VERBOSE` | Enable detailed logging | `false` | `true` |

### Choosing a Node Name

**Anonymous (no name):**
```bash
# Don't set NODE_NAME, or set it to empty
NODE_NAME=
```
Dashboard shows: `Node abc123...`

**With name (public):**
```bash
NODE_NAME=MyCompany-Node-SF-1
```
Dashboard shows: `MyCompany-Node-SF-1 (abc123...)`

**Best practices:**
- ✅ Use company/project name if you want recognition
- ✅ Include location if you run multiple nodes (`SF-1`, `EU-2`)
- ❌ Don't include sensitive information
- ❌ Don't include IP addresses or hostnames

## Verifying It Works

### Check Logs

**Docker:**
```bash
docker logs base-telemetry
```

**Systemd:**
```bash
journalctl -u base-telemetry -f
```

**You should see:**
```
Collecting metrics...
[2026-04-14T10:30:00.000Z] Telemetry report sent successfully
```

### Check Dashboard

Visit the public telemetry dashboard:
```
https://telemetry.base.org/
```

Search for your node ID or name to confirm it's reporting.

### Test Manually

Send a test report:

```bash
curl -X POST https://telemetry.base.org/api/telemetry/report \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "test123",
    "client_version": "op-geth/v1.10.0",
    "network": "mainnet",
    "block_number": 25123456,
    "syncing": false,
    "peer_count": 100,
    "timestamp": '$(date +%s)'
  }'
```

Should return:
```json
{
  "status": "received",
  "node_id": "test123"
}
```

## Troubleshooting

### Agent Won't Start

**Problem:** Container exits immediately

**Check:**
```bash
docker logs base-telemetry
```

**Common causes:**
- Missing required environment variables
- Can't reach node RPC (wrong URL)
- Node RPC not accessible from container network

**Fix:**
```bash
# Make sure node RPC is accessible
curl http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}'

# If using Docker, use container network name
NODE_RPC_URL=http://base-node:8545  # not localhost
```

### Reports Not Sending

**Problem:** Agent runs but reports fail

**Check logs:**
```
Error: Failed to send telemetry: ECONNREFUSED
```

**Common causes:**
- Telemetry server is down
- Network/firewall blocking outbound HTTPS
- Wrong telemetry endpoint URL

**Fix:**
```bash
# Test connectivity
curl https://telemetry.base.org/api/health

# Check firewall allows outbound HTTPS
```

### Node Shows as Offline

**Problem:** Dashboard shows node as offline

**Possible causes:**
- Agent stopped running
- No report sent in last 24 hours
- Node itself is offline/unreachable

**Check:**
```bash
# Is agent running?
docker ps | grep telemetry

# Are logs showing successful reports?
docker logs base-telemetry | grep "successfully"

# Is your node responding?
curl http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Privacy & Security

### What We Collect

✅ **We collect:**
- Anonymous node ID (random hash)
- Client version string
- Block height
- Sync status
- Peer count
- Network type (mainnet/sepolia)
- Optional node name (you choose)

❌ **We do NOT collect:**
- IP addresses
- Geographic location (unless you include in node name)
- Transaction data
- Account addresses
- Private keys
- Wallet information

### How Data Is Used

**Public dashboard:**
- Aggregated statistics (total nodes, client distribution)
- Individual node entries (with node ID/name)

**Internal use:**
- Track upgrade adoption
- Coordinate safe upgrades
- Network health monitoring

**We will NEVER:**
- Sell your data
- Share with third parties (except public dashboard)
- Use for marketing purposes

### Open Source

The telemetry agent code is **fully open source**:
- Review: https://github.com/base-org/base-node-monitor
- Audit what's being sent
- Modify if needed (for private deployments)

## Opting Out

### Temporary Stop

```bash
# Docker
docker stop base-telemetry

# Systemd
sudo systemctl stop base-telemetry
```

### Permanent Removal

```bash
# Docker
docker rm -f base-telemetry

# Systemd
sudo systemctl disable base-telemetry
sudo systemctl stop base-telemetry
sudo rm /etc/systemd/system/base-telemetry.service
```

Your node will no longer appear on the dashboard after 24 hours of inactivity.

## Support

### Questions?

- **Documentation**: https://docs.base.org/telemetry
- **GitHub Issues**: https://github.com/base-org/base-node-monitor/issues
- **Discord**: #node-operators channel

### Want to Help?

- ⭐ Star the repo
- 📢 Spread the word to other operators
- 🐛 Report bugs or suggest improvements
- 💡 Contribute code

## Incentives (Future)

**Potential future benefits for telemetry participants:**
- Early notifications of critical upgrades
- Node operator badges/recognition
- Priority support
- Network statistics email digest

*These are not guaranteed - check back for updates*

---

**Thank you for participating in Base network monitoring!** 🔵

Your contribution helps make Base safer and more reliable for everyone.
