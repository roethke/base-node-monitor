/**
 * HTML Report Generator
 * Generates a static HTML dashboard from the node monitoring data
 */

const fs = require('fs');
const path = require('path');
const Database = require('../database/db');

class ReportGenerator {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate complete HTML report for all networks
   */
  async generateReport(outputPath = 'base_nodes_report.html') {
    const networks = ['mainnet', 'sepolia'];
    const networkData = {};

    // Collect data for each network
    for (const network of networks) {
      networkData[network] = await this.getNetworkData(network);
    }

    const html = this.buildHTML(networkData);

    // Write to file
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`✅ Report generated: ${outputPath}`);

    return outputPath;
  }

  /**
   * Get all data needed for a network
   */
  async getNetworkData(network) {
    const stats = this.db.getNetworkStats(network);
    const nodes = this.db.getNodes(network, true); // online only
    const clientDistribution = this.db.getClientDistribution(network);
    const versionDistribution = this.db.getVersionDistribution(network);

    // Group versions by client
    const versionsByClient = {};
    nodes.forEach(node => {
      const client = this.db.parseClient(node.client_version);
      const version = this.extractVersion(node.client_version);

      if (!versionsByClient[client]) {
        versionsByClient[client] = {};
      }
      versionsByClient[client][version] = (versionsByClient[client][version] || 0) + 1;
    });

    // Convert to array format with percentages
    const versionsByClientFormatted = {};
    for (const [client, versions] of Object.entries(versionsByClient)) {
      const clientTotal = Object.values(versions).reduce((a, b) => a + b, 0);
      versionsByClientFormatted[client] = Object.entries(versions)
        .map(([version, count]) => ({
          version,
          count,
          percentage: parseFloat(((count / clientTotal) * 100).toFixed(1))
        }))
        .sort((a, b) => b.count - a.count);
    }

    return {
      name: network === 'mainnet' ? 'Base Mainnet' : 'Base Sepolia',
      stats,
      nodes,
      distribution: {
        clients: clientDistribution,
        versions_by_client: versionsByClientFormatted
      }
    };
  }

  /**
   * Extract version string from full client version
   */
  extractVersion(clientVersion) {
    if (!clientVersion) return 'Unknown';

    // For reth: extract version like "v1.10.2-8e3b5e6"
    if (clientVersion.includes('reth')) {
      const match = clientVersion.match(/v[\d.]+(-[a-f0-9]+)?/);
      return match ? match[0] : clientVersion;
    }

    // For Geth: extract version like "v1.101701.0-stable-d0734fd5"
    if (clientVersion.toLowerCase().includes('geth')) {
      const match = clientVersion.match(/v[\d.]+(-stable)?(-[a-f0-9]+)?/);
      return match ? match[0] : clientVersion;
    }

    // For Tenderly
    if (clientVersion.includes('Tenderly')) {
      const match = clientVersion.match(/[\d.]+/);
      return match ? match[0] : clientVersion;
    }

    return clientVersion;
  }

  /**
   * Build complete HTML document
   */
  buildHTML(networkData) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    return `<!DOCTYPE html>
<html>
<head>
    <title>Base Node Network Monitor</title>
    ${this.getStyles()}
</head>
<body>
    <div class="container">
        <header>
            <h1>Base Node Network Monitor</h1>
            <p class="timestamp">Last updated: ${timestamp}</p>
        </header>

        <div class="tabs">
            <button class="tab active" onclick="showTab('mainnet')">Mainnet</button>
            <button class="tab" onclick="showTab('sepolia')">Sepolia</button>
        </div>

        ${this.buildNetworkSection('mainnet', networkData.mainnet, true)}
        ${this.buildNetworkSection('sepolia', networkData.sepolia, false)}

    </div>

    ${this.getJavaScript()}
</body>
</html>
`;
  }

  /**
   * Build section for a single network
   */
  buildNetworkSection(networkId, data, isActive) {
    const activeClass = isActive ? 'active' : '';
    const stats = data.stats;
    const nodes = data.nodes;
    const distribution = data.distribution;

    // Get unique client count
    const uniqueClients = Object.keys(stats.clients || {}).length;

    // Get max block number
    const maxBlock = nodes.length > 0
      ? Math.max(...nodes.map(n => n.block_number || 0))
      : 0;

    return `
        <div id="${networkId}" class="tab-content ${activeClass}">
            <h2>${data.name}</h2>

            <div class="stats">
                <div class="stat-card">
                    <h3>${stats.online_nodes}</h3>
                    <p>Online Nodes</p>
                </div>
                <div class="stat-card">
                    <h3>${uniqueClients}</h3>
                    <p>Unique Clients</p>
                </div>
                <div class="stat-card">
                    <h3>${maxBlock.toLocaleString()}</h3>
                    <p>Latest Block</p>
                </div>
            </div>

            ${this.buildDistributionSection(distribution)}

            <h3>Active Nodes</h3>
            ${this.buildNodesTable(nodes, maxBlock)}
        </div>
`;
  }

  /**
   * Build distribution cards section
   */
  buildDistributionSection(distribution) {
    const clientDist = distribution.clients || [];
    const versionsByClient = distribution.versions_by_client || {};

    let html = '<div class="distribution">';

    // Overall client distribution
    if (clientDist.length > 0) {
      html += `
                <div class="distribution-card">
                    <h4>Client Distribution</h4>
                    ${clientDist.map(item => this.buildDistributionItem(item)).join('\n')}
                </div>
`;
    }

    // Version distribution for each client
    for (const [client, versions] of Object.entries(versionsByClient)) {
      if (versions.length > 0) {
        html += `
                <div class="distribution-card">
                    <h4>${client} Versions</h4>
                    ${versions.map(item => this.buildDistributionItem(item)).join('\n')}
                </div>
`;
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Build a single distribution item
   */
  buildDistributionItem(item) {
    const label = item.client || item.version || 'Unknown';
    const count = item.count || 0;
    const percentage = item.percentage || 0;

    return `
                    <div class="distribution-item">
                        <span class="distribution-label">${this.escapeHtml(label)}</span>
                        <div class="distribution-value">
                            <span class="distribution-count">${count}</span>
                            <span class="distribution-percent">(${percentage.toFixed(1)}%)</span>
                            <div class="distribution-bar">
                                <div class="distribution-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    </div>
`;
  }

  /**
   * Build nodes table
   */
  buildNodesTable(nodes, maxBlock) {
    if (nodes.length === 0) {
      return '<p>No online nodes found.</p>';
    }

    const rows = nodes.map(node => {
      const blockDiff = maxBlock - (node.block_number || 0);
      const status = blockDiff === 0 ? 'synced' : (blockDiff < 10 ? 'syncing' : 'unknown');
      const statusText = blockDiff === 0 ? 'Synced' : (blockDiff < 10 ? 'Syncing' : 'Unknown');

      return `
                <tr>
                    <td>${this.escapeHtml(node.url)}</td>
                    <td>${this.escapeHtml(node.client_version || 'Unknown')}</td>
                    <td>${(node.block_number || 0).toLocaleString()}</td>
                    <td><span class="status ${status}">${statusText}</span></td>
                    <td>${node.last_seen || ''}</td>
                </tr>
`;
    }).join('');

    return `
            <table>
                <tr>
                    <th>Endpoint</th>
                    <th>Client Version</th>
                    <th>Block Height</th>
                    <th>Status</th>
                    <th>Last Checked</th>
                </tr>
${rows}
            </table>
`;
  }

  /**
   * CSS styles
   */
  getStyles() {
    return `<style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            color: #1a1a1a;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        header {
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 {
            color: #0052FF;
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 8px 0;
        }
        .timestamp {
            color: #666;
            font-size: 14px;
            margin: 0;
        }
        .tabs {
            display: flex;
            gap: 0;
            margin: 30px 0 20px 0;
            border-bottom: 1px solid #e5e5e5;
        }
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 14px;
            font-weight: 500;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .tab:hover {
            color: #0052FF;
        }
        .tab.active {
            color: #0052FF;
            border-bottom-color: #0052FF;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        h2 {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0 0 20px 0;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin: 0 0 32px 0;
        }
        .stat-card {
            background: #0052FF;
            color: white;
            padding: 24px;
            border: 1px solid #e5e5e5;
        }
        .stat-card h3 {
            margin: 0;
            font-size: 36px;
            font-weight: 600;
            line-height: 1;
        }
        .stat-card p {
            margin: 8px 0 0 0;
            font-size: 14px;
            font-weight: 500;
            opacity: 0.9;
        }
        h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 32px 0 16px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e5e5;
        }
        th {
            background-color: #f9f9f9;
            color: #1a1a1a;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #0052FF;
        }
        td {
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid #e5e5e5;
        }
        tr:last-child td {
            border-bottom: none;
        }
        tr:hover {
            background-color: #f9f9f9;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 500;
            border-radius: 2px;
        }
        .status.synced {
            background-color: #e8f5e9;
            color: #2e7d32;
        }
        .status.syncing {
            background-color: #fff3e0;
            color: #f57c00;
        }
        .status.unknown {
            background-color: #f5f5f5;
            color: #666;
        }
        .distribution {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin: 32px 0;
        }
        .distribution-card {
            border: 1px solid #e5e5e5;
            padding: 20px;
        }
        .distribution-card h4 {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0 0 16px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .distribution-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f5f5f5;
        }
        .distribution-item:last-child {
            border-bottom: none;
        }
        .distribution-label {
            font-size: 14px;
            color: #1a1a1a;
        }
        .distribution-value {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .distribution-count {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
        }
        .distribution-percent {
            font-size: 14px;
            color: #666;
        }
        .distribution-bar {
            width: 80px;
            height: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
            overflow: hidden;
        }
        .distribution-bar-fill {
            height: 100%;
            background-color: #0052FF;
        }
    </style>`;
  }

  /**
   * JavaScript for tab switching
   */
  getJavaScript() {
    return `
    <script>
        function showTab(networkId) {
            // Hide all tabs
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));

            // Deactivate all tab buttons
            const buttons = document.querySelectorAll('.tab');
            buttons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab
            document.getElementById(networkId).classList.add('active');

            // Activate clicked button
            event.target.classList.add('active');
        }
    </script>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = ReportGenerator;
