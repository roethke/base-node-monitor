/**
 * Database module for Base Node Monitor
 * Handles SQLite database operations using better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');

class NodeDatabase {
  constructor(dbPath = 'base_nodes.db') {
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  /**
   * Initialize database schema
   */
  initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        network TEXT NOT NULL,
        client_version TEXT,
        consensus_version TEXT,
        block_number INTEGER,
        syncing BOOLEAN,
        peers_count INTEGER,
        online BOOLEAN DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(url, network)
      );

      CREATE TABLE IF NOT EXISTS node_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        network TEXT NOT NULL,
        client_version TEXT,
        consensus_version TEXT,
        block_number INTEGER,
        syncing BOOLEAN,
        peers_count INTEGER,
        online BOOLEAN DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_nodes_network ON nodes(network);
      CREATE INDEX IF NOT EXISTS idx_nodes_online ON nodes(online);
      CREATE INDEX IF NOT EXISTS idx_history_timestamp ON node_history(timestamp);

      CREATE TABLE IF NOT EXISTS telemetry_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        node_name TEXT,
        client_version TEXT,
        network TEXT,
        block_number INTEGER,
        syncing BOOLEAN,
        peer_count INTEGER,
        uptime_seconds INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS telemetry_nodes (
        node_id TEXT PRIMARY KEY,
        node_name TEXT,
        client_version TEXT,
        network TEXT,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_reports INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_telemetry_reports_node_id ON telemetry_reports(node_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_reports_timestamp ON telemetry_reports(timestamp);
      CREATE INDEX IF NOT EXISTS idx_telemetry_nodes_network ON telemetry_nodes(network);
      CREATE INDEX IF NOT EXISTS idx_telemetry_nodes_last_seen ON telemetry_nodes(last_seen);
    `);
  }

  /**
   * Insert or update node data
   */
  upsertNode(nodeData) {
    // Normalize data for SQLite (convert booleans to integers, ensure proper types)
    const normalizedData = {
      url: nodeData.url,
      network: nodeData.network,
      client_version: nodeData.client_version || null,
      block_number: nodeData.block_number || null,
      syncing: nodeData.syncing === true ? 1 : (nodeData.syncing === false ? 0 : null),
      online: nodeData.online ? 1 : 0,
      last_seen: nodeData.last_seen || new Date().toISOString()
    };

    const stmt = this.db.prepare(`
      INSERT INTO nodes (url, network, client_version, block_number, syncing, online, last_seen)
      VALUES (@url, @network, @client_version, @block_number, @syncing, @online, @last_seen)
      ON CONFLICT(url, network) DO UPDATE SET
        client_version = excluded.client_version,
        block_number = excluded.block_number,
        syncing = excluded.syncing,
        online = excluded.online,
        last_seen = excluded.last_seen
    `);

    const historyStmt = this.db.prepare(`
      INSERT INTO node_history (url, network, client_version, block_number, syncing, online)
      VALUES (@url, @network, @client_version, @block_number, @syncing, @online)
    `);

    const transaction = this.db.transaction((data) => {
      stmt.run(data);
      historyStmt.run(data);
    });

    transaction(normalizedData);
  }

  /**
   * Get all nodes, optionally filtered by network
   */
  getNodes(network = null, onlineOnly = false) {
    let query = 'SELECT * FROM nodes WHERE 1=1';
    const params = {};

    if (network) {
      query += ' AND network = @network';
      params.network = network;
    }

    if (onlineOnly) {
      query += ' AND online = 1';
    }

    query += ' ORDER BY network, online DESC, url';

    const stmt = this.db.prepare(query);
    const nodes = stmt.all(params);

    // Convert SQLite integers back to booleans
    return nodes.map(node => ({
      ...node,
      online: Boolean(node.online),
      syncing: node.syncing === null ? null : Boolean(node.syncing)
    }));
  }

  /**
   * Get statistics for a specific network
   */
  getNetworkStats(network) {
    const nodes = this.getNodes(network);
    const onlineNodes = nodes.filter(n => n.online);

    // Count clients
    const clientCounts = {};
    onlineNodes.forEach(node => {
      const client = this.parseClient(node.client_version);
      clientCounts[client] = (clientCounts[client] || 0) + 1;
    });

    // Count versions
    const versionCounts = {};
    onlineNodes.forEach(node => {
      const version = node.client_version || 'Unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    });

    return {
      network,
      total_endpoints: nodes.length,
      online_nodes: onlineNodes.length,
      offline_nodes: nodes.length - onlineNodes.length,
      clients: clientCounts,
      versions: versionCounts,
      last_updated: nodes.length > 0 ? Math.max(...nodes.map(n => new Date(n.last_seen).getTime())) : null
    };
  }

  /**
   * Get client distribution with percentages
   */
  getClientDistribution(network) {
    const nodes = this.getNodes(network, true);

    if (nodes.length === 0) {
      return [];
    }

    // Count clients
    const clientCounts = {};
    nodes.forEach(node => {
      const client = this.parseClient(node.client_version);
      clientCounts[client] = (clientCounts[client] || 0) + 1;
    });

    // Calculate percentages and sort
    const total = nodes.length;
    return Object.entries(clientCounts)
      .map(([client, count]) => ({
        client,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get version distribution with percentages
   */
  getVersionDistribution(network) {
    const nodes = this.getNodes(network, true);

    if (nodes.length === 0) {
      return [];
    }

    // Count versions
    const versionCounts = {};
    nodes.forEach(node => {
      const version = node.client_version || 'Unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    });

    // Calculate percentages and sort
    const total = nodes.length;
    return Object.entries(versionCounts)
      .map(([version, count]) => ({
        version,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get list of all networks
   */
  getNetworks() {
    const stmt = this.db.prepare('SELECT DISTINCT network FROM nodes ORDER BY network');
    return stmt.all().map(row => row.network);
  }

  /**
   * Parse client name from version string
   */
  parseClient(clientVersion) {
    if (!clientVersion) return 'Unknown';

    const version = clientVersion.toLowerCase();

    if (version.includes('reth') || version.includes('base-node')) return 'reth';
    if (version.includes('geth') || version.includes('op-geth')) return 'Geth';
    if (version.includes('nethermind')) return 'Nethermind';
    if (version.includes('tenderly')) return 'Tenderly';
    if (version.includes('erigon')) return 'Erigon';

    return 'Other';
  }

  /**
   * Store telemetry report from operator node
   */
  storeTelemetryReport(report) {
    const normalizedReport = {
      node_id: report.node_id,
      node_name: report.node_name || null,
      client_version: report.client_version,
      network: report.network,
      block_number: report.block_number || null,
      syncing: report.syncing === true ? 1 : (report.syncing === false ? 0 : null),
      peer_count: report.peer_count || null,
      uptime_seconds: report.uptime_seconds || null,
      timestamp: report.timestamp || new Date()
    };

    const reportStmt = this.db.prepare(`
      INSERT INTO telemetry_reports (node_id, node_name, client_version, network, block_number, syncing, peer_count, uptime_seconds, timestamp)
      VALUES (@node_id, @node_name, @client_version, @network, @block_number, @syncing, @peer_count, @uptime_seconds, @timestamp)
    `);

    const nodeStmt = this.db.prepare(`
      INSERT INTO telemetry_nodes (node_id, node_name, client_version, network, last_seen, first_seen, total_reports)
      VALUES (@node_id, @node_name, @client_version, @network, @last_seen, @first_seen, 1)
      ON CONFLICT(node_id) DO UPDATE SET
        node_name = excluded.node_name,
        client_version = excluded.client_version,
        network = excluded.network,
        last_seen = excluded.last_seen,
        total_reports = total_reports + 1
    `);

    const transaction = this.db.transaction((data) => {
      reportStmt.run(data);
      nodeStmt.run({
        node_id: data.node_id,
        node_name: data.node_name,
        client_version: data.client_version,
        network: data.network,
        last_seen: data.timestamp,
        first_seen: data.timestamp
      });
    });

    transaction(normalizedReport);
  }

  /**
   * Get telemetry nodes
   */
  getTelemetryNodes(network = null, activeOnly = false) {
    let query = 'SELECT * FROM telemetry_nodes WHERE 1=1';
    const params = {};

    if (network) {
      query += ' AND network = @network';
      params.network = network;
    }

    if (activeOnly) {
      // Active = reported in last 24 hours
      query += ' AND last_seen > datetime("now", "-24 hours")';
    }

    query += ' ORDER BY last_seen DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(params);
  }

  /**
   * Get telemetry statistics
   */
  getTelemetryStats(network = null) {
    const nodes = this.getTelemetryNodes(network, false);
    const activeNodes = this.getTelemetryNodes(network, true);

    // Calculate client distribution
    const clientCounts = {};
    activeNodes.forEach(node => {
      const client = this.parseClient(node.client_version);
      clientCounts[client] = (clientCounts[client] || 0) + 1;
    });

    // Calculate version distribution
    const versionCounts = {};
    activeNodes.forEach(node => {
      const version = node.client_version || 'Unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    });

    return {
      total_nodes: nodes.length,
      active_nodes_24h: activeNodes.length,
      inactive_nodes: nodes.length - activeNodes.length,
      clients: clientCounts,
      versions: versionCounts
    };
  }

  /**
   * Get telemetry distribution with percentages
   */
  getTelemetryDistribution(network = null) {
    const activeNodes = this.getTelemetryNodes(network, true);

    if (activeNodes.length === 0) {
      return {
        clients: [],
        versions: []
      };
    }

    // Client distribution
    const clientCounts = {};
    activeNodes.forEach(node => {
      const client = this.parseClient(node.client_version);
      clientCounts[client] = (clientCounts[client] || 0) + 1;
    });

    const total = activeNodes.length;
    const clients = Object.entries(clientCounts)
      .map(([client, count]) => ({
        client,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    // Version distribution
    const versionCounts = {};
    activeNodes.forEach(node => {
      const version = node.client_version || 'Unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    });

    const versions = Object.entries(versionCounts)
      .map(([version, count]) => ({
        version,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    return {
      clients,
      versions
    };
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = NodeDatabase;
