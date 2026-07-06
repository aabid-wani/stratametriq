import * as vscode from 'vscode';
import * as path from 'path';
import { Scanner } from '@stratometriq/scanner';

export function activate(context: vscode.ExtensionContext) {
  console.log('StrataMetriq is now active!');

  let disposable = vscode.commands.registerCommand('stratometriq.start', () => {
    const panel = vscode.window.createWebviewPanel(
      'stratometriqDashboard',
      'StrataMetriq Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, '../dashboard/dist'))]
      }
    );

    // Mock HTML content - In reality, we'd serve the built React app from dashboard/dist
    panel.webview.html = getWebviewContent(panel, context);

    // Bridge communication
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
          case 'openFile':
            try {
              const targetPath = message.filePath;
              const lineNum = Number(message.line) || 1;
              if (!targetPath) return;

              const openAndReveal = (doc: vscode.TextDocument) => {
                const pos = new vscode.Position(Math.max(0, lineNum - 1), 0);
                const range = new vscode.Range(pos, pos);
                const options: vscode.TextDocumentShowOptions = {
                  preview: false,
                  selection: range,
                  viewColumn: vscode.ViewColumn.One
                };
                vscode.window.showTextDocument(doc, options).then(editor => {
                  if (editor) {
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    setTimeout(() => {
                      editor.selection = new vscode.Selection(pos, pos);
                      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    }, 100);
                    setTimeout(() => {
                      editor.selection = new vscode.Selection(pos, pos);
                      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    }, 300);
                  }
                }, err => {
                  vscode.window.showErrorMessage(`Error showing document ${targetPath}: ${err}`);
                });
              };

              vscode.workspace.openTextDocument(vscode.Uri.file(targetPath)).then(doc => {
                openAndReveal(doc);
              }, err => {
                const basename = targetPath.replace(/\\/g, '/').split('/').pop() || '';
                vscode.workspace.findFiles(`**/${basename}`, null, 1).then(files => {
                  if (files && files.length > 0) {
                    vscode.workspace.openTextDocument(files[0]).then(doc => {
                      openAndReveal(doc);
                    });
                  } else {
                    vscode.window.showErrorMessage(`Could not open file: ${targetPath}`);
                  }
                }, findErr => {
                  vscode.window.showErrorMessage(`Could not find file ${basename} in workspace.`);
                });
              });
            } catch (err) {
              vscode.window.showErrorMessage(`Failed to open file: ${message.filePath}`);
            }
            return;
          case 'scan':
            vscode.window.showInformationMessage('Starting scan...');
            // Trigger actual scan
            const scanner = new Scanner();
            const excludePattern = '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/out/**,**/vendor/**,**/coverage/**,**/.cache/**,**/*.min.js,**/*.bundle.js,**/*.map}';
            vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,go,cs,rb,php,rs,cpp,c,h}', excludePattern, 5000).then(async (files) => {
              let processedCount = 0;
              for (const file of files) {
                try {
                  const stat = await vscode.workspace.fs.stat(file);
                  if (stat.size > 500 * 1024) continue; // Skip large bundle or generated files > 500KB

                  const content = await vscode.workspace.fs.readFile(file);
                  scanner.parseFile(file.fsPath, new TextDecoder().decode(content));
                  processedCount++;
                  if (processedCount % 40 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1)); // Yield to event loop to prevent freeze
                  }
                } catch (e) {
                  console.error(`Failed to read file ${file.fsPath}`, e);
                }
              }
              const graphData = scanner.getGraph();
              
              // Get diagnostics
              const allDiagnostics = vscode.languages.getDiagnostics();
              const diagnosticMap = new Map<string, { count: number, messages: string[] }>();
              
              for (const [uri, diagnostics] of allDiagnostics) {
                const problems = diagnostics.filter(d => 
                  d.severity === vscode.DiagnosticSeverity.Error || 
                  d.severity === vscode.DiagnosticSeverity.Warning
                );
                
                if (problems.length > 0) {
                  const normalizedPath = vscode.Uri.file(uri.fsPath).fsPath.toLowerCase();
                  diagnosticMap.set(normalizedPath, {
                    count: problems.length,
                    messages: problems.map(p => `[Line ${p.range.start.line + 1}] ${p.message}`)
                  });
                }
              }

              // Get open files in VS Code
              const openFiles = new Set<string>();
              vscode.workspace.textDocuments.forEach(doc => {
                if (!doc.isClosed) {
                  openFiles.add(vscode.Uri.file(doc.uri.fsPath).fsPath.toLowerCase());
                }
              });
              vscode.window.visibleTextEditors.forEach(editor => {
                openFiles.add(vscode.Uri.file(editor.document.uri.fsPath).fsPath.toLowerCase());
              });

              // Inject problem counts and isOpen into nodes
              for (const node of graphData.nodes) {
                const fsPath = vscode.Uri.file(node.filePath).fsPath.toLowerCase();
                node.isOpen = openFiles.has(fsPath);

                const nodeIssues = diagnosticMap.get(fsPath);
                const existingProblems = node.problems || [];
                if (nodeIssues) {
                  const merged = Array.from(new Set([...nodeIssues.messages, ...existingProblems]));
                  node.problems = merged;
                  node.problemCount = merged.length;
                } else {
                  node.problems = existingProblems;
                  node.problemCount = existingProblems.length;
                }
              }

              panel.webview.postMessage({ command: 'graphData', data: graphData });
              vscode.window.showInformationMessage(`Scan complete! Found ${graphData.nodes.length} files and ${graphData.edges.length} imports.`);
            });
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
  const distPath = path.join(context.extensionPath, 'dashboard-dist');
  const indexPath = path.join(distPath, 'index.html');
  
  let html = '';
  try {
    const fs = require('fs');
    html = fs.readFileSync(indexPath, 'utf-8');
  } catch (e) {
    return `<!DOCTYPE html><html><body><h1>Error</h1><p>Could not find React build at ${indexPath}. Did you run Vite build?</p></body></html>`;
  }

  // Inject CSP (Since everything is inlined, we need unsafe-inline)
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src ${panel.webview.cspSource} 'unsafe-inline'; img-src ${panel.webview.cspSource} https: data:; font-src ${panel.webview.cspSource};">`;
  html = html.replace('<head>', `<head>\n    ${csp}`);

  return html;
}

export function deactivate() {}
