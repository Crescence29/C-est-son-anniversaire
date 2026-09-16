// Sur Railway (et la plupart des plateformes conteneurisées), Node's `os`
// module (totalmem/freemem/loadavg) lit les vraies statistiques de la
// MACHINE HÔTE partagée, pas la part réellement allouée à ce conteneur —
// ce qui donnait des chiffres énormes et trompeurs (ex. « 51 % de 320 Go »
// alors que ce conteneur n'a droit qu'à ~1 Go). Ce module lit les vraies
// limites/usages via cgroups (v2, avec repli v1) pour des chiffres qui
// correspondent réellement à ce que ce processus peut utiliser.
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

function readFileNumber(path: string): number | null {
  try {
    const raw = fs.readFileSync(path, 'utf8').trim();
    if (raw === 'max') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export interface ContainerMemory {
  usedPercent: number;
  totalMB: number;
  usedMB: number;
  source: 'cgroup' | 'host';
}

export function getContainerMemory(): ContainerMemory {
  const limitV2 = readFileNumber('/sys/fs/cgroup/memory.max');
  const currentV2 = readFileNumber('/sys/fs/cgroup/memory.current');
  if (limitV2 !== null && currentV2 !== null) {
    return {
      totalMB: Math.round(limitV2 / 1024 / 1024),
      usedMB: Math.round(currentV2 / 1024 / 1024),
      usedPercent: Math.round((currentV2 / limitV2) * 100),
      source: 'cgroup',
    };
  }

  const limitV1 = readFileNumber('/sys/fs/cgroup/memory/memory.limit_in_bytes');
  const currentV1 = readFileNumber('/sys/fs/cgroup/memory/memory.usage_in_bytes');
  // Un très grand memory.limit_in_bytes (proche de 2^63) veut dire "pas de
  // limite définie" en cgroup v1 — pas une vraie valeur à afficher.
  if (limitV1 !== null && currentV1 !== null && limitV1 < 1e15) {
    return {
      totalMB: Math.round(limitV1 / 1024 / 1024),
      usedMB: Math.round(currentV1 / 1024 / 1024),
      usedPercent: Math.round((currentV1 / limitV1) * 100),
      source: 'cgroup',
    };
  }

  // Repli (poste local / plateforme sans cgroups) : stats de la machine hôte.
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return {
    totalMB: Math.round(totalMem / 1024 / 1024),
    usedMB: Math.round(usedMem / 1024 / 1024),
    usedPercent: Math.round((usedMem / totalMem) * 100),
    source: 'host',
  };
}

export interface ContainerCpu {
  usedPercent: number | null;
  allocatedCpus: number | null;
  source: 'cgroup' | 'host' | 'unknown';
}

function readCpuMax(): number | null {
  try {
    const raw = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim();
    const [quotaStr, periodStr] = raw.split(/\s+/);
    if (quotaStr === 'max') return null;
    const quota = Number(quotaStr);
    const period = Number(periodStr);
    if (!quota || !period) return null;
    return quota / period;
  } catch {
    return null;
  }
}

function readCpuUsageUsec(): number | null {
  try {
    const raw = fs.readFileSync('/sys/fs/cgroup/cpu.stat', 'utf8');
    const match = raw.match(/^usage_usec (\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

// Deux lectures de cpu.stat espacées dans le temps donnent le vrai taux
// d'utilisation CPU de ce conteneur (pas celui de la machine hôte à 48
// coeurs) — gardé en mémoire entre deux appels de /system-status plutôt que
// de bloquer la requête sur un vrai sleep().
let lastCpuSample: { usageUsec: number; atMs: number } | null = null;

export function getContainerCpu(): ContainerCpu {
  const allocatedCpus = readCpuMax();
  const usageUsec = readCpuUsageUsec();

  if (usageUsec !== null) {
    const now = Date.now();
    let usedPercent: number | null = null;
    if (lastCpuSample) {
      const deltaUsec = usageUsec - lastCpuSample.usageUsec;
      const deltaMs = now - lastCpuSample.atMs;
      if (deltaMs > 0) {
        const cpus = allocatedCpus || 1;
        usedPercent = Math.max(0, Math.min(100, Math.round((deltaUsec / 1000 / deltaMs / cpus) * 100)));
      }
    }
    lastCpuSample = { usageUsec, atMs: now };
    return { usedPercent, allocatedCpus, source: 'cgroup' };
  }

  // Repli : charge moyenne de la machine hôte (moins précis, seulement si
  // les cgroups ne sont pas disponibles, ex. développement local).
  if (process.platform === 'win32') return { usedPercent: null, allocatedCpus: null, source: 'unknown' };
  const cpuCount = os.cpus()?.length || 0;
  if (!cpuCount) return { usedPercent: null, allocatedCpus: null, source: 'unknown' };
  return {
    usedPercent: Math.min(100, Math.round((os.loadavg()[0] / cpuCount) * 100)),
    allocatedCpus: cpuCount,
    source: 'host',
  };
}

export interface AppStorage {
  usedMB: number;
}

let cachedStorage: { value: AppStorage; expiresAt: number } | null = null;

// L'espace disque de ce conteneur est un volume overlay partagé avec
// d'autres conteneurs sur la même machine hôte Railway — il n'y a pas de
// quota par conteneur exposé de façon fiable. On mesure donc ce que
// l'application occupe réellement (code + dépendances), un chiffre plus
// petit mais honnête, plutôt que le disque de l'hôte entier. `du` étant
// relativement lent, le résultat est gardé en cache une minute.
export function getAppStorage(): AppStorage | null {
  if (cachedStorage && cachedStorage.expiresAt > Date.now()) return cachedStorage.value;
  try {
    const output = execSync(`du -sm "${process.cwd()}"`, { encoding: 'utf8', timeout: 5000 });
    const usedMB = Number(output.trim().split(/\s+/)[0]);
    if (!Number.isFinite(usedMB)) return null;
    const value = { usedMB };
    cachedStorage = { value, expiresAt: Date.now() + 60_000 };
    return value;
  } catch {
    return null;
  }
}
