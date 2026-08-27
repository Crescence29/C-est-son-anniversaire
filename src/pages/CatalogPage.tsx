import React, { useState, useEffect } from 'react';
import { Category, Service } from '../types.ts';
import { api } from '../utils/api.ts';
import { ServiceCard } from '../components/ServiceCard.tsx';
import {
  Search,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';

interface CatalogPageProps {
  initialCategorySlug?: string;
  onSelectService: (service: Service) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategorySlug = 'all',
  onSelectService,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [totalServices, setTotalServices] = useState(0);

  const [selectedCategory, setSelectedCategory] =
    useState<string>(initialCategorySlug);

  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState<
    'featured' | 'price_asc' | 'price_desc'
  >('featured');

  const [isLoading, setIsLoading] = useState(true);

  /**
   * Synchronise la catégorie initiale
   */
  useEffect(() => {
    if (initialCategorySlug) {
      setSelectedCategory(initialCategorySlug);
    }
  }, [initialCategorySlug]);

  /**
   * Chargement du catalogue
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        /**
         * On récupère :
         * 1. Les catégories
         * 2. Le nombre TOTAL de services
         * 3. Les services correspondant au filtre actuel
         */
        const [catRes, allServicesRes, filteredServicesRes] =
          await Promise.all([
            api.get<{ categories: Category[] }>('/categories'),

            // Tous les services → uniquement pour le compteur "Toutes"
            api.get<{ services: Service[] }>(
              `/services?category=all&search=&sort=${sortBy}`
            ),

            // Services filtrés → pour l'affichage
            api.get<{ services: Service[] }>(
              `/services?category=${encodeURIComponent(
                selectedCategory
              )}&search=${encodeURIComponent(
                searchQuery
              )}&sort=${sortBy}`
            ),
          ]);

        setCategories(catRes.categories || []);

        /**
         * Nombre réel de prestations disponibles
         *
         * Exemple :
         * toutes = 5
         * chant = 1
         * cadeau = 1
         */
        setTotalServices(allServicesRes.services?.length || 0);

        setServices(filteredServicesRes.services || []);
      } catch (err) {
        console.error('Error loading catalog:', err);

        setCategories([]);
        setServices([]);
        setTotalServices(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto pt-4">
        <span className="text-xs font-mono uppercase text-violet font-semibold tracking-wider">
          Catalogue des émotions
        </span>

        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-ink mt-1">
          Choisissez la surprise parfaite
        </h1>

        <p className="text-xs sm:text-sm text-ink/75 mt-2 font-sans">
          Chaque prestation est exécutée avec passion, enregistrée et remise
          avec un souvenir inestimable.
        </p>
      </div>

      {/* Search Bar & Sort Dropdown */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-2.5 rounded-2xl border border-black/5 dark:border-white/10">

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher (ex: saxophone, direct, gâteau)..."
            className="w-full pl-9 pr-4 py-2 bg-white/70 dark:bg-white/10 rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink/40 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet/20"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-ink/70 font-medium whitespace-nowrap">
            <ArrowUpDown className="w-3.5 h-3.5 text-violet" />

            <span className="hidden sm:inline">
              Trier par :
            </span>
          </div>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | 'featured'
                  | 'price_asc'
                  | 'price_desc'
              )
            }
            className="bg-white/70 dark:bg-white/10 px-3 py-2 rounded-xl text-xs text-ink border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet/20 font-medium"
          >
            <option value="featured">
              Populaires d'abord
            </option>

            <option value="price_asc">
              Prix croissant (FCFA)
            </option>

            <option value="price_desc">
              Prix décroissant (FCFA)
            </option>
          </select>
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">

        {/* TOUTES */}
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-violet text-white shadow-md'
              : 'glass-card text-ink/75 hover:text-ink hover:bg-white/90 dark:hover:bg-white/10 border border-black/5 dark:border-white/10'
          }`}
        >
           Toutes ({totalServices})
        </button>

        {/* CATÉGORIES */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.slug ||
              selectedCategory === cat.id
                ? 'bg-violet text-white shadow-md'
                : 'glass-card text-ink/75 hover:text-ink hover:bg-white/90 dark:hover:bg-white/10 border border-black/5 dark:border-white/10'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 h-56 sm:h-72 animate-pulse bg-white/40 dark:bg-white/5"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto border border-black/5 dark:border-white/10">

          {/*<Sparkles className="w-8 h-8 text-violet/40 mx-auto mb-3" />*/}

          <h3 className="font-serif font-bold text-lg text-ink">
            Aucune prestation trouvée
          </h3>

          <p className="text-xs text-ink/70 mt-1">
            Essayez de modifier votre recherche ou sélectionnez
            une autre catégorie.
          </p>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-4 px-4 py-2 rounded-full bg-violet text-white text-xs font-semibold"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">

          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              onSelect={onSelectService}
            />
          ))}

        </div>
      )}
    </div>
  );
};