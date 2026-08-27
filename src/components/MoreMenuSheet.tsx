import React from 'react';
import { X, LifeBuoy, MessageCircle, Star, ChevronRight, MessageSquareHeart } from 'lucide-react';

interface MoreMenuSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
  onOpenContact: () => void;
  onGoToReviews: () => void;
  onOpenSupportMessages: () => void;
}

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  open,
  onClose,
  onOpenHelp,
  onOpenContact,
  onGoToReviews,
  onOpenSupportMessages,
}) => {
  if (!open) return null;

  const items = [
    {
      icon: LifeBuoy,
      label: 'Centre d’aide',
      description: 'Questions fréquentes et fonctionnement',
      onClick: onOpenHelp,
      accent: 'bg-violet/10 text-violet',
    },
    {
      icon: MessageCircle,
      label: 'Contactez-nous',
      description: 'WhatsApp, email et horaires',
      onClick: onOpenContact,
      accent: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      icon: MessageSquareHeart,
      label: 'Avis & Suggestions',
      description: 'Envoyez une question à notre équipe',
      onClick: onOpenSupportMessages,
      accent: 'bg-rose-brand/10 text-rose-brand',
    },
    {
      icon: Star,
      label: 'Avis clients',
      description: 'Ce que disent nos jubilaires',
      onClick: onGoToReviews,
      accent: 'bg-gold-brand/10 text-gold-brand',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-plum/60 backdrop-blur-sm sheet-backdrop-in" onClick={onClose} />

      <div className="absolute bottom-0 inset-x-0 glass-panel rounded-t-3xl border-t border-white/60 dark:border-white/10 shadow-2xl p-4 pb-8 sheet-slide-in">
        <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-serif font-bold text-base text-ink">Plus d’options</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-ink/60 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {items.map(({ icon: Icon, label, description, onClick, accent }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accent}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-[11px] text-ink/60 truncate">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
