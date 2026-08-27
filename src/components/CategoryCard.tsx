import React from 'react';
import { Category } from '../types.ts';

interface CategoryCardProps {
  category: Category & { services_count?: number };
  onSelect: (category: Category) => void;
  featured?: boolean;
  index?: number;
}

const ACCENTS = ['text-violet', 'text-rose-brand', 'text-gold-brand'];

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onSelect,
  featured = false,
  index = 0,
}) => {
  const accentText = ACCENTS[index % ACCENTS.length];

  return (
    <div
      onClick={() => onSelect(category)}
      style={{ animationDelay: `${Math.min(index, 11) * 70}ms` }}
      className={`service-card-in group relative glass-card rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-black/5 dark:border-white/10 flex flex-col justify-between ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      {/* Image de fond */}
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        <img
          src={category.image_url}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-plum/85 via-plum/15 to-transparent" />
        <h3 className="absolute bottom-2 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4 font-serif font-bold text-white text-xs sm:text-lg drop-shadow-md line-clamp-1">
          {category.name}
        </h3>
      </div>

      <div className="relative z-10 p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
        <p className="hidden sm:block text-xs text-ink/70 line-clamp-2 leading-relaxed">
          {category.description}
        </p>

        <div className="mt-2 pt-1.5 sm:mt-4 sm:pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
          <span className="text-[9px] sm:text-[11px] font-mono text-ink/60 font-medium">
            {category.services_count !== undefined ? `${category.services_count} prestations` : 'Découvrir'}
          </span>
          <span className={`text-[11px] sm:text-xs font-semibold ${accentText} group-hover:underline`}>
            Explorer →
          </span>
        </div>
      </div>
    </div>
  );
};
