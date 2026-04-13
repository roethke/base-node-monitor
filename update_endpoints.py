#!/usr/bin/env python3
"""
Update base_node_crawler.py with expanded RPC endpoint list from ChainList.org
Run this to add 35+ mainnet and additional sepolia endpoints.
"""

# Comprehensive list from ChainList.org and Base documentation
MAINNET_ENDPOINTS = [
    # Base official
    "https://mainnet.base.org",
    "https://developer-access-mainnet.base.org",
    "https://mainnet-preconf.base.org",  # Flashblocks

    # Major RPC providers
    "https://base.llamarpc.com",
    "https://1rpc.io/base",
    "https://base-rpc.publicnode.com",
    "https://base.gateway.tenderly.co",
    "https://gateway.tenderly.co/public/base",
    "https://base.meowrpc.com",
    "https://base-mainnet.public.blastapi.io",
    "https://base.public.blockpi.network/v1/rpc/public",
    "https://base.drpc.org",
    "https://base-pokt.nodies.app",
    "https://base-public.nodies.app",

    # Infrastructure providers
    "https://base.api.onfinality.io/public",
    "https://public.stackup.sh/api/v1/node/base-mainnet",
    "https://base-mainnet.gateway.tatum.io",
    "https://base.rpc.subquery.network/public",
    "https://api.zan.top/base-mainnet",
    "https://endpoints.omniatech.io/v1/base/mainnet/public",
    "https://base.lava.build",

    # Community/specialized providers
    "https://li-fi-base.intustechno.workers.dev/rpc",
    "https://base-mainnet.diamondswap.org/rpc",
    "https://rpc.notadegen.com/base",
    "https://rpc.numa.network/base",
    "https://base.therpc.io",
    "https://rpc.poolz.finance/base",
    "https://base.api.pocket.network",
    "https://base.rpc.blxrbdn.com",
    "https://rpcbase.hairylabs.io/rpc",
    "https://rpc.sentio.xyz/base",
    "https://api-base-mainnet-archive.n.dwellir.com/2ccf18bf-2916-4198-8856-42172854353c",

    # Note: Skipping WebSocket endpoints (wss://) - crawler uses HTTP
    # Note: Skipping owlracle (has API key in URL)
]

SEPOLIA_ENDPOINTS = [
    # Base official
    "https://sepolia.base.org",
    "https://sepolia-preconf.base.org",  # Flashblocks

    # Public providers with Sepolia support
    "https://base-sepolia-rpc.publicnode.com",
    "https://base-sepolia.public.blastapi.io",
    "https://base-sepolia.blockpi.network/v1/rpc/public",
    "https://base-sepolia.gateway.tenderly.co",
]

def generate_config():
    """Generate the NETWORKS configuration for base_node_crawler.py"""

    config = '''# Network configurations
NETWORKS = {
    "mainnet": {
        "name": "Base Mainnet",
        "rpc_endpoints": [
'''

    for endpoint in MAINNET_ENDPOINTS:
        config += f'            "{endpoint}",\n'

    config += '''        ],
        "admin_nodes": [
            # "http://base-mainnet-node.internal:8545",
        ]
    },
    "sepolia": {
        "name": "Base Sepolia",
        "rpc_endpoints": [
'''

    for endpoint in SEPOLIA_ENDPOINTS:
        config += f'            "{endpoint}",\n'

    config += '''        ],
        "admin_nodes": [
            # "http://base-sepolia-node.internal:8545",
        ]
    }
}'''

    return config

def main():
    print("=" * 60)
    print("BASE NODE CRAWLER - ENDPOINT UPDATE")
    print("=" * 60)
    print()
    print(f"Current endpoint counts:")
    print(f"  Mainnet: {len(MAINNET_ENDPOINTS)} endpoints")
    print(f"  Sepolia: {len(SEPOLIA_ENDPOINTS)} endpoints")
    print(f"  Total: {len(MAINNET_ENDPOINTS) + len(SEPOLIA_ENDPOINTS)} endpoints")
    print()
    print("=" * 60)
    print("GENERATED CONFIGURATION")
    print("=" * 60)
    print()
    print(generate_config())
    print()
    print("=" * 60)
    print()
    print("To update base_node_crawler.py:")
    print("1. Open base_node_crawler.py")
    print("2. Replace the NETWORKS configuration (lines ~16-40)")
    print("3. Paste the configuration printed above")
    print("4. Save and run the crawler")
    print()
    print("This will increase coverage from 10 → 30+ endpoints!")

if __name__ == "__main__":
    main()
