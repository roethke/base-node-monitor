/**
 * Telemetry routes - Collect and display opt-in node telemetry
 */

const express = require('express');
const router = express.Router();

module.exports = (db) => {
  /**
   * POST /api/telemetry/report
   * Receive telemetry report from operator's node
   */
  router.post('/report', async (req, res) => {
    try {
      const report = req.body;

      // Validate required fields
      if (!report.node_id || !report.client_version) {
        return res.status(400).json({
          error: 'Invalid report',
          detail: 'node_id and client_version are required'
        });
      }

      // Store telemetry report
      db.storeTelemetryReport({
        node_id: report.node_id,
        node_name: report.node_name || null,
        client_version: report.client_version,
        network: report.network || 'unknown',
        block_number: report.block_number || null,
        syncing: report.syncing,
        peer_count: report.peer_count || null,
        uptime_seconds: report.uptime_seconds || null,
        timestamp: new Date(report.timestamp * 1000)
      });

      res.json({ status: 'received', node_id: report.node_id });

    } catch (error) {
      console.error('Error processing telemetry report:', error);
      res.status(500).json({
        error: 'Failed to process report',
        detail: error.message
      });
    }
  });

  /**
   * GET /api/telemetry/nodes
   * Get list of nodes reporting telemetry
   */
  router.get('/nodes', (req, res) => {
    try {
      const { network, active_only } = req.query;
      const activeOnly = active_only === 'true';

      const nodes = db.getTelemetryNodes(network, activeOnly);

      res.json({
        total_nodes: nodes.length,
        nodes
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch telemetry nodes',
        detail: error.message
      });
    }
  });

  /**
   * GET /api/telemetry/stats
   * Get aggregated telemetry statistics
   */
  router.get('/stats', (req, res) => {
    try {
      const { network } = req.query;

      const stats = db.getTelemetryStats(network);

      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch telemetry stats',
        detail: error.message
      });
    }
  });

  /**
   * GET /api/telemetry/distribution
   * Get client and version distribution from telemetry data
   */
  router.get('/distribution', (req, res) => {
    try {
      const { network } = req.query;

      const distribution = db.getTelemetryDistribution(network);

      res.json(distribution);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch telemetry distribution',
        detail: error.message
      });
    }
  });

  return router;
};
