"""
Database module for Base Node Monitor.
Handles all database operations and queries.
"""

import sqlite3
from datetime import datetime
from typing import List, Dict, Optional
import json


class NodeDatabase:
    """Manages SQLite database for node monitoring data."""

    def __init__(self, db_path: str = "base_nodes.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                network TEXT NOT NULL,
                client_version TEXT,
                block_number INTEGER,
                syncing BOOLEAN,
                peers_count INTEGER,
                online BOOLEAN,
                last_seen TIMESTAMP,
                UNIQUE(url, network)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS node_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                network TEXT NOT NULL,
                client_version TEXT,
                block_number INTEGER,
                syncing BOOLEAN,
                peers_count INTEGER,
                online BOOLEAN,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()
        conn.close()

    def upsert_node(self, node_data: Dict):
        """Insert or update node data."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO nodes (url, network, client_version, block_number, syncing, peers_count, online, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url, network) DO UPDATE SET
                client_version = excluded.client_version,
                block_number = excluded.block_number,
                syncing = excluded.syncing,
                peers_count = excluded.peers_count,
                online = excluded.online,
                last_seen = excluded.last_seen
        ''', (
            node_data['url'],
            node_data['network'],
            node_data.get('client_version'),
            node_data.get('block_number'),
            node_data.get('syncing'),
            node_data.get('peers_count'),
            node_data.get('online', False),
            node_data.get('last_seen', datetime.now())
        ))

        # Also add to history
        cursor.execute('''
            INSERT INTO node_history (url, network, client_version, block_number, syncing, peers_count, online)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            node_data['url'],
            node_data['network'],
            node_data.get('client_version'),
            node_data.get('block_number'),
            node_data.get('syncing'),
            node_data.get('peers_count'),
            node_data.get('online', False)
        ))

        conn.commit()
        conn.close()

    def get_nodes(self, network: Optional[str] = None, online_only: bool = False) -> List[Dict]:
        """Get all nodes, optionally filtered by network."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = 'SELECT * FROM nodes WHERE 1=1'
        params = []

        if network:
            query += ' AND network = ?'
            params.append(network)

        if online_only:
            query += ' AND online = 1'

        query += ' ORDER BY network, online DESC, url'

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def get_network_stats(self, network: str) -> Dict:
        """Get statistics for a specific network."""
        nodes = self.get_nodes(network=network)
        online_nodes = [n for n in nodes if n['online']]

        # Count clients
        client_counts = {}
        for node in online_nodes:
            client = self._parse_client(node.get('client_version', ''))
            client_counts[client] = client_counts.get(client, 0) + 1

        # Count versions
        version_counts = {}
        for node in online_nodes:
            version = node.get('client_version', 'Unknown')
            version_counts[version] = version_counts.get(version, 0) + 1

        return {
            'network': network,
            'total_endpoints': len(nodes),
            'online_nodes': len(online_nodes),
            'offline_nodes': len(nodes) - len(online_nodes),
            'clients': client_counts,
            'versions': version_counts,
            'last_updated': max([n.get('last_seen', '') for n in nodes]) if nodes else None
        }

    def get_client_distribution(self, network: str) -> List[Dict]:
        """Get client distribution with percentages for a network."""
        nodes = self.get_nodes(network=network, online_only=True)

        if not nodes:
            return []

        # Count clients
        client_counts = {}
        for node in nodes:
            client = self._parse_client(node.get('client_version', ''))
            client_counts[client] = client_counts.get(client, 0) + 1

        # Calculate percentages
        total = len(nodes)
        distribution = []
        for client, count in sorted(client_counts.items(), key=lambda x: x[1], reverse=True):
            distribution.append({
                'client': client,
                'count': count,
                'percentage': round((count / total) * 100, 1)
            })

        return distribution

    def get_version_distribution(self, network: str) -> List[Dict]:
        """Get version distribution with percentages for a network."""
        nodes = self.get_nodes(network=network, online_only=True)

        if not nodes:
            return []

        # Count versions
        version_counts = {}
        for node in nodes:
            version = node.get('client_version', 'Unknown')
            version_counts[version] = version_counts.get(version, 0) + 1

        # Calculate percentages
        total = len(nodes)
        distribution = []
        for version, count in sorted(version_counts.items(), key=lambda x: x[1], reverse=True):
            distribution.append({
                'version': version,
                'count': count,
                'percentage': round((count / total) * 100, 1)
            })

        return distribution

    def get_networks(self) -> List[str]:
        """Get list of all networks in the database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT DISTINCT network FROM nodes ORDER BY network')
        networks = [row[0] for row in cursor.fetchall()]

        conn.close()
        return networks

    @staticmethod
    def _parse_client(client_version: str) -> str:
        """Extract client name from version string."""
        if not client_version:
            return "Unknown"

        client_version = client_version.lower()

        if "reth" in client_version or "base-node" in client_version:
            return "reth"
        elif "geth" in client_version or "op-geth" in client_version:
            return "Geth"
        elif "nethermind" in client_version:
            return "Nethermind"
        elif "tenderly" in client_version:
            return "Tenderly"
        elif "erigon" in client_version:
            return "Erigon"
        else:
            return "Other"
