---
sidebar_position: 4
title: ⚡ Headless CLI & DevSecOps
---

# ⚡ Headless CLI & CI/CD Pipeline Gates (DevSecOps)

StrataMetriq includes **`@stratametriq/cli`**, a standalone headless executable designed to run offline AST scans and enforce quality gates directly inside terminal windows, Docker containers, and CI/CD pipelines (such as GitHub Actions, GitLab CI, Jenkins, and Azure DevOps).

---

## 🚀 Quick Start & Installation

You can run the CLI immediately in any project directory without installing anything globally:

```bash
# Interactive setup: create a default .stratametriqrc.json configuration file
npx @stratametriq/cli init

# Scan the current directory locally
npx @stratametriq/cli scan .

# Run downstream BFS impact analysis on a specific file ("what breaks if I edit this?")
npx @stratametriq/cli impact src/services/UserService.ts

# Git PR Mode: Scan only modified files in your branch/PR against origin/main
npx @stratametriq/cli scan . --diff origin/main --fail-on-high

# Dead code & dependency pruning: Report unused npm packages and orphaned modules
npx @stratametriq/cli scan . --prune

# Standalone interactive offline HTML dashboard report
npx @stratametriq/cli scan . --html architecture-report.html

# Live watch mode for local development (automatically re-scans on file save)
npx @stratametriq/cli scan . --watch
```

---

## 🚦 Available Quality Gates & CLI Flags

In automated CI/CD pipelines, process exit codes control whether a Pull Request is allowed to merge. StrataMetriq provides granular flag controls:

| CLI Flag | Description | CI/CD Pipeline Exit Behavior |
| :--- | :--- | :--- |
| `init` | Creates default `.stratametriqrc.json` configuration file. | Configures ignore rules, custom risk thresholds, and default report paths. |
| `scan [dir]` | Target directory to scan (defaults to current working directory). | Outputs colored ANSI tables of stats & risks. |
| `impact <file>` | Runs downstream BFS ripple analysis on a specific target file. | Categorizes downstream affected files, API routes, database tables, and UI widgets. |
| `--diff <ref>` | Git PR mode: Compares against Git branch or commit reference. | Evaluates security risks and circular loops strictly within modified files. |
| `--prune` | Dead code and dependency cleanup report. | Identifies unreferenced `package.json` dependencies and orphaned module code. |
| `--watch`, `-w` | Live reloading development mode. | Automatically monitors file changes and re-runs AST scans in `<200ms`. |
| `--html <file>` | Exports standalone interactive HTML report. | Creates an offline web view with health score badges, risk tables, and statistics cards. |
| `--fail-on-high` | Security vulnerability gate. | Exits with **Exit Code `1`** (fails pipeline) if any HIGH severity risk (SQLi, XSS, Crypto, Secrets) is detected. |
| `--fail-on-circular` | Architectural loop gate. | Exits with **Exit Code `1`** if any circular dependency loops are detected. |
| `--max-circular <N>` | Sets a custom threshold for circular loops. | Fails build only if circular loops exceed `<N>`. |
| `--json <file>` | Exports full AST graph and audit data to JSON. | Perfect for SBOM generation or custom analytics integration. |
| `--sarif <file>` | Exports OASIS SARIF 2.1.0 security report. | Directly uploads into GitHub Advanced Security / GitLab Security PR code tabs. |
| `--md <file>` | Exports GitHub-flavored Markdown report. | Can be fed directly into `gh pr comment` in GitHub Actions. |

---

## 🤖 Integrating with CI/CD Pipelines

### 1. GitHub Actions Workflow (`.github/workflows/stratametriq.yml`)
You can automatically block pull requests that introduce new architectural loops or security risks, while posting a visual audit summary directly as a PR comment:

```yaml
name: StrataMetriq Architecture & Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run StrataMetriq DevSecOps Gate & Generate SARIF
        run: npx @stratametriq/cli scan . --sarif stratametriq.sarif --md pr-report.md

      - name: Upload SARIF to GitHub Security Tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: stratametriq.sarif

      - name: Comment Audit Summary on PR
        if: github.event_name == 'pull_request' && always()
        uses: thollander/actions-comment-pull-request@v2
        with:
          filePath: pr-report.md
```

### 2. GitLab CI Workflow (`.gitlab-ci.yml`)
```yaml
stages:
  - architecture-audit

stratametriq_gate:
  stage: architecture-audit
  image: node:20-alpine
  script:
    - npx @stratametriq/cli scan . --fail-on-high --json stratametriq-report.json
  artifacts:
    when: always
    paths:
      - stratametriq-report.json
```

---

## 📊 Sample Terminal Output

When executed in terminal or console, the CLI prints an easy-to-read, color-coded health summary:

```text
================================================================
  StrataMetriq CLI v1.3.0 - DevSecOps Architecture Governance   
================================================================

Target Directory: /workspace/project
Running offline AST scan & security audit...

--- Architecture MRI Summary ---
Total Files Scanned : 142
External Packages   : 28
Circular Loops      : 0
Duplicate Code Pairs: 2
Scan Duration       : 312ms

--- Security & Pre-Deployment Risks ---
HIGH Severity   : 0
MEDIUM Severity : 1
LOW Severity    : 4

================================================================
  ✅ ALL CI/CD DEVSECOPS GATES PASSED - CLEAR TO DEPLOY         
================================================================
```
