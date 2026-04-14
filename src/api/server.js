/**
 * Express API server for Base Node Monitor
 */

const express = require('express');
const cors = require('cors');
const NodeDatabase = require('../database/db');
const NodeCrawler = require('../crawler/crawler');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const networksRoutes = require('./routes/networks');
const nodesRoutes = require('./routes/nodes');
const crawlRoutes = require('./routes/crawl');
const telemetryRoutes = require('./routes/telemetry');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Initialize database and crawler
const db = new NodeDatabase();
const crawler = new NodeCrawler(db);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Base Node Monitor API',
    version: '1.0.0',
    docs: '/docs',
    endpoints: {
      networks: '/api/networks',
      nodes: '/api/networks/{network}/nodes',
      stats: '/api/networks/{network}/stats',
      distribution: '/api/networks/{network}/distribution',
      crawl: '/api/crawl',
      telemetry_report: '/api/telemetry/report (POST)',
      telemetry_nodes: '/api/telemetry/nodes',
      telemetry_stats: '/api/telemetry/stats',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/networks', networksRoutes(db));
app.use('/api/networks', nodesRoutes(db));
app.use('/api/crawl', crawlRoutes(db, crawler));
app.use('/api/telemetry', telemetryRoutes(db));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Base Node Monitor API started`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log(`📊 Networks: http://localhost:${PORT}/api/networks\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

module.exports = app;
