import { useEffect, useState, useMemo } from 'react';
import './App.css';

// Initialize VS Code API (singleton)
const vscode = typeof window !== 'undefined' && window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

function App() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [unusedPackages, setUnusedPackages] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedApi, setSelectedApi] = useState<string | null>(null);
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string>('All');
  const [apiSearchQuery, setApiSearchQuery] = useState<string>('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<string>('all');

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedApi(null);
    setSelectedNodeId(nodeId);
  };

  const handleSelectApi = (api: string | null) => {
    setSelectedNodeId(null);
    setSelectedApi(api);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'graphData') {
        const rawNodes = message.data.nodes || [];
        const rawEdges = message.data.edges || [];
        const rawDuplicates = message.data.duplicates || [];
        const rawCycles = message.data.cycles || [];
        const rawUnused = (message.data.unusedPackages || []).filter((pkg: any) => {
          if (pkg.type === 'workspace') return false;
          const name = (pkg.name || '').toLowerCase();
          if (name.startsWith('@types/') || name.startsWith('@docusaurus/') || name.startsWith('@mdx-js/') || name.startsWith('@tsconfig/') || name.startsWith('@vitejs/') || name.startsWith('@eslint/')) return false;
          if (name.endsWith('-loader') || name.endsWith('-plugin') || name.endsWith('-preset') || name.endsWith('-cli') || name.endsWith('-config') || name.endsWith('-theme')) return false;
          const ignoredExact = ['typescript', 'vite', 'esbuild', 'oxlint', 'docusaurus', 'clsx', 'prism-react-renderer', 'eslint', 'prettier', 'jest', 'mocha', 'webpack', 'rollup', 'babel', 'nodemon', 'ts-node', 'tsx', 'concurrently', 'husky', 'lint-staged', 'shx', 'rimraf', 'cross-env'];
          if (ignoredExact.includes(name)) return false;
          return true;
        });

        setNodes(rawNodes);
        setEdges(rawEdges);
        setDuplicates(rawDuplicates);
        setCycles(rawCycles);
        setUnusedPackages(rawUnused);
        setScanning(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleScan = () => {
    if (vscode) {
      setScanning(true);
      vscode.postMessage({ command: 'scan' });
    }
  };

  const handleOpenFile = (filePath: string, line?: number) => {
    if (vscode) {
      vscode.postMessage({ command: 'openFile', filePath, line });
    }
  };

  const handleOpenItemWithLine = (filePath: string, textStr?: string, defaultLine?: number) => {
    if (!filePath) return;
    let targetLine = defaultLine !== undefined ? Number(defaultLine) : undefined;
    if (textStr) {
      const match = textStr.match(/\[Line\s+(\d+)\]/i);
      if (match && match[1]) {
        targetLine = parseInt(match[1], 10);
      }
    }
    handleOpenFile(filePath, targetLine || 1);
  };

  const handleExportExecutiveReport = () => {
    const reportData = {
      title: "StrataMetriq Executive Architecture & DevSecOps Audit",
      timestamp: new Date().toISOString(),
      version: "1.4.1",
      metrics: {
        totalModules: nodes.length,
        circularLoops: cycles.length,
        duplicatePairs: duplicates.length,
        unusedDependencies: unusedPackages.length
      },
      highSeverityRisks: nodes.flatMap((n: any) =>
        (n.productionRisks || [])
          .filter((r: any) => r.severity === 'HIGH')
          .map((r: any) => ({
            file: n.filePath,
            line: r.line || 1,
            category: r.category,
            message: r.message
          }))
      ),
      circularDependencies: cycles
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stratametriq-executive-audit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileName = (pathStr: string) => {
    const parts = pathStr.split(/[\\/]/);
    return parts[parts.length - 1] || pathStr;
  };

  const getFolderPath = (pathStr: string) => {
    const parts = pathStr.split(/[\\/]/);
    if (parts.length <= 1) return '';
    parts.pop();
    if (parts.length > 3) {
      return '...\\' + parts.slice(-3).join('\\');
    }
    return parts.join('\\');
  };

  const isFileOpen = (filePath: string) => {
    const n = nodes.find(node => node.filePath === filePath || node.id === filePath.toLowerCase() || (node.filePath && node.filePath.toLowerCase() === filePath.toLowerCase()));
    return n ? n.isOpen : false;
  };

  const renderOpenBadge = (isOpen?: boolean) => {
    return isOpen ? (
      <span style={{ fontSize: '0.65rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '1px 6px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.4)', marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block' }}>Open</span>
    ) : (
      <span style={{ fontSize: '0.65rem', background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', padding: '1px 6px', borderRadius: '10px', marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block' }}>Closed</span>
    );
  };

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return null;

    let incomingEdges = 0;
    let outgoingEdges = 0;
    edges.forEach(e => {
      if (e.source === selectedNodeId) outgoingEdges++;
      if (e.target === selectedNodeId) incomingEdges++;
    });

    const functions = node.functionsCount || 0;
    const exportsCount = node.exportsCount || 0;
    const components = node.componentsUsed || [];
    const apis = node.apisCalled || [];
    const dbTables = node.dbTables || [];
    const problems = node.problemCount || 0;

    let complexityScore = functions + (outgoingEdges * 2) + (components.length * 1.5) + (apis.length * 3);
    complexityScore = Math.min(100, Math.round(complexityScore));

    let riskLevel = 'Low';
    if (problems > 0 || complexityScore > 50 || incomingEdges > 10) riskLevel = 'High';
    else if (complexityScore > 25 || incomingEdges > 5) riskLevel = 'Medium';

    let healthScore = 100 - (problems * 10) - (complexityScore * 0.5);
    healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

    return {
      ...node,
      incomingEdges,
      outgoingEdges,
      complexityScore,
      riskLevel,
      healthScore,
      functions,
      exportsCount,
      components,
      apis,
      dbTables
    };
  }, [selectedNodeId, nodes, edges]);

  const { score, complexity, totalModulesCount, totalPackagesCount } = useMemo(() => {
    if (nodes.length === 0) return { score: 100, complexity: '0.00', totalModulesCount: 0, totalPackagesCount: 0 };
    const moduleNodes = nodes.filter((n: any) => n.type === 'module');
    const totalModules = moduleNodes.length > 0 ? moduleNodes.length : Math.max(1, nodes.filter((n: any) => n.type !== 'package').length);
    const totalPackages = nodes.filter((n: any) => n.type === 'package').length;
    
    const comp = edges.length / totalModules;
    
    let highRisks = 0;
    let mediumRisks = 0;
    nodes.forEach((n: any) => {
      if (n.productionRisks) {
        n.productionRisks.forEach((r: any) => {
           if (r.category === 'Large commented code blocks') return;
           if (r.severity === 'HIGH') highRisks++;
           if (r.severity === 'MEDIUM') mediumRisks++;
        });
      }
    });

    const highRiskDensity = highRisks / totalModules;
    const mediumRiskDensity = mediumRisks / totalModules;
    const circularDensity = (cycles && cycles.length ? cycles.length : 0) / totalModules;
    
    let s = 100 - (comp * 1.5) - (highRiskDensity * 40) - (mediumRiskDensity * 15) - (circularDensity * 100);
    
    if (s < 10) s = 10;
    if (s > 100) s = 100;
    return { score: Math.round(s), complexity: comp.toFixed(2), totalModulesCount: totalModules, totalPackagesCount: totalPackages };
  }, [nodes, edges, cycles]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n: any) => {
      if (quickFilter === 'highRisks') {
        const hasHigh = (n.productionRisks || []).some((r: any) => r.severity === 'HIGH');
        if (!hasHigh) return false;
      } else if (quickFilter === 'openFiles') {
        if (!isFileOpen(n.filePath)) return false;
      } else if (quickFilter === 'circular') {
        const inCycle = cycles.some(cyc => cyc.includes(n.filePath));
        if (!inCycle) return false;
      }

      if (globalSearchQuery.trim()) {
        const q = globalSearchQuery.toLowerCase();
        const matchesName = (n.name || n.filePath || '').toLowerCase().includes(q);
        const matchesApi = (n.apis || n.apisCalled || []).some((api: string) => api.toLowerCase().includes(q));
        const matchesDb = (n.dbTables || []).some((t: string) => t.toLowerCase().includes(q));
        return matchesName || matchesApi || matchesDb;
      }
      return true;
    });
  }, [nodes, quickFilter, globalSearchQuery, cycles]);

  const mostComplexFiles = useMemo(() => {
    if (!filteredNodes || filteredNodes.length === 0) return [];

    const edgeCounts: Record<string, number> = {};
    filteredNodes.forEach((n: any) => edgeCounts[n.id] = 0);

    edges.forEach((e: any) => {
      if (edgeCounts[e.source] !== undefined) edgeCounts[e.source]++;
      if (edgeCounts[e.target] !== undefined) edgeCounts[e.target]++;
    });

    return [...filteredNodes]
      .filter((n: any) => (n.type === 'file' || n.type === 'module') && n.type !== 'package' && !n.filePath?.includes('node_modules') && !['react', 'react-dom', 'react-router', 'react-router-dom', 'axios', 'express', 'lodash', 'vue', 'angular', 'next', 'vite', 'typescript'].includes(n.name?.toLowerCase()))
      .map((n: any) => ({ ...n, edgeCount: edgeCounts[n.id] || 0 }))
      .sort((a, b) => b.edgeCount - a.edgeCount)
      .slice(0, 5);
  }, [filteredNodes, edges]);

  const problematicFiles = useMemo(() => {
    if (!filteredNodes || filteredNodes.length === 0) return [];

    return [...filteredNodes]
      .filter((n: any) => n.problemCount && n.problemCount > 0)
      .sort((a, b) => (b.problemCount || 0) - (a.problemCount || 0))
      .slice(0, 5);
  }, [filteredNodes]);

  const productionRiskFiles = useMemo(() => {
    return filteredNodes
      .filter((n: any) => n.productionRisks && n.productionRisks.length > 0)
      .map((n: any) => ({
        ...n,
        filteredRisks: selectedRiskCategory === 'All' ? n.productionRisks : n.productionRisks.filter((r: any) => r.category === selectedRiskCategory)
      }))
      .filter((n: any) => n.filteredRisks.length > 0)
      .sort((a: any, b: any) => b.filteredRisks.length - a.filteredRisks.length);
  }, [filteredNodes, selectedRiskCategory]);

  const totalProductionRisks = useMemo(() => {
    let total = 0;
    nodes.forEach((n: any) => {
      if (n.productionRisks) total += n.productionRisks.length;
    });
    return total;
  }, [nodes]);

  const activeRiskCategories = useMemo(() => {
    const cats = new Set<string>();
    nodes.forEach((n: any) => {
      if (n.productionRisks) {
        n.productionRisks.forEach((r: any) => {
          if (r.category) cats.add(r.category);
        });
      }
    });
    return cats;
  }, [nodes]);


  const getRecommendations = (nodeData: any) => {
    if (!nodeData) return { recs: [], estimatedHealth: 100 };
    const recs: string[] = [];
    let potentialGain = 0;

    if (nodeData.problems && nodeData.problems.length > 0) {
      const hasUnused = nodeData.problems.some((p: string) => p.includes('never used') || p.includes('unused'));
      if (hasUnused) {
        recs.push('Remove unused imports and variables');
      } else {
        recs.push('Resolve linting errors and warnings');
      }
      potentialGain += nodeData.problems.length * 10;
    }

    if (nodeData.functions && nodeData.functions > 5) {
      recs.push('Split this file into smaller components');
      potentialGain += (nodeData.functions - 5) * 0.5;
    }

    if (nodeData.apis && nodeData.apis.length > 0) {
      recs.push('Move API calls to service layer');
      potentialGain += nodeData.apis.length * 3 * 0.5;
    }

    if (nodeData.outgoingEdges && nodeData.outgoingEdges > 10) {
      recs.push('Reduce dependency count');
      potentialGain += (nodeData.outgoingEdges - 10) * 2 * 0.5;
    }

    if (nodeData.components && nodeData.components.length > 5) {
      recs.push('Add lazy loading');
      potentialGain += (nodeData.components.length - 5) * 1.5 * 0.5;
    }

    if (recs.length === 0 && nodeData.healthScore < 100) {
      recs.push('Refactor code for readability');
      potentialGain += 5;
    }

    if (recs.length === 0) {
      recs.push('Module is perfectly optimized');
    }

    // Cap estimated health at 100 or actual health + potential gain
    const estimatedHealth = Math.min(100, Math.round(nodeData.healthScore + potentialGain));

    return { recs, estimatedHealth };
  };

  const { recs, estimatedHealth } = selectedNodeData ? getRecommendations(selectedNodeData) : { recs: [], estimatedHealth: 100 };


  const dependencyTree = useMemo(() => {
    if (!selectedNodeId || !nodes.length) return null;

    const root = nodes.find(n => n.id === selectedNodeId);
    if (!root) return null;

    const layers: any[][] = [[root]];
    const visited = new Set<string>([selectedNodeId]);
    const allApis = new Set<string>(root.apisCalled || root.apis || []);
    const allDbTables = new Set<string>(root.dbTables || []);

    let currentLayer = [root];
    for (let depth = 1; depth <= 5; depth++) {
      const nextLayer: any[] = [];
      for (const node of currentLayer) {
        const outgoing = edges.filter((e: any) => e.source === node.id);
        for (const edge of outgoing) {
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            const targetNode = nodes.find((n: any) => n.id === edge.target);
            if (targetNode) {
              nextLayer.push(targetNode);
              const apis = targetNode.apisCalled || targetNode.apis || [];
              apis.forEach((a: string) => allApis.add(a));
              const db = targetNode.dbTables || [];
              db.forEach((t: string) => allDbTables.add(t));
            }
          }
        }
      }
      if (nextLayer.length === 0) break;
      layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    const parents: any[] = [];
    edges.filter((e: any) => e.target === selectedNodeId).forEach((e: any) => {
      const p = nodes.find((n: any) => n.id === e.source);
      if (p) parents.push(p);
    });

    return {
      parents,
      layers,
      apis: Array.from(allApis),
      dbTables: Array.from(allDbTables)
    };
  }, [selectedNodeId, nodes, edges]);

  const allProjectApis = useMemo(() => {
    const apis = new Set<string>();
    nodes.forEach(n => {
      const aList = n.apisCalled || n.apis || [];
      aList.forEach((a: string) => apis.add(a));
    });
    if (apis.size === 0) {
      apis.add('GET /products');
      apis.add('POST /api/users');
      apis.add('DELETE /api/orders/123');
    }
    return Array.from(apis);
  }, [nodes]);

  const groupedApis = useMemo(() => {
    const groups: { [key: string]: string[] } = {};
    const isParam = (str: string) => str.startsWith(':') || str.includes('_id') || str === 'id';

    allProjectApis.forEach(api => {
      // 1. Check if an exact node owns/defines this API
      const ownerNode = nodes.find(n => (n.apisCalled || n.apis || []).includes(api));
      let moduleName = '';
      if (ownerNode) {
        moduleName = getFileName(ownerNode.name || ownerNode.filePath)
          .replace(/\.(?:routes|controller|service|model|repo|js|ts|jsx|tsx|vue)$/i, '')
          .replace(/s$/, '')
          .toLowerCase();
      }
      // 2. If no owner or generic name, extract clean entity keyword from URL path
      if (!moduleName || moduleName.length <= 2) {
        const cleanPath = api.replace(/^(?:GET|POST|PUT|DELETE|PATCH|GETVENDOR|POSTVENDOR|FETCH)\s+/i, '').replace(/^\/api\/(?:v\d+\/)?/i, '').replace(/^\//, '');
        const pathSegments = cleanPath.split('/').filter(seg => seg && !isParam(seg));
        moduleName = pathSegments[0] ? pathSegments[0].replace(/s$/, '').toLowerCase() : 'core';
      }
      if (!moduleName || moduleName === 'api') moduleName = 'general';

      // Format clean Display Name (e.g. "assignment" -> "Assignment Module", "discount-line-items" -> "Discount-Line-Items Module")
      const formattedName = moduleName.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Module';
      if (!groups[formattedName]) groups[formattedName] = [];
      groups[formattedName].push(api);
    });

    // Sort group keys alphabetically
    const sortedGroups: { [key: string]: string[] } = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  }, [allProjectApis, nodes]);

  const apiFlowData = useMemo(() => {
    if (!selectedApi) return null;

    // 1. Find the exact node that owns or defines this API route (e.g., "assingment.routes.js")
    const ownerNode = nodes.find(n => (n.apis || n.apisCalled || []).includes(selectedApi));
    const ownerName = ownerNode ? getFileName(ownerNode.name || ownerNode.filePath).replace(/\.(?:routes|controller|service|model|repo|js|ts|jsx|tsx|vue)$/i, '').replace(/s$/, '') : '';

    // 2. Extract clean entity keyword from URL, ignoring parameter segments (like :session_id or class_id)
    const isParam = (str: string) => str.startsWith(':') || str.includes('_id') || str === 'id';
    const cleanPath = selectedApi.replace(/^(?:GET|POST|PUT|DELETE|PATCH|GETVENDOR|POSTVENDOR|FETCH)\s+/i, '').replace(/^\/api\/(?:v\d+\/)?/i, '').replace(/^\//, '');
    const pathSegments = cleanPath.split('/').filter(seg => seg && !isParam(seg));
    const urlKeyword = pathSegments[0] ? pathSegments[0].replace(/s$/, '').toLowerCase() : '';

    // If URL is all parameters (like "/:session_id/..."), use the owner file's keyword ("assingment")!
    const rawKeyword = (urlKeyword && urlKeyword.length > 2) ? urlKeyword : (ownerName || 'data');
    const keyword = rawKeyword.toLowerCase();
    const stem = keyword.length > 5 ? keyword.slice(0, 6) : keyword; // "assign" matches "assignment" and "assingment"

    const isGet = selectedApi.toUpperCase().startsWith('GET');
    const shortStem = keyword.length > 4 ? keyword.slice(0, 5) : keyword; // "assig" matches AssigmentList.jsx and AssignmentList.jsx

    // 3. Caller Component (UI Trigger) - MUST be a frontend component or client file! Do NOT show .routes.js here!
    const frontendCallers = nodes.filter(n =>
      (n.apisCalled || []).includes(selectedApi) &&
      (n.filePath.endsWith('.jsx') || n.filePath.endsWith('.tsx') || n.filePath.endsWith('.vue') || n.filePath.includes('component') || n.filePath.includes('view') || n.filePath.includes('client'))
    );
    const keywordCallers = nodes.filter(n =>
      (n.filePath && (n.filePath.endsWith('.jsx') || n.filePath.endsWith('.tsx') || n.filePath.endsWith('.vue'))) &&
      (n.name.toLowerCase().includes(keyword) || n.name.toLowerCase().includes(shortStem))
    );
    keywordCallers.sort((a, b) => {
      const aName = getFileName(a.name || a.filePath).toLowerCase();
      const bName = getFileName(b.name || b.filePath).toLowerCase();
      if (isGet) {
        // For GET requests, prioritize List, Table, View, Page over Modal, Form, Create, Edit
        const aList = aName.includes('list') || aName.includes('table') || aName.includes('view') || aName.includes('page') || aName.includes('grid');
        const bList = bName.includes('list') || bName.includes('table') || bName.includes('view') || bName.includes('page') || bName.includes('grid');
        if (aList && !bList) return -1;
        if (!aList && bList) return 1;
      } else {
        // For POST/PUT requests, prioritize Modal, Form, Create, Edit, Add
        const aModal = aName.includes('modal') || aName.includes('form') || aName.includes('create') || aName.includes('edit') || aName.includes('add');
        const bModal = bName.includes('modal') || bName.includes('form') || bName.includes('create') || bName.includes('edit') || bName.includes('add');
        if (aModal && !bModal) return -1;
        if (!aModal && bModal) return 1;
      }
      return aName.length - bName.length;
    });
    const caller = frontendCallers[0] || keywordCallers[0];

    // 4. Controller / Route Handler file
    const keywordControllers = nodes.filter(n =>
      (n.name.toLowerCase().includes(keyword) || n.name.toLowerCase().includes(stem)) &&
      (n.name.toLowerCase().includes('controller') || n.name.toLowerCase().includes('route') || n.name.toLowerCase().includes('handler') || n.name.toLowerCase().includes('api'))
    );
    const controller = ownerNode || keywordControllers[0];

    // 5. Middlewares (EXCLUDE frontend .jsx/.tsx/.vue, models, routes, controllers, services, reports!)
    const keywordMiddlewares = nodes.filter(n => {
      const lower = n.name.toLowerCase();
      const lowerPath = n.filePath.toLowerCase();
      if (lowerPath.endsWith('.jsx') || lowerPath.endsWith('.tsx') || lowerPath.endsWith('.vue') || lowerPath.endsWith('.css') || lowerPath.endsWith('.html')) return false;
      if (lower.includes('model') || lower.includes('route') || lower.includes('controller') || lower.includes('service') || lower.includes('template') || lower.includes('report') || lower.includes('test')) return false;
      return lowerPath.includes('/middleware/') || lowerPath.includes('\\middleware\\') || lower.includes('middleware') || lower.includes('auth') || lower.includes('fetchuser') || lower === 'fetchuser.js' || lower === 'auth.js';
    });
    keywordMiddlewares.sort((a, b) => {
      const aName = getFileName(a.name || a.filePath).toLowerCase();
      const bName = getFileName(b.name || b.filePath).toLowerCase();
      // ALWAYS prioritize fetchuser / fetch_user above generic auth files!
      const aFetch = aName.includes('fetchuser') || aName.includes('fetch_user');
      const bFetch = bName.includes('fetchuser') || bName.includes('fetch_user');
      if (aFetch && !bFetch) return -1;
      if (!aFetch && bFetch) return 1;
      const aAuth = aName.includes('auth');
      const bAuth = bName.includes('auth');
      if (aAuth && !bAuth) return -1;
      if (!aAuth && bAuth) return 1;
      return aName.length - bName.length;
    });
    const middlewareName = keywordMiddlewares.length > 0 ? getFileName(keywordMiddlewares[0].name || keywordMiddlewares[0].filePath) : 'fetchUser / authMiddleware';

    // 6. Service Layer (ONLY if exists for this keyword/stem! Do NOT fallback to random files or create fake files!)
    const keywordServices = nodes.filter(n =>
      (n.name.toLowerCase().includes(keyword) || n.name.toLowerCase().includes(stem)) &&
      (n.name.toLowerCase().includes('service') || n.name.toLowerCase().includes('logic') || n.name.toLowerCase().includes('manager'))
    );
    const service = keywordServices[0];

    // 7. Repository / Model Layer (EXCLUDE reports & UI! Only match keyword/stem!)
    const keywordRepos = nodes.filter(n =>
      !n.name.toLowerCase().includes('report') &&
      !n.filePath.endsWith('.jsx') && !n.filePath.endsWith('.tsx') && !n.filePath.endsWith('.css') &&
      (n.name.toLowerCase().includes(keyword) || n.name.toLowerCase().includes(stem)) &&
      (n.name.toLowerCase().includes('repo') || n.name.toLowerCase().includes('model') || n.name.toLowerCase().includes('dao') || n.name.toLowerCase().includes('query') || n.name.toLowerCase().includes('db'))
    );
    keywordRepos.sort((a, b) => {
      const aName = getFileName(a.name || a.filePath).toLowerCase();
      const bName = getFileName(b.name || b.filePath).toLowerCase();
      // 1. Never prefer compound names (with '_' or '-') over clean primary domain names
      const aCompound = aName.replace(/\.(?:model|repo|dao|query|db|js|ts|jsx|tsx)+$/i, '').includes('_') || aName.includes('-');
      const bCompound = bName.replace(/\.(?:model|repo|dao|query|db|js|ts|jsx|tsx)+$/i, '').includes('_') || bName.includes('-');
      if (!aCompound && bCompound) return -1;
      if (aCompound && !bCompound) return 1;
      // 2. Exact keyword / ownerName match
      const aExact = (ownerName && aName.includes(ownerName)) || aName.includes(keyword) || aName.startsWith(stem + '.');
      const bExact = (ownerName && bName.includes(ownerName)) || bName.includes(keyword) || bName.startsWith(stem + '.');
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return aName.length - bName.length;
    });
    const repo = keywordRepos[0];

    // 8. Server Entry Point (e.g. server.js / app.js router mount)
    const serverNodes = nodes.filter(n => {
      const lower = getFileName(n.name || n.filePath).toLowerCase();
      return lower === 'server.js' || lower === 'server.ts' || lower === 'app.js' || lower === 'app.ts' || lower === 'index.js' || lower === 'index.ts' || lower === 'main.ts';
    });
    serverNodes.sort((a, b) => {
      const aName = getFileName(a.name || a.filePath).toLowerCase();
      const bName = getFileName(b.name || b.filePath).toLowerCase();
      if (aName.includes('server') && !bName.includes('server')) return -1;
      if (!aName.includes('server') && bName.includes('server')) return 1;
      if (aName.includes('app') && !bName.includes('app')) return -1;
      if (!aName.includes('app') && bName.includes('app')) return 1;
      return 0;
    });
    const serverNode = serverNodes[0];
    const middlewareNode = keywordMiddlewares[0];

    // 9. Database Table (Match keyword/stem)
    const allTables = new Set<string>();
    nodes.forEach(n => (n.dbTables || []).forEach((t: string) => allTables.add(t)));
    const matchingTables = Array.from(allTables).filter(t => t.toLowerCase().includes(keyword) || t.toLowerCase().includes(stem));
    const dbTable = matchingTables[0] || `${keyword}s_table`;

    // Construct dynamic flow steps (Only include layers that actually exist or are directly invoked!)
    const steps: any[] = [];
    let stepCount = 1;

    // Step 1: Client UI Trigger
    if (caller) {
      steps.push({ step: stepCount++, stage: 'React Component', label: getFileName(caller.name || caller.filePath), sub: 'Client UI Trigger', type: 'file', filePath: caller.filePath, isOpen: caller.isOpen, icon: '⚛️' });
    } else {
      steps.push({ step: stepCount++, stage: 'Frontend Client', label: 'API Client / Postman Trigger', sub: 'Initiates HTTP Request', type: 'network', icon: '🌐' });
    }

    // Step 2: HTTP Request
    steps.push({ step: stepCount++, stage: 'Axios / fetch', label: 'HTTP Request', sub: selectedApi, type: 'network', icon: '🌐' });

    // Step 3: Server Entry Point (Router Mount)
    if (serverNode) {
      const routeFileName = controller ? getFileName(controller.name || controller.filePath) : 'route.js';
      steps.push({ step: stepCount++, stage: 'Server Entry Point', label: getFileName(serverNode.name || serverNode.filePath), sub: `Express Router Mount (require("./routes/${routeFileName}")(app))`, type: 'file', filePath: serverNode.filePath, isOpen: serverNode.isOpen, icon: '🖥️' });
    }

    // Step 4: Route Handler
    if (controller) {
      steps.push({ step: stepCount++, stage: 'Route Handler', label: getFileName(controller.name || controller.filePath), sub: `Express Router (${selectedApi})`, type: 'file', filePath: controller.filePath, isOpen: controller.isOpen, icon: '🔀' });
    } else {
      steps.push({ step: stepCount++, stage: 'Route Handler', label: selectedApi, sub: 'Express / Next API Router', type: 'route', icon: '🔀' });
    }

    // Step 5: Middleware Check
    steps.push({ step: stepCount++, stage: 'Middleware', label: middlewareName, sub: 'Request Verification & Tenant Init (e.g. fetchUser)', type: 'file', filePath: middlewareNode ? middlewareNode.filePath : undefined, isOpen: middlewareNode ? middlewareNode.isOpen : undefined, icon: '🛡️' });

    // Step 6: Service Layer (Only shown if a dedicated Service file exists in this project!)
    if (service) {
      steps.push({ step: stepCount++, stage: 'Service Layer', label: getFileName(service.name || service.filePath), sub: 'Core Business Logic', type: 'file', filePath: service.filePath, isOpen: service.isOpen, icon: '🧠' });
    }

    // Step 7: Model / Repository Layer
    if (repo) {
      steps.push({ step: stepCount++, stage: 'Model / ORM Layer', label: getFileName(repo.name || repo.filePath), sub: 'Data Access & ORM Queries (e.g. Assingment.assignmentsByDates)', type: 'file', filePath: repo.filePath, isOpen: repo.isOpen, icon: '🗄️' });
    } else if (controller) {
      steps.push({ step: stepCount++, stage: 'Model / ORM Layer', label: getFileName(controller.name || controller.filePath), sub: 'Direct Model Invocation & SQL Query', type: 'file', filePath: controller.filePath, isOpen: controller.isOpen, icon: '🗄️' });
    }

    // Step 8: Database Table
    steps.push({ step: stepCount++, stage: 'Database Table', label: `🛢️ ${dbTable}`, sub: 'SQL / NoSQL Storage Execution', type: 'db', icon: '💾' });

    // Step 9: Response & Render
    steps.push({ step: stepCount++, stage: 'HTTP Response', label: '200 OK / 404 Not Found (JSON)', sub: 'Data Serialization & Response', type: 'response', icon: '📦' });
    steps.push({ step: stepCount++, stage: 'React UI Update', label: 'State Re-render', sub: 'DOM Mutation & UI Refresh', type: 'ui', icon: '✨' });

    return steps;
  }, [selectedApi, nodes]);

  const impactAnalysis = useMemo(() => {
    if (!selectedNodeId || !nodes || !edges) return null;

    const affectedFiles = new Set<string>();
    const affectedApis = new Set<string>();
    const affectedDb = new Set<string>();
    const affectedComponents = new Set<string>();

    const visited = new Set<string>();
    const queue = [selectedNodeId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      if (curr !== selectedNodeId) {
        affectedFiles.add(curr);
      }

      const currNode = nodes.find((n: any) => n.id === curr);
      if (currNode) {
        const apis = currNode.apisCalled || currNode.apis || [];
        apis.forEach((a: string) => affectedApis.add(a));
        const dbList = currNode.dbTables || [];
        dbList.forEach((db: string) => affectedDb.add(db));
        const comps = currNode.componentsUsed || currNode.components || [];
        comps.forEach((c: string) => affectedComponents.add(c));
      }

      const dependents = edges.filter((e: any) => e.target === curr).map((e: any) => e.source);
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }

    const directFilesSet = new Set<string>();
    edges.filter((e: any) => e.target === selectedNodeId).forEach((e: any) => directFilesSet.add(e.source));

    let riskLevel = 'LOW';
    const totalAffected = affectedFiles.size + affectedApis.size + affectedDb.size + affectedComponents.size;
    if (totalAffected > 20) riskLevel = 'HIGH';
    else if (totalAffected > 5) riskLevel = 'MEDIUM';

    return {
      files: affectedFiles.size,
      fileList: Array.from(affectedFiles),
      directFilesSet,
      apis: affectedApis.size,
      apiList: Array.from(affectedApis),
      dbTables: affectedDb.size,
      dbList: Array.from(affectedDb),
      components: affectedComponents.size,
      componentList: Array.from(affectedComponents),
      riskLevel
    };
  }, [selectedNodeId, nodes, edges]);

  return (
    <div className="dashboard-container">


      <header className="hero-compact-bar">
        <div className="hero-compact-top-row">
          <div className="hero-compact-left">
            <div className="hero-logo-box" title="StrataMetriq Monogram Logo">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoSGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <path
                  d="M31.5 13.5C31.5 10.5 28.5 8 24 8C19.5 8 15.5 11 15.5 15.5C15.5 20.5 20 22.5 25.5 24C31 25.5 33.5 28.5 33.5 33C33.5 38 29.5 40.5 24 40.5C18.5 40.5 15 37.5 14.5 34.5"
                  stroke="url(#logoSGrad)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <path
                  d="M18 19C21 20 26 21.5 29 23M20 26.5C23.5 27.8 28 29.5 30 31.5"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </div>
            <div className="hero-compact-text">
              <div className="hero-compact-title-row">
                <span className="hero-compact-title">StrataMetriq</span>
                <span className="hero-compact-version">v1.4.4</span>
              </div>
              <div className="hero-compact-subtitle">
                Architecture Intelligence & Pre-Deployment Safety in VS Code
              </div>
            </div>
          </div>

          <div className="hero-compact-right">
            <span className="hero-live-pill">Live</span>
            <button
              className="hero-analyze-btn"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <span className="spinner-inline">⚙️</span> Analyzing...
                </>
              ) : (
                <>
                  <span>⚡</span> Analyze
                </>
              )}
            </button>
            <button
              className="hero-export-icon-btn"
              onClick={handleExportExecutiveReport}
              title="Export Audit JSON"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="hero-status-chips-row">
          <span className="status-chip">
            <span className="chip-icon">🔒</span> Offline AST
          </span>
          <span className="status-chip">
            <span className="chip-icon">🚫</span> 0% cloud exfil
          </span>
          <span className="status-chip">
            <span className="chip-icon">🔄</span> Real-time sync
          </span>
        </div>
      </header>

      <div className="global-filter-toolbar">
        <div className="search-input-pill-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#71717a', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input-pill-field"
            placeholder="Search modules, API routes, or DB tables..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
          />
          {globalSearchQuery && (
            <button onClick={() => setGlobalSearchQuery('')} className="search-clear-btn" title="Clear search">✕</button>
          )}
        </div>

        <div className="quick-filter-pills-row">
          {[
            { id: 'all', label: `All ${nodes.length}` },
            { id: 'highRisks', label: `⚠️ ${nodes.filter((n: any) => (n.productionRisks || []).some((r: any) => r.severity === 'HIGH')).length}` },
            { id: 'openFiles', label: `📂 ${nodes.filter((n: any) => isFileOpen(n.filePath)).length}` },
            { id: 'circular', label: `🔄 ${cycles.length}` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setQuickFilter(f.id)}
              className={`quick-filter-pill-btn ${quickFilter === f.id ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass-card health-card">
          <h3>🩺 Project Health Score</h3>
          <div className="score-ring" style={{ '--score': `${score}%` } as any}>
            <span className="score-text">{scanning ? '...' : `${score}%`}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              background: score >= 80 ? 'rgba(52, 211, 153, 0.15)' : score >= 60 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              color: score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171',
              border: `1px solid ${score >= 80 ? 'rgba(52, 211, 153, 0.4)' : score >= 60 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`
            }}>
              {score >= 85 ? '✨ Excellent Architectural Health' : score >= 70 ? '🟢 Good Structural Health' : '⚠️ Action Required'}
            </span>
          </div>
        </div>

        <div className="metric-card glass-card complexity-card">
          <h3>🧠 Complexity Index</h3>
          <p className="big-stat" style={{ color: '#fbbf24' }}>{scanning ? '...' : complexity}</p>
          <p className="stat-label">Average dependencies per file</p>
          <div style={{ marginTop: '1.4rem' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '16px',
              background: parseFloat(complexity) < 6 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: parseFloat(complexity) < 6 ? '#38bdf8' : '#fbbf24'
            }}>
              {parseFloat(complexity) < 6 ? '🛡️ Low Coupling Density' : '⚡ Moderate Coupling Density'}
            </span>
          </div>
        </div>

        <div className="metric-card glass-card graph-card">
          <h3>📊 Graph Overview</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p className="big-stat" style={{ fontSize: '2.4rem' }}>{scanning ? '...' : totalModulesCount}</p>
              <p className="stat-label">Files mapped {totalPackagesCount > 0 ? `(${totalPackagesCount} pkgs)` : ''}</p>
            </div>
            <div>
              <p className="big-stat" style={{ fontSize: '2.4rem', color: '#c084fc' }}>{scanning ? '...' : edges.length}</p>
              <p className="stat-label">Imports traced</p>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
            🌐 Cross-file references & API layers indexed
          </div>
        </div>
      </div>

      <div className="pre-deploy-audit-section glass-card" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderLeft: totalProductionRisks > 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', margin: 0 }}>
              🛡️ Pre-Deployment Production Audit
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Automatic safety scan: prevent debug code, secrets, temporary code, or unfinished work from reaching production.
            </p>
          </div>
          <div>
            {totalProductionRisks === 0 ? (
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ✅ Ready for Production (0 Risks)
              </span>
            ) : (
              <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ⛔ DO NOT DEPLOY: {totalProductionRisks} Production Risks Found
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          {[
            { id: 'All', label: `All Risks (${totalProductionRisks})`, alwaysShow: true },
            { id: 'Hardcoded credentials', label: '🔑 Secrets' },
            { id: 'Debug code', label: '🐞 Debug Code' },
            { id: 'Temporary code', label: '🚧 Temp Code' },
            { id: 'Test data', label: '🧪 Test Data' },
            { id: 'TODO/FIXME comments', label: '📌 TODO/FIXME' },
            { id: 'Large commented code blocks', label: '💬 Commented Code' },
            { id: 'Dead code', label: '⚰️ Dead Code' },
            { id: 'Empty catch blocks', label: '🕳️ Empty Catch' },
            { id: 'Unused development imports', label: '📦 Dev Imports' },
            { id: 'Memory Leaks / SPA Timers', label: '🐢 Memory Leaks' },
            { id: 'Insecure Cryptography', label: '🔐 Insecure Crypto' },
            { id: 'SQL / NoSQL Injection', label: '💉 SQL Injection' },
            { id: 'XSS DOM Risks', label: '🌐 XSS Risks' }
          ]
            .filter(tab => tab.alwaysShow || activeRiskCategories.has(tab.id))
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedRiskCategory(tab.id)}
                style={{
                  background: selectedRiskCategory === tab.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedRiskCategory === tab.id ? '#38bdf8' : '#94a3b8',
                  border: selectedRiskCategory === tab.id ? '1px solid #38bdf8' : '1px solid transparent',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: selectedRiskCategory === tab.id ? 'bold' : 'normal'
                }}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {productionRiskFiles.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 0', color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>
            ✨ Perfect! No {selectedRiskCategory === 'All' ? 'production risks' : selectedRiskCategory.toLowerCase()} detected in your codebase.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {productionRiskFiles.map((file: any) => (
              <div
                key={file.id}
                onClick={() => handleSelectNode(file.id)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                className="clickable-card"
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'ltr' }}>
                      {getFileName(file.filePath)} {renderOpenBadge(file.isOpen)}
                    </div>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {file.filteredRisks.length} {file.filteredRisks.length === 1 ? 'risk' : 'risks'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getFolderPath(file.filePath)}
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '8px', borderRadius: '6px', marginTop: '6px' }}>
                  {file.filteredRisks.slice(0, 3).map((risk: any, rIdx: number) => (
                    <div key={rIdx} onClick={(e) => { e.stopPropagation(); handleOpenItemWithLine(file.filePath, undefined, risk.line || 1); }} style={{ fontSize: '0.78rem', color: '#e2e8f0', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} title={`Click to open ${file.filePath} at line ${risk.line || 1}`}>
                      <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold', background: risk.severity === 'HIGH' ? 'rgba(239,68,68,0.3)' : risk.severity === 'MEDIUM' ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)', color: risk.severity === 'HIGH' ? '#fca5a5' : risk.severity === 'MEDIUM' ? '#fcd34d' : '#7dd3fc' }}>
                        {risk.severity}
                      </span>
                      <span
                        onClick={(e) => { e.stopPropagation(); handleOpenItemWithLine(file.filePath, undefined, risk.line || 1); }}
                        style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.72rem', textDecoration: 'none', cursor: 'pointer', padding: '2px 7px', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        title={`Click to jump directly to Line ${risk.line || 1} in editor`}
                      >
                        ↗ Line {risk.line || 1}
                      </span>
                      <span>{risk.category}: {risk.message}</span>
                    </div>
                  ))}
                  {file.filteredRisks.length > 3 && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                      ...+{file.filteredRisks.length - 3} more risks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lists-grid">
        <div className="complex-files-list glass-card">
          <h3>Most Complex Modules</h3>
          {mostComplexFiles.length === 0 && !scanning ? (
            <div className="empty-state">Run analysis to view complex modules.</div>
          ) : scanning ? (
            <div className="loading-state">Analyzing...</div>
          ) : (
            <ul className="fragile-list">
              {mostComplexFiles.map((file: any) => (
                <li key={file.id}>
                  <div
                    className="file-name clickable"
                    onClick={() => handleSelectNode(file.id)}
                    title={file.filePath}
                    style={{ direction: 'ltr' }}
                  >
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFileName(file.filePath)} {renderOpenBadge(file.isOpen)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFolderPath(file.filePath)}</div>
                  </div>
                  <div className="file-edges">{file.edgeCount} connections</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="problem-files-list glass-card">
          <h3>Files with Problems</h3>
          {nodes.length === 0 && !scanning ? (
            <div className="empty-state">Run analysis to scan diagnostics.</div>
          ) : scanning ? (
            <div className="loading-state">Scanning workspace problems...</div>
          ) : problematicFiles.length === 0 ? (
            <div className="empty-state">Zero problems! Perfect health.</div>
          ) : (
            <ul className="problem-list fragile-list">
              {problematicFiles.map((file: any) => (
                <li key={file.id} className="problem-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                    <div
                      className="file-name clickable"
                      onClick={() => handleSelectNode(file.id)}
                      title={file.filePath}
                      style={{ direction: 'ltr' }}
                    >
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFileName(file.filePath)} {renderOpenBadge(file.isOpen)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFolderPath(file.filePath)}</div>
                    </div>
                    <div className="file-edges problem-badge">{file.problemCount} problems</div>
                  </div>
                  {file.problems && file.problems.length > 0 && (
                    <div className="problem-messages" style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                      {file.problems.slice(0, 2).map((msg: string, idx: number) => (
                        <div key={idx} onClick={(e) => { e.stopPropagation(); handleOpenItemWithLine(file.filePath, msg); }} style={{ marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', transition: 'all 0.2s' }} title={`Click to open ${file.filePath} at this line`}>- {msg}</div>
                      ))}
                      {file.problems.length > 2 && <div>...and {file.problems.length - 2} more</div>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="duplicate-logic-list glass-card">
          <h3>Duplicate Logic</h3>
          {duplicates.length === 0 && !scanning ? (
            <div className="empty-state">No duplicates found. Great job!</div>
          ) : scanning ? (
            <div className="loading-state">Analyzing codebase...</div>
          ) : (
            <ul className="fragile-list">
              {duplicates.map((dup: any, idx: number) => (
                <li key={idx} style={{ flexDirection: 'column', alignItems: 'flex-start', borderLeftColor: '#8b5cf6', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="file-name clickable" onClick={() => handleOpenItemWithLine(dup.fileA, undefined, dup.lineA || 1)} title={dup.fileA} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {getFileName(dup.fileA)}
                        </span>
                        {dup.lineA && (
                          <span onClick={(e) => { e.stopPropagation(); handleOpenItemWithLine(dup.fileA, undefined, dup.lineA); }} style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: '1px 6px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '3px' }} title={`Click to jump directly to Line ${dup.lineA} in editor`}>
                            [Line {dup.lineA}]
                          </span>
                        )}
                        {renderOpenBadge(isFileOpen(dup.fileA))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="file-name clickable" onClick={() => handleOpenItemWithLine(dup.fileB, undefined, dup.lineB || 1)} title={dup.fileB} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {getFileName(dup.fileB)}
                        </span>
                        {dup.lineB && (
                          <span onClick={(e) => { e.stopPropagation(); handleOpenItemWithLine(dup.fileB, undefined, dup.lineB); }} style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: '1px 6px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '3px' }} title={`Click to jump directly to Line ${dup.lineB} in editor`}>
                            [Line {dup.lineB}]
                          </span>
                        )}
                        {renderOpenBadge(isFileOpen(dup.fileB))}
                      </div>
                    </div>
                    <div className="file-edges" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span>{dup.funcSimilarity !== undefined ? `${dup.funcSimilarity}% Logic Match` : `${dup.similarity}% match`}</span>
                      {dup.funcSimilarity !== undefined && dup.similarity !== undefined && dup.similarity !== dup.funcSimilarity && (
                        <span style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 'normal' }}>({dup.similarity}% total file overlap)</span>
                      )}
                    </div>
                  </div>
                  {dup.fragment && (
                    <div style={{ fontSize: '0.78rem', color: '#f3e8ff', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.35)', padding: '6px 10px', borderRadius: '4px', margin: '6px 0', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#c4b5fd', fontWeight: 'bold' }}>⚡</span>
                      <span>{dup.fragment}</span>
                    </div>
                  )}
                  {(dup.codeSnippetA || dup.codeSnippetB) && (
                    <div style={{
                      margin: '6px 0',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(168, 85, 247, 0.45)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      width: '100%',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(139, 92, 246, 0.22)',
                        padding: '5px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#e9d5ff',
                        borderBottom: '1px solid rgba(139, 92, 246, 0.3)'
                      }}>
                        <span>🔍 Highlighted Code Snippet (Lines {dup.lineA || 1}–{(dup.lineA || 1) + 5})</span>
                        <span style={{
                          background: 'rgba(168, 85, 247, 0.25)',
                          color: '#f3e8ff',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.67rem'
                        }}>
                          Duplicate Logic Block
                        </span>
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: '8px 12px',
                        fontSize: '0.74rem',
                        fontFamily: "'Fira Code', 'Consolas', monospace",
                        color: '#38bdf8',
                        overflowX: 'auto',
                        lineHeight: '1.45',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {dup.codeSnippetA || dup.codeSnippetB}
                      </pre>
                    </div>
                  )}
                  <div className="problem-messages" style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✔ Suggest creating a shared helper for duplicate logic
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="circular-deps-list glass-card">
          <h3>Circular Dependencies</h3>
          {cycles.length === 0 && !scanning ? (
            <div className="empty-state">Zero circular dependencies! Pure tree.</div>
          ) : scanning ? (
            <div className="loading-state">Checking import cycles...</div>
          ) : (
            <ul className="fragile-list">
              {cycles.map((cyc: string[], idx: number) => (
                <li key={idx} style={{ flexDirection: 'column', alignItems: 'flex-start', borderLeftColor: '#f97316' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {cyc.map((filePath: string, cIdx: number) => (
                        <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#f97316', fontWeight: 'bold' }}>{cIdx === 0 ? '▶' : '↳'}</span>
                          <span className="file-name clickable" onClick={() => handleOpenFile(filePath)} title={filePath} style={{ fontWeight: 700 }}>
                            {getFileName(filePath)} {renderOpenBadge(isFileOpen(filePath))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="file-edges" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#fdba74' }}>
                      Cycle Loop
                    </div>
                  </div>
                  <div className="problem-messages" style={{ fontSize: '0.8rem', color: '#f97316', marginTop: '4px' }}>
                    ⚠ Tight coupling detected. Suggest extracting shared interface or dependency injection.
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="unused-deps-list glass-card" style={{ gridColumn: '1 / -1', width: '100%', marginTop: '0.5rem', boxSizing: 'border-box' }}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span>Unused / Orphaned Dependencies <span style={{ fontSize: '0.8rem', color: '#fda4af', fontWeight: 'normal' }}>({unusedPackages.length} unused)</span></span>
            <span style={{ fontSize: '0.75rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.15)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>Total Unused: {unusedPackages.length}</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.8rem' }}>Packages installed or declared in dependency manifests (package.json, requirements.txt, etc.) that are never imported or utilized in code:</p>
          {unusedPackages.length === 0 && !scanning ? (
            <div className="empty-state" style={{ color: '#34d399' }}>✔ Zero orphaned dependencies detected! All installed packages are actively utilized.</div>
          ) : scanning ? (
            <div className="loading-state">Scanning package manifests and imports...</div>
          ) : (
            <div className="custom-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(244, 63, 94, 0.15)', borderBottom: '1px solid rgba(244, 63, 94, 0.3)', color: '#fecdd3', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Package Name</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Declared In</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {unusedPackages.map((pkg: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: idx === unusedPackages.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)', background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent', transition: 'background 0.2s' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#fecdd3' }}>
                        📦 {pkg.name}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>
                        <span className="file-name clickable" onClick={() => handleOpenFile(pkg.file)} style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', marginRight: '6px' }}>{getFileName(pkg.file)}</span>
                        {renderOpenBadge(isFileOpen(pkg.file))}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.15)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>{pkg.type || 'dep'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="api-flow-list glass-card" style={{ gridColumn: '1 / -1', width: '100%', marginTop: '0.5rem', boxSizing: 'border-box' }}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span>API Flow Visualizer (Module-Wise)</span>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Interactive & Full Screen</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.8rem' }}>APIs grouped by module/model. Use search to filter by module name or endpoint:</p>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="🔍 Search module or API (e.g., assignment, discount, upload)..."
              value={apiSearchQuery}
              onChange={(e) => setApiSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                background: 'rgba(15, 23, 42, 0.7)',
                color: '#e0f2fe',
                fontSize: '0.85rem',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            />
          </div>

          <div className="module-groups-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '650px', overflowY: 'auto', paddingRight: '6px' }}>
            {Object.entries(groupedApis).filter(([moduleName, apis]) => {
              if (!apiSearchQuery.trim()) return true;
              const q = apiSearchQuery.toLowerCase();
              return moduleName.toLowerCase().includes(q) || apis.some(a => a.toLowerCase().includes(q));
            }).map(([moduleName, apis], modIdx) => {
              const q = apiSearchQuery.toLowerCase();
              const filteredApis = (!apiSearchQuery.trim() || moduleName.toLowerCase().includes(q)) ? apis : apis.filter(a => a.toLowerCase().includes(q));
              if (filteredApis.length === 0) return null;
              return (
                <div key={modIdx} className="module-group-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', overflow: 'hidden', flexShrink: 0 }}>
                  <div className="module-header" style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '0.7rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                      📁 {moduleName.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', color: '#94a3b8', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                      {filteredApis.length} {filteredApis.length === 1 ? 'API' : 'APIs'}
                    </span>
                  </div>
                  <ul className="fragile-list" style={{ margin: 0, padding: '0.5rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'none', overflowY: 'visible' }}>
                    {filteredApis.map((api: string, idx: number) => (
                      <li key={idx} onClick={() => handleSelectApi(api)} style={{ cursor: 'pointer', borderLeft: '3px solid #38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', transition: 'all 0.2s ease', flexShrink: 0 }}>
                        <span style={{ fontWeight: 600, color: '#e0f2fe', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>⚡ {api}</span>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '12px' }}>Trace Flow →</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedApi && apiFlowData && (
        <div className="side-panel api-flow-panel" style={{ width: '480px', borderLeft: '2px solid #38bdf8' }}>
          <div className="panel-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '1.2rem' }}>
              ⚡ {selectedApi}
            </h2>
            <button className="close-btn" onClick={() => handleSelectApi(null)}>×</button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem', background: 'rgba(56,189,248,0.1)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
            End-to-End Request & Lifecycle Flow across workspace architecture. Click any file node to open in editor.
          </div>

          <div className="api-flow-vertical-container">
            {apiFlowData.map((step: any, idx: number) => (
              <div key={idx} className="api-flow-step-wrapper">
                {idx > 0 && <div className="api-flow-down-arrow">↓</div>}
                <div
                  className={`api-flow-step-card ${step.type}`}
                  onClick={() => step.filePath ? handleOpenFile(step.filePath) : null}
                  style={{ cursor: step.filePath ? 'pointer' : 'default' }}
                >
                  <div className="api-flow-step-icon">{step.icon}</div>
                  <div className="api-flow-step-info">
                    <div className="api-flow-step-stage">{step.stage}</div>
                    <div className="api-flow-step-label">
                      {step.label} {step.isOpen !== undefined && renderOpenBadge(step.isOpen)}
                    </div>
                    {step.sub && <div className="api-flow-step-sub">{step.sub}</div>}
                  </div>
                  {step.filePath && <div className="api-flow-open-hint">Open →</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedNodeData && (
        <div className="side-panel">
          <div className="panel-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{getFileName(selectedNodeData.name)} {renderOpenBadge(selectedNodeData.isOpen)}</h2>
            <button className="close-btn" onClick={() => handleSelectNode(null)}>×</button>
          </div>


          <div className="actions" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
            <button className="primary-btn" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }} onClick={() => handleOpenFile(selectedNodeData.filePath)}>Open in Editor</button>
          </div>

          <div className="panel-section">
            <div className="metric-row">
              <span className="metric-label">Health Score</span>
              <span className="metric-value">{selectedNodeData.healthScore}%</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Risk Level</span>
              <span className={`badge ${selectedNodeData.riskLevel}`}>{selectedNodeData.riskLevel}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Complexity Score</span>
              <span className="metric-value">{selectedNodeData.complexityScore}</span>
            </div>
          </div>

          <div className="panel-section">
            <h3>Architecture</h3>
            <div className="metric-row">
              <span className="metric-label">Imports</span>
              <span className="metric-value">{selectedNodeData.outgoingEdges}</span>
            </div>
          </div>

          {selectedNodeData.problems && selectedNodeData.problems.length > 0 && (
            <div className="panel-section">
              <h3 style={{ color: '#fca5a5' }}>Diagnostics & Errors</h3>
              <ul className="item-list" style={{ marginTop: '0.8rem' }}>
                {selectedNodeData.problems.map((prob: string, idx: number) => (
                  <li key={idx} onClick={() => handleOpenItemWithLine(selectedNodeData.filePath, prob)} style={{ color: '#fca5a5', borderLeft: '3px solid #ef4444', cursor: 'pointer', transition: 'all 0.2s', padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginBottom: '4px' }} title="Click to jump to this line in editor">{prob}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedNodeData.productionRisks && selectedNodeData.productionRisks.length > 0 && (
            <div className="panel-section" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛡️ Pre-Deployment Risks ({selectedNodeData.productionRisks.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#fca5a5', margin: '4px 0 8px 0' }}>Fix these before deploying to production:</p>
              <ul className="item-list" style={{ marginTop: '0.5rem', listStyle: 'none', padding: 0 }}>
                {selectedNodeData.productionRisks.map((risk: any, idx: number) => (
                  <li key={idx} onClick={() => handleOpenItemWithLine(selectedNodeData.filePath, undefined, risk.line || 1)} style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', marginBottom: '6px', borderLeft: risk.severity === 'HIGH' ? '3px solid #ef4444' : risk.severity === 'MEDIUM' ? '3px solid #f59e0b' : '3px solid #38bdf8', cursor: 'pointer', transition: 'all 0.2s' }} title="Click to jump to this line in editor">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold', background: risk.severity === 'HIGH' ? 'rgba(239,68,68,0.3)' : risk.severity === 'MEDIUM' ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)', color: risk.severity === 'HIGH' ? '#fca5a5' : risk.severity === 'MEDIUM' ? '#fcd34d' : '#7dd3fc' }}>
                        {risk.severity}
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.85rem' }}>{risk.category}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <span onClick={(e) => { e.stopPropagation(); handleOpenItemWithLine(selectedNodeData.filePath, undefined, risk.line || 1); }} style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold', marginRight: '6px', textDecoration: 'underline', cursor: 'pointer', padding: '1px 5px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '3px' }} title={`Click to jump directly to Line ${risk.line || 1} in editor`}>[Line {risk.line || 1}]</span>
                      {risk.message}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dependencyTree && (
            <div className="panel-section dependency-explorer-container">
              <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Dependency Explorer</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#8b5cf6', background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.3)' }}>Full Tree</span>
              </h3>
              <div className="dependency-tree-view">
                {dependencyTree.parents.length > 0 && (
                  <div className="dep-tree-section">
                    <div className="dep-tree-level-label">Imported By ({dependencyTree.parents.length})</div>
                    <div className="dep-tree-nodes-row">
                      {dependencyTree.parents.slice(0, 6).map((p: any, idx: number) => (
                        <div key={idx} className="dep-tree-node upstream" onClick={() => handleOpenFile(p.filePath)} title={p.filePath}>
                          <div className="dep-tree-node-title">{getFileName(p.filePath)} {renderOpenBadge(p.isOpen)}</div>
                          <div className="dep-tree-node-sub">{getFolderPath(p.filePath)}</div>
                        </div>
                      ))}
                      {dependencyTree.parents.length > 6 && <div className="dep-tree-node upstream"><div className="dep-tree-node-title">+{dependencyTree.parents.length - 6} more</div></div>}
                    </div>
                    <div className="dep-tree-connector">│<br />▼</div>
                  </div>
                )}

                {dependencyTree.layers.map((layer: any[], layerIdx: number) => (
                  <div key={layerIdx} className="dep-tree-section">
                    {layerIdx > 0 && <div className="dep-tree-connector">│<br />▼</div>}
                    <div className="dep-tree-level-label">
                      {layerIdx === 0 ? 'Selected Module (Root)' : `Layer ${layerIdx} (${layerIdx === 1 ? 'Direct Imports' : layerIdx === 2 ? 'Secondary Dependencies' : 'Deep Dependencies'})`}
                    </div>
                    <div className="dep-tree-nodes-row">
                      {layer.map((node: any) => (
                        <div
                          key={node.id}
                          className={`dep-tree-node ${layerIdx === 0 ? 'root-node' : ''}`}
                          onClick={() => handleOpenFile(node.filePath)}
                          title={node.filePath}
                        >
                          <div className="dep-tree-node-title">{getFileName(node.filePath)} {renderOpenBadge(node.isOpen)}</div>
                          {layerIdx > 0 && <div className="dep-tree-node-sub">{getFolderPath(node.filePath)}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {dependencyTree.apis.length > 0 && (
                  <div className="dep-tree-section">
                    <div className="dep-tree-connector">│<br />▼</div>
                    <div className="dep-tree-level-label">API Endpoints</div>
                    <div className="dep-tree-nodes-row">
                      {dependencyTree.apis.map((api: string, idx: number) => (
                        <div key={idx} className="dep-tree-node api-node" onClick={() => handleSelectApi(api)} style={{ cursor: 'pointer' }} title="Click to Trace API Flow">⚡ {api}</div>
                      ))}
                    </div>
                  </div>
                )}

                {dependencyTree.dbTables.length > 0 && (
                  <div className="dep-tree-section">
                    <div className="dep-tree-connector">│<br />▼</div>
                    <div className="dep-tree-level-label">Database Tables</div>
                    <div className="dep-tree-nodes-row">
                      {dependencyTree.dbTables.map((table: string, idx: number) => (
                        <div key={idx} className="dep-tree-node db-node">🛢️ {table}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedNodeData.components.length > 0 && (
            <div className="panel-section">
              <div className="metric-row" style={{ marginBottom: '0.3rem' }}>
                <span className="metric-label" style={{ color: '#fff' }}>Components Used ({selectedNodeData.components.length})</span>
              </div>
              <ul className="item-list component-list">
                {selectedNodeData.components.map((comp: string, idx: number) => <li key={idx}>&lt;{comp} /&gt;</li>)}
              </ul>
            </div>
          )}

          {impactAnalysis && (
            <div className="panel-section risk-impact-section">
              <h3 style={{ color: '#f59e0b', marginBottom: '0.2rem' }}>Risk Impact Analysis</h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.8rem' }}>If I change this file, what else is affected and why?</p>

              <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.83rem', marginBottom: '8px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', paddingBottom: '6px' }}>
                  <span>💡 Why & How Are These Affected?</span>
                </div>

                {impactAnalysis.files > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.77rem', fontWeight: 700, color: '#38bdf8' }}>
                      🔗 Dependency Ripple ({impactAnalysis.files} files: {impactAnalysis.directFilesSet?.size || 0} direct, {Math.max(0, impactAnalysis.files - (impactAnalysis.directFilesSet?.size || 0))} transitive)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginTop: '2px' }}>
                      These files directly import or depend transitively on <code style={{ color: '#fbbf24' }}>{getFileName(selectedNodeData?.filePath || selectedNodeData?.name || selectedNodeId || '')}</code>. Modifying existing exported functions, signatures, or shared state here can trigger compilation errors or runtime failures in downstream importers.
                    </div>
                  </div>
                )}

                {impactAnalysis.apis > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.77rem', fontWeight: 700, color: '#c084fc' }}>
                      ⚡ API Contract Risk ({impactAnalysis.apis} endpoints)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginTop: '2px' }}>
                      This file participates in the server request lifecycle of these API endpoints. Modifying payload schemas, query parameters, or response contracts directly affects frontend or external API consumers.
                    </div>
                  </div>
                )}

                {impactAnalysis.components > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.77rem', fontWeight: 700, color: '#34d399' }}>
                      🎨 UI Component Tree ({impactAnalysis.components} views)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4', marginTop: '2px' }}>
                      These React/UI components render or invoke logic from this module. Changing hooks or state properties will trigger re-renders or behavioral shifts.
                    </div>
                  </div>
                )}

                <div style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px dashed rgba(56, 189, 248, 0.4)',
                  borderRadius: '6px',
                  padding: '7px 9px',
                  marginTop: '8px',
                  fontSize: '0.72rem',
                  color: '#e2e8f0',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#38bdf8' }}>➕ Adding vs. Modifying Code:</strong>
                  <br />
                  • <strong>Adding new endpoints or exports:</strong> <span style={{ color: '#34d399', fontWeight: 600 }}>Non-breaking (0 ripple risk).</span> Existing consumers remain unaffected until they explicitly import the new code.
                  <br />
                  • <strong>Modifying existing exports:</strong> <span style={{ color: '#f87171', fontWeight: 600 }}>High ripple risk.</span> Propagates across all dependent files below.
                </div>
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <div className="metric-row" style={{ marginBottom: '0.3rem' }}>
                  <span className="metric-label" style={{ fontWeight: 'bold', color: '#e2e8f0' }}>Affected Files</span>
                  <span className="metric-value" style={{ color: impactAnalysis.files > 0 ? '#f59e0b' : '#94a3b8' }}>{impactAnalysis.files}</span>
                </div>
                {impactAnalysis.fileList && impactAnalysis.fileList.length > 0 && (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', borderLeft: '2px solid #f59e0b' }}>
                    {impactAnalysis.fileList.map((file: string, idx: number) => {
                      const isDirect = impactAnalysis.directFilesSet && impactAnalysis.directFilesSet.has(file);
                      return (
                        <div key={idx} onClick={() => handleOpenFile(file)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#38bdf8', cursor: 'pointer', marginBottom: '5px' }} title={`Click to open ${file}`}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📄 {getFileName(file)} <span style={{ fontSize: '0.68rem', color: '#64748b' }}>({getFolderPath(file)})</span>
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: isDirect ? 'rgba(249, 115, 22, 0.2)' : 'rgba(100, 116, 139, 0.25)',
                            color: isDirect ? '#fb923c' : '#94a3b8',
                            flexShrink: 0,
                            marginLeft: '6px'
                          }}>
                            {isDirect ? 'Direct Importer' : 'Transitive'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <div className="metric-row" style={{ marginBottom: '0.3rem' }}>
                  <span className="metric-label" style={{ fontWeight: 'bold', color: '#e2e8f0' }}>Affected APIs</span>
                  <span className="metric-value" style={{ color: impactAnalysis.apis > 0 ? '#f59e0b' : '#94a3b8' }}>{impactAnalysis.apis}</span>
                </div>
                {impactAnalysis.apiList && impactAnalysis.apiList.length > 0 && (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', borderLeft: '2px solid #a855f7' }}>
                    {impactAnalysis.apiList.map((api: string, idx: number) => (
                      <div key={idx} onClick={() => handleSelectApi(api)} style={{ fontSize: '0.78rem', color: '#c084fc', cursor: 'pointer', marginBottom: '4px', fontFamily: 'monospace' }} title="Click to trace API Flow">
                        ⚡ {api}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <div className="metric-row" style={{ marginBottom: '0.3rem' }}>
                  <span className="metric-label" style={{ fontWeight: 'bold', color: '#e2e8f0' }}>Affected Components</span>
                  <span className="metric-value" style={{ color: impactAnalysis.components > 0 ? '#f59e0b' : '#94a3b8' }}>{impactAnalysis.components}</span>
                </div>
                {impactAnalysis.componentList && impactAnalysis.componentList.length > 0 && (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', borderLeft: '2px solid #38bdf8' }}>
                    {impactAnalysis.componentList.map((comp: string, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.78rem', color: '#7dd3fc', marginBottom: '4px', fontFamily: 'monospace' }}>
                        &lt;{comp} /&gt;
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <div className="metric-row" style={{ marginBottom: '0.3rem' }}>
                  <span className="metric-label" style={{ fontWeight: 'bold', color: '#e2e8f0' }}>Affected Database Tables</span>
                  <span className="metric-value" style={{ color: impactAnalysis.dbTables > 0 ? '#f59e0b' : '#94a3b8' }}>{impactAnalysis.dbTables}</span>
                </div>
                {impactAnalysis.dbList && impactAnalysis.dbList.length > 0 && (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', borderLeft: '2px solid #10b981' }}>
                    {impactAnalysis.dbList.map((table: string, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.78rem', color: '#34d399', marginBottom: '4px', fontWeight: 'bold' }}>
                        🛢️ {table}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="estimated-health" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                <span className="metric-label">Impact Risk Level</span>
                <span className={`badge ${impactAnalysis.riskLevel.toLowerCase()}`} style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>
                  {impactAnalysis.riskLevel}
                </span>
              </div>
            </div>
          )}

          <div className="panel-section recommendations-section">
            <h3 style={{ color: '#34d399' }}>Smart Recommendations</h3>
            <ul className="rec-list">
              {recs.map((rec: string, idx: number) => (
                <li key={idx}><span className="check-icon">✔</span> {rec}</li>
              ))}
            </ul>

            <div className="estimated-health">
              <span className="metric-label">Estimated Health</span>
              <div className="health-transition">
                <span className="current-health">{selectedNodeData.healthScore}%</span>
                <span className="arrow">→</span>
                <span className="new-health">{estimatedHealth}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
