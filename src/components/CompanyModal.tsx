import React, { useEffect, useState } from 'react';
import { X, Globe, Video, Mic2, Clapperboard, Code2, Palette, ClipboardList } from 'lucide-react';
import { SOCIAL_LINKS } from '../data/socialLinks.ts';
import { SiteSettings } from '../types.ts';
import { api } from '../utils/api.ts';

interface CompanyModalProps {
  open: boolean;
  onClose: () => void;
}

const EXPERTISE_AREAS = [
  {
    icon: Video,
    title: 'Production & Communication Audiovisuelle',
    description: 'Conception, réalisation et diffusion de contenus pour la télévision, la radio, les événements et les plateformes digitales.',
    accent: 'bg-violet/10 text-violet',
  },
  {
    icon: Mic2,
    title: 'Médias & Animation',
    description: 'Émissions, interviews, dédicaces, chroniques, couvertures médiatiques et programmes en direct.',
    accent: 'bg-rose-brand/10 text-rose-brand',
  },
  {
    icon: Clapperboard,
    title: 'Régie Générale de Productions Audiovisuelles',
    description: 'Coordination technique et artistique, captation, réalisation, production et gestion de dispositifs audiovisuels.',
    accent: 'bg-gold-brand/10 text-gold-brand',
  },
  {
    icon: Code2,
    title: 'Solutions Numériques',
    description: 'Conception et développement de solutions digitales adaptées aux besoins des entreprises, institutions et organisations.',
    accent: 'bg-violet/10 text-violet',
  },
  {
    icon: Palette,
    title: 'Communication Visuelle',
    description: 'Création graphique, identité visuelle, supports publicitaires et contenus visuels destinés à renforcer l’image des marques.',
    accent: 'bg-rose-brand/10 text-rose-brand',
  },
  {
    icon: ClipboardList,
    title: 'Consultation Audiovisuelle',
    description: 'Conseil, accompagnement et orientation stratégique pour la conception, la production et la diffusion de projets audiovisuels.',
    accent: 'bg-gold-brand/10 text-gold-brand',
  },
];

export const CompanyModal: React.FC<CompanyModalProps> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<Partial<SiteSettings>>({});

  useEffect(() => {
    if (!open) return;
    api.get<{ settings: SiteSettings }>('/settings')
      .then((res) => setSettings(res.settings || {}))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plum/70 backdrop-blur-md sheet-backdrop-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg glass-panel rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/20 p-5 sm:p-6 text-ink max-h-[85vh] overflow-y-auto sheet-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-black/10 dark:hover:bg-white/15 rounded-full text-ink transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-md">
            <img src="/CORTEX.jpg" alt="Cortex Bénin TV" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-ink leading-tight">Cortex Bénin TV</h3>
            <p className="text-xs text-ink/60">Média radio & télévision</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-ink/75 leading-relaxed mb-6">
          <p>
            <strong className="text-ink">Cortex Bénin TV</strong> est une entreprise créative et technologique
            spécialisée dans la communication audiovisuelle, la production médiatique et le développement de
            solutions numériques et visuelles.
          </p>
          <p>
            À travers son univers radio, télévision et digital, Cortex Bénin TV accompagne les particuliers,
            les entreprises, les institutions et les marques dans la conception, la production et la diffusion
            de contenus à fort impact.
          </p>
          <p>
            Nous plaçons également l’humain au cœur de notre métier. Nos animateurs, artistes et équipes de
            production donnent vie à chaque dédicace, chaque chant, chaque appel surprise et chaque cadeau,
            diffusés en direct sur nos antennes. Notre ambition : transformer un simple message en émotion,
            en partage et en souvenir inoubliable.
          </p>
        </div>

        <h4 className="font-serif font-bold text-sm text-ink mb-3">Nos pôles d’expertise</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {EXPERTISE_AREAS.map(({ icon: Icon, title, description, accent }, index) => (
            <div
              key={title}
              className="service-card-in glass-card rounded-2xl p-3.5 border border-black/5 dark:border-white/10"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${accent}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h5 className="text-xs font-bold text-ink leading-snug mb-1">{title}</h5>
              <p className="text-[11px] text-ink/65 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink/70 leading-relaxed italic mb-6 pb-6 border-b border-black/5 dark:border-white/10">
          Cortex Bénin TV,  nous  ne produisons pas seulement des contenus. Nous créons des expériences,
          transmettons des émotions et donnons une voix aux histoires qui méritent d’être entendues.
        </p>

        <div className="grid grid-cols-4 gap-2.5">
          {SOCIAL_LINKS.map(({ key, icon: Icon, label, href, accent }) => {
            const url = settings[key] || href;
            if (!url) {
              return (
                <div
                  key={label}
                  title="Bientôt disponible"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-black/5 dark:border-white/10 opacity-40 cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-ink/10 text-ink/40">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-medium text-ink/50 text-center">{label}</span>
                </div>
              );
            }
            return (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-black/5 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-medium text-ink/70 text-center">{label}</span>
              </a>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl border border-black/5 dark:border-white/10 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ink/10 text-ink flex items-center justify-center shrink-0">
              <Globe className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm font-semibold text-ink">Site web</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink/50 px-2 py-1 rounded-full bg-ink/5 whitespace-nowrap">
            Bientôt disponible
          </span>
        </div>
      </div>
    </div>
  );
};
