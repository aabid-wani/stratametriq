import * as vscode from 'vscode';
import * as path from 'path';
import { Scanner } from '@stratametriq/scanner';

export function activate(context: vscode.ExtensionContext) {
  console.log('StrataMetriq is now active!');

  // Pillar 2: Persistent Status Bar Item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'stratametriq.start';
  statusBarItem.text = '$(shield) StrataMetriq: Ready';
  statusBarItem.tooltip = 'Click to open StrataMetriq Architecture & DevSecOps Dashboard';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Pillar 2: Live Editor Diagnostics Collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('stratametriq');
  context.subscriptions.push(diagnosticCollection);

  const updateFileDiagnostics = (doc: vscode.TextDocument) => {
    if (doc.uri.scheme !== 'file') return;
    const ext = path.extname(doc.uri.fsPath).toLowerCase();
    if (!['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.kt', '.go', '.cs'].includes(ext)) return;
    try {
      const singleScanner = new Scanner();
      const node = singleScanner.parseFile(doc.uri.fsPath, doc.getText());
      const diagnostics: vscode.Diagnostic[] = [];
      if (node && node.productionRisks) {
        for (const risk of node.productionRisks) {
          const lineIdx = Math.max(0, (risk.line || 1) - 1);
          const range = new vscode.Range(new vscode.Position(lineIdx, 0), new vscode.Position(lineIdx, 100));
          const severity = risk.severity === 'HIGH' ? vscode.DiagnosticSeverity.Error
            : risk.severity === 'MEDIUM' ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;
          const diagnostic = new vscode.Diagnostic(range, `StrataMetriq [${risk.category}]: ${risk.message}`, severity);
          diagnostic.source = 'StrataMetriq';
          diagnostics.push(diagnostic);
        }
      }
      diagnosticCollection.set(doc.uri, diagnostics);
    } catch (e) {
      // ignore live syntax errors
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => updateFileDiagnostics(doc)),
    vscode.workspace.onDidOpenTextDocument(doc => updateFileDiagnostics(doc))
  );

  if (vscode.window.activeTextEditor) {
    updateFileDiagnostics(vscode.window.activeTextEditor.document);
  }

  let disposable = vscode.commands.registerCommand('stratametriq.start', () => {
    const panel = vscode.window.createWebviewPanel(
      'stratametriqDashboard',
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
            const excludePattern = '{**/.*/**,**/node_modules/**,**/dist/**,**/build/**,**/out/**,**/vendor/**,**/coverage/**,**/dashboard-dist/**,**/scratch/**,**/*.min.js,**/*.bundle.js,**/*.map}';
            vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,kt,go,cs,rb,php,rs,cpp,c,h,json,txt}', excludePattern, 5000).then(async (files) => {
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

              // Update status bar with scan results
              const allRisks = graphData.nodes.flatMap((n: any) => n.productionRisks || []);
              const highRisks = allRisks.filter((r: any) => r.severity === 'HIGH');
              if (highRisks.length > 0) {
                statusBarItem.text = `$(error) StrataMetriq: ${highRisks.length} High Risk${highRisks.length > 1 ? 's' : ''}`;
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
              } else if (allRisks.length > 0) {
                statusBarItem.text = `$(warning) StrataMetriq: ${allRisks.length} Audit Note${allRisks.length > 1 ? 's' : ''}`;
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
              } else {
                statusBarItem.text = `$(check) StrataMetriq: Perfect Health`;
                statusBarItem.backgroundColor = undefined;
              }

              // Update editor diagnostic squiggles across scanned files
              diagnosticCollection.clear();
              for (const n of graphData.nodes) {
                if (n.productionRisks && n.productionRisks.length > 0) {
                  const diags: vscode.Diagnostic[] = n.productionRisks.map((r: any) => {
                    const lineIdx = Math.max(0, (r.line || 1) - 1);
                    const range = new vscode.Range(new vscode.Position(lineIdx, 0), new vscode.Position(lineIdx, 100));
                    const sev = r.severity === 'HIGH' ? vscode.DiagnosticSeverity.Error
                      : r.severity === 'MEDIUM' ? vscode.DiagnosticSeverity.Warning
                      : vscode.DiagnosticSeverity.Information;
                    const d = new vscode.Diagnostic(range, `StrataMetriq [${r.category}]: ${r.message}`, sev);
                    d.source = 'StrataMetriq';
                    return d;
                  });
                  diagnosticCollection.set(vscode.Uri.file(n.filePath), diags);
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
