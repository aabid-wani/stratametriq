import * as ts from 'typescript';
import * as path from 'path';
import { Node, Edge, Graph } from '@stratometriq/shared';

export class Scanner {
  private graph: Graph = { nodes: [], edges: [], duplicates: [] };
  private nodeIds = new Set<string>();
  private globalFunctions: { filePath: string; tokens: Set<string> }[] = [];

  constructor() {}

  public parseFile(filePath: string, sourceText: string) {
    const isJsx = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      isJsx ? ts.ScriptKind.TSX : undefined
    );

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    let graphNode = this.graph.nodes.find(n => n.id === normalizedPath);
    if (!graphNode) {
      graphNode = {
        id: normalizedPath,
        type: 'file',
        name: filePath.replace(/\\/g, '/').split('/').pop() || filePath,
        filePath: filePath // keep original casing for UI and opening
      };
      this.graph.nodes.push(graphNode);
      this.nodeIds.add(normalizedPath);
    }
    
    graphNode.exportsCount = 0;
    graphNode.functionsCount = 0;
    graphNode.componentsUsed = [];
    graphNode.apisCalled = [];
    graphNode.dbTables = [];
    graphNode.problems = [];
    graphNode.problemCount = 0;
    graphNode.productionRisks = [];
    const risks = graphNode.productionRisks;

    // Check for architectural code smells & production risks
    if (sourceText.includes('console.log')) {
      graphNode.problems.push('Warning: console.log statement found');
    }
    if (sourceText.includes('TODO:') || sourceText.includes('FIXME:')) {
      graphNode.problems.push('Note: Unresolved TODO/FIXME comment');
    }
    const parseDiagnostics = (sourceFile as any).parseDiagnostics || [];
    if (parseDiagnostics.length > 0) {
      parseDiagnostics.forEach((d: any) => {
        graphNode!.problems!.push(`Syntax Error: ${d.messageText || 'Invalid syntax'}`);
      });
    }
    graphNode.problemCount = graphNode.problems.length;

    // 1. Debug code (Check lines that aren't comments)
    const lines = sourceText.split(/\r\n|\r|\n|\u2028|\u2029/);
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (!/^\s*(\/\/|\*|<!--|\{\/\*)/.test(line) && /(console\.(log|debug|dir|table|trace|warn|error)|debugger;|window\.__REDUX_DEVTOOLS_EXTENSION__|alert\s*\(|confirm\s*\()/i.test(line)) {
        risks.push({ category: 'Debug code', message: 'Found active debug statement (console, debugger, alert)', severity: 'HIGH', line: idx + 1 });
        break;
      }
    }

    // 2. Temporary code (Only trigger on comments or annotations, not regular variable names)
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/\/\/\s*(?:TEMP|HACK|XXX|WIP|@temporary|remove\s*this|delete\s*this|for\s*testing)\b|\/\*[\s\S]*?\b(?:TEMP|HACK|XXX|WIP|@temporary|remove\s*this|delete\s*this)\b/i.test(line)) {
        risks.push({ category: 'Temporary code', message: 'Found temporary / hack / WIP code annotation', severity: 'HIGH', line: idx + 1 });
        break;
      }
    }

    // 3. Hardcoded credentials & Hardcoded values
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/(?:(?:api_?key|apikey|secret|password|passwd|pwd|jwt|access_?key|private_?key|aws_?access|client_?secret|api_?secret|db_?pass|database_?url|connection_?string)\s*[:=]\s*['"`](?!\$\{)[A-Za-z0-9_\-\.\=\/\+\~]{10,}['"`])/i.test(line) || /(?:http:\/\/localhost|http:\/\/127\.0\.0\.1|https?:\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?::[0-9]{2,5})?|(?:mongodb|postgres|mysql|redis|sqlite):\/\/[a-zA-Z0-9_\-\.\:]+@)/i.test(line) || /(?:Bearer\s+[A-Za-z0-9\-\._~\+\/]{20,}|AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16})/.test(line)) {
        risks.push({ category: 'Hardcoded credentials', message: 'Hardcoded value found: secret, key, URL, IP address, or port', severity: 'HIGH', line: idx + 1 });
        break;
      }
    }

