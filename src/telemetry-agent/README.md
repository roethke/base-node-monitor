# Base Telemetry Agent

Lightweight opt-in monitoring agent for Base node operators.

## Quick Start

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your settings

# Run
npm start
```

## Configuration

See `.env.example` for all options. Minimum required:

```bash
NODE_RPC_URL=http://localhost:8545
TELEMETRY_ENDPOINT=https://telemetry.base.org/api/telemetry/report
NETWORK=mainnet
```

## What It Does

- Queries your local Base node every 6 hours
- Sends anonymous metrics to telemetry server
- Generates persistent node ID
- Handles errors gracefully (won't crash your node)

## What It Sends

- Node ID (anonymous hash)
- Client version
- Block height
- Sync status
- Peer count
- Network type
- Optional: Node name (if you configure it)

## What It Does NOT Send

- IP addresses
- Transaction data
- Account information
- Private keys

## For Operators

Full setup guide: [../../docs/TELEMETRY_SETUP.md](../../docs/TELEMETRY_SETUP.md)

Docker deployment: [../../docker/telemetry-agent/](../../docker/telemetry-agent/)

## License

MIT
