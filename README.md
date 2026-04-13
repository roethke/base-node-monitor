# Base Node Monitor

Professional network monitoring tool for Base Mainnet and Sepolia that tracks node client versions, distribution, and health across the network.

## Quick Start

```bash
# Install dependencies
pip install requests

# Run crawler
python3 base_node_crawler.py

# View dashboard
open base_nodes_report.html
```

## Current Status

**Coverage:**
- 38 total endpoints (32 mainnet + 6 sepolia)
- 25 online nodes (21 mainnet + 4 sepolia)
- 171% increase from initial 14 endpoints

**Findings:**
- **reth**: 47.6% (mainnet)
- **Geth**: 38.1% (mainnet)
- **Tenderly**: 9.5% (mainnet)
- **No base-node-reth v0.15.0/v0.15.1 detected** in public infrastructure

## Features

✅ Multi-network monitoring (Mainnet + Sepolia)
✅ Client/version distribution with percentages
✅ Professional dashboard (Base blue theme)
✅ Historical tracking (SQLite database)
✅ Verified accuracy (96% match rate)
✅ Expandable endpoint list

## Why This Matters

### The Problem
During the v0.15.0/v0.15.1 rollout, we had no visibility into:
- What versions node operators were running
- How many nodes were affected by the block writing issue
- Whether major infrastructure providers had upgraded

**We were flying blind.**

### The Solution
This tool provides:
- Real-time network composition
- Version adoption metrics
- Early warning for problematic releases
- Evidence-based upgrade coordination

### Proven Approach
Ethereum has used this methodology for 8+ years:
- Ethernodes.org (5,000+ nodes)
- Nodewatch.io (consensus monitoring)
- ClientDiversity.org (upgrade coordination)

## Documentation

- **[PROPOSAL.md](PROPOSAL.md)** - Full proposal for engineering team (read this for admin API request)
- **[VALIDATION.md](VALIDATION.md)** - Ethereum precedent and proof of concept
- **[ENDPOINT_GROWTH.md](ENDPOINT_GROWTH.md)** - How to expand endpoint coverage
- **[SUMMARY.md](SUMMARY.md)** - Complete project overview

## Current Limitations

**We can only monitor publicly listed RPC endpoints:**
- RPC providers (Alchemy, Infura, etc.)
- Public infrastructure
- ~5% of the actual network

**Missing:**
- Individual node operators (95% of network)
- Exchange nodes
- Infrastructure providers
- Community-run nodes

**Solution:** Admin API access for peer discovery → 500-1,000+ node coverage

See **[PROPOSAL.md](PROPOSAL.md)** for the full security-conscious request.

## Project Structure

```
base-node-monitor/
├── base_node_crawler.py      # Main crawler (38 endpoints)
├── verify_crawler.py          # Accuracy verification
├── update_endpoints.py        # Endpoint list generator
├── base_nodes_report.html     # Generated dashboard
├── base_nodes.db              # SQLite database
├── README.md                  # This file
├── PROPOSAL.md                # Engineering team proposal ⭐
├── VALIDATION.md              # Ethereum precedent
├── ENDPOINT_GROWTH.md         # Expansion strategies
├── SUMMARY.md                 # Complete overview
└── .gitignore                 # Excludes generated files
```

## Usage

### Run Once

```bash
python3 base_node_crawler.py
```

### Schedule (Every 6 Hours)

```bash
# Add to crontab
0 */6 * * * cd /path/to/base-node-monitor && python3 base_node_crawler.py
```

### Verify Accuracy

```bash
python3 verify_crawler.py
```

## Next Steps

1. **Review current state** - Open `base_nodes_report.html`
2. **Read proposal** - See `PROPOSAL.md` for admin API request
3. **Expand coverage** - Request read-only admin API access
4. **Track adoption** - Monitor v0.15.1+ rollout

## Contributing

### Adding Endpoints

Edit the `NETWORKS` configuration in `base_node_crawler.py`:

```python
NETWORKS = {
    "mainnet": {
        "rpc_endpoints": [
            "https://your-new-endpoint.com",
            # ... existing endpoints
        ]
    }
}
```

Or run `update_endpoints.py` to generate an updated list from ChainList.org.

### Admin API Access

See **[PROPOSAL.md](PROPOSAL.md)** for how to request admin API access safely and securely.

## Security

- **Current state**: Only queries public RPC endpoints (read-only)
- **No sensitive data**: Doesn't access private keys or accounts
- **Admin API proposal**: Includes security-first implementation options
- **See PROPOSAL.md**: Full security analysis and mitigation strategies

## Questions?

- **"Is this safe?"** - Yes, currently only queries public endpoints. Admin API proposal includes multiple security options.
- **"Is the data accurate?"** - Yes, verified at 96% accuracy. Run `verify_crawler.py` to check.
- **"Why so few nodes?"** - We're limited to public RPC endpoints. Admin API access would scale to 500-1,000+ nodes.
- **"How does Ethereum do this?"** - See `VALIDATION.md` for 8+ years of Ethereum precedent.

## License

[To be determined]

## Acknowledgments

Inspired by:
- Ethernodes.org (Ethereum network monitoring)
- Nodewatch.io (Ethereum consensus monitoring)
- ClientDiversity.org (Ethereum client diversity tracking)

---

**Status:** Phase 1 Complete ✅
**Next:** Phase 2 requires admin API access (see PROPOSAL.md)
**Dashboard:** Open `base_nodes_report.html` to view current network state
