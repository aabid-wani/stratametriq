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
Monitor overall repository maintainability through three core health gauges:
* **Project Health Score (0% - 100%):** Evaluated from coupling density, duplicate code ratios, syntax error frequencies, and pre-deployment risk severity.
* **Complexity Index:** Measures the average number of imports and dependencies per file.
* **Graph Overview:** Displays total workspace files mapped, total cross-module edges discovered, and total database tables identified.
