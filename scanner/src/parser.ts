import * as ts from 'typescript';
import * as path from 'path';
import { Node, Edge, Graph } from '@stratametriq/shared';
import { loadGovernanceRules, evaluateArchitectureGovernance } from './governance';

export class Scanner {
  private graph: Graph = { nodes: [], edges: [], duplicates: [] };
  private nodeIds = new Set<string>();
  private globalFunctions: { filePath: string; name: string; startLine: number; tokens: Set<string>; snippet: string }[] = [];
  private fileTokenSets = new Map<string, Set<string>>();
  private declaredDependencies = new Map<string, { file: string; type: string }>();
  private usedDependencies = new Set<string>();

  constructor() {}

  public parseFile(filePath: string, sourceText: string) {
    const ext = path.extname(filePath).toLowerCase();
    const isJsOrTs = ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'].includes(ext) || ext === '';
    const isJsx = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');
    let sourceFile: ts.SourceFile | undefined;
    if (isJsOrTs) {
      sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        isJsx ? ts.ScriptKind.TSX : undefined
      );
    }

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    let graphNode = this.graph.nodes.find(n => n.id === normalizedPath);
    if (!graphNode) {
      graphNode = {
        id: normalizedPath,
        type: isJsOrTs || isJsx || ['.py', '.java', '.kt', '.go', '.cs', '.php', '.rb', '.rs', '.cpp', '.h'].includes(ext) ? 'module' : 'file',
        name: path.basename(filePath),
        filePath: filePath // keep original casing for UI and opening
      };
      this.graph.nodes.push(graphNode);
      this.nodeIds.add(normalizedPath);
    }
    
