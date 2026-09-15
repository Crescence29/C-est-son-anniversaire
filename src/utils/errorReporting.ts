// Reports uncaught client-side errors to the developer dashboard's log
// stream. Deliberately a plain fetch (not the api.ts helper) so it can't
// itself be the thing that fails during app bootstrap, and deliberately
// silent on failure — a broken logging beacon must never surface to the
// user or throw its own error.
function reportClientError(message: string, url: string): void {
  try {
    fetch('/api/logs/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.slice(0, 500), url }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export function installErrorReporting(): void {
  window.addEventListener('error', (event) => {
    reportClientError(event.message || 'Erreur JavaScript inconnue', event.filename || window.location.href);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    reportClientError(`Promesse rejetée non gérée : ${message}`, window.location.href);
  });
}
