"""
Crawler module for Base Node Monitor.
Handles querying Base network nodes and storing results.
"""

import requests
from datetime import datetime
from typing import Dict, List
import time
from database import NodeDatabase


# Network configurations
NETWORKS = {
    "mainnet": {
        "name": "Base Mainnet",
        "rpc_endpoints": [
            "https://mainnet.base.org",
            "https://developer-access-mainnet.base.org",
            "https://base.meowrpc.com",
            "https://base-mainnet.public.blastapi.io",
            "https://base.gateway.tenderly.co",
            "https://gateway.tenderly.co/public/base",
            "https://rpc.notadegen.com/base",
            "https://base.blockpi.network/v1/rpc/public",
            "https://1rpc.io/base",
            "https://base-pokt.nodies.app",
            "https://base-mainnet.diamondswap.org/rpc",
            "https://base.publicnode.com",
            "https://base.drpc.org",
            "https://endpoints.omniatech.io/v1/base/mainnet/public",
            "https://base-rpc.publicnode.com",
            "https://base.llamarpc.com",
            "https://api.zan.top/node/v1/base/public",
            "https://lb.drpc.org/ogrpc?network=base&dkey=Ak765fp4zUm6uVwKu4annC8M80dnCZkR7pAEsm6XXi_w",
            "https://eth.nownodes.io/base",
            "https://base-mainnet.rpc.extrnode.com",
            "https://go.getblock.io/5c55b5a613d541b29e91762dc19cb476",
            "https://base.api.onfinality.io/public",
            "https://base-mainnet.nodeconnect.org",
            "https://base-mainnet.rpc.extrnode.com",
            "https://base-mainnet-public.unifra.io",
            "https://public.stackup.sh/api/v1/node/base-mainnet",
            "https://rpc.tornadoeth.cash/base",
            "https://base.meowrpc.com",
            "https://base-mainnet.g.alchemy.com/v2/demo",
            "https://mainnet.base.org",
        ],
        "admin_nodes": []
    },
    "sepolia": {
        "name": "Base Sepolia",
        "rpc_endpoints": [
            "https://sepolia.base.org",
            "https://base-sepolia.blockpi.network/v1/rpc/public",
            "https://base-sepolia-rpc.publicnode.com",
            "https://public.stackup.sh/api/v1/node/base-sepolia",
            "https://base-sepolia.gateway.tenderly.co",
            "https://gateway.tenderly.co/public/base-sepolia"
        ],
        "admin_nodes": []
    }
}


class NodeCrawler:
    """Crawls Base network nodes and stores data."""

    def __init__(self, db: NodeDatabase):
        self.db = db
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Base-Node-Monitor/1.0'
        })

    def query_node(self, url: str, network: str, timeout: int = 10) -> Dict:
        """Query a single node for its information."""
        result = {
            "url": url,
            "network": network,
            "client_version": None,
            "block_number": None,
            "syncing": None,
            "online": False,
            "last_seen": datetime.now(),
            "peers_count": None
        }

        try:
            # Query client version
            version_payload = {
                "jsonrpc": "2.0",
                "method": "web3_clientVersion",
                "params": [],
                "id": 1
            }
            response = self.session.post(url, json=version_payload, timeout=timeout)
            if response.status_code == 200:
                data = response.json()
                if 'result' in data:
                    result["client_version"] = data['result']
                    result["online"] = True

            # Query block number
            if result["online"]:
                block_payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_blockNumber",
                    "params": [],
                    "id": 2
                }
                response = self.session.post(url, json=block_payload, timeout=timeout)
                if response.status_code == 200:
                    data = response.json()
                    if 'result' in data:
                        result["block_number"] = int(data['result'], 16)

            # Query sync status
            if result["online"]:
                sync_payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_syncing",
                    "params": [],
                    "id": 3
                }
                response = self.session.post(url, json=sync_payload, timeout=timeout)
                if response.status_code == 200:
                    data = response.json()
                    if 'result' in data:
                        result["syncing"] = data['result'] if isinstance(data['result'], bool) else True

        except requests.exceptions.Timeout:
            pass
        except requests.exceptions.RequestException:
            pass
        except Exception:
            pass

        return result

    def crawl_network(self, network: str) -> Dict:
        """Crawl all nodes in a specific network."""
        if network not in NETWORKS:
            return {"error": f"Network {network} not found"}

        network_config = NETWORKS[network]
        results = {
            "network": network,
            "name": network_config["name"],
            "endpoints_queried": 0,
            "nodes_online": 0,
            "nodes_offline": 0,
            "timestamp": datetime.now().isoformat()
        }

        endpoints = network_config["rpc_endpoints"]
        results["endpoints_queried"] = len(endpoints)

        for url in endpoints:
            node_data = self.query_node(url, network)
            self.db.upsert_node(node_data)

            if node_data["online"]:
                results["nodes_online"] += 1
            else:
                results["nodes_offline"] += 1

            # Small delay to be respectful
            time.sleep(0.1)

        return results

    def crawl_all_networks(self) -> Dict:
        """Crawl all configured networks."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "networks": {}
        }

        for network in NETWORKS.keys():
            network_result = self.crawl_network(network)
            results["networks"][network] = network_result

        return results
