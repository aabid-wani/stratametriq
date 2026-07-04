---
sidebar_position: 2
title: 🏗️ Technical Architecture
---

# Monorepo System Design & Architecture

StrataMetriq is architected as a clean, decoupled monorepo workspace structured into specialized engine and presentation layers.

---

## 📊 High-Level System Architecture

```mermaid
graph TD
    subgraph Core Engine Workspaces
        SHARED["@stratometriq/shared<br/>(Data Contracts & Graph Interfaces)"]
        SCANNER["@stratometriq/scanner<br/>(TypeScript AST Parser & Risk Evaluator)"]
        AI["@stratometriq/ai<br/>(Architectural Intelligence & Insights)"]
        RUNTIME["@stratometriq/runtime<br/>(Runtime Diagnostics & Utilities)"]
    end

    subgraph Presentation & Editor Integration
        DASHBOARD["dashboard<br/>(React 19 + Vite + Glassmorphism UI)"]
        EXT["stratometriq-extension<br/>(VS Code Extension Host & Webview Bridge)"]
    end

    SCANNER --> SHARED
    AI --> SHARED
    RUNTIME --> SHARED
    DASHBOARD --> SHARED
    EXT --> SCANNER
    EXT --> SHARED
    EXT --> DASHBOARD
```

---

## 🛠️ Workspace Module Breakdown

### 1. `@stratometriq/shared`
The foundational data contract layer. Defines core TypeScript interfaces (`Node`, `Edge`, `Graph`, `DuplicatePair`, `ProductionRisk`) ensuring type safety between the backend AST parser and the frontend React UI.

### 2. `@stratometriq/scanner`
The heavy-lifting AST engine powered by Microsoft's `typescript` compiler API. It scans `.ts`, `.tsx`, `.js`, and `.jsx` files, extracts imports/exports, maps Express/HTTP router endpoints, evaluates syntax errors, and runs lexical tokenization for duplicate detection.

### 3. `@stratometriq/ai`
Provides intelligent heuristic evaluations and architectural recommendations.

### 4. `@stratometriq/runtime`
Helper utilities for evaluating runtime execution traces and environment configurations.

### 5. `dashboard`
A responsive, high-performance webview built with **React 19**, **Vite 8**, and **@xyflow/react**. It renders dynamic visual trees, glassmorphic inspection cards, and real-time filtering pills. Built as a single-file inline bundle for seamless VS Code embedding.

### 6. `stratometriq-extension`
The host wrapper that registers VS Code commands (`stratometriq.start`), manages the webview lifecycle, handles bi-directional message passing, and triggers editor tab synchronization.
