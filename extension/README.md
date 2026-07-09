# StrataMetriq — Architecture Intelligence & Pre-Deployment Safety for VS Code

**StrataMetriq** is an enterprise-grade Visual Studio Code extension that delivers **360° Architectural Visibility, Interactive Dependency Explorer, and 13-Point Pre-Deployment Safety Auditing** directly inside your editor.

---

## 🌟 Key Features

* **Persistent Status Bar Health Badge**: Monitors your workspace health score and high-severity risk count live in the bottom-right status bar (`🛡️ StrataMetriq: Ready` / `🚨 N High Risks`).
* **Live Inline Editor Diagnostics**: Highlights active debug statements, hardcoded secrets, raw SQL concatenation, and custom architecture governance violations inline while you write or save code.
* **Interactive Glassmorphic Webview Dashboard**:
  * **Global Search & Quick-Filter Toolbar**: Instantly search across modules, API routes, and DB tables.
  * **1-Click Editor Jumping (`↗ Line X`)**: Click any node on the graph to open the exact file and line number in VS Code.
  * **Live Editor Tab Synchronization (`[Open]` Badges)**: Shows open editor tabs directly on your dependency graph.
* **Enterprise Custom Architecture Governance (`stratametriq.config.yml`)**: Enforce boundary rules across monorepos and prevent forbidden module imports.
* **1-Click Executive Audit Export**: Download a full JSON audit report of project health, loops, and findings.

---

## 🚀 How to Install & Use

1. **Install Extension**:
   * Open VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P`).
   * Select **`Extensions: Install from VSIX...`** and pick the bundled `.vsix` file.
2. **Launch Dashboard**:
   * Open Command Palette (`Ctrl+Shift+P`).
   * Type and run: **`StrataMetriq: Open Dashboard`**.

---

## 🔒 Zero Cloud Exfiltration

100% of Abstract Syntax Tree (AST) parsing and graph calculation is executed locally on your machine. Your source code never leaves your IDE.

---

## 📄 License

MIT © StrataMetriq Engineering Team
