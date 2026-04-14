/**
 * Networks routes
 */

const express = require('express');
const router = express.Router();
const { NETWORKS } = require('../../crawler/config');

module.exports = (db) => {
  /**
   * GET /api/networks
   * Get list of all monitored networks
   */
  router.get('/', (req, res) => {
    try {
      const networksInfo = Object.entries(NETWORKS).map(([id, config]) => ({
        id,
        name: config.name,
        endpoint_count: config.rpc_endpoints.length
      }));

      res.json(networksInfo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch networks', detail: error.message });
    }
  });

  /**
   * GET /api/networks/:network/stats
   * Get statistics for a specific network
   */
  router.get('/:network/stats', (req, res) => {
    try {
      const { network } = req.params;

      if (!NETWORKS[network]) {
        return res.status(404).json({ error: `Network ${network} not found` });
      }

      const stats = db.getNetworkStats(network);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch network stats', detail: error.message });
    }
  });

  return router;
};
