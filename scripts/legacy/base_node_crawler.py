#!/usr/bin/env python3
"""
Base Node Crawler
Discovers and monitors Base network nodes without running your own node.
"""

import requests
import json
import sqlite3
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
import os

# Network configurations
NETWORKS = {
    "mainnet": {
        "name": "Base Mainnet",
        "rpc_endpoints": [
            "https://mainnet.base.org",
            "https://developer-access-mainnet.base.org",
            "https://mainnet-preconf.base.org",
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
            "https://base.api.onfinality.io/public",
            "https://public.stackup.sh/api/v1/node/base-mainnet",
            "https://base-mainnet.gateway.tatum.io",
            "https://base.rpc.subquery.network/public",
            "https://api.zan.top/base-mainnet",
            "https://endpoints.omniatech.io/v1/base/mainnet/public",
            "https://base.lava.build",
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
        ],
        "admin_nodes": [
            # "http://base-mainnet-node.internal:8545",
        ]
    },
    "sepolia": {
        "name": "Base Sepolia",
        "rpc_endpoints": [
            "https://sepolia.base.org",
            "https://sepolia-preconf.base.org",
            "https://base-sepolia-rpc.publicnode.com",
            "https://base-sepolia.public.blastapi.io",
            "https://base-sepolia.blockpi.network/v1/rpc/public",
            "https://base-sepolia.gateway.tenderly.co",
        ],
        "admin_nodes": [
            # "http://base-sepolia-node.internal:8545",
        ]
    }
}

