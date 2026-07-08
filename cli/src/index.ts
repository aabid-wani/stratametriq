#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { Scanner } from '@stratametriq/scanner';
import { Graph, ProductionRisk } from '@stratametriq/shared';

// Simple ANSI color codes for terminal formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function printBanner() {
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  StrataMetriq CLI v1.3.0 - DevSecOps Architecture Governance   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
}

function printHelp() {
  printBanner();
  console.log('Usage: stratametriq scan [directory] [options]\n');
  console.log('Options:');
  console.log('  --fail-on-high          Fail pipeline (exit code 1) if HIGH severity risks exist');
  console.log('  --fail-on-circular      Fail pipeline (exit code 1) if circular dependencies exist');
  console.log('  --max-circular <N>      Fail pipeline if circular dependencies exceed threshold N');
  console.log('  --json <file>           Export full architecture graph & audit to JSON file');
  console.log('  --md <file>             Export Markdown summary (ideal for CI PR bot comments)');
  console.log('  --help                  Show help documentation\n');
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'vendor', 
  'coverage', '.cache', 'dashboard-dist', '.docusaurus', 'scratch'
]);

const ALLOWED_EXTS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.cs', 
  '.rb', '.php', '.rs', '.cpp', '.c', '.h', '.json', '.txt'
]);

function findFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        findFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTS.has(ext) && !entry.name.endsWith('.min.js') && !entry.name.endsWith('.bundle.js')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0 || (args.length === 1 && !args[0]!.startsWith('-') && args[0] === 'help')) {
    printHelp();
    process.exit(0);
  }

  let command = 'scan';
  let targetDir = process.cwd();
  let failOnHigh = false;
  let failOnCircular = false;
  let maxCircular: number | null = null;
  let jsonOut: string | null = null;
  let mdOut: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === 'scan') {
      command = 'scan';
    } else if (arg === '--fail-on-high') {
      failOnHigh = true;
    } else if (arg === '--fail-on-circular') {
      failOnCircular = true;
    } else if (arg === '--max-circular') {
      maxCircular = parseInt(args[++i] || '0', 10);
    } else if (arg === '--json') {
      jsonOut = args[++i] || 'stratametriq-report.json';
    } else if (arg === '--md') {
      mdOut = args[++i] || 'stratametriq-report.md';
    } else if (!arg.startsWith('-') && arg !== 'scan') {
      targetDir = path.resolve(process.cwd(), arg);
    }
  }

  printBanner();
  console.log(`${colors.bold}Target Directory:${colors.reset} ${targetDir}`);
  console.log(`${colors.gray}Running offline AST scan & security audit...${colors.reset}\n`);

  const startTime = Date.now();
  const filesToScan = findFiles(targetDir);
  const scanner = new Scanner();

  for (const filePath of filesToScan) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 500 * 1024) continue; // Skip files > 500KB
      const content = fs.readFileSync(filePath, 'utf8');
      scanner.parseFile(filePath, content);
    } catch (err) {
      // Ignore read errors for binary or locked files
    }
  }

  const graph: Graph = scanner.getGraph();
  const duration = Date.now() - startTime;

  // Calculate statistics
  const totalNodes = graph.nodes.length;
  const totalPackages = graph.nodes.filter(n => n.type === 'package').length;
  const totalModules = graph.nodes.filter(n => n.type === 'module').length;
  const circularCount = graph.cycles ? graph.cycles.length : 0;
  const duplicateCount = graph.duplicates ? graph.duplicates.length : 0;

  let highRisks = 0;
  let mediumRisks = 0;
  let lowRisks = 0;
  const allRisks: { file: string; risk: ProductionRisk }[] = [];

  graph.nodes.forEach(node => {
    if (node.productionRisks) {
      node.productionRisks.forEach(risk => {
        allRisks.push({ file: node.filePath, risk });
        if (risk.severity === 'HIGH') highRisks++;
        else if (risk.severity === 'MEDIUM') mediumRisks++;
        else lowRisks++;
      });
    }
  });

  // Print Summary Table
  console.log(`${colors.bold}--- Architecture MRI Summary ---${colors.reset}`);
  console.log(`Total Files Scanned : ${colors.bold}${totalModules}${colors.reset}`);
  console.log(`External Packages   : ${colors.bold}${totalPackages}${colors.reset}`);
  console.log(`Circular Loops      : ${circularCount > 0 ? colors.red + colors.bold : colors.green}${circularCount}${colors.reset}`);
  console.log(`Duplicate Code Pairs: ${duplicateCount > 0 ? colors.yellow + colors.bold : colors.green}${duplicateCount}${colors.reset}`);
  console.log(`Scan Duration       : ${duration}ms\n`);

  console.log(`${colors.bold}--- Security & Pre-Deployment Risks ---${colors.reset}`);
  console.log(`HIGH Severity   : ${highRisks > 0 ? colors.red + colors.bold : colors.green}${highRisks}${colors.reset}`);
  console.log(`MEDIUM Severity : ${mediumRisks > 0 ? colors.yellow + colors.bold : colors.green}${mediumRisks}${colors.reset}`);
  console.log(`LOW Severity    : ${colors.cyan}${lowRisks}${colors.reset}\n`);

  if (highRisks > 0) {
    console.log(`${colors.red}${colors.bold}[!] High Severity Risks Detected:${colors.reset}`);
    allRisks.filter(r => r.risk.severity === 'HIGH').slice(0, 10).forEach(r => {
      console.log(`  - [${r.risk.category}] in ${colors.bold}${r.file}:${r.risk.line || 1}${colors.reset} -> ${r.risk.message}`);
    });
    if (highRisks > 10) console.log(`  ... and ${highRisks - 10} more HIGH severity risks.`);
    console.log('');
  }

  // Export JSON Report
  if (jsonOut) {
    const outPath = path.resolve(process.cwd(), jsonOut);
    fs.writeFileSync(outPath, JSON.stringify(graph, null, 2), 'utf8');
    console.log(`${colors.green}[+] JSON architecture report exported to: ${outPath}${colors.reset}`);
  }

  // Export Markdown Report
  if (mdOut) {
    const outPath = path.resolve(process.cwd(), mdOut);
    let md = `# 📐 StrataMetriq Architecture & Security Report\n\n`;
    md += `**Target Directory:** \`${targetDir}\`  \n**Scan Duration:** \`${duration}ms\`  \n\n`;
    md += `| Metric | Count |\n|---|---|\n`;
    md += `| **Total Files Scanned** | ${totalModules} |\n`;
    md += `| **External Dependencies** | ${totalPackages} |\n`;
    md += `| **Circular Loops** | ${circularCount} |\n`;
    md += `| **Duplicate Code Pairs** | ${duplicateCount} |\n`;
    md += `| **HIGH Severity Risks** | 🔴 ${highRisks} |\n`;
    md += `| **MEDIUM Severity Risks** | 🟡 ${mediumRisks} |\n`;
    md += `| **LOW Severity Risks** | 🔵 ${lowRisks} |\n\n`;

    if (highRisks > 0) {
      md += `### 🚨 High Severity Risks\n\n`;
      allRisks.filter(r => r.risk.severity === 'HIGH').forEach(r => {
        md += `- **[${r.risk.category}]** in \`${r.file}:${r.risk.line || 1}\`: ${r.risk.message}\n`;
      });
      md += `\n`;
    }
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`${colors.green}[+] Markdown CI PR report exported to: ${outPath}${colors.reset}`);
  }

  // Evaluate DevSecOps Quality Gates
  let failed = false;
  const failureReasons: string[] = [];

  if (failOnHigh && highRisks > 0) {
    failed = true;
    failureReasons.push(`Gate Failed: Found ${highRisks} HIGH severity production risk(s). (--fail-on-high enabled)`);
  }
  if (failOnCircular && circularCount > 0) {
    failed = true;
    failureReasons.push(`Gate Failed: Found ${circularCount} circular dependency loop(s). (--fail-on-circular enabled)`);
  }
  if (maxCircular !== null && circularCount > maxCircular) {
    failed = true;
    failureReasons.push(`Gate Failed: Circular dependencies (${circularCount}) exceeded threshold (--max-circular ${maxCircular}).`);
  }

  if (failed) {
    console.log(`\n${colors.red}${colors.bold}================================================================${colors.reset}`);
    console.log(`${colors.red}${colors.bold}  ❌ CI/CD DEVSECOPS GATE FAILED - PIPELINE BLOCKED             ${colors.reset}`);
    console.log(`${colors.red}${colors.bold}================================================================${colors.reset}`);
    failureReasons.forEach(reason => console.log(`${colors.red}  * ${reason}${colors.reset}`));
    console.log('');
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}================================================================${colors.reset}`);
    console.log(`${colors.green}${colors.bold}  ✅ ALL CI/CD DEVSECOPS GATES PASSED - CLEAR TO DEPLOY         ${colors.reset}`);
    console.log(`${colors.green}${colors.bold}================================================================${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${colors.red}[FATAL ERROR] Scanner execution failed:${colors.reset}`, err);
  process.exit(1);
});
