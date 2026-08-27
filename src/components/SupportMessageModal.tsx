import React, { useEffect, useState } from 'react';
import { X, Send, MessageSquareHeart, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { SupportMessage } from '../types.ts';

interface SupportMessageModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string, param?: string) => void;
}

export const SupportMessageModal: React.FC<SupportMessageModalProps> = ({ open, onClose, onNavigate }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const fetchMine = () => {
    if (!user) return;
    setIsLoading(true);
    api.get<{ messages: SupportMessage[] }>('/support-messages/mine')
      .then((res) => setMessages(res.messages || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (open) fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setIsSending(true);
      await api.post('/support-messages', { subject, message });
      setSubject('');
      setMessage('');
      fetchMine();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’envoi de votre message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plum/70 backdrop-blur-md sheet-backdrop-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md glass-panel rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/20 p-5 sm:p-6 text-ink max-h-[85vh] overflow-y-auto sheet-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-rose-brand" />
            Avis & Suggestions
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/10 dark:hover:bg-white/15 rounded-full text-ink transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-xs text-ink/70">
              Connectez-vous pour envoyer un avis, une suggestion ou une question à notre équipe.
            </p>
            <button
              onClick={() => {
                onClose();
                onNavigate('login');
              }}
              className="btn-festive text-xs px-6 py-2.5"
            >
              Se connecter
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sujet (ex: Suggestion, Question...)"
                className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
              />
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
              />
              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
              <button
                type="submit"
                disabled={isSending}
                className="btn-festive text-xs px-5 py-2.5 w-full flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>

            <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-2.5">
              <h4 className="text-xs font-bold text-ink/70 uppercase font-mono">Vos messages</h4>

              {isLoading ? (
                <p className="text-xs text-ink/50 text-center py-4">Chargement...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-ink/50 text-center py-4">Aucun message envoyé pour le moment.</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink">{m.subject}</span>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                          m.status === 'answered'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-700'
                        }`}
                      >
                        {m.status === 'answered' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {m.status === 'answered' ? 'Répondu' : 'En attente'}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink/70">{m.message}</p>
                    {m.reply && (
                      <div className="mt-1.5 p-2 rounded-lg bg-violet/10 border border-violet/20">
                        <span className="text-[9px] font-mono uppercase text-violet font-bold block mb-0.5">
                          Réponse de l’équipe :
                        </span>
                        <p className="text-[11px] text-ink/80">{m.reply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
