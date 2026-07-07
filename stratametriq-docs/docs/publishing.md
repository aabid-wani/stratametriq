---
sidebar_position: 5
title: 📦 Publishing & Marketplace
---

# VS Code Marketplace Deployment

When publishing StrataMetriq to the public **Visual Studio Code Marketplace** or an internal enterprise marketplace, ensure the following requirements are met:

---

## 1. Extension Icon
An icon file (`icon.png`, 128x128 PNG format) is included in the root of the `extension/` directory and referenced in `extension/package.json` under `"icon": "icon.png"`.

---

## 2. Publisher Account
* Create a publisher profile on the [Visual Studio Code Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
* Ensure your `"publisher"` ID in `extension/package.json` matches your marketplace publisher ID (`"stratametriq"`).

---

## 3. Personal Access Token (PAT)
Generate an Azure DevOps Personal Access Token with **Marketplace (Publish)** scopes:
1. Go to your Azure DevOps organization settings.
2. Select **Personal Access Tokens**.
3. Create a new token with **Marketplace** ➔ **Manage / Publish** permissions.

---

## 4. Login & Publish via CLI
Execute the following commands using the official `@vscode/vsce` CLI tool:

```bash
cd extension
npx @vscode/vsce login stratametriq
npx @vscode/vsce publish
```

:::success Marketplace Verification
Once published, your extension will be publicly accessible on the VS Code Marketplace under `stratametriq.stratametriq-extension`.
:::
