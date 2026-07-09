# StrataMetriq 📐
*Architecture Intelligence & Pre-Deployment Safety in VS Code*

[![GitHub](https://img.shields.io/badge/GitHub-aabid--wani%2Fstratametriq-181717?style=flat&logo=github)](https://img.shields.io/badge/GitHub-aabid--wani%2Fstratametriq-181717?style=flat&logo=github) [![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-stratametriq-007ACC?style=flat&logo=visual-studio-code)](https://marketplace.visualstudio.com/)  
**🌐 Official GitHub Repository:** [https://github.com/aabid-wani/stratametriq](https://github.com/aabid-wani/stratametriq)

**StrataMetriq** is an enterprise-grade VS Code extension designed to act as an advanced architectural diagnostic tool for full-stack polyglot codebases (JavaScript, TypeScript, Python, Java, Go, C#, Ruby, PHP, Rust, C++). It transforms abstract technical debt into visual graphs, maps out end-to-end API request lifecycles across different backend languages, and automatically enforces a strict pre-deployment safety audit before code ever reaches production.

---

## 🌟 Key Features & Superpowers

### 🌐 Full-Stack Enterprise Polyglot Architecture Support (NEW in v1.4.1)
StrataMetriq natively parses ASTs and framework semantics across modern multi-language enterprise repositories without needing external interpreters or heavy IDE plugins:
* **Supported Languages**: Python (`.py`), Java (`.java`), Kotlin (`.kt`), Go (`.go`), C# (`.cs`), JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`), Ruby (`.rb`), PHP (`.php`), Rust (`.rs`), C++ (`.cpp`), and C (`.c`).
* **Enterprise Backend Frameworks**: Natively detects API routes and ORM entities for Python **FastAPI / Django**, Java & Kotlin **Spring Boot / JPA**, C# **ASP.NET Core / Entity Framework**, and Go **Gin / Echo / GORM**.
* **Cross-Stack Vertical Flow**: Traces frontend API calls (`fetch('/api/users')`) directly into backend framework endpoints (`@GetMapping(...)`, `@app.get(...)`, `r.GET(...)`), linking all the way down to ORM database tables (`__tablename__`, `@Table`).

### 🛡️ Automated 13-Point Pre-Deployment DevSecOps Safety Audit
Before deploying your application, StrataMetriq scans 100% of your codebase in seconds to ensure no debugging artifacts, credentials, or insecure patterns leak into production. It displays a glowing `✅ Ready for Production` badge or a high-alert `⛔ DO NOT DEPLOY` banner.
* **🔑 Hardcoded Secrets & Credentials**: Detects API keys, JWT tokens, AWS credentials, passwords, and hardcoded IPs/connection strings with **Zero False-Positive Precision**.
* **💉 SQL Injection & Query Concatenation**: Identifies dangerous raw SQL string concatenation inside database queries.
* **🔓 Insecure Cryptography**: Detects usage of obsolete hashing algorithms (`MD5`, `SHA1`).
* **🐞 Active Debug Code**: Identifies active `console.log`, `print()`, `System.out.println()`, `fmt.Println()`, `debugger;`, and `alert()` statements.
* **🚧 Temporary Code & TODO Notes**: Highlights developer hack annotations (`// WIP`, `// HACK`, `// TEMP`, `TODO`, `FIXME`).
* **💬 Large Commented Code Blocks**: Flags commented-out logic blocks (reported as informational without penalizing your Project Health Score).
* **⚰️ Dead Code & Unused Imports**: Flags unreachable statements after `return`/`throw`, dead branches, and unused development dependencies.

### 📊 SARIF 2.1.0 Export & CI/CD Security Pipeline Integration
StrataMetriq outputs standard **OASIS SARIF 2.1.0** reports (`--sarif results.sarif`) so your security team can ingest architectural risks and vulnerabilities directly into **GitHub Advanced Security** or **GitLab Security Center** Pull Request diff tabs.

### 2. 🔀 Dynamic API Request Lifecycle Visualizer
Click any API endpoint in your project (e.g., `GET /role/:name`, `GETVENDOR /vendors`, or `POST /api/users`) to generate an instant vertical trace of the request flow across your full-stack architecture.
* Powered by our **Dynamic Entity Keyword Matching Engine**, which extracts domain keywords (like `'role'` or `'vendor'`) to accurately map layers without false matches:
  1. **React Component**: The frontend UI component triggering the call (e.g., `RoleList.jsx`).
  2. **HTTP Request**: Network layer (`Axios` or `fetch`).
  3. **Route Handler**: Express or Next.js API Router endpoint.
  4. **Controller**: Request validation and routing controller (`RoleController.js`).
  5. **Middleware**: Security, CORS, and authentication verifiers (`authMiddleware`).
  6. **Service Layer**: Core business logic execution (`RoleService.js`).
  7. **Repository Layer**: ORM queries and data access models (`RoleRepository.js` — *strictly protected against matching frontend report utilities like `reportWebVitals.jsx`*).
  8. **Database Table**: SQL / NoSQL storage table (`🛢️ roles_table`).
  9. **HTTP Response**: JSON payload serialization (`200 OK`).
  10. **React UI Update**: DOM mutation and state re-rendering.

### 3. ⚡ Risk Impact Analysis ("What breaks if I touch this file?")
When you click any file in the dashboard, StrataMetriq calculates its downstream ripple effect and assigns a concrete **Risk Level (`HIGH`, `MEDIUM`, `LOW`)**.
* Categorizes exact dependencies that rely on this file:
  * **API Endpoints Affected**: Routes that will fail if the logic breaks.
  * **Database Tables Coupled**: Schemas tied to this module.
  * **Downstream Components**: Frontend UI views depending on this service.

### 4. 🌳 Interactive Dependency Explorer & Multi-Layer Tree
Provides an interactive, hierarchical tree graph (`Root Module ➔ Controller ➔ Service ➔ Database Table`).
* **Real-Time Editor Sync**: Automatically monitors your open editor tabs in VS Code and displays live **`[Open]`** or **`[Closed]`** badges next to each module in the graph!
* **Global Search & Quick-Filter Toolbar**: Instantly search across module names, API routes, or database tables, or toggle 1-click filter pills (`All Modules`, `⚠️ High Risks`, `📂 Open Tabs`, `🔄 Circular Loops`).
* **Interactive Line Jumping**: Click glowing **`↗ Line X`** action buttons on any risk finding or duplicate logic pair to jump straight to that exact line in VS Code.

### 5. 👥 Duplicate Code & 🔄 Circular Dependency Detection
Automatically scans token overlap across your workspace to identify copy-pasted business logic between different files, and executes a high-speed DFS cycle detection algorithm to catch import loops.
* **Duplicate Logic**: Displays duplicate pairs with similarity percentages (e.g., `92% Similarity`) and actionable DRY refactoring guidance.
* **Circular Dependencies**: Flags tight coupling loops (e.g., `Module A ➔ Module B ➔ Module A`) with dedicated alert cards and one-click editor jumping to help you decouple architecture cleanly.

### 6. 📊 Architectural Health Scoring, Status Bar & Live Inline Diagnostics
Quantifies your project's technical debt into clear, actionable visibility:
* **Project Health Score (0% – 100%)**: A high-level gauge of overall codebase maintainability, safety, and separation of concerns.
* **Complexity Index**: Measures the average dependency density per module to highlight tight coupling and spaghetti code.
* **Persistent VS Code Status Bar Badge**: Displays live project health and high-severity risk counts directly in your bottom-right status bar (`🛡️ StrataMetriq: Ready` / `🚨 StrataMetriq: 2 High Risks`).
* **Live Inline Editor Diagnostics**: Attaches warning and error squiggles directly to active debug statements, hardcoded secrets, and empty catch blocks while you type or save files.

### 7. 🎨 Executive JSON Audit Export & Actionable Remediation Guides
* **One-Click Executive Audit Export (`📥 Export Audit JSON`)**: Download a complete JSON audit report of project health, duplicate pairs, circular loops, and high-severity findings directly from the webview header.
* **Actionable `💡 Fix` Remediation Guides**: Both the headless CLI (`stratametriq scan .`) and automated Markdown PR comments output clear 1-line remediation instructions below every high-severity finding.

### 8. 🏛️ Enterprise Custom Architecture Governance (`stratametriq.config.yml`)
Enforce organizational architecture standards across your monorepo or layered application. Define forbidden import boundaries in a root `stratametriq.config.yml` file:
```yaml
version: 1
rules:
  - name: "UI layer cannot import Database layer directly"
    source: "src/ui/**"
    forbiddenTarget: "src/db/**"
    severity: "HIGH"
    message: "UI components must go through src/services/ or API endpoints."
```
* **Instant IDE & CLI Enforcement**: Any violation is automatically flagged with red diagnostic squiggles in VS Code, surfaced as a high-severity finding on the dashboard, and reported in headless CLI pipeline runs.
* **Generate Template Config**: Simply run `npx @stratametriq/cli init` to generate starter configuration files automatically.

---

## 🥊 Market Comparison: Why StrataMetriq?

In a typical engineering organization, developers must piece together **3 to 4 separate, expensive tools** to get the visibility StrataMetriq delivers natively out of the box:

| Feature | 💻 Standard VS Code | 🏢 Traditional Market Tools | 📐 StrataMetriq (Our USP) |
| :--- | :--- | :--- | :--- |
| **Pre-Deployment Audits** | ❌ None. Allows deploying active debug code, mock data, and hardcoded secrets. | **GitGuardian / TruffleHog / SonarLint**: Fragmented tools that only check individual files or git commits. | ✅ **All-in-One 9-Point Audit Dashboard** with instant one-click editor jumping and zero false positives. |
| **API Lifecycle Tracing** | ❌ Manual file hunting from route -> controller -> service -> DB. | **Datadog / Dynatrace / New Relic**: Expensive APM tools that only trace requests **at runtime** on live staging/prod servers. | ✅ **Static Pre-Deployment API Tracing** directly inside your IDE before you even run or deploy the app. |
| **Dependency Graphs** | ❌ No visual graph or architectural tree view. | **Madge / Dependency-Cruiser**: CLI tools generating static SVG/PNG image files via terminal commands. | ✅ **Interactive Glassmorphic Webview** natively synced in real time with your open VS Code editor tabs (`[Open]` badges). |
| **Risk Impact Analysis** | ❌ Flat text list via "Find All References". | **CodeScene / Understand**: Expensive enterprise desktop software ($1,000+/year per seat). | ✅ **Instant Downstream Ripple Analysis** categorizing affected APIs, components, and tables for free inside VS Code. |

---

## 🏗️ Technical Architecture (Monorepo)

StrataMetriq is structured as a high-performance TypeScript monorepo:
* **`extension/` (Backend Host)**: A Node.js-based VS Code extension. It commands the workspace, reads the filesystem, queries the Language Server for syntax diagnostics, registers commands, and orchestrates the webview panel.
* **`dashboard/` (Frontend UI)**: A React application bundled with Vite. It features a premium glassmorphic UI, custom scrollbars, and renders interactive dependency graphs and vertical API lifecycle traces.
* **`scanner/` (Analysis Engine)**: A deep AST (Abstract Syntax Tree) parser powered by TypeScript and Acorn. It analyzes source files, tokenizes logic for duplicate detection, extracts API routes and SQL query tables, and evaluates 7 categories of production risks.
* **`cli/` (DevSecOps Governance)**: A standalone headless command-line executable (`@stratametriq/cli`) that runs AST scans in terminal windows and CI/CD pipelines, enforces automated pipeline gates (`--fail-on-high`), and exports JSON/Markdown PR reports.
* **`shared/`**: Common TypeScript interfaces ensuring seamless type safety between the scanner, extension host, CLI, and webview UI.

---

## 🚀 How to Install & Use (2 Powerful Methods)

StrataMetriq provides both an **Interactive Developer UI** inside VS Code and a **Headless CI/CD Pipeline Gate** for automated DevOps workflows.

### Method 1: Interactive VS Code Extension (VSIX)
1. **Install from VSIX**:
   * Open VS Code and press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS).
   * Type and select **`Extensions: Install from VSIX...`**.
   * Choose the bundled file: **`stratametriq-extension-1.3.0.vsix`**.
2. **Reload VS Code**:
   * Run the command **`Developer: Reload Window`** to activate the latest scanner engine.
3. **Launch Dashboard**:
   * Open the Command Palette (`Ctrl+Shift+P`) and run:
     👉 **`StrataMetriq: Open Dashboard`**
4. **Explore Your Codebase**:
   * Click **"Run Deep Analysis"** to scan your project.
   * Check your **Pre-Deployment Audit** checklist before pushing code.
   * Click any API endpoint in the **API Flow Visualizer** to see how data moves vertically through your stack.
   * Click any file node to instantly open it in your editor!

---

### Method 2: Headless CLI & CI/CD Pipeline Gates (DevSecOps)
Run StrataMetriq directly in your terminal, Docker container, or CI/CD workflow (GitHub Actions, GitLab CI, Jenkins) to automatically block pull requests containing security vulnerabilities or circular loops!

#### ⚡ Quick Terminal Command:
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

#### 🚦 Available CLI Flags & Quality Gates:
| Flag | Description | CI/CD Behavior |
| :--- | :--- | :--- |
| `init` | Creates default `.stratametriqrc.json` configuration file. | Configures ignore rules, custom risk thresholds, and default report paths. |
| `scan [dir]` | Target directory to scan (defaults to current working directory). | Outputs colored ANSI tables of stats & risks. |
| `impact <file>` | Runs downstream BFS ripple analysis on a specific target file. | Categorizes downstream affected files, API routes, database tables, and UI widgets. |
| `--diff <ref>` | Git PR mode: Compares against Git branch or commit reference. | Evaluates security risks and circular loops strictly within modified files. |
| `--prune` | Dead code and dependency cleanup report. | Identifies unreferenced `package.json` dependencies and orphaned module code. |
| `--watch`, `-w` | Live reloading development mode. | Automatically monitors file changes and re-runs AST scans in `<200ms`. |
| `--html <file>` | Exports standalone interactive HTML report. | Creates an offline web view with health score badges, risk tables, and statistics cards. |
| `--fail-on-high` | Enforces DevSecOps quality gate. | Exits with **Exit Code `1`** (fails pipeline) if any HIGH severity risk (SQLi, XSS, Crypto, Secrets) is detected. |
| `--fail-on-circular` | Enforces architectural health gate. | Exits with **Exit Code `1`** if any circular dependency loops are detected. |
| `--max-circular <N>` | Sets a custom threshold for circular loops. | Fails build only if circular loops exceed `<N>`. |
| `--json <file>` | Exports full AST graph and audit data to JSON. | Perfect for SBOM generation or SonarQube integration. |
| `--md <file>` | Exports GitHub-flavored Markdown report. | Can be fed directly into `gh pr comment` in GitHub Actions. |

---

## 🛠️ Building From Source

To compile and package the extension from source:

```bash
# 1. Install dependencies across all monorepo packages
npm install

# 2. Build the AST scanner engine
cd scanner
npm run build

# 3. Build the Vite React dashboard webview bundle
cd ../dashboard
npm run build

# 4. Compile the extension backend and package the VSIX bundle
cd ../extension
npm run build
```
*Your newly compiled extension will be output as `stratametriq-extension-1.3.0.vsix` inside the `extension/` directory!*
