import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { AppLogo } from '../components/AppLogo.tsx';
import { AuthIntroCharacter } from '../components/AuthIntroCharacter.tsx';
import { api } from '../utils/api.ts';
import { Mail, Lock, User, Phone, Sparkles, ArrowRight, Shield, Briefcase, KeyRound, Eye, EyeOff } from 'lucide-react';

interface AuthPagesProps {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onNavigateHome: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  initialMode = 'login',
  onSuccess,
  onNavigateHome,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+225 0700000000');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot Password Flow
  const [resetCodeRequested, setResetCodeRequested] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setResetSuccessMsg(res.message);
      setResetCodeRequested(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de la demande de réinitialisation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', { email, code: resetCode, newPassword });
      setMode('login');
      setPassword('');
      setResetCodeRequested(false);
      setResetCode('');
      setNewPassword('');
      setResetSuccessMsg('');
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Veuillez renseigner votre nom complet.');
          setIsLoading(false);
          return;
        }
        await register(fullName, email, phone, password);
      }
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de l’authentification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-28 space-y-6">
      <AuthIntroCharacter />

      {/* Auth Card */}
      <div className="auth-intro-card glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-2xl space-y-6">
        {/* Logo & Headline */}
        <div className="text-center">
          <AppLogo size="lg" showText={false} className="mx-auto mb-3" />
          <h1 className="font-serif font-bold text-2xl text-ink">
            {mode === 'login'
              ? 'Heureux de vous revoir'
              : mode === 'register'
              ? 'Créer votre compte'
              : 'Mot de passe oublié'}
          </h1>
          <p className="text-xs text-ink/70 mt-1 font-sans">
            {mode === 'login'
              ? 'Connectez-vous pour suivre vos surprises et cadeaux.'
              : mode === 'register'
              ? 'Rejoignez la communauté des créateurs d’émotions.'
              : 'Recevez un code pour choisir un nouveau mot de passe.'}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <>
            {resetSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-medium animate-in fade-in">
                {resetSuccessMsg}
              </div>
            )}

            {!resetCodeRequested ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Adresse Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre.email@exemple.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-festive w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-brand/25"
                >
                  {isLoading ? 'Envoi...' : 'Recevoir un code de réinitialisation'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Code de réinitialisation</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Code reçu"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-violet/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-festive w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-brand/25"
                >
                  {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-black/5 dark:border-white/10">
              <button
                onClick={() => {
                  setMode('login');
                  setResetCodeRequested(false);
                  setResetSuccessMsg('');
                  setErrorMessage('');
                }}
                className="text-xs font-bold text-violet hover:underline"
              >
                Retour à la connexion
              </button>
            </div>
          </>
        )}

        {/* Main Form */}
        {mode !== 'forgot' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex : Mariam Diallo"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Téléphone (Mobile Money)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 0700000000"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-violet/20"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-violet/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrorMessage('');
                }}
                className="text-[11px] text-violet font-semibold hover:underline mt-1.5 block ml-auto"
              >
                Mot de passe oublié ?
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-festive w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-brand/25 mt-2"
          >
            {isLoading ? (
              <span>Chargement...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        )}

        {/* Toggle Mode (register -> login only; login no longer advertises self-signup) */}
        {mode === 'register' && (
        <div className="text-center pt-2 border-t border-black/5 dark:border-white/10">
          <p className="text-xs text-ink/70">
            Vous avez déjà un compte ?{' '}
            <button
              onClick={() => setMode('login')}
              className="font-bold text-violet hover:underline"
            >
              Connectez-vous
            </button>
          </p>
        </div>
        )}
      </div>
    </div>
  );
};