class BaseNodeCrawler:
    def __init__(self, db_path="base_nodes.db"):
        self.db_path = db_path
        self.discovered_nodes = set()
        self.init_db()

    def init_db(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS nodes (
                url TEXT,
                network TEXT,
                client_version TEXT,
                block_number INTEGER,
                syncing BOOLEAN,
                online BOOLEAN,
                last_seen TIMESTAMP,
                peers_count INTEGER,
                PRIMARY KEY (url, network)
            )
        ''')
        c.execute('''
            CREATE TABLE IF NOT EXISTS crawl_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                network TEXT,
                timestamp TIMESTAMP,
                total_nodes INTEGER,
                online_nodes INTEGER,
                client_stats TEXT
            )
        ''')
        conn.commit()
        conn.close()

    def query_node(self, url, network, timeout=10):
        """Query a node for its information"""
        print(f"Querying {url}...")

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
            # Get client version
            response = requests.post(
                url,
                json={
                    "jsonrpc": "2.0",
                    "method": "web3_clientVersion",
                    "params": [],
                    "id": 1
                },
                timeout=timeout,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                result["client_version"] = data.get("result")
                result["online"] = True

                # Get block number
                response = requests.post(
                    url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_blockNumber",
                        "params": [],
                        "id": 2
                    },
                    timeout=timeout,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    data = response.json()
                    block_hex = data.get("result")
                    if block_hex:
                        result["block_number"] = int(block_hex, 16)

                # Get sync status
                response = requests.post(
                    url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_syncing",
                        "params": [],
                        "id": 3
                    },
                    timeout=timeout,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    data = response.json()
                    sync_result = data.get("result")
                    result["syncing"] = sync_result if isinstance(sync_result, bool) else True

                print(f"  ✓ {url}: {result['client_version']}")

        except requests.exceptions.Timeout:
            print(f"  ✗ {url}: Timeout")
        except requests.exceptions.ConnectionError:
            print(f"  ✗ {url}: Connection failed")
        except Exception as e:
            print(f"  ✗ {url}: Error - {str(e)}")

        return result

    def get_peers(self, url, timeout=10):
        """Try to get peer list from a node (requires admin API)"""
        try:
            response = requests.post(
                url,
                json={
                    "jsonrpc": "2.0",
                    "method": "admin_peers",
                    "params": [],
                    "id": 1
                },
                timeout=timeout,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                if "result" in data and isinstance(data["result"], list):
                    peers = data["result"]
                    print(f"  Found {len(peers)} peers from {url}")

                    # Extract peer addresses that might have RPC enabled
                    peer_addresses = []
                    for peer in peers:
                        if "network" in peer and "remoteAddress" in peer["network"]:
                            addr = peer["network"]["remoteAddress"]
                            # Try to construct RPC URL (many nodes expose RPC on 8545)
                            ip = addr.split(":")[0]
                            peer_addresses.append(f"http://{ip}:8545")

                    return peer_addresses
        except Exception as e:
            print(f"  Could not get peers from {url}: {str(e)}")

        return []

    def save_node(self, node_info):
        """Save node information to database"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO nodes
            (url, network, client_version, block_number, syncing, online, last_seen, peers_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            node_info["url"],
            node_info["network"],
            node_info["client_version"],
            node_info["block_number"],
            node_info["syncing"],
            node_info["online"],
            node_info["last_seen"],
            node_info["peers_count"]
        ))
        conn.commit()
        conn.close()

    def crawl(self, network="mainnet", discover_peers=False):
        """Main crawling function"""
        if network not in NETWORKS:
            raise ValueError(f"Unknown network: {network}. Available: {list(NETWORKS.keys())}")

        network_config = NETWORKS[network]
        print("=" * 60)
        print(f"BASE NODE CRAWLER - {network_config['name']}")
        print("=" * 60)
        print(f"Starting crawl at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        nodes_to_query = set(network_config['rpc_endpoints'])

        # Try to discover peers if admin-enabled nodes are available
        if discover_peers and network_config['admin_nodes']:
            print("Attempting peer discovery...\n")
            for admin_node in network_config['admin_nodes']:
                peers = self.get_peers(admin_node)
                nodes_to_query.update(peers)
            print(f"\nTotal nodes to query: {len(nodes_to_query)}\n")

        # Query all nodes in parallel
        results = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_url = {executor.submit(self.query_node, url, network): url for url in nodes_to_query}

            for future in as_completed(future_to_url):
                try:
                    result = future.result()
                    results.append(result)
                    self.save_node(result)
                except Exception as e:
                    print(f"Error processing node: {e}")

        # Generate statistics
        self.generate_stats(results, network)

        print("\n" + "=" * 60)
        print(f"Crawl completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        return results

    def generate_stats(self, results, network):
        """Generate and display statistics"""
        online_nodes = [r for r in results if r["online"]]

        print("\n" + "=" * 60)
        print("STATISTICS")
        print("=" * 60)
        print(f"\nTotal nodes queried: {len(results)}")
        print(f"Online nodes: {len(online_nodes)}")
        print(f"Offline nodes: {len(results) - len(online_nodes)}")

        if online_nodes:
            # Client distribution
            print("\n--- CLIENT DISTRIBUTION ---")
            client_versions = [r["client_version"] for r in online_nodes if r["client_version"]]

            # Extract client name and version
            client_names = []
            version_info = {}

            for cv in client_versions:
                # Parse format like "base-node-reth/v0.15.1" or "op-geth/v1.101408.0"
                parts = cv.split("/")
                if len(parts) >= 2:
                    client = parts[0]
                    version = parts[1] if len(parts) > 1 else "unknown"
                    client_names.append(client)

                    if client not in version_info:
                        version_info[client] = []
                    version_info[client].append(version)
                else:
                    client_names.append(cv)

            client_counts = Counter(client_names)
            for client, count in client_counts.most_common():
                percentage = (count / len(online_nodes)) * 100
                print(f"  {client}: {count} ({percentage:.1f}%)")

            # Version distribution per client
            print("\n--- VERSION DISTRIBUTION ---")
            for client, versions in version_info.items():
                print(f"\n{client}:")
                version_counts = Counter(versions)
                for version, count in version_counts.most_common():
                    percentage = (count / len(versions)) * 100
                    print(f"  {version}: {count} ({percentage:.1f}%)")

            # Block height stats
            print("\n--- BLOCK HEIGHT ---")
            block_numbers = [r["block_number"] for r in online_nodes if r["block_number"]]
            if block_numbers:
                max_block = max(block_numbers)
                min_block = min(block_numbers)
                print(f"  Highest block: {max_block}")
                print(f"  Lowest block: {min_block}")
                print(f"  Block spread: {max_block - min_block}")

                # Check for nodes significantly behind
                behind_threshold = 1000
                behind_nodes = [r for r in online_nodes if r["block_number"] and (max_block - r["block_number"]) > behind_threshold]
                if behind_nodes:
                    print(f"\n  WARNING: {len(behind_nodes)} node(s) more than {behind_threshold} blocks behind:")
                    for node in behind_nodes:
                        behind_by = max_block - node["block_number"]
                        print(f"    {node['url']}: {behind_by} blocks behind")

            # Sync status
            print("\n--- SYNC STATUS ---")
            syncing = [r for r in online_nodes if r["syncing"] is True]
            synced = [r for r in online_nodes if r["syncing"] is False]
            print(f"  Synced: {len(synced)}")
            print(f"  Syncing: {len(syncing)}")

        # Save to history
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        client_stats = json.dumps(dict(Counter([r["client_version"] for r in online_nodes if r["client_version"]])))
        c.execute('''
            INSERT INTO crawl_history (network, timestamp, total_nodes, online_nodes, client_stats)
            VALUES (?, ?, ?, ?, ?)
        ''', (network, datetime.now(), len(results), len(online_nodes), client_stats))
        conn.commit()
        conn.close()

    def generate_html_report(self, output_file="base_nodes_report.html"):
        """Generate HTML dashboard with tabs for mainnet and sepolia"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()

        # Get data for both networks
        networks_data = {}
        for network_key, network_info in NETWORKS.items():
            c.execute("SELECT * FROM nodes WHERE network = ? AND online = 1 ORDER BY last_seen DESC", (network_key,))
            networks_data[network_key] = {
                'name': network_info['name'],
                'nodes': c.fetchall()
            }

        conn.close()

        # Generate HTML
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Base Node Network Monitor</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            color: #1a1a1a;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        header {{
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        h1 {{
            color: #0052FF;
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 8px 0;
        }}
        .timestamp {{
            color: #666;
            font-size: 14px;
            margin: 0;
        }}
        .tabs {{
            display: flex;
            gap: 0;
            margin: 30px 0 20px 0;
            border-bottom: 1px solid #e5e5e5;
        }}
        .tab {{
            padding: 12px 24px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 14px;
            font-weight: 500;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }}
        .tab:hover {{
            color: #0052FF;
        }}
        .tab.active {{
            color: #0052FF;
            border-bottom-color: #0052FF;
        }}
        .tab-content {{
            display: none;
        }}
        .tab-content.active {{
            display: block;
        }}
        h2 {{
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0 0 20px 0;
        }}
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin: 0 0 32px 0;
        }}
        .stat-card {{
            background: #0052FF;
            color: white;
            padding: 24px;
            border: 1px solid #e5e5e5;
        }}
        .stat-card h3 {{
            margin: 0;
            font-size: 36px;
            font-weight: 600;
            line-height: 1;
        }}
        .stat-card p {{
            margin: 8px 0 0 0;
            font-size: 14px;
            font-weight: 500;
            opacity: 0.9;
        }}
        h3 {{
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 32px 0 16px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e5e5;
        }}
        th {{
            background-color: #f9f9f9;
            color: #1a1a1a;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #0052FF;
        }}
        td {{
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid #e5e5e5;
        }}
        tr:last-child td {{
            border-bottom: none;
        }}
        tr:hover {{
            background-color: #f9f9f9;
        }}
        .status {{
            display: inline-block;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 500;
            border-radius: 2px;
        }}
        .status.synced {{
            background-color: #e8f5e9;
            color: #2e7d32;
        }}
        .status.syncing {{
            background-color: #fff3e0;
            color: #f57c00;
        }}
        .status.unknown {{
            background-color: #f5f5f5;
            color: #666;
        }}
        .distribution {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin: 32px 0;
        }}
        .distribution-card {{
            border: 1px solid #e5e5e5;
            padding: 20px;
        }}
        .distribution-card h4 {{
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0 0 16px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .distribution-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f5f5f5;
        }}
        .distribution-item:last-child {{
            border-bottom: none;
        }}
        .distribution-label {{
            font-size: 14px;
            color: #1a1a1a;
        }}
        .distribution-value {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .distribution-count {{
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
        }}
        .distribution-percent {{
            font-size: 14px;
            color: #666;
        }}
        .distribution-bar {{
            width: 80px;
            height: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
            overflow: hidden;
        }}
        .distribution-bar-fill {{
            height: 100%;
            background-color: #0052FF;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Base Node Network Monitor</h1>
            <p class="timestamp">Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </header>

        <div class="tabs">
            <button class="tab active" onclick="showTab('mainnet')">Mainnet</button>
            <button class="tab" onclick="showTab('sepolia')">Sepolia</button>
        </div>
"""

        # Generate content for each network
        for network_key, data in networks_data.items():
            nodes = data['nodes']
            is_active = 'active' if network_key == 'mainnet' else ''

            # Calculate client and version distributions
            client_versions = [n[2] for n in nodes if n[2]]
            client_counts = {}
            version_counts = {}

            for cv in client_versions:
                parts = cv.split("/")
                if len(parts) >= 2:
                    client = parts[0]
                    version = parts[1] if len(parts) > 1 else "unknown"

                    client_counts[client] = client_counts.get(client, 0) + 1

                    if client not in version_counts:
                        version_counts[client] = {}
                    version_counts[client][version] = version_counts[client].get(version, 0) + 1
                else:
                    client_counts[cv] = client_counts.get(cv, 0) + 1

            # Sort by count descending
            sorted_clients = sorted(client_counts.items(), key=lambda x: x[1], reverse=True)

            html += f"""
        <div id="{network_key}" class="tab-content {is_active}">
            <h2>{data['name']}</h2>

            <div class="stats">
                <div class="stat-card">
                    <h3>{len(nodes)}</h3>
                    <p>Online Nodes</p>
                </div>
                <div class="stat-card">
                    <h3>{len(set([n[2] for n in nodes if n[2]]))}</h3>
                    <p>Unique Clients</p>
                </div>
                <div class="stat-card">
                    <h3>{max([n[3] for n in nodes if n[3]]) if nodes else 0:,}</h3>
                    <p>Latest Block</p>
                </div>
            </div>

            <div class="distribution">
                <div class="distribution-card">
                    <h4>Client Distribution</h4>
"""

            for client, count in sorted_clients:
                percentage = (count / len(nodes)) * 100 if nodes else 0
                html += f"""
                    <div class="distribution-item">
                        <span class="distribution-label">{client}</span>
                        <div class="distribution-value">
                            <span class="distribution-count">{count}</span>
                            <span class="distribution-percent">({percentage:.1f}%)</span>
                            <div class="distribution-bar">
                                <div class="distribution-bar-fill" style="width: {percentage}%"></div>
                            </div>
                        </div>
                    </div>
"""

            html += """
                </div>
"""

            # Version distributions per client
            for client in sorted_clients[:3]:  # Top 3 clients
                client_name = client[0]
                if client_name in version_counts:
                    sorted_versions = sorted(version_counts[client_name].items(), key=lambda x: x[1], reverse=True)
                    total_for_client = sum(v[1] for v in sorted_versions)

                    html += f"""
                <div class="distribution-card">
                    <h4>{client_name} Versions</h4>
"""

                    for version, count in sorted_versions:
                        percentage = (count / total_for_client) * 100 if total_for_client else 0
                        html += f"""
                    <div class="distribution-item">
                        <span class="distribution-label">{version}</span>
                        <div class="distribution-value">
                            <span class="distribution-count">{count}</span>
                            <span class="distribution-percent">({percentage:.1f}%)</span>
                            <div class="distribution-bar">
                                <div class="distribution-bar-fill" style="width: {percentage}%"></div>
                            </div>
                        </div>
                    </div>
"""

                    html += """
                </div>
"""

            html += """
            </div>

            <h3>Active Nodes</h3>
            <table>
                <tr>
                    <th>Endpoint</th>
                    <th>Client Version</th>
                    <th>Block Height</th>
                    <th>Status</th>
                    <th>Last Checked</th>
                </tr>
"""

            for node in nodes:
                url, network, client, block, syncing, online, last_seen, peers = node
                status_text = "Synced" if syncing == 0 else "Syncing" if syncing == 1 else "Unknown"
                status_class = "synced" if syncing == 0 else "syncing" if syncing == 1 else "unknown"

                # Format block number with commas
                block_formatted = f"{block:,}" if block else "N/A"

                html += f"""
                <tr>
                    <td>{url}</td>
                    <td>{client or 'Unknown'}</td>
                    <td>{block_formatted}</td>
                    <td><span class="status {status_class}">{status_text}</span></td>
                    <td>{last_seen}</td>
                </tr>
"""

            html += """
            </table>
        </div>
"""

        html += """
    </div>

    <script>
        function showTab(networkId) {{
            // Hide all tabs
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));

            // Deactivate all tab buttons
            const buttons = document.querySelectorAll('.tab');
            buttons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab
            document.getElementById(networkId).classList.add('active');

            // Activate clicked button
            event.target.classList.add('active');
        }}
    </script>
</body>
</html>
"""

        with open(output_file, 'w') as f:
            f.write(html)

        print(f"\nHTML report generated: {output_file}")
        print(f"Open it in your browser: file://{os.path.abspath(output_file)}")

def main():
    crawler = BaseNodeCrawler()

    # Crawl both networks
    print("\nStarting crawl for both networks...\n")

    for network in ['mainnet', 'sepolia']:
        crawler.crawl(network=network, discover_peers=False)  # Set to True if you have admin-enabled nodes
        print()

    # Generate HTML report with both networks
    crawler.generate_html_report()

if __name__ == "__main__":
    main()
