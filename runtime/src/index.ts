import * as fs from 'fs';
import * as path from 'path';

export interface EndpointTelemetry {
  requestCount30d: number;
  avgLatencyMs: number;
  errorRatePercent: number;
  lastSeen: string;
}

export interface TelemetryStore {
  endpoints: {
    [route: string]: EndpointTelemetry;
  };
}

/**
 * Dynamic Express / Node.js / NestJS Telemetry Middleware for StrataMetriq.
 * Automatically measures real-time API request volume, latency, and errors,
 * and dynamically writes/updates `stratametriq.otel.json` in your workspace root.
 *
 * @param filePath Optional custom output path for stratametriq.otel.json (defaults to process.cwd()/stratametriq.otel.json)
 */
export function stratametriqTelemetryMiddleware(filePath?: string) {
  const targetPath = filePath || path.join(process.cwd(), 'stratametriq.otel.json');
  let store: TelemetryStore = { endpoints: {} };

  // Load existing telemetry if file exists
  if (fs.existsSync(targetPath)) {
    try {
      store = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch (err) {
      store = { endpoints: {} };
    }
  }

  let saveTimeout: any = null;
  const scheduleSave = () => {
    if (saveTimeout) return;
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      try {
        fs.writeFileSync(targetPath, JSON.stringify(store, null, 2), 'utf8');
      } catch (err) {
        // Silent ignore if filesystem read-only
      }
    }, 1000); // Throttled save every 1 second
  };

  return function (req: any, res: any, next: any) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const method = (req.method || 'GET').toUpperCase();
      // Use req.route?.path for clean Express pattern (e.g. /products/:id), fallback to req.path or req.url
      const routePath = req.route && req.route.path ? req.route.path : (req.path || req.url || '/').split('?')[0];
      const endpointKey = `${method} ${routePath}`;

      if (!store.endpoints[endpointKey]) {
        store.endpoints[endpointKey] = {
          requestCount30d: 0,
          avgLatencyMs: duration,
          errorRatePercent: 0,
          lastSeen: 'Just now'
        };
      }

      const entry = store.endpoints[endpointKey];
      const prevCount = entry.requestCount30d;
      entry.requestCount30d = prevCount + 1;

      // Moving average latency
      entry.avgLatencyMs = Math.round(((entry.avgLatencyMs * prevCount) + duration) / entry.requestCount30d);

      // Error rate update
      const isError = res.statusCode >= 400 ? 1 : 0;
      const totalErrors = Math.round((entry.errorRatePercent / 100) * prevCount) + isError;
      entry.errorRatePercent = Number(((totalErrors / entry.requestCount30d) * 100).toFixed(1));
      entry.lastSeen = new Date().toISOString();

      scheduleSave();
    });

    next();
  };
}
