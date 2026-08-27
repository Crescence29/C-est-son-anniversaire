import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { SiteSettings } from '../types.ts';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  imageSrc?: string;
}

const sizeMap = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const textSizeMap = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

// Réglage global (logo image ou nom de marque à la place) : chargé une seule
// fois et partagé par tous les <AppLogo> affichés sur la page.
let cachedLogoSettings: { logo_mode: SiteSettings['logo_mode']; logo_text: string } | null = null;
const logoSettingsListeners = new Set<(v: typeof cachedLogoSettings) => void>();

function fetchLogoSettingsOnce() {
  if (cachedLogoSettings) return;
  api.get<{ settings: SiteSettings }>('/settings')
    .then((res) => {
      if (!res.settings) return;
      cachedLogoSettings = { logo_mode: res.settings.logo_mode, logo_text: res.settings.logo_text };
      logoSettingsListeners.forEach((listener) => listener(cachedLogoSettings));
    })
    .catch(() => {});
}

// Appelé après une sauvegarde des réglages du site pour que le logo affiché
// dans la barre de navigation se mette à jour immédiatement, sans rechargement.
export function refreshAppLogo() {
  cachedLogoSettings = null;
  fetchLogoSettingsOnce();
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  onClick,
  imageSrc = '/CSA-logo-png.png',
}) => {
  const [logoSettings, setLogoSettings] = useState(cachedLogoSettings);

  useEffect(() => {
    fetchLogoSettingsOnce();
    logoSettingsListeners.add(setLogoSettings);
    return () => {
      logoSettingsListeners.delete(setLogoSettings);
    };
  }, []);

  const isTextMode = logoSettings?.logo_mode === 'text';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      {isTextMode ? (
        <span className={`font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-brand to-gold-brand leading-none whitespace-nowrap ${textSizeMap[size]}`}>
          {logoSettings?.logo_text || 'C’est son anniversaire'}
        </span>
      ) : (
        <div className={`relative ${sizeMap[size]} shrink-0 drop-shadow-md`}>
          <img
            src={imageSrc}
            alt="C'est son anniversaire logo"
            className="w-full h-full object-contain rounded-full shadow-inner"
          />
        </div>
      )}

      {showText && !isTextMode && (
        <div className="flex flex-col">
          <span className="font-serif font-bold text-ink leading-tight text-base sm:text-lg tracking-tight">
            C’EST SON ANNIVERSAIRE
          </span>
          <span className="text-[10px] text-violet/80 font-mono uppercase tracking-widest -mt-0.5">
            Moments d’émotion
          </span>
        </div>
      )}
    </div>
  );
};
