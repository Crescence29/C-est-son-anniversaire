import React, { useEffect } from 'react';
import { Order } from '../types.ts';
import { AppLogo } from '../components/AppLogo.tsx';
import { CheckCircle2, Sparkles, ArrowRight, Download, Calendar, User, Phone, Gift, ShieldCheck } from 'lucide-react';

interface PaymentSuccessPageProps {
  order: Order;
  onViewOrder: (orderId: string) => void;
  onGoHome: () => void;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  order,
  onViewOrder,
  onGoHome,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28 space-y-6">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl border-4 border-white">
            <CheckCircle2 className="w-9 h-9" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          Paiement Confirmé avec succès !
        </div>

        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
          Votre surprise est officiellement en route 🎉
        </h1>

        <p className="text-xs sm:text-sm text-ink/75 max-w-md mx-auto font-sans leading-relaxed">
          Merci pour votre confiance. Notre équipe régie et nos artistes ont reçu vos consignes et débutent la préparation.
        </p>
      </div>

      {/* Official Receipt Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-xl space-y-5 relative">
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" showText={false} />
            <div>
              <span className="font-serif font-bold text-sm text-ink block">Reçu de Célébration</span>
              <span className="font-mono text-xs text-ink/60">N° {order.order_number}</span>
            </div>
          </div>

          <span className="text-xs font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
            PAYÉE ✓
          </span>
        </div>

        {/* Order Meta details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-ink/60 font-mono block">Destinataire (Jubilaire) :</span>
            <span className="font-semibold text-ink text-sm block mt-0.5">{order.recipient_name}</span>
            <span className="text-ink/60 font-mono">{order.recipient_phone}</span>
          </div>

          <div>
            <span className="text-ink/60 font-mono block">Date de l’anniversaire :</span>
            <span className="font-semibold text-ink text-sm block mt-0.5">
              {new Date(order.birthday_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="text-violet font-semibold">Délai respecté</span>
          </div>

          <div className="col-span-2 pt-2 border-t border-black/5 dark:border-white/10">
            <span className="text-ink/60 font-mono block">Prestation réservée :</span>
            <span className="font-semibold text-ink text-sm block mt-0.5">{order.service_name}</span>
          </div>

          {order.message && (
            <div className="col-span-2 p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <span className="text-[10px] font-mono uppercase text-violet font-semibold block mb-1">
                Votre mot personnalisé :
              </span>
              <p className="text-xs text-ink/80 italic">« {order.message} »</p>
            </div>
          )}
        </div>

        {/* Total Paid */}
        <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="font-serif font-bold text-xs text-ink block">Montant total réglé</span>
            <span className="text-[10px] text-ink/60 font-mono">{order.payment_method || 'Mobile Money'}</span>
          </div>
          <div className="font-mono text-xl font-bold text-violet">
            {order.amount.toLocaleString()} {order.currency}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onViewOrder(order.id)}
          className="btn-festive flex-1 py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-brand/25"
        >
          <Gift className="w-4 h-4" />
          <span>Suivre ma commande en direct</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGoHome}
          className="px-5 py-3 rounded-full glass-card hover:bg-white/90 dark:hover:bg-white/10 text-ink text-xs font-semibold border border-black/10 dark:border-white/10 transition-all text-center"
        >
          Retour à l’accueil
        </button>
      </div>
    </div>
  );
};
