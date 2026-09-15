// Capture le vrai commit déployé et les derniers commits (utilisés comme
// historique/changelog réel dans le tableau de bord développeur), au moment
// du build — Railway ne redéployant pas via son intégration Git ici,
// aucune variable d'environnement RAILWAY_GIT_* n'est disponible à
// l'exécution pour le savoir autrement.
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

function safeExec(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

const headSha = safeExec('git rev-parse HEAD', '');
const headShort = safeExec('git rev-parse --short HEAD', '');
const log = safeExec('git log -20 --pretty=format:%H%x1f%h%x1f%ad%x1f%an%x1f%s --date=iso-strict', '');

const commits = log
  ? log.split('\n').filter(Boolean).map((line) => {
      const [sha, shortSha, date, author, message] = line.split('\x1f');
      return { sha, shortSha, date, author, message };
    })
  : [];

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'deploy-info.generated.json');
writeFileSync(outPath, JSON.stringify({ headSha, headShort, generatedAt: new Date().toISOString(), commits }, null, 2));

console.log(`[build] Informations de déploiement générées (${commits.length} commit(s), HEAD ${headShort || 'inconnu'}).`);
