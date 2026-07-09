import * as fs from 'fs';
import * as path from 'path';
import { Graph, CustomArchitectureRule, CustomRuleViolation } from '@stratametriq/shared';

export function matchPattern(filePath: string, pattern: string): boolean {
  if (!pattern) return false;
  const normPath = filePath.replace(/\\/g, '/').toLowerCase();
  const normPat = pattern.replace(/\\/g, '/').toLowerCase();

  // Substring match or exact match
  if (normPath.includes(normPat)) return true;

  // Convert glob pattern to regex
  // e.g. "src/ui/**" -> /src\/ui\/.*$/i
  // "**/*.ts" -> /.*\.ts$/i
  let regexStr = normPat
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  try {
    const reg = new RegExp(regexStr, 'i');
    return reg.test(normPath);
  } catch (e) {
    return false;
  }
}

export function parseGovernanceConfig(content: string): CustomArchitectureRule[] {
  const rules: CustomArchitectureRule[] = [];
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : (parsed.rules || []);
    } catch (e) {
      // ignore JSON parse error, try YAML
    }
  }

  // Simple zero-dependency YAML rule block parser
  const blocks = trimmed.split(/\n\s*-\s+/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const nameMatch = block.match(/(?:^|\n)\s*name:\s*['"]?([^'"\n]+)['"]?/i);
    const sourceMatch = block.match(/(?:^|\n)\s*source:\s*['"]?([^'"\n]+)['"]?/i);
    const targetMatch = block.match(/(?:^|\n)\s*forbiddenTarget:\s*['"]?([^'"\n]+)['"]?/i);
    const severityMatch = block.match(/(?:^|\n)\s*severity:\s*['"]?(HIGH|MEDIUM|LOW)['"]?/i);
    const messageMatch = block.match(/(?:^|\n)\s*message:\s*['"]?([^'"\n]+)['"]?/i);

    if (sourceMatch && targetMatch) {
      rules.push({
        name: nameMatch ? nameMatch[1].trim() : `Forbidden import: ${sourceMatch[1]} -> ${targetMatch[1]}`,
        source: sourceMatch[1].trim(),
        forbiddenTarget: targetMatch[1].trim(),
        severity: (severityMatch ? severityMatch[1].toUpperCase() : 'HIGH') as 'HIGH' | 'MEDIUM' | 'LOW',
        message: messageMatch ? messageMatch[1].trim() : `Architecture violation: ${sourceMatch[1]} must not import ${targetMatch[1]}`
      });
    }
  }

  return rules;
}

export function loadGovernanceRules(workspaceRoot: string): CustomArchitectureRule[] {
  const possibleConfigs = [
    path.join(workspaceRoot, 'stratametriq.config.yml'),
    path.join(workspaceRoot, 'stratametriq.config.yaml'),
    path.join(workspaceRoot, 'stratametriq.config.json')
  ];

  for (const p of possibleConfigs) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        return parseGovernanceConfig(content);
      } catch (e) {
        console.error(`Failed to read governance config: ${p}`, e);
      }
    }
  }
  return [];
}

export function evaluateArchitectureGovernance(graph: Graph, rules: CustomArchitectureRule[]): CustomRuleViolation[] {
  const violations: CustomRuleViolation[] = [];
  if (!rules || rules.length === 0) return violations;

  const nodeById = new Map<string, any>();
  graph.nodes.forEach(n => nodeById.set(n.id, n));

  for (const edge of graph.edges) {
    if (edge.type !== 'imports') continue;

    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    const sourcePath = sourceNode?.filePath || edge.source;
    const targetPath = targetNode?.filePath || edge.target;

    for (const rule of rules) {
      if (matchPattern(sourcePath, rule.source) && matchPattern(targetPath, rule.forbiddenTarget)) {
        const violation: CustomRuleViolation = {
          ruleName: rule.name,
          sourceFile: sourcePath,
          targetFile: targetPath,
          severity: rule.severity || 'HIGH',
          message: rule.message || `${rule.name}: ${sourcePath} imports forbidden target ${targetPath}`
        };
        violations.push(violation);

        // Also inject into source node's productionRisks so IDE squiggles and status bar pick it up immediately
        if (sourceNode) {
          sourceNode.productionRisks = sourceNode.productionRisks || [];
          sourceNode.productionRisks.push({
            category: `Architecture Rule: ${rule.name}`,
            severity: rule.severity || 'HIGH',
            message: rule.message || `Forbidden import to ${targetPath}`,
            line: 1
          });
          sourceNode.problemCount = (sourceNode.problemCount || 0) + 1;
          sourceNode.problems = sourceNode.problems || [];
          sourceNode.problems.push(`[Rule] ${rule.name}`);
        }
      }
    }
  }

  graph.customRuleViolations = violations;
  return violations;
}
