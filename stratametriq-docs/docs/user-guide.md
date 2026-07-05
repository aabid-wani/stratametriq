---
sidebar_position: 3
title: 📖 User Guide & Feature Manual
---

# Complete Feature Manual

Welcome to the comprehensive user manual for StrataMetriq. Learn how to leverage all 6 core feature suites to keep your codebase decoupled, clean, and production-ready.

---

## ⚙️ How StrataMetriq Works Under the Hood (AST & Heuristic Pipeline)
When you click the primary **`⚡ Run Deep Analysis`** button, StrataMetriq initiates a high-performance local scanning pipeline. Rather than just surface linting, it simultaneously evaluates raw source heuristics alongside deep Abstract Syntax Tree (AST) structural tokens:

### 1. High-Level Pipeline Summary
```text
User Clicks "Run Deep Analysis"
            │
            ▼
Read Every Source File
            │
            ├───────────────┐
            ▼               ▼
       Parse AST      Scan Raw Source
            │               │
            │               ├── TODO
            │               ├── HACK
            │               ├── TEMP
            │               └── Hardcoded Secrets
            │
            ├── Imports
            ├── Functions
            ├── Components
            ├── API Calls
            ├── Complexity
            ├── Dependencies
            ├── Duplicate Logic
            └── Circular Dependencies
                    │
                    ▼
          Generate Health Score
                    │
                    ▼
     Pre-Deployment Safety Report
```

### 2. Full End-to-End Architectural Tracing Flowchart
For developers and system architects who want to understand the complete end-to-end lifecycle from IDE workspace initialization to final dashboard rendering, here is the full architectural execution flow:

```text
                         ┌────────────────────────────┐
                         │   Developer Opens Project  │
                         └─────────────┬──────────────┘
                                       │
                                       ▼
                         ┌────────────────────────────┐
                         │ Click "Run Deep Analysis"  │
                         └─────────────┬──────────────┘
                                       │
                                       ▼
                         ┌────────────────────────────┐
                         │ Read All JS / TS Files     │
                         │ (Workspace Scanner)        │
                         └─────────────┬──────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │ Parse Every File into AST           │
                    │ (Acorn / TypeScript Parser)         │
                    └─────────────┬───────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────────┐
          │                       │                           │
          ▼                       ▼                           ▼
 ┌─────────────────┐     ┌─────────────────┐       ┌──────────────────┐
 │ Extract Imports │     │ Extract JSX     │       │ Extract Functions│
 │ & Exports       │     │ Components      │       │ Classes & Hooks  │
 └────────┬────────┘     └────────┬────────┘       └────────┬─────────┘
          │                       │                           │
          └───────────────┬───────┴───────────────┬───────────┘
                          │                       │
                          ▼                       ▼
              ┌──────────────────────┐   ┌──────────────────────┐
              │ Detect API Calls     │   │ Calculate Complexity │
              │ fetch / axios        │   │ Imports, Functions,  │
              │                      │   │ Components, APIs     │
              └──────────┬───────────┘   └──────────┬───────────┘
                         │                          │
                         └──────────────┬───────────┘
                                        │
                                        ▼
                     ┌─────────────────────────────────────┐
                     │ Build Project Dependency Graph      │
                     │ (Nodes = Files, Edges = Imports)    │
                     └─────────────┬───────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────────┐
            │                      │                          │
            ▼                      ▼                          ▼
 ┌──────────────────┐    ┌────────────────────┐    ┌────────────────────┐
 │ Project Health   │    │ API Flow Mapping   │    │ Impact Analysis    │
 │ Score            │    │ Frontend → Backend │    │ Circular Dependency│
 └────────┬─────────┘    └─────────┬──────────┘    └──────────┬─────────┘
          │                        │                          │
          └───────────────┬────────┴──────────────┬───────────┘
                          │                       │
                          ▼                       ▼
             ┌────────────────────────┐   ┌────────────────────────┐
             │ Source Code Scan       │   │ Production Audit       │
             │ (Regex / Pattern Scan) │   │                        │
             └───────────┬────────────┘   └───────────┬────────────┘
                         │                            │
                         ├── TODO / HACK / TEMP       │
                         ├── Hardcoded Secrets        │
                         ├── Commented Code           │
                         ├── console.log()            │
                         ├── debugger                 │
                         ├── Unused Imports           │
                         └── Other Safety Rules       │
                                      │               │
                                      ▼               ▼
                     ┌────────────────────────────────────┐
                     │ Generate Final Architecture Report │
                     └─────────────┬──────────────────────┘
                                   │
                                   ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    StrataMetriq Dashboard                       │
     │                                                                 │
     │ ✓ Project Health Score                                          │
     │ ✓ Dependency Graph                                              │
     │ ✓ API Flow Visualizer                                           │
     │ ✓ Module Health                                                 │
     │ ✓ Architectural Metrics                                         │
     │ ✓ Pre-Deployment Safety Audit                                   │
     │ ✓ Recommendations & Insights                                    │
     └─────────────────────────────────────────────────────────────────┘
```

