import React, { useEffect, useState } from 'react';
import { Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type ProbeState = 'checking' | 'up' | 'down';

/**
 * Real health probe (not a fabricated status): /api/health only ever
 * responds once the server has finished awaiting db.ready, so a 200 here
 * genuinely means both the API process and the MySQL connection are up.
 */
export const ServiceStatusCard: React.FC = () => {
  const [apiState, setApiState] = useState<ProbeState>('checking');
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      setApiState('checking');
      try {
        const res = await fetch('/api/health');
        if (!cancelled) {
          setApiState(res.ok ? 'up' : 'down');
          setCheckedAt(new Date().toLocaleTimeString('fr-FR'));
        }
      } catch {
        if (!cancelled) {
          setApiState('down');
          setCheckedAt(new Date().toLocaleTimeString('fr-FR'));
        }
      }
    };

    probe();
    const interval = setInterval(probe, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const rows: { label: string; state: ProbeState }[] = [
    { label: 'API serveur', state: apiState },
    { label: 'Base de données MySQL', state: apiState },
  ];

  return (
    <div className="rounded-2xl p-6 border space-y-3 dd-fade-in" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
      <h3 className="font-serif font-bold text-base flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
        <Server className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
        Statut des services
      </h3>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--dd-border)' }}>
            <span className="text-xs" style={{ color: 'var(--dd-ink-soft)' }}>{row.label}</span>
            {row.state === 'checking' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Vérification...
              </span>
            ) : row.state === 'up' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Opérationnel
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-400">
                <XCircle className="w-3.5 h-3.5" />
                Indisponible
              </span>
            )}
          </div>
        ))}
      </div>

      {checkedAt && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>
          Dernière vérification : {checkedAt} (auto-actualisé toutes les 30s)
        </p>
      )}
    </div>
  );
};
