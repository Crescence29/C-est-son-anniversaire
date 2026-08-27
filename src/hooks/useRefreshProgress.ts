import { useCallback, useEffect, useRef, useState } from 'react';

export type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Drives the RefreshLoadingOverlay from a real async task instead of a fake
 * timer: progress trickles toward 90% while the task is in flight (so the
 * animation naturally stretches or compresses to match real latency) and
 * only ever reaches 100% once the task has actually resolved.
 */
export function useRefreshProgress() {
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const trickleRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  const taskRef = useRef<(() => Promise<unknown>) | null>(null);

  const clearTrickle = () => {
    if (trickleRef.current !== null) {
      window.clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
  };

  const run = useCallback((task: () => Promise<unknown>) => {
    taskRef.current = task;

    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    setStatus('loading');
    setErrorMessage('');
    setProgress(0);
    clearTrickle();

    // Eases toward 90% and never gets there on its own — the last stretch to
    // 100% is only ever drawn once the real request has actually returned.
    trickleRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const remaining = 90 - p;
        const step = Math.max(0.6, remaining * 0.09);
        return Math.min(90, p + step);
      });
    }, 120);

    task()
      .then(() => {
        clearTrickle();
        setProgress(100);
        setStatus('success');
        successTimeoutRef.current = window.setTimeout(() => {
          setStatus('idle');
          setProgress(0);
        }, 900);
      })
      .catch((err: any) => {
        clearTrickle();
        setStatus('error');
        setErrorMessage(err?.message || 'Une erreur est survenue lors de l’actualisation.');
      });
  }, []);

  const retry = useCallback(() => {
    if (taskRef.current) run(taskRef.current);
  }, [run]);

  const dismiss = useCallback(() => {
    clearTrickle();
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setStatus('idle');
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      clearTrickle();
      if (successTimeoutRef.current !== null) window.clearTimeout(successTimeoutRef.current);
    };
  }, []);

  return { status, progress, errorMessage, run, retry, dismiss };
}