This dual-branch pipeline ensures that structural flaws (like circular dependency loops and duplicate logic) are evaluated by the AST parser, while developer annotations and hardcoded secret strings are audited by our zero false-positive raw source heuristics—all culminating in your unified dashboard report!

---

## 1. 🛡️ Pre-Deployment Safety Audit (9-Point Checklist)
Stop critical vulnerabilities, debugging artifacts, and messy code before committing to git or deploying to production. Every file is evaluated against a rigorous **9-point safety checklist**:

* **🔑 Hardcoded Credentials:** Catches leaked API keys, AWS secrets, JWTs, bearer tokens, passwords, database connection strings (`mongodb://`, `postgres://`, `mysql://`), localhost URLs, and hardcoded IPs. 
  * *Zero False-Positive Precision:* Advanced heuristic algorithms automatically ignore dynamic template strings (`${process.env.API_KEY}`) and safe browser storage queries (`sessionStorage.getItem("token")`).
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ HIGH RISK: Hardcoded Database Connection String & Secret Token
  const dbConnection = "mongodb://admin:SuperSecretPassword@localhost:27017/production_db";
  const stripeSecretKey = "sk_test_51ExamplePlaceholderSecretKey123456789";

  // ✅ SAFE (Zero False Positives): Dynamic Environment Variables & Session Queries
  const secureDbUrl = `${process.env.DATABASE_URL}`;
  const userToken = sessionStorage.getItem("auth_token");
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq instantly highlights the exact file (`AuthProvider.jsx`), line number (`HIGH [Line 76]`), and risk preview in your Secrets view:
  
  ![StrataMetriq Secrets Dashboard Preview](/img/secrets-dashboard.png)

* **🐞 Debug Code:** Detects active logging and debugging breakpoints (`console.log`, `console.debug`, `console.warn`, `console.error`, `debugger;`, `alert()`, `confirm()`, and Redux devtools hooks).
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ HIGH RISK: Active Logging & Debug Breakpoints Leaking to Production
  console.log("User payment payload:", paymentData);
  debugger;

  // ✅ SAFE (Zero False Positives): Standard Error Logging / Handled Exceptions
  logger.error("Failed to process payment", { error: err.message });
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq flags the exact files (`Module.jsx`, `CreatePermission.jsx`) and line numbers (`[Line 39]`, `[Line 28]`) in the **Debug Code** tab:
  
  ![StrataMetriq Debug Code Dashboard Preview](/img/debug-code-dashboard.png)

