import React, { useEffect, useState } from 'react';
import { X, ChevronDown, MessageCircle, Mail } from 'lucide-react';
import { FaqItem } from '../types.ts';
import { api } from '../utils/api.ts';

interface HelpContactModalProps {
  type: 'help' | 'contact' | null;
  onClose: () => void;
}

const FALLBACK_FAQ_ITEMS = [
  {
    question: 'Comment se déroule une prestation en direct ?',
    answer: 'Après votre commande, notre équipe programme le passage (dédicace, chant, appel...) à l’horaire ou dans le créneau indiqué, puis vous remet un souvenir HD de l’émotion.',
  },
  {
    question: 'Quels moyens de paiement acceptez-vous ?',
    answer: 'Le paiement se fait par Mobile Money (MTN Mobile Money ou Orange Money), débit instantané et sécurisé depuis votre téléphone.',
  },
  {
    question: 'Quel est le délai de réalisation ?',
    answer: 'Chaque prestation affiche un délai indicatif (de 3h à 72h selon la formule choisie). L’horaire précis est confirmé juste après le paiement.',
  },
  {
    question: 'Puis-je suivre ma commande ?',
    answer: 'Oui : depuis Mon compte > Mes commandes, vous suivez chaque étape jusqu’à la livraison du souvenir.',
  },
];

export const HelpContactModal: React.FC<HelpContactModalProps> = ({ type, onClose }) => {
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>(FALLBACK_FAQ_ITEMS);

  useEffect(() => {
    if (type !== 'help') return;
    api.get<{ faq: FaqItem[] }>('/faq')
      .then((res) => {
        if (res.faq && res.faq.length > 0) setFaqItems(res.faq);
      })
      .catch(() => {});
  }, [type]);

  if (!type) return null;
  const isHelp = type === 'help';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plum/70 backdrop-blur-md sheet-backdrop-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md glass-panel rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/20 p-5 sm:p-6 text-ink max-h-[85vh] overflow-y-auto sheet-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold text-lg text-ink">
            {isHelp ? 'Centre d’aide' : 'Contactez-nous'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/10 dark:hover:bg-white/15 rounded-full text-ink transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isHelp ? (
          <div className="space-y-2.5">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group border border-black/5 dark:border-white/10 rounded-2xl p-3.5 open:bg-white/50 dark:open:bg-white/5"
              >
                <summary className="text-sm font-semibold text-ink cursor-pointer flex items-center justify-between list-none gap-2">
                  <span>{item.question}</span>
                  <ChevronDown className="w-4 h-4 text-ink/50 shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-xs text-ink/70 mt-2 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <a
              href="https://wa.me/2250700000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-black/5 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">WhatsApp</p>
                <p className="text-xs text-ink/60">+225 07 00 00 00 00</p>
              </div>
            </a>

            <a
              href="mailto:contact@cestsonanniversaire.ci"
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-black/5 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-violet/10 text-violet flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Email</p>
                <p className="text-xs text-ink/60">contact@cestsonanniversaire.ci</p>
              </div>
            </a>

            <p className="text-[11px] text-ink/50 text-center pt-1">
              Notre équipe répond du lundi au samedi, 8h–20h.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
