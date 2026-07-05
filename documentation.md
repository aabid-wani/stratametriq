# StrataMetriq: Comprehensive End-to-End User Manual & Technical Architecture Guide (v1.1.0)

> **🌐 Official GitHub Repository:** [https://github.com/aabid-wani/stratametriq](https://github.com/aabid-wani/stratametriq)  
> **📦 VS Code Marketplace:** `stratometriq.stratometriq-extension`

Welcome to the authoritative engineering guide and user manual for **StrataMetriq**, an enterprise-grade Visual Studio Code extension designed to deliver **Architecture Intelligence & Pre-Deployment Safety** for full-stack JavaScript and TypeScript codebases. 

This comprehensive document serves both **end-users** (developers utilizing the tool for daily safety audits and architectural discovery) and **software contributors** (engineers extending, building, and publishing the StrataMetriq ecosystem).

---

## 📑 Table of Contents
1. [Executive Summary & Value Proposition](#1-executive-summary--value-proposition)
2. [Technical Architecture & Monorepo System Design](#2-technical-architecture--monorepo-system-design)
3. [Quick Start: How to Launch & Scan](#3-quick-start-how-to-launch--scan)
4. [Complete Feature Manual & User Guide](#4-complete-feature-manual--user-guide)
   - [4.1 Pre-Deployment Safety Audit (9-Point Checklist)](#41-pre-deployment-safety-audit-9-point-checklist)
   - [4.2 Risk Impact Analysis (Downstream Ripple Effect)](#42-risk-impact-analysis-downstream-ripple-effect)
   - [4.3 Interactive Dependency Explorer](#43-interactive-dependency-explorer)
   - [4.4 API Flow Visualizer](#44-api-flow-visualizer)
   - [4.5 Duplicate Code & Circular Dependency Detection](#45-duplicate-code--circular-dependency-detection)
   - [4.6 Architectural Health & Complexity Metrics](#46-architectural-health--complexity-metrics)
5. [Interactive Controls & UI Reference](#5-interactive-controls--ui-reference)
6. [Developer Guide & Monorepo Build Instructions](#6-developer-guide--monorepo-build-instructions)
7. [Publishing & Marketplace Deployment Guide](#7-publishing--marketplace-deployment-guide)
8. [Troubleshooting & Frequently Asked Questions (FAQ)](#8-troubleshooting--frequently-asked-questions-faq)
9. [Repository & Package File Reference](#9-repository--package-file-reference)

---

## 1. Executive Summary & Value Proposition

In modern software organizations, engineers frequently grapple with hidden architectural debt, tangled module dependencies, and accidental production leaks (such as exposed API keys, debug logs, or unfinished TODOs). To gain comprehensive visibility, developers typically must stitch together **3 to 4 separate, expensive tools**—such as static code analyzers, secret scanners, dependency visualizers, and duplicate code detectors.

**StrataMetriq** unifies these capabilities into a single, native VS Code experience:
* **360° Architectural Visibility:** Natively maps your entire workspace dependency graph, API routing topology, and database interactions in real time.
* **Zero Cloud Exfiltration:** Unlike SaaS code scanners that upload proprietary source code to remote servers, StrataMetriq performs **100% of its Abstract Syntax Tree (AST) parsing and graph calculations locally** on your machine. Your code never leaves your IDE.
* **Non-Blocking Performance:** Engineered with highly optimized tokenizers and TypeScript AST evaluators that parse thousands of lines of code in seconds without freezing or slowing down your editor.

---

## 2. Technical Architecture & Monorepo System Design

StrataMetriq is architected as a clean, decoupled monorepo workspace structured into specialized layers:

```mermaid
graph TD
    subgraph Core Engine Workspaces
        SHARED["@stratometriq/shared\n(Data Contracts & Graph Interfaces)"]
        SCANNER["@stratometriq/scanner\n(TypeScript AST Parser & Risk Evaluator)"]
        AI["@stratometriq/ai\n(Architectural Intelligence & Insights)"]
        RUNTIME["@stratometriq/runtime\n(Runtime Diagnostics & Utilities)"]
    end

    subgraph Presentation & Editor Integration
        DASHBOARD["dashboard\n(React 19 + Vite + Glassmorphism UI)"]
        EXT["stratometriq-extension\n(VS Code Extension Host & Webview Bridge)"]
    end

    SCANNER --> SHARED
    AI --> SHARED
    RUNTIME --> SHARED
    DASHBOARD --> SHARED
    EXT --> SCANNER
    EXT --> SHARED
    EXT --> DASHBOARD
```

### Workspace Module Breakdown:
1. **[`@stratometriq/shared`](file:///d:/codeVision/shared):** The foundational data contract layer. Defines core TypeScript interfaces (`Node`, `Edge`, `Graph`, `DuplicatePair`, `ProductionRisk`) ensuring type safety between the backend AST parser and the frontend React UI.
2. **[`@stratometriq/scanner`](file:///d:/codeVision/scanner):** The heavy-lifting AST engine powered by Microsoft's `typescript` compiler API. It scans `.ts`, `.tsx`, `.js`, and `.jsx` files, extracts imports/exports, maps Express/HTTP router endpoints, evaluates syntax errors, and runs lexical tokenization for duplicate detection.
3. **[`@stratometriq/ai`](file:///d:/codeVision/ai):** Provides intelligent heuristic evaluations and architectural recommendations.
4. **[`@stratometriq/runtime`](file:///d:/codeVision/runtime):** Helper utilities for evaluating runtime execution traces and environment configurations.
5. **[`dashboard`](file:///d:/codeVision/dashboard):** A responsive, high-performance webview built with **React 19**, **Vite 8**, and **@xyflow/react**. It renders dynamic visual trees, glassmorphic inspection cards, and real-time filtering pills. Built as a single-file inline bundle for seamless VS Code embedding.
6. **[`stratometriq-extension`](file:///d:/codeVision/extension):** The host wrapper that registers VS Code commands (`stratometriq.start`), manages the webview lifecycle, handles bi-directional message passing, and triggers editor tab synchronization.

---

## 3. Quick Start: How to Launch & Scan

1. **Install the Extension:** 
   * Open Visual Studio Code and press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS).
   * Type and select **`Extensions: Install from VSIX...`**.
   * Choose the bundled extension file: [`stratometriq-extension-1.1.0.vsix`](file:///d:/codeVision/extension/stratometriq-extension-1.1.0.vsix).
2. **Reload Window:** Press `Ctrl+Shift+P` ➔ **`Developer: Reload Window`** to ensure all extension registries and AST parsing engines are cleanly initialized.
3. **Open Dashboard:** Click the **StrataMetriq** icon in your VS Code Activity Bar, or launch the command palette (`Ctrl+Shift+P`) and execute: **`StrataMetriq: Open Dashboard`**.
4. **Scan Your Workspace:** Click the glowing **Run Deep Analysis** button at the top right of the dashboard. StrataMetriq will instantly parse your codebase and generate your interactive architectural map!

---

## 4. Complete Feature Manual & User Guide

### 4.1 Pre-Deployment Safety Audit (9-Point Checklist)
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
  
  ![StrataMetriq Secrets Dashboard Preview](./secrets-dashboard.png)

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
  
  ![StrataMetriq Debug Code Dashboard Preview](./debug-code-dashboard.png)

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
  
  ![StrataMetriq Temp Code Dashboard Preview](./temp-code-dashboard.png)

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
  
  ![StrataMetriq Test Data Dashboard Preview](./test-data-dashboard.png)

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
  
  ![StrataMetriq TODO/FIXME Dashboard Preview](./todo-fixme-dashboard.png)

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
  
  ![StrataMetriq Commented Code Dashboard Preview](./commented-code-dashboard.png)

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
  
  ![StrataMetriq Dead Code Dashboard Preview](./dead-code-dashboard.png)

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
  
  ![StrataMetriq Empty Catch Dashboard Preview](./empty-catch-dashboard.png)

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
  
  ![StrataMetriq Dev Imports Dashboard Preview](./dev-imports-dashboard.png)

**💡 How to use:**
* Look at the top status banner: glowing **`✅ Ready for Production`** indicates zero critical risks, whereas a high-alert **`⛔ DO NOT DEPLOY`** warns of active vulnerabilities.
* Click filter buttons (`🔑 Secrets`, `🐞 Debug Code`, `📌 TODOs`, etc.) to isolate specific risk categories.
* **One-Click Remediation:** Click any detected risk card in the UI to immediately open that exact source file and line number in VS Code!

---

### 4.2 Risk Impact Analysis (Downstream Ripple Effect)
Answer the most critical engineering question before refactoring: *"If I modify or delete this file, what else breaks across my entire application?"*

**💡 How to use:**
* Click any file node in the **Most Complex Modules** list or inside the **Dependency Explorer**.
* Review the **⚠️ Risk Impact Analysis** section in the right-hand inspection drawer.
* Check the concrete **Risk Severity Badge** (`HIGH`, `MEDIUM`, or `LOW`) calculated from downstream coupling density.
* Review the categorized breakdown of every dependent component affected by changes to this file:
  * 🌐 **Affected APIs:** HTTP endpoints and routing controllers triggered by this module.
  * 🧩 **Affected Components / Modules:** Upstream files and React components importing this code.
  * 🗄️ **Affected Database Tables:** Database tables, collections, and ORM schemas accessed by this module.
  * 📊 **Affected Reports & Views:** UI dashboards and frontend views reliant on data streams originating here.

---

### 4.3 Interactive Dependency Explorer
Navigate your codebase through an interactive, visual dependency hierarchy rather than hunting through raw grep results.

**💡 How to use:**
* Select any file node to inspect its incoming and outgoing module relationships:
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
* **Live VS Code Editor Synchronization:** Notice the green **`[Open in Editor]`** badge appearing dynamically next to files that are currently open in your active VS Code editor tabs.
* Click any node in the tree to instantly switch focus to that file in your editor.

---

### 4.4 API Flow Visualizer
Trace the complete architectural lifecycle of HTTP requests from front-end user interactions down to database schema queries.

**💡 How to use:**
* Scroll to the **🔀 StrataMetriq API Flow Visualizer** section on the dashboard.
* Select an API endpoint (e.g., `GET /api/vendors`, `POST /api/orders`, or `DELETE /users/:id`).
* Watch StrataMetriq's **Dynamic Entity Keyword Matching Engine** extract domain keywords (like `'vendor'` or `'order'`) to map out the entire vertical request lifecycle without false-positive matches:
  ```text
  UI Component  ➔  HTTP Client  ➔  API Route  ➔  Controller  ➔  Middleware  ➔  Service  ➔  ORM / Repo  ➔  Database Table
  ```
* Each step displays the precise file handling that architectural layer. Click any card to jump directly to the implementation!

---

### 4.5 Duplicate Code & Circular Dependency Detection
Maintain a clean, DRY (Don't Repeat Yourself), and decoupled codebase by catching structural flaws early.

**💡 How to use:**
* Examine the **Duplicate Logic** card on the right column of the dashboard. StrataMetriq extracts and normalizes lexical AST tokens across functions and runs a Jaccard Similarity algorithm. Files sharing an similarity score above 85% (e.g., `92% match`) are flagged with actionable refactoring tips (e.g., *"Suggest creating a shared helper utility"*).
* Examine the **Circular Dependencies** card below it to view tight coupling import loops caught by depth-first search algorithms (e.g., `ModuleA.ts ➔ ModuleB.ts ➔ ModuleC.ts ➔ ModuleA.ts`).
* Click any file name in either card to jump to the editor and break the cycle or extract shared helpers.

---

### 4.6 Architectural Health & Complexity Metrics
Monitor overall repository maintainability through three core health gauges:
* **Project Health Score (0% - 100%):** A holistic score calculated by evaluating dependency coupling density, duplicate code ratios, syntax error frequencies, and pre-deployment risk severity.
* **Complexity Index:** Measures the average number of imports and dependencies per file, alerting you to tangled spaghetti code before it becomes unmaintainable.
* **Graph Overview:** Displays the total number of workspace files mapped, total cross-module edges discovered, and total database tables identified.

---

## 5. Interactive Controls & UI Reference

| Feature / Control | Visual Indicator | Action & Behavior |
| :--- | :--- | :--- |
| **`[Open in Editor]` Badge** | Green Pill Badge | Automatically highlights files currently open in an active VS Code editor tab for instant orientation. |
| **Clickable Cards & Nodes** | Hover Glow Effect | Clicking any file card, risk alert, or tree node immediately opens that source file at the exact line number in VS Code. |
| **Filter Pills** | Selectable Buttons (`Secrets`, `Debug Code`, etc.) | Filters the Pre-Deployment Safety list to display only the selected category of vulnerability. |
| **Inspection Drawer** | Slide-out Right Panel | Displays detailed syntax diagnostics, risk impact ripple breakdowns, and dependency trees for the selected module. |
| **Run Deep Analysis** | Primary Action Button (Top Right) | Triggers a full re-scan of the workspace AST graph after making code edits or resolving issues. |

---

## 6. Developer Guide & Monorepo Build Instructions

If you are contributing to the StrataMetriq codebase or compiling the extension from source, follow these instructions:

### Prerequisites
* **Node.js:** v18.x or v20.x recommended.
* **npm:** v9.x or later.
* **Visual Studio Code:** v1.80.0 or higher.

### Step 1: Install Workspace Dependencies
Run the install command from the root repository directory to link all monorepo workspaces:
```bash
npm install
```

### Step 2: Compile All Workspaces
To compile the TypeScript source code across `@stratometriq/shared`, `@stratometriq/scanner`, `@stratometriq/ai`, and `@stratometriq/runtime`, run:
```bash
npm run build
```

### Step 3: Build the React Dashboard Webview
The React UI must be compiled and bundled into a single inline HTML/JS/CSS package so that it can be loaded inside VS Code webviews without external server dependencies:
```bash
cd dashboard
npm run build
cd ..
```
*Note: This utilizes `vite-plugin-singlefile` to output a self-contained bundle into `dashboard/dist/index.html`.*

### Step 4: Bundle and Package the VS Code Extension (VSIX)
To package the compiled extension into a distributable `.vsix` file using `esbuild` and `@vscode/vsce`:
```bash
cd extension
npm run package
npx @vscode/vsce package
cd ..
```
This generates the final installable artifact: **`extension/stratometriq-extension-1.1.0.vsix`**.

---

## 7. Publishing & Marketplace Deployment Guide

When publishing StrataMetriq to the public **Visual Studio Code Marketplace** or an internal enterprise marketplace, ensure the following requirements are met:

1. **Extension Icon:** An icon file (`icon.png`, 128x128 PNG format) is included in the root of the `extension/` directory and referenced in `extension/package.json` under `"icon": "icon.png"`.
2. **Publisher Account:**
   * Create a publisher profile on the [Visual Studio Code Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
   * Ensure your `"publisher"` ID in `extension/package.json` matches your marketplace publisher ID (`"stratometriq"`).
3. **Personal Access Token (PAT):**
   * Generate an Azure DevOps Personal Access Token with **Marketplace (Publish)** scopes.
4. **Login & Publish via CLI:**
   ```bash
   cd extension
   npx @vscode/vsce login stratometriq
   npx @vscode/vsce publish
   ```

---

## 8. Troubleshooting & Frequently Asked Questions (FAQ)

### 🔒 Enterprise Security & Privacy Guarantee

#### Q1: Do I need an API key to use StrataMetriq? Is there any cost or subscription?
**No! StrataMetriq is 100% Free and Requires Zero API Keys.**
When we state that StrataMetriq is powered by *"Microsoft's TypeScript compiler API,"* the term **"API" (Application Programming Interface)** refers exclusively to the built-in, open-source programming library (`npm install typescript`) that runs locally inside Node.js. It does **not** refer to a remote web service or cloud AI API (such as OpenAI, AWS, or Google Cloud). 
* You do not need to register for an account.
* You do not need to generate or paste any secret API keys.
* There are zero per-token charges or monthly subscription fees. Everything runs locally and for free!

#### Q2: Is my code safe? Can enterprise organizations trust this extension with proprietary source code?
**Yes! Zero Risk, Zero Exfiltration, and 100% Air-Gapped Local Security.**
We understand that enterprise organizations and security teams must protect their intellectual property. StrataMetriq is engineered from the ground up with a **Zero Exfiltration Guarantee**:
* **100% Local Execution:** All Abstract Syntax Tree (AST) parsing, risk heuristic evaluations, duplicate code detection, and ripple effect calculations are executed entirely within your local machine's memory (RAM) by the VS Code extension host process.
* **No Network Transmissions:** StrataMetriq does not send your code, file names, API routes, or database schemas to any remote cloud servers, third-party analytics services, or external AI providers.
* **Air-Gap Compatible:** You can disconnect your computer from WiFi and run StrataMetriq in a completely offline, air-gapped environment with 100% full functionality. Your source code never leaves your IDE.

#### Q3: Could installing this extension cause virus issues for my computer or damage my project's codebase?
**No! Zero Virus Risk & 100% Read-Only Codebase Safety.**
We provide two ironclad guarantees regarding the safety of your computer and your repository:
1. **100% Virus-Free & Official Marketplace Verification:**
   * When downloaded from the official **Microsoft Visual Studio Code Marketplace**, our `.vsix` package undergoes rigorous automated virus scanning, malware detection, and integrity verification by Microsoft before publication.
   * StrataMetriq contains **zero executable binaries (.exe, .dll, .bat)**, no cryptocurrency miners, no telemetry trackers, and no obfuscated scripts. It is built purely with standard, sandboxed Node.js and TypeScript code executing inside VS Code's secure extension host process.
   * You can inspect 100% of our open-source codebase on GitHub to verify our clean architectural implementation.
2. **100% Read-Only Safety (Will Never Modify or Damage Your Code):**
   * StrataMetriq operates in a **strict read-only analysis mode**.
   * When you click **Run Deep Analysis**, our parser reads your `.ts`, `.js`, `.tsx`, and `.jsx` files into computer memory to build an Abstract Syntax Tree (AST). It **never modifies, overwrites, formats, deletes, or mutates** a single byte of your existing source files.
   * Your git repository, build artifacts, package files, and project dependencies remain untouched and completely safe.

---

### 🛠️ Technical Compatibility & Performance

#### Q4: Does StrataMetriq work with all databases (SQL, MySQL, PostgreSQL, and MongoDB)?
**Yes.** StrataMetriq is database-agnostic. Because it analyzes your application's Abstract Syntax Tree (AST) and connection strings rather than connecting directly to a live database server, it seamlessly detects and maps queries for **PostgreSQL**, **MySQL**, **SQLite**, **Microsoft SQL Server**, and NoSQL databases like **MongoDB** and **Redis**. It identifies database table usage by scanning ORM models (Prisma, Mongoose, Sequelize, TypeORM, Knex) and raw SQL query strings.

#### Q5: Why does the dashboard say "Run Deep Analysis" when I first open it?
To prevent IDE slowdowns during initial startup, StrataMetriq performs a lightweight initialization. Click **Run Deep Analysis** whenever you want to generate a fresh, deep AST dependency scan of your workspace.

#### Q6: How does StrataMetriq prevent false positives when scanning for secrets or database tables?
Our scanner utilizes contextual AST evaluation rather than simple regex matching. For example:
* It automatically ignores dynamic template literals like `${process.env.DATABASE_URL}` when flagging hardcoded secrets.
* It evaluates import contexts to ensure frontend utility files (e.g., `reportWebVitals.js` or browser storage calls) are never falsely classified as database repositories or leaked credentials.

---

## 9. Repository & Package File Reference

* **Workspace Root Config:** [`package.json`](file:///d:/codeVision/package.json)
* **Extension Package Manifest:** [`extension/package.json`](file:///d:/codeVision/extension/package.json)
* **Extension Activation & Command Host:** [`extension/src/extension.ts`](file:///d:/codeVision/extension/src/extension.ts)
* **Core AST Scanner Engine:** [`scanner/src/parser.ts`](file:///d:/codeVision/scanner/src/parser.ts)
* **Shared Data Contracts & Interfaces:** [`shared/src/index.ts`](file:///d:/codeVision/shared/src/index.ts)
* **Dashboard React UI Hub:** [`dashboard/src/App.tsx`](file:///d:/codeVision/dashboard/src/App.tsx)
* **Dashboard Styling & Grid Layouts:** [`dashboard/src/App.css`](file:///d:/codeVision/dashboard/src/App.css)
* **Bundled VSIX Package:** [`extension/stratometriq-extension-1.1.0.vsix`](file:///d:/codeVision/extension/stratometriq-extension-1.1.0.vsix)

---
*StrataMetriq v1.1.0 — Architecture Intelligence & Pre-Deployment Safety in VS Code.*
