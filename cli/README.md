# @stratametriq/cli — Headless DevSecOps & Architecture Governance CLI

[![npm version](https://img.shields.io/npm/v/@stratametriq/cli.svg?style=flat-square)](https://www.npmjs.com/package/@stratametriq/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**@stratametriq/cli** is the standalone headless DevSecOps and Architecture Governance engine for **StrataMetriq**. It runs offline on your local machine or inside CI/CD pipelines to enforce architectural boundaries, detect production risks, and prevent security regressions before code is merged.

---

## ⚡ Quick Start (No Installation Required)

Run a complete 13-point DevSecOps and Architecture scan directly in your terminal:

```bash
npx @stratametriq/cli scan .
```

---

## 🛠️ All Available Commands & Usage Examples

### 1. Standard Local Scan
Analyze your current codebase and output a colorized summary table of project health, duplicate code pairs, circular dependency loops, and production risks:
```bash
npx @stratametriq/cli scan .
```

### 2. Pull Request Audit Mode (`--diff`)
Scan only files modified in your current branch against `origin/main`. Ideal for CI/CD pull request checks:
```bash
npx @stratametriq/cli scan . --diff origin/main --fail-on-high
```

### 3. Downstream Ripple Impact Analysis (`impact`)
Calculate exact downstream dependencies across APIs, database tables, and UI components before modifying a file:
```bash
npx @stratametriq/cli impact src/services/UserService.ts
```

### 4. Enterprise Architecture Governance Wizard (`init`)
Generate `.stratametriqrc.json` and a starter `stratametriq.config.yml` architecture boundary configuration file:
```bash
npx @stratametriq/cli init
```

### 5. Export Security & Compliance Reports
Export machine-readable reports for GitHub Advanced Security, GitLab Security, or PR comment bots:
```bash
# Export OASIS SARIF v2.1.0 report (integrates into GitHub Advanced Security / Code Scanning tab)
npx @stratametriq/cli scan . --sarif stratametriq.sarif

# Export Markdown summary (ideal for GitHub Actions PR comments)
npx @stratametriq/cli scan . --md pr-report.md

# Export complete architecture graph JSON
npx @stratametriq/cli scan . --json architecture.json
```

---

## 🏛️ Enterprise Custom Architecture Governance (`stratametriq.config.yml`)

Enforce organizational architecture standards across your monorepo or layered application. Define forbidden import boundaries in `stratametriq.config.yml`:

```yaml
version: 1
rules:
  - name: "UI layer cannot import Database layer directly"
    source: "src/ui/**"
    forbiddenTarget: "src/db/**"
    severity: "HIGH"
    message: "UI components must go through src/services/ or API endpoints."

  - name: "Domain isolation"
    source: "src/domain/**"
    forbiddenTarget: "src/infra/**"
    severity: "HIGH"
    message: "Domain layer must remain decoupled from infrastructure details."
```

When `stratametriq scan .` runs, any illegal import boundary violation triggers a **HIGH severity failure** along with clear 1-line `💡 Fix` remediation instructions.

---

## 🚦 Quality Gates & CI/CD Flags

| CLI Flag | Description | CI/CD Pipeline Exit Behavior |
| :--- | :--- | :--- |
| `--fail-on-high` | Block build if any HIGH severity risk or custom governance rule is broken. | Exits `1` (Fails Pipeline) |
| `--fail-on-circular` | Block build if any Circular Dependency loop is detected. | Exits `1` (Fails Pipeline) |
| `--max-circular <N>` | Allow up to N circular dependency loops before failing pipeline. | Exits `1` if loops > N |
| `--min-health <N>` | Block build if Project Health Score drops below N% (1–100). | Exits `1` if Health < N |

---

## 🤖 GitHub Actions Workflow Example

Create `.github/workflows/stratametriq.yml` in your repository:

```yaml
name: StrataMetriq DevSecOps Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run StrataMetriq Scan
        run: npx @stratametriq/cli scan . --diff origin/main --fail-on-high --sarif results.sarif

      - name: Upload SARIF to GitHub Advanced Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

---

## 🌐 Polyglot Language Support

Out-of-the-box AST parsing and architectural mapping across:
* **JavaScript & TypeScript** (`.js`, `.ts`, `.jsx`, `.tsx`)
* **Python** (`.py`)
* **Java & Kotlin** (`.java`, `.kt`)
* **Go** (`.go`)
* **C#** (`.cs`)

---

## 📄 License

MIT © StrataMetriq Engineering Team
