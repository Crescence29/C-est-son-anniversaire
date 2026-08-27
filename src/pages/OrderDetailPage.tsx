import React, { useState, useEffect } from 'react';
import { Order, OrderDeliverable, Review, Payment } from '../types.ts';
import { api } from '../utils/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { AppLogo } from '../components/AppLogo.tsx';
import {
  ArrowLeft,
  Calendar,
  Phone,
  User,
  Gift,
  Play,
  Download,
  Star,
  Sparkles,
  CheckCircle2,
  Clock,
  Music,
  FileText,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
  onPayNow: (order: Order) => void;
}

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({
  orderId,
  onBack,
  onPayNow,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review Form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Cancel Order
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchOrderDetail = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<{
        order: Order;
        payment: Payment;
        review: Review;
      }>(`/orders/${orderId}`);

      setOrder(data.order);
      setPayment(data.payment);
      setReview(data.review);
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    try {
      setIsSubmittingReview(true);
      const res = await api.post<{ review: Review }>('/reviews', {
        order_id: order.id,
        rating,
        comment,
      });
      setReview(res.review);
      setReviewSuccess(true);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      setIsCancelling(true);
      setCancelError('');
      const res = await api.post<{ order: Order }>(`/orders/${order.id}/cancel`, {});
      setOrder(res.order);
      setShowCancelConfirm(false);
    } catch (err: any) {
      setCancelError(err?.message || 'Erreur lors de l’annulation.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-violet border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-ink/60 font-mono">Chargement du suivi de la commande...</p>
      </div>
    );
  }

  // Pipeline steps
  const steps = [
    { key: 'pending_payment', label: 'Commande initiée' },
    { key: 'paid', label: 'Paiement validé' },
    { key: 'accepted', label: 'Acceptée régie' },
    { key: 'in_progress', label: 'En cours d’exécution' },
    { key: 'delivered', label: 'Surprise livrée 🎉' },
  ];

  const getStepIndex = (status: string) => {
    const map: Record<string, number> = {
      pending_payment: 0,
      paid: 1,
      accepted: 2,
      in_progress: 3,
      delivered: 4,
    };
    return map[status] ?? 0;
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card hover:bg-white/90 dark:hover:bg-white/10 text-xs font-semibold text-ink transition-all border border-black/5 dark:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Mes commandes</span>
        </button>

        <StatusBadge status={order.status} size="md" />
      </div>

      {/* Header Info */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-black/5 dark:border-white/10">
          <div>
            <span className="text-[11px] font-mono text-ink/60">Commande #{order.order_number}</span>
            <h1 className="font-serif font-bold text-xl sm:text-2xl text-ink mt-0.5">
              {order.service_name}
            </h1>
          </div>
          <div className="text-left sm:text-right">
            <span className="font-mono text-lg font-bold text-violet">
              {order.amount.toLocaleString()} {order.currency}
            </span>
            <span className="text-[10px] text-ink/60 font-mono block">
              {order.payment_method || 'Mobile Money'}
            </span>
          </div>
        </div>

        {/* Progress Pipeline */}
        <div className="py-2">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black/10 dark:bg-white/10 w-full -z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-violet to-emerald-500 transition-all duration-500 -z-0"
              style={{
                width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
              }}
            />

            {steps.map((s, idx) => {
              const isPassed = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={s.key} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPassed
                        ? 'bg-violet text-white shadow-md'
                        : 'bg-white dark:bg-white/10 border-2 border-black/20 dark:border-white/15 text-ink/40'
                    } ${isCurrent ? 'ring-4 ring-violet/20 scale-110' : ''}`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono mt-1 text-center max-w-[70px] ${
                      isCurrent ? 'font-bold text-violet' : isPassed ? 'text-ink' : 'text-ink/40'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action if pending payment */}
        {order.status === 'pending_payment' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-amber-900">
              <span className="font-bold block">Paiement en attente</span>
              Finalisez votre paiement Mobile Money pour que l'équipe prenne en charge la commande.
            </div>
            <button
              onClick={() => onPayNow(order)}
              className="btn-festive text-xs px-5 py-2.5 whitespace-nowrap shadow-md"
            >
              Payer maintenant
            </button>
          </div>
        )}

        {/* Cancel Order */}
        {['pending_payment', 'paid', 'accepted'].includes(order.status) && (
          <div className="pt-2">
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Annuler cette commande
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
                <p className="text-xs text-red-900">
                  Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.
                </p>

                {cancelError && (
                  <p className="text-xs text-red-700 dark:text-red-400 font-semibold">{cancelError}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    {isCancelling ? 'Annulation...' : 'Oui, annuler'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCancelConfirm(false);
                      setCancelError('');
                    }}
                    disabled={isCancelling}
                    className="px-4 py-2 rounded-full glass-card border border-black/10 dark:border-white/10 text-ink text-xs font-semibold hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                  >
                    Non, garder ma commande
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deliverables Section (Media recordings uploaded by staff) */}
      <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10">
          <Sparkles className="w-4 h-4 text-gold-brand" />
          <h2 className="font-serif font-bold text-base text-ink">
            Livrables & Souvenirs HD
          </h2>
        </div>

        {(!order.deliverables || order.deliverables.length === 0) ? (
          <div className="p-6 text-center text-xs text-ink/60">
            <Clock className="w-6 h-6 text-ink/30 mx-auto mb-2" />
            <p>
              {order.status === 'delivered'
                ? 'Aucun fichier média joint.'
                : 'Les fichiers audio/vidéo souvenirs apparaîtront ici dès que la régie aura finalisé la surprise.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {order.deliverables.map((del) => (
              <div key={del.id} className="p-4 rounded-xl bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {del.file_type === 'video' ? (
                      <Play className="w-4 h-4 text-rose-brand" />
                    ) : (
                      <Music className="w-4 h-4 text-violet" />
                    )}
                    <span className="font-serif font-bold text-xs text-ink">
                      Souvenir {del.file_type.toUpperCase()} HD
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-ink/50">
                    {new Date(del.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                {del.file_type === 'video' ? (
                  <video
                    src={del.file_url}
                    controls
                    className="w-full aspect-video rounded-xl bg-black shadow-inner"
                  />
                ) : (
                  <audio src={del.file_url} controls className="w-full" />
                )}

                {del.note && (
                  <p className="text-xs text-ink/80 italic font-sans">
                    Note régie : « {del.note} »
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipient & Message Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 space-y-3 text-xs">
          <h3 className="font-serif font-bold text-sm text-ink pb-2 border-b border-black/5 dark:border-white/10">
            Détails de la surprise
          </h3>
          <div>
            <span className="text-ink/60 font-mono block">Jubilaire :</span>
            <span className="font-bold text-ink text-sm block mt-0.5">{order.recipient_name}</span>
            <span className="text-ink/60 font-mono">{order.recipient_phone}</span>
          </div>
          <div>
            <span className="text-ink/60 font-mono block">Date d'anniversaire :</span>
            <span className="font-bold text-ink block mt-0.5">
              {new Date(order.birthday_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 space-y-3 text-xs">
          <h3 className="font-serif font-bold text-sm text-ink pb-2 border-b border-black/5 dark:border-white/10">
            Message transmis
          </h3>
          <p className="italic text-ink/80 leading-relaxed font-sans bg-white/50 dark:bg-white/10 p-3 rounded-xl border border-black/5 dark:border-white/10">
            « {order.message} »
          </p>
          {order.special_instructions && (
            <div>
              <span className="text-[10px] font-mono text-ink/60 uppercase block">Consignes régie :</span>
              <p className="text-xs text-ink/75">{order.special_instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review submission if delivered */}
      {order.status === 'delivered' && !review && !reviewSuccess && (
        <form onSubmit={handleSubmitReview} className="glass-panel rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-gold-brand fill-current" />
            <h3 className="font-serif font-bold text-base text-ink">
              Comment s'est passée la surprise ?
            </h3>
          </div>
          <p className="text-xs text-ink/70">
            Partagez votre avis sur l’émotion suscitée par notre prestation.
          </p>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setRating(st)}
                className="p-1 text-gold-brand hover:scale-110 transition-transform"
              >
                <Star className={`w-6 h-6 ${st <= rating ? 'fill-current' : 'opacity-30'}`} />
              </button>
            ))}
            <span className="text-xs font-mono font-bold text-ink ml-2">{rating} / 5 étoiles</span>
          </div>

          <textarea
            required
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Racontez la réaction du destinataire..."
            className="w-full p-3 rounded-xl bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
          />

          <button
            type="submit"
            disabled={isSubmittingReview}
            className="btn-festive text-xs px-6 py-2.5 shadow-md"
          >
            {isSubmittingReview ? 'Envoi...' : 'Publier mon avis'}
          </button>
        </form>
      )}

      {review && (
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-xs text-emerald-800">Votre avis publié</span>
            <div className="flex items-center text-gold-brand">
              {[...Array(review.rating)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
          </div>
          <p className="text-xs text-ink/80 italic">« {review.comment} »</p>
        </div>
      )}
    </div>
  );
};
