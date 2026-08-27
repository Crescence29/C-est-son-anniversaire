import React from 'react';
import { Service } from '../types.ts';
import { Clock, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';

interface ServiceCardProps {
  service: Service;
  isFavorite?: boolean;
  index?: number;
  onSelect: (service: Service) => void;
  onToggleFavorite?: (serviceId: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  isFavorite = false,
  index = 0,
  onSelect,
  onToggleFavorite,
}) => {
  const { user } = useAuth();
  const [favorite, setFavorite] = React.useState(isFavorite);
  const [isToggling, setIsToggling] = React.useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onSelect(service);
      return;
    }
    try {
      setIsToggling(true);
      const res = await api.post<{ isFavorite: boolean }>('/favorites/toggle', {
        service_id: service.id,
      });
      setFavorite(res.isFavorite);
      if (onToggleFavorite) onToggleFavorite(service.id);
    } catch {
      // benign
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(service)}
      style={{ animationDelay: `${Math.min(index, 11) * 70}ms` }}
      className="service-card-in group relative glass-card rounded-xl sm:rounded-2xl p-2 sm:p-3 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-violet/30 border border-black/5 dark:border-white/10"
    >
      {/* Image Container with Badges */}
      <div className="relative w-full aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden mb-2 sm:mb-3 bg-neutral-100 dark:bg-white/10">
        <img
          src={service.image_url}
          alt={service.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-plum/60 via-transparent to-black/30" />

        {/* Top-Right Price Tag */}
        <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5">
          <span className="price-tag font-mono text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-md backdrop-blur-md">
            {service.price.toLocaleString()} {service.currency}
          </span>
        </div>

        {/* Top-Left Delay Tag */}
        <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex items-center gap-1 bg-plum/70 backdrop-blur-md text-white font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 sm:px-2 rounded-full">
          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gold-brand" />
          <span>Délai {service.delay_label}</span>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isToggling}
          className={`absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
            favorite
              ? 'bg-rose-brand text-white shadow-md'
              : 'bg-white/70 dark:bg-white/10 text-ink/70 hover:text-rose-brand hover:bg-white dark:hover:bg-white/20'
          }`}
          title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${favorite ? 'fill-current' : ''}`} />
        </button>

        {/* Featured Tag */}
        {service.is_featured && (
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2.5 sm:left-2.5 flex items-center gap-1 bg-gold-brand/90 backdrop-blur-md text-plum text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 rounded-full shadow-xs">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Populaire</span>
          </div>
        )}
      </div>

      {/* Text Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[9px] sm:text-[10px] font-mono uppercase text-violet font-semibold tracking-wider block mb-0.5 sm:mb-1">
            {service.category_name || 'Prestation'}
          </span>
          <h3 className="font-serif font-bold text-ink text-xs sm:text-base leading-snug line-clamp-2 group-hover:text-violet transition-colors">
            {service.name}
          </h3>
          <p className="hidden sm:block text-xs text-ink/70 mt-1 line-clamp-2 leading-relaxed">
            {service.short_description}
          </p>
        </div>

        {/* Action Bottom */}
        <div className="mt-2 pt-1.5 sm:mt-3 sm:pt-2.5 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-rose-brand group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
            <span className="truncate">Offrir cette surprise</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </span>
        </div>
      </div>
    </div>
  );
};
