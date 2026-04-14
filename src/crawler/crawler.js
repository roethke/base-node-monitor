/**
 * Crawler module for Base Node Monitor
 * Handles querying Base network nodes and storing results
 */

const axios = require('axios');
const { NETWORKS } = require('./config');

class NodeCrawler {
  constructor(db) {
    this.db = db;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Query a single node for its information
   */
  async queryNode(url, network) {
    const result = {
      url,
      network,
      client_version: null,
      block_number: null,
      syncing: null,
      online: false,
      last_seen: new Date().toISOString()
    };

    try {
      // Query execution client version
      const versionResponse = await axios.post(
        url,
        {
          jsonrpc: '2.0',
          method: 'web3_clientVersion',
          params: [],
          id: 1
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Base-Node-Monitor/1.0'
          }
        }
      );

      if (versionResponse.data && versionResponse.data.result) {
        result.client_version = versionResponse.data.result;
        result.online = true;
      }

      // Query block number if online
      if (result.online) {
        try {
          const blockResponse = await axios.post(
            url,
            {
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              params: [],
              id: 2
            },
            { timeout: this.timeout }
          );

          if (blockResponse.data && blockResponse.data.result) {
            result.block_number = parseInt(blockResponse.data.result, 16);
          }
        } catch (err) {
          // Ignore block number errors
        }

        // Query sync status
        try {
          const syncResponse = await axios.post(
            url,
            {
              jsonrpc: '2.0',
              method: 'eth_syncing',
              params: [],
              id: 3
            },
            { timeout: this.timeout }
          );

          if (syncResponse.data && syncResponse.data.result !== undefined) {
            result.syncing = typeof syncResponse.data.result === 'boolean'
              ? syncResponse.data.result
              : true;
          }
        } catch (err) {
          // Ignore sync status errors
        }
      }
    } catch (error) {
      // Node is offline or unreachable
      result.online = false;
    }

    return result;
  }

  /**
   * Crawl all nodes in a specific network
   */
  async crawlNetwork(network) {
    if (!NETWORKS[network]) {
      throw new Error(`Network ${network} not found`);
    }

    const networkConfig = NETWORKS[network];
    const results = {
      network,
      name: networkConfig.name,
      endpoints_queried: 0,
      nodes_online: 0,
      nodes_offline: 0,
      timestamp: new Date().toISOString()
    };

    const endpoints = networkConfig.rpc_endpoints;
    results.endpoints_queried = endpoints.length;

    // Query all nodes with a small delay between requests
    for (const url of endpoints) {
      const nodeData = await this.queryNode(url, network);
      this.db.upsertNode(nodeData);

      if (nodeData.online) {
        results.nodes_online++;
      } else {
        results.nodes_offline++;
      }

      // Small delay to be respectful to endpoints
      await this.sleep(100);
    }

    return results;
  }

  /**
   * Crawl all configured networks
   */
  async crawlAllNetworks() {
    const results = {
      timestamp: new Date().toISOString(),
      networks: {}
    };

    for (const network of Object.keys(NETWORKS)) {
      const networkResult = await this.crawlNetwork(network);
      results.networks[network] = networkResult;
    }

    return results;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = NodeCrawler;
