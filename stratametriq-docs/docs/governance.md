---
sidebar_position: 5
title: 🏛️ Custom Architecture Governance
---

# Enterprise Custom Architecture Governance (`stratametriq.config.yml`)

StrataMetriq allows Principal Architects, Tech Leads, and DevOps engineers to enforce custom architectural boundaries, domain isolation, and import restrictions across any polyglot codebase via a root configuration file: **`stratametriq.config.yml`**.

---

## 🚀 Why Architecture Governance?

As codebases grow and teams scale, software architecture inevitably drifts. Developers under tight deadlines may bypass service layers, import database clients directly into frontend UI components, or couple domain logic to infrastructure implementations.

StrataMetriq acts as an **enforceable architecture linter**:
* **Real-Time IDE Prevention**: Flags forbidden import boundaries directly inside VS Code with red diagnostic squiggles while code is being written.
* **Continuous Integration (CI/CD) Gates**: Automatically breaks Pull Request builds if forbidden imports or architectural boundary violations are introduced (`--fail-on-high`).
* **Actionable Fix Guidance**: Provides immediate 1-line remediation instructions (`💡 Fix`) telling engineers exactly how to comply with company standards.

---

## ⚡ Quick Start: Creating Your First Rule

### Step 1: Initialize Configuration
Run the interactive wizard in your project root:

```bash
npx @stratametriq/cli init
```

This creates both `.stratametriqrc.json` and a starter **`stratametriq.config.yml`**.

---

### Step 2: Define Boundary Rules
Edit `stratametriq.config.yml` at the root of your workspace:

```yaml
version: 1
rules:
  # Rule 1: Prevent UI Layer from directly importing Database clients
  - name: "UI layer cannot import Database layer directly"
    source: "src/ui/**"
    forbiddenTarget: "src/db/**"
    severity: "HIGH"
    message: "UI components must go through src/services/ or API endpoints."

  # Rule 2: Enforce Domain-Driven Design (DDD) Isolation
  - name: "Billing domain cannot import Auth internal schema"
    source: "src/domain/billing/**"
    forbiddenTarget: "src/domain/auth/internal/**"
    severity: "HIGH"
    message: "Domain modules must communicate only via public interfaces."

  # Rule 3: Ban Deprecated Utility Imports
  - name: "Ban direct import of legacy HTTP client"
    source: "**/*.ts"
    forbiddenTarget: "src/legacy/http.ts"
    severity: "MEDIUM"
    message: "Use the new ApiClient from src/core/http.ts instead."
```

---

## 🔍 How Rules Are Evaluated

When StrataMetriq scans a project (`stratametriq scan .` or via the VS Code extension):
1. Every source file AST is parsed into dependency graph edges (`source -> target`).
2. Glob patterns (`**/*.ts`, `src/ui/**`) and file paths are matched against each rule's `source` and `forbiddenTarget`.
3. When an illegal import edge is detected:
   * **In VS Code**: An inline diagnostic squiggle marks the file, and the webview dashboard highlights the violation on the node inspect card.
   * **In Headless CLI**: A dedicated violation report is output to the terminal:

```text
--- 🏛️ Enterprise Custom Architecture Governance Violations ---
  🚫 [FAIL] UI layer cannot import Database layer directly
     Violation: src/ui/Header.tsx -> src/db/client.ts
     💡 Fix: UI components must go through src/services/ or API endpoints.
```

---

## 🤖 CI/CD Pipeline Integration

To block Pull Requests that violate your custom architecture rules in GitHub Actions or GitLab CI:

```bash
npx @stratametriq/cli scan . --fail-on-high
```

If any `HIGH` severity governance rule is violated, the CLI exits with **Exit Code `1`**, failing the pipeline check before bad architecture reaches production.
