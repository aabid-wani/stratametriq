---
sidebar_position: 6
title: 🛠️ Developer & Build Guide
---

# Monorepo Build & Contributing Guide

If you are contributing to the StrataMetriq codebase or compiling the extension from source, follow these instructions:

---

## Prerequisites
* **Node.js:** v18.x or v20.x recommended.
* **npm:** v9.x or later.
* **Visual Studio Code:** v1.80.0 or higher.

---

## Step 1: Install Workspace Dependencies
Run the install command from the root repository directory to link all monorepo workspaces:
```bash
npm install
```

---

## Step 2: Compile All Workspaces
To compile the TypeScript source code across `@stratametriq/shared`, `@stratametriq/scanner`, `@stratametriq/ai`, and `@stratametriq/runtime`, run:
```bash
npm run build
```

---

## Step 3: Build the React Dashboard Webview
The React UI must be compiled and bundled into a single inline HTML/JS/CSS package so that it can be loaded inside VS Code webviews without external server dependencies:
```bash
cd dashboard
npm run build
cd ..
```
*Note: This utilizes `vite-plugin-singlefile` to output a self-contained bundle into `dashboard/dist/index.html`.*

---

## Step 4: Bundle and Package the VS Code Extension (VSIX)
To package the compiled extension into a distributable `.vsix` file using `esbuild` and `@vscode/vsce`:
```bash
cd extension
npm run package
npx @vscode/vsce package
cd ..
```
This generates the final installable artifact: **`stratametriq-extension-1.3.0.vsix`**.
