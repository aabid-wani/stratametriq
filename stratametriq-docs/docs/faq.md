---
sidebar_position: 8
title: 🛡️ Security, Privacy & FAQ
---

# Security Guarantee & Frequently Asked Questions

Here are answers regarding our enterprise security guarantees, API key requirements, data privacy, and technical compatibility.

---

## 🔒 Enterprise Security & Privacy Guarantee

### Q1: Do I need an API key to use StrataMetriq? Is there any cost or subscription?
**No! StrataMetriq is 100% Free and Requires Zero API Keys.**

When we state that StrataMetriq is powered by *"Microsoft's TypeScript compiler API,"* the term **"API" (Application Programming Interface)** refers exclusively to the built-in, open-source programming library (`npm install typescript`) that runs locally inside Node.js. It does **not** refer to a remote web service or cloud AI API (such as OpenAI, AWS, or Google Cloud). 
* You do not need to register for an account.
* You do not need to generate or paste any secret API keys.
* There are zero per-token charges or monthly subscription fees. Everything runs locally and for free!

---

### Q2: Is my code safe? Can enterprise organizations trust this extension with proprietary source code?
**Yes! Zero Risk, Zero Exfiltration, and 100% Air-Gapped Local Security.**

We understand that enterprise organizations and security teams must protect their intellectual property. StrataMetriq is engineered from the ground up with a **Zero Exfiltration Guarantee**:
* **100% Local Execution:** All Abstract Syntax Tree (AST) parsing, risk heuristic evaluations, duplicate code detection, and ripple effect calculations are executed entirely within your local machine's memory (RAM) by the VS Code extension host process.
* **No Network Transmissions:** StrataMetriq does not send your code, file names, API routes, or database schemas to any remote cloud servers, third-party analytics services, or external AI providers.
* **Air-Gap Compatible:** You can disconnect your computer from WiFi and run StrataMetriq in a completely offline, air-gapped environment with 100% full functionality. Your source code never leaves your IDE.

---

### Q3: Could installing this extension cause virus issues for my computer or damage my project's codebase?
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

## 🛠️ Technical Compatibility & Performance

### Q4: Does StrataMetriq work with all databases (SQL, MySQL, PostgreSQL, and MongoDB)?
**Yes.** StrataMetriq is database-agnostic. Because it analyzes your application's Abstract Syntax Tree (AST) and connection strings rather than connecting directly to a live database server, it seamlessly detects and maps queries for **PostgreSQL**, **MySQL**, **SQLite**, **Microsoft SQL Server**, and NoSQL databases like **MongoDB** and **Redis**. It identifies database table usage by scanning ORM models (Prisma, Mongoose, Sequelize, TypeORM, Knex) and raw SQL query strings.

---

### Q5: Why does the dashboard say "Run Deep Analysis" when I first open it?
To prevent IDE slowdowns during initial startup, StrataMetriq performs a lightweight initialization. Click **Run Deep Analysis** whenever you want to generate a fresh, deep AST dependency scan of your workspace.

---

### Q6: How does StrataMetriq prevent false positives when scanning for secrets or database tables?
Our scanner utilizes contextual AST evaluation rather than simple regex matching. For example:
* It automatically ignores dynamic template literals like `${process.env.DATABASE_URL}` when flagging hardcoded secrets.
* It evaluates import contexts to ensure frontend utility files (e.g., `reportWebVitals.js` or browser storage calls) are never falsely classified as database repositories or leaked credentials.
