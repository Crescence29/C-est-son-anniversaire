// In-process metrics used by the developer system-status panel. Deliberately
// simple (in-memory, reset on restart) rather than a full metrics backend —
// this app runs as a single process, so "since last restart" is the only
// window that matters for a live status view.

interface ErrorEntry {
  message: string;
  path: string;
  at: string;
}

const MAX_ERRORS = 20;
const MAX_TIMINGS = 200;

const serverStartedAt = new Date();
let requestCount = 0;
const recentErrors: ErrorEntry[] = [];
const responseTimings: number[] = [];

export function recordRequest(): void {
  requestCount += 1;
}

export function recordTiming(ms: number): void {
  responseTimings.push(ms);
  if (responseTimings.length > MAX_TIMINGS) responseTimings.shift();
}

export function recordError(message: string, path: string): void {
  recentErrors.unshift({ message, path, at: new Date().toISOString() });
  if (recentErrors.length > MAX_ERRORS) recentErrors.length = MAX_ERRORS;
}

export function getServerStartedAt(): Date {
  return serverStartedAt;
}

export function getMetricsSnapshot() {
  const avgResponseTimeMs = responseTimings.length
    ? Math.round(responseTimings.reduce((sum, t) => sum + t, 0) / responseTimings.length)
    : 0;

  return {
    requestCount,
    avgResponseTimeMs,
    recentErrors: recentErrors.slice(0, 10),
    serverStartedAt: serverStartedAt.toISOString(),
    uptimeSeconds: Math.round((Date.now() - serverStartedAt.getTime()) / 1000),
  };
}
