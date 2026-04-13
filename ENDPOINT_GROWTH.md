# How to Grow the Base Node Endpoint List

## Current Coverage

**Before expansion:**
- Mainnet: 10 endpoints
- Sepolia: 4 endpoints
- Total: 14 endpoints

**After expansion (now):**
- Mainnet: 32 endpoints → **21 online nodes**
- Sepolia: 6 endpoints → **4 online nodes**
- Total: 38 endpoints → **25 online nodes**

**Coverage increased by 171%!**

---

## Sources Used

### 1. **ChainList.org** (Primary Source)
- Aggregates all public RPC endpoints for every blockchain
- Base Mainnet: https://chainlist.org/?search=base
- Found 35+ Base Mainnet endpoints
- Regularly updated by community

### 2. **Base Official Documentation**
- https://docs.base.org/docs/network-information
- Official Base RPCs (mainnet.base.org, sepolia.base.org)
- Flashblocks endpoints (preconf endpoints)

---

## Additional Sources to Expand Further

### 3. **Individual RPC Provider Docs**

Check documentation from major providers:

**Already included:**
- Alchemy
- Infura (if available)
- QuickNode
- Ankr
- GetBlock
- BlockPI
- PublicNode
- DRPC
- OnFinality
- Tatum
- SubQuery

**To research:**
- Moralis: https://docs.moralis.com
- Chainstack: https://chainstack.com
- NOWNodes: https://nownodes.io
- Pocket Network: https://docs.pokt.network

### 4. **GitHub Repositories**

Search for:
- "base rpc" on GitHub
- "base mainnet endpoints"
- Base ecosystem project configs (often have RPC lists)

### 5. **Base Discord/Community**

- Base Discord server
- OP Stack Discord
- Ask community members for their RPC endpoints
- Some teams run public endpoints

### 6. **DeFi Protocol Configs**

Check popular Base protocols:
- Uniswap Base deployment
- Aave Base
- Compound Base
- Their configs often list RPC endpoints

---

## The Real Game Changer: Admin API Access

**Current limitation:** We can only query publicly listed endpoints

**With admin API access:**
- Query `admin_peers` to discover 50-100 peer IPs per node
- Recursively crawl those peers
- Discover 500-1,000+ nodes across the network

**How to get it:**
Ask Base team:
> "Can we get **read-only** access to `admin_peers` API on a Base mainnet and sepolia node? We need this for network monitoring to track client version distribution. We only need read-only access - specifically `admin_peers` and `admin_nodeInfo`."

**Expected growth:**
- From 25 nodes → 500+ nodes
- From public RPC infrastructure only → Full network visibility
- From "what RPC providers run" → "what the actual network runs"

---

## Ongoing Maintenance

### Automated Discovery (Future Enhancement)

Create a script to:
1. Periodically scrape ChainList.org for new Base endpoints
2. Test each endpoint for validity
3. Auto-add working endpoints to NETWORKS config
4. Remove consistently failing endpoints

### Community Contributions

Once this is public:
1. Accept PRs with new endpoints
2. Community members add their own nodes
3. RPC providers submit their endpoints
4. Organic growth through open source

---

## Summary

**Current state:** 38 endpoints, 25 online nodes
**Next step:** Get admin API access → 500+ nodes
**Long-term:** Community contributions + automated discovery → 1,000+ nodes

The foundation is built. Now it's about scaling through admin API access and community growth.
