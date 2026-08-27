import React, { useState } from 'react';
import { Service, Order } from '../types.ts';
import { api } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MessageSquare,
  CreditCard,
  Lock,
  Gift,
} from 'lucide-react';

interface CheckoutPageProps {
  service: Service;
  onBack: () => void;
  onOrderCreated: (order: Order) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  service,
  onBack,
  onOrderCreated,
}) => {
  const { user } = useAuth();

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('+229 ');
  const [birthdayDate, setBirthdayDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });

  const [message, setMessage] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [clientName, setClientName] = useState(
    user?.full_name || ''
  );

  const [clientPhone, setClientPhone] = useState(
    user?.phone || '+229 '
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !birthdayDate ||
      !message.trim()
    ) {
      setErrorMessage(
        'Veuillez renseigner tous les champs obligatoires : destinataire, téléphone, date et message.'
      );
      return;
    }

    if (message.trim().length < 3) {
      setErrorMessage(
        'Votre message doit contenir au moins quelques caractères.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post<{
        message: string;
        order: Order;
      }>('/orders', {
        service_id: service.id,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        birthday_date: birthdayDate,
        message: message.trim(),
        special_instructions: specialInstructions.trim(),
        client_name: clientName.trim() || user?.full_name,
        client_phone: clientPhone.trim() || user?.phone,
      });

      if (!response.order) {
        throw new Error(
          'La commande a été créée mais aucune information de commande n’a été retournée.'
        );
      }

      onOrderCreated(response.order);
    } catch (error) {
      console.error('[Checkout] Erreur création commande:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la création de la commande.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">

      {/* Retour */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card hover:bg-white/90 dark:hover:bg-white/10 text-xs font-semibold text-ink transition-all border border-black/5 dark:border-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Modifier la prestation</span>
      </button>

      {/* Titre */}
      <div>
        <span className="text-xs font-mono uppercase text-violet font-semibold tracking-wider">
          Étape 1 sur 2
        </span>

        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink mt-1">
          Personnalisez votre surprise
        </h1>

        <p className="text-xs sm:text-sm text-ink/70 mt-1 font-sans">
          Renseignez les détails pour que notre équipe prépare un moment inoubliable.
        </p>
      </div>

      {/* Prestation sélectionnée */}
      <div className="glass-card rounded-2xl p-4 border border-black/5 dark:border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">

          <img
            src={service.image_url}
            alt={service.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-xs"
          />

          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-violet font-semibold block">
              {service.category_name || 'Prestation'}
            </span>

            <h3 className="font-serif font-bold text-sm sm:text-base text-ink truncate">
              {service.name}
            </h3>

            <span className="text-xs text-ink/60 font-mono block mt-0.5">
              Délai garanti : {service.delay_label}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-base sm:text-lg font-bold text-violet block">
            {service.price.toLocaleString('fr-FR')} {service.currency}
          </span>

          <span className="text-[10px] text-emerald-600 font-mono font-medium">
            TTC & Inclus
          </span>
        </div>
      </div>

      {/* Erreur */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Destinataire */}
        <div className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 space-y-4">

          <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10">
            <Gift className="w-4 h-4 text-rose-brand" />

            <h2 className="font-serif font-bold text-sm sm:text-base text-ink">
              1. Qui fête son anniversaire ?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Nom */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Nom complet du destinataire{' '}
                <span className="text-rose-brand">*</span>
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />

                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex : Mariam Kouchanou"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Téléphone du destinataire{' '}
                <span className="text-rose-brand">*</span>
              </label>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />

                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+229 97000000"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-violet/20"
                />
              </div>
            </div>

            {/* Date */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink mb-1">
                Date exacte de la célébration{' '}
                <span className="text-rose-brand">*</span>
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />

                <input
                  type="date"
                  required
                  value={birthdayDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBirthdayDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Message */}
        <div className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 space-y-4">

          <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10">
            <MessageSquare className="w-4 h-4 text-violet" />

            <h2 className="font-serif font-bold text-sm sm:text-base text-ink">
              2. Votre message d’émotion
            </h2>
          </div>

          <div>

            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-ink">
                Texte ou dédicace à déclamer / chanter{' '}
                <span className="text-rose-brand">*</span>
              </label>

              <span className="text-[10px] font-mono text-ink/50">
                {message.length} / 500
              </span>
            </div>

            <textarea
              required
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex : Joyeux anniversaire ! Que cette nouvelle année t'apporte beaucoup de bonheur..."
              className="w-full p-3 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20 font-sans"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Instructions secrètes pour l’équipe{' '}
              <span className="text-ink/50">(optionnel)</span>
            </label>

            <textarea
              rows={2}
              maxLength={500}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Ex : Ne pas révéler qui a offert la surprise..."
              className="w-full p-3 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20 font-sans"
            />
          </div>

        </div>

        {/* Coordonnées client */}
        <div className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 space-y-4">

          <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10">
            <User className="w-4 h-4 text-gold-brand" />

            <h2 className="font-serif font-bold text-sm sm:text-base text-ink">
              3. Vos coordonnées
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Votre nom & prénom
              </label>

              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex : Sophie Mensah"
                className="w-full px-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Votre téléphone
              </label>

              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+229 97000000"
                className="w-full px-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-violet/20"
              />
            </div>

          </div>
        </div>

        {/* Récapitulatif */}
        <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-lg space-y-3">

          <div className="flex items-center justify-between text-xs text-ink/80">
            <span>Prestation choisie :</span>

            <span className="font-medium text-ink text-right ml-4">
              {service.name}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-ink/80">
            <span>Frais supplémentaires :</span>

            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">
              Offert (0 FCFA)
            </span>
          </div>

          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">

            <div>
              <span className="font-serif font-bold text-sm text-ink block">
                Total à régler
              </span>

              <span className="text-[10px] text-ink/60 font-mono">
                Paiement Mobile Money
              </span>
            </div>

            <div className="font-mono text-xl font-bold text-violet">
              {service.price.toLocaleString('fr-FR')} {service.currency}
            </div>

          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-festive w-full py-3.5 text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-rose-brand/25 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Création de votre commande...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Continuer vers le paiement</span>
              </>
            )}
          </button>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-ink/60 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />

            <span>
              Paiement sécurisé • Mobile Money
            </span>
          </div>

        </div>

      </form>
    </div>
  );
};