* **🚧 Temporary Code:** Flags developer hacks and temporary workarounds marked with comments containing `TEMP`, `HACK`, `XXX`, `WIP`, `@temporary`, `remove this`, or `delete this`.
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ HIGH RISK: Unfinished Hack or Temporary Workaround
  // HACK: Bypass auth validation temporarily for demo
  if (user.isDemo) return true; // WIP: remove this before launch

  // ✅ SAFE: Proper Architecture & Standard Documentation Comments
  // Validates user authorization against the JWT claims
  if (!user.isAuthenticated) throw new UnauthorizedError();
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq highlights the hack annotation in `AddOrder.jsx` (`HIGH [Line 332] Temporary code: Found temporary / hack / WIP...`) under the **Temp Code** tab:
  
  ![StrataMetriq Temp Code Dashboard Preview](/img/temp-code-dashboard.png)

* **🧪 Test Code & Test Data:** Prevents test suites (`describe`, `it`, `test`, `expect`), mocking frameworks (`jest`, `sinon`, `faker`, `nock`), and mock data fixtures (`mockData`, `testData`, `dummyData`) from leaking into production bundles.
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ HIGH RISK: Mock Data Fixtures / Test Suites Imported in Production Code
  const dummyData = [{ id: 1, name: "Test User 99", creditCard: "4111-1111-..." }];
  import { mockStripeClient } from "./__mocks__/stripe";

  // ✅ SAFE: Real Production API Connectors & Verified Data Models
  const activeUsers = await db.users.findMany({ where: { status: "ACTIVE" } });
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq catches test files and mock fixtures like `setupTests.jsx` (`[Line 1]`) and `App.test.jsx` (`[Line 4]`) in the **Test Data** tab:
  
  ![StrataMetriq Test Data Dashboard Preview](/img/test-data-dashboard.png)

* **📌 TODO / FIXME Comments:** Catches unresolved code annotations (`TODO`, `FIXME`, `PENDING`, `BUG`, `REFACTOR`) as well as stray task tracking files (`TODO.md`, `TASKS.txt`).
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ LOW RISK: Unresolved TODO or FIXME Left Behind
  // TODO: Fix calculation discrepancy for leap years before end of Q3
  // FIXME: Memory leak when component unmounts quickly

  // ✅ SAFE: Clean Code Without Pending Debt Annotations
  const annualInterest = calculateCompoundInterest(principal, rate, years);
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq indexes pending task notes like in `AssetReport.jsx` (`LOW [Line 47] TODO/FIXME comments...`) under the **TODO/FIXME** tab:
  
  ![StrataMetriq TODO/FIXME Dashboard Preview](/img/todo-fixme-dashboard.png)

* **💬 Commented Code Blocks:** Identifies blocks of dead, commented-out source code or inactive logic blocks spanning 2 or more consecutive lines.
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ MEDIUM RISK: Large Dead Commented-Out Code Blocks Spanning Multiple Lines
  /* 
  const oldCalculation = (a, b) => {
    return a * b + 15 - Math.random();
  };
  */

  // ✅ SAFE: Active Concise Logic & Single-Line Documentation Summaries
  const newCalculation = (a, b) => a * b + 15;
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq isolates dead commented blocks in files like `Role.jsx` (`[Line 200]`) and `Module.jsx` (`[Line 206]`) under the **Commented Code** tab:
  
  ![StrataMetriq Commented Code Dashboard Preview](/img/commented-code-dashboard.png)

* **⚰️ Dead Code:** Detects unreachable statements after `return`/`throw`/`break`, explicit unused code annotations, and hardcoded dead conditionals like `if (false)` or `while (0)`.
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ MEDIUM RISK: Unreachable Statements & Hardcoded Dead Conditionals
  function processOrder(order) {
    return order.total;
    console.log("This unreachable dead code will never execute!"); // Flagged!
  }
  if (false) { initLegacyBackup(); } // Hardcoded dead branch!

  // ✅ SAFE: Active Branching & Reachable Logic
  function calculateTotal(price, tax) {
    if (price <= 0) return 0;
    return price + tax;
  }
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq indexes dead code assertions like in `AssetReport.jsx` (`MEDIUM [Line 49] Dead code: Dead code detected...`) under the **Dead Code** tab:
  
  ![StrataMetriq Dead Code Dashboard Preview](/img/dead-code-dashboard.png)

