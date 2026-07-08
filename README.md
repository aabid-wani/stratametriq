# StrataMetriq 📐
*Architecture Intelligence & Pre-Deployment Safety in VS Code*

[![GitHub](https://img.shields.io/badge/GitHub-aabid--wani%2Fstratametriq-181717?style=flat&logo=github)](https://img.shields.io/badge/GitHub-aabid--wani%2Fstratametriq-181717?style=flat&logo=github) [![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-stratametriq-007ACC?style=flat&logo=visual-studio-code)](https://marketplace.visualstudio.com/)  
**🌐 Official GitHub Repository:** [https://github.com/aabid-wani/stratametriq](https://github.com/aabid-wani/stratametriq)

**StrataMetriq** is an enterprise-grade VS Code extension designed to act as an advanced architectural diagnostic tool for full-stack polyglot codebases (JavaScript, TypeScript, Python, Java, Go, C#, Ruby, PHP, Rust, C++). It transforms abstract technical debt into visual graphs, maps out end-to-end API request lifecycles across different backend languages, and automatically enforces a strict pre-deployment safety audit before code ever reaches production.

---

## 🌟 Key Features & Superpowers

### 🌐 Full-Stack Polyglot Architecture Support (NEW in v1.3.0)
StrataMetriq natively parses ASTs and raw source heuristics across modern multi-language repositories without needing external interpreters or heavy IDE plugins:
* **Supported Languages**: Python (`.py`), Java (`.java`), Go (`.go`), C# (`.cs`), JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`), Ruby (`.rb`), PHP (`.php`), Rust (`.rs`), C++ (`.cpp`), C (`.c`), and header files (`.h`).
* **Cross-Stack Vertical Flow**: Traces frontend API calls (`fetch('/api/users')`) directly into Python FastAPI (`@app.get(...)`), Java Spring Boot (`@GetMapping(...)`), or Go Gin (`r.GET(...)`) controllers, linking all the way down to ORM database tables (`__tablename__`, `@Table`).
* **Language-Aware Safety Audits**: Evaluates all 13 Pre-Deployment Safety Audit categories across polyglot files, correctly recognizing language-specific syntax such as `#` comments and debug calls like `print()`, `System.out.println()`, or `fmt.Println()`.

### 1. 🛡️ Automated 9-Point Pre-Deployment Safety Audit
Before deploying your application, StrataMetriq scans 100% of your codebase in seconds to ensure no debugging artifacts, credentials, or unfinished work leak into production. It displays a glowing `✅ Ready for Production` badge or a high-alert `⛔ DO NOT DEPLOY` banner.
* **🔑 Hardcoded Secrets & Credentials**: Detects API keys, JWT tokens, AWS credentials, passwords, and hardcoded IPs/connection strings with **Zero False-Positive Precision** (safely ignores dynamic template strings `${...}` and session storage calls).
* **🐞 Active Debug Code**: Identifies active `console.log`, `debugger;`, and `alert()` statements (ignoring commented-out lines).
* **🚧 Temporary Code**: Highlights developer hack annotations (`// WIP`, `// HACK`, `// TEMP`).
* **🧪 Test Data & Suites**: Prevents test fixtures, mock data, or test users from leaking into production builds.
* **📌 TODO & FIXME Notes**: Tracks unresolved developer tasks and to-do notes.
* **💬 Large Commented Code Blocks**: Catches inactive logic blocks and commented-out source code.
* **⚰️ Dead Code**: Flags unreachable statements after `return`/`throw` and dead conditional branches like `if (false)`.
* **🕳️ Empty Catch Blocks**: Identifies swallowed exceptions and silent failure points.
* **📦 Unused Development Imports**: Detects development or testing libraries imported into production modules.

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
* Click any node in the tree to instantly open that file in VS Code at the exact line of interest.

### 5. 👥 Duplicate Code & 🔄 Circular Dependency Detection
Automatically scans token overlap across your workspace to identify copy-pasted business logic between different files, and executes a high-speed DFS cycle detection algorithm to catch import loops.
* **Duplicate Logic**: Displays duplicate pairs with similarity percentages (e.g., `92% Similarity`) and actionable DRY refactoring guidance.
* **Circular Dependencies**: Flags tight coupling loops (e.g., `Module A ➔ Module B ➔ Module A`) with dedicated alert cards and one-click editor jumping to help you decouple architecture cleanly.

### 6. 📊 Architectural Health Scoring & Complexity Gauge
Quantifies your project's technical debt into two clear metrics:
* **Project Health Score (0% – 100%)**: A high-level gauge of overall codebase maintainability, safety, and separation of concerns.
* **Complexity Index**: Measures the average dependency density per module to highlight tight coupling and spaghetti code before it gets out of hand.

### 7. 🎨 Premium Glassmorphic UI & Ergonomic Scrollbars
Designed with a state-of-the-art dark mode aesthetic featuring neon cyan/amber accents, smooth micro-animations, and custom-styled scrollbars. Every data section is cleanly bounded with fixed heights for effortless navigation of massive projects.

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
# Scan the current directory locally
npx stratametriq scan .

# Scan and fail the build if any HIGH severity risks exist
npx stratametriq scan ./src --fail-on-high

# Export architecture report to JSON and Markdown (ideal for automated PR bot comments)
npx stratametriq scan . --fail-on-high --json report.json --md pr-comment.md
```

#### 🚦 Available CLI Flags & Quality Gates:
| Flag | Description | CI/CD Behavior |
| :--- | :--- | :--- |
| `scan [dir]` | Target directory to scan (defaults to current working directory). | Outputs colored ANSI tables of stats & risks. |
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
