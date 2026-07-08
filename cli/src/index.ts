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
  console.log(`${colors.bold}${colors.cyan}  StrataMetriq CLI v1.3.1 - DevSecOps Architecture Governance   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
}

function printHelp() {
  printBanner();
  console.log('Usage: stratametriq <command> [directory/file] [options]\n');
  console.log('Commands:');
  console.log('  init                    Create a default .stratametriqrc.json configuration file');
  console.log('  scan [directory]        Run architecture scan, health scoring & security audit');
  console.log('  impact <filepath>       Run downstream BFS ripple analysis on a file\n');
  console.log('Options:');
  console.log('  --diff <ref>            Git PR Mode: Only check risks & circular loops in modified files');
  console.log('  --prune                 Report unused npm packages and orphaned modules (dead code)');
  console.log('  --watch, -w             Live watch mode: automatically re-scan when files change');
  console.log('  --html <file>           Export standalone interactive HTML dashboard report');
  console.log('  --fail-on-high          Fail pipeline (exit code 1) if HIGH severity risks exist');
  console.log('  --fail-on-circular      Fail pipeline (exit code 1) if circular dependencies exist');
  console.log('  --max-circular <N>      Fail pipeline if circular dependencies exceed threshold N');
  console.log('  --min-health <N>        Fail pipeline if project health score drops below N (1-100)');
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

async function runScan(
  targetDir: string,
  command: string,
  impactFile: string | null,
  failOnHigh: boolean,
  failOnCircular: boolean,
  maxCircular: number | null,
  minHealthScore: number | null,
  jsonOut: string | null,
  mdOut: string | null,
  htmlOut: string | null,
  diffRef: string | null,
  isPrune: boolean,
  isWatch: boolean
) {
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

  if (command === 'impact') {
    if (!impactFile) {
      console.error(`${colors.red}[!] Error: Please specify a target file for impact analysis. Example: stratametriq impact src/services/UserService.ts${colors.reset}`);
      if (!isWatch) process.exit(1);
      return;
    }
    const targetNorm = impactFile.replace(/\\/g, '/').toLowerCase();
    const selectedNode = graph.nodes.find(n => n.id === targetNorm || n.id.endsWith(targetNorm) || n.filePath.replace(/\\/g, '/').toLowerCase().endsWith(targetNorm));
    
    if (!selectedNode) {
      console.error(`${colors.red}[!] Error: File not found in architecture graph: ${impactFile}${colors.reset}`);
      console.log(`${colors.gray}Tip: Ensure the file path is correct and resides within ${targetDir}${colors.reset}`);
      if (!isWatch) process.exit(1);
      return;
    }

    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  ⚡ Downstream Impact Analysis: ${selectedNode.name}  ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
    console.log(`${colors.bold}Target File Path:${colors.reset} ${selectedNode.filePath}`);

    const affectedFiles = new Set<string>();
    const affectedApis = new Set<string>();
    const affectedDb = new Set<string>();
    const affectedComponents = new Set<string>();

    const visited = new Set<string>();
    const queue = [selectedNode.id];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      if (curr !== selectedNode.id) {
        affectedFiles.add(curr);
      }

      const currNode = graph.nodes.find(n => n.id === curr);
      if (currNode) {
        const apis = currNode.apisCalled || (currNode as any).apis || [];
        apis.forEach((a: string) => affectedApis.add(a));
        const dbList = currNode.dbTables || [];
        dbList.forEach((db: string) => affectedDb.add(db));
        const comps = currNode.componentsUsed || (currNode as any).components || [];
        comps.forEach((c: string) => affectedComponents.add(c));
      }

      const dependents = graph.edges.filter(e => e.target === curr).map(e => e.source);
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }

    const totalAffected = affectedFiles.size + affectedApis.size + affectedDb.size + affectedComponents.size;
    let riskLevel = 'LOW 🔵 (Minimal Downstream Ripple Effect)';
    let riskColor = colors.cyan;
    if (totalAffected > 20 || affectedApis.size > 3 || affectedDb.size > 2) {
      riskLevel = 'HIGH 🔴 (Critical Central Dependency - High Ripple Effect)';
      riskColor = colors.red + colors.bold;
    } else if (totalAffected > 5 || affectedApis.size > 0 || affectedDb.size > 0) {
      riskLevel = 'MEDIUM 🟡 (Moderate Downstream Dependents)';
      riskColor = colors.yellow + colors.bold;
    }

    console.log(`Risk Severity    : ${riskColor}${riskLevel}${colors.reset}`);
    console.log(`Dependent Files  : ${colors.bold}${affectedFiles.size}${colors.reset} downstream modules depend on this file`);
    console.log(`Affected APIs    : ${affectedApis.size > 0 ? colors.yellow + colors.bold : colors.green}${affectedApis.size}${colors.reset}`);
    if (affectedApis.size > 0) {
      Array.from(affectedApis).forEach(api => console.log(`  * ${colors.cyan}${api}${colors.reset}`));
    }
    console.log(`Affected DBs     : ${affectedDb.size > 0 ? colors.yellow + colors.bold : colors.green}${affectedDb.size}${colors.reset}`);
    if (affectedDb.size > 0) {
      Array.from(affectedDb).forEach(db => console.log(`  * ${colors.magenta}🛢️  ${db}${colors.reset}`));
    }
    console.log(`Affected UI Comps: ${affectedComponents.size > 0 ? colors.yellow + colors.bold : colors.green}${affectedComponents.size}${colors.reset}`);
    if (affectedComponents.size > 0) {
      Array.from(affectedComponents).forEach(comp => console.log(`  * ${colors.green}✨ ${comp}${colors.reset}`));
    }
    console.log('');
    if (!isWatch) process.exit(0);
    return;
  }

  // Check Git Diff PR Mode
  let changedFilesSet: Set<string> | null = null;
  if (diffRef) {
    try {
      const execSync = require('child_process').execSync;
      const diffOut = execSync(`git diff --name-only ${diffRef}`, { cwd: targetDir, encoding: 'utf8' });
      changedFilesSet = new Set(
        diffOut.split('\n')
          .map((f: string) => f.trim().replace(/\\/g, '/').toLowerCase())
          .filter(Boolean)
      );
      console.log(`${colors.bold}${colors.magenta}🔍 Git PR Diff Mode Enabled:${colors.reset} Checking ${changedFilesSet.size} modified file(s) against ${colors.bold}${diffRef}${colors.reset}\n`);
    } catch (e) {
      console.log(`${colors.yellow}[!] Warning: Could not execute git diff against ref "${diffRef}". Performing full scan instead.${colors.reset}\n`);
    }
  }

  // Calculate statistics
  const totalNodes = graph.nodes.length;
  const totalPackages = graph.nodes.filter(n => n.type === 'package').length;
  const totalModules = graph.nodes.filter(n => n.type === 'module').length;
  const circularCount = graph.cycles ? graph.cycles.length : 0;
  const duplicateCount = graph.duplicates ? graph.duplicates.length : 0;

  let highRisks = 0;
  let mediumRisks = 0;
  let lowRisks = 0;
  let prHighRisks = 0;
  const allRisks: { file: string; risk: ProductionRisk }[] = [];

  const allApis = new Set<string>();
  const allDbTables = new Set<string>();

  graph.nodes.forEach(node => {
    const apis = node.apisCalled || (node as any).apis || [];
    apis.forEach((a: string) => allApis.add(a));
    const dbList = node.dbTables || [];
    dbList.forEach((db: string) => allDbTables.add(db));

    if (node.productionRisks) {
      node.productionRisks.forEach(risk => {
        allRisks.push({ file: node.filePath, risk });
        const normFile = node.filePath.replace(/\\/g, '/').toLowerCase();
        const isChanged = changedFilesSet ? (changedFilesSet.has(normFile) || Array.from(changedFilesSet).some(cf => normFile.endsWith(cf))) : true;
        
        if (risk.severity === 'HIGH') {
          highRisks++;
          if (isChanged) prHighRisks++;
        } else if (risk.severity === 'MEDIUM') {
          mediumRisks++;
        } else {
          lowRisks++;
        }
      });
    }
  });

  // Calculate Project Health Score & Complexity Index
  const totalEdges = graph.edges.length;
  const complexityIndex = totalModules > 0 ? (totalEdges / totalModules) : 0;
  
  // Scale penalties based on project size (density) rather than flat absolute numbers
  const highRiskDensity = totalModules > 0 ? (highRisks / totalModules) : 0;
  const mediumRiskDensity = totalModules > 0 ? (mediumRisks / totalModules) : 0;
  const circularDensity = totalModules > 0 ? (circularCount / totalModules) : 0;

  let healthScore = 100 
    - (complexityIndex * 1.5) 
    - (highRiskDensity * 40) 
    - (mediumRiskDensity * 15) 
    - (circularDensity * 100);
    
  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));
  
  let healthColor = colors.green;
  let healthGrade = 'A+ 🏆 (Excellent Maintainability)';
  if (healthScore < 50) { healthColor = colors.red; healthGrade = 'D ⚠️  (High Debt & Risk)'; }
  else if (healthScore < 75) { healthColor = colors.yellow; healthGrade = 'B/C 🟡 (Needs Refactoring)'; }
  else if (healthScore < 90) { healthColor = colors.green; healthGrade = 'A- 🟢 (Good Health)'; }

  // Print Summary Table
  console.log(`${colors.bold}--- 📐 Architectural Health & Complexity ---${colors.reset}`);
  console.log(`Project Health Score : ${healthColor}${colors.bold}${healthScore}%  [Grade: ${healthGrade}]${colors.reset}`);
  console.log(`Complexity Index     : ${colors.bold}${complexityIndex.toFixed(2)}${colors.reset} dependencies per file`);
  console.log(`Circular Loops       : ${circularCount > 0 ? colors.red + colors.bold : colors.green}${circularCount}${colors.reset}`);
  console.log(`Duplicate Code Pairs : ${duplicateCount > 0 ? colors.yellow + colors.bold : colors.green}${duplicateCount}${colors.reset}`);
  console.log(`Total Files Scanned  : ${colors.bold}${totalModules}${colors.reset} (${totalPackages} external packages)`);
  console.log(`Scan Duration        : ${duration}ms\n`);

  if (changedFilesSet) {
    console.log(`${colors.bold}--- 🚦 Git PR Diff Quality Gate (${diffRef}) ---${colors.reset}`);
    console.log(`Modified Files Scanned: ${colors.bold}${changedFilesSet.size}${colors.reset}`);
    console.log(`NEW High Severity     : ${prHighRisks > 0 ? colors.red + colors.bold : colors.green}${prHighRisks}${colors.reset}`);
    console.log('');
  }

  if (allApis.size > 0 || allDbTables.size > 0) {
    console.log(`${colors.bold}--- 🌐 Discovered API Routes & DB Tables ---${colors.reset}`);
    console.log(`API Endpoints Found  : ${colors.bold}${allApis.size}${colors.reset}`);
    Array.from(allApis).slice(0, 10).forEach(api => console.log(`  * ${colors.cyan}${api}${colors.reset}`));
    if (allApis.size > 10) console.log(`  ... and ${allApis.size - 10} more API routes.`);
    console.log(`Database Tables      : ${colors.bold}${allDbTables.size}${colors.reset}`);
    Array.from(allDbTables).slice(0, 10).forEach(db => console.log(`  * ${colors.magenta}🛢️  ${db}${colors.reset}`));
    if (allDbTables.size > 10) console.log(`  ... and ${allDbTables.size - 10} more database tables.`);
    console.log('');
  }

  if (duplicateCount > 0 && graph.duplicates) {
    console.log(`${colors.bold}--- 👥 Duplicate Logic Detected ---${colors.reset}`);
    graph.duplicates.slice(0, 5).forEach(dup => {
      console.log(`  * [${colors.yellow}${colors.bold}${dup.similarity}% Similarity${colors.reset}] ${colors.bold}${dup.fileA}${colors.reset} <==> ${colors.bold}${dup.fileB}${colors.reset}`);
    });
    if (duplicateCount > 5) console.log(`  ... and ${duplicateCount - 5} more duplicate pairs.`);
    console.log('');
  }

  if (isPrune) {
    console.log(`${colors.bold}--- 🗑️ Dead Code & Unused Dependency Pruning ---${colors.reset}`);
    if (graph.unusedPackages && graph.unusedPackages.length > 0) {
      console.log(`${colors.bold}${colors.yellow}📦 Unused npm Packages (in package.json but zero imports found):${colors.reset}`);
      graph.unusedPackages.slice(0, 15).forEach(pkg => console.log(`  * ${colors.bold}${pkg.name}${colors.reset} (in ${pkg.file})`));
      if (graph.unusedPackages.length > 15) console.log(`  ... and ${graph.unusedPackages.length - 15} more unused packages.`);
    } else {
      console.log(`${colors.green}✅ All package.json dependencies are actively imported!${colors.reset}`);
    }

    const orphanedModules = graph.nodes.filter(n => 
      n.type === 'module' && 
      !n.filePath.toLowerCase().endsWith('index.ts') && 
      !n.filePath.toLowerCase().endsWith('index.js') && 
      !n.filePath.toLowerCase().endsWith('main.ts') && 
      !n.filePath.toLowerCase().endsWith('main.js') && 
      !n.filePath.toLowerCase().includes('test') && 
      !n.filePath.toLowerCase().includes('spec') && 
      !graph.edges.some(e => e.target === n.id)
    );

    if (orphanedModules.length > 0) {
      console.log(`\n${colors.bold}${colors.magenta}👻 Orphaned Modules (zero incoming dependencies / unreferenced code):${colors.reset}`);
      orphanedModules.slice(0, 15).forEach(mod => console.log(`  * ${colors.bold}${mod.filePath}${colors.reset}`));
      if (orphanedModules.length > 15) console.log(`  ... and ${orphanedModules.length - 15} more orphaned modules.`);
    } else {
      console.log(`\n${colors.green}✅ No orphaned modules detected!${colors.reset}`);
    }
    console.log('');
  }

  console.log(`${colors.bold}--- 🛡️ Security & Pre-Deployment Risks ---${colors.reset}`);
  console.log(`HIGH Severity   : ${highRisks > 0 ? colors.red + colors.bold : colors.green}${highRisks}${colors.reset}`);
  console.log(`MEDIUM Severity : ${mediumRisks > 0 ? colors.yellow + colors.bold : colors.green}${mediumRisks}${colors.reset}`);
  console.log(`LOW Severity    : ${colors.cyan}${lowRisks}${colors.reset}\n`);

  if (highRisks > 0) {
    console.log(`${colors.red}${colors.bold}[!] High Severity Risks Detected:${colors.reset}`);
    const risksToShow = changedFilesSet ? allRisks.filter(r => r.risk.severity === 'HIGH' && (changedFilesSet.has(r.file.replace(/\\/g, '/').toLowerCase()) || Array.from(changedFilesSet).some(cf => r.file.replace(/\\/g, '/').toLowerCase().endsWith(cf)))) : allRisks.filter(r => r.risk.severity === 'HIGH');
    risksToShow.slice(0, 10).forEach(r => {
      console.log(`  - [${r.risk.category}] in ${colors.bold}${r.file}:${r.risk.line || 1}${colors.reset} -> ${r.risk.message}`);
    });
    if (risksToShow.length > 10) console.log(`  ... and ${risksToShow.length - 10} more HIGH severity risks.`);
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
    let md = `# 📐 StrataMetriq DevSecOps Architecture & Security Report\n\n`;
    md += `**Target Directory:** \`${targetDir}\`  \n**Scan Duration:** \`${duration}ms\`  \n**Project Health Score:** **${healthScore}% (${healthGrade})**  \n\n`;
    md += `| Metric | Count |\n|---|---|\n`;
    md += `| **Project Health Score** | **${healthScore}%** |\n`;
    md += `| **Complexity Index** | **${complexityIndex.toFixed(2)} dep/file** |\n`;
    md += `| **Total Files Scanned** | ${totalModules} |\n`;
    md += `| **External Dependencies** | ${totalPackages} |\n`;
    md += `| **API Endpoints Discovered** | 🌐 ${allApis.size} |\n`;
    md += `| **Database Tables Found** | 🛢️ ${allDbTables.size} |\n`;
    md += `| **Circular Loops** | 🔄 ${circularCount} |\n`;
    md += `| **Duplicate Code Pairs** | 👥 ${duplicateCount} |\n`;
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
    if (duplicateCount > 0 && graph.duplicates) {
      md += `### 👥 Duplicate Logic Pairs\n\n`;
      graph.duplicates.forEach(dup => {
        md += `- **[${dup.similarity}% Similarity]** \`${dup.fileA}\` ↔ \`${dup.fileB}\`\n`;
      });
      md += `\n`;
    }
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`${colors.green}[+] Markdown CI PR report exported to: ${outPath}${colors.reset}`);
  }

  // Export HTML Report
  if (htmlOut) {
    const outPath = path.resolve(process.cwd(), htmlOut);
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StrataMetriq Architecture & Security Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 32px; }
    .header { border-bottom: 1px solid #334155; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
    h1 { color: #38bdf8; margin: 0; font-size: 28px; }
    .badge { background: #1e293b; border: 1px solid #38bdf8; color: #38bdf8; padding: 8px 16px; border-radius: 9999px; font-weight: bold; font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; }
    .card h3 { margin: 0 0 8px 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; }
    .card .val { font-size: 28px; font-weight: bold; color: #f8fafc; }
    .section { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .section h2 { margin-top: 0; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-weight: 600; }
    .high { color: #ef4444; font-weight: bold; }
    .medium { color: #f59e0b; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>📐 StrataMetriq DevSecOps Report</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0;">Target: ${targetDir} | Scan Duration: ${duration}ms</p>
    </div>
    <div class="badge">Health Score: ${healthScore}% (${healthGrade})</div>
  </div>
  <div class="grid">
    <div class="card"><h3>Files Scanned</h3><div class="val">${totalModules}</div></div>
    <div class="card"><h3>Complexity Index</h3><div class="val">${complexityIndex.toFixed(2)}</div></div>
    <div class="card"><h3>Circular Loops</h3><div class="val" style="color: ${circularCount > 0 ? '#ef4444' : '#10b981'};">${circularCount}</div></div>
    <div class="card"><h3>Duplicate Pairs</h3><div class="val" style="color: ${duplicateCount > 0 ? '#f59e0b' : '#10b981'};">${duplicateCount}</div></div>
    <div class="card"><h3>API Endpoints</h3><div class="val">${allApis.size}</div></div>
    <div class="card"><h3>DB Tables</h3><div class="val">${allDbTables.size}</div></div>
  </div>
  ${highRisks > 0 ? `
  <div class="section">
    <h2>🚨 High Severity Production Risks (${highRisks})</h2>
    <table>
      <tr><th>Category</th><th>File Location</th><th>Message</th></tr>
      ${allRisks.filter(r => r.risk.severity === 'HIGH').map(r => `<tr><td class="high">${r.risk.category}</td><td>${r.file}:${r.risk.line || 1}</td><td>${r.risk.message}</td></tr>`).join('')}
    </table>
  </div>` : ''}
  ${duplicateCount > 0 && graph.duplicates ? `
  <div class="section">
    <h2>👥 Duplicate Code Pairs (${duplicateCount})</h2>
    <table>
      <tr><th>Similarity</th><th>File A</th><th>File B</th></tr>
      ${graph.duplicates.map(d => `<tr><td class="medium">${d.similarity}%</td><td>${d.fileA}</td><td>${d.fileB}</td></tr>`).join('')}
    </table>
  </div>` : ''}
</body>
</html>`;
    fs.writeFileSync(outPath, htmlContent, 'utf8');
    console.log(`${colors.green}[+] Standalone interactive HTML report exported to: ${outPath}${colors.reset}`);
  }

  // Evaluate DevSecOps Quality Gates
  let failed = false;
  const failureReasons: string[] = [];

  const anyGateActive = failOnHigh || failOnCircular || maxCircular !== null || minHealthScore !== null;

  const effectiveHighRisks = changedFilesSet ? prHighRisks : highRisks;
  if (failOnHigh && effectiveHighRisks > 0) {
    failed = true;
    failureReasons.push(`Gate Failed: Found ${effectiveHighRisks} HIGH severity production risk(s)${changedFilesSet ? ' in PR modified files' : ''}. (--fail-on-high enabled)`);
  }
  if (failOnCircular && circularCount > 0) {
    failed = true;
    failureReasons.push(`Gate Failed: Found ${circularCount} circular dependency loop(s). (--fail-on-circular enabled)`);
  }
  if (maxCircular !== null && circularCount > maxCircular) {
    failed = true;
    failureReasons.push(`Gate Failed: Circular dependencies (${circularCount}) exceeded threshold (--max-circular ${maxCircular}).`);
  }
  if (minHealthScore !== null && healthScore < minHealthScore) {
    failed = true;
    failureReasons.push(`Gate Failed: Project Health Score (${healthScore}%) is below minimum threshold (--min-health ${minHealthScore}).`);
  }

  if (anyGateActive) {
    if (failed) {
      console.log(`\n${colors.red}${colors.bold}================================================================${colors.reset}`);
      console.log(`${colors.red}${colors.bold}  ❌ CI/CD DEVSECOPS GATE FAILED - PIPELINE BLOCKED             ${colors.reset}`);
      console.log(`${colors.red}${colors.bold}================================================================${colors.reset}`);
      failureReasons.forEach(reason => console.log(`${colors.red}  * ${reason}${colors.reset}`));
      console.log('');
      if (!isWatch) process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bold}================================================================${colors.reset}`);
      console.log(`${colors.green}${colors.bold}  ✅ ALL CI/CD DEVSECOPS GATES PASSED - CLEAR TO DEPLOY         ${colors.reset}`);
      console.log(`${colors.green}${colors.bold}================================================================${colors.reset}\n`);
      if (!isWatch) process.exit(0);
    }
  } else {
    // Interactive Audit Mode (No CI/CD Gates configured)
    if (effectiveHighRisks > 0 || healthScore < 50 || circularCount > 0) {
      console.log(`\n${colors.yellow}${colors.bold}================================================================${colors.reset}`);
      console.log(`${colors.yellow}${colors.bold}  ⚠️  AUDIT COMPLETE: ARCHITECTURAL RISKS / DEBT DETECTED        ${colors.reset}`);
      console.log(`${colors.yellow}${colors.bold}================================================================${colors.reset}`);
      console.log(`${colors.gray}  * Tip: To block CI/CD pipelines when HIGH risks exist, run with --fail-on-high${colors.reset}`);
      console.log(`${colors.gray}  * Tip: You can set default quality gates by running: npx @stratametriq/cli init${colors.reset}\n`);
    } else {
      console.log(`\n${colors.green}${colors.bold}================================================================${colors.reset}`);
      console.log(`${colors.green}${colors.bold}  ✨ AUDIT COMPLETE: CODEBASE IS IN GOOD ARCHITECTURAL HEALTH   ${colors.reset}`);
      console.log(`${colors.green}${colors.bold}================================================================${colors.reset}`);
      console.log(`${colors.gray}  * Tip: To enforce these standards in CI/CD, run with --fail-on-high${colors.reset}\n`);
    }
    if (!isWatch) process.exit(0);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || (args.length === 1 && !args[0]!.startsWith('-') && args[0] === 'help')) {
    printHelp();
    process.exit(0);
  }

  let command = 'scan';
  let targetDir = process.cwd();
  let impactFile: string | null = null;
  
  // Check for .stratametriqrc.json
  let config: any = {};
  const configPath = path.resolve(process.cwd(), '.stratametriqrc.json');
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      // Ignore config read error
    }
  }

  let failOnHigh = config?.qualityGates?.failOnHigh || false;
  let failOnCircular = config?.qualityGates?.failOnCircular || false;
  let maxCircular: number | null = config?.qualityGates?.maxCircular !== undefined ? config.qualityGates.maxCircular : null;
  let minHealthScore: number | null = config?.qualityGates?.minHealthScore !== undefined ? config.qualityGates.minHealthScore : null;
  let jsonOut: string | null = config?.reporting?.jsonOut || null;
  let mdOut: string | null = config?.reporting?.mdOut || null;
  let htmlOut: string | null = config?.reporting?.htmlOut || null;
  let diffRef: string | null = null;
  let isPrune = false;
  let isWatch = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === 'scan') {
      command = 'scan';
    } else if (arg === 'init') {
      command = 'init';
    } else if (arg === 'impact') {
      command = 'impact';
      if (args[i + 1] && !args[i + 1]!.startsWith('-')) {
        impactFile = args[++i]!;
      }
    } else if (arg === '--fail-on-high') {
      failOnHigh = true;
    } else if (arg === '--fail-on-circular') {
      failOnCircular = true;
    } else if (arg === '--max-circular') {
      maxCircular = parseInt(args[++i] || '0', 10);
    } else if (arg === '--min-health') {
      minHealthScore = parseInt(args[++i] || '50', 10);
    } else if (arg === '--json') {
      jsonOut = args[++i] || 'stratametriq-report.json';
    } else if (arg === '--md') {
      mdOut = args[++i] || 'stratametriq-report.md';
    } else if (arg === '--html') {
      htmlOut = args[++i] || 'stratametriq-report.html';
    } else if (arg === '--diff') {
      diffRef = (args[i + 1] && !args[i + 1]!.startsWith('-')) ? args[++i]! : 'HEAD';
    } else if (arg === '--prune') {
      isPrune = true;
    } else if (arg === '--watch' || arg === '-w') {
      isWatch = true;
    } else if (!arg.startsWith('-') && arg !== 'scan' && arg !== 'init' && arg !== 'impact' && arg !== impactFile && arg !== diffRef && arg !== jsonOut && arg !== mdOut && arg !== htmlOut) {
      targetDir = path.resolve(process.cwd(), arg);
    }
  }

  if (command === 'init') {
    const rcPath = path.resolve(process.cwd(), '.stratametriqrc.json');
    if (fs.existsSync(rcPath)) {
      console.log(`${colors.yellow}[!] .stratametriqrc.json already exists in ${process.cwd()}${colors.reset}`);
      process.exit(0);
    }
    const defaultRc = {
      "ignoreDirs": ["node_modules", ".git", "dist", "build", "coverage", ".cache"],
      "qualityGates": {
        "failOnHigh": false,
        "failOnCircular": false,
        "maxCircular": null,
        "minHealthScore": 50
      },
      "reporting": {
        "jsonOut": null,
        "mdOut": null,
        "htmlOut": null
      }
    };
    fs.writeFileSync(rcPath, JSON.stringify(defaultRc, null, 2), 'utf8');
    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  StrataMetriq CLI v1.3.1 - Interactive Configuration Wizard    ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
    console.log(`${colors.green}[+] Created default configuration file: ${rcPath}${colors.reset}`);
    console.log(`${colors.gray}You can customize ignore rules and CI/CD quality gates in this file.${colors.reset}\n`);
    process.exit(0);
  }

  if (fs.existsSync(configPath)) {
    console.log(`${colors.gray}[i] Loaded project configuration from .stratametriqrc.json${colors.reset}\n`);
  }

  await runScan(targetDir, command, impactFile, failOnHigh, failOnCircular, maxCircular, minHealthScore, jsonOut, mdOut, htmlOut, diffRef, isPrune, isWatch);

  if (isWatch) {
    console.log(`${colors.bold}${colors.cyan}👁️  Watch Mode Active: Monitoring ${targetDir} for changes... (Press Ctrl+C to exit)${colors.reset}`);
    let timer: any = null;
    fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.includes('node_modules') || filename.includes('.git') || filename.includes('dist') || filename.includes('build') || filename.includes('.cache')) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        console.clear();
        console.log(`${colors.bold}${colors.yellow}🔄 File change detected (${filename}). Re-scanning...${colors.reset}\n`);
        await runScan(targetDir, command, impactFile, failOnHigh, failOnCircular, maxCircular, minHealthScore, jsonOut, mdOut, htmlOut, diffRef, isPrune, true);
        console.log(`${colors.bold}${colors.cyan}👁️  Watch Mode Active: Monitoring ${targetDir} for changes... (Press Ctrl+C to exit)${colors.reset}`);
      }, 300);
    });
  }
}

main().catch(err => {
  console.error(`${colors.red}[FATAL ERROR] Scanner execution failed:${colors.reset}`, err);
  process.exit(1);
});
