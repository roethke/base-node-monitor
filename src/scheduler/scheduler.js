/**
 * Background scheduler for periodic network crawling
 */

const cron = require('node-cron');
const NodeDatabase = require('../database/db');
const NodeCrawler = require('../crawler/crawler');

class CrawlScheduler {
  constructor(intervalHours = 6) {
    this.intervalHours = intervalHours;
    this.db = new NodeDatabase();
    this.crawler = new NodeCrawler(this.db);
    this.task = null;
  }

  /**
   * Run a scheduled crawl
   */
  async runScheduledCrawl() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting scheduled crawl...`);

    try {
      const result = await this.crawler.crawlAllNetworks();

      console.log(`[${new Date().toISOString()}] Crawl completed:`);
      for (const [network, stats] of Object.entries(result.networks || {})) {
        console.log(`  ${network}: ${stats.nodes_online || 0} online / ${stats.endpoints_queried || 0} total`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during crawl:`, error.message);
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    console.log(`Starting scheduler with ${this.intervalHours}-hour interval...`);
    console.log('First crawl will run immediately.\n');

    // Run immediately on startup
    this.runScheduledCrawl();

    // Schedule periodic runs using cron
    // Convert hours to cron expression: "0 */N * * *" means every N hours
    const cronExpression = `0 */${this.intervalHours} * * *`;

    this.task = cron.schedule(cronExpression, () => {
      this.runScheduledCrawl();
    });

    console.log(`Scheduler running. Press Ctrl+C to stop.\n`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('Scheduler stopped');
    }
    this.db.close();
  }
}

// CLI execution
if (require.main === module) {
  const intervalHours = parseInt(process.argv[2]) || 6;

  if (isNaN(intervalHours) || intervalHours < 1) {
    console.error('Invalid interval. Using default 6 hours.');
    intervalHours = 6;
  }

  const scheduler = new CrawlScheduler(intervalHours);
  scheduler.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nSIGTERM signal received');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT signal received');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = CrawlScheduler;