    if (path.basename(filePath).toLowerCase() === 'package.json') {
      try {
        const pkg = JSON.parse(sourceText);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
        const ignoredPrefixes = ['@types/', '@docusaurus/', '@mdx-js/', '@tsconfig/', '@vitejs/', '@eslint/', '@babel/'];
        const ignoredSuffixes = ['-loader', '-plugin', '-preset', '-cli', '-config', '-theme'];
        const ignoredExact = ['typescript', 'vite', 'esbuild', 'oxlint', 'docusaurus', 'clsx', 'prism-react-renderer', 'eslint', 'prettier', 'jest', 'mocha', 'webpack', 'rollup', 'babel', 'nodemon', 'ts-node', 'tsx', 'concurrently', 'husky', 'lint-staged', 'shx', 'rimraf', 'cross-env'];
        for (const dep of Object.keys(deps)) {
          if (!ignoredPrefixes.some(p => dep.startsWith(p)) && !ignoredSuffixes.some(s => dep.endsWith(s)) && !ignoredExact.includes(dep)) {
            this.declaredDependencies.set(dep, { file: filePath, type: 'npm' });
          }
        }
        if (pkg.workspaces && Array.isArray(pkg.workspaces)) {
          for (const ws of pkg.workspaces) {
            if (typeof ws === 'string') {
              const wsName = `@stratametriq/${ws}`;
              this.declaredDependencies.set(wsName, { file: filePath, type: 'workspace' });
            }
          }
        }
      } catch (e) {}
    } else if (path.basename(filePath).toLowerCase() === 'requirements.txt') {
      const lines = sourceText.split(/\r?\n/);
      for (const line of lines) {
        const clean = line.split(/[=<>~#]/)[0].trim();
        if (clean && /^[a-zA-Z0-9_-]+$/.test(clean)) {
          this.declaredDependencies.set(clean, { file: filePath, type: 'python' });
        }
      }
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

    const basename = path.basename(filePath).toLowerCase();
    const isManifestOrLock = ext === '.json' || ext === '.lock' || ext === '.yaml' || ext === '.yml' || ext === '.md' || ext === '.txt' || basename === 'package-lock.json' || basename === 'yarn.lock' || basename === 'pnpm-lock.yaml';
    if (isManifestOrLock) {
      return;
    }

    // Check for architectural code smells & production risks
    if (sourceText.includes('console.log')) {
      graphNode.problems.push('Warning: console.log statement found');
    }
    if (sourceText.includes('TODO:') || sourceText.includes('FIXME:')) {
      graphNode.problems.push('Note: Unresolved TODO/FIXME comment');
    }
    if (sourceFile) {
      const parseDiagnostics = (sourceFile as any).parseDiagnostics || [];
      if (parseDiagnostics.length > 0) {
        parseDiagnostics.forEach((d: any) => {
          graphNode!.problems!.push(`Syntax Error: ${d.messageText || 'Invalid syntax'}`);
        });
      }
    }
    graphNode.problemCount = graphNode.problems.length;

    // 0. Convention-Based Route Auto-Detection (Next.js App Router / Remix / Nuxt)
    const nextRouteMatch = normalizedPath.match(/(?:app|pages)\/api\/(.+?)\/(?:route|index)\.(?:ts|js|tsx|jsx)$/i) || normalizedPath.match(/(?:app|pages)\/api\/(.+?)\.(?:ts|js|tsx|jsx)$/i);
    if (nextRouteMatch && nextRouteMatch[1]) {
      const apiPath = `/api/${nextRouteMatch[1]}`;
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].filter(m => new RegExp(`\\bexport\\s+(?:async\\s+)?(?:function|const)\\s+${m}\\b`, 'i').test(sourceText));
      if (methods.length === 0) methods.push('ANY');
      methods.forEach(m => {
        const endpoint = `${m} ${apiPath}`;
        if (!graphNode!.apisCalled!.includes(endpoint)) graphNode!.apisCalled!.push(endpoint);
      });
    }

    // 1. Debug code (Check lines that aren't comments)
    const lines = sourceText.split(/\r\n|\r|\n|\u2028|\u2029/);
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (!/^\s*(\/\/|\*|<!--|\{\/\*|#)/.test(line) && /(console\.(log|debug|dir|table|trace|warn|error)|debugger;|window\.__REDUX_DEVTOOLS_EXTENSION__|alert\s*\(|confirm\s*\(|print\s*\(|System\.out\.print|fmt\.Print|log\.(Printf|Println|Print))/i.test(line)) {
        risks.push({ category: 'Debug code', message: 'Found active debug statement (console, debugger, alert)', severity: 'HIGH', line: idx + 1 });
        break;
      }
    }

    // 2. Temporary code (Only trigger on comments or annotations, not regular variable names)
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/\/\/\s*(?:TEMP|HACK|XXX|WIP|@temporary|remove\s*this|delete\s*this|for\s*testing)\b|\/\*[\s\S]*?\b(?:TEMP|HACK|XXX|WIP|@temporary|remove\s*this|delete\s*this)\b|#\s*(?:TEMP|HACK|XXX|WIP|@temporary|remove\s*this|delete\s*this|for\s*testing)\b/i.test(line)) {
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
      if (/^\s*(\/\/|\*|<!--|\{\/\*|#)/.test(line)) {
        if (/[;={}\(\)<>\[\]\+\-\*\/]|\b(function|const|let|var|import|export|return|if|for|while|class|console|async|await|try|catch|new|this|props|state|true|false|null|undefined|app|router|db|res|req)\b/i.test(line)) {
          if (consecutiveComments === 0) commentStartLine = idx + 1;
          consecutiveComments++;
          if (consecutiveComments >= 2) {
            risks.push({ category: 'Large commented code blocks', message: 'Found commented-out code or inactive logic block (2+ lines)', severity: 'LOW', line: commentStartLine });
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
          risks.push({ category: 'Large commented code blocks', message: 'Found block comment containing commented-out source code', severity: 'LOW', line: idx + 1 });
          break;
        }
      }
    }

    // 5. TODO/FIXME comments & To-do files
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/\/\/\s*(?:TODO|TO-DO|FIXME|PENDING|BUG|REFACTOR|XXX|WIP|NOTE\s*:)\b|\/\*[\s\S]*?\b(?:TODO|TO-DO|FIXME|FIX\s*ME|PENDING|BUG|REFACTOR)\b|#\s*(?:TODO|TO-DO|FIXME|PENDING|BUG|REFACTOR|XXX|WIP|NOTE\s*:)\b/i.test(line)) {
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
      if (/\/\/\s*(?:dead\s*code|unused|deprecated|legacy|no\s*longer\s*used|old\s*code|remove\s*this|delete\s*this|unreachable|not\s*in\s*use)\b/i.test(line) || /#\s*(?:dead\s*code|unused|deprecated|legacy|no\s*longer\s*used|old\s*code|remove\s*this|delete\s*this|unreachable|not\s*in\s*use)\b/i.test(line) || /if\s*\(\s*(false|0|""|null|undefined)\s*\)/i.test(line) || /while\s*\(\s*(false|0)\s*\)/i.test(line)) {
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

    // 10. Memory Leaks / Uncleaned Timers & Listeners (setTimeout, setInterval, addEventListener)
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/(?:^|\s|\b|window\.|self\.)(?:setTimeout|setInterval|addEventListener|socket\.on)\s*\(/i.test(line) && !/clearTimeout|clearInterval|removeEventListener|socket\.off/i.test(sourceText)) {
        if (!risks.some(r => r.category === 'Memory Leaks / SPA Timers')) {
          risks.push({ category: 'Memory Leaks / SPA Timers', message: 'Timer or event listener detected without cleanup (potential SPA memory leak)', severity: 'MEDIUM', line: idx + 1 });
        }
        break;
      }
    }

    // 11. Insecure Cryptography
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/crypto\.createHash\(['"](md5|sha1|des)['"]\)/i.test(line) || /Math\.random\(\).*?(token|auth|secret|key|id)/i.test(line)) {
        if (!risks.some(r => r.category === 'Insecure Cryptography')) {
          risks.push({ category: 'Insecure Cryptography', message: 'Detected weak cryptographic hash function (MD5/SHA1/DES) or Math.random for security', severity: 'HIGH', line: idx + 1 });
        }
        break;
      }
    }

    // 12. SQL / NoSQL Injection
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*?['"]\s*\+/i.test(line) || /\+\s*['"].*?(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i.test(line) || /query\s*\(\s*['"`].*?\$\{/i.test(line)) {
        if (!risks.some(r => r.category === 'SQL / NoSQL Injection')) {
          risks.push({ category: 'SQL / NoSQL Injection', message: 'Raw string concatenation detected in database query (SQL injection risk)', severity: 'HIGH', line: idx + 1 });
        }
        break;
      }
    }

    // 13. XSS Risks (Unsanitized DOM)
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/dangerouslySetInnerHTML/i.test(line) || /\beval\s*\(/i.test(line) || /document\.write\s*\(/i.test(line)) {
        if (!risks.some(r => r.category === 'XSS DOM Risks')) {
          risks.push({ category: 'XSS DOM Risks', message: 'Unsanitized DOM execution detected (dangerouslySetInnerHTML / eval / document.write)', severity: 'HIGH', line: idx + 1 });
        }
        break;
      }
    }

    // Store overall file token set for calculating total file overlap percentage
    if (sourceText.length > 50) {
      const allTokens = sourceText.match(/[a-zA-Z0-9_]{3,}/g);
      if (allTokens && allTokens.length > 10) {
        this.fileTokenSets.set(filePath, new Set(allTokens.slice(0, 1500)));
      }
    }

    // Function & Block level tokenization for precise duplicate logic detection
    if (sourceText.length > 50 && this.globalFunctions.length < 1000) {
      const lines = sourceText.split(/\r?\n/);
      const funcRegex = /(?:function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>|def\s+([a-zA-Z0-9_]+)|(?:public|private|protected|static|async)\s+(?:[a-zA-Z0-9_<>[\]]+\s+)+([a-zA-Z0-9_]+)\s*\([^)]*\)|func\s+(?:\([^)]+\)\s*)?([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+))/;
      let foundFunc = false;
      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        const match = line.match(funcRegex);
        if (match) {
          foundFunc = true;
          const funcName = match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || `Block L${lIdx + 1}`;
          const blockLines = lines.slice(lIdx, Math.min(lines.length, lIdx + 40)).join(' ');
          const tokens = blockLines.match(/[a-zA-Z0-9_]{3,}/g);
          if (tokens && tokens.length >= 15) {
            const snippet = lines.slice(lIdx, Math.min(lines.length, lIdx + 6)).join('\n');
            this.globalFunctions.push({
              filePath: filePath,
              name: funcName,
              startLine: lIdx + 1,
              tokens: new Set(tokens.slice(0, 300)),
              snippet
            });
          }
        }
      }
      if (!foundFunc && lines.length > 15) {
        for (let lIdx = 0; lIdx < lines.length; lIdx += 20) {
          const blockLines = lines.slice(lIdx, Math.min(lines.length, lIdx + 30)).join(' ');
          const tokens = blockLines.match(/[a-zA-Z0-9_]{3,}/g);
          if (tokens && tokens.length >= 15) {
            const snippet = lines.slice(lIdx, Math.min(lines.length, lIdx + 6)).join('\n');
            this.globalFunctions.push({
              filePath: filePath,
              name: `lines ${lIdx + 1}-${Math.min(lines.length, lIdx + 30)}`,
              startLine: lIdx + 1,
              tokens: new Set(tokens.slice(0, 300)),
              snippet
            });
          }
        }
      }
    }

    if (isJsOrTs && sourceFile) {
      ts.forEachChild(sourceFile, (node) => {
        this.visitNode(node, normalizedPath, graphNode!, sourceFile!);
      });

      // 8. Detect base router prefix mounting (e.g., app.use(process.env.BASE_API_URL + "/api/assignment", router))
      const useMatch = sourceText.match(/(?:app|router)\.use\s*\([^,]*?(['"`])(\/(?:api\/|v\d+\/)?[a-zA-Z0-9_/-]+)\1/i);
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
    } else {
      this.parsePolyglotAST(filePath, ext, sourceText, normalizedPath, graphNode!);
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
        } else {
          const targetPkg = targetId.startsWith('@') ? targetId.split('/').slice(0, 2).join('/') : targetId.split('/')[0];
          this.usedDependencies.add(targetPkg);
          this.usedDependencies.add(targetId);
        }
        targetId = targetId.toLowerCase();

        this.graph.edges.push({
          source: currentFilePath.toLowerCase(),
          target: targetId,
          type: 'imports'
        });
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      let targetId = node.moduleSpecifier.text;
      if (!targetId.startsWith('.')) {
        const targetPkg = targetId.startsWith('@') ? targetId.split('/').slice(0, 2).join('/') : targetId.split('/')[0];
        this.usedDependencies.add(targetPkg);
        this.usedDependencies.add(targetId);
      }
      this.graph.edges.push({
        source: currentFilePath.toLowerCase(),
        target: targetId.toLowerCase(),
        type: 'imports'
      });
    } else if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(sourceFile);
      if ((callText === 'require' || node.expression.kind === ts.SyntaxKind.ImportKeyword) && node.arguments.length > 0) {
        let targetId = '';
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          targetId = arg.text;
        } else if (ts.isTemplateExpression(arg) || ts.isBinaryExpression(arg)) {
          // Heuristic resolution for dynamic imports and runtime reflection strings
          const rawArg = arg.getText(sourceFile).replace(/['"`]/g, '');
          const match = rawArg.match(/^([\.\/\w\-]+)/);
          const prefix = match ? match[1] : './dynamic';
          targetId = `${prefix}/* [Dynamic Bundle]`;
        }
        if (targetId) {
          if (!targetId.startsWith('.')) {
            const targetPkg = targetId.startsWith('@') ? targetId.split('/').slice(0, 2).join('/') : targetId.split('/')[0];
            this.usedDependencies.add(targetPkg);
            this.usedDependencies.add(targetId);
          }
          this.graph.edges.push({
            source: currentFilePath.toLowerCase(),
            target: targetId.toLowerCase(),
            type: 'imports'
          });
        }
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

    // 8. Dependency Injection & Decorator Wiring (NestJS / Angular / Spring IoC)
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      node.members.forEach(member => {
        if (ts.isConstructorDeclaration(member)) {
          member.parameters.forEach(param => {
            if (param.type && ts.isTypeReferenceNode(param.type)) {
              const typeName = param.type.typeName.getText(sourceFile);
              if (typeName && typeName !== className) {
                this.graph.edges.push({
                  source: currentFilePath.toLowerCase(),
                  target: typeName.toLowerCase(),
                  type: 'imports'
                });
              }
            }
          });
        }
      });
    }

    ts.forEachChild(node, (n) => this.visitNode(n, currentFilePath, graphNode, sourceFile));
  }

  public getGraph(workspaceRoot?: string): Graph {
    for (const edge of this.graph.edges) {
      if (!this.nodeIds.has(edge.target)) {
        const possibleExts = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.cs', '.rb', '.php', '.rs', '.cpp', '.h', '/index.js', '/index.ts', '/index.jsx', '/index.tsx', '/__init__.py'];
        let found = false;
        for (const ext of possibleExts) {
          if (this.nodeIds.has(edge.target + ext)) {
            edge.target = edge.target + ext;
            found = true;
            break;
          }
        }
        
        if (!found && !this.nodeIds.has(edge.target)) {
          const matchedNode = this.graph.nodes.find(n => n.name.toLowerCase().replace(/\.[^/.]+$/, '') === edge.target.toLowerCase() || n.name.toLowerCase() === edge.target.toLowerCase());
          if (matchedNode) {
            edge.target = matchedNode.id;
            found = true;
          }
        }
        if (!found && !this.nodeIds.has(edge.target)) {
          const isDynamic = edge.target.includes('[Dynamic') || edge.target.includes('[DI');
          this.graph.nodes.push({
            id: edge.target,
            type: isDynamic ? 'module' : 'package',
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
          const fragName1 = f1.name.startsWith('lines ') ? `block (${f1.name})` : `${f1.name}()`;
          const fragName2 = f2.name.startsWith('lines ') ? `block (${f2.name})` : `${f2.name}()`;
          const fragment = `Duplicate logic: ${fragName1} ≈ ${fragName2}`;

          const fileSet1 = this.fileTokenSets.get(f1.filePath);
          const fileSet2 = this.fileTokenSets.get(f2.filePath);
          let fileSim = similarity;
          if (fileSet1 && fileSet2) {
            let fileInter = 0;
            for (const t of fileSet1) {
              if (fileSet2.has(t)) fileInter++;
            }
            const fileUnion = fileSet1.size + fileSet2.size - fileInter;
            fileSim = Math.round((fileInter / fileUnion) * 100);
          }

          const existing = this.graph.duplicates.find(d => 
            (d.fileA === f1.filePath && d.fileB === f2.filePath) ||
            (d.fileA === f2.filePath && d.fileB === f1.filePath)
          );
          if (!existing || (existing.funcSimilarity || existing.similarity) < similarity) {
            if (existing) {
              existing.similarity = fileSim;
              existing.funcSimilarity = similarity;
              existing.fragment = fragment;
              existing.lineA = f1.startLine;
              existing.lineB = f2.startLine;
              existing.codeSnippetA = f1.snippet;
              existing.codeSnippetB = f2.snippet;
            } else {
              this.graph.duplicates.push({
                fileA: f1.filePath,
                fileB: f2.filePath,
                similarity: fileSim,
                funcSimilarity: similarity,
                fragment,
                lineA: f1.startLine,
                lineB: f2.startLine,
                codeSnippetA: f1.snippet,
                codeSnippetB: f2.snippet
              });
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

    for (const edge of this.graph.edges) {
      if (edge.type === 'imports' && edge.target) {
        const target = edge.target;
        const targetPkg = target.startsWith('@') ? target.split('/').slice(0, 2).join('/') : target.split('/')[0];
        this.usedDependencies.add(targetPkg);
        this.usedDependencies.add(target);
      }
    }

    const unusedPackages: { name: string; file: string; type?: string }[] = [];
    for (const [dep, info] of this.declaredDependencies.entries()) {
      if (info.type === 'workspace') continue;
      if (!this.usedDependencies.has(dep)) {
        unusedPackages.push({
          name: dep,
          file: info.file,
          type: info.type
        });
      }
    }
    this.graph.unusedPackages = unusedPackages;

    if (workspaceRoot) {
      const rules = loadGovernanceRules(workspaceRoot);
      evaluateArchitectureGovernance(this.graph, rules);
    }

    return this.graph;
  }

  private parsePolyglotAST(filePath: string, ext: string, sourceText: string, currentFilePath: string, graphNode: Node) {
    const lines = sourceText.split(/\r\n|\r|\n/);

    // 1. Python (.py) - FastAPI, Django, Flask, SQLAlchemy
    if (ext === '.py') {
      for (const line of lines) {
        // Imports: import foo.bar as fb | from foo.bar import baz
        const impMatch = line.match(/^\s*(?:import\s+([a-zA-Z0-9_\.]+)|from\s+([a-zA-Z0-9_\.]+)\s+import)/);
        if (impMatch) {
          const mod = (impMatch[1] || impMatch[2]).replace(/\./g, '/').toLowerCase();
          this.graph.edges.push({ source: currentFilePath.toLowerCase(), target: mod, type: 'imports' });
        }
        // Functions / Classes
        if (/^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/.test(line)) {
          graphNode.functionsCount!++;
          graphNode.exportsCount!++;
        }
        if (/^\s*class\s+([a-zA-Z0-9_]+)/.test(line)) {
          graphNode.classesCount = (graphNode.classesCount || 0) + 1;
          graphNode.exportsCount!++;
        }
        // API Routes: @app.get("/api/...") | @router.post(...) | @app.route("/api/...", methods=['POST']) | path("api/...", ...)
        const apiMatch = line.match(/@(?:app|router|api|blueprint)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i);
        if (apiMatch) {
          const endpoint = `${apiMatch[1].toUpperCase()} ${apiMatch[2]}`;
          if (!graphNode.apisCalled!.includes(endpoint)) graphNode.apisCalled!.push(endpoint);
        }
        const djangoMatch = line.match(/(?:path|re_path|url)\s*\(\s*['"`]([^'"`]+)['"`]/i);
        if (djangoMatch && djangoMatch[1] && djangoMatch[1].includes('/')) {
          const endpoint = `ANY /${djangoMatch[1].replace(/^\//, '')}`;
          if (!graphNode.apisCalled!.includes(endpoint)) graphNode.apisCalled!.push(endpoint);
        }
        // DB Tables: __tablename__ = 'users_table' | class User(models.Model):
        const tblMatch = line.match(/__tablename__\s*=\s*['"`]([^'"`]+)['"`]/i) || line.match(/Table\s*\(\s*['"`]([^'"`]+)['"`]/i);
        if (tblMatch && tblMatch[1]) {
          const tbl = tblMatch[1].toLowerCase();
          if (!graphNode.dbTables!.includes(tbl)) graphNode.dbTables!.push(tbl);
        }
      }
    }
    // 2. Java (.java), Kotlin (.kt), C# (.cs) - Spring Boot, JAX-RS, ASP.NET Core
    else if (ext === '.java' || ext === '.kt' || ext === '.cs') {
      for (const line of lines) {
        // Imports: import com.example.foo; | using System.Text;
        const impMatch = line.match(/^\s*(?:import|using)\s+([a-zA-Z0-9_\.]+)\s*(?:;|$)/);
        if (impMatch && impMatch[1]) {
          const mod = impMatch[1].replace(/\./g, '/').toLowerCase();
          this.graph.edges.push({ source: currentFilePath.toLowerCase(), target: mod, type: 'imports' });
        }
        // Classes / Records / Interfaces
        if (/^\s*(?:public|private|protected|internal)?\s*(?:abstract|final|open|data|sealed)?\s*(?:class|interface|record)\s+([a-zA-Z0-9_]+)/.test(line)) {
          graphNode.classesCount = (graphNode.classesCount || 0) + 1;
          graphNode.exportsCount!++;
        }
        // Functions / Methods
        if (/^\s*(?:public|private|protected|internal|fun)\s+(?:static\s+|async\s+|virtual\s+|override\s+|final\s+)*(?:[a-zA-Z0-9_<>\/]+\s+)+([a-zA-Z0-9_]+)\s*\(/.test(line)) {
          graphNode.functionsCount!++;
          if (/public|internal/.test(line)) graphNode.exportsCount!++;
        }
        // API Routes: @GetMapping("/api/...") | [HttpGet("/api/...")] | @RequestMapping(...)
        const apiMatch = line.match(/(?:@|\[)(?:Get|Post|Put|Delete|Patch)(?:Mapping|Http|Route)?\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]+)['"`]/i);
        if (apiMatch && apiMatch[1]) {
          let method = 'GET';
          if (/Post/i.test(line)) method = 'POST';
          else if (/Put/i.test(line)) method = 'PUT';
          else if (/Delete/i.test(line)) method = 'DELETE';
          else if (/Patch/i.test(line)) method = 'PATCH';
          const endpoint = `${method} ${apiMatch[1]}`;
          if (!graphNode.apisCalled!.includes(endpoint)) graphNode.apisCalled!.push(endpoint);
        }
        // DB Tables: @Table(name = "users_table") | [Table("users")]
        const tblMatch = line.match(/(?:@|\[)Table\s*\(\s*(?:name\s*=\s*)?['"`]([^'"`]+)['"`]/i);
        if (tblMatch && tblMatch[1]) {
          const tbl = tblMatch[1].toLowerCase();
          if (!graphNode.dbTables!.includes(tbl)) graphNode.dbTables!.push(tbl);
        }
      }
    }
    // 3. Go (.go) - Gin, Echo, Fiber, GORM
    else if (ext === '.go') {
      for (const line of lines) {
        // Imports: import "example.com/pkg/foo"
        const impMatch = line.match(/^\s*(?:import\s+)?['"`]([a-zA-Z0-9_\-\.\/]+)['"`]/);
        if (impMatch && impMatch[1] && !line.includes('package ')) {
          const mod = impMatch[1].toLowerCase();
          this.graph.edges.push({ source: currentFilePath.toLowerCase(), target: mod, type: 'imports' });
        }
        // Structs / Interfaces
        if (/^\s*type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface)/.test(line)) {
          graphNode.classesCount = (graphNode.classesCount || 0) + 1;
          graphNode.exportsCount!++;
        }
        // Functions: func MyFunc(...) | func (s *Service) Handler(...)
        if (/^\s*func\s+(?:\([^\)]+\)\s*)?([a-zA-Z0-9_]+)\s*\(/.test(line)) {
          graphNode.functionsCount!++;
          const funcNameMatch = line.match(/^\s*func\s+(?:\([^\)]+\)\s*)?([a-zA-Z0-9_]+)/);
          if (funcNameMatch && funcNameMatch[1] && /^[A-Z]/.test(funcNameMatch[1])) graphNode.exportsCount!++;
        }
        // API Routes: r.GET("/api/...", ...) | app.Post("/api/...", ...)
        const apiMatch = line.match(/(?:\.|\b)(GET|POST|PUT|DELETE|PATCH)\s*\(\s*['"`]([^'"`]+)['"`]/i);
        if (apiMatch && apiMatch[1] && apiMatch[2]) {
          const endpoint = `${apiMatch[1].toUpperCase()} ${apiMatch[2]}`;
          if (!graphNode.apisCalled!.includes(endpoint)) graphNode.apisCalled!.push(endpoint);
        }
      }
    }
    // 4. Other languages (Ruby, PHP, Rust, C++, C, etc.)
    else {
      for (const line of lines) {
        if (/^\s*(?:fn|def|function|void|int|bool|string)\s+([a-zA-Z0-9_]+)\s*\(/.test(line)) {
          graphNode.functionsCount!++;
          graphNode.exportsCount!++;
        }
        const impMatch = line.match(/^\s*(?:use|require|require_once|include|#include)\s+['"`<]([a-zA-Z0-9_\-\.\/]+)['">]/);
        if (impMatch && impMatch[1]) {
          this.graph.edges.push({ source: currentFilePath.toLowerCase(), target: impMatch[1].toLowerCase(), type: 'imports' });
        }
      }
    }

    // Generic SQL queries across all polyglot files
    for (const line of lines) {
      const sqlMatch = line.match(/(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)/i);
      if (sqlMatch && sqlMatch[1]) {
        const tbl = sqlMatch[1].toLowerCase();
        if (!['select', 'where', 'set', 'values', 'as', 'on', 'left', 'right', 'inner', 'outer', 'by', 'order', 'group', 'limit', 'count', 'and', 'or'].includes(tbl)) {
          if (!graphNode.dbTables!.includes(tbl)) graphNode.dbTables!.push(tbl);
        }
      }
    }
  }
}
