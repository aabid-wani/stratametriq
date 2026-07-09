import { Graph, Node } from '@stratametriq/shared';
import * as path from 'path';

export interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

export interface SarifRun {
  tool: {
    driver: {
      name: string;
      informationUri: string;
      semanticVersion: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: {
    text: string;
  };
  defaultConfiguration: {
    level: 'error' | 'warning' | 'note';
  };
}

export interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: {
    text: string;
  };
  locations: {
    physicalLocation: {
      artifactLocation: {
        uri: string;
      };
      region?: {
        startLine: number;
      };
    };
  }[];
}

export function generateSarifReport(graph: Graph, version: string = '1.4.1', baseDir: string = ''): SarifLog {
  const rulesMap = new Map<string, SarifRule>();
  const results: SarifResult[] = [];

  const getRuleId = (category: string): string => {
    const clean = category.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `SMQ-${clean}`;
  };

  const getLevel = (severity: string): 'error' | 'warning' | 'note' => {
    if (severity === 'HIGH') return 'error';
    if (severity === 'MEDIUM') return 'warning';
    return 'note';
  };

  const registerRule = (id: string, name: string, description: string, level: 'error' | 'warning' | 'note') => {
    if (!rulesMap.has(id)) {
      rulesMap.set(id, {
        id,
        name,
        shortDescription: { text: description },
        defaultConfiguration: { level }
      });
    }
  };

  // 1. Production Risks across all nodes
  graph.nodes.forEach(node => {
    if (!node.productionRisks) return;
    node.productionRisks.forEach(risk => {
      const ruleId = getRuleId(risk.category);
      const level = getLevel(risk.severity);

      registerRule(ruleId, risk.category, `Architectural & Security Governance: ${risk.category}`, level);

      let relUri = node.filePath.replace(/\\/g, '/');
      if (baseDir && relUri.startsWith(baseDir.replace(/\\/g, '/'))) {
        relUri = path.relative(baseDir, node.filePath).replace(/\\/g, '/');
      }

      results.push({
        ruleId,
        level,
        message: {
          text: risk.message || `Found risk of type ${risk.category}`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: relUri
              },
              region: {
                startLine: risk.line && risk.line > 0 ? risk.line : 1
              }
            }
          }
        ]
      });
    });
  });

  // 2. Circular Dependencies
  if (graph.cycles && graph.cycles.length > 0) {
    const ruleId = 'SMQ-ARCH-CIRCULAR';
    registerRule(ruleId, 'CircularDependency', 'Circular dependency loop detected across modules', 'error');

    graph.cycles.forEach((cycle, idx) => {
      const firstFile = cycle.length > 0 ? cycle[0] : 'unknown';
      let relUri = firstFile;
      if (baseDir && relUri.startsWith(baseDir.replace(/\\/g, '/'))) {
        relUri = path.relative(baseDir, firstFile).replace(/\\/g, '/');
      }

      results.push({
        ruleId,
        level: 'error',
        message: {
          text: `Circular dependency loop #${idx + 1} detected: ${cycle.join(' -> ')}`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: relUri
              },
              region: {
                startLine: 1
              }
            }
          }
        ]
      });
    });
  }

  // 3. Logic Duplicates
  if (graph.duplicates && graph.duplicates.length > 0) {
    const ruleId = 'SMQ-ARCH-DUPLICATE';
    registerRule(ruleId, 'CodeDuplication', 'High logic similarity / duplicate code snippet detected', 'warning');

    graph.duplicates.forEach(dup => {
      let relUri = dup.fileA.replace(/\\/g, '/');
      if (baseDir && relUri.startsWith(baseDir.replace(/\\/g, '/'))) {
        relUri = path.relative(baseDir, dup.fileA).replace(/\\/g, '/');
      }

      results.push({
        ruleId,
        level: 'warning',
        message: {
          text: `High logic duplication (${dup.similarity}%) detected between ${dup.fileA} and ${dup.fileB}`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: relUri
              },
              region: {
                startLine: dup.lineA || 1
              }
            }
          }
        ]
      });
    });
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'StrataMetriq',
            informationUri: 'https://github.com/aabid-wani/stratametriq',
            semanticVersion: version,
            rules: Array.from(rulesMap.values())
          }
        },
        results
      }
    ]
  };
}
