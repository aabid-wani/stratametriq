# 📘 The Master Blueprint: How to Publish an npm Package from Scratch

This guide is your complete, end-to-end reference document for creating, compiling, authenticating, and publishing Node.js and TypeScript packages to the public npm registry. It includes solutions to common publishing errors (such as `404 Not Found` and `403 Forbidden 2FA`) so you can reference it whenever you build a new library or CLI tool in the future.

---

## Phase 1: Planning & Setting Up `package.json`

Every npm package is defined by its `package.json` manifest file. Before writing code or publishing, decide on your package naming structure and configure your entry points:

### 1. Choose Your Naming Structure: Scoped vs. Unscoped
* **Unscoped Package (`my-cool-cli`):** Published directly to `npmjs.com/package/my-cool-cli`. The name must be completely unique across the entire global npm database.
* **Scoped Package (`@stratametriq/cli`):** Published to `npmjs.com/package/@stratametriq/cli`. Scoped names group related packages under an organization brand or user profile.

> **⚠️ WARNING — The 404 Organization Trap:**  
> If you choose a scoped name like `@mycompany/my-package`, **you must create the `@mycompany` Organization on npmjs.com first!** If the organization does not exist in npm's database, npm will fail during publish with:  
> `npm error 404 Not Found: PUT https://registry.npmjs.org/@mycompany%2fmy-package`

### 2. Configure Essential Fields in `package.json`
For a modern TypeScript library or command-line tool, ensure your `package.json` includes these core fields:

```json
{
  "name": "@mycompany/my-cli",
  "version": "1.0.0",
  "description": "A short explanation of what my tool does",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "my-cli-command": "dist/index.js"
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.0.0"
  }
}
```
* **`"main"`**: The primary JavaScript entry point when someone imports your library in their code (`require()` or `import`).
* **`"types"`**: Points to your generated TypeScript declaration files (`.d.ts`) so developers get autocomplete and type safety in their IDEs.
* **`"bin"`**: Maps terminal command names to executable JavaScript files (essential for CLI tools!).

---

## Phase 2: Security & Terminal Authentication

Before you can upload anything to npm's servers, you must authenticate your terminal session and satisfy npm's mandatory security policies.

### 1. Enable Two-Factor Authentication (2FA) on npmjs.com
> **🛑 CAUTION — The 403 2FA Trap:**  
> npm strictly enforces Two-Factor Authentication for all public publishers. If you try to run `npm publish` without 2FA enabled on your account, npm will block you with:  
> `npm error 403 Forbidden: Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.`

1. Log in to [npmjs.com](https://www.npmjs.com) in your web browser.
2. Navigate to **Account Settings ➔ Two-Factor Authentication (2FA)**.
3. Enable 2FA using an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.).
4. **CRITICAL:** When prompted for the mode, you must select **"Authorization and Publishing"**.

### 2. Log In via Terminal
Open PowerShell or your terminal and run:
```powershell
npm login
```
*(Follow the interactive browser prompt and enter your 6-digit 2FA authenticator code).*

Verify that your terminal is properly authenticated:
```powershell
npm whoami
# Should print your npm username (e.g., aabidhussainwani)
```

---

## Phase 3: Compile & Build Your Code

The npm registry distributes executable JavaScript. If you write your codebase in **TypeScript**, you must compile your `.ts` source files into standard JavaScript (`.js`) and type definitions (`.d.ts`) inside a `/dist` or `/build` folder before publishing.

```powershell
# 1. Install project dependencies
npm install

# 2. Compile TypeScript to JavaScript
npm run build
```

> **💡 TIP — Keep Your Published Tarball Clean:**  
> Create a `.npmignore` file in your package root (works just like `.gitignore`) to prevent uploading unnecessary development files such as test suites, source `.ts` files, or CI scripts:  
> ```text
> src/
> tests/
> tsconfig.json
> .github/
> scratch/
> ```  
> *(Alternatively, use the `"files": ["dist", "LICENSE", "README.md"]` array in `package.json` to explicitly whitelist only the exact files that should be packaged and distributed).*

---

## Phase 4: Publishing to the Registry

When your code is compiled into `/dist` and your terminal is authenticated, you are ready to publish!

### 1. The Monorepo Dependency Rule
If you are building a multi-package workspace where one package depends on another (e.g., `cli` depends on `scanner`, which depends on `shared`), **you must publish from the bottom of the dependency tree upward!**
1. Publish `shared` first.
2. Publish `scanner` second.
3. Publish `cli` last.  
*(If you publish out of order, npm's registry will reject the package because its required dependencies do not exist on the public server yet).*

### 2. Execute the Publish Command
Navigate into your target package folder and run:
```powershell
npm publish --access public
```
* **Why `--access public`?** By default, npm assumes scoped packages (`@org/pkg`) are private (which requires a paid npm subscription). Adding `--access public` instructs npm to release it freely to the open-source community.
* When prompted by the CLI, enter your 6-digit 2FA authenticator code.

When you see a confirmation line like `+ @mycompany/my-cli@1.0.0` in your terminal output, your package is officially live worldwide! 🎉

---

## Phase 5: Verification & Global Testing

Once published, verify that your new library or CLI works from any terminal across the globe:

### 1. Check Live Registry Status
Query npm's servers to verify the live version and release metadata:
```powershell
npm view @mycompany/my-cli version
```

### 2. Test Instant Execution via `npx`
Without installing anything globally on your computer, test running your executable CLI in any directory:
```powershell
npx @mycompany/my-cli --help
```

### 3. Test Global Installation
Verify that developers can install and run your tool globally:
```powershell
npm install -g @mycompany/my-cli
my-cli-command --help
```

---

## 🔁 Summary Checklist for Your Next Package Release:
1. [ ] Choose your package name and create the Organization on npmjs.com (if using an `@scope`).
2. [ ] Verify 2FA is set to **"Authorization and Publishing"** on your npmjs.com profile.
3. [ ] Run `npm login` and verify authentication with `npm whoami` in your terminal.
4. [ ] Configure `"main"`, `"types"`, and `"bin"` (if CLI) in your `package.json`.
5. [ ] Run `npm run build` to compile your TypeScript source code into `/dist`.
6. [ ] Run `npm publish --access public` (in bottom-up dependency order if working in a monorepo).
7. [ ] Verify your live release by running `npx <your-package-name>`.
