/**
 * Nodes routes
 */

const express = require('express');
const router = express.Router();
const { NETWORKS } = require('../../crawler/config');

module.exports = (db) => {
  /**
   * GET /api/networks/:network/nodes
   * Get all nodes for a specific network
   */
  router.get('/:network/nodes', (req, res) => {
    try {
      const { network } = req.params;
      const { online_only } = req.query;

      if (!NETWORKS[network]) {
        return res.status(404).json({ error: `Network ${network} not found` });
      }

      const onlineOnly = online_only === 'true';
      const nodes = db.getNodes(network, onlineOnly);

      res.json({
        network,
        node_count: nodes.length,
        nodes
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch nodes', detail: error.message });
    }
  });

  /**
   * GET /api/networks/:network/distribution/clients
   * Get client distribution for a specific network
   */
  router.get('/:network/distribution/clients', (req, res) => {
    try {
      const { network } = req.params;

      if (!NETWORKS[network]) {
        return res.status(404).json({ error: `Network ${network} not found` });
      }

      const distribution = db.getClientDistribution(network);
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client distribution', detail: error.message });
    }
  });

  /**
   * GET /api/networks/:network/distribution/versions
   * Get version distribution for a specific network
   */
  router.get('/:network/distribution/versions', (req, res) => {
    try {
      const { network } = req.params;

      if (!NETWORKS[network]) {
        return res.status(404).json({ error: `Network ${network} not found` });
      }

      const distribution = db.getVersionDistribution(network);
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch version distribution', detail: error.message });
    }
  });

  /**
   * GET /api/networks/:network/distribution
   * Get client and version distributions
   */
  router.get('/:network/distribution', (req, res) => {
    try {
      const { network } = req.params;

      if (!NETWORKS[network]) {
        return res.status(404).json({ error: `Network ${network} not found` });
      }

      res.json({
        network,
        clients: db.getClientDistribution(network),
        versions: db.getVersionDistribution(network)
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch distributions', detail: error.message });
    }
  });

  return router;
};
