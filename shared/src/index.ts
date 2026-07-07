export interface ProductionRisk {
  category: 'Debug code' | 'Temporary code' | 'Hardcoded credentials' | 'Large commented code blocks' | 'TODO/FIXME comments' | 'Dead code' | 'Empty catch blocks' | 'Test data' | 'Unused development imports' | 'Memory Leaks / SPA Timers' | 'Insecure Cryptography' | 'SQL / NoSQL Injection' | 'XSS DOM Risks' | string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  line?: number;
}

export interface Node {
  id: string;
  type: 'file' | 'module' | 'class' | 'function' | 'database_table' | 'package' | 'external';
  name: string;
  filePath: string;
  problemCount?: number;
  problems?: string[];
  productionRisks?: ProductionRisk[];
  exportsCount?: number;
  functionsCount?: number;
  componentsUsed?: string[];
  apisCalled?: string[];
  dbTables?: string[];
  isOpen?: boolean;
}

export interface Edge {
  source: string; // Node ID
  target: string; // Node ID
  type: 'imports' | 'calls' | 'depends_on';
}

export interface DuplicatePair {
  fileA: string;
  fileB: string;
  similarity: number; // Overall file overlap % (0 to 100)
  funcSimilarity?: number; // Function / Snippet similarity % (0 to 100)
  fragment?: string; // Highlighted duplicate function or code snippet summary
  lineA?: number; // Start line of duplicate logic in fileA
  lineB?: number; // Start line of duplicate logic in fileB
}

export interface UnusedPackage {
  name: string;
  file: string;
  type?: string;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  duplicates?: DuplicatePair[];
  cycles?: string[][]; // Array of circular dependency import paths
  unusedPackages?: UnusedPackage[];
}

export interface HealthScore {
  moduleName: string;
  score: number; // 0 to 100
  metrics: {
    complexity: number;
    testCoverage: number;
    coupling: number;
    staleness: number; // e.g. months since last change
  };
}
