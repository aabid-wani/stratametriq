---
sidebar_position: 3
title: 📖 User Guide & Feature Manual
---

# Complete Feature Manual

Welcome to the comprehensive user manual for StrataMetriq. Learn how to leverage all 6 core feature suites to keep your codebase decoupled, clean, and production-ready.

---

## 1. 🛡️ Pre-Deployment Safety Audit (9-Point Checklist)
Stop critical vulnerabilities, debugging artifacts, and messy code before committing to git or deploying to production. Every file is evaluated against a rigorous **9-point safety checklist**:

* **🔑 Hardcoded Credentials:** Catches leaked API keys, AWS secrets, JWTs, bearer tokens, passwords, database connection strings (`mongodb://`, `postgres://`, `mysql://`), localhost URLs, and hardcoded IPs. 
  * *Zero False-Positive Precision:* Advanced heuristic algorithms automatically ignore dynamic template strings (`${process.env.API_KEY}`) and safe browser storage queries (`sessionStorage.getItem("token")`).
* **🐞 Debug Code:** Detects active logging and debugging breakpoints (`console.log`, `console.debug`, `console.warn`, `console.error`, `debugger;`, `alert()`, `confirm()`, and Redux devtools hooks).
* **🚧 Temporary Code:** Flags developer hacks and temporary workarounds marked with comments containing `TEMP`, `HACK`, `XXX`, `WIP`, `@temporary`, `remove this`, or `delete this`.
* **🧪 Test Code & Test Data:** Prevents test suites (`describe`, `it`, `test`, `expect`), mocking frameworks (`jest`, `sinon`, `faker`, `nock`), and mock data fixtures (`mockData`, `testData`, `dummyData`) from leaking into production bundles.
* **📌 TODO / FIXME Comments:** Catches unresolved code annotations (`TODO`, `FIXME`, `PENDING`, `BUG`, `REFACTOR`) as well as stray task tracking files (`TODO.md`, `TASKS.txt`).
* **💬 Commented Code Blocks:** Identifies blocks of dead, commented-out source code or inactive logic blocks spanning 2 or more consecutive lines.
* **⚰️ Dead Code:** Detects unreachable statements after `return`/`throw`/`break`, explicit unused code annotations, and hardcoded dead conditionals like `if (false)` or `while (0)`.
* **🕳️ Empty Catch Blocks:** Identifies swallowed error exceptions where `try { ... } catch (e) {}` blocks contain zero error-handling logic.
* **📦 Dev & Testing Imports:** Flags production modules that erroneously import development-only packages (e.g., importing `redux-logger` or `@testing-library` inside user-facing components).

### 💡 How It Works: Real-World Code Examples & Zero False-Positive Precision

To ensure developers only spend time fixing real security risks, StrataMetriq's AST heuristic scanner distinguishes between unsafe hardcoded secrets and legitimate runtime configurations:

#### 🔴 What StrataMetriq Flags as a HIGH Severity Risk (Unsafe Code)
If you accidentally write hardcoded database connection strings, passwords, or API tokens directly into your source code, StrataMetriq catches them in milliseconds before you commit:
```javascript
// ❌ HIGH RISK: Hardcoded Database Connection String
const dbConnection = "mongodb://admin:SuperSecretPassword@localhost:27017/production_db";

// ❌ HIGH RISK: Leaked API Secret or Bearer Token
const stripeSecretKey = "sk_test_51ExamplePlaceholderSecretKey123456789";
```
**In your StrataMetriq Dashboard**, this generates a high-priority risk card showing:
* **File Name & Path:** `AuthProvider.jsx` (`...\src\components\context`)
* **Severity & Line Number:** `HIGH [Line 76]`
* **Exact Risk Description:** `Hardcoded credentials: Hardcoded value found: se...`

#### 🟢 What StrataMetriq Safely Ignores (Safe Code — Zero False Positives)
Our advanced contextual AST analysis automatically recognizes secure environment variables and standard browser API queries, guaranteeing you are never spammed with false alerts:
```javascript
// ✅ SAFE: Dynamic Template Literals & Environment Variables
const dbConnection = `${process.env.DATABASE_URL}`;
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// ✅ SAFE: Browser Storage Queries & Session Calls
const userToken = sessionStorage.getItem("auth_token");
localStorage.setItem("user_preference", "dark_mode");
```

#### 📸 Secrets Detection in the Interactive Dashboard
When StrataMetriq identifies hardcoded credentials or API tokens, it immediately surfaces them in the **Secrets** filter view with exact line numbers and risk ratings:

![StrataMetriq Secrets Dashboard Preview](/img/secrets-dashboard.png)

:::tip One-Click Remediation
Click any detected risk card in the UI to immediately open that exact source file and line number in VS Code!
:::

---

## 2. ⚡ Risk Impact Analysis (Downstream Ripple Effect)
Answer the most critical engineering question before refactoring: *"If I modify or delete this file, what else breaks across my entire application?"*

* Check the concrete **Risk Severity Badge** (`HIGH`, `MEDIUM`, or `LOW`) calculated from downstream coupling density.
* Review the categorized breakdown of every dependent component affected by changes to this file:
  * 🌐 **Affected APIs:** HTTP endpoints and routing controllers triggered by this module.
  * 🧩 **Affected Components / Modules:** Upstream files and React components importing this code.
  * 🗄️ **Affected Database Tables:** Database tables, collections, and ORM schemas accessed by this module.
  * 📊 **Affected Reports & Views:** UI dashboards and frontend views reliant on data streams originating here.

---

## 3. 🌳 Interactive Dependency Explorer
Navigate your codebase through an interactive, visual dependency hierarchy rather than hunting through raw grep results.

```text
ProductView.tsx (React Component)
       │  imports
       ▼
ProductService.ts (Business Logic Layer)
       │  calls
       ▼
GET /api/v1/products (HTTP Endpoint Route)
       │  queries
       ▼
products_table (Database Schema)
```

:::info Live VS Code Editor Synchronization
Notice the green **`[Open in Editor]`** badge appearing dynamically next to files that are currently open in your active VS Code editor tabs.
:::

---

## 4. 🔀 API Flow Visualizer
Trace the complete architectural lifecycle of HTTP requests from front-end user interactions down to database schema queries. Watch StrataMetriq's **Dynamic Entity Keyword Matching Engine** extract domain keywords without false positives:

```text
UI Component  ➔  HTTP Client  ➔  API Route  ➔  Controller  ➔  Middleware  ➔  Service  ➔  ORM / Repo  ➔  Database Table
```

---

## 5. 👥 Duplicate Code & Circular Dependency Detection
Maintain a clean, DRY (Don't Repeat Yourself), and decoupled codebase by catching structural flaws early.

* **Duplicate Logic:** Evaluates lexical AST tokens across functions using Jaccard Similarity algorithms. Files sharing a similarity score above 85% are flagged with actionable refactoring tips.
* **Circular Dependencies:** Detects tight coupling import loops caught by depth-first search algorithms (e.g., `ModuleA.ts ➔ ModuleB.ts ➔ ModuleC.ts ➔ ModuleA.ts`).

---

## 6. 📊 Architectural Health & Complexity Metrics
Monitor overall repository maintainability through three core health gauges:
* **Project Health Score (0% - 100%):** Evaluated from coupling density, duplicate code ratios, syntax error frequencies, and pre-deployment risk severity.
* **Complexity Index:** Measures the average number of imports and dependencies per file.
* **Graph Overview:** Displays total workspace files mapped, total cross-module edges discovered, and total database tables identified.
