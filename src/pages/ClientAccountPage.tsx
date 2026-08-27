import React, { useState, useEffect } from 'react';
import { Order, Favorite } from '../types.ts';
import { api } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import {
  ShoppingBag,
  Heart,
  User,
  Bell,
  Clock,
  ChevronRight,
  Sparkles,
  Calendar,
  Gift,
  ExternalLink,
  Camera,
  Check,
} from 'lucide-react';

interface ClientAccountPageProps {
  onSelectOrder: (orderId: string) => void;
  onNavigateToCatalog: () => void;
}

export const ClientAccountPage: React.FC<ClientAccountPageProps> = ({
  onSelectOrder,
  onNavigateToCatalog,
}) => {
  const { user, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  useEffect(() => {
    setEditName(user?.full_name || '');
    setEditAvatarUrl(user?.avatar_url || '');
  }, [user?.id]);

  const roleLabel =
    user?.is_super_admin ? 'Compte Développeur'
    : user?.role === 'admin' ? 'Compte Admin'
    : user?.role === 'staff' ? 'Compte Staff'
    : 'Compte Client';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    try {
      setIsSavingProfile(true);
      await api.put('/auth/profile', {
        full_name: editName,
        avatar_url: editAvatarUrl,
      });
      await refreshUserData();
      setProfileSuccessMsg('Profil mis à jour !');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err: any) {
      setProfileError(err?.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ordersRes, favsRes] = await Promise.all([
          api.get<{ orders: Order[] }>('/orders'),
          api.get<{ favorites: Favorite[] }>('/favorites'),
        ]);

        setOrders(ordersRes.orders || []);
        setFavorites(favsRes.favorites || []);
      } catch (err) {
        console.error('Error fetching client data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Client Profile Header */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <img
          src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
          alt={user?.full_name}
          className="w-16 h-16 rounded-full object-cover border-2 border-violet/30 shadow-md"
        />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="font-serif font-bold text-xl text-ink">{user?.full_name}</h1>
            <span className="inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-violet/10 text-violet font-bold">
              {roleLabel}
            </span>
          </div>
          <p className="text-xs text-ink/60 font-mono mt-0.5">{user?.email} • {user?.phone}</p>
        </div>

        <div className="flex gap-2">
          <div className="text-center px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
            <span className="font-mono text-sm font-bold text-violet block">{orders.length}</span>
            <span className="text-[10px] text-ink/60 font-mono">Surprises</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
            <span className="font-mono text-sm font-bold text-rose-brand block">{favorites.length}</span>
            <span className="text-[10px] text-ink/60 font-mono">Favoris</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'orders'
              ? 'bg-violet text-white shadow-md'
              : 'text-ink/70 hover:text-ink hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Mes Commandes ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'favorites'
              ? 'bg-violet text-white shadow-md'
              : 'text-ink/70 hover:text-ink hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Favoris ({favorites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-violet text-white shadow-md'
              : 'text-ink/70 hover:text-ink hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profil</span>
        </button>
      </div>

      {/* Tab 1: Orders List */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center border border-black/5 dark:border-white/10">
              <Gift className="w-8 h-8 text-violet/40 mx-auto mb-2" />
              <h3 className="font-serif font-bold text-base text-ink">Aucune commande pour le moment</h3>
              <p className="text-xs text-ink/60 mt-1">
                Faites plaisir à un proche en réservant une surprise unique !
              </p>
              <button
                onClick={onNavigateToCatalog}
                className="mt-4 btn-festive text-xs px-5 py-2.5"
              >
                Explorer les prestations
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className="glass-card rounded-2xl p-4 sm:p-5 border border-black/5 dark:border-white/10 cursor-pointer hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <img
                    src={order.service_image || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=150&q=80'}
                    alt={order.service_name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-ink">
                        #{order.order_number}
                      </span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                    <h3 className="font-serif font-bold text-sm text-ink">{order.service_name}</h3>
                    <p className="text-xs text-ink/60 font-mono mt-0.5">
                      Pour : <span className="font-semibold text-ink">{order.recipient_name}</span> • Le{' '}
                      {new Date(order.birthday_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/10">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-ink/60 font-mono block">Montant</span>
                    <span className="font-mono text-sm font-bold text-violet">
                      {order.amount.toLocaleString()} {order.currency}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink/40" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Favorites */}
      {activeTab === 'favorites' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {favorites.length === 0 ? (
            <div className="col-span-2 glass-panel rounded-2xl p-10 text-center border border-black/5 dark:border-white/10">
              <Heart className="w-8 h-8 text-rose-brand/40 mx-auto mb-2" />
              <h3 className="font-serif font-bold text-base text-ink">Aucun favori enregistré</h3>
              <p className="text-xs text-ink/60 mt-1">
                Cliquez sur le cœur d'une prestation pour la retrouver ici.
              </p>
            </div>
          ) : (
            favorites.map((fav) => (
              <div
                key={fav.id}
                className="glass-card rounded-2xl p-4 border border-black/5 dark:border-white/10 flex items-center gap-3.5"
              >
                <img
                  src={fav.service?.image_url}
                  alt={fav.service?.name}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-ink truncate">
                    {fav.service?.name}
                  </h4>
                  <span className="font-mono text-xs font-bold text-violet block mt-0.5">
                    {fav.service?.price.toLocaleString()} {fav.service?.currency}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveProfile} className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <h3 className="font-serif font-bold text-base text-ink">Modifier mon profil</h3>

            {profileSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {profileSuccessMsg}
              </div>
            )}
            {profileError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium">
                {profileError}
              </div>
            )}

            <div className="flex items-center gap-4">
              <img
                src={editAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt="Aperçu de la photo de profil"
                className="w-16 h-16 rounded-full object-cover border-2 border-violet/30 shadow-md shrink-0"
              />
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-ink flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-violet" />
                  Photo de profil (URL de l'image)
                </label>
                <input
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-ink mb-1 block">Nom complet</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="btn-festive text-xs px-5 py-2.5 disabled:opacity-60"
            >
              {isSavingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>

          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <h3 className="font-serif font-bold text-base text-ink">Informations du compte</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-ink/60 font-mono block">Email :</span>
                <span className="font-semibold text-ink text-sm mt-0.5 block">{user?.email}</span>
              </div>
              <div>
                <span className="text-ink/60 font-mono block">Téléphone Mobile Money :</span>
                <span className="font-semibold text-ink text-sm mt-0.5 block">{user?.phone}</span>
              </div>
              <div>
                <span className="text-ink/60 font-mono block">Rôle actuel :</span>
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded-full bg-violet/10 text-violet font-bold inline-block mt-0.5">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
