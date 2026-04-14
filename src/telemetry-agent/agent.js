/**
 * Base Node Telemetry Agent
 *
 * Lightweight sidecar that queries a local Base node and reports
 * telemetry data to a central collection server.
 *
 * Operators run this alongside their node to opt into monitoring.
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class TelemetryAgent {
  constructor(config) {
    this.config = config;
    this.nodeId = this.loadOrGenerateNodeId();
    this.startTime = Date.now();
  }

  /**
   * Load existing node ID or generate a new anonymous one
   */
  loadOrGenerateNodeId() {
    const idFile = path.join(__dirname, '.node_id');

    try {
      if (fs.existsSync(idFile)) {
        return fs.readFileSync(idFile, 'utf8').trim();
      }
    } catch (err) {
      // File doesn't exist or can't be read
    }

    // Generate anonymous node ID (hash of random data + timestamp)
    const randomData = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const nodeId = crypto
      .createHash('sha256')
      .update(randomData + timestamp)
      .digest('hex')
      .substring(0, 16); // First 16 chars

    // Save for persistence across restarts
    try {
      fs.writeFileSync(idFile, nodeId);
    } catch (err) {
      console.warn('Could not save node ID to disk:', err.message);
    }

    return nodeId;
  }

  /**
   * Collect metrics from the local node
   */
  async collectMetrics() {
    const report = {
      node_id: this.nodeId,
      node_name: this.config.nodeName || null,
      client_version: null,
      network: this.config.network,
      block_number: null,
      syncing: null,
      peer_count: null,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: Math.floor(Date.now() / 1000)
    };

    try {
      // Query client version
      const versionResponse = await axios.post(
        this.config.nodeRpcUrl,
        {
          jsonrpc: '2.0',
          method: 'web3_clientVersion',
          params: [],
          id: 1
        },
        { timeout: 10000 }
      );

      if (versionResponse.data?.result) {
        report.client_version = versionResponse.data.result;
      }

      // Query block number
      const blockResponse = await axios.post(
        this.config.nodeRpcUrl,
        {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 2
        },
        { timeout: 10000 }
      );

      if (blockResponse.data?.result) {
        report.block_number = parseInt(blockResponse.data.result, 16);
      }

      // Query sync status
      const syncResponse = await axios.post(
        this.config.nodeRpcUrl,
        {
          jsonrpc: '2.0',
          method: 'eth_syncing',
          params: [],
          id: 3
        },
        { timeout: 10000 }
      );

      if (syncResponse.data?.result !== undefined) {
        report.syncing = typeof syncResponse.data.result === 'boolean'
          ? syncResponse.data.result
          : true;
      }

      // Query peer count
      const peerResponse = await axios.post(
        this.config.nodeRpcUrl,
        {
          jsonrpc: '2.0',
          method: 'net_peerCount',
          params: [],
          id: 4
        },
        { timeout: 10000 }
      );

      if (peerResponse.data?.result) {
        report.peer_count = parseInt(peerResponse.data.result, 16);
      }

    } catch (error) {
      console.error('Error collecting metrics:', error.message);
      // Return partial report even if some queries fail
    }

    return report;
  }

  /**
   * Send telemetry report to collection server
   */
  async sendReport(report) {
    try {
      const response = await axios.post(
        this.config.telemetryEndpoint,
        report,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `Base-Telemetry-Agent/1.0 (node:${this.nodeId})`
          }
        }
      );

      if (response.status === 200) {
        console.log(`[${new Date().toISOString()}] Telemetry report sent successfully`);
        if (this.config.verbose) {
          console.log('Report:', JSON.stringify(report, null, 2));
        }
        return true;
      } else {
        console.warn(`[${new Date().toISOString()}] Unexpected response:`, response.status);
        return false;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to send telemetry:`, error.message);
      return false;
    }
  }

  /**
   * Run telemetry collection loop
   */
  async run() {
    console.log('='.repeat(60));
    console.log('Base Node Telemetry Agent');
    console.log('='.repeat(60));
    console.log(`Node ID: ${this.nodeId}`);
    console.log(`Node Name: ${this.config.nodeName || '(anonymous)'}`);
    console.log(`Network: ${this.config.network}`);
    console.log(`RPC URL: ${this.config.nodeRpcUrl}`);
    console.log(`Telemetry Server: ${this.config.telemetryEndpoint}`);
    console.log(`Report Interval: ${this.config.reportInterval} seconds`);
    console.log('='.repeat(60));
    console.log();

    // Send initial report immediately
    console.log('Collecting initial metrics...');
    const initialReport = await this.collectMetrics();
    await this.sendReport(initialReport);

    // Set up periodic reporting
    const intervalMs = this.config.reportInterval * 1000;
    setInterval(async () => {
      try {
        console.log('Collecting metrics...');
        const report = await this.collectMetrics();
        await this.sendReport(report);
      } catch (error) {
        console.error('Error in reporting cycle:', error);
      }
    }, intervalMs);

    console.log('Telemetry agent is running. Press Ctrl+C to stop.');
  }
}

// Load configuration from environment variables
function loadConfig() {
  return {
    nodeRpcUrl: process.env.NODE_RPC_URL || 'http://localhost:8545',
    telemetryEndpoint: process.env.TELEMETRY_ENDPOINT || 'http://localhost:8000/api/telemetry/report',
    network: process.env.NETWORK || 'mainnet',
    nodeName: process.env.NODE_NAME || null,
    reportInterval: parseInt(process.env.REPORT_INTERVAL || '21600'), // 6 hours default
    verbose: process.env.VERBOSE === 'true'
  };
}

// Start agent
if (require.main === module) {
  const config = loadConfig();
  const agent = new TelemetryAgent(config);

  agent.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    process.exit(0);
  });
}

module.exports = TelemetryAgent;
