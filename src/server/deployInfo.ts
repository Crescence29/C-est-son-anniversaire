import fs from 'fs';
import path from 'path';

export interface DeployCommitInfo {
  sha: string;
  shortSha: string;
  date: string;
  author: string;
  message: string;
}

export interface DeployInfo {
  headSha: string;
  headShort: string;
  generatedAt: string;
  commits: DeployCommitInfo[];
}

const EMPTY: DeployInfo = { headSha: '', headShort: '', generatedAt: '', commits: [] };

let cached: DeployInfo | null = null;

// Généré par scripts/generate-deploy-info.mjs au moment du build (npm run
// build), pas au démarrage : Railway ne redéployant pas ici via son
// intégration Git, il n'y a pas de RAILWAY_GIT_COMMIT_SHA disponible à
// l'exécution pour retrouver le commit réellement déployé autrement.
export function getDeployInfo(): DeployInfo {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'deploy-info.generated.json'), 'utf8');
    cached = JSON.parse(raw);
  } catch {
    cached = EMPTY;
  }
  return cached!;
}
