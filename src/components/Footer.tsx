import React, { useEffect, useState } from 'react';
import { SiteSettings } from '../types.ts';
import { api } from '../utils/api.ts';
import { AppLogo } from './AppLogo.tsx';
import { SOCIAL_LINKS } from '../data/socialLinks.ts';

interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<Partial<SiteSettings>>({});

  useEffect(() => {
    api.get<{ settings: SiteSettings }>('/settings')
      .then((res) => setSettings(res.settings || {}))
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-plum text-white pt-14 pb-24 md:pb-12 mt-20 border-t border-white/10 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-violet/20 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-12 border-b border-white/10 mb-12">
          <div>
            <h4 className="font-serif font-bold text-sm text-white">Émotion 100% Garantie</h4>
            <p className="text-xs text-white/60">Une équipe d’artistes et animateurs passionnés.</p>
          </div>

          <div>
            <h4 className="font-serif font-bold text-sm text-white">Paiement Mobile Sécurisé</h4>
            <p className="text-xs text-white/60">Débit direct MTN Mobile Money & Orange Money.</p>
          </div>

          <div>
            <h4 className="font-serif font-bold text-sm text-white">Précision & Ponctualité</h4>
            <p className="text-xs text-white/60">Programmation minutée et livrables HD conservés.</p>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10">
          <div className="md:col-span-2">
            <AppLogo size="md" showText={false} className="mb-4" />
            <h3 className="font-serif font-bold text-lg text-white mb-2">
              C’EST SON ANNIVERSAIRE
            </h3>
            <p className="text-xs text-white/70 leading-relaxed max-w-md mb-4 font-sans">
              « Un cadeau qui se vit, pas qui se déballe. » La première plateforme mobile-first
              dédiée à l’orchestration de surprises inoubliables : dédicaces en direct, sérénades,
              appels complices et gâteaux festifs.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold-brand px-2 py-1 rounded-md bg-gold-brand/10 border border-gold-brand/20">
                Paiement Mobile Money
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-brand px-2 py-1 rounded-md bg-rose-brand/10 border border-rose-brand/20">
                Direct Radio & TV
              </span>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-serif font-bold text-sm text-white mb-3">Prestations</h4>
              <ul className="space-y-2 text-xs text-white/70">
                <li>
                  <button onClick={() => onNavigate('catalog', 'dedicace')} className="hover:text-gold-brand transition-colors">
                    Dédicaces en émission
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('catalog', 'chant')} className="hover:text-gold-brand transition-colors">
                    Sérénades & Chants live
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('catalog', 'cadeau')} className="hover:text-gold-brand transition-colors">
                    Gâteaux & Bouquets surprises
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('catalog', 'appel-surprise')} className="hover:text-gold-brand transition-colors">
                    Appels en direct antenne
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('catalog', 'surprise-complete')} className="hover:text-gold-brand transition-colors">
                    Packs Célébration Luxe
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-bold text-sm text-white mb-3">Espace & Accès</h4>
              <ul className="space-y-2 text-xs text-white/70">
                <li>
                  <button onClick={() => onNavigate('account')} className="hover:text-gold-brand transition-colors">
                    Mon compte client
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('staff')} className="hover:text-gold-brand transition-colors">
                    Portail Régie & Staff
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('admin')} className="hover:text-gold-brand transition-colors">
                    Espace Administration
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('home')} className="hover:text-gold-brand transition-colors">
                    Moments Magiques vidéo
                  </button>
                </li>
              </ul>
            </div>

            {/* Social icons, aligned under both columns */}
            <div className="col-span-2 flex flex-col items-center mt-4">
              <div className="flex items-center justify-center gap-3">
                {SOCIAL_LINKS.map(({ key, icon: Icon, label, href, accent }) => {
                  const url = settings[key] || href;
                  if (!url) {
                    return (
                      <span
                        key={label}
                        title={`${label} — Bientôt disponible`}
                        aria-label={`${label} — Bientôt disponible`}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-white/25 cursor-not-allowed"
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                    );
                  }
                  return (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${accent}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
              <span className="text-[11px] text-white/50 mt-2.5">Suivez-nous sur les réseaux</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© 2026 C’EST SON ANNIVERSAIRE. Tous droits réservés.</p>
          <div className="flex items-center gap-1 text-white/60">
            <span>CORTEX BENIN TV</span>
            {/*/<Heart className="w-3.5 h-3.5 text-rose-brand fill-current" />*/}
          </div>
        </div>
      </div>
    </footer>
  );
};
