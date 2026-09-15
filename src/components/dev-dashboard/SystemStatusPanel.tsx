import React, { useCallback, useEffect, useState } from 'react';
import {
  Server, Database, HardDrive, Cpu, MemoryStick, Clock, Users, Tag,
  Gauge, ListChecks, AlertOctagon, DatabaseBackup, RotateCw,
} from 'lucide-react';
import { api } from '../../utils/api.ts';
import { SystemStatus, ServiceHealthState } from '../../types.ts';
import { KpiCard } from './KpiCard.tsx';
import { SkeletonCard } from './SkeletonCard.tsx';

const STATE_META: Record<ServiceHealthState, { label: string; dot: string; text: string }> = {
  ok: { label: 'Opérationnel', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  degraded: { label: 'Dégradé', dot: 'bg-amber-400', text: 'text-amber-400' },
  down: { label: 'En panne', dot: 'bg-red-400', text: 'text-red-400' },
  unknown: { label: 'Non disponible', dot: 'bg-white/25', text: 'text-white/45' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'Jamais';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function barColor(percent: number): string {
  if (percent >= 90) return 'bg-red-400';
  if (percent >= 70) return 'bg-amber-400';
  return 'bg-emerald-400';
}

const UsageBar: React.FC<{ label: string; icon: React.ElementType; percent: number | null; detail: string }> = ({ label, icon: Icon, percent, detail }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--dd-ink-soft)' }}>
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--dd-accent)' }} />
        {label}
      </span>
      <span className="text-[11px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>{detail}</span>
    </div>
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dd-border)' }}>
      {percent !== null && (
        <div className={`h-full rounded-full ${barColor(percent)}`} style={{ width: `${Math.min(100, percent)}%` }} />
      )}
    </div>
  </div>
);

interface SystemStatusPanelProps {
  onBackup: () => Promise<void>;
  isBackingUp: boolean;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ onBackup, isBackingUp }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<{ status: SystemStatus }>('/admin/system-status');
      setStatus(res.status);
      setLoadFailed(false);
      setCheckedAt(new Date().toLocaleTimeString('fr-FR'));
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!status) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} height={96} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-base flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
            <Gauge className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
            État technique de la plateforme
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--dd-ink-faint)' }}>
            {loadFailed
              ? 'Dernière lecture indisponible — nouvel essai automatique dans quelques secondes.'
              : `Actualisé automatiquement toutes les 30s${checkedAt ? ` · dernière lecture ${checkedAt}` : ''}`}
          </p>
        </div>
        <button
          onClick={onBackup}
          disabled={isBackingUp}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold border transition-colors disabled:opacity-60"
          style={{ color: 'var(--dd-accent)', borderColor: 'var(--dd-accent)' }}
        >
          {isBackingUp ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <DatabaseBackup className="w-3.5 h-3.5" />}
          {isBackingUp ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Temps de réponse" value={`${status.avgResponseTimeMs} ms`} icon={Clock} accent="accent" />
        <KpiCard label="Requêtes traitées" value={status.requestCount.toLocaleString('fr-FR')} icon={ListChecks} accent="emerald" />
        <KpiCard label="Erreurs récentes" value={status.recentErrors.length} icon={AlertOctagon} accent={status.recentErrors.length > 0 ? 'rose' : 'emerald'} />
        <KpiCard label="Utilisateurs connectés" value={status.connectedUsersCount} sublabel="actifs (15 min)" icon={Users} accent="amber" />
        <KpiCard label="Version" value={`v${status.appVersion}`} icon={Tag} accent="accent" />
        <KpiCard label="Disponibilité" value={formatUptime(status.uptimeSeconds)} sublabel="depuis le dernier déploiement" icon={Server} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--dd-ink-soft)' }}>Services</h4>
          <div className="space-y-2">
            {status.services.map((service) => {
              const meta = STATE_META[service.state];
              return (
                <div key={service.name} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--dd-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--dd-ink-soft)' }}>{service.name}</span>
                  <span className={`flex items-center gap-1.5 text-[11px] font-mono font-bold ${meta.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                    {service.detail ? ` · ${service.detail}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pt-1 flex flex-col gap-1 text-[11px]" style={{ color: 'var(--dd-ink-faint)' }}>
            <span>Dernier déploiement : {timeAgo(status.lastDeployAt)}</span>
            <span>Dernière sauvegarde : {timeAgo(status.lastBackupAt)}</span>
          </div>
        </div>

        <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--dd-ink-soft)' }}>Ressources serveur</h4>
          <UsageBar
            label="Mémoire (RAM)"
            icon={MemoryStick}
            percent={status.memory.usedPercent}
            detail={`${status.memory.usedPercent}% · ${status.memory.usedMB} / ${status.memory.totalMB} Mo`}
          />
          <UsageBar
            label="Processeur (CPU)"
            icon={Cpu}
            percent={status.cpuLoadPercent}
            detail={status.cpuLoadPercent !== null ? `${status.cpuLoadPercent}%` : 'non disponible'}
          />
          <UsageBar
            label="Stockage"
            icon={HardDrive}
            percent={status.disk?.usedPercent ?? null}
            detail={status.disk ? `${status.disk.usedPercent}% · ${status.disk.usedGB} / ${status.disk.totalGB} Go` : 'non disponible'}
          />
          <UsageBar
            label="Base de données"
            icon={Database}
            percent={null}
            detail={status.databasePingMs !== null ? `latence ${status.databasePingMs} ms` : 'indisponible'}
          />
        </div>
      </div>

      <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--dd-ink-soft)' }}>
          Erreurs récentes {status.recentErrors.length > 0 ? `(${status.recentErrors.length})` : ''}
        </h4>
        {status.recentErrors.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Aucune erreur depuis le dernier déploiement.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {status.recentErrors.map((err, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                <div className="min-w-0">
                  <p className="font-mono truncate" style={{ color: 'var(--dd-ink)' }}>{err.message}</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>{err.path}</p>
                </div>
                <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--dd-ink-faint)' }}>{timeAgo(err.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
