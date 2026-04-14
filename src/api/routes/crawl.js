/**
 * Crawl routes
 */

const express = require('express');
const router = express.Router();
const { NETWORKS } = require('../../crawler/config');

// Track crawl status
const crawlStatus = {
  isCrawling: false,
  lastCrawl: null,
  lastCrawlResult: null
};

module.exports = (db, crawler) => {
  /**
   * POST /api/crawl
   * Trigger a manual crawl of networks
   */
  router.post('/', async (req, res) => {
    const { network } = req.query;

    // Validate before doing anything
    if (crawlStatus.isCrawling) {
      return res.status(409).json({ error: 'Crawl already in progress' });
    }

    if (network && !NETWORKS[network]) {
      return res.status(404).json({ error: `Network ${network} not found` });
    }

    // Send immediate response
    res.json({
      status: 'started',
      message: `Crawl initiated for ${network || 'all networks'}`,
      timestamp: new Date().toISOString()
    });

    // Run crawl asynchronously (don't await, fire and forget)
    crawlStatus.isCrawling = true;

    // Use setImmediate to ensure crawl happens after response is sent
    setImmediate(async () => {
      try {
        const result = network
          ? await crawler.crawlNetwork(network)
          : await crawler.crawlAllNetworks();

        crawlStatus.lastCrawl = new Date().toISOString();
        crawlStatus.lastCrawlResult = result;
      } catch (error) {
        // Log error but don't try to send response (already sent)
        console.error('Error during background crawl:', error);
        crawlStatus.lastCrawlResult = {
          error: true,
          message: error.message,
          timestamp: new Date().toISOString()
        };
      } finally {
        crawlStatus.isCrawling = false;
      }
    });
  });

  /**
   * GET /api/crawl/status
   * Get current crawl status
   */
  router.get('/status', (req, res) => {
    res.json(crawlStatus);
  });

  return router;
};
