# @stratametriq/scanner — Polyglot AST Analysis & Pre-Deployment Safety Engine

**@stratametriq/scanner** is the core local AST engine powering **StrataMetriq**. It parses source files across JavaScript/TypeScript, Python, Java, Kotlin, Go, and C# to generate unified dependency graphs, detect circular loops, extract API routes/SQL tables, and evaluate 13 categories of pre-deployment production risks.

---

## ⚡ Programmatic Usage Example

```typescript
import { Scanner } from '@stratametriq/scanner';
import * as fs from 'fs';

const scanner = new Scanner();

// Parse files in your workspace
scanner.parseFile('src/index.ts', fs.readFileSync('src/index.ts', 'utf8'));

// Generate the unified architecture graph
const graph = scanner.getGraph(process.cwd());

console.log(`Health Score: ${graph.healthScore}%`);
console.log(`Circular Loops: ${graph.circularDependencies?.length || 0}`);
console.log(`Production Risks: ${graph.productionRisks?.length || 0}`);
```

---

## 📄 License

MIT © StrataMetriq Engineering Team
