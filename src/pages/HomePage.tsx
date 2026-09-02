import React, { useState, useEffect, useRef } from 'react';
import { Category, Service, FeaturedVideo, Review, SiteSettings } from '../types.ts';
import { api } from '../utils/api.ts';
import { CategoryCard } from '../components/CategoryCard.tsx';
import { VideoModal } from '../components/VideoModal.tsx';
import { AppLogo } from '../components/AppLogo.tsx';
import {
  Sparkles,
  ArrowRight,
  Play,
  Star,
  CheckCircle2,
  Calendar,
  Gift,
  Heart,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Music,
  Radio,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, param?: string) => void;
  onSelectService: (service: Service) => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  logo_mode: 'image',
  logo_text: 'C’EST SON ANNIVERSAIRE',
  hero_title_line1: 'Votre émission',
  hero_title_line2: 'C’EST SON ANNIVERSAIRE',
  hero_subtitle: 'Moment de détente',
  hero_images: ['/HDB1.jpg', '/HBD2.jpg', '/HBD3.jpg', '/HBD4.jpg'],
  hero_cta_primary_label: 'Découvrir les prestations',
  hero_cta_secondary_label: 'Voir les réactions en direct',
  trust_rating_value: '4.0 / 5',
  trust_rating_suffix: '(100+ jubilaires émus)',
  show_videos_section: true,
  show_steps_section: true,
  show_testimonials_section: true,
  show_bottom_cta_section: true,
  bottom_cta_title: 'Un anniversaire arrive bientôt ?',
  bottom_cta_subtitle: 'Ne laissez pas passer l’occasion d’offrir des frissons et des souvenirs éternels. Réservez la surprise en quelques clics.',
  bottom_cta_button_label: 'Explorer le catalogue',
  social_whatsapp: '',
  social_facebook: '',
  social_youtube: '',
  social_tiktok: '',
  social_linkedin: '',
  social_live_stream: '',
};
const HERO_SLIDE_DURATION_MS = 6000;
const VIDEO_AUTOSCROLL_INTERVAL_MS = 5000;
const COVERFLOW_SWIPE_THRESHOLD_PX = 40;
const COVERFLOW_AUTOPLAY_INTERVAL_MS = 4000;
const STACK_VISIBLE_DEPTH = 3;
const STACK_TAP_THRESHOLD_PX = 8;
const STACK_SWIPE_THRESHOLD_PX = 60;
const STACK_FLY_DISTANCE_PX = 480;
const STACK_TRANSITION_MS = 300;

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectService }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [selectedVideo, setSelectedVideo] = useState<FeaturedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);
  const [coverIndex, setCoverIndex] = useState(0);
  const [stackIndex, setStackIndex] = useState(0);
  const [stackDragX, setStackDragX] = useState(0);
  const [isStackDragging, setIsStackDragging] = useState(false);
  const [isStackAnimatingOut, setIsStackAnimatingOut] = useState(false);
  const stackDragStartX = useRef<number | null>(null);
  const stackFlyTimeoutRef = useRef<number | null>(null);
  const coverDragStartX = useRef<number | null>(null);
  const coverDraggingRef = useRef(false);

  useEffect(() => {
    setStackIndex(0);
  }, [videos.length]);

  const performStackSwipe = (direction: 'left' | 'right') => {
    const count = videos.length;
    if (count <= 1 || isStackAnimatingOut) return;

    setIsStackAnimatingOut(true);
    setStackDragX(direction === 'left' ? -STACK_FLY_DISTANCE_PX : STACK_FLY_DISTANCE_PX);

    if (stackFlyTimeoutRef.current) window.clearTimeout(stackFlyTimeoutRef.current);
    stackFlyTimeoutRef.current = window.setTimeout(() => {
      const delta = direction === 'left' ? 1 : -1;
      setStackIndex((prev) => ((prev + delta) % count + count) % count);
      setStackDragX(0);
      setIsStackAnimatingOut(false);
    }, STACK_TRANSITION_MS);
  };

  useEffect(() => {
    if (videos.length <= 1) return;

    const interval = setInterval(() => {
      if (isStackDragging || isStackAnimatingOut) return;
      performStackSwipe('left');
    }, VIDEO_AUTOSCROLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length, isStackDragging, isStackAnimatingOut, stackIndex]);

  useEffect(() => {
    return () => {
      if (stackFlyTimeoutRef.current) window.clearTimeout(stackFlyTimeoutRef.current);
    };
  }, []);

  const handleStackPointerDown = (clientX: number) => {
    if (isStackAnimatingOut) return;
    stackDragStartX.current = clientX;
    setIsStackDragging(true);
  };

  const handleStackPointerMove = (clientX: number) => {
    if (stackDragStartX.current === null) return;
    setStackDragX(clientX - stackDragStartX.current);
  };

  const handleStackPointerUp = (clientX: number, video: FeaturedVideo) => {
    if (stackDragStartX.current === null) return;
    const delta = clientX - stackDragStartX.current;
    stackDragStartX.current = null;
    setIsStackDragging(false);

    if (Math.abs(delta) < STACK_TAP_THRESHOLD_PX) {
      setStackDragX(0);
      setSelectedVideo(video);
      return;
    }

    if (Math.abs(delta) >= STACK_SWIPE_THRESHOLD_PX) {
      performStackSwipe(delta < 0 ? 'left' : 'right');
      return;
    }

    setStackDragX(0);
  };

  useEffect(() => {
    setCoverIndex(0);
  }, [featuredServices.length]);

  useEffect(() => {
    if (featuredServices.length <= 1) return;

    const interval = setInterval(() => {
      if (coverDraggingRef.current) return;
      setCoverIndex((prev) => (prev + 1) % featuredServices.length);
    }, COVERFLOW_AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [featuredServices.length]);

  const goToCoverSlide = (index: number) => {
    const count = featuredServices.length;
    if (count === 0) return;
    setCoverIndex(((index % count) + count) % count);
  };

  const handleCoverDragStart = (clientX: number) => {
    coverDragStartX.current = clientX;
    coverDraggingRef.current = true;
  };

  const handleCoverDragEnd = (clientX: number) => {
    coverDraggingRef.current = false;
    if (coverDragStartX.current === null) return;
    const delta = clientX - coverDragStartX.current;
    coverDragStartX.current = null;
    if (Math.abs(delta) < COVERFLOW_SWIPE_THRESHOLD_PX) return;
    goToCoverSlide(coverIndex + (delta < 0 ? 1 : -1));
  };

  useEffect(() => {
    if (settings.hero_images.length <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % settings.hero_images.length);
    }, HERO_SLIDE_DURATION_MS);

    return () => clearInterval(interval);
  }, [settings.hero_images.length]);

  const stepsRef = useRef<HTMLDivElement | null>(null);
  const [stepsVisible, setStepsVisible] = useState(false);

  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStepsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [catRes, srvRes, vidRes, revRes, settingsRes] = await Promise.all([
          api.get<{ categories: Category[] }>('/categories'),
          api.get<{ services: Service[] }>('/services?featured=true'),
          api.get<{ videos: FeaturedVideo[] }>('/videos'),
          api.get<{ reviews: Review[] }>('/reviews'),
          api.get<{ settings: SiteSettings }>('/settings'),
        ]);

        setCategories(catRes.categories || []);
        setFeaturedServices(srvRes.services || []);
        setVideos(vidRes.videos || []);
        setReviews(revRes.reviews || []);
        if (settingsRes.settings) setSettings({ ...DEFAULT_SETTINGS, ...settingsRes.settings });
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="space-y-16 sm:space-y-24 pb-28 md:pb-12">
      {/* 1. HERO SECTION */}
      <section className="relative isolate pt-6 sm:pt-12 overflow-hidden min-h-[520px] sm:min-h-[600px] flex items-center">
        {/* Animated photo background (Ken Burns crossfade) */}
        <div className="absolute inset-0 -z-30 rounded-b-[2.5rem] overflow-hidden">
          {settings.hero_images.map((src, idx) => (
            <div
              key={src}
              className={`hero-slide ${idx === heroSlide ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
          {/* Scrim so the hero text stays legible over the photos, without hiding them */}
          <div className="absolute inset-0 bg-gradient-to-b from-fond/25 via-fond/45 to-fond/85" />
        </div>

        {/* Ambient atmospheric glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 sm:w-[600px] h-72 bg-gradient-to-tr from-rose-500/20 via-violet/20 to-gold-brand/20 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="hero-text-scrim inline-block rounded-[2rem] px-5 py-6 sm:px-10 sm:py-8 max-w-2xl">
            <h1 className="font-serif font-bold text-3xl sm:text-5xl md:text-6xl text-white leading-tight tracking-tight">
              {settings.hero_title_line1} <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-brand via-gold-brand to-white">
                {settings.hero_title_line2}
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-lg text-white/85 max-w-2xl mx-auto leading-relaxed font-sans">
              {settings.hero_subtitle}
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={() => onNavigate('catalog')}
              className="w-full sm:w-auto text-sm sm:text-base px-8 py-3.5 rounded-full flex items-center justify-center gap-2 font-semibold text-plum shadow-xl transition-all hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #ffe28a 0%, #d4af37 45%, #b8862a 100%)', boxShadow: '0 8px 24px -4px rgba(184, 134, 42, 0.5)' }}
            >
              <span>{settings.hero_cta_primary_label}</span>
              {/*<ArrowRight className="w-4 h-4" />*/}
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('moments-magiques');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gold-brand/15 hover:bg-gold-brand/25 text-gold-brand text-sm font-semibold border border-gold-brand/50 backdrop-blur-md transition-all flex items-center justify-center gap-2 hero-text-shadow"
            >
              {/*<Play className="w-4 h-4 text-violet fill-current" />*/}
              <span>{settings.hero_cta_secondary_label}</span>
            </button>

            {settings.social_live_stream && (
              <a
                href={settings.social_live_stream}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-rose-brand/20 hover:bg-rose-brand/30 text-white text-sm font-semibold border border-rose-brand/40 backdrop-blur-md transition-all flex items-center justify-center gap-2 hero-text-shadow"
              >
                <Radio className="w-4 h-4 text-rose-brand animate-pulse" />
                <span>Suivre le direct</span>
              </a>
            )}
          </div>

          {/* Mini Trust Stats */}
          <div className="mt-10 pt-6 border-t border-white/25 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-white/90 font-mono hero-text-shadow">
            <div className="flex items-center gap-1.5">
              {/*<Star className="w-4 h-4 text-gold-brand fill-current" />*/}
              <span className="font-bold text-white">{settings.trust_rating_value}</span> {settings.trust_rating_suffix}
            </div>
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-rose-brand" />
              <span>Directs radio & TV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Paiement Mobile Money</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BENTO CATEGORIES GRID (Matching Mockup Image 1) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
          <div>
            <span className="text-xs font-mono uppercase text-violet font-semibold tracking-wider">
              Explorez par univers
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink mt-1">
              Catégories de surprises
            </h2>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-semibold text-rose-brand hover:underline inline-flex items-center gap-1"
          >
            Voir tout le catalogue (+15 services)
            {/*<ChevronRight className="w-3.5 h-3.5" />*/}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {categories.map((category, idx) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={idx}
              featured={idx === 0 || idx === 4}
              onSelect={(cat) => onNavigate('catalog', cat.slug)}
            />
          ))}
        </div>
      </section>

      {/* 3. FEATURED SERVICES (2-Column Mobile, 3-Column Desktop Grid matching Mockup Image 3) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
          <div>
            {/*<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-brand/15 text-ink text-xs font-bold font-mono mb-2">
              <Sparkles className="w-3 h-3 text-gold-brand" />
              Les plus plébiscitées
            </div>*/}
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
              Prestations vedettes
            </h2>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-semibold text-rose-brand hover:underline inline-flex items-center gap-1"
          >
            Explorer les 30 formules
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className="coverflow-stage"
          onPointerDown={(e) => handleCoverDragStart(e.clientX)}
          onPointerUp={(e) => handleCoverDragEnd(e.clientX)}
          onPointerLeave={() => { coverDragStartX.current = null; coverDraggingRef.current = false; }}
        >
          {featuredServices.map((service, i) => {
            const count = featuredServices.length;
            let offset = i - coverIndex;
            if (offset > count / 2) offset -= count;
            if (offset < -count / 2) offset += count;
            const abs = Math.abs(offset);
            if (abs > 2) return null;

            return (
              <button
                key={service.id}
                onClick={() => (offset === 0 ? onSelectService(service) : goToCoverSlide(i))}
                className="coverflow-card glass-card rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 shadow-lg"
                style={{
                  transform: `translateX(-50%) translateX(${offset * 62}%) scale(${1 - abs * 0.16}) rotateY(${offset === 0 ? 0 : offset > 0 ? -35 : 35}deg)`,
                  opacity: abs > 2 ? 0 : 1 - abs * 0.32,
                  zIndex: 10 - abs,
                }}
                title={service.name}
              >
                <div className="relative w-full aspect-[4/3]">
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-plum/80 via-transparent to-transparent" />
                  <span className="absolute top-2 right-2 price-tag font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur-md">
                    {service.price.toLocaleString()} {service.currency}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3.5 text-left">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase text-violet font-semibold tracking-wider block mb-0.5">
                    {service.category_name || 'Prestation'}
                  </span>
                  <h3 className="font-serif font-bold text-ink text-xs sm:text-sm leading-snug line-clamp-1">
                    {service.name}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {featuredServices.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {featuredServices.map((_, i) => (
              <button
                key={i}
                onClick={() => goToCoverSlide(i)}
                aria-label={`Voir la prestation ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === coverIndex ? 'w-6 bg-violet' : 'w-1.5 bg-violet/25 hover:bg-violet/40'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. MOMENTS MAGIQUES (Video Reels matching Mockup Image 1) */}
      {settings.show_videos_section && (
      <section id="moments-magiques" className="max-w-7xl mx-auto px-4 sm:px-6 scroll-mt-24">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/60 shadow-xl bg-gradient-to-br from-violet/5 via-white/80 to-rose-500/5">
          <div className="max-w-2xl mb-8">
            {/*<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-brand/10 text-rose-brand text-xs font-semibold mb-2">
              <Play className="w-3 h-3 fill-current" />
              Moments Magiques en vidéo
            </div>*/}
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
              Revivez l’émotion de nos surprises
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 mt-2 leading-relaxed">
              Des larmes de joie aux sourires éclatants : découvrez les réactions authentiques
              de jubilaires surpris en direct par nos artistes et nos animateurs.
            </p>
          </div>

          <div
            className="stack-deck relative mx-auto w-52 sm:w-60 aspect-[9/14]"
            onPointerLeave={() => {
              if (stackDragStartX.current === null) return;
              stackDragStartX.current = null;
              setIsStackDragging(false);
              if (!isStackAnimatingOut) setStackDragX(0);
            }}
          >
            {videos.map((vid, idx) => {
              const count = videos.length;
              const rel = ((idx - stackIndex) % count + count) % count;
              if (rel >= STACK_VISIBLE_DEPTH) return null;

              const isFront = rel === 0;
              const baseOffset = rel * 14;
              const baseScale = 1 - rel * 0.06;
              const baseOpacity = 1 - rel * 0.18;
              const dragRotate = isFront ? Math.max(-20, Math.min(20, stackDragX / 14)) : 0;
              const transform = isFront
                ? `translate(${stackDragX}px, 0px) rotate(${dragRotate}deg)`
                : `translate(${baseOffset}px, ${baseOffset}px) scale(${baseScale})`;

              return (
                <div
                  key={vid.id}
                  className="stack-card"
                  style={{
                    transform,
                    opacity: baseOpacity,
                    zIndex: STACK_VISIBLE_DEPTH - rel,
                    transition: isFront && isStackDragging ? 'none' : undefined,
                  }}
                  onPointerDown={isFront ? (e) => handleStackPointerDown(e.clientX) : undefined}
                  onPointerMove={isFront ? (e) => handleStackPointerMove(e.clientX) : undefined}
                  onPointerUp={isFront ? (e) => handleStackPointerUp(e.clientX, vid) : undefined}
                >
                  <img
                    src={vid.thumbnail_url}
                    alt={vid.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-plum/90 via-plum/20 to-black/30" />

                  {isFront && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg border border-white/40">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 p-4 text-white pointer-events-none">
                    <h3 className="font-serif font-bold text-sm leading-tight">
                      {vid.title}
                    </h3>
                    <p className="text-[11px] text-white/80 line-clamp-2 mt-1 font-sans">
                      {vid.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prev/Next Controls */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={() => performStackSwipe('right')}
              aria-label="Vidéo précédente"
              className="w-9 h-9 rounded-full glass-card border border-black/10 dark:border-white/10 flex items-center justify-center text-ink hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => performStackSwipe('left')}
              aria-label="Vidéo suivante"
              className="w-9 h-9 rounded-full glass-card border border-black/10 dark:border-white/10 flex items-center justify-center text-ink hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
      )}

      {/* 5. COMMENT ÇA MARCHE ? (4 Steps with festive numbers) */}
      {settings.show_steps_section && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase text-violet font-semibold tracking-wider">
            Simplicité & Rapidité
          </span>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink mt-1">
            Offrez en 4 étapes simples
          </h2>
          <p className="text-xs sm:text-sm text-ink/70 mt-2">
            Tout est pensé pour être réalisé depuis votre smartphone en moins de 2 minutes.
          </p>
        </div>

        <div ref={stepsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 relative card-drop ${stepsVisible ? 'card-drop-in' : ''}`}
            style={{ animationDelay: '0ms' }}
          >
            <div className="text-3xl font-serif font-bold text-violet/20 mb-2">01</div>
            <h3 className="font-serif font-bold text-base text-ink mb-1.5">Choisissez la formule</h3>
            <p className="text-xs text-ink/70 leading-relaxed font-sans">
              Dédicace radio , sérénade saxophone, gâteau gourmand ou appel complice.
            </p>
          </div>

          <div
            className={`glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 relative card-drop ${stepsVisible ? 'card-drop-in' : ''}`}
            style={{ animationDelay: '120ms' }}
          >
            <div className="text-3xl font-serif font-bold text-rose-brand/30 mb-2">02</div>
            <h3 className="font-serif font-bold text-base text-ink mb-1.5">Personnalisez le mot</h3>
            <p className="text-xs text-ink/70 leading-relaxed font-sans">
              Écrivez votre mot doux, date clé, numéro du destinataire et consignes secrètes.
            </p>
          </div>

          <div
            className={`glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 relative card-drop ${stepsVisible ? 'card-drop-in' : ''}`}
            style={{ animationDelay: '240ms' }}
          >
            <div className="text-3xl font-serif font-bold text-gold-brand/40 mb-2">03</div>
            <h3 className="font-serif font-bold text-base text-ink mb-1.5">Payez par Mobile Money</h3>
            <p className="text-xs text-ink/70 leading-relaxed font-sans">
              Débit instantané et sécurisé via MTN Mobile Money ou Orange Money.
            </p>
          </div>

          <div
            className={`glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 relative card-drop ${stepsVisible ? 'card-drop-in' : ''}`}
            style={{ animationDelay: '360ms' }}
          >
            <div className="text-3xl font-serif font-bold text-emerald-500/30 mb-2">04</div>
            <h3 className="font-serif font-bold text-base text-ink mb-1.5">Vivez l’émotion</h3>
            <p className="text-xs text-ink/70 leading-relaxed font-sans">
              L’équipe réalise la surprise et vous remet l’enregistrement souvenir HD.
            </p>
          </div>
        </div>
      </section>
      )}

      {/* 6. CLIENT TESTIMONIALS */}
      {settings.show_testimonials_section && (
      <section id="temoignages" className="max-w-7xl mx-auto px-4 sm:px-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
          <div>
            <span className="text-xs font-mono uppercase text-violet font-semibold tracking-wider">
              Témoignages
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink mt-1">
              Ils ont fait vibrer un cœur
            </h2>
          </div>
          <div className="flex items-center gap-1 text-gold-brand">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-4 h-4 fill-current" />
            ))}
            <span className="text-xs font-mono text-ink font-bold ml-1">4.9 / 5</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.slice(0, 3).map((review) => (
            <div
              key={review.id}
              className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-gold-brand mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-ink/80 leading-relaxed italic">
                  « {review.comment} »
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-black/5 dark:border-white/10 flex items-center gap-3">
                <img
                  src={review.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(review.user_name || 'U')}&backgroundColor=d94a76,4a2170`}
                  alt={review.user_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-serif font-bold text-xs text-ink">{review.user_name}</h4>
                  <span className="text-[10px] text-ink/60 font-mono">
                    {review.service_name || 'Commande vérifiée'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 7. BOTTOM CTA BANNER */}
      {settings.show_bottom_cta_section && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 bg-gradient-to-r from-plum via-violet to-plum text-white shadow-2xl text-center">
          {/* Subtle decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-brand/20 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <AppLogo size="md" showText={false} className="mx-auto mb-4" />
            <h2 className="font-serif font-bold text-2xl sm:text-4xl leading-tight">
              {settings.bottom_cta_title}
            </h2>
            <p className="text-xs sm:text-base text-white/80 mt-3 max-w-xl mx-auto font-sans leading-relaxed">
              {settings.bottom_cta_subtitle}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('catalog')}
                className="btn-festive px-8 py-3.5 text-sm sm:text-base shadow-xl"
              >
                {settings.bottom_cta_button_label}
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Video Modal Player */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
};
