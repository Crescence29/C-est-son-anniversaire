import React, { useCallback, useEffect, useState } from 'react';
import {
  Server, Database, HardDrive, Cpu, MemoryStick, Clock, Users, Tag,
  Gauge, ListChecks, AlertOctagon, DatabaseBackup, RotateCw, X,
} from 'lucide-react';
import { api } from '../../utils/api.ts';
import { SystemStatus, ServiceHealthState } from '../../types.ts';
import { KpiCard } from './KpiCard.tsx';
import { SkeletonCard } from './SkeletonCard.tsx';

const ROLE_LABEL: Record<string, string> = { client: 'Client', staff: 'Staff', admin: 'Admin' };

const STATE_META: Record<ServiceHealthState, { label: string; dot: string; text: string }> = {
  ok: { label: 'Opérationnel', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  degraded: { label: 'Dégradé', dot: 'bg-amber-400', text: 'text-amber-400' },
  down: { label: 'En panne', dot: 'bg-red-400', text: 'text-red-400' },
  unknown: { label: 'Non disponible', dot: 'bg-slate-400/50', text: 'text-slate-400' },
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

const UsageBar: React.FC<{ label: string; icon: React.ElementType; percent: number | null; detail: string; onClick?: () => void }> = ({ label, icon: Icon, percent, detail, onClick }) => {
  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`space-y-1.5 w-full text-left ${onClick ? 'cursor-pointer group' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--dd-ink-soft)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--dd-accent)' }} />
          {label}
          {onClick && <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--dd-accent)' }}>Détail →</span>}
        </span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>{detail}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dd-border)' }}>
        {percent !== null && (
          <div className={`h-full rounded-full ${barColor(percent)}`} style={{ width: `${Math.min(100, percent)}%` }} />
        )}
      </div>
    </Wrapper>
  );
};

const DetailModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl p-5 max-h-[80vh] overflow-y-auto"
      style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>{title}</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          style={{ color: 'var(--dd-ink-soft)' }}
          aria-label="Fermer"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
      {children}
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
  const [detail, setDetail] = useState<'errors' | 'users' | 'memory' | 'cpu' | 'disk' | 'database' | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<{ status: SystemStatus }>('/developer/system-status');
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
        <KpiCard label="Erreurs récentes" value={status.recentErrors.length} icon={AlertOctagon} accent={status.recentErrors.length > 0 ? 'rose' : 'emerald'} onClick={() => setDetail('errors')} />
        <KpiCard label="Utilisateurs connectés" value={status.connectedUsersCount} sublabel="actifs (15 min)" icon={Users} accent="amber" onClick={() => setDetail('users')} />
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
            onClick={() => setDetail('memory')}
          />
          <UsageBar
            label="Processeur (CPU)"
            icon={Cpu}
            percent={status.cpuLoadPercent}
            detail={status.cpuLoadPercent !== null ? `${status.cpuLoadPercent}%` : 'non disponible'}
            onClick={() => setDetail('cpu')}
          />
          <UsageBar
            label="Stockage"
            icon={HardDrive}
            percent={null}
            detail={status.disk ? `${status.disk.appUsedMB} Mo (application)` : 'non disponible'}
            onClick={() => setDetail('disk')}
          />
          <UsageBar
            label="Base de données"
            icon={Database}
            percent={null}
            detail={status.databasePingMs !== null ? `latence ${status.databasePingMs} ms` : 'indisponible'}
            onClick={() => setDetail('database')}
          />
        </div>
      </div>

      {detail === 'errors' && (
        <DetailModal title={`Erreurs récentes ${status.recentErrors.length > 0 ? `(${status.recentErrors.length})` : ''}`} onClose={() => setDetail(null)}>
          {status.recentErrors.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Aucune erreur depuis le dernier déploiement.</p>
          ) : (
            <div className="space-y-1.5">
              {status.recentErrors.map((err, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                  <div className="min-w-0">
                    <p className="font-mono break-words" style={{ color: 'var(--dd-ink)' }}>{err.message}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--dd-ink-faint)' }}>{err.path}</p>
                  </div>
                  <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--dd-ink-faint)' }}>{timeAgo(err.at)}</span>
                </div>
              ))}
            </div>
          )}
        </DetailModal>
      )}

      {detail === 'users' && (
        <DetailModal title={`Utilisateurs connectés (${status.connectedUsers.length})`} onClose={() => setDetail(null)}>
          {status.connectedUsers.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Personne n’a été actif au cours des 15 dernières minutes.</p>
          ) : (
            <div className="space-y-1.5">
              {status.connectedUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--dd-ink)' }}>{u.name}</p>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--dd-ink-faint)' }}>{ROLE_LABEL[u.role] || u.role}</p>
                  </div>
                  <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--dd-ink-faint)' }}>{timeAgo(u.lastActiveAt)}</span>
                </div>
              ))}
            </div>
          )}
        </DetailModal>
      )}

      {detail === 'memory' && (
        <DetailModal title="Mémoire (RAM)" onClose={() => setDetail(null)}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <DetailStat label="Utilisée" value={`${status.memory.usedMB} Mo`} />
              <DetailStat label="Allouée à ce conteneur" value={`${status.memory.totalMB} Mo`} />
              <DetailStat label="Occupation" value={`${status.memory.usedPercent}%`} />
              <DetailStat label="Source" value={status.memory.source === 'cgroup' ? 'Conteneur (réel)' : 'Machine hôte (repli)'} />
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--dd-border)' }}>
              <p className="font-bold mb-1.5" style={{ color: 'var(--dd-ink)' }}>Détail du processus Node</p>
              <div className="grid grid-cols-3 gap-2">
                <DetailStat label="RSS" value={`${status.memory.processRssMB} Mo`} />
                <DetailStat label="Tas utilisé" value={`${status.memory.processHeapUsedMB} Mo`} />
                <DetailStat label="Tas alloué" value={`${status.memory.processHeapTotalMB} Mo`} />
              </div>
            </div>
            <p className="text-[11px] pt-1" style={{ color: 'var(--dd-ink-faint)' }}>
              {status.memory.source === 'cgroup'
                ? "Mesure réelle de ce conteneur (cgroup), pas de la machine physique partagée par Railway."
                : "Mesure de repli (machine complète) — les informations de conteneur (cgroup) ne sont pas disponibles ici."}
              {' '}Pour libérer de la mémoire durablement, utilisez « Vider le cache » dans le Centre de maintenance ; un redémarrage du serveur revient aussi à zéro.
            </p>
          </div>
        </DetailModal>
      )}

      {detail === 'cpu' && (
        <DetailModal title="Processeur (CPU)" onClose={() => setDetail(null)}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <DetailStat label="Utilisation" value={status.cpuLoadPercent !== null ? `${status.cpuLoadPercent}%` : 'non disponible'} />
              <DetailStat label="vCPU alloués" value={status.cpuAllocated !== null ? String(status.cpuAllocated) : 'inconnu'} />
              <DetailStat label="Source" value={status.cpuSource === 'cgroup' ? 'Conteneur (réel)' : status.cpuSource === 'host' ? 'Machine hôte (repli)' : 'Indisponible'} />
            </div>
            <p className="text-[11px] pt-1" style={{ color: 'var(--dd-ink-faint)' }}>
              {status.cpuSource === 'cgroup'
                ? "Calculée sur la fenêtre écoulée depuis la dernière lecture (ce panneau s'actualise toutes les 30s) — pas la charge de la machine hôte à plusieurs dizaines de coeurs partagée entre de nombreux clients Railway."
                : "Les informations de conteneur (cgroup) ne sont pas disponibles ici ; repli sur la charge de la machine complète."}
            </p>
          </div>
        </DetailModal>
      )}

      {detail === 'disk' && (
        <DetailModal title="Stockage" onClose={() => setDetail(null)}>
          <div className="space-y-3 text-xs">
            <DetailStat label="Occupé par l'application" value={status.disk ? `${status.disk.appUsedMB} Mo` : 'non disponible'} />
            <p className="text-[11px] pt-1" style={{ color: 'var(--dd-ink-faint)' }}>
              Taille du code et des dépendances installées (dossier de l'application), pas l'espace disque total de la machine hôte : ce disque est un volume partagé entre plusieurs conteneurs Railway sur la même machine, sans quota individuel exposé de façon fiable à mesurer depuis l'intérieur. Voir l'onglet « Fichiers & médias » pour l'audit des liens médias (aucun fichier utilisateur n'est stocké ici).
            </p>
          </div>
        </DetailModal>
      )}

      {detail === 'database' && (
        <DetailModal title="Base de données" onClose={() => setDetail(null)}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <DetailStat label="État" value={STATE_META[status.databaseState].label} />
              <DetailStat label="Latence" value={status.databasePingMs !== null ? `${status.databasePingMs} ms` : 'indisponible'} />
            </div>
            <p className="text-[11px] pt-1" style={{ color: 'var(--dd-ink-faint)' }}>
              Pour le détail complet (nombre de tables, taille, connexions actives, requêtes lentes, vérification d'intégrité), ouvrez l'onglet « Base de données ».
            </p>
          </div>
        </DetailModal>
      )}
    </div>
  );
};

const DetailStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl p-2.5" style={{ background: 'var(--dd-panel-hover)' }}>
    <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--dd-ink-faint)' }}>{label}</div>
    <div className="font-mono font-bold" style={{ color: 'var(--dd-ink)' }}>{value}</div>
  </div>
);