    // 4. Commented code & Large commented code blocks
    let consecutiveComments = 0;
    let commentStartLine = 1;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/^\s*(\/\/|\*|<!--|\{\/\*)/.test(line)) {
        if (/[;={}\(\)<>\[\]\+\-\*\/]|\b(function|const|let|var|import|export|return|if|for|while|class|console|async|await|try|catch|new|this|props|state|true|false|null|undefined|app|router|db|res|req)\b/i.test(line)) {
          if (consecutiveComments === 0) commentStartLine = idx + 1;
          consecutiveComments++;
          if (consecutiveComments >= 2) {
            risks.push({ category: 'Large commented code blocks', message: 'Found commented-out code or inactive logic block (2+ lines)', severity: 'MEDIUM', line: commentStartLine });
            break;
          }
        }
      } else if (!/^\s*(\/\/|\*)/.test(line)) {
        consecutiveComments = 0;
      }
    }
    if (!risks.some(r => r.category === 'Large commented code blocks')) {
      for (let idx = 0; idx < lines.length; idx++) {
        if (/\/\*[\s\S]*?([;={}\(\)]|\b(function|const|let|import|export|return|if|for|class)\b)/.test(lines[idx]) || /\{\/\*/.test(lines[idx])) {
          risks.push({ category: 'Large commented code blocks', message: 'Found block comment containing commented-out source code', severity: 'MEDIUM', line: idx + 1 });
          break;
        }
      }
    }

    // 5. TODO/FIXME comments & To-do files
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/\/\/\s*(?:TODO|TO-DO|FIXME|PENDING|BUG|REFACTOR|XXX|WIP|NOTE\s*:)\b|\/\*[\s\S]*?\b(?:TODO|TO-DO|FIXME|FIX\s*ME|PENDING|BUG|REFACTOR)\b/i.test(line)) {
        risks.push({ category: 'TODO/FIXME comments', message: 'Found TODO / FIXME note or task/to-do file item', severity: 'LOW', line: idx + 1 });
        break;
      }
    }
    if (!risks.some(r => r.category === 'TODO/FIXME comments') && /(?:^|[\/\\])(?:TODO|FIXME|TASKS?|NOTES?)\.(?:md|txt|json)$/i.test(filePath)) {
      risks.push({ category: 'TODO/FIXME comments', message: 'Found TODO / FIXME note or task/to-do file item', severity: 'LOW', line: 1 });
    }

    // 6. Dead code
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/\/\/\s*(?:dead\s*code|unused|deprecated|legacy|no\s*longer\s*used|old\s*code|remove\s*this|delete\s*this|unreachable|not\s*in\s*use)\b/i.test(line) || /if\s*\(\s*(false|0|""|null|undefined)\s*\)/i.test(line) || /while\s*\(\s*(false|0)\s*\)/i.test(line)) {
        if (!risks.some(r => r.category === 'Dead code')) {
          risks.push({ category: 'Dead code', message: 'Dead code detected: unused/deprecated block or false conditional', severity: 'MEDIUM', line: idx + 1 });
        }
        break;
      }
    }

    // 8. Test data & Test code
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/(?:\b(?:mockData|testData|dummyData|faker|jest|sinon|nock|vi\.mock)\b|test@example\.com|foo@bar\.com)/i.test(line) || /(?<!\.)\b(?:describe|it|test|expect|beforeEach|afterEach|beforeAll|afterAll)\s*\(/i.test(line)) {
        if (!risks.some(r => r.category === 'Test data')) {
          risks.push({ category: 'Test data', message: 'Test suite, mock data, or test fixture detected', severity: 'HIGH', line: idx + 1 });
        }
        break;
      }
    }
    if (!risks.some(r => r.category === 'Test data') && /(?:\.test\.|\.spec\.|__tests__|[\/\\](?:tests?|mocks?|specs?|fixtures?)[\/\\])/i.test(filePath)) {
      risks.push({ category: 'Test data', message: 'Test suite, mock data, or test fixture detected', severity: 'HIGH', line: 1 });
    }

    // Module-level tokenization for duplicates (capped for large project performance)
    if (sourceText.length > 50 && this.globalFunctions.length < 500) {
      const matches = sourceText.match(/[a-zA-Z0-9]+/g);
      if (matches && matches.length > 10) {
        this.globalFunctions.push({
          filePath: filePath,
          tokens: new Set(matches.slice(0, 400))
        });
      }
    }

    ts.forEachChild(sourceFile, (node) => {
      this.visitNode(node, normalizedPath, graphNode!, sourceFile);
    });

    // 8. Detect base router prefix mounting (e.g., app.use(process.env.BASE_API_URL + "/api/assignment", router))
    const useMatch = sourceFile.text.match(/(?:app|router)\.use\s*\([^,]*?(['"`])(\/(?:api\/|v\d+\/)?[a-zA-Z0-9_/-]+)\1/i);
    if (useMatch && useMatch[2] && graphNode && graphNode.apisCalled && graphNode.apisCalled.length > 0) {
      const basePrefix = useMatch[2].replace(/\/$/, ''); // e.g., "/api/assignment"
      graphNode.apisCalled = graphNode.apisCalled.map(api => {
        const [method, ...pathParts] = api.split(' ');
        let relPath = pathParts.join(' ');
        if (relPath === '/' || relPath === '') {
          return `${method} ${basePrefix}`;
        }
        if (!relPath.startsWith(basePrefix)) {
          relPath = `${basePrefix}${relPath.startsWith('/') ? '' : '/'}${relPath}`;
        }
        return `${method} ${relPath}`;
      });
    }
  }

  private visitNode(node: ts.Node, currentFilePath: string, graphNode: Node, sourceFile: ts.SourceFile) {
    // 1. Edges (Imports)
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        let targetId = moduleSpecifier.text;

        // Check for 9. Unused development imports
        const pkg = targetId.toLowerCase();
        if (pkg.includes('redux-logger') || pkg.includes('why-did-you-render') || pkg.includes('faker') || pkg.includes('mockjs') || pkg.includes('sinon') || pkg.includes('nock') || pkg.includes('redux-devtools') || pkg.includes('@testing-library') || pkg.includes('jest')) {
          if (!graphNode.productionRisks!.some(r => r.category === 'Unused development imports')) {
            const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            graphNode.productionRisks!.push({ category: 'Unused development imports', message: `Development or testing package imported (${targetId})`, severity: 'MEDIUM', line: lineNum });
          }
        }

        // Resolve relative paths
        if (targetId.startsWith('.')) {
          const dir = path.dirname(currentFilePath);
          targetId = path.resolve(dir, targetId).replace(/\\/g, '/');
        }
        targetId = targetId.toLowerCase();

        this.graph.edges.push({
          source: currentFilePath.toLowerCase(),
          target: targetId,
          type: 'imports'
        });
      }
    }

    // 2. Exports
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      graphNode.exportsCount!++;
    } else if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      graphNode.exportsCount!++;
    }

    // 3. Functions
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node)) {
      graphNode.functionsCount!++;
    }

    // 4. Components Used (JSX Elements)
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      let tagName = '';
      if (ts.isJsxElement(node)) {
        tagName = node.openingElement.tagName.getText(sourceFile);
      } else {
        tagName = node.tagName.getText(sourceFile);
      }
      if (/^[A-Z]/.test(tagName) && !graphNode.componentsUsed!.includes(tagName)) {
        graphNode.componentsUsed!.push(tagName);
      }
    }

    // 5. APIs and Database Calls
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(sourceFile);
      const callName = callText.toLowerCase();

      // fetch('/api/...') or axios.get('/api/...')
      if (callName === 'fetch' || callName.includes('axios.')) {
        if (node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            let method = 'GET';
            if (callName.includes('.post')) method = 'POST';
            if (callName.includes('.put')) method = 'PUT';
            if (callName.includes('.delete')) method = 'DELETE';
            const endpoint = `${method} ${arg.text}`;
            if (!graphNode.apisCalled!.includes(endpoint)) {
              graphNode.apisCalled!.push(endpoint);
            }
          }
        }
      }

      // Express / Next route definitions: app.get('/users', ...), router.post(...)
      if (callName.includes('.get') || callName.includes('.post') || callName.includes('.put') || callName.includes('.delete')) {
        if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
          const routePath = node.arguments[0].text;
          if (routePath.startsWith('/')) {
            const method = callName.split('.').pop()!.toUpperCase();
            const endpoint = `${method} ${routePath}`;
            if (!graphNode.apisCalled!.includes(endpoint)) {
              graphNode.apisCalled!.push(endpoint);
            }
          }
        }
      }

      // Databases & SQL queries
      if (callName.startsWith('prisma.') || callName.startsWith('db.') || callName.includes('.query') || callName.includes('.execute') || callName.includes('.find')) {
        let table = 'unknown';
        if (callName.startsWith('prisma.')) {
          const parts = callName.split('.');
          if (parts.length >= 2) table = parts[1] + (parts[1].endsWith('s') ? '_table' : 's_table'); // prisma.user.findMany -> users_table
        } else if (node.arguments.length > 0 && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) {
          const query = node.arguments[0].text.toUpperCase();
          const match = query.match(/(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+(?:[A-Z0-9_]+\.)?([A-Z0-9_]+)/);
          if (match) table = match[1].toLowerCase() + (match[1].toLowerCase().endsWith('_table') ? '' : '_table');
        }
        if (table !== 'unknown' && !graphNode.dbTables!.includes(table)) {
          graphNode.dbTables!.push(table);
        }
      }
    }

    // Direct string literals for table names e.g. "vendors_table", "users_table"
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const txt = node.text.toLowerCase();
      if ((txt.endsWith('_table') || txt.startsWith('tbl_')) && !graphNode.dbTables!.includes(txt)) {
        graphNode.dbTables!.push(txt);
      }
    }

    // 6. Dead code (Unreachable statements after return/throw/break/continue or if (false))
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      let terminated = false;
      for (const stmt of (node as any).statements || []) {
        if (terminated && !ts.isFunctionDeclaration(stmt)) {
          if (!graphNode.productionRisks!.some(r => r.category === 'Dead code')) {
            const lineNum = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile)).line + 1;
            graphNode.productionRisks!.push({ category: 'Dead code', message: 'Unreachable statement found after return/throw/break', severity: 'MEDIUM', line: lineNum });
          }
          break;
        }
        if (ts.isReturnStatement(stmt) || ts.isThrowStatement(stmt) || ts.isBreakStatement(stmt) || ts.isContinueStatement(stmt)) {
          terminated = true;
        }
      }
    }
    if (ts.isIfStatement(node) && (node.expression.getText(sourceFile) === 'false' || node.expression.getText(sourceFile) === '0')) {
      if (!graphNode.productionRisks!.some(r => r.category === 'Dead code')) {
        const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        graphNode.productionRisks!.push({ category: 'Dead code', message: 'Dead code block: if (false) branch found', severity: 'MEDIUM', line: lineNum });
      }
    }

    // 7. Empty catch blocks
    if (ts.isCatchClause(node)) {
      if (node.block.statements.length === 0) {
        if (!graphNode.productionRisks!.some(r => r.category === 'Empty catch blocks')) {
          const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          graphNode.productionRisks!.push({ category: 'Empty catch blocks', message: 'Swallowed exception: empty catch block found', severity: 'MEDIUM', line: lineNum });
        }
      }
    }

    ts.forEachChild(node, (n) => this.visitNode(n, currentFilePath, graphNode, sourceFile));
  }

  public getGraph(): Graph {
    for (const edge of this.graph.edges) {
      if (!this.nodeIds.has(edge.target)) {
        const possibleExts = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts', '/index.jsx', '/index.tsx'];
        let found = false;
        for (const ext of possibleExts) {
          if (this.nodeIds.has(edge.target + ext)) {
            edge.target = edge.target + ext;
            found = true;
            break;
          }
        }
        
        if (!found && !this.nodeIds.has(edge.target)) {
          this.graph.nodes.push({
            id: edge.target,
            type: 'module',
            name: edge.target.split('/').pop() || edge.target,
            filePath: edge.target
          });
          this.nodeIds.add(edge.target);
        }
      }
    }

    this.graph.duplicates = [];
    const maxCompare = Math.min(this.globalFunctions.length, 300);
    for (let i = 0; i < maxCompare; i++) {
      for (let j = i + 1; j < maxCompare; j++) {
        const f1 = this.globalFunctions[i];
        const f2 = this.globalFunctions[j];
        if (f1.filePath === f2.filePath) continue;
        
        let intersection = 0;
        for (const t of f1.tokens) {
          if (f2.tokens.has(t)) intersection++;
        }
        
        const union = f1.tokens.size + f2.tokens.size - intersection;
        const similarity = Math.round((intersection / union) * 100);
        
        if (similarity >= 45) {
          const existing = this.graph.duplicates.find(d => 
            (d.fileA === f1.filePath && d.fileB === f2.filePath) ||
            (d.fileA === f2.filePath && d.fileB === f1.filePath)
          );
          if (!existing || existing.similarity < similarity) {
            if (existing) {
              existing.similarity = Math.max(existing.similarity, similarity);
            } else {
              this.graph.duplicates.push({ fileA: f1.filePath, fileB: f2.filePath, similarity });
            }
          }
        }
      }
    }
    this.graph.duplicates.sort((a, b) => b.similarity - a.similarity);
    this.graph.duplicates = this.graph.duplicates.slice(0, 5);

    // Detect Circular Dependencies (Cycles) using DFS
    const cycles: string[][] = [];
    const adj: Record<string, string[]> = {};
    const nodeMap: Record<string, string> = {};
    this.graph.nodes.forEach(n => {
      adj[n.id] = [];
      nodeMap[n.id] = n.filePath || n.name;
    });
    this.graph.edges.forEach(e => {
      if (adj[e.source] && adj[e.target] && e.source !== e.target) {
        adj[e.source].push(e.target);
      }
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (u: string) => {
      if (cycles.length >= 5) return; // limit to top 5 cycles
      visited.add(u);
      recStack.add(u);
      path.push(u);

      for (const v of adj[u] || []) {
        if (!visited.has(v)) {
          dfs(v);
        } else if (recStack.has(v)) {
          // Found a circular import cycle!
          const cycleStart = path.indexOf(v);
          if (cycleStart !== -1) {
            const cycleNodes = path.slice(cycleStart).map(id => nodeMap[id] || id);
            cycleNodes.push(nodeMap[v] || v); // close the loop
            cycles.push(cycleNodes);
          }
        }
      }

      path.pop();
      recStack.delete(u);
    };

    this.graph.nodes.forEach(n => {
      if (!visited.has(n.id)) {
        dfs(n.id);
      }
    });

    this.graph.cycles = cycles;

    return this.graph;
  }
}