* **🕳️ Empty Catch Blocks:** Identifies swallowed error exceptions where `try { ... } catch (e) {}` blocks contain zero error-handling logic.
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ MEDIUM RISK: Swallowed Exception with Zero Error Handling
  try {
    await syncUserDatabase();
  } catch (e) {
    // Empty catch! Silent failure hides critical bugs in production!
  }

  // ✅ SAFE: Proper Exception Handling & Error Reporting
  try {
    await syncUserDatabase();
  } catch (error) {
    logger.error("Database sync failed:", error);
    notifyMonitoringService(error);
  }
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq highlights swallowed error exceptions in `AssetReport.jsx` (`MEDIUM [Line 77] Empty catch blocks: Swallowed exception...`) under the **Empty Catch** tab:
  
  ![StrataMetriq Empty Catch Dashboard Preview](/img/empty-catch-dashboard.png)

* **📦 Dev & Testing Imports:** Flags production modules that erroneously import development-only packages (e.g., importing `redux-logger` or `@testing-library` inside user-facing components).
  
  **💡 Real-World Code Example (What is Flagged vs. What is Safely Ignored):**
  ```javascript
  // ❌ MEDIUM RISK: Development & Testing Packages Imported in User-Facing Bundle
  import { createLogger } from "redux-logger"; // Bloats production bundle!
  import { render, screen } from "@testing-library/react"; // Dev dependency!

  // ✅ SAFE: Clean Production Imports Only
  import { configureStore } from "@reduxjs/redux-toolkit";
  import React, { useState, useEffect } from "react";
  ```
  **📸 Interactive Dashboard Detection:**
  When caught, StrataMetriq identifies erroneous development package imports in files like `setupTests.jsx` (`[Line 1]`) and `App.test.jsx` (`[Line 1]`) under the **Dev Imports** tab:
  
  ![StrataMetriq Dev Imports Dashboard Preview](/img/dev-imports-dashboard.png)

### 💡 Extensibility & Custom Rule Roadmap (Adding New Features & Keywords)
A frequent question from enterprise engineering teams is: *"Can we check for additional features, company-specific keywords, or custom security rules beyond the standard 9-point checklist?"* **The answer is YES!**

StrataMetriq is built on an extensible, modular AST heuristic rule engine. Rather than hardcoding static regex checks, each security check is a self-contained rule object. This allows us (or enterprise teams) to seamlessly plug in custom keywords, compliance heuristics, or brand-new safety scanners without modifying the core parser!

#### 🚀 Top Potential Features & Keywords Available for Next-Gen Releases:
| Proposed Rule / Suite | Target Keywords & AST Patterns | Enterprise Value & Why It's Needed |
| :--- | :--- | :--- |
| **🔐 Insecure Cryptography** | `crypto.createHash('md5')`, `sha1`, `des`, `Math.random()` for auth tokens | Prevents broken encryption algorithms and weak hashing that can be cracked in seconds. |
| **💉 SQL / NoSQL Injection** | Raw string concat in queries: `"SELECT * FROM users WHERE id = '" + id` | Stops database destruction and unauthorized data exfiltration before deployment. |
| **🌐 Unsanitized DOM (XSS)** | `dangerouslySetInnerHTML`, `eval()`, `setTimeout("string")`, `document.write()` | Eliminates Cross-Site Scripting (XSS) risks that steal user session cookies. |
| **🐢 Memory Leaks (SPAs)** | Uncleaned `window.addEventListener()`, `setInterval()`, or `socket.on()` in `useEffect` | Prevents browser lag, memory bloat, and application crashes in React SPAs over time. |
| **🛑 Hardcoded Magic URLs** | Raw HTTP/IP endpoints (`http://api.staging.internal/v1` or `192.168.1.50`) | Forces teams to centralize API endpoints and environment variables in clean config files. |
| **⚡ Synchronous Blocking** | Node.js blocking calls: `fs.readFileSync()`, `fs.writeFileSync()` inside Express routes | Prevents synchronous file operations from freezing the Node.js event loop during high traffic. |
| **🔐 CORS Misconfigurations** | Permissive wildcard origins `cors({ origin: '*' })` or disabled CSRF protections | Secures API endpoints against unauthorized cross-origin API hijacking. |

