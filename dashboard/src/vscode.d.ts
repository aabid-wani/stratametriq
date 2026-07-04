// declare VS Code API
declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}

export {};
