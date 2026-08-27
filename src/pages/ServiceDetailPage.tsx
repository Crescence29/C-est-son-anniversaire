import React, { useState, useEffect } from 'react';
import { Service, Category, Review } from '../types.ts';
import { api } from '../utils/api.ts';
import {
  ArrowLeft,
  Clock,
  Heart,
  Share2,
  CheckCircle2,
  Star,
  Sparkles,
  ShieldCheck,
  Music,
  Radio,
  Gift,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ServiceDetailPageProps {
  serviceIdOrSlug: string;
  onBack: () => void;
  onProceedToCheckout: (service: Service) => void;
  onSelectRelatedService: (service: Service) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  serviceIdOrSlug,
  onBack,
  onProceedToCheckout,
  onSelectRelatedService,
}) => {
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setIsLoading(true);
        const data = await api.get<{
          service: Service;
          category: Category;
          reviews: Review[];
          relatedServices: Service[];
        }>(`/services/${serviceIdOrSlug}`);

        setService(data.service);
        setCategory(data.category);
        setReviews(data.reviews || []);
        setRelatedServices(data.relatedServices || []);
      } catch (err) {
        console.error('Error fetching service:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [serviceIdOrSlug]);

  const handleToggleFavorite = async () => {
    if (!service) return;
    try {
      const res = await api.post<{ isFavorite: boolean }>('/favorites/toggle', {
        service_id: service.id,
      });
      setIsFavorite(res.isFavorite);
    } catch {
      // benign
    }
  };

  if (isLoading || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-violet border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-ink/60 font-mono">Chargement de la prestation...</p>
      </div>
    );
  }

  // Pre-configured perks based on service category
  const defaultPerks = [
    'Personnalisation complète de votre texte d’émotion',
    'Enregistrement souvenir HD transmis à la fin de la prestation',
    'Confirmation et suivi en direct sur votre smartphone',
    'Équipe d’artistes et animateurs professionnels certifiés',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8">
      {/* Top Bar with Back and Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card hover:bg-white/90 dark:hover:bg-white/10 text-xs font-semibold text-ink transition-all border border-black/5 dark:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au catalogue</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full glass-card hover:bg-white/90 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10 ${
              isFavorite ? 'text-rose-brand' : 'text-ink/70'
            }`}
            title="Ajouter aux favoris"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Image Header (Matching Mockup Image 5) */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] rounded-3xl overflow-hidden shadow-xl bg-black">
        <img
          src={service.image_url}
          alt={service.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-plum/90 via-plum/30 to-black/20" />

        {/* Badges on image */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className="bg-plum/80 backdrop-blur-md text-white text-xs font-mono px-3 py-1 rounded-full flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gold-brand" />
            Délai garanti : {service.delay_label}
          </span>
          {service.is_featured && (
            <span className="bg-gold-brand text-plum text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Prestation Vedette
            </span>
          )}
        </div>

        {/* Title & Price inside image bottom for impact */}
        <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
          <div>
            <span className="text-xs font-mono uppercase text-gold-brand font-semibold tracking-wider">
              {service.category_name || category?.name}
            </span>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white mt-1">
              {service.name}
            </h1>
          </div>

          <div className="shrink-0 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-2xl text-right">
            <span className="text-[10px] text-white/80 font-mono block">Tarif tout compris</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-gold-brand">
              {service.price.toLocaleString()} {service.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Glass Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Description & Included Features */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10">
            <h2 className="font-serif font-bold text-lg text-ink mb-3">
              Description de la prestation
            </h2>
            <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-sans whitespace-pre-line">
              {service.description || service.short_description}
            </p>

            <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10">
              <h3 className="font-serif font-bold text-sm text-ink mb-3">
                Ce qui est inclus :
              </h3>
              <div className="space-y-2.5">
                {defaultPerks.map((perk, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-ink/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Reviews Section */}
          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-base text-ink">
                Avis vérifiés ({reviews.length})
              </h3>
              <div className="flex items-center gap-1 text-gold-brand">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-xs font-mono font-bold text-ink">4.9 / 5</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-ink/60 italic py-2">
                Soyez le premier à commander et laisser un avis sur cette prestation !
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-black/5">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-serif font-bold text-xs text-ink">{rev.user_name}</span>
                      <div className="flex items-center text-gold-brand">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-ink/70 italic">« {rev.comment} »</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Summary & Checkout Action */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-lg space-y-4 sticky top-20">
            <div className="pb-3 border-b border-black/5 dark:border-white/10">
              <span className="text-xs text-ink/60 font-mono">Montant de la surprise</span>
              <div className="font-mono text-2xl font-bold text-violet mt-0.5">
                {service.price.toLocaleString()} {service.currency}
              </div>
            </div>

            <div className="space-y-2 text-xs text-ink/80">
              <div className="flex items-center justify-between">
                <span>Délai d’exécution :</span>
                <span className="font-mono font-bold text-ink">{service.delay_label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Format de livraison :</span>
                <span className="font-semibold text-ink">Direct / Souvenir HD</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mode de règlement :</span>
                <span className="font-semibold text-rose-brand">Mobile Money</span>
              </div>
            </div>

            <button
              onClick={() => onProceedToCheckout(service)}
              className="btn-festive w-full py-3.5 text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-brand/30 mt-4"
            >
              <Gift className="w-4 h-4" />
              <span>Offrir cette prestation</span>
            </button>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-ink/60 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paiement sécurisé et garanti</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <div className="pt-8 border-t border-black/5 dark:border-white/10">
          <h3 className="font-serif font-bold text-lg text-ink mb-4">
            Vous pourriez aussi aimer
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedServices.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectRelatedService(rel)}
                className="glass-card rounded-xl p-3 border border-black/5 dark:border-white/10 cursor-pointer hover:shadow-md transition-all flex items-center gap-3"
              >
                <img
                  src={rel.image_url}
                  alt={rel.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-xs text-ink truncate">{rel.name}</h4>
                  <span className="font-mono text-xs text-violet font-bold block mt-0.5">
                    {rel.price.toLocaleString()} {rel.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Bottom Floating CTA */}
      <div className="md:hidden fixed bottom-18 inset-x-0 px-4 z-30">
        <div className="glass-panel p-2.5 rounded-full shadow-2xl border border-white/60 flex items-center justify-between gap-3">
          <div className="pl-3">
            <span className="text-[10px] text-ink/60 font-mono block">Tarif</span>
            <span className="font-mono text-sm font-bold text-violet">
              {service.price.toLocaleString()} {service.currency}
            </span>
          </div>
          <button
            onClick={() => onProceedToCheckout(service)}
            className="btn-festive text-xs px-5 py-2.5 flex items-center gap-1.5"
          >
            <span>Offrir maintenant</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
