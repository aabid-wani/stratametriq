export interface ProductionRisk {
  category: 'Debug code' | 'Temporary code' | 'Hardcoded credentials' | 'Large commented code blocks' | 'TODO/FIXME comments' | 'Dead code' | 'Empty catch blocks' | 'Test data' | 'Unused development imports';
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  line?: number;
}

export interface Node {
  id: string;
  type: 'file' | 'module' | 'class' | 'function' | 'database_table';
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
  similarity: number; // 0 to 100
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  duplicates?: DuplicatePair[];
  cycles?: string[][]; // Array of circular dependency import paths
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
