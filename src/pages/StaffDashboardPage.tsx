import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Service, FeaturedVideo, Category, FaqItem, SupportMessage } from '../types.ts';
import { api } from '../utils/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { RefreshLoadingOverlay } from '../components/RefreshLoadingOverlay.tsx';
import { useRefreshProgress } from '../hooks/useRefreshProgress.ts';
import {
  Briefcase,
  Clock,
  PlayCircle,
  CheckCircle2,
  Gift,
  Search,
  Filter,
  Upload,
  Plus,
  RefreshCw,
  Eye,
  Check,
  Video,
  Music,
  ChevronRight,
  Trash2,
  Grid3x3,
  LifeBuoy,
  MessageSquareHeart,
  Send,
} from 'lucide-react';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export const StaffDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Deliverable Modal
  const [selectedOrderForDeliverable, setSelectedOrderForDeliverable] = useState<Order | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  const [deliverableType, setDeliverableType] = useState<'video' | 'audio' | 'image'>('video');
  const [deliverableNote, setDeliverableNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Featured Videos (Moments Magiques)
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videoFormError, setVideoFormError] = useState('');

  // Catalog Management (Categories & Services)
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [newSrvCategoryId, setNewSrvCategoryId] = useState('');
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvSlug, setNewSrvSlug] = useState('');
  const [newSrvShortDesc, setNewSrvShortDesc] = useState('');
  const [newSrvDescription, setNewSrvDescription] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState(5000);
  const [newSrvImage, setNewSrvImage] = useState('');
  const [newSrvLiveBroadcast, setNewSrvLiveBroadcast] = useState(false);

  // Centre d'aide (FAQ)
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [isSavingFaq, setIsSavingFaq] = useState(false);
  const [faqError, setFaqError] = useState('');

  // Avis & Suggestions (messages clients)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState<string | null>(null);

  const fetchStaffData = async () => {
    try {
      setIsLoading(true);
      const [ordersRes, statsRes, srvRes, vidRes, catRes, faqRes, supportRes] = await Promise.all([
        api.get<{ orders: Order[] }>('/staff/orders'),
        api.get<{ stats: any }>('/staff/stats'),
        api.get<{ services: Service[] }>('/services'),
        api.get<{ videos: FeaturedVideo[] }>('/videos'),
        api.get<{ categories: Category[] }>('/categories'),
        api.get<{ faq: FaqItem[] }>('/staff/faq'),
        api.get<{ messages: SupportMessage[] }>('/staff/support-messages'),
      ]);

      setOrders(ordersRes.orders || []);
      setStats(statsRes.stats || null);
      setServices(srvRes.services || []);
      setVideos(vidRes.videos || []);
      setCategories(catRes.categories || []);
      setFaqItems(faqRes.faq || []);
      setSupportMessages(supportRes.messages || []);
    } catch (err) {
      console.error('Error loading staff dashboard:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshState = useRefreshProgress();

  useEffect(() => {
    fetchStaffData().catch(() => {});
  }, []);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await api.put(`/staff/orders/${orderId}/status`, { nextStatus });
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour du statut.');
    }
  };

  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDeliverable) return;

    try {
      setIsUploading(true);
      await api.post(`/staff/orders/${selectedOrderForDeliverable.id}/deliverables`, {
        file_url: deliverableUrl,
        file_type: deliverableType,
        note: deliverableNote,
      });

      setSelectedOrderForDeliverable(null);
      setDeliverableNote('');
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’envoi du livrable.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleServiceAvailability = async (service: Service) => {
    try {
      await api.put(`/staff/services/${service.id}/availability`, {
        is_available: !service.is_available,
      });
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la modification.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError('');

    try {
      setIsSavingCatalog(true);
      await api.post('/staff/categories', {
        name: newCatName,
        slug: newCatSlug,
        description: newCatDescription,
        image_url: newCatImage,
      });

      setNewCatName('');
      setNewCatSlug('');
      setNewCatDescription('');
      setNewCatImage('');
      setShowAddCategory(false);
      fetchStaffData();
    } catch (err: any) {
      setCatalogError(err?.message || 'Erreur lors de la création de la catégorie.');
    } finally {
      setIsSavingCatalog(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError('');

    try {
      setIsSavingCatalog(true);
      await api.post('/staff/services', {
        category_id: newSrvCategoryId,
        name: newSrvName,
        slug: newSrvSlug,
        description: newSrvDescription,
        short_description: newSrvShortDesc,
        price: newSrvPrice,
        image_url: newSrvImage,
        is_live_broadcast: newSrvLiveBroadcast,
      });

      setNewSrvCategoryId('');
      setNewSrvName('');
      setNewSrvSlug('');
      setNewSrvShortDesc('');
      setNewSrvDescription('');
      setNewSrvPrice(5000);
      setNewSrvImage('');
      setNewSrvLiveBroadcast(false);
      setShowAddService(false);
      fetchStaffData();
    } catch (err: any) {
      setCatalogError(err?.message || 'Erreur lors de la création de la prestation.');
    } finally {
      setIsSavingCatalog(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError('');

    try {
      setIsSavingFaq(true);
      await api.post('/staff/faq', { question: newFaqQuestion, answer: newFaqAnswer });
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setShowAddFaq(false);
      fetchStaffData();
    } catch (err: any) {
      setFaqError(err?.message || 'Erreur lors de la création de la question.');
    } finally {
      setIsSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await api.delete(`/staff/faq/${id}`);
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleToggleFaqActive = async (item: FaqItem) => {
    try {
      await api.put(`/staff/faq/${item.id}`, { is_active: !item.is_active });
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la modification.');
    }
  };

  const handleSendReply = async (messageId: string) => {
    const reply = (replyDrafts[messageId] || '').trim();
    if (!reply) return;

    try {
      setIsSendingReply(messageId);
      await api.put(`/staff/support-messages/${messageId}/reply`, { reply });
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’envoi de la réponse.');
    } finally {
      setIsSendingReply(null);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoFormError('');

    const youtubeId = extractYouTubeId(videoUrl);
    const thumbnail = videoThumbnail.trim() || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '');

    if (!thumbnail) {
      setVideoFormError('Impossible de déduire une miniature : renseignez un lien YouTube ou une URL de miniature.');
      return;
    }

    try {
      setIsAddingVideo(true);
      await api.post('/staff/videos', {
        title: videoTitle,
        description: videoDescription,
        video_url: videoUrl,
        thumbnail_url: thumbnail,
      });

      setVideoTitle('');
      setVideoDescription('');
      setVideoUrl('');
      setVideoThumbnail('');
      fetchStaffData();
    } catch (err: any) {
      setVideoFormError(err?.message || 'Erreur lors de l’ajout de la vidéo.');
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await api.delete(`/staff/videos/${videoId}`);
      fetchStaffData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab !== 'all' && o.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.recipient_name.toLowerCase().includes(q) ||
        (o.client_name && o.client_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet/10 text-violet text-xs font-bold font-mono mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            Portail Régie & Exécution
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
            Tableau de Bord Staff
          </h1>
        </div>

        <button
          onClick={() => refreshState.run(fetchStaffData)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-card text-xs font-semibold text-ink hover:bg-white dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/10"
        >
          <RefreshCw className="w-3.5 h-3.5 text-violet" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-black/5 dark:border-white/10">
          <span className="text-[10px] font-mono text-ink/60 uppercase block">À Traiter (Payées)</span>
          <div className="font-mono text-2xl font-bold text-blue-700 mt-1">
            {stats?.pendingOrdersCount ?? 0}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-black/5 dark:border-white/10">
          <span className="text-[10px] font-mono text-ink/60 uppercase block">En cours d'exécution</span>
          <div className="font-mono text-2xl font-bold text-rose-brand mt-1">
            {stats?.inProgressOrdersCount ?? 0}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-black/5 dark:border-white/10">
          <span className="text-[10px] font-mono text-ink/60 uppercase block">Livrées au total</span>
          <div className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {stats?.deliveredOrdersCount ?? 0}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-black/5 dark:border-white/10">
          <span className="text-[10px] font-mono text-ink/60 uppercase block">Total Commandes</span>
          <div className="font-mono text-2xl font-bold text-violet mt-1">
            {orders.length}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-2.5 rounded-2xl border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all' ? 'bg-violet text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-ink'
            }`}
          >
            Toutes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'paid' ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-ink'
            }`}
          >
            Payées à accepter
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'accepted' ? 'bg-violet text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-ink'
            }`}
          >
            Acceptées
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'in_progress' ? 'bg-rose-brand text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-ink'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'delivered' ? 'bg-emerald-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-ink'
            }`}
          >
            Livrées
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher destinataire, n°..."
            className="w-full pl-8 pr-3 py-1.5 bg-white/70 dark:bg-white/10 rounded-xl text-xs text-ink placeholder:text-ink/40 border border-black/5 dark:border-white/10 focus:outline-none"
          />
        </div>
      </div>

      {/* Orders List Table */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center text-xs text-ink/60 border border-black/5 dark:border-white/10">
            Aucune commande trouvée dans ce filtre.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="glass-card rounded-2xl p-5 border border-black/5 dark:border-white/10 space-y-4 hover:shadow-md transition-all"
            >
              {/* Order Info Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-ink">
                    #{ord.order_number}
                  </span>
                  <StatusBadge status={ord.status} size="sm" />
                </div>
                <div className="text-xs text-ink/60 font-mono">
                  Date de fête :{' '}
                  <span className="font-bold text-ink">
                    {new Date(ord.birthday_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Service & Recipient Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-ink/50 font-mono block">Prestation :</span>
                  <span className="font-serif font-bold text-ink text-sm block mt-0.5">
                    {ord.service_name}
                  </span>
                  <span className="font-mono text-xs text-violet font-bold">
                    {ord.amount.toLocaleString()} {ord.currency}
                  </span>
                </div>

                <div>
                  <span className="text-ink/50 font-mono block">Jubilaire (Destinataire) :</span>
                  <span className="font-bold text-ink block mt-0.5">{ord.recipient_name}</span>
                  <span className="text-ink/60 font-mono">{ord.recipient_phone}</span>
                </div>

                <div>
                  <span className="text-ink/50 font-mono block">Offrant (Client) :</span>
                  <span className="font-semibold text-ink block mt-0.5">{ord.client_name}</span>
                  <span className="text-ink/60 font-mono">{ord.client_phone}</span>
                </div>

                {ord.message && (
                  <div className="sm:col-span-3 p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                    <span className="text-[10px] font-mono text-violet uppercase font-semibold block mb-0.5">
                      Message d’émotion :
                    </span>
                    <p className="italic text-ink/80">« {ord.message} »</p>
                    {ord.special_instructions && (
                      <p className="text-[11px] text-ink/70 mt-1">
                        <strong>Consignes :</strong> {ord.special_instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons for State Transitions */}
              <div className="pt-2 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {ord.status === 'paid' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'accepted')}
                      className="px-4 py-2 rounded-xl bg-violet text-white text-xs font-semibold hover:bg-violet/90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accepter & Prendre en charge
                    </button>
                  )}

                  {ord.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'in_progress')}
                      className="px-4 py-2 rounded-xl bg-rose-brand text-white text-xs font-semibold hover:bg-rose-brand/90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Démarrer la prestation
                    </button>
                  )}

                  {ord.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'delivered')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Marquer comme Livrée 🎉
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedOrderForDeliverable(ord)}
                    className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-ink text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-violet" />
                    Ajouter livrable HD
                  </button>
                </div>

                <span className="text-[10px] font-mono text-ink/50">
                  Mis à jour le {new Date(ord.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Catalog Management (Categories & Services) */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-lg space-y-6">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-violet" />
          <h2 className="font-serif font-bold text-lg text-ink">
            Catalogue (Catégories & Prestations)
          </h2>
        </div>

        {catalogError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium">
            {catalogError}
          </div>
        )}

        {/* Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-ink">
              Catégories ({categories.length})
            </h3>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle catégorie
            </button>
          </div>

          {showAddCategory && (
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <input type="text" required value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nom de la catégorie" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <input type="text" required value={newCatSlug} onChange={(e) => setNewCatSlug(e.target.value)} placeholder="slug-url" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" required value={newCatImage} onChange={(e) => setNewCatImage(e.target.value)} placeholder="URL de l'image" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink sm:col-span-2" />
              <textarea required value={newCatDescription} onChange={(e) => setNewCatDescription(e.target.value)} placeholder="Description" rows={2} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
              <button type="submit" disabled={isSavingCatalog} className="btn-festive text-xs py-2.5 sm:col-span-2 disabled:opacity-60">
                {isSavingCatalog ? 'Création...' : 'Créer la catégorie'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <div>
                  <span className="font-semibold text-sm text-ink">{c.name}</span>
                  <span className="text-[11px] text-ink/60 font-mono ml-2">{c.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-ink">
              Prestations ({services.length})
            </h3>
            <button
              onClick={() => setShowAddService(!showAddService)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle prestation
            </button>
          </div>

          {showAddService && (
            <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <select required value={newSrvCategoryId} onChange={(e) => setNewSrvCategoryId(e.target.value)} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2">
                <option value="">Choisir une catégorie...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input type="text" required value={newSrvName} onChange={(e) => setNewSrvName(e.target.value)} placeholder="Nom de la prestation" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <input type="text" required value={newSrvSlug} onChange={(e) => setNewSrvSlug(e.target.value)} placeholder="slug-url" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" required value={newSrvShortDesc} onChange={(e) => setNewSrvShortDesc(e.target.value)} placeholder="Description courte" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
              <textarea required value={newSrvDescription} onChange={(e) => setNewSrvDescription(e.target.value)} placeholder="Description complète" rows={2} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
              <input type="text" required value={newSrvImage} onChange={(e) => setNewSrvImage(e.target.value)} placeholder="URL de l'image" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink sm:col-span-2" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-ink/70">Prix :</label>
                <input type="number" min={0} required value={newSrvPrice} onChange={(e) => setNewSrvPrice(Number(e.target.value))} className="w-28 p-2 rounded-lg bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono" />
                <span className="text-xs">FCFA</span>
              </div>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2 cursor-pointer">
                <input type="checkbox" checked={newSrvLiveBroadcast} onChange={(e) => setNewSrvLiveBroadcast(e.target.checked)} className="w-3.5 h-3.5" />
                <span>Diffusion en direct <span className="text-ink/50">(bientôt disponible)</span></span>
              </label>
              <button type="submit" disabled={isSavingCatalog} className="btn-festive text-xs py-2.5 disabled:opacity-60">
                {isSavingCatalog ? 'Création...' : 'Créer la prestation'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <div>
                  <span className="font-semibold text-sm text-ink">{s.name}</span>
                  <span className="text-[11px] text-ink/60 font-mono ml-2">
                    {s.price.toLocaleString()} {s.currency}
                  </span>
                  <span className={`ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${s.is_available ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                    {s.is_available ? 'Disponible' : 'Indisponible'}
                  </span>
                  {s.is_live_broadcast && (
                    <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet/20 text-violet">
                      Direct (bientôt)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleToggleServiceAvailability(s)}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-ink text-[11px] font-semibold transition-colors"
                >
                  {s.is_available ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Avis & Suggestions (messages reçus des clients) */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-4 h-4 text-rose-brand" />
          <h2 className="font-serif font-bold text-lg text-ink">
            Avis & Suggestions
            {supportMessages.filter((m) => m.status === 'open').length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-brand text-white text-[10px] font-mono align-middle">
                {supportMessages.filter((m) => m.status === 'open').length} en attente
              </span>
            )}
          </h2>
        </div>

        {supportMessages.length === 0 ? (
          <p className="text-xs text-ink/60 text-center py-6">Aucun message reçu pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {supportMessages.map((m) => (
              <div key={m.id} className="p-4 rounded-xl bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-serif font-bold text-sm text-ink">{m.subject}</span>
                    <span className="text-[11px] text-ink/60 font-mono block">
                      {m.user_name} • {m.user_email} {m.user_phone ? `• ${m.user_phone}` : ''}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      m.status === 'answered'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/20 text-amber-700'
                    }`}
                  >
                    {m.status === 'answered' ? 'Répondu' : 'En attente'}
                  </span>
                </div>

                <p className="text-xs text-ink/80 font-sans">{m.message}</p>

                {m.reply ? (
                  <div className="p-2.5 rounded-lg bg-violet/10 border border-violet/20">
                    <span className="text-[10px] font-mono uppercase text-violet font-semibold block mb-0.5">
                      Réponse de {m.replied_by_name} :
                    </span>
                    <p className="text-xs text-ink/80">{m.reply}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={replyDrafts[m.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="Votre réponse..."
                      className="flex-1 p-2 rounded-lg bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
                    />
                    <button
                      onClick={() => handleSendReply(m.id)}
                      disabled={isSendingReply === m.id}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-violet text-white text-[11px] font-bold hover:bg-violet/90 transition-colors disabled:opacity-60"
                    >
                      <Send className="w-3 h-3" />
                      {isSendingReply === m.id ? 'Envoi...' : 'Répondre'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Centre d'aide (FAQ) */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-violet" />
            <h2 className="font-serif font-bold text-lg text-ink">
              Centre d'aide (FAQ) — {faqItems.length}
            </h2>
          </div>
          <button
            onClick={() => setShowAddFaq(!showAddFaq)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle question
          </button>
        </div>

        {faqError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium">
            {faqError}
          </div>
        )}

        {showAddFaq && (
          <form onSubmit={handleAddFaq} className="space-y-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
            <input type="text" required value={newFaqQuestion} onChange={(e) => setNewFaqQuestion(e.target.value)} placeholder="Question" className="w-full p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
            <textarea required value={newFaqAnswer} onChange={(e) => setNewFaqAnswer(e.target.value)} placeholder="Réponse" rows={3} className="w-full p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
            <button type="submit" disabled={isSavingFaq} className="btn-festive text-xs py-2.5 w-full disabled:opacity-60">
              {isSavingFaq ? 'Ajout...' : 'Ajouter la question'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {faqItems.map((item) => (
            <div key={item.id} className="p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-ink block">{item.question}</span>
                  <span className="text-[11px] text-ink/60">{item.answer}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleFaqActive(item)}
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      item.is_active ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {item.is_active ? 'Visible' : 'Masquée'}
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(item.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Videos Management (Moments Magiques) */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-violet" />
          <h2 className="font-serif font-bold text-lg text-ink">
            Vidéos "Moments Magiques" (page d'accueil)
          </h2>
        </div>

        <form onSubmit={handleAddVideo} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            placeholder="Titre de la vidéo"
            className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
          />
          <input
            type="text"
            required
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Lien YouTube (ex: youtube.com/shorts/...)"
            className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink"
          />
          <input
            type="text"
            required
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            placeholder="Courte description"
            className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2"
          />
          <input
            type="text"
            value={videoThumbnail}
            onChange={(e) => setVideoThumbnail(e.target.value)}
            placeholder="URL miniature (facultatif si lien YouTube)"
            className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink sm:col-span-2"
          />

          {videoFormError && (
            <p className="text-xs text-red-600 font-semibold sm:col-span-2">{videoFormError}</p>
          )}

          <button
            type="submit"
            disabled={isAddingVideo}
            className="btn-festive text-xs px-5 py-2.5 sm:col-span-2 disabled:opacity-60"
          >
            {isAddingVideo ? 'Ajout...' : 'Ajouter la vidéo'}
          </button>
        </form>

        {videos.length === 0 ? (
          <p className="text-xs text-ink/60 text-center py-4">Aucune vidéo pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {videos.map((v) => (
              <div key={v.id} className="relative rounded-xl overflow-hidden aspect-[9/14] bg-black group">
                <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-plum/90 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 right-2 text-[10px] text-white font-semibold leading-tight line-clamp-2">
                  {v.title}
                </span>
                <button
                  onClick={() => handleDeleteVideo(v.id)}
                  title="Supprimer cette vidéo"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deliverable Upload Modal */}
      {selectedOrderForDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/40 shadow-2xl text-ink space-y-4">
            <h3 className="font-serif font-bold text-lg text-ink">
              Ajouter un livrable souvenir HD
            </h3>
            <p className="text-xs text-ink/70">
              Commande #{selectedOrderForDeliverable.order_number} pour {selectedOrderForDeliverable.recipient_name}
            </p>

            <form onSubmit={handleUploadDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Type de média :</label>
                <select
                  value={deliverableType}
                  onChange={(e) => setDeliverableType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink font-medium"
                >
                  <option value="video">Vidéo souvenir (MP4)</option>
                  <option value="audio">Enregistrement audio / Sérénade (MP3)</option>
                  <option value="image">Photo souvenir</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Lien / URL du média :</label>
                <input
                  type="text"
                  required
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Note pour le client :</label>
                <textarea
                  rows={2}
                  value={deliverableNote}
                  onChange={(e) => setDeliverableNote(e.target.value)}
                  placeholder="Ex : Voici l'enregistrement live du solo de saxophone..."
                  className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForDeliverable(null)}
                  className="flex-1 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-ink text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn-festive flex-1 py-2.5 text-xs font-semibold"
                >
                  {isUploading ? 'Envoi...' : 'Transmettre au client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <RefreshLoadingOverlay
        status={refreshState.status}
        progress={refreshState.progress}
        errorMessage={refreshState.errorMessage}
        onRetry={refreshState.retry}
        onDismiss={refreshState.dismiss}
      />
    </div>
  );
};
