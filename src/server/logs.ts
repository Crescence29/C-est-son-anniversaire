// A unified technical log stream — distinct from activity_logs (the audit
// log, "who did what"). This one answers "what actually happened when
// something broke": server errors, API errors, payment failures, sync
// failures, auth failures, and client-side JS errors, all in one
// searchable place with a level and a source, matching how a real ops log
// reads rather than being scattered across separate ad-hoc arrays.

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  reference: string | null;
  at: string;
}

const MAX_LOGS = 500;
const logs: LogEntry[] = [];

export function recordLog(level: LogLevel, source: string, message: string, reference: string | null = null): void {
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    level,
    source,
    message: message.slice(0, 500),
    reference: reference ? reference.slice(0, 200) : null,
    at: new Date().toISOString(),
  });
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
}

export function getLogs(filter?: { level?: LogLevel; source?: string; search?: string }): LogEntry[] {
  let result = logs;
  if (filter?.level) result = result.filter((l) => l.level === filter.level);
  if (filter?.source) result = result.filter((l) => l.source === filter.source);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        (l.reference || '').toLowerCase().includes(q)
    );
  }
  return result;
}

export function getLogSources(): string[] {
  return Array.from(new Set(logs.map((l) => l.source))).sort();
}