:::tip One-Click Remediation & Custom Rules
Click any detected risk card in the UI to immediately open that exact source file and line number in VS Code! Have a custom keyword you need audited? Our heuristic rule array can be extended in seconds!
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

**💡 Real-World Architectural Example:**
If you modify `app.jsx`, StrataMetriq calculates its downstream blast radius by tracing every React child component (`<Main />`, `<Link />`, `<Container />`, `<Card />`, `<ActionColumn />`) that consumes its context or props.

**📸 Interactive Dashboard Preview:**
When inspecting a core module in your workspace, the dashboard gives you an immediate blast radius breakdown:

![StrataMetriq Risk Impact Analysis Dashboard Preview](/img/risk-impact-analysis.png)

---

## 3. 🌳 Interactive Dependency Explorer
Navigate your codebase through an interactive, visual dependency hierarchy rather than hunting through raw grep results.

**💡 Real-World Architectural Example (Direct Imports & Call Trees):**
Instead of manually guessing where a module is used, StrataMetriq maps the entire dependency hierarchy layer by layer:
```text
Role.jsx (React Permission Component)  [+25 more parent consumers]
       │  imports
       ▼
Main.jsx (Selected Root Module)
       │  direct imports (Layer 1)
       ▼
Child Components & Service Wrappers
```

**📸 Interactive Dashboard Preview:**
Notice how you can switch between inspecting direct Layer 1 imports and expanding the **Full Tree** view to trace multi-layer dependency chains:

![StrataMetriq Dependency Explorer Dashboard Preview](/img/dependency-explorer.png)

:::info Live VS Code Editor Synchronization
Notice the green **`[Open]`** badge appearing dynamically next to files that are currently open in your active VS Code editor tabs!
:::

---

## 4. 🔀 API Flow Visualizer
Trace the complete architectural lifecycle of HTTP requests from front-end user interactions down to database schema queries. Watch StrataMetriq's **Dynamic Entity Keyword Matching Engine** extract domain keywords without false positives.

**💡 Real-World End-to-End Flow Example:**
When filtering by the `Assets` module, StrataMetriq traces the entire full-stack request lifecycle across your workspace:
```text
[React Component] Assets.jsx  ➔  [HTTP Request] GET /asset_type  ➔  [Server Entry Point] server.js  ➔  [Route Handler] assets_type.router.js
```

**📸 Interactive Dashboard Preview:**
Click any endpoint (like `GET /asset_type` or `POST /asset_type/create`) to reveal the visual End-to-End Request & Lifecycle sidebar:

![StrataMetriq API Flow Visualizer Dashboard Preview](/img/api-flow-visualizer.png)

---

