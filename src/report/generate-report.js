#!/usr/bin/env node
/**
 * CLI script to generate HTML report
 * Usage: node src/report/generate-report.js [output-path]
 */

const path = require('path');
const Database = require('../database/db');
const ReportGenerator = require('./generator');

async function main() {
  // Get output path from args or use default
  const outputPath = process.argv[2] || path.join(process.cwd(), 'base_nodes_report.html');

  console.log('🔄 Generating report...\n');

  try {
    // Initialize database
    const db = new Database();

    // Generate report
    const generator = new ReportGenerator(db);
    const reportPath = await generator.generateReport(outputPath);

    console.log('\n✨ Report generated successfully!');
    console.log(`📄 Location: ${reportPath}\n`);
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

main();