## 5. 👥 Duplicate Code & Circular Dependency Detection
Maintain a clean, DRY (Don't Repeat Yourself), and decoupled codebase by catching structural flaws early.

* **Duplicate Logic:** Evaluates lexical AST tokens across functions using Jaccard Similarity algorithms. Files sharing a similarity score above 70% (such as `AssetType.jsx` and `Assets.jsx` with an **81% match**) are flagged with actionable refactoring tips (*"Suggest creating a shared helper"*).
* **Circular Dependencies:** Detects tight coupling import loops caught by depth-first search algorithms (e.g., `App.jsx ➔ User.jsx ➔ App.jsx`).

**💡 Real-World Code Example (What is Flagged):**
```javascript
// ❌ DUPLICATE LOGIC MATCH (81% Similarity):
// AssetType.jsx and Assets.jsx implement identical data fetching & pagination table logic!

// ❌ CIRCULAR DEPENDENCY LOOP:
// App.jsx imports User.jsx, which in turn imports App.jsx back!
```

**📸 Interactive Dashboard Preview:**
In your dashboard, duplicate files are ranked by percentage match alongside tight coupling circular loop warnings:

![StrataMetriq Duplicate Logic and Circular Dependencies Dashboard Preview](/img/duplicate-circular-detection.png)

---

## 6. 📊 Architectural Health & Complexity Metrics
Monitor overall repository maintainability through three core high-level health gauges located at the top of your workspace dashboard. Click the glowing **`⚡ Run Deep Analysis`** button at any time to re-index your workspace.

* **Project Health Score (0% - 100%):** Evaluated from coupling density, duplicate code ratios, syntax error frequencies, and pre-deployment risk severity.
* **Complexity Index:** Measures the average number of imports and dependencies per file across the repository.
* **Graph Overview:** Displays total workspace files mapped and total cross-module import edges discovered.

**💡 Real-World Metric Breakdown Example:**
When StrataMetriq scans a medium-sized full-stack repository, it computes concrete metrics to give you an instant architectural pulse:
* **`91%` Project Health:** Indicates an exceptionally clean codebase with minimal circular loops or critical pre-deployment risks.
* **`4.33` Complexity Index:** Means each module imports an average of ~4.3 dependencies—a healthy ratio indicating well-decoupled, modular components (indices > 10 warn of monolithic "god files").
* **`609` Files Mapped & `2639` Imports Found:** Shows the exact scale of the AST structural dependency graph constructed by the scanner.

**📐 How the Health Score is Calculated (Exact Mathematical Formula):**
StrataMetriq calculates architectural health using transparent, deterministic formulas evaluated directly from your AST dependency graph:

1. **Workspace Project Health Formula (Top Dashboard Gauge):**
   First, StrataMetriq calculates the repository's **Complexity Index** (the average number of imports per file):
   ```text
   Complexity Index = Total Imports (Edges) ÷ Total Files Mapped (Nodes)
   ```
   Then, it maps this complexity directly into an overall percentage score bounded between **10%** and **100%**:
   ```text
   Project Health Score = MAX( 10% , MIN( 100% , 100 - (Complexity Index × 2) ) )
   ```
   *(Example: With `2639` imports across `609` files, the complexity index is `2639 ÷ 609 = 4.33`. The score is `100 - (4.33 × 2) = 91.34%` → **`91%`**!)*

2. **Individual Module Health Formula (Inspection Drawer & File Cards):**
   When inspecting an individual file, StrataMetriq evaluates its granular internal AST structure:
   ```text
   Module Complexity Score = MIN( 100 , Functions + (2 × Outgoing Imports) + (1.5 × Components Used) + (3 × API Calls) )

   Module Health Score = MAX( 10% , MIN( 100% , 100 - (10 × Syntax/Lint Errors) - (0.5 × Module Complexity Score) ) )
   ```
   *(Note: Each syntax error or unresolved lint problem reduces a file's health by **10%**, while excessive API calls and outgoing dependencies gradually weigh down the score to encourage decoupling).*

**🧠 Why We Use `MIN = 100%`, `MAX = 10%`, and `Complexity × 2` (Design Rationale):**
* **Why `MIN(100%, ...)`? (The Upper Bound):** You cannot have more than 100% health! In smaller repositories with very few dependencies, this cap prevents the percentage from accidentally overflowing past perfection (e.g., stopping 102% or 105%).
* **Why `MAX(10%, ...)`? (The Floor Bound):** Even the most tangled, legacy spaghetti codebase should never show `0%` or a negative health score (like `-15%`). Setting a solid floor at **10%** ensures the UI always renders a visible gauge and signals that the codebase is still functional and recoverable—just heavily in need of decoupling!
* **Why `Complexity × 2`? (The Coupling Penalty Multiplier):** In software architecture, every dependency a module imports adds exponential cognitive load and coupling risk.
  * Multiplying by **2** acts as a calibrated *Coupling Penalty Weight*—meaning each average import costs **2 percentage points** of overall project health.
  * At an average of 10 imports per file (`10 × 2 = 20` penalty → **80% health**), developers receive a mild structural warning.
  * At an average of 25 imports per file (`25 × 2 = 50` penalty → **50% health**), the system correctly alerts teams to tight coupling and monolithic "god files" that urgently need refactoring!

**📸 Interactive Dashboard Preview:**
Notice how these gauges give you an immediate high-level summary before diving into granular file inspections:

![StrataMetriq Architectural Health and Complexity Metrics Dashboard Preview](/img/architectural-health-metrics.png)

---

## 7. 🥊 Competitive Market Comparison (Why StrataMetriq?)
While established static analysis and dependency tools exist in the market, they often operate in silos—forcing development teams to juggle multiple SaaS dashboards, CLI scripts, and CI/CD pipelines. **StrataMetriq** unites structural AST graph intelligence, full-stack API tracing, and zero false-positive pre-deployment safety directly inside VS Code.

### 📊 Feature Matrix: StrataMetriq vs. Industry Alternatives

| Feature / Capability | **⚡ StrataMetriq** | **SonarQube** | **CodeScene** | **NDepend** | **Dependency Cruiser / Madge** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary Environment** | **Real-Time VS Code IDE** | External SaaS / CI Server | External SaaS Dashboard | Visual Studio / Windows CLI | Node.js Terminal CLI |
| **Setup & Configuration** | **Zero-Config (Instant)** | Heavy CI/CD Pipeline & Server Setup | Git Repo Synchronization | Complex Project XML Setup | Custom Rules Scripting (.js/.json) |
| **Pre-Deployment Guardrails** | **✅ Yes (Zero False-Positive Heuristics)** | ❌ No (Siloed General Code Smells) | ❌ No (Focuses on Git Churn) | ❌ No (.NET Metrics Focus) | ❌ No (Only Checks Import Rules) |
| **Full-Stack API Flow Tracing** | **✅ Yes (React ➔ HTTP ➔ Route ➔ DB)** | ❌ No (Language Siloed) | ❌ No (Language Siloed) | ❌ No (.NET Ecosystem Only) | ❌ No (Frontend/JS Module Links Only) |
| **Downstream Ripple Impact** | **✅ Yes (Files, APIs, Components, DB)** | ⚠️ Limited (File Level Only) | ⚠️ Limited (File Level Only) | ✅ Yes (.NET Assemblies) | ⚠️ Limited (Direct Module Dependents) |
| **Duplicate Logic Detection** | **✅ Yes (AST Jaccard Similarity + Refactor Tips)** | ✅ Yes (Basic Token Matching) | ⚠️ Limited (Code Redundancy via Churn) | ✅ Yes (.NET Only) | ❌ No |
| **Circular Dependency Loops** | **✅ Yes (Visual DFS Highlights & Editor Links)** | ⚠️ Limited (Project Level) | ❌ No | ✅ Yes (.NET Assemblies) | ✅ Yes (CLI Graph Output) |
| **Data Privacy & Telemetry** | **100% Local & Private (Zero Cloud Leaks)** | Cloud SaaS or On-Prem Server Required | Cloud SaaS or On-Prem Server Required | Windows Desktop License Required | Local Terminal CLI |
| **Target Ecosystems** | **Full-Stack (TS, JS, React, Node, Python, C#, etc.)** | Multi-Language | Multi-Language | **.NET / C# Only** | **JS / TS / Node Only** |

---

### 🔍 Deep-Dive Competitor Breakdown

#### 1. StrataMetriq vs. SonarQube
* **The Problem with SonarQube:** SonarQube is built for centralized CI/CD pipelines and DevOps compliance teams. It requires setting up dedicated servers, writing YAML configurations, and pushing code before developers can see results on an external web dashboard. It overwhelms teams with thousands of generic, low-priority "code smells."
* **The StrataMetriq Advantage:** StrataMetriq acts as an instant architectural copilot inside VS Code. It runs real-time AST analysis locally in memory as you type, isolating high-severity **Pre-Deployment Risks** (leaked AWS secrets, active debuggers, empty catch blocks) with zero false-positive precision without ever leaving your editor.

#### 2. StrataMetriq vs. CodeScene
* **The Problem with CodeScene:** CodeScene focuses heavily on behavioral code analysis by analyzing Git version control history and contributor churn to find hotspots. It does not provide real-time AST structural import graphs or full-stack request tracing.
* **The StrataMetriq Advantage:** Rather than looking backward at Git commit history, StrataMetriq analyzes your **live AST code structure** in real time. It calculates exact downstream ripple impacts (*"If I modify this function today, which 14 React components and 3 API routes will break?"*).

#### 3. StrataMetriq vs. NDepend (.NET)
* **The Problem with NDepend:** NDepend is a powerful structural static analysis tool, but it is strictly locked into the Microsoft Visual Studio and **.NET / C# ecosystem**. It comes with a steep learning curve and expensive enterprise licensing.
* **The StrataMetriq Advantage:** StrataMetriq is built for modern, heterogeneous **Full-Stack Polyglot repositories** (TypeScript, JavaScript, React, Node.js, Python, Go, Java, C#, etc.), providing intuitive visual graphs and instant VS Code navigation at a fraction of the complexity.

#### 4. StrataMetriq vs. Dependency Cruiser & Madge
* **The Problem with Madge / Dependency Cruiser:** While these are excellent open-source command-line tools for finding circular dependencies in Node.js/TypeScript projects, they are terminal-bound CLI utilities. They output static SVG/DOT images or terminal logs, requiring manual script configuration and rules parsing.
* **The StrataMetriq Advantage:** StrataMetriq transforms static graph data into an **interactive, clickable visual dashboard**. Clicking any circular loop warning or dependency node immediately jumps straight to the exact file and line number in your active VS Code editor tab! Furthermore, Madge and Dependency Cruiser cannot trace full-stack HTTP request lifecycles or detect pre-deployment secret leaks.

---

## 8. 🔒 Licensing, Privacy & Marketplace Distribution Policy
StrataMetriq is distributed as a publicly available extension on the official **Microsoft Visual Studio Code Marketplace**, while maintaining a proprietary, closed-source core repository. This dual architecture ensures maximum accessibility for individual developers alongside enterprise-grade intellectual property protection.

### 🌟 Why We Use a Private Repository & Closed-Source Model
1. **Zero Tampering & Enterprise Security:** By keeping our core AST parser, Jaccard similarity algorithms, and heuristic risk engines in a secure, private GitHub repository, we guarantee that the official extension binary distributed on the VS Code Marketplace is 100% authentic, tamper-proof, and free from malicious third-party code injections.
2. **Local Privacy Guarantee:** Even though the source code is proprietary, **your source code never leaves your machine.** All AST parsing, structural dependency graph calculations, and pre-deployment risk audits execute entirely within your local VS Code memory process. No telemetry or proprietary code snippets are ever transmitted to external cloud servers.
3. **Sustainable Professional Development:** Protecting our intellectual property prevents unauthorized rebranding or commercial repackaging by third-party corporations. This allows us to offer the local analysis extension **100% free for individual developers** while building sustainable, dedicated enterprise features for engineering teams.

### 🤝 Community Feedback & Support
While our core backend repository is private, we believe in radical transparency and community collaboration:
* **Public Documentation:** Our complete Docusaurus handbook, real-world architecture examples, and mathematical formulas are publicly accessible.
* **Feature Requests & Bug Reporting:** We maintain a public community tracker where developers can report bugs, request new heuristics, and vote on upcoming roadmap features.